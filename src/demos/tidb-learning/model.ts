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
export interface Beat {
  title: string;
  explanation: string;
}
export interface Lesson {
  title: string;
  dimension: "2d" | "3d";
  question: string;
  caption: string;
  beats: readonly Beat[];
}

/** Bounded teaching sequences, not latency or throughput measurements. */
export const LESSONS: Record<LessonId, Lesson> = {
  capacity: {
    title: "Why distribute a database?",
    dimension: "2d",
    question: "Outgrowing one machine?",
    caption:
      "Squares represent work or data. More machines add capacity and network coordination costs; speedups vary.",
    beats: [
      {
        title: "Start with one machine",
        explanation:
          "One host runs SQL and stores data: a simple starting point.",
      },
      {
        title: "Find a real constraint",
        explanation:
          "More work or data can overwhelm one host. Diagnose the bottleneck first.",
      },
      {
        title: "Keep one SQL interface",
        explanation:
          "TiDB separates SQL from storage and routes keys across machines.",
      },
    ],
  },
  roles: {
    title: "Four component roles",
    dimension: "2d",
    question: "Who does what?",
    caption:
      "Orange computes; blue stores rows; yellow coordinates; green stores columns. Dashed PD links carry metadata, not rows.",
    beats: [
      {
        title: "TiDB speaks SQL",
        explanation:
          "TiDB accepts MySQL connections, plans queries, and combines results.",
      },
      {
        title: "TiKV owns durable data",
        explanation:
          "TiKV stores rows and indexes as ordered keys, grouped into replicated Regions.",
      },
      {
        title: "PD coordinates the cluster",
        explanation:
          "PD supplies timestamps and placement metadata and schedules replicas.",
      },
      {
        title: "TiFlash is optional",
        explanation:
          "Enable TiFlash replicas per table to support analytical scans.",
      },
    ],
  },
  regions: {
    title: "Split the ordered key space",
    dimension: "3d",
    question: "How does data spread out?",
    caption:
      "Slabs are separate ranges, not replicas. Boundaries are illustrative; real keys encode table and index identifiers.",
    beats: [
      {
        title: "Two contiguous Regions",
        explanation: "A and B cover adjacent key ranges without overlap.",
      },
      {
        title: "Split A",
        explanation:
          "Split A into A1 and A2. Every key stays covered exactly once.",
      },
      {
        title: "Place ranges independently",
        explanation:
          "PD can move replicas and leaders independently for each Region.",
      },
    ],
  },
  routing: {
    title: "Follow one point read",
    dimension: "2d",
    question: "How does SQL find a row?",
    caption:
      "Clustered primary-key lookup, without conflicting locks. Yellow carries metadata; blue carries reads. Timing and topology are illustrative.",
    beats: [
      {
        title: "Accept SQL",
        explanation: "TiDB plans a lookup for user 427.",
      },
      {
        title: "Get a snapshot",
        explanation:
          "PD supplies timestamp 120; metadata identifies the row’s Region.",
      },
      {
        title: "Route to the Region",
        explanation: "TiDB reads directly from Region B’s leader on TiKV 2.",
      },
      {
        title: "Read the visible row",
        explanation: "TiKV returns the row version visible at snapshot 120.",
      },
      {
        title: "Return the SQL result",
        explanation:
          "TiDB returns Will. Shard routing stays inside the database.",
      },
    ],
  },
  quorum: {
    title: "Commit with a majority",
    dimension: "3d",
    question: "How many copies allow a commit?",
    caption:
      "Three voters need two copies. The leader stays reachable. Conceptual logs illustrate writes, not failover or read availability.",
    beats: [
      {
        title: "One Region, three copies",
        explanation: "Leader and followers store copies of the same range.",
      },
      {
        title: "Append at the leader",
        explanation: "The leader appends an entry. One copy cannot commit.",
      },
      {
        title: "Replicate to reachable voters",
        explanation:
          "Reachable followers acknowledge the entry; unavailable followers cannot.",
      },
      {
        title: "Check the majority",
        explanation:
          "Try losing one follower, then two. Can two copies still agree?",
      },
    ],
  },
  transaction: {
    title: "One transaction, two Regions",
    dimension: "2d",
    question: "How do two Regions commit together?",
    caption:
      "L = leader; F = follower. Simplified classic Percolator two-phase commit. The primary transaction key is a protocol role, not a table’s primary key. Readers may resolve remaining locks.",
    beats: [
      {
        title: "Update two keys",
        explanation:
          "Order is in A; inventory is in B. Each has its own Raft log.",
      },
      {
        title: "Prewrite both participants",
        explanation:
          "Both Regions prepare keys and locks, replicating their changes independently.",
      },
      {
        title: "Establish the commit decision",
        explanation:
          "Committing the primary transaction key in A decides the whole transaction.",
      },
      {
        title: "Finish the remaining key",
        explanation:
          "Finalize inventory in B. The transaction protocol connects both Regions’ outcomes.",
      },
      {
        title: "Observe one outcome",
        explanation:
          "Snapshot reads and lock resolution preserve one transaction outcome.",
      },
    ],
  },
  index: {
    title: "Find an index entry, then a row",
    dimension: "3d",
    question: "Why look up twice?",
    caption:
      "Logical sorted keys, not physical files. This email index lacks name; fetching the row supplies it. A covering index can skip that lookup.",
    beats: [
      {
        title: "Ask for a name by email",
        explanation: "Find a name using a nonunique email index.",
      },
      {
        title: "Search the secondary index",
        explanation: "IndexRangeScan finds email → handle 427.",
      },
      {
        title: "Carry the row handle",
        explanation: "TableRowIDScan uses handle 427 to locate the row.",
      },
      {
        title: "Read at the same snapshot",
        explanation: "At snapshot 120, Will is visible. William is too new.",
      },
      {
        title: "Return one row",
        explanation:
          "Two lookup phases, one snapshot, one row. Physical disk reads vary.",
      },
    ],
  },
  snapshot: {
    title: "Choose the visible version",
    dimension: "2d",
    question: "Which version can this read see?",
    caption:
      "Illustrative timestamps; no conflicting locks. Compare snapshots with commit times. Snapshot isolation does not guarantee serializable execution.",
    beats: [
      {
        title: "Keep committed versions",
        explanation: "Keep versions committed at 60, 100, and 140.",
      },
      {
        title: "Fix the read timestamp",
        explanation: "Fix a snapshot. Later commits stay outside its view.",
      },
      {
        title: "Select the latest visible version",
        explanation: "Read the newest commit at or before the snapshot.",
      },
    ],
  },
  tiflash: {
    title: "Rows and columnar replicas",
    dimension: "3d",
    question: "How do columns help scans?",
    caption:
      "Blue rows feed green columns. TiFlash is a non-voting Raft learner. Log positions differ from transaction timestamps; checks are simplified.",
    beats: [
      {
        title: "Store transactional rows",
        explanation: "TiKV stores rows. Four amounts: 12, 9, 18, 5.",
      },
      {
        title: "Replicate into columns",
        explanation:
          "TiFlash replicas receive data asynchronously. Applied position: 8; required: 10.",
      },
      {
        title: "Wait for a safe read",
        explanation:
          "Reach position 10. Validate consistency before serving this snapshot.",
      },
      {
        title: "Scan the needed column",
        explanation:
          "Scan only amount. The optimizer considers costs and available replicas.",
      },
      {
        title: "Aggregate at one snapshot",
        explanation:
          "SUM(amount) = 44. TiKV may suit point reads better. Illustrative, not benchmarked.",
      },
    ],
  },
  scaling: {
    title: "Grow compute and storage separately",
    dimension: "3d",
    question: "Which resource needs more capacity?",
    caption:
      "Every Region keeps three replicas. Placement is illustrative; transfers take time and throughput gains vary. A hot key remains indivisible.",
    beats: [
      {
        title: "Two SQL servers, three stores",
        explanation:
          "SQL and storage scale separately. A, B, C each have three replicas.",
      },
      {
        title: "Add SQL compute",
        explanation: "Add SQL capacity without copying every row.",
      },
      {
        title: "Add an empty TiKV store",
        explanation: "TiKV 4 joins empty. Replicas have not moved yet.",
      },
      {
        title: "Redistribute Region replicas",
        explanation:
          "Move replicas onto TiKV 4. Each Region still has three copies.",
      },
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
      ? `${state.copies}/3 copies · committed. The reachable majority can commit this log entry.`
      : `${state.copies}/3 copies · no quorum. A new log entry cannot commit.`;
  }
  if (id === "snapshot" && phase >= 2)
    return `Snapshot ${option} returns ${visibleVersion(option)?.name ?? "no row"}. Later commits are excluded.`;
  return LESSONS[id].beats[phase].explanation;
}
