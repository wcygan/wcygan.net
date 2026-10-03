import { describe, expect, it } from "vitest";
import {
  cardinalitySnapshot,
  metricName,
  STORAGE_STEPS,
  storageSnapshot,
  type StorageBlock,
} from "./model";

function coveredHours(blocks: StorageBlock[]) {
  return blocks.flatMap(({ startHour, endHour }) =>
    Array.from({ length: endHour - startHour }, (_, hour) => startHour + hour),
  );
}

describe("Prometheus series identity", () => {
  it("emits twelve unique bounded label sets without a user label", () => {
    const snapshot = cardinalitySnapshot("bounded");
    expect(snapshot.metricName).toBe("http_requests_total");
    expect(snapshot.count).toBe(12);
    expect(new Set(snapshot.series.map(({ id }) => id)).size).toBe(12);
    expect(new Set(snapshot.series.map(({ method }) => method))).toEqual(
      new Set(["GET", "POST"]),
    );
    expect(new Set(snapshot.series.map(({ route }) => route))).toEqual(
      new Set(["/orders", "/search", "/health"]),
    );
    expect(new Set(snapshot.series.map(({ status }) => status))).toEqual(
      new Set(["200", "500"]),
    );
    expect(snapshot.series.every((series) => !("userId" in series))).toBe(true);
    expect(snapshot.series.some(({ id }) => id.includes("user_id"))).toBe(
      false,
    );
    expect(snapshot.series[0].id).toBe(
      `${metricName}{method="GET",route="/orders",status="200"}`,
    );
  });

  it("adds ten distinct user label sets per bounded series", () => {
    const bounded = cardinalitySnapshot("bounded");
    const expanded = cardinalitySnapshot("users");
    expect(expanded.count).toBe(120);
    expect(new Set(expanded.series.map(({ id }) => id)).size).toBe(120);
    expect(new Set(expanded.series.map(({ userId }) => userId))).toEqual(
      new Set(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10"]),
    );
    for (const original of bounded.series) {
      const matching = expanded.series.filter(
        ({ method, route, status }) =>
          method === original.method &&
          route === original.route &&
          status === original.status,
      );
      expect(matching).toHaveLength(10);
      expect(matching.map(({ userIndex }) => userIndex)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
      expect(matching.every(({ id }) => id !== original.id)).toBe(true);
      expect(
        matching.map(({ methodIndex, routeIndex, statusIndex }) => [
          methodIndex,
          routeIndex,
          statusIndex,
        ]),
      ).toEqual(
        Array.from({ length: 10 }, () => [
          original.methodIndex,
          original.routeIndex,
          original.statusIndex,
        ]),
      );
    }
  });
});

describe("Prometheus illustrative storage lifecycle", () => {
  it("persists the old Head range while newer samples enter Head and WAL", () => {
    const initial = storageSnapshot(0);
    const persisted = storageSnapshot(1);
    expect(initial.head).toEqual({ startHour: 6, endHour: 8, samples: 6 });
    expect(initial.walSamples).toBe(initial.head.samples);
    expect(persisted.blocks.at(-1)).toMatchObject({ startHour: 6, endHour: 8 });
    expect(persisted.head).toEqual({ startHour: 8, endHour: 10, samples: 3 });
    expect(persisted.walSamples).toBe(persisted.head.samples);
  });

  it("compacts contiguous block coverage without losing represented hours", () => {
    const before = storageSnapshot(1);
    const compacted = storageSnapshot(2);
    expect(compacted.blocks).toHaveLength(2);
    expect(compacted.blocks[0]).toMatchObject({ startHour: 0, endHour: 6 });
    expect(coveredHours(compacted.blocks)).toEqual(coveredHours(before.blocks));
    expect(new Set(coveredHours(compacted.blocks)).size).toBe(8);
    expect(compacted.blocks[1]).toEqual(before.blocks[3]);
    expect(compacted.head).toEqual(before.head);
  });

  it("recovers the complete active Head from the WAL after restart", () => {
    const beforeRestart = storageSnapshot(1);
    const recovered = storageSnapshot(2);
    expect(beforeRestart.recovery).toBe(false);
    expect(recovered.recovery).toBe(true);
    expect(recovered.walSamples).toBe(3);
    expect(recovered.head).toEqual(beforeRestart.head);
    expect(recovered.head.samples).toBe(recovered.walSamples);
  });

  it("expires a complete compacted block and preserves recent coverage", () => {
    const before = storageSnapshot(2);
    const retained = storageSnapshot(3);
    expect(retained.deletedRange).toEqual({ startHour: 0, endHour: 6 });
    expect(retained.deletedRange).toEqual({
      startHour: before.blocks[0].startHour,
      endHour: before.blocks[0].endHour,
    });
    expect(retained.blocks).toEqual(before.blocks.slice(1));
    expect(coveredHours(retained.blocks)).toEqual([6, 7]);
    expect(retained.head).toEqual(before.head);
    expect(retained.walSamples).toBe(before.walSamples);
    expect(retained.recovery).toBe(false);
  });

  it("clamps steps to the four named states", () => {
    expect(STORAGE_STEPS).toBe(4);
    expect(storageSnapshot(-100)).toEqual(storageSnapshot(0));
    expect(storageSnapshot(1.9)).toEqual(storageSnapshot(1));
    expect(storageSnapshot(100)).toEqual(storageSnapshot(3));
    expect(storageSnapshot(Number.NaN)).toEqual(storageSnapshot(0));
  });
});
