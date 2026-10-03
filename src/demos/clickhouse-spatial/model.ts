export type Point = [number, number, number];

export interface PartRow {
  key: number;
  amount: number;
}

export interface DataPart {
  id: string;
  rows: readonly PartRow[];
}

export interface PartsState {
  insertedBatches: number;
  parts: readonly DataPart[];
  merged: boolean;
}

/** One partition, ORDER BY key, ordinary MergeTree: equal keys remain rows. */
export const INSERT_BATCHES: readonly (readonly PartRow[])[] = [
  [
    { key: 3, amount: 30 },
    { key: 1, amount: 10 },
    { key: 5, amount: 50 },
  ],
  [
    { key: 4, amount: 40 },
    { key: 3, amount: 30 },
    { key: 2, amount: 20 },
  ],
];

export function createPart(id: string, batch: readonly PartRow[]): DataPart {
  return {
    id,
    rows: batch.map((row) => ({ ...row })).sort((a, b) => a.key - b.key),
  };
}

export function initialPartsState(): PartsState {
  return {
    insertedBatches: 1,
    parts: [createPart("P1", INSERT_BATCHES[0])],
    merged: false,
  };
}

export function insertNextBatch(state: PartsState): PartsState {
  const batch = INSERT_BATCHES[state.insertedBatches];
  if (!batch) return state;
  return {
    insertedBatches: state.insertedBatches + 1,
    parts: [...state.parts, createPart(`P${state.insertedBatches + 1}`, batch)],
    merged: false,
  };
}

/** Produce a replacement part; never mutate the source parts or remove duplicates. */
export function mergeActiveParts(state: PartsState): PartsState {
  if (state.parts.length < 2) return state;
  return {
    ...state,
    parts: [
      createPart(
        "P3",
        state.parts.flatMap((part) => [...part.rows]),
      ),
    ],
    merged: true,
  };
}

export function queryActiveParts(state: PartsState) {
  const rows = state.parts.flatMap((part) => [...part.rows]);
  return {
    count: rows.length,
    amount: rows.reduce((total, row) => total + row.amount, 0),
    duplicateKeyRows: rows.filter((row) => row.key === 3).length,
  };
}

/** Layers separate immutable parts; x orders each part's keys. */
export function partPosition(index: number, count: number): Point {
  return [0, count === 1 ? 0 : 0.65 - index * 1.3, 0];
}

export function rowPosition(index: number, count: number): Point {
  return [(index - (count - 1) / 2) * 0.78, 0.26, 0];
}

export const PART_SIZE: Point = [6, 0.12, 1.7];
export const PART_QUERY_POSITION: Point = [0, 0.25, 2.3];
export const PART_QUERY_SIZE: Point = [1.4, 0.5, 0.7];

/** Leave the query's front wall and enter the slab's front wall normally. */
export function partQueryRoute(index: number, count: number): Point[] {
  const target = partPosition(index, count);
  return [
    [
      PART_QUERY_POSITION[0],
      PART_QUERY_POSITION[1],
      PART_QUERY_POSITION[2] - PART_QUERY_SIZE[2] / 2,
    ],
    [0, PART_QUERY_POSITION[1], 1.3],
    [0, target[1], 1.3],
    [0, target[1], target[2] + PART_SIZE[2] / 2],
  ];
}

export type Replica = "A" | "B";
export type ReplicaSelection = readonly [Replica, Replica];

export const SHARDS = [
  { id: 1, amounts: [10, 20, 30], positionX: -2.1 },
  { id: 2, amounts: [40, 50, 60], positionX: 2.1 },
] as const;

/** x = distinct shard subsets; z = two synchronized copies of a subset. */
export function replicaPosition(shardIndex: number, replica: Replica): Point {
  return [SHARDS[shardIndex].positionX, 0, replica === "A" ? 1.25 : -1.25];
}

export const COORDINATOR_POSITION: Point = [0, 0.45, 3.9];
export const REPLICA_SIZE: Point = [2.65, 0.5, 1.45];

