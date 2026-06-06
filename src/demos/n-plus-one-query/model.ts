export type QueryPlanKind = "n-plus-one" | "batch";

export type QueryTrip = {
  id: string;
  label: string;
  detail: string;
  recordCount: number;
  role: "parent" | "child" | "batch";
};

export type QueryPlan = {
  kind: QueryPlanKind;
  title: string;
  summary: string;
  recordsWanted: number;
  queryCount: number;
  estimatedMs: number;
  trips: QueryTrip[];
};

export type QueryComparison = {
  recordCount: number;
  nPlusOne: QueryPlan;
  batch: QueryPlan;
  savedQueries: number;
  maxQueryCount: number;
  maxEstimatedMs: number;
};

export type RoundTripPhase = "request" | "processing" | "response" | "settled";

export type RoundTripPacket = {
  direction: "to-db" | "from-db";
  progress: number;
  label: string;
  tone: "request" | "data";
};

export type RoundTripLaneSnapshot = {
  kind: QueryPlanKind;
  title: string;
  queryCount: number;
  fetchedRecords: number;
  recordCount: number;
  activeRecord: number;
  phase: RoundTripPhase;
  packet?: RoundTripPacket;
  statusLabel: string;
};

export type RoundTripSnapshot = {
  nPlusOne: RoundTripLaneSnapshot;
  batch: RoundTripLaneSnapshot;
};

export const DEFAULT_RECORD_COUNT = 10;
export const ROUND_TRIP_LOOP_MS = 22000;
export const REDUCED_MOTION_ROUND_TRIP_PROGRESS = 0.995;

const ROUND_TRIP_MS = 8;
const ROW_SHAPE_MS = 0.2;
const REQUEST_END = 0.32;
const RESPONSE_START = 0.5;
const RESPONSE_END = 0.82;
const BATCH_REQUEST_START = 0.03;
const BATCH_REQUEST_END = 0.08;
const BATCH_RESPONSE_START = 0.11;
const BATCH_RESPONSE_END = 0.18;

export function buildQueryComparison(
  recordCount = DEFAULT_RECORD_COUNT,
): QueryComparison {
  const normalizedRecordCount = Math.max(1, Math.floor(recordCount));
  const nPlusOne = buildNPlusOnePlan(normalizedRecordCount);
  const batch = buildBatchPlan(normalizedRecordCount);

  return {
    recordCount: normalizedRecordCount,
    nPlusOne,
    batch,
    savedQueries: nPlusOne.queryCount - batch.queryCount,
    maxQueryCount: Math.max(nPlusOne.queryCount, batch.queryCount),
    maxEstimatedMs: Math.max(nPlusOne.estimatedMs, batch.estimatedMs),
  };
}

function buildNPlusOnePlan(recordCount: number): QueryPlan {
  const trips: QueryTrip[] = [
    {
      id: "users",
      label: `Fetch ${recordCount} users`,
      detail: `SELECT users LIMIT ${recordCount}`,
      recordCount,
      role: "parent",
    },
    ...Array.from({ length: recordCount }, (_, index) => {
      const userNumber = index + 1;

      return {
        id: `orders-${userNumber}`,
        label: `User ${userNumber}`,
        detail: "orders WHERE user_id = ?",
        recordCount: 1,
        role: "child" as const,
      };
    }),
  ];

  return {
    kind: "n-plus-one",
    title: "N+1 queries",
    summary: "One parent query, then one child query per record.",
    recordsWanted: recordCount,
    queryCount: trips.length,
    estimatedMs: estimateMilliseconds(trips.length, recordCount),
    trips,
  };
}

function buildBatchPlan(recordCount: number): QueryPlan {
  const trips: QueryTrip[] = [
    {
      id: "users",
      label: `Fetch ${recordCount} users`,
      detail: `SELECT users LIMIT ${recordCount}`,
      recordCount,
      role: "parent",
    },
    {
      id: "orders",
      label: "Fetch orders once",
      detail: "orders WHERE user_id IN (...)",
      recordCount,
      role: "batch",
    },
  ];

  return {
    kind: "batch",
    title: "Batch query",
    summary: "One parent query, then one child query for all records.",
    recordsWanted: recordCount,
    queryCount: trips.length,
    estimatedMs: estimateMilliseconds(trips.length, recordCount),
    trips,
  };
}

