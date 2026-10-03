import { describe, expect, it } from "vitest";
import {
  aggregateShards,
  COLUMN_FIELDS,
  COLUMN_ROWS,
  columnReadWork,
  COORDINATOR_POSITION,
  COUNTRY_VALUES,
  createPart,
  decodeCountries,
  dictionaryPosition,
  dictionaryRoute,
  DICTIONARY_SIZE,
  encodedIdPosition,
  encodeCountries,
  ENCODED_ID_SIZE,
  initialPartsState,
  insertNextBatch,
  INSERT_BATCHES,
  mergeActiveParts,
  MONTH_PARTITIONS,
  PART_QUERY_POSITION,
  PART_QUERY_SIZE,
  PART_SIZE,
  PARTITION_QUERY_POSITION,
  PARTITION_QUERY_SIZE,
  PARTITION_TRAY_SIZE,
  partitionPosition,
  partitionRoute,
  partitionSnapshot,
  partPosition,
  partQueryRoute,
  queryActiveParts,
  queryRoute,
  replicaCopyRoute,
  replicaPosition,
  REPLICA_SIZE,
  type Point,
} from "./model";

function routeClearsBoxes(
  route: readonly Point[],
  boxes: readonly { center: Point; size: Point }[],
) {
  for (let segment = 1; segment < route.length; segment++) {
    const from = route[segment - 1];
    const to = route[segment];
    for (let sample = 0; sample <= 40; sample++) {
      const t = sample / 40;
      const point = from.map(
        (value, axis) => value + (to[axis] - value) * t,
      ) as Point;
      for (const box of boxes) {
        const inside = point.every(
          (value, axis) =>
            Math.abs(value - box.center[axis]) < box.size[axis] / 2 - 1e-8,
        );
        expect(inside).toBe(false);
      }
    }
  }
}

describe("ordinary MergeTree parts", () => {
  it("sorts a new part without changing the input batch", () => {
    const part = createPart("P1", INSERT_BATCHES[0]);
    expect(part.rows.map((row) => row.key)).toEqual([1, 3, 5]);
    expect(INSERT_BATCHES[0].map((row) => row.key)).toEqual([3, 1, 5]);
    expect(part.rows[0]).not.toBe(INSERT_BATCHES[0][1]);
  });

  it("reads both active parts before a merge", () => {
    const state = insertNextBatch(initialPartsState());
    expect(state.parts.map((part) => part.id)).toEqual(["P1", "P2"]);
    expect(queryActiveParts(state)).toEqual({
      count: 6,
      amount: 180,
      duplicateKeyRows: 2,
    });
  });

  it("replaces active parts with a sorted part, preserving the row multiset", () => {
    const before = insertNextBatch(initialPartsState());
    const serializedBefore = JSON.stringify(before);
    const after = mergeActiveParts(before);
    expect(after.parts.map((part) => part.id)).toEqual(["P3"]);
    expect(after.parts[0].rows.map((row) => row.key)).toEqual([
      1, 2, 3, 3, 4, 5,
    ]);
    const multiset = (rows: readonly { key: number; amount: number }[]) =>
      rows.map((row) => JSON.stringify(row)).sort();
    expect(multiset(after.parts[0].rows)).toEqual(
      multiset(before.parts.flatMap((part) => [...part.rows])),
    );
    expect(queryActiveParts(after)).toEqual(queryActiveParts(before));
    expect(JSON.stringify(before)).toBe(serializedBefore);
  });

  it("settles after the bounded batch and merge actions", () => {
    const inserted = insertNextBatch(initialPartsState());
    expect(insertNextBatch(inserted)).toBe(inserted);
    const merged = mergeActiveParts(inserted);
    expect(mergeActiveParts(merged)).toBe(merged);
  });
});