export function aggregateShards(selection: ReplicaSelection) {
  const partials = SHARDS.map((shard, index) => ({
    shard: shard.id,
    replica: selection[index],
    count: shard.amounts.length,
    sum: shard.amounts.reduce((total: number, amount) => total + amount, 0),
  }));
  return {
    partials,
    logicalRows: partials.reduce((total, part) => total + part.count, 0),
    sum: partials.reduce((total, part) => total + part.sum, 0),
    storedRows: SHARDS.reduce(
      (total, shard) => total + shard.amounts.length * 2,
      0,
    ),
  };
}

/** Query requests leave the coordinator wall and arrive at a replica wall. */
export function queryRoute(shardIndex: number, replica: Replica): Point[] {
  const target = replicaPosition(shardIndex, replica);
  const wallZ = target[2] + REPLICA_SIZE[2] / 2;
  const outsideX = target[0] + (shardIndex === 0 ? -1 : 1) * 1.65;
  return [
    [
      COORDINATOR_POSITION[0] + (shardIndex === 0 ? -0.8 : 0.8),
      COORDINATOR_POSITION[1],
      COORDINATOR_POSITION[2],
    ],
    [outsideX, COORDINATOR_POSITION[1], COORDINATOR_POSITION[2]],
    [outsideX, target[1], COORDINATOR_POSITION[2]],
    [outsideX, target[1], wallZ + 0.3],
    [target[0], target[1], wallZ + 0.3],
    [target[0], target[1], wallZ],
  ];
}

/** Show two copies of one shard without implying a permanent leader. */
export function replicaCopyRoute(shardIndex: number): Point[] {
  const first = replicaPosition(shardIndex, "A");
  const second = replicaPosition(shardIndex, "B");
  return [
    [first[0], first[1], first[2] - REPLICA_SIZE[2] / 2],
    [second[0], second[1], second[2] + REPLICA_SIZE[2] / 2],
  ];
}

export const COLUMN_FIELDS = ["day", "country", "event", "amount"] as const;
export type ColumnField = (typeof COLUMN_FIELDS)[number];
export type ColumnLayout = "rows" | "columns";

export interface ColumnRow {
  day: string;
  country: string;
  event: string;
  amount: number;
}

export const COLUMN_ROWS: readonly ColumnRow[] = [
  { day: "2026-01-01", country: "US", event: "sale", amount: 10 },
  { day: "2026-01-01", country: "DE", event: "view", amount: 0 },
  { day: "2026-01-02", country: "JP", event: "sale", amount: 20 },
  { day: "2026-01-02", country: "US", event: "sale", amount: 30 },
  { day: "2026-01-03", country: "DE", event: "view", amount: 0 },
  { day: "2026-01-03", country: "JP", event: "sale", amount: 40 },
];

/** Logical field values touched by this illustration, not bytes or elapsed time. */
export function columnReadWork(
  layout: ColumnLayout,
  selectedFields: readonly ColumnField[] = ["day", "amount"],
) {
  const fields = [...new Set(selectedFields)];
  const totalValues = COLUMN_ROWS.length * COLUMN_FIELDS.length;
  return {
    layout,
    selectedFields: fields,
    readValues:
      fields.length === 0
        ? 0
        : layout === "rows"
          ? totalValues
          : COLUMN_ROWS.length * fields.length,
    totalValues,
  };
}

export const COUNTRY_VALUES: readonly string[] = [
  "US",
  "DE",
  "US",
  "JP",
  "US",
  "DE",
  "JP",
  "US",
  "DE",
  "JP",
  "US",
  "DE",
];

export interface CountryEncoding {
  dictionary: string[];
  ids: number[];
}

/** IDs follow first appearance; repeated values reuse an existing entry. */
export function encodeCountries(values: readonly string[]): CountryEncoding {
  const dictionary: string[] = [];
  const valueIds = new Map<string, number>();
  const ids = values.map((value) => {
    let id = valueIds.get(value);
    if (id === undefined) {
      id = dictionary.length;
      dictionary.push(value);
      valueIds.set(value, id);
    }
    return id;
  });
  return { dictionary, ids };
}

export function decodeCountries(
  dictionary: readonly string[],
  ids: readonly number[],
): string[] {
  return ids.map((id) => {
    if (!Number.isInteger(id) || id < 0 || id >= dictionary.length) {
      throw new RangeError(`Unknown dictionary ID: ${id}`);
    }
    return dictionary[id];
  });
}