function estimateMilliseconds(queryCount: number, recordCount: number) {
  return roundToTenth(queryCount * ROUND_TRIP_MS + recordCount * ROW_SHAPE_MS);
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function deriveRoundTripSnapshot({
  progress,
  recordCount = DEFAULT_RECORD_COUNT,
}: {
  progress: number;
  recordCount?: number;
}): RoundTripSnapshot {
  const normalizedRecordCount = Math.max(1, Math.floor(recordCount));
  const comparison = buildQueryComparison(normalizedRecordCount);
  const clampedProgress = clamp(progress, 0, 1);

  return {
    nPlusOne: deriveNPlusOneRoundTrip(
      comparison.nPlusOne,
      clampedProgress,
      normalizedRecordCount,
    ),
    batch: deriveBatchRoundTrip(
      comparison.batch,
      clampedProgress,
      normalizedRecordCount,
    ),
  };
}

function deriveNPlusOneRoundTrip(
  plan: QueryPlan,
  progress: number,
  recordCount: number,
): RoundTripLaneSnapshot {
  const segment = Math.min(
    recordCount - Number.EPSILON,
    progress * recordCount,
  );
  const activeIndex = Math.floor(segment);
  const localProgress = segment - activeIndex;
  const activeRecord = Math.min(activeIndex + 1, recordCount);
  const fetchedRecords = Math.min(
    recordCount,
    activeIndex + (localProgress >= RESPONSE_END ? 1 : 0),
  );
  const phase = phaseForLocalProgress(localProgress);
  const packet = packetForLocalProgress(localProgress, activeRecord, 1);

  return {
    kind: plan.kind,
    title: plan.title,
    queryCount: plan.queryCount,
    fetchedRecords,
    recordCount,
    activeRecord,
    phase,
    packet,
    statusLabel: nPlusOneStatusLabel(recordCount),
  };
}

function deriveBatchRoundTrip(
  plan: QueryPlan,
  progress: number,
  recordCount: number,
): RoundTripLaneSnapshot {
  const fetchedRecords = progress >= BATCH_RESPONSE_END ? recordCount : 0;
  const phase = batchPhaseForProgress(progress);
  const packet = batchPacketForProgress(progress, recordCount);

  return {
    kind: plan.kind,
    title: plan.title,
    queryCount: plan.queryCount,
    fetchedRecords,
    recordCount,
    activeRecord: fetchedRecords === recordCount ? recordCount : 0,
    phase,
    packet,
    statusLabel: batchStatusLabel(recordCount),
  };
}

function phaseForLocalProgress(progress: number): RoundTripPhase {
  if (progress < REQUEST_END) return "request";
  if (progress < RESPONSE_START) return "processing";
  if (progress < RESPONSE_END) return "response";
  return "settled";
}

function packetForLocalProgress(
  progress: number,
  activeRecord: number,
  returnedRecords: number,
): RoundTripPacket | undefined {
  if (progress < REQUEST_END) {
    return {
      direction: "to-db",
      progress: clamp(progress / REQUEST_END, 0, 1),
      label: `row ${activeRecord}?`,
      tone: "request",
    };
  }

  if (progress >= RESPONSE_START && progress < RESPONSE_END) {
    return {
      direction: "from-db",
      progress: clamp(
        (progress - RESPONSE_START) / (RESPONSE_END - RESPONSE_START),
        0,
        1,
      ),
      label: `+${returnedRecords}`,
      tone: "data",
    };
  }

  if (progress < RESPONSE_START) {
    return {
      direction: "to-db",
      progress: 1,
      label: "...",
      tone: "request",
    };
  }

  return undefined;
}

function batchPhaseForProgress(progress: number): RoundTripPhase {
  if (progress < BATCH_REQUEST_END) return "request";
  if (progress < BATCH_RESPONSE_START) return "processing";
  if (progress < BATCH_RESPONSE_END) return "response";
  return "settled";
}

function batchPacketForProgress(
  progress: number,
  recordCount: number,
): RoundTripPacket | undefined {
  if (progress >= BATCH_REQUEST_START && progress < BATCH_REQUEST_END) {
    return {
      direction: "to-db",
      progress: clamp(
        (progress - BATCH_REQUEST_START) /
          (BATCH_REQUEST_END - BATCH_REQUEST_START),
        0,
        1,
      ),
      label: "batch",
      tone: "request",
    };
  }

  if (progress >= BATCH_RESPONSE_START && progress < BATCH_RESPONSE_END) {
    return {
      direction: "from-db",
      progress: clamp(
        (progress - BATCH_RESPONSE_START) /
          (BATCH_RESPONSE_END - BATCH_RESPONSE_START),
        0,
        1,
      ),
      label: `+${recordCount}`,
      tone: "data",
    };
  }

  if (progress >= BATCH_REQUEST_END && progress < BATCH_RESPONSE_START) {
    return {
      direction: "to-db",
      progress: 1,
      label: "...",
      tone: "request",
    };
  }

  return undefined;
}

function nPlusOneStatusLabel(recordCount: number) {
  return `Each of the ${recordCount} records is requested and fetched individually.`;
}

function batchStatusLabel(recordCount: number) {
  return `All ${recordCount} records are fetched and returned together.`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