describe("shards and replicas", () => {
  it.each([
    ["A", "A"],
    ["A", "B"],
    ["B", "A"],
    ["B", "B"],
  ] as const)(
    "reads one %s/%s copy per shard without multiplying the result",
    (first, second) => {
      const result = aggregateShards([first, second]);
      expect(result.partials.map((partial) => partial.sum)).toEqual([60, 150]);
      expect(result.partials.map((partial) => partial.replica)).toEqual([
        first,
        second,
      ]);
      expect(result.logicalRows).toBe(6);
      expect(result.storedRows).toBe(12);
      expect(result.sum).toBe(210);
    },
  );

  it.each([
    [0, "A"],
    [0, "B"],
    [1, "A"],
    [1, "B"],
  ] as const)(
    "attaches shard %s / replica %s routes to face centers",
    (shard, replica) => {
      const route = queryRoute(shard, replica);
      const target = replicaPosition(shard, replica);
      const start = route[0];
      const next = route[1];
      const end = route[route.length - 1];
      const previous = route[route.length - 2];
      expect(start).toEqual([
        COORDINATOR_POSITION[0] + (shard === 0 ? -0.8 : 0.8),
        COORDINATOR_POSITION[1],
        COORDINATOR_POSITION[2],
      ]);
      expect(next[1]).toBe(start[1]);
      expect(next[2]).toBe(start[2]);
      expect(Math.sign(next[0] - start[0])).toBe(shard === 0 ? -1 : 1);
      expect(end).toEqual([
        target[0],
        target[1],
        target[2] + REPLICA_SIZE[2] / 2,
      ]);
      expect(previous[0]).toBe(end[0]);
      expect(previous[1]).toBe(end[1]);
      expect(previous[2]).toBeGreaterThan(end[2]);

      // Check the entire bent route against all four solid replica bodies.
      // Only the endpoint may touch the destination; no segment enters a body.
      const insideReplica = (point: Point, center: Point) =>
        point.every(
          (value, axis) =>
            Math.abs(value - center[axis]) < REPLICA_SIZE[axis] / 2 - 1e-8,
        );
      for (let segment = 1; segment < route.length; segment++) {
        const from = route[segment - 1];
        const to = route[segment];
        for (let sample = 0; sample <= 20; sample++) {
          const t = sample / 20;
          const point = from.map(
            (value, axis) => value + (to[axis] - value) * t,
          ) as Point;
          for (const otherShard of [0, 1]) {
            for (const otherReplica of ["A", "B"] as const) {
              expect(
                insideReplica(point, replicaPosition(otherShard, otherReplica)),
              ).toBe(false);
            }
          }
        }
      }
    },
  );

  it.each([0, 1])(
    "connects shard %s copies at facing wall centers",
    (shard) => {
      const first = replicaPosition(shard, "A");
      const second = replicaPosition(shard, "B");
      const route = replicaCopyRoute(shard);
      expect(route).toEqual([
        [first[0], first[1], first[2] - REPLICA_SIZE[2] / 2],
        [second[0], second[1], second[2] + REPLICA_SIZE[2] / 2],
      ]);
      routeClearsBoxes(
        route,
        [0, 1].flatMap((index) =>
          (["A", "B"] as const).map((replica) => ({
            center: replicaPosition(index, replica),
            size: REPLICA_SIZE,
          })),
        ),
      );
    },
  );
});

describe("column reads", () => {
  it("compares 24 row-layout values with 12 selected column values", () => {
    expect(COLUMN_FIELDS).toEqual(["day", "country", "event", "amount"]);
    expect(COLUMN_ROWS).toHaveLength(6);
    expect(COLUMN_ROWS.every((row) => Object.keys(row).length === 4)).toBe(
      true,
    );
    expect(columnReadWork("rows")).toEqual({
      layout: "rows",
      selectedFields: ["day", "amount"],
      readValues: 24,
      totalValues: 24,
    });
    expect(columnReadWork("columns")).toEqual({
      layout: "columns",
      selectedFields: ["day", "amount"],
      readValues: 12,
      totalValues: 24,
    });
  });

  it("counts each selected field once without changing the selection", () => {
    const selection = Object.freeze(["amount", "amount", "day"] as const);
    const before = JSON.stringify(COLUMN_ROWS);
    expect(columnReadWork("columns", selection).readValues).toBe(12);
    expect(selection).toEqual(["amount", "amount", "day"]);
    expect(columnReadWork("columns", COLUMN_FIELDS).readValues).toBe(24);
    expect(columnReadWork("columns", []).readValues).toBe(0);
    expect(columnReadWork("rows", []).readValues).toBe(0);
    expect(JSON.stringify(COLUMN_ROWS)).toBe(before);
  });
});

