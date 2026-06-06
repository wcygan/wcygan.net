export type QueryPlanKind = "n-plus-one" | "batch";

export type QueryTrip = {
  id: string;
  label: string;
  detail: string;
  recordCount: number;
  role: "individual" | "batch";
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
  elapsedMs: number;
  phase: RoundTripPhase;
  packet?: RoundTripPacket;
  statusLabel: string;
};

export type RoundTripSnapshot = {
  nPlusOne: RoundTripLaneSnapshot;
  batch: RoundTripLaneSnapshot;
};

export const DEFAULT_RECORD_COUNT = 10;
export const ROUND_TRIP_DURATION_MS = 22000;
export const REDUCED_MOTION_ROUND_TRIP_PROGRESS = 1;
export const QUERY_TURN_MS = 25;
export const BATCH_QUERY_MS = 35;

const REQUEST_END = 0.32;
const RESPONSE_START = 0.5;
const RESPONSE_END = 0.82;
const BATCH_REQUEST_START = 0;
const BATCH_REQUEST_END = 0.06;
const BATCH_RESPONSE_START = 0.18;
const BATCH_RESPONSE_END = 0.28;
const FINAL_SEGMENT_EPSILON = 1e-6;

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
  const trips: QueryTrip[] = Array.from({ length: recordCount }, (_, index) => {
    const orderNumber = index + 1;

    return {
      id: `order-${orderNumber}`,
      label: `Order id ${orderNumber}`,
      detail: "orders WHERE id = ?",
      recordCount: 1,
      role: "individual" as const,
    };
  });

  return {
    kind: "n-plus-one",
    title: "Per-id queries",
    summary: "One order query per known id.",
    recordsWanted: recordCount,
    queryCount: trips.length,
    estimatedMs: estimateMilliseconds(trips.length),
    trips,
  };
}

function buildBatchPlan(recordCount: number): QueryPlan {
  const trips: QueryTrip[] = [
    {
      id: "orders",
      label: `Fetch ${recordCount} orders once`,
      detail: "orders WHERE id IN (...)",
      recordCount,
      role: "batch",
    },
  ];

  return {
    kind: "batch",
    title: "Batch query",
    summary: "One order query for all known ids.",
    recordsWanted: recordCount,
    queryCount: trips.length,
    estimatedMs: BATCH_QUERY_MS,
    trips,
  };
}

function estimateMilliseconds(queryCount: number) {
  return queryCount * QUERY_TURN_MS;
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
    recordCount - FINAL_SEGMENT_EPSILON,
    progress * recordCount,
  );
  const activeIndex = Math.floor(segment);
  const localProgress = segment - activeIndex;
  const activeRecord = Math.min(activeIndex + 1, recordCount);
  const fetchedRecords = Math.min(
    recordCount,
    activeIndex + (localProgress >= RESPONSE_END ? 1 : 0),
  );
  const elapsedMs = nPlusOneElapsedMs(progress, recordCount);
  const phase = phaseForLocalProgress(localProgress);
  const packet = packetForLocalProgress(localProgress, activeRecord, 1);

  return {
    kind: plan.kind,
    title: plan.title,
    queryCount: plan.queryCount,
    fetchedRecords,
    recordCount,
    activeRecord,
    elapsedMs,
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
  const elapsedMs = batchElapsedMs(progress);
  const phase = batchPhaseForProgress(progress);
  const packet = batchPacketForProgress(progress, recordCount);

  return {
    kind: plan.kind,
    title: plan.title,
    queryCount: plan.queryCount,
    fetchedRecords,
    recordCount,
    activeRecord: fetchedRecords === recordCount ? recordCount : 0,
    elapsedMs,
    phase,
    packet,
    statusLabel: batchStatusLabel(recordCount),
  };
}

function nPlusOneElapsedMs(progress: number, recordCount: number) {
  return Math.round(clamp(progress, 0, 1) * recordCount * QUERY_TURN_MS);
}

function batchElapsedMs(progress: number) {
  if (progress <= BATCH_REQUEST_START) return 0;

  const queryProgress = clamp(
    (progress - BATCH_REQUEST_START) /
      (BATCH_RESPONSE_END - BATCH_REQUEST_START),
    0,
    1,
  );

  return Math.round(queryProgress * BATCH_QUERY_MS);
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
      label: `id ${activeRecord}?`,
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
      label: `${recordCount} ids`,
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
  return `Each of the ${recordCount} known order ids is requested and fetched individually.`;
}

function batchStatusLabel(recordCount: number) {
  return `All ${recordCount} orders are fetched and returned together.`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
