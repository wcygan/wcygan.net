import { describe, expect, it } from "vitest";
import { murmur2, partitionSnapshot, routeRecords, TOTAL_STEPS } from "./model";

describe("Kafka partitioning", () => {
  it("populates every keyed partition for all supported counts", () => {
    for (let count = 1; count <= 5; count++) {
      const records = routeRecords("keyed", count);
      expect(new Set(records.map((record) => record.partition)).size).toBe(
        count,
      );
    }
    const records = routeRecords("keyed", 3);
    expect(
      [0, 1, 2].map((p) => records.filter((r) => r.partition === p).length),
    ).toEqual([5, 2, 2]);
  });
  it("routes all records with contiguous offsets for one through five partitions", () => {
    for (let count = 1; count <= 5; count++) {
      for (const mode of ["keyed", "round-robin"] as const) {
        const records = routeRecords(mode, count);
        expect(records).toHaveLength(9);
        for (const record of records) {
          expect(record.partition).toBe(
            (mode === "keyed" ? record.hash : record.id - 1) % count,
          );
        }
        for (let p = 0; p < count; p++) {
          const log = records.filter((r) => r.partition === p);
          expect(log.map((r) => r.offset)).toEqual(log.map((_, i) => i));
        }
        expect(partitionSnapshot(mode, TOTAL_STEPS, count).appended).toEqual(
          records,
        );
      }
    }
  });
  it("matches Kafka Java Murmur2 reference vectors", () => {
    expect(["", "a", "hello", "kafka"].map(murmur2)).toEqual([
      275646681, 2731586172, 2132663229, 3496464228,
    ]);
  });
  it("keeps each key in one partition with contiguous local offsets", () => {
    for (const mode of ["keyed", "round-robin"] as const) {
      const records = routeRecords(mode);
      for (let p = 0; p < 3; p++) {
        expect(
          records.filter((r) => r.partition === p).map((r) => r.offset),
        ).toEqual(records.filter((r) => r.partition === p).map((_, i) => i));
      }
      if (mode === "keyed") {
        for (const key of new Set(records.map((r) => r.key))) {
          expect(
            new Set(
              records.filter((r) => r.key === key).map((r) => r.partition),
            ).size,
          ).toBe(1);
        }
      } else {
        expect(records.map((r) => r.partition)).toEqual([
          0, 1, 2, 0, 1, 2, 0, 1, 2,
        ]);
        expect(
          new Set(
            records
              .filter((r) => r.key === "order-101")
              .map((r) => r.partition),
          ).size,
        ).toBeGreaterThan(1);
      }
    }
  });
  it("routes before appending and retains the completed log", () => {
    for (let step = 0; step <= TOTAL_STEPS; step++) {
      const state = partitionSnapshot("keyed", step);
      expect(state.appended).toHaveLength(Math.floor(step / 2));
      expect(state.routing).toBe(step % 2 === 1);
      expect(state.done).toBe(step === TOTAL_STEPS);
    }
    expect(partitionSnapshot("keyed", 999).appended).toHaveLength(9);
    expect(partitionSnapshot("keyed", 0).current).toBeNull();
  });
});
