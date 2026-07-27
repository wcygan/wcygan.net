import { describe, expect, it } from "vitest";
import {
  COMPLETE_RACE_SNAPSHOT,
  deriveRaceSnapshot,
  INITIAL_RACE_SNAPSHOT,
} from "./model";

describe("deriveRaceSnapshot", () => {
  it("starts with the exact inventory row before either worker acts", () => {
    expect(INITIAL_RACE_SNAPSHOT).toMatchObject({
      phase: "initial",
      row: { sku: "SKU-42", available: 2, version: 7 },
      isComplete: false,
    });
    expect(
      INITIAL_RACE_SNAPSHOT.steps.every((step) => step.status === "pending"),
    ).toBe(true);
  });

  it("records that both workers read version 7", () => {
    const snapshot = deriveRaceSnapshot(0.12);

    expect(snapshot.phase).toBe("both-read");
    expect(snapshot.row).toEqual({
      sku: "SKU-42",
      available: 2,
      version: 7,
    });
    expect(snapshot.steps[0]).toMatchObject({
      id: "read-v7",
      status: "active",
    });
  });

  it("submits Worker A's version-guarded update first", () => {
    const snapshot = deriveRaceSnapshot(0.25);

    expect(snapshot.phase).toBe("worker-a-submit");
    expect(snapshot.expectedVersion).toBe(7);
    expect(snapshot.row.version).toBe(7);
    expect(snapshot.steps[1]).toMatchObject({
      id: "worker-a-write",
      status: "active",
    });
  });

  it("applies Worker A's decrement before Worker B submits", () => {
    const snapshot = deriveRaceSnapshot(0.35);

    expect(snapshot.phase).toBe("worker-a-success");
    expect(snapshot.row).toEqual({
      sku: "SKU-42",
      available: 1,
      version: 8,
    });
    expect(snapshot.steps[1]).toMatchObject({
      status: "active",
      outcome: "accepted",
    });
  });

  it("submits Worker B's stale update against version 7", () => {
    const snapshot = deriveRaceSnapshot(0.47);

    expect(snapshot.phase).toBe("worker-b-submit");
    expect(snapshot.expectedVersion).toBe(7);
    expect(snapshot.row.version).toBe(8);
    expect(snapshot.steps[2].status).toBe("active");
  });

  it("rejects the stale update without changing the row", () => {
    const snapshot = deriveRaceSnapshot(0.58);

    expect(snapshot.phase).toBe("worker-b-rejected");
    expect(snapshot.row).toEqual({
      sku: "SKU-42",
      available: 1,
      version: 8,
    });
    expect(snapshot.steps[2]).toMatchObject({
      status: "active",
      outcome: "rejected",
    });
    expect(snapshot.phaseLabel).toContain("rows_affected = 0");
  });

  it("rereads version 8 before allowing Worker B to retry", () => {
    const reread = deriveRaceSnapshot(0.7);
    const retry = deriveRaceSnapshot(0.81);

    expect(reread.phase).toBe("worker-b-reread");
    expect(reread.expectedVersion).toBe(8);
    expect(reread.row).toMatchObject({ available: 1, version: 8 });
    expect(retry.phase).toBe("worker-b-retry");
    expect(retry.expectedVersion).toBe(8);
    expect(retry.row).toMatchObject({ available: 1, version: 8 });
  });

  it("persists the synchronized final row and quantified conclusion", () => {
    expect(COMPLETE_RACE_SNAPSHOT).toMatchObject({
      phase: "complete",
      row: { sku: "SKU-42", available: 0, version: 9 },
      isComplete: true,
    });
    expect(
      COMPLETE_RACE_SNAPSHOT.steps.every((step) => step.status === "applied"),
    ).toBe(true);
    expect(COMPLETE_RACE_SNAPSHOT.phaseLabel).toContain("rows_affected = 1");
  });

  it("clamps progress instead of reviving through modulo playback", () => {
    expect(deriveRaceSnapshot(-1)).toEqual(INITIAL_RACE_SNAPSHOT);
    expect(deriveRaceSnapshot(2)).toEqual(COMPLETE_RACE_SNAPSHOT);
  });
});
