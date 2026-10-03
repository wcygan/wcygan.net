/** Small deterministic lessons, not a simulation of Flink's scheduler or hash. */
export type Key = "Ada" | "Bo" | "Cy";
export interface KeyRecord {
  id: number;
  key: Key;
}

export const KEY_RECORDS: readonly KeyRecord[] = [
  { id: 1, key: "Ada" },
  { id: 2, key: "Bo" },
  { id: 3, key: "Cy" },
  { id: 4, key: "Ada" },
  { id: 5, key: "Cy" },
  { id: 6, key: "Ada" },
];

/** Illustrative assignment; real Flink routing uses key groups and hashing. */
export const KEY_ASSIGNMENT: Readonly<Record<Key, 0 | 1>> = {
  Ada: 0,
  Bo: 0,
  Cy: 1,
};

function clampStep(step: number, last: number) {
  return Math.min(last, Math.max(0, Math.floor(Number.isNaN(step) ? 0 : step)));
}

export interface KeyedSnapshot {
  step: number;
  processed: number;
  counts: Record<Key, number>;
  current: KeyRecord | null;
  done: boolean;
}

export function keyedSnapshot(requestedStep: number): KeyedSnapshot {
  const step = clampStep(requestedStep, KEY_RECORDS.length);
  const counts: Record<Key, number> = { Ada: 0, Bo: 0, Cy: 0 };
  for (const record of KEY_RECORDS.slice(0, step)) counts[record.key] += 1;
  return {
    step,
    processed: step,
    counts,
    current: KEY_RECORDS[step - 1] ?? null,
    done: step === KEY_RECORDS.length,
  };
}

export type TaskManagerId = "taskmanager-0" | "taskmanager-1";
export type SubtaskId = "source-0" | "source-1" | "count-0" | "count-1";
export type RuntimeNodeId =
  | "jobmanager"
  | TaskManagerId
  | SubtaskId
  | "input"
  | "sink";
export interface TaskManager {
  id: TaskManagerId;
  subtasks: readonly SubtaskId[];
}
export interface RuntimeEdge {
  id: string;
  from: RuntimeNodeId;
  to: RuntimeNodeId;
  kind: "control" | "data";
}

/** Each worker hosts two illustrative subtasks; slots are not CPU cores. */
export const RUNTIME_TASK_MANAGERS: readonly TaskManager[] = [
  { id: "taskmanager-0", subtasks: ["source-0", "count-0"] },
  { id: "taskmanager-1", subtasks: ["source-1", "count-1"] },
];

export const RUNTIME_CONTROL_EDGES: readonly RuntimeEdge[] = [
  {
    id: "deploy-0",
    from: "jobmanager",
    to: "taskmanager-0",
    kind: "control",
  },
  {
    id: "deploy-1",
    from: "jobmanager",
    to: "taskmanager-1",
    kind: "control",
  },
];

export const RUNTIME_DATA_EDGES: readonly RuntimeEdge[] = [
  { id: "read-0", from: "input", to: "source-0", kind: "data" },
  { id: "read-1", from: "input", to: "source-1", kind: "data" },
  { id: "shuffle-00", from: "source-0", to: "count-0", kind: "data" },
  { id: "shuffle-01", from: "source-0", to: "count-1", kind: "data" },
  { id: "shuffle-10", from: "source-1", to: "count-0", kind: "data" },
  { id: "shuffle-11", from: "source-1", to: "count-1", kind: "data" },
  { id: "emit-0", from: "count-0", to: "sink", kind: "data" },
  { id: "emit-1", from: "count-1", to: "sink", kind: "data" },
];

export interface RuntimeSnapshot {
  step: number;
  status: string;
  action: "deploy" | "read" | "shuffle" | "emit";
  activeEdgeIds: string[];
  dataPath: RuntimeNodeId[];
  done: boolean;
}

const RUNTIME_STEPS: Omit<RuntimeSnapshot, "step" | "done">[] = [
  {
    status: "The JobManager deploys subtasks to the TaskManagers.",
    action: "deploy",
    activeEdgeIds: ["deploy-0", "deploy-1"],
    dataPath: [],
  },
  {
    status: "A record enters source-0 on TaskManager 0.",
    action: "read",
    activeEdgeIds: ["read-0"],
    dataPath: ["input", "source-0"],
  },
  {
    status: "The keyed shuffle routes the record to count-1 on TaskManager 1.",
    action: "shuffle",
    activeEdgeIds: ["shuffle-01"],
    dataPath: ["input", "source-0", "count-1"],
  },
  {
    status:
      "count-1 sends its result to the sink; records bypass the JobManager.",
    action: "emit",
    activeEdgeIds: ["emit-1"],
    dataPath: ["input", "source-0", "count-1", "sink"],
  },
];

export function runtimeSnapshot(requestedStep: number): RuntimeSnapshot {
  const step = clampStep(requestedStep, RUNTIME_STEPS.length - 1);
  const snapshot = RUNTIME_STEPS[step];
  return {
    ...snapshot,
    step,
    activeEdgeIds: [...snapshot.activeEdgeIds],
    dataPath: [...snapshot.dataPath],
    done: step === RUNTIME_STEPS.length - 1,
  };
}