describe("dictionary encoding", () => {
  it("stores twelve country rows as three first-seen entries and twelve IDs", () => {
    const encoded = encodeCountries(COUNTRY_VALUES);
    expect(COUNTRY_VALUES).toHaveLength(12);
    expect(encoded.dictionary).toEqual(["US", "DE", "JP"]);
    expect(encoded.ids).toEqual([0, 1, 0, 2, 0, 1, 2, 0, 1, 2, 0, 1]);
    expect(decodeCountries(encoded.dictionary, encoded.ids)).toEqual(
      COUNTRY_VALUES,
    );
  });

  it.each([
    [],
    ["JP", "JP", "JP"],
    ["CA", "US", "CA", "DE", "US", "CA"],
    ["", "__proto__", "日本", "", "日本"],
  ])(
    "round-trips arbitrary repeats in their original order: %j",
    (...values) => {
      const input = Object.freeze(values);
      const before = [...input];
      const encoded = encodeCountries(input);
      expect(encoded.dictionary).toEqual([...new Set(input)]);
      const dictionary = Object.freeze(encoded.dictionary);
      const ids = Object.freeze(encoded.ids);
      const decoded = decodeCountries(dictionary, ids);
      expect(decoded).toEqual(input);
      expect(decoded).not.toBe(input);
      expect(input).toEqual(before);
      expect(dictionary).toEqual([...new Set(before)]);
      expect(ids).toEqual(before.map((value) => dictionary.indexOf(value)));
    },
  );

  it.each([-1, 1, 0.5, NaN])("rejects an unknown ID %s", (id) => {
    expect(() => decodeCountries(["US"], [id])).toThrow(RangeError);
  });
});