export const DICTIONARY_SIZE: Point = [1.4, 0.35, 0.9];
export const ENCODED_ID_SIZE: Point = [0.52, 0.35, 0.75];

export function dictionaryPosition(index: number): Point {
  return [-2.2, 0, (index - 1) * 1.25];
}

export function encodedIdPosition(index: number): Point {
  return [0.15 + (index % 4) * 0.75, 0, (Math.floor(index / 4) - 1) * 1.25];
}

/** Both ports are top-face centers; the route crosses above the solid blocks. */
export function dictionaryRoute(
  rowIndex: number,
  dictionaryIndex: number,
): Point[] {
  const source = encodedIdPosition(rowIndex);
  const target = dictionaryPosition(dictionaryIndex);
  return [
    [source[0], source[1] + ENCODED_ID_SIZE[1] / 2, source[2]],
    [source[0], 0.8, source[2]],
    [target[0], 0.8, source[2]],
    [target[0], 0.8, target[2]],
    [target[0], target[1] + DICTIONARY_SIZE[1] / 2, target[2]],
  ];
}

export type Month = "2026-01" | "2026-02" | "2026-03";

export interface MonthPartition {
  month: Month;
  parts: readonly DataPart[];
}

/** Each month owns two distinct parts with two rows each. */
export const MONTH_PARTITIONS: readonly MonthPartition[] = [
  {
    month: "2026-01",
    parts: [
      createPart("JAN-1", [
        { key: 1, amount: 10 },
        { key: 2, amount: 20 },
      ]),
      createPart("JAN-2", [
        { key: 3, amount: 30 },
        { key: 4, amount: 40 },
      ]),
    ],
  },
  {
    month: "2026-02",
    parts: [
      createPart("FEB-1", [
        { key: 5, amount: 50 },
        { key: 6, amount: 60 },
      ]),
      createPart("FEB-2", [
        { key: 7, amount: 70 },
        { key: 8, amount: 80 },
      ]),
    ],
  },
  {
    month: "2026-03",
    parts: [
      createPart("MAR-1", [
        { key: 9, amount: 90 },
        { key: 10, amount: 100 },
      ]),
      createPart("MAR-2", [
        { key: 11, amount: 110 },
        { key: 12, amount: 120 },
      ]),
    ],
  },
];

/** Pruning changes read scope; it neither removes nor rewrites stored rows. */
export function partitionSnapshot(month: Month | "all") {
  const selectedGroups = MONTH_PARTITIONS.filter(
    (group) => month === "all" || group.month === month,
  );
  const prunedGroups = MONTH_PARTITIONS.filter(
    (group) => month !== "all" && group.month !== month,
  );
  const storedRows = MONTH_PARTITIONS.flatMap((group) =>
    group.parts.flatMap((part) => [...part.rows]),
  );
  return {
    selectedGroups,
    prunedGroups,
    readRows: selectedGroups.reduce(
      (count, group) =>
        count + group.parts.reduce((rows, part) => rows + part.rows.length, 0),
      0,
    ),
    totalRows: storedRows.length,
    storedRows,
  };
}

const PARTITION_X = [-2.3, 0, 2.3] as const;
export const PARTITION_TRAY_SIZE: Point = [1.85, 0.12, 3.1];
export const PARTITION_QUERY_POSITION: Point = [0, 0.2, 3.2];
export const PARTITION_QUERY_SIZE: Point = [1.1, 0.4, 0.65];

export function partitionPosition(index: number): Point {
  return [PARTITION_X[index], -0.15, 0];
}

/** Reach a month's tray from the open aisle in front of all three groups. */
export function partitionRoute(index: number): Point[] {
  const target = partitionPosition(index);
  return [
    [
      PARTITION_QUERY_POSITION[0],
      PARTITION_QUERY_POSITION[1],
      PARTITION_QUERY_POSITION[2] - PARTITION_QUERY_SIZE[2] / 2,
    ],
    [0, PARTITION_QUERY_POSITION[1], 2.5],
    [target[0], PARTITION_QUERY_POSITION[1], 2.5],
    [target[0], target[1], 2.5],
    [target[0], target[1], target[2] + PARTITION_TRAY_SIZE[2] / 2],
  ];
}
