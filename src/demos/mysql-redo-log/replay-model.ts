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
  stepProgress: number;
  records: ReplayLogRecord[];
  database: MemoryRecord[];
  activeRecord?: ReplayLogRecord;
  lastAppliedRecord?: ReplayLogRecord;
  cursorProgress: number;
  phaseLabel: string;
};

export const REPLAY_DURATION_MS = 16_000;

const INTRO_END = 0.075;
const REPLAY_END = 0.93;

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
  const appliedRecords = REPLAY_LOG_RECORDS.slice(0, appliedCount);
  const records = REPLAY_LOG_RECORDS.map(
    (record, index): ReplayLogRecord => ({
      ...record,
      status: recordStatus(index, appliedCount),
    }),
  );
  const lastAppliedRecord =
    appliedCount === 0 ? undefined : records[appliedCount - 1];

  return {
    appliedCount,
    stepProgress,
    records,
    database: applyLogRecords(appliedRecords),
    activeRecord:
      activeRecord === undefined ? undefined : records[appliedCount],
    lastAppliedRecord,
    cursorProgress: deriveCursorProgress(appliedCount, stepProgress),
    phaseLabel: phaseLabel(appliedCount, stepProgress, activeRecord),
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

function deriveCursorProgress(appliedCount: number, stepProgress: number) {
  if (appliedCount >= REPLAY_LOG_RECORDS.length) return 1;
  return (appliedCount + stepProgress) / REPLAY_LOG_RECORDS.length;
}

function phaseLabel(
  appliedCount: number,
  stepProgress: number,
  activeRecord: LogRecord | undefined,
) {
  if (appliedCount >= REPLAY_LOG_RECORDS.length) {
    return "All six durable records have been applied in LSN order.";
  }

  if (appliedCount === 0 && stepProgress === 0) {
    return "Checkpoint loaded. Recovery begins at the first later LSN.";
  }

  if (!activeRecord) return "Recovery has no later durable record to apply.";

  return `Replaying LSN ${activeRecord.sequence}: ${activeRecord.operation} ${activeRecord.recordLabel}.`;
}
