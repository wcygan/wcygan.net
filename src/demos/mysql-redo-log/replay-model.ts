export type ReplayState = {
  appliedCount: number;
  stepProgress: number;
};

export type Operation = "INSERT" | "UPDATE" | "DELETE";

export type RecordKey = "A" | "B" | "C";

export type LogRecord = {
  sequence: number;
  operation: Operation;
  recordKey: RecordKey;
  recordLabel: string;
  balance?: number;
};

export type LogRecordStatus = "pending" | "active" | "applied";

export type ReplayLogRecord = LogRecord & {
  status: LogRecordStatus;
};

export type ReplayPhase =
  | "checkpoint"
  | "select"
  | "transfer"
  | "write"
  | "settle"
  | "complete";

export type MemoryRecordStatus = "missing" | "present" | "deleted";

export type MemoryRecord = {
  key: RecordKey;
  label: string;
  status: MemoryRecordStatus;
  balance?: number;
  lastOperation?: Operation;
};

export type ReplaySnapshot = {
  appliedCount: number;
  databaseAppliedCount: number;
  stepProgress: number;
  phase: ReplayPhase;
  records: ReplayLogRecord[];
  database: MemoryRecord[];
  activeRecord?: ReplayLogRecord;
  lastAppliedRecord?: ReplayLogRecord;
  highlightedRecordKey?: RecordKey;
  highlightedOperation?: Operation;
};

export const REPLAY_DURATION_MS = 20_000;

const INTRO_END = 0.07;
const REPLAY_END = 0.94;
const TRANSFER_START = 0.18;
const DATABASE_WRITE_AT = 0.58;
const WRITE_END = 0.82;

export const RECORD_LABELS: Record<RecordKey, string> = {
  A: "Account A",
  B: "Account B",
  C: "Account C",
};

const CHECKPOINT_RECORDS: readonly MemoryRecord[] = [
  {
    key: "A",
    label: RECORD_LABELS.A,
    status: "present",
    balance: 900,
  },
  {
    key: "B",
    label: RECORD_LABELS.B,
    status: "present",
    balance: 250,
  },
  {
    key: "C",
    label: RECORD_LABELS.C,
    status: "missing",
  },
];

export const REPLAY_LOG_RECORDS: readonly LogRecord[] = [
  {
    sequence: 101,
    operation: "UPDATE",
    recordKey: "A",
    recordLabel: RECORD_LABELS.A,
    balance: 800,
  },
  {
    sequence: 102,
    operation: "INSERT",
    recordKey: "C",
    recordLabel: RECORD_LABELS.C,
    balance: 1200,
  },
  {
    sequence: 103,
    operation: "UPDATE",
    recordKey: "B",
    recordLabel: RECORD_LABELS.B,
    balance: 300,
  },
  {
    sequence: 104,
    operation: "UPDATE",
    recordKey: "A",
    recordLabel: RECORD_LABELS.A,
    balance: 725,
  },
  {
    sequence: 105,
    operation: "DELETE",
    recordKey: "C",
    recordLabel: RECORD_LABELS.C,
  },
  {
    sequence: 106,
    operation: "UPDATE",
    recordKey: "B",
    recordLabel: RECORD_LABELS.B,
    balance: 180,
  },
] as const;

export const INITIAL_REPLAY_STATE: ReplayState = {
  appliedCount: 0,
  stepProgress: 0,
};

export const REDUCED_MOTION_REPLAY_STATE: ReplayState = {
  appliedCount: REPLAY_LOG_RECORDS.length,
  stepProgress: 1,
};

export const INITIAL_REPLAY_SNAPSHOT =
  deriveReplaySnapshot(INITIAL_REPLAY_STATE);

export function deriveReplayTimelineSnapshot(progress: number) {
  const normalizedProgress = clamp(progress, 0, 1);

  if (normalizedProgress <= INTRO_END) {
    return INITIAL_REPLAY_SNAPSHOT;
  }

  if (normalizedProgress >= REPLAY_END) {
    return deriveReplaySnapshot(REDUCED_MOTION_REPLAY_STATE);
  }

  const replayProgress =
    (normalizedProgress - INTRO_END) / (REPLAY_END - INTRO_END);
  const scaledStep = replayProgress * REPLAY_LOG_RECORDS.length;
  const appliedCount = Math.floor(scaledStep);

  return deriveReplaySnapshot({
    appliedCount,
    stepProgress: scaledStep - appliedCount,
  });
}