describe("month partition pruning", () => {
  it("keeps two two-row parts in each of three month groups", () => {
    expect(MONTH_PARTITIONS.map((group) => group.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    for (const group of MONTH_PARTITIONS) {
      expect(group.parts).toHaveLength(2);
      expect(group.parts.every((part) => part.rows.length === 2)).toBe(true);
    }
  });

  it.each(["2026-01", "2026-02", "2026-03"] as const)(
    "reads exactly %s while preserving all stored rows",
    (month) => {
      const before = JSON.stringify(MONTH_PARTITIONS);
      const all = partitionSnapshot("all");
      const snapshot = partitionSnapshot(month);
      const expectedGroup = MONTH_PARTITIONS.find(
        (group) => group.month === month,
      );
      expect(snapshot.selectedGroups).toEqual([expectedGroup]);
      expect(snapshot.prunedGroups.map((group) => group.month)).toEqual(
        MONTH_PARTITIONS.filter((group) => group.month !== month).map(
          (group) => group.month,
        ),
      );
      expect(snapshot.readRows).toBe(4);
      expect(snapshot.totalRows).toBe(12);
      expect(snapshot.storedRows).toEqual(all.storedRows);
      expect(
        snapshot.selectedGroups.flatMap((group) =>
          group.parts.flatMap((part) => [...part.rows]),
        ),
      ).toEqual(expectedGroup?.parts.flatMap((part) => [...part.rows]));
      expect(JSON.stringify(MONTH_PARTITIONS)).toBe(before);
      expect(partitionSnapshot("all")).toEqual(all);
    },
  );

  it("reads all twelve rows without pruning when no month is selected", () => {
    const snapshot = partitionSnapshot("all");
    expect(snapshot.selectedGroups).toEqual(MONTH_PARTITIONS);
    expect(snapshot.prunedGroups).toEqual([]);
    expect(snapshot.readRows).toBe(12);
    expect(snapshot.totalRows).toBe(12);
    expect(snapshot.storedRows).toHaveLength(12);
  });
});

describe("scene routes", () => {
  it.each([1, 2])("attaches query routes to each of %s part slabs", (count) => {
    for (let index = 0; index < count; index++) {
      const route = partQueryRoute(index, count);
      const start = route[0];
      const next = route[1];
      const end = route[route.length - 1];
      const previous = route[route.length - 2];
      const target = partPosition(index, count);
      expect(start).toEqual([
        PART_QUERY_POSITION[0],
        PART_QUERY_POSITION[1],
        PART_QUERY_POSITION[2] - PART_QUERY_SIZE[2] / 2,
      ]);
      expect(next.slice(0, 2)).toEqual(start.slice(0, 2));
      expect(next[2]).toBeLessThan(start[2]);
      expect(end).toEqual([target[0], target[1], target[2] + PART_SIZE[2] / 2]);
      expect(previous.slice(0, 2)).toEqual(end.slice(0, 2));
      expect(previous[2]).toBeGreaterThan(end[2]);
      routeClearsBoxes(
        route,
        Array.from({ length: count }, (_, partIndex) => ({
          center: partPosition(partIndex, count),
          size: PART_SIZE,
        })),
      );
    }
  });

  it("attaches every encoded ID to its dictionary entry above the solid blocks", () => {
    const encoded = encodeCountries(COUNTRY_VALUES);
    const boxes = [
      ...encoded.dictionary.map((_, index) => ({
        center: dictionaryPosition(index),
        size: DICTIONARY_SIZE,
      })),
      ...encoded.ids.map((_, index) => ({
        center: encodedIdPosition(index),
        size: ENCODED_ID_SIZE,
      })),
    ];
    for (const [index, id] of encoded.ids.entries()) {
      const route = dictionaryRoute(index, id);
      const source = encodedIdPosition(index);
      const target = dictionaryPosition(id);
      const start = route[0];
      const next = route[1];
      const end = route[route.length - 1];
      const previous = route[route.length - 2];
      expect(start).toEqual([
        source[0],
        source[1] + ENCODED_ID_SIZE[1] / 2,
        source[2],
      ]);
      expect(next[0]).toBe(start[0]);
      expect(next[2]).toBe(start[2]);
      expect(next[1]).toBeGreaterThan(start[1]);
      expect(end).toEqual([
        target[0],
        target[1] + DICTIONARY_SIZE[1] / 2,
        target[2],
      ]);
      expect(previous[0]).toBe(end[0]);
      expect(previous[2]).toBe(end[2]);
      expect(previous[1]).toBeGreaterThan(end[1]);
      routeClearsBoxes(route, boxes);
    }
  });

  it.each([0, 1, 2])(
    "reaches month tray %s through the clear front aisle",
    (index) => {
      const route = partitionRoute(index);
      const start = route[0];
      const next = route[1];
      const end = route[route.length - 1];
      const previous = route[route.length - 2];
      const target = partitionPosition(index);
      expect(start).toEqual([
        PARTITION_QUERY_POSITION[0],
        PARTITION_QUERY_POSITION[1],
        PARTITION_QUERY_POSITION[2] - PARTITION_QUERY_SIZE[2] / 2,
      ]);
      expect(next.slice(0, 2)).toEqual(start.slice(0, 2));
      expect(next[2]).toBeLessThan(start[2]);
      expect(end).toEqual([
        target[0],
        target[1],
        target[2] + PARTITION_TRAY_SIZE[2] / 2,
      ]);
      expect(previous.slice(0, 2)).toEqual(end.slice(0, 2));
      expect(previous[2]).toBeGreaterThan(end[2]);
      routeClearsBoxes(
        route,
        [0, 1, 2].map((groupIndex) => ({
          center: partitionPosition(groupIndex),
          size: PARTITION_TRAY_SIZE,
        })),
      );
    },
  );
});
