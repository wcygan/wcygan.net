import { describe, expect, it } from "vitest";
import {
  aggregateShards,
  columnReadWork,
  COUNTRY_VALUES,
  decodeCountries,
  encodeCountries,
  INSERT_BATCHES,
  MONTH_PARTITIONS,
  partitionSnapshot,
  queryActiveParts,
} from "./model";
import {
  spatialTourFrame,
  SPATIAL_TOUR_STEPS,
  type SpatialTourKind,
} from "./tour";

const kinds = Object.keys(SPATIAL_TOUR_STEPS) as SpatialTourKind[];

function frames(kind: SpatialTourKind) {
  return Array.from({ length: SPATIAL_TOUR_STEPS[kind] }, (_, step) =>
    spatialTourFrame(kind, step),
  );
}

describe("bounded spatial tours", () => {
  it.each(kinds)("builds deterministic independent %s snapshots", (kind) => {
    const modelBefore = JSON.stringify({
      INSERT_BATCHES,
      MONTH_PARTITIONS,
      COUNTRY_VALUES,
    });
    const firstRun = frames(kind);
    const before = JSON.stringify(firstRun);
    const secondRun = frames(kind);
    expect(secondRun).toEqual(firstRun);
    expect(JSON.stringify(firstRun)).toBe(before);
    expect(
      JSON.stringify({ INSERT_BATCHES, MONTH_PARTITIONS, COUNTRY_VALUES }),
    ).toBe(modelBefore);
    for (let step = 0; step < firstRun.length; step++) {
      expect(secondRun[step].state).not.toBe(firstRun[step].state);
      expect(secondRun[step].state.parts).not.toBe(firstRun[step].state.parts);
      expect(secondRun[step].state.parts.parts[0].rows[0]).not.toBe(
        firstRun[step].state.parts.parts[0].rows[0],
      );
      expect(firstRun[step].title.trim().length).toBeGreaterThan(0);
      expect(firstRun[step].narration.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(kinds)("clamps %s to useful initial and terminal frames", (kind) => {
    const initial = spatialTourFrame(kind, 0);
    const last = SPATIAL_TOUR_STEPS[kind] - 1;
    const terminal = spatialTourFrame(kind, last);
    for (const step of [-100, -Infinity, NaN]) {
      expect(spatialTourFrame(kind, step)).toEqual(initial);
    }
    for (const step of [100, Infinity, last + 0.9]) {
      expect(spatialTourFrame(kind, step)).toEqual(terminal);
    }
    expect(spatialTourFrame(kind, 1.9)).toEqual(spatialTourFrame(kind, 1));
    expect(terminal.narration).not.toBe(initial.narration);
  });

  it("starts every tour with the same baseline state", () => {
    for (const kind of kinds) {
      expect(spatialTourFrame(kind, 0).state).toMatchObject({
        layout: "rows",
        encoded: false,
        dictionaryRow: 0,
        month: "all",
        selection: ["A", "A"],
        queried: false,
        parts: { insertedBatches: 1, merged: false },
      });
      expect(
        spatialTourFrame(kind, 0).state.parts.parts.map((part) => part.id),
      ).toEqual(["P1"]);
    }
  });

  it.each(["columns", "parts", "cluster"] as const)(
    "lets the final %s query run before a settled frame preserves its result",
    (kind) => {
      const last = SPATIAL_TOUR_STEPS[kind] - 1;
      const activeQuery = spatialTourFrame(kind, last - 1);
      const settled = spatialTourFrame(kind, last);
      expect(activeQuery.state.queried).toBe(true);
      expect(settled.state.queried).toBe(true);
      expect(settled.state).toEqual(activeQuery.state);
      expect(settled.narration).not.toBe(activeQuery.narration);

      if (kind === "columns") {
        expect(columnReadWork(activeQuery.state.layout).readValues).toBe(12);
        expect(columnReadWork(settled.state.layout)).toEqual(
          columnReadWork(activeQuery.state.layout),
        );
      } else if (kind === "parts") {
        expect(queryActiveParts(activeQuery.state.parts)).toEqual({
          count: 6,
          amount: 180,
          duplicateKeyRows: 2,
        });
        expect(queryActiveParts(settled.state.parts)).toEqual(
          queryActiveParts(activeQuery.state.parts),
        );
      } else {
        expect(aggregateShards(activeQuery.state.selection).sum).toBe(210);
        expect(aggregateShards(settled.state.selection)).toEqual(
          aggregateShards(activeQuery.state.selection),
        );
      }
    },
  );
});

describe("column tour", () => {
  it("reads 24 then 12 logical values with an unqueried layout transition", () => {
    const tour = frames("columns");
    expect(
      tour.map((frame) => [frame.state.layout, frame.state.queried]),
    ).toEqual([
      ["rows", false],
      ["rows", true],
      ["columns", false],
      ["columns", true],
      ["columns", true],
    ]);
    expect(columnReadWork(tour[1].state.layout).readValues).toBe(24);
    expect(columnReadWork(tour[3].state.layout).readValues).toBe(12);
    expect(tour[1].narration).toContain("24");
    expect(tour[3].narration).toContain("12");
  });
});

describe("dictionary tour", () => {
  it("inspects US, DE, JP, and repeated US without losing record order", () => {
    const tour = frames("compression");
    expect(tour.map((frame) => frame.state.encoded)).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(tour.map((frame) => frame.state.dictionaryRow)).toEqual([
      0, 0, 1, 3, 10, 0,
    ]);
    expect(
      tour
        .slice(1, 5)
        .map((frame) => COUNTRY_VALUES[frame.state.dictionaryRow]),
    ).toEqual(["US", "DE", "JP", "US"]);
    const original = [...COUNTRY_VALUES];
    for (const frame of tour.filter((frame) => frame.state.encoded)) {
      const encoding = encodeCountries(COUNTRY_VALUES);
      expect(decodeCountries(encoding.dictionary, encoding.ids)).toEqual(
        original,
      );
      expect(encoding.ids).toHaveLength(12);
      expect(encoding.dictionary).toHaveLength(3);
      expect(frame.state.dictionaryRow).toBeGreaterThanOrEqual(0);
      expect(frame.state.dictionaryRow).toBeLessThan(12);
    }
    expect(COUNTRY_VALUES).toEqual(original);
    expect(tour[5].narration).toContain("original order");
  });
});

describe("part merge tour", () => {
  it("queries the same six-row multiset before and after replacing active parts", () => {
    const tour = frames("parts");
    expect(
      tour.map((frame) => frame.state.parts.parts.map((part) => part.id)),
    ).toEqual([["P1"], ["P1", "P2"], ["P1", "P2"], ["P3"], ["P3"], ["P3"]]);
    expect(tour.map((frame) => frame.state.queried)).toEqual([
      false,
      false,
      true,
      false,
      true,
      true,
    ]);
    const before = tour[2].state.parts;
    const after = tour[4].state.parts;
    expect(queryActiveParts(before)).toEqual({
      count: 6,
      amount: 180,
      duplicateKeyRows: 2,
    });
    expect(queryActiveParts(after)).toEqual(queryActiveParts(before));
    const multiset = (state: typeof before) =>
      state.parts
        .flatMap((part) => part.rows.map((row) => JSON.stringify(row)))
        .sort();
    expect(multiset(after)).toEqual(multiset(before));
    expect(after.parts[0].rows.map((row) => row.key)).toEqual([
      1, 2, 3, 3, 4, 5,
    ]);
    expect(tour[3].state.parts.merged).toBe(true);
  });
});

describe("partition tour", () => {
  it("narrows the read to four February rows while preserving twelve stored rows", () => {
    const before = JSON.stringify(MONTH_PARTITIONS);
    const tour = frames("partitions");
    expect(tour.map((frame) => frame.state.month)).toEqual([
      "all",
      "2026-02",
      "2026-02",
    ]);
    const snapshots = tour.map((frame) => partitionSnapshot(frame.state.month));
    expect(snapshots.map((snapshot) => snapshot.readRows)).toEqual([12, 4, 4]);
    expect(snapshots.map((snapshot) => snapshot.totalRows)).toEqual([
      12, 12, 12,
    ]);
    for (const snapshot of snapshots) {
      expect(snapshot.storedRows).toEqual(snapshots[0].storedRows);
    }
    expect(snapshots[1].selectedGroups.map((group) => group.month)).toEqual([
      "2026-02",
    ]);
    expect(JSON.stringify(MONTH_PARTITIONS)).toBe(before);
    expect(tour[2].narration).toContain("12 rows remain stored");
  });
});

describe("cluster tour", () => {
  it("reads one up-to-date copy per shard and always aggregates 210", () => {
    const tour = frames("cluster");
    expect(tour.map((frame) => frame.state.selection)).toEqual([
      ["A", "A"],
      ["A", "A"],
      ["B", "A"],
      ["B", "B"],
      ["B", "B"],
    ]);
    expect(tour.map((frame) => frame.state.queried)).toEqual([
      false,
      true,
      true,
      true,
      true,
    ]);
    for (const frame of tour) {
      const result = aggregateShards(frame.state.selection);
      expect(result.partials.map((partial) => partial.sum)).toEqual([60, 150]);
      expect(result.sum).toBe(210);
      expect(result.logicalRows).toBe(6);
      expect(result.storedRows).toBe(12);
    }
    expect(tour[3].narration).toContain("210");
  });
});