export function deriveReplaySnapshot(state: ReplayState): ReplaySnapshot {
  const appliedCount = clampAppliedCount(state.appliedCount);
  const stepProgress = clamp(state.stepProgress, 0, 1);
  const activeRecord = REPLAY_LOG_RECORDS[appliedCount];
  const phase = replayPhase(appliedCount, stepProgress, activeRecord);
  const activeRecordWasWritten =
    activeRecord !== undefined && stepProgress >= DATABASE_WRITE_AT;
  const databaseAppliedCount = Math.min(
    REPLAY_LOG_RECORDS.length,
    appliedCount + (activeRecordWasWritten ? 1 : 0),
  );
  const appliedRecords = REPLAY_LOG_RECORDS.slice(0, databaseAppliedCount);
  const records = REPLAY_LOG_RECORDS.map(
    (record, index): ReplayLogRecord => ({
      ...record,
      status: recordStatus(index, appliedCount),
    }),
  );
  const lastAppliedRecord =
    databaseAppliedCount === 0 ? undefined : records[databaseAppliedCount - 1];
  const highlightedOperation = operationHighlightedDuring(phase)
    ? activeRecord?.operation
    : undefined;

  return {
    appliedCount,
    databaseAppliedCount,
    stepProgress,
    phase,
    records,
    database: applyLogRecords(appliedRecords),
    activeRecord:
      activeRecord === undefined ? undefined : records[appliedCount],
    lastAppliedRecord,
    highlightedRecordKey: highlightedRecordKey(
      activeRecord,
      phase,
      activeRecordWasWritten,
    ),
    highlightedOperation,
  };
}

export function nextAppliedCount(appliedCount: number) {
  return Math.min(appliedCount + 1, REPLAY_LOG_RECORDS.length);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampAppliedCount(appliedCount: number) {
  return clamp(Math.round(appliedCount), 0, REPLAY_LOG_RECORDS.length);
}

function recordStatus(index: number, appliedCount: number): LogRecordStatus {
  if (index < appliedCount) return "applied";
  if (index === appliedCount) return "active";
  return "pending";
}

function applyLogRecords(records: readonly LogRecord[]): MemoryRecord[] {
  const database = CHECKPOINT_RECORDS.map((record) => ({ ...record }));

  for (const record of records) {
    const existing = database.find((row) => row.key === record.recordKey);
    if (!existing) continue;

    if (record.operation === "DELETE") {
      existing.status = "deleted";
      existing.balance = undefined;
      existing.lastOperation = record.operation;
      continue;
    }

    existing.status = "present";
    existing.balance = record.balance;
    existing.lastOperation = record.operation;
  }

  return database;
}

function highlightedRecordKey(
  activeRecord: LogRecord | undefined,
  phase: ReplayPhase,
  activeRecordWasWritten: boolean,
) {
  if (!activeRecord || !operationHighlightedDuring(phase)) return undefined;
  if (activeRecord.operation === "INSERT" && !activeRecordWasWritten) {
    return undefined;
  }
  if (activeRecord.operation === "DELETE" && activeRecordWasWritten) {
    return undefined;
  }
  return activeRecord.recordKey;
}

function operationHighlightedDuring(phase: ReplayPhase) {
  return phase !== "checkpoint" && phase !== "complete";
}

function replayPhase(
  appliedCount: number,
  stepProgress: number,
  activeRecord: LogRecord | undefined,
): ReplayPhase {
  if (appliedCount >= REPLAY_LOG_RECORDS.length || !activeRecord) {
    return "complete";
  }
  if (appliedCount === 0 && stepProgress === 0) return "checkpoint";
  if (stepProgress < TRANSFER_START) return "select";
  if (stepProgress < DATABASE_WRITE_AT) return "transfer";
  if (stepProgress < WRITE_END) return "write";
  return "settle";
}
