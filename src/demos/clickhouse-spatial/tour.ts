import {
  initialPartsState,
  insertNextBatch,
  mergeActiveParts,
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
      const titles = [
        "Six records, four fields",
        "Read day and revenue",
        "Group values by column",
        "Read only the selected columns",
        "All records remain available",
      ];
      return { state, title: titles[index] };
    }

    case "compression": {
      state.encoded = index > 0;
      state.dictionaryRow = [0, 0, 1, 3, 10, 0][index];
      const titles = [
        "Repeated country values",
        "Keep one entry per country",
        "Look up the second record",
        "Look up the fourth record",
        "Reuse the US entry",
        "All twelve records remain",
      ];
      return { state, title: titles[index] };
    }

    case "parts": {
      if (index > 0) state.parts = insertNextBatch(state.parts);
      if (index >= 3) state.parts = mergeActiveParts(state.parts);
      state.queried = index === 2 || index >= 4;
      const titles = [
        "One sorted part",
        "Insert another batch",
        "Read both active parts",
        "Merge into a replacement part",
        "Read the replacement part",
        "Merging preserves every row",
      ];
      return { state, title: titles[index] };
    }

    case "partitions": {
      state.month = index === 0 ? "all" : "2026-02";
      const titles = [
        "Three month groups",
        "Read February",
        "Pruning leaves storage intact",
      ];
      return { state, title: titles[index] };
    }

    case "cluster": {
      state.selection =
        index < 2 ? ["A", "A"] : index === 2 ? ["B", "A"] : ["B", "B"];
      state.queried = index > 0;
      const titles = [
        "Two shards, two copies each",
        "Read one copy per shard",
        "Choose the other first-shard copy",
        "Read replica B from each shard",
        "Different copies, the same total",
      ];
      return { state, title: titles[index] };
    }
  }
}
