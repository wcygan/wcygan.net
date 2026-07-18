export const ORDER_COUNT = 10;
export const QUERY_RACE_DURATION_MS = 22_500;
export const PER_ID_TOTAL_MS = 250;
export const BATCH_TOTAL_MS = 35;

const INTRO_END = 0.045;
const BATCH_WINDOW_END = 0.22;
const N_PLUS_ONE_WINDOW_END = 0.96;
const REQUEST_END = 0.3;
const PROCESSING_END = 0.54;
const RESPONSE_END = 0.86;
const FINAL_SEGMENT_EPSILON = 1e-6;

export type QueryLaneKind = "n-plus-one" | "batch";
export type QueryLanePhase =
  | "waiting"
  | "request"
  | "processing"
  | "response"
  | "settled";

export type QueryPacket = {
  direction: "outbound" | "inbound";
  label: string;
  progress: number;
};

export type QueryLaneSnapshot = {
  kind: QueryLaneKind;
  title: string;
  queryLabel: string;
  elapsedMs: number;
  returnedOrders: number;
  remainingTrips: number;
  phase: QueryLanePhase;
  packet?: QueryPacket;
  isComplete: boolean;
};

export type QueryRaceSnapshot = {
  nPlusOne: QueryLaneSnapshot;
  batch: QueryLaneSnapshot;
  statusLabel: string;
  isComplete: boolean;
};

export const INITIAL_QUERY_RACE_SNAPSHOT = deriveQueryRaceSnapshot(0);

export function deriveQueryRaceSnapshot(progress: number): QueryRaceSnapshot {
  const normalizedProgress = clamp(progress, 0, 1);
  const nPlusOne = deriveNPlusOneLane(normalizedProgress);
  const batch = deriveBatchLane(normalizedProgress);
  const isComplete = nPlusOne.isComplete && batch.isComplete;

  return {
    nPlusOne,
    batch,
    isComplete,
    statusLabel: statusForComparison({ batch, isComplete, nPlusOne }),
  };
}

function deriveNPlusOneLane(progress: number): QueryLaneSnapshot {
  const laneProgress = progressInWindow(
    progress,
    INTRO_END,
    N_PLUS_ONE_WINDOW_END,
  );
  const isComplete = laneProgress >= 1;

  if (progress < INTRO_END) {
    return {
      kind: "n-plus-one",
      title: "N+1",
      queryLabel: "10 sequential queries",
      elapsedMs: 0,
      returnedOrders: 0,
      remainingTrips: ORDER_COUNT,
      phase: "waiting",
      isComplete: false,
    };
  }

  const segment = Math.min(
    ORDER_COUNT - FINAL_SEGMENT_EPSILON,
    laneProgress * ORDER_COUNT,
  );
  const tripIndex = Math.floor(segment);
  const tripProgress = segment - tripIndex;
  const returnedOrders = Math.min(
    ORDER_COUNT,
    tripIndex + (tripProgress >= RESPONSE_END ? 1 : 0),
  );

  return {
    kind: "n-plus-one",
    title: "N+1",
    queryLabel: "10 sequential queries",
    elapsedMs: Math.round(laneProgress * PER_ID_TOTAL_MS),
    returnedOrders,
    remainingTrips: ORDER_COUNT - returnedOrders,
    phase: isComplete ? "settled" : phaseForTrip(tripProgress),
    packet: isComplete
      ? undefined
      : packetForTrip(tripProgress, tripIndex + 1, 1),
    isComplete,
  };
}

function deriveBatchLane(progress: number): QueryLaneSnapshot {
  const laneProgress = progressInWindow(progress, INTRO_END, BATCH_WINDOW_END);
  const isComplete = laneProgress >= 1;
  const returnedOrders = laneProgress >= RESPONSE_END ? ORDER_COUNT : 0;

  return {
    kind: "batch",
    title: "Batch",
    queryLabel: "1 grouped query",
    elapsedMs: Math.round(laneProgress * BATCH_TOTAL_MS),
    returnedOrders,
    remainingTrips: isComplete ? 0 : 1,
    phase:
      progress < INTRO_END
        ? "waiting"
        : isComplete
          ? "settled"
          : phaseForTrip(laneProgress),
    packet:
      progress < INTRO_END || isComplete
        ? undefined
        : packetForTrip(laneProgress, ORDER_COUNT, ORDER_COUNT),
    isComplete,
  };
}

function packetForTrip(
  progress: number,
  querySize: number,
  returnedRows: number,
): QueryPacket | undefined {
  if (progress < REQUEST_END) {
    return {
      direction: "outbound",
      label: querySize === ORDER_COUNT ? "10 ids" : `id ${querySize}`,
      progress: clamp(progress / REQUEST_END, 0, 1),
    };
  }

  if (progress < PROCESSING_END) {
    return {
      direction: "outbound",
      label: "SQL",
      progress: 1,
    };
  }

  if (progress < RESPONSE_END) {
    return {
      direction: "inbound",
      label: returnedRows === ORDER_COUNT ? "10 rows" : "1 row",
      progress: clamp(
        (progress - PROCESSING_END) / (RESPONSE_END - PROCESSING_END),
        0,
        1,
      ),
    };
  }

  return undefined;
}

function phaseForTrip(progress: number): QueryLanePhase {
  if (progress < REQUEST_END) return "request";
  if (progress < PROCESSING_END) return "processing";
  if (progress < RESPONSE_END) return "response";
  return "settled";
}

function statusForComparison({
  batch,
  isComplete,
  nPlusOne,
}: {
  batch: QueryLaneSnapshot;
  isComplete: boolean;
  nPlusOne: QueryLaneSnapshot;
}) {
  if (isComplete) {
    return "Same 10 rows. Nine round trips and 215ms of illustrative wait removed.";
  }

  if (batch.isComplete) {
    const noun = nPlusOne.remainingTrips === 1 ? "trip" : "trips";
    return `Batch is finished. N+1 still has ${nPlusOne.remainingTrips} ${noun} to make.`;
  }

  if (batch.phase === "waiting") {
    return "Both approaches start with the same 10 order ids.";
  }

  return "Both approaches cross the same application–database boundary.";
}

function progressInWindow(progress: number, start: number, end: number) {
  return clamp((progress - start) / (end - start), 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
