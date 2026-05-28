import { describe, expect, it } from "vitest";
import { deriveRaceSnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveRaceSnapshot", () => {
  it("starts with both checkout workers reading version 7", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0, playing: false });

    expect(snapshot.row).toEqual({
      sku: "SKU-42",
      available: 2,
      version: 7,
      lastWriter: "-",
    });
    expect(snapshot.workers.workerA.status).toBe("reading");
    expect(snapshot.workers.workerB.status).toBe("reading");
  });

  it("keeps both prepared reservations guarded by expected version 7", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0.24, playing: false });

    expect(snapshot.phase).toBe("prepare");
    expect(snapshot.workers.workerA).toMatchObject({
      mutationLabel: "available - 1",
      expectedVersion: 7,
    });
    expect(snapshot.workers.workerB).toMatchObject({
      mutationLabel: "available - 1",
      expectedVersion: 7,
    });
  });

  it("sends both initial reads in lockstep", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0.05, playing: false });
    const readRequests = snapshot.packets.filter(
      (packet) => packet.kind === "select",
    );

    expect(readRequests).toHaveLength(2);
    expect(readRequests.map((packet) => packet.writer).sort()).toEqual([
      "workerA",
      "workerB",
    ]);
    expect(readRequests[0].progress).toBeCloseTo(readRequests[1].progress, 6);
  });

  it("returns the shared stock version to both workers in lockstep", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0.15, playing: false });
    const readResults = snapshot.packets.filter(
      (packet) => packet.kind === "read-result",
    );

    expect(readResults).toHaveLength(2);
    expect(readResults.map((packet) => packet.writer).sort()).toEqual([
      "workerA",
      "workerB",
    ]);
    expect(readResults.every((packet) => packet.label === "2 left, v7")).toBe(
      true,
    );
    expect(readResults[0].progress).toBeCloseTo(readResults[1].progress, 6);
  });

  it("updates the live table when Worker A reserves the first unit", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0.42, playing: false });

    expect(snapshot.row).toEqual({
      sku: "SKU-42",
      available: 1,
      version: 8,
      lastWriter: "A",
    });
    expect(snapshot.workers.workerA.resultLabel).toBe("rows_affected = 1");
  });

  it("models Worker B's stale reservation as a conflict", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0.58, playing: false });

    expect(snapshot.row).toMatchObject({
      available: 1,
      version: 8,
      lastWriter: "A",
    });
    expect(snapshot.mismatch).toMatchObject({
      expected: 7,
      current: 8,
    });
    expect(snapshot.workers.workerB.resultLabel).toBe("rows_affected = 0");
  });

  it("rereads version 8 before retrying Worker B's reservation", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0.72, playing: false });

    expect(snapshot.phase).toBe("worker-b-reread");
    expect(snapshot.workers.workerB).toMatchObject({
      mutationLabel: "available - 1",
      expectedVersion: 8,
      status: "rereading",
    });
    expect(snapshot.row.version).toBe(8);
    expect(snapshot.mismatch).toBeUndefined();
  });

  it("commits Worker B's retry and advances the row to version 9", () => {
    const snapshot = deriveRaceSnapshot({ progress: 0.9, playing: false });

    expect(snapshot.phase).toBe("worker-b-retry");
    expect(snapshot.row).toEqual({
      sku: "SKU-42",
      available: 0,
      version: 9,
      lastWriter: "B",
    });
    expect(snapshot.workers.workerB).toMatchObject({
      status: "committed",
      expectedVersion: 8,
      resultLabel: "rows_affected = 1",
    });
  });

  it("uses the reduced-motion frame as the retry-success outcome", () => {
    const snapshot = deriveRaceSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("worker-b-retry");
    expect(snapshot.row.version).toBe(9);
    expect(snapshot.workers.workerA.statusLabel).toBe("decremented stock");
    expect(snapshot.workers.workerB.statusLabel).toBe("decremented stock");
  });
});