export interface RecoveryCheckpoint {
  count: number;
  nextOffset: number;
}
export interface RecoverySnapshot {
  step: number;
  status: string;
  action: "idle" | "consume" | "checkpoint" | "crash" | "restore" | "replay";
  count: number | null;
  nextOffset: number | null;
  checkpoint: RecoveryCheckpoint | null;
  currentOffset: number | null;
  replay: boolean;
  processedOffsets: number[];
  done: boolean;
}

/**
 * A completed checkpoint persists both the source position and operator state.
 * Recovery replays a replayable source into restored state. This lesson does
 * not model external sink guarantees or in-flight checkpoint barriers.
 */
export function recoverySnapshot(requestedStep: number): RecoverySnapshot {
  const step = clampStep(requestedStep, 11);
  let count: number | null = 0;
  let nextOffset: number | null = 0;
  let checkpoint: RecoveryCheckpoint | null = null;
  const processedOffsets: number[] = [];
  let currentOffset: number | null = null;
  let action: RecoverySnapshot["action"] = "idle";
  let status = "The source starts at offset 0 with an empty count.";

  for (let event = 1; event <= step; event += 1) {
    currentOffset = null;
    if (event === 4 || event === 11) {
      checkpoint = { count: count!, nextOffset: nextOffset! };
      action = "checkpoint";
      status = `Completed checkpoint: count ${count}, next source offset ${nextOffset}.`;
    } else if (event === 7) {
      count = null;
      nextOffset = null;
      action = "crash";
      status =
        "The worker crashes; its local state is lost, but the checkpoint survives.";
    } else if (event === 8) {
      count = checkpoint!.count;
      nextOffset = checkpoint!.nextOffset;
      action = "restore";
      status =
        "Restore count 3 and next source offset 3 from the completed checkpoint.";
    } else {
      currentOffset = nextOffset!;
      processedOffsets.push(currentOffset);
      count = count! + 1;
      nextOffset = currentOffset + 1;
      action = event === 9 || event === 10 ? "replay" : "consume";
      status = `${action === "replay" ? "Replay" : "Consume"} source offset ${currentOffset}; count is ${count}.`;
    }
  }

  return {
    step,
    status,
    action,
    count,
    nextOffset,
    checkpoint,
    currentOffset,
    replay: action === "replay",
    processedOffsets,
    done: step === 11,
  };
}

/** Sources may read any key. keyBy routes all records for a key to its owner. */
export const SHUFFLE_RECORDS = [
  { id: 1, key: "Ada", source: 0 },
  { id: 2, key: "Cy", source: 0 },
  { id: 3, key: "Ada", source: 1 },
  { id: 4, key: "Cy", source: 1 },
] as const;
export function shuffleSnapshot(requestedStep: number) {
  const step = clampStep(requestedStep, SHUFFLE_RECORDS.length);
  const delivered = SHUFFLE_RECORDS.slice(0, step);
  return {
    step,
    current: delivered.at(-1) ?? null,
    delivered,
    counts: {
      Ada: delivered.filter((r) => r.key === "Ada").length,
      Cy: delivered.filter((r) => r.key === "Cy").length,
    },
  };
}

/** One unit of service per lane per step, then an arriving batch is routed.
 * Every hot-key record goes to lane 0 even when four subtasks are available.
 */
export function skewSnapshot(requestedStep: number, balanced = false) {
  const step = clampStep(requestedStep, 10);
  const queued = [0, 0, 0, 0],
    completed = [0, 0, 0, 0];
  let arrivals = 0;
  for (let tick = 1; tick <= step; tick++) {
    for (let lane = 0; lane < 4; lane++)
      if (queued[lane] > 0) {
        queued[lane]--;
        completed[lane]++;
      }
    if (tick <= 3) {
      const lanes = balanced ? [0, 1, 2, 3] : [0, 0, 0, 1];
      for (const lane of lanes) {
        queued[lane]++;
        arrivals++;
      }
    }
  }
  return {
    step,
    queued,
    completed,
    arrivals,
    unread: 12 - arrivals,
    totalCompleted: completed.reduce((a, b) => a + b, 0),
  };
}

/** An aligned checkpoint at a two-input operator. Channel A is blocked after
 * its barrier; A2 is buffered until B's matching barrier arrives. The snapshot
 * includes A1+B1 (sum 3), and excludes A2 (10). No failures/unaligned mode here.
 */
export function barrierSnapshot(requestedStep: number) {
  const step = clampStep(requestedStep, 6);
  return {
    step,
    sum: step < 1 ? 0 : step < 3 ? 1 : step < 6 ? 3 : 13,
    aBarrier: step >= 2,
    bBarrier: step >= 5,
    blocked: step >= 2 && step < 5,
    buffered: step >= 4 && step < 6,
    saved: step >= 5 ? 3 : null,
    status: [
      "Both channels deliver data before their checkpoint barriers.",
      "A1 contributes 1 to the running sum.",
      "Barrier 7 reaches channel A. This aligned example pauses A; B continues.",
      "B1 contributes 2. The sum is now 3; B's barrier has not arrived.",
      "A2 arrives after A's barrier and waits. It must not enter checkpoint 7.",
      "B's barrier arrives. Save sum 3 for checkpoint 7, then release channel A.",
      "Process buffered A2 (+10). Live sum 13; checkpoint 7 still contains 3.",
    ][step],
  };
}
