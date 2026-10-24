export type LessonId =
  | "capacity"
  | "roles"
  | "regions"
  | "routing"
  | "quorum"
  | "transaction"
  | "index"
  | "snapshot"
  | "tiflash"
  | "scaling";
export interface Lesson {
  title: string;
  dimension: "2d" | "3d";
  beats: readonly string[];
}

/** Bounded teaching sequences, not latency or throughput measurements. */
export const LESSONS: Record<LessonId, Lesson> = {
  capacity: {
    title: "Why distribute a database?",
    dimension: "2d",
    beats: [
      "Start with one machine",
      "Find a real constraint",
      "Keep one SQL interface",
    ],
  },
  roles: {
    title: "Four component roles",
    dimension: "2d",
    beats: [
      "TiDB speaks SQL",
      "TiKV owns durable data",
      "PD coordinates the cluster",
      "TiFlash is optional",
    ],
  },
  regions: {
    title: "Split the ordered key space",
    dimension: "3d",
    beats: ["Two contiguous Regions", "Split A", "Place ranges independently"],
  },
  routing: {
    title: "Follow one point read",
    dimension: "2d",
    beats: [
      "Accept SQL",
      "Get a snapshot",
      "Route to the Region",
      "Read the visible row",
      "Return the SQL result",
    ],
  },
  quorum: {
    title: "Commit with a majority",
    dimension: "3d",
    beats: [
      "One Region, three copies",
      "Append at the leader",
      "Replicate to reachable voters",
      "Check the majority",
    ],
  },
  transaction: {
    title: "One transaction, two Regions",
    dimension: "2d",
    beats: [
      "Update two keys",
      "Prewrite both participants",
      "Establish the commit decision",
      "Finish the remaining key",
      "Observe one outcome",
    ],
  },
  index: {
    title: "Find an index entry, then a row",
    dimension: "3d",
    beats: [
      "Ask for a name by email",
      "Search the secondary index",
      "Carry the row handle",
      "Read at the same snapshot",
      "Return one row",
    ],
  },
  snapshot: {
    title: "Choose the visible version",
    dimension: "2d",
    beats: [
      "Keep committed versions",
      "Fix the read timestamp",
      "Select the latest visible version",
    ],
  },
  tiflash: {
    title: "Rows and columnar replicas",
    dimension: "3d",
    beats: [
      "Store transactional rows",
      "Replicate into columns",
      "Wait for a safe read",
      "Scan the needed column",
      "Aggregate at one snapshot",
    ],
  },
  scaling: {
    title: "Grow compute and storage separately",
    dimension: "3d",
    beats: [
      "Two SQL servers, three stores",
      "Add SQL compute",
      "Add an empty TiKV store",
      "Redistribute Region replicas",
    ],
  },
};

export interface KeyRange {
  id: string;
  start: number;
  end: number;
  store: number;
}
export function regionRanges(phase: number): KeyRange[] {
  return phase === 0
    ? [
        { id: "A", start: 0, end: 50, store: 1 },
        { id: "B", start: 50, end: 100, store: 2 },
      ]
    : [
        { id: "A1", start: 0, end: 25, store: 1 },
        { id: "A2", start: 25, end: 50, store: phase >= 2 ? 3 : 1 },
        { id: "B", start: 50, end: 100, store: 2 },
      ];
}
export function quorum(phase: number, unavailable: number) {
  const reachable = [true, unavailable < 2, unavailable === 0];
  const copies =
    phase < 1 ? 0 : phase < 2 ? 1 : reachable.filter(Boolean).length;
  return {
    reachable,
    copies,
    required: 2,
    committed: phase >= 3 && copies >= 2,
  };
}
export const VERSIONS = [
  { commit: 60, name: "Lin" },
  { commit: 100, name: "Will" },
  { commit: 140, name: "William" },
] as const;
export function visibleVersion(snapshot: number) {
  return VERSIONS.filter((version) => version.commit <= snapshot).at(-1);
}
export const AMOUNTS = [12, 9, 18, 5] as const;
export function scaling(phase: number) {
  return {
    compute: phase >= 1 ? 3 : 2,
    stores:
      phase < 2
        ? [
            ["A", "B", "C"],
            ["A", "B", "C"],
            ["A", "B", "C"],
          ]
        : phase < 3
          ? [["A", "B", "C"], ["A", "B", "C"], ["A", "B", "C"], []]
          : [
              ["A", "B"],
              ["A", "C"],
              ["B", "C"],
              ["A", "B", "C"],
            ],
  };
}
export function outcome(id: LessonId, phase: number, option: number) {
  if (id === "quorum" && phase >= 3) {
    const state = quorum(phase, option);
    return state.committed
      ? `${state.copies}/3 copies · committed`
      : `${state.copies}/3 copies · no quorum`;
  }
  if (id === "snapshot" && phase >= 2)
    return `Snapshot ${option} returns ${visibleVersion(option)?.name ?? "no row"}`;
}
