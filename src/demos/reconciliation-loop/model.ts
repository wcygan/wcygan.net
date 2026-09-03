export const RECONCILIATION_DURATION_MS = 16_000;

export type ReconciliationPhase =
  | "idle"
  | "detecting"
  | "publishing"
  | "applying"
  | "cdc"
  | "settled";

export type RecordStatus = "bad" | "queued" | "repaired" | "clean";

export type ReconciliationRecord = {
  id: string;
  lakeState: string;
  dbState: string;
  expectedState: string;
  status: RecordStatus;
};

export type StepIndicator = {
  id: "detect" | "publish" | "apply" | "cdc";
  num: number;
  label: string;
  active: boolean;
  complete: boolean;
};

export type ReconciliationSnapshot = {
  phase: ReconciliationPhase;
  phaseProgress: number; // 0..1 within phase
  timelineProgress: number; // 0..1 overall
  activeStep: 1 | 2 | 3 | 4 | null;
  phaseLabel: string;
  lakeStatus: "scanning" | "detected" | "syncing" | "synced";
  kafkaRepairCount: number;
  dbRowState: {
    plan: "pro" | "free";
    status: "stale" | "updating" | "repaired";
  };
  cdcCount: number;
  lakeRowState: { plan: "pro" | "free"; status: "stale" | "indexed" };
  isComplete: boolean;
};

export const INITIAL_RECONCILIATION_SNAPSHOT: ReconciliationSnapshot = {
  phase: "idle",
  phaseProgress: 0,
  timelineProgress: 0,
  activeStep: 1,
  phaseLabel: "Scheduled job starts: query lake for drift",
  lakeStatus: "scanning",
  kafkaRepairCount: 0,
  dbRowState: { plan: "pro", status: "stale" },
  cdcCount: 0,
  lakeRowState: { plan: "free", status: "stale" },
  isComplete: false,
};

export const COMPLETE_RECONCILIATION_SNAPSHOT: ReconciliationSnapshot = {
  phase: "settled",
  phaseProgress: 1,
  timelineProgress: 1,
  activeStep: null,
  phaseLabel: "Loop closed: MySQL & Iceberg lake in sync (plan = 'pro')",
  lakeStatus: "synced",
  kafkaRepairCount: 1,
  dbRowState: { plan: "pro", status: "repaired" },
  cdcCount: 1,
  lakeRowState: { plan: "pro", status: "indexed" },
  isComplete: true,
};

// Timeline breakdown
// 0.00 - 0.08: establishing / scheduled trigger
// 0.08 - 0.32: Step 1 (Airflow + Trino detects drift: MySQL has 'pro' vs lake 'free' or vice versa)
// 0.32 - 0.52: Step 2 (Trino publishes repair event to Kafka repair topic)
// 0.52 - 0.74: Step 3 (Flink consumes repair event, applies idempotent write to MySQL)
// 0.74 - 0.94: Step 4 (Debezium captures MySQL binlog, Kafka -> Iceberg indexer updates lake)
// 0.94 - 1.00: Loop closed, lake clean, next run finds 0 bad records

const PHASE_DETECT_START = 0.06;
const PHASE_PUBLISH_START = 0.3;
const PHASE_APPLY_START = 0.52;
const PHASE_CDC_START = 0.74;
const PHASE_SETTLE_START = 0.94;

export function deriveReconciliationSnapshot(
  progress: number,
): ReconciliationSnapshot {
  const p = Math.max(0, Math.min(1, progress));

  if (p >= PHASE_SETTLE_START) {
    return {
      ...COMPLETE_RECONCILIATION_SNAPSHOT,
      timelineProgress: p,
      phaseProgress: (p - PHASE_SETTLE_START) / (1 - PHASE_SETTLE_START),
    };
  }

  if (p < PHASE_DETECT_START) {
    return {
      ...INITIAL_RECONCILIATION_SNAPSHOT,
      timelineProgress: p,
      phaseProgress: p / PHASE_DETECT_START,
    };
  }

  if (p < PHASE_PUBLISH_START) {
    const phaseProgress =
      (p - PHASE_DETECT_START) / (PHASE_PUBLISH_START - PHASE_DETECT_START);
    return {
      phase: "detecting",
      phaseProgress,
      timelineProgress: p,
      activeStep: 1,
      phaseLabel:
        "Step 1: Trino queries lake · Discrepancy found: user 42 missing 'pro'",
      lakeStatus: "detected",
      kafkaRepairCount: 0,
      dbRowState: { plan: "free", status: "stale" },
      cdcCount: 0,
      lakeRowState: { plan: "pro", status: "stale" },
      isComplete: false,
    };
  }

  if (p < PHASE_APPLY_START) {
    const phaseProgress =
      (p - PHASE_PUBLISH_START) / (PHASE_APPLY_START - PHASE_PUBLISH_START);
    return {
      phase: "publishing",
      phaseProgress,
      timelineProgress: p,
      activeStep: 2,
      phaseLabel: "Step 2: Airflow/Trino publishes repair event to Kafka log",
      lakeStatus: "detected",
      kafkaRepairCount: 1,
      dbRowState: { plan: "free", status: "stale" },
      cdcCount: 0,
      lakeRowState: { plan: "pro", status: "stale" },
      isComplete: false,
    };
  }

  if (p < PHASE_CDC_START) {
    const phaseProgress =
      (p - PHASE_APPLY_START) / (PHASE_CDC_START - PHASE_APPLY_START);
    const dbRepaired = phaseProgress > 0.65;
    return {
      phase: "applying",
      phaseProgress,
      timelineProgress: p,
      activeStep: 3,
      phaseLabel: dbRepaired
        ? "Step 3: Flink idempotent upsert applied to MySQL (plan = 'pro')"
        : "Step 3: Flink reads repair event, applies idempotent upsert",
      lakeStatus: "detected",
      kafkaRepairCount: 1,
      dbRowState: {
        plan: dbRepaired ? "pro" : "free",
        status: dbRepaired ? "repaired" : "updating",
      },
      cdcCount: 0,
      lakeRowState: { plan: "pro", status: "stale" },
      isComplete: false,
    };
  }

  // CDC phase (p >= PHASE_CDC_START && p < PHASE_SETTLE_START)
  const phaseProgress =
    (p - PHASE_CDC_START) / (PHASE_SETTLE_START - PHASE_CDC_START);
  const lakeSynced = phaseProgress > 0.7;
  return {
    phase: "cdc",
    phaseProgress,
    timelineProgress: p,
    activeStep: 4,
    phaseLabel: lakeSynced
      ? "Step 4: Indexer committed change into Iceberg · Loop reconciled"
      : "Step 4: Debezium captures binlog → Kafka → Lake Indexer writes back",
    lakeStatus: lakeSynced ? "synced" : "syncing",
    kafkaRepairCount: 1,
    dbRowState: { plan: "pro", status: "repaired" },
    cdcCount: 1,
    lakeRowState: {
      plan: lakeSynced ? "pro" : "free",
      status: lakeSynced ? "indexed" : "stale",
    },
    isComplete: false,
  };
}
