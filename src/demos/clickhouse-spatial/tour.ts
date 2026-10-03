import {
  aggregateShards,
  columnReadWork,
  COUNTRY_VALUES,
  encodeCountries,
  initialPartsState,
  insertNextBatch,
  mergeActiveParts,
  partitionSnapshot,
  queryActiveParts,
  type ColumnLayout,
  type Month,
  type PartsState,
  type ReplicaSelection,
} from "./model";

export type SpatialTourKind =
  | "columns"
  | "compression"
  | "parts"
  | "partitions"
  | "cluster";

export interface SpatialTourState {
  layout: ColumnLayout;
  encoded: boolean;
  dictionaryRow: number;
  parts: PartsState;
  month: Month | "all";
  selection: ReplicaSelection;
  queried: boolean;
}

export interface SpatialTourFrame {
  state: SpatialTourState;
  title: string;
  narration: string;
}

export const SPATIAL_TOUR_STEPS = {
  columns: 5,
  compression: 6,
  parts: 6,
  partitions: 3,
  cluster: 5,
} as const satisfies Record<SpatialTourKind, number>;

function initialState(): SpatialTourState {
  return {
    layout: "rows",
    encoded: false,
    dictionaryRow: 0,
    parts: initialPartsState(),
    month: "all",
    selection: ["A", "A"],
    queried: false,
  };
}

/** Each call builds an independent snapshot; advancing never mutates earlier frames. */
export function spatialTourFrame(
  kind: SpatialTourKind,
  step: number,
): SpatialTourFrame {
  const last = SPATIAL_TOUR_STEPS[kind] - 1;
  const index = Number.isNaN(step)
    ? 0
    : Math.max(0, Math.min(last, Math.trunc(step)));
  const state = initialState();

  switch (kind) {
    case "columns": {
      state.layout = index < 2 ? "rows" : "columns";
      state.queried = index === 1 || index >= 3;
      const work = columnReadWork(state.layout);
      const captions = [
        {
          title: "Six records, four fields",
          narration:
            "Each record has a day, country, event, and revenue in cents. A row layout keeps the four fields of each record together.",
        },
        {
          title: "Read day and revenue",
          narration: `The query needs two fields. In this row-layout illustration, it touches all ${work.totalValues} field values across the six records.`,
        },
        {
          title: "Group values by column",
          narration:
            "The same records now form four columns. All day values sit together, as do all revenue values in cents. The country and event values still exist.",
        },
        {
          title: "Read only the selected columns",
          narration: `Reading day and revenue in cents touches ${work.readValues} field values. Country and event stay outside this read. These counts describe the illustration, not elapsed time.`,
        },
        {
          title: "All records remain available",
          narration: `All six records still exist. This query reads ${work.readValues} day and revenue values from ${work.totalValues} stored field values. Selecting columns changes which fields are read, not which records are stored.`,
        },
      ];
      return { state, ...captions[index] };
    }

    case "compression": {
      const encoding = encodeCountries(COUNTRY_VALUES);
      state.encoded = index > 0;
      state.dictionaryRow = [0, 0, 1, 3, 10, 0][index];
      const captions = [
        {
          title: "Repeated country values",
          narration: `The ${COUNTRY_VALUES.length} records contain repeated country names. Only ${encoding.dictionary.length} different countries appear.`,
        },
        {
          title: "Keep one entry per country",
          narration:
            "A dictionary holds US, DE, and JP once each. Each record keeps an ID pointing to its country. The first record points to US.",
        },
        {
          title: "Look up the second record",
          narration:
            "The second record's ID points to DE. The dictionary entry supplies the original country value.",
        },
        {
          title: "Look up the fourth record",
          narration:
            "The fourth record points to JP. Its place in the record sequence stays the same.",
        },
        {
          title: "Reuse the US entry",
          narration:
            "The eleventh record also points to US. Repeated values share a dictionary entry while keeping separate records.",
        },
        {
          title: "All twelve records remain",
          narration:
            "Looking up every ID restores all twelve country values in their original order. Sharing dictionary entries has not removed any records.",
        },
      ];
      return { state, ...captions[index] };
    }

    case "parts": {
      if (index > 0) state.parts = insertNextBatch(state.parts);
      if (index >= 3) state.parts = mergeActiveParts(state.parts);
      state.queried = index === 2 || index >= 4;
      const result = queryActiveParts(state.parts);
      const captions = [
        {
          title: "One sorted part",
          narration:
            "The first inserted batch becomes P1. Its three rows are sorted by key inside the part.",
        },
        {
          title: "Insert another batch",
          narration:
            "The next batch creates P2. The two parts each have their own sorted rows, and both are active.",
        },
        {
          title: "Read both active parts",
          narration: `The query reads ${result.count} rows across P1 and P2. Both rows with key 3 contribute to the amount total of ${result.amount}.`,
        },
        {
          title: "Merge into a replacement part",
          narration:
            "A background merge combines the sorted rows into P3. P3 replaces the two active parts. Both rows with key 3 remain.",
        },
        {
          title: "Read the replacement part",
          narration: `Reading P3 still returns ${result.count} rows and an amount total of ${result.amount}. An ordinary MergeTree merge preserves duplicate keys.`,
        },
        {
          title: "Merging preserves every row",
          narration: `P3 contains all ${result.count} rows, including both rows with key 3. The amount total remains ${result.amount}. Combining parts has preserved the query result.`,
        },
      ];
      return { state, ...captions[index] };
    }

    case "partitions": {
      state.month = index === 0 ? "all" : "2026-02";
      const snapshot = partitionSnapshot(state.month);
      const captions = [
        {
          title: "Three month groups",
          narration: `January, February, and March each hold four rows in two parts. Reading all three months covers ${snapshot.totalRows} rows.`,
        },
        {
          title: "Read February",
          narration: `The month filter selects February's ${snapshot.readRows} rows. January and March are outside this read.`,
        },
        {
          title: "Pruning leaves storage intact",
          narration: `The read covers ${snapshot.readRows} February rows, while all ${snapshot.totalRows} rows remain stored. A query filter does not delete the other months.`,
        },
      ];
      return { state, ...captions[index] };
    }

    case "cluster": {
      state.selection =
        index < 2 ? ["A", "A"] : index === 2 ? ["B", "A"] : ["B", "B"];
      state.queried = index > 0;
      const result = aggregateShards(state.selection);
      const captions = [
        {
          title: "Two shards, two copies each",
          narration:
            "Each shard owns different rows. Replica A and replica B hold up-to-date copies of the same shard's rows in this example.",
        },
        {
          title: "Read one copy per shard",
          narration: `The query reads replica A from each shard. Their partial sums, 60 and 150, combine to ${result.sum}.`,
        },
        {
          title: "Choose the other first-shard copy",
          narration: `Reading replica B for the first shard and A for the second still gives ${result.sum}. The copies represent the same logical rows.`,
        },
        {
          title: "Read replica B from each shard",
          narration: `Reading replica B from both shards still returns ${result.logicalRows} logical rows and a total of ${result.sum}. The ${result.storedRows} stored rows include the extra copies.`,
        },
        {
          title: "Different copies, the same total",
          narration: `The total stays ${result.sum} across ${result.logicalRows} logical rows. Choosing one up-to-date copy per shard preserves the result; extra copies do not add new logical rows.`,
        },
      ];
      return { state, ...captions[index] };
    }
  }
}
