import { changeHighlightDurationMs } from "../shared/change-highlight";

export type WalRecord = {
  lsn: string;
  id: number;
  operation: "UPDATE" | "DELETE";
  summary: string;
  detail: string;
  payloadLabel: string;
};

export type WalRowStatus = "pending" | "active" | "read";

export type KafkaRowStatus = "empty" | "accepting" | "accepted";

export type WalKafkaPhase =
  | "establishing"
  | "selecting"
  | "reading"
  | "encoding"
  | "emitting"
  | "accepting"
  | "settling"
  | "complete";

export type DerivedWalRow = WalRecord & {
  status: WalRowStatus;
};

export type KafkaEvent = {
  offset: number;
  sourceLsn: string;
  operation: WalRecord["operation"];
  summary: string;
  detail: string;
};

export type DerivedKafkaRow = {
  slot: number;
  status: KafkaRowStatus;
  event?: KafkaEvent;
};

export type WalKafkaPayload = {
  recordIndex: number;
  sourceLsn: string;
  changeLabel: string;
  operation: WalRecord["operation"];
  leg: "wal-to-debezium" | "debezium-to-kafka" | "arrived";
  progress: number;
  opacity: number;
};

export type WalKafkaSnapshot = {
  elapsedMs: number;
  progress: number;
  phase: WalKafkaPhase;
  activeIndex?: number;
  cursorLsn?: string;
  walRows: DerivedWalRow[];
  kafkaRows: DerivedKafkaRow[];
  payload?: WalKafkaPayload;
  appendedCount: number;
  isComplete: boolean;
};

export const WAL_RECORDS: readonly WalRecord[] = [
  {
    lsn: "24023128",
    id: 42,
    operation: "UPDATE",
    summary: "UPDATE users #42",
    detail: "plan: free → pro",
    payloadLabel: "free → pro",
  },
  {
    lsn: "24023144",
    id: 7,
    operation: "DELETE",
    summary: "DELETE users #7",
    detail: "row removed",
    payloadLabel: "row removed",
  },
  {
    lsn: "24023160",
    id: 9,
    operation: "UPDATE",
    summary: "UPDATE users #9",
    detail: "plan: free → team",
    payloadLabel: "free → team",
  },
] as const;

export const WAL_KAFKA_INTRO_MS = 1_200;
export const WAL_KAFKA_RECORD_DURATION_MS = 5_000;
export const WAL_KAFKA_ACCEPTANCE_DURATION_MS = changeHighlightDurationMs();
export const WAL_KAFKA_DURATION_MS =
  WAL_KAFKA_INTRO_MS + WAL_RECORDS.length * WAL_KAFKA_RECORD_DURATION_MS;

const SELECT_END_MS = 500;
const WAL_TRAVEL_END_MS = 2_100;
const ENCODE_END_MS = 2_600;
const KAFKA_ARRIVAL_MS = 4_200;
const ACCEPTANCE_END_MS = KAFKA_ARRIVAL_MS + WAL_KAFKA_ACCEPTANCE_DURATION_MS;
const PAYLOAD_FADE_MS = 300;

export const INITIAL_WAL_KAFKA_SNAPSHOT = deriveWalKafkaSnapshot(0);
export const COMPLETE_WAL_KAFKA_SNAPSHOT = deriveWalKafkaSnapshot(
  WAL_KAFKA_DURATION_MS,
);

export function arrivalTimeForRecord(recordIndex: number) {
  const safeIndex = clamp(
    Math.round(finiteOr(recordIndex, 0)),
    0,
    WAL_RECORDS.length - 1,
  );

  return (
    WAL_KAFKA_INTRO_MS +
    safeIndex * WAL_KAFKA_RECORD_DURATION_MS +
    KAFKA_ARRIVAL_MS
  );
}

export function recordStartTime(recordIndex: number) {
  const safeIndex = clamp(
    Math.round(finiteOr(recordIndex, 0)),
    0,
    WAL_RECORDS.length - 1,
  );

  return WAL_KAFKA_INTRO_MS + safeIndex * WAL_KAFKA_RECORD_DURATION_MS;
}

export function deriveWalKafkaSnapshot(elapsedMs: number): WalKafkaSnapshot {
  const safeElapsedMs = clampElapsed(elapsedMs);
  const progress = safeElapsedMs / WAL_KAFKA_DURATION_MS;

  if (safeElapsedMs >= WAL_KAFKA_DURATION_MS) {
    return completeSnapshot(safeElapsedMs, progress);
  }

  if (safeElapsedMs < WAL_KAFKA_INTRO_MS) {
    return {
      elapsedMs: safeElapsedMs,
      progress,
      phase: "establishing",
      walRows: WAL_RECORDS.map((record) => ({
        ...record,
        status: "pending",
      })),
      kafkaRows: emptyKafkaRows(),
      appendedCount: 0,
      isComplete: false,
    };
  }

  const replayElapsedMs = safeElapsedMs - WAL_KAFKA_INTRO_MS;
  const activeIndex = Math.min(
    WAL_RECORDS.length - 1,
    Math.floor(replayElapsedMs / WAL_KAFKA_RECORD_DURATION_MS),
  );
  const stepElapsedMs =
    replayElapsedMs - activeIndex * WAL_KAFKA_RECORD_DURATION_MS;
  const activeRecord = WAL_RECORDS[activeIndex];
  const hasArrived = stepElapsedMs >= KAFKA_ARRIVAL_MS;
  const appendedCount = activeIndex + (hasArrived ? 1 : 0);
  const phase = phaseForStep(stepElapsedMs);

  return {
    elapsedMs: safeElapsedMs,
    progress,
    phase,
    activeIndex,
    cursorLsn: activeRecord.lsn,
    walRows: WAL_RECORDS.map((record, index) => ({
      ...record,
      status: walRowStatus(index, activeIndex),
    })),
    kafkaRows: deriveKafkaRows(appendedCount, activeIndex, stepElapsedMs),
    payload: derivePayload(activeIndex, stepElapsedMs),
    appendedCount,
    isComplete: false,
  };
}

function completeSnapshot(
  elapsedMs: number,
  progress: number,
): WalKafkaSnapshot {
  return {
    elapsedMs,
    progress,
    phase: "complete",
    cursorLsn: WAL_RECORDS.at(-1)?.lsn,
    walRows: WAL_RECORDS.map((record) => ({
      ...record,
      status: "read",
    })),
    kafkaRows: WAL_RECORDS.map((record, offset) => ({
      slot: offset,
      status: "accepted",
      event: kafkaEvent(record, offset),
    })),
    appendedCount: WAL_RECORDS.length,
    isComplete: true,
  };
}

function emptyKafkaRows(): DerivedKafkaRow[] {
  return WAL_RECORDS.map((_, slot) => ({
    slot,
    status: "empty",
  }));
}

function deriveKafkaRows(
  appendedCount: number,
  activeIndex: number,
  stepElapsedMs: number,
): DerivedKafkaRow[] {
  return WAL_RECORDS.map((record, index) => {
    if (index >= appendedCount) {
      return {
        slot: index,
        status: "empty",
      };
    }

    const isAccepting =
      index === activeIndex &&
      stepElapsedMs >= KAFKA_ARRIVAL_MS &&
      stepElapsedMs < ACCEPTANCE_END_MS;

    return {
      slot: index,
      status: isAccepting ? "accepting" : "accepted",
      event: kafkaEvent(record, index),
    };
  });
}

function kafkaEvent(record: WalRecord, offset: number): KafkaEvent {
  return {
    offset,
    sourceLsn: record.lsn,
    operation: record.operation,
    summary: record.summary,
    detail: record.detail,
  };
}

function derivePayload(
  activeIndex: number,
  stepElapsedMs: number,
): WalKafkaPayload | undefined {
  const record = WAL_RECORDS[activeIndex];
  const identity = {
    recordIndex: activeIndex,
    sourceLsn: record.lsn,
    changeLabel: record.payloadLabel,
    operation: record.operation,
  } as const;

  if (stepElapsedMs < SELECT_END_MS) return undefined;

  if (stepElapsedMs < WAL_TRAVEL_END_MS) {
    return {
      ...identity,
      leg: "wal-to-debezium",
      progress: smoothEaseInOut(
        progressInWindow(stepElapsedMs, SELECT_END_MS, WAL_TRAVEL_END_MS),
      ),
      opacity: 1,
    };
  }

  if (stepElapsedMs < ENCODE_END_MS) {
    return {
      ...identity,
      leg: "wal-to-debezium",
      progress: 1,
      opacity: 1,
    };
  }

  if (stepElapsedMs < KAFKA_ARRIVAL_MS) {
    return {
      ...identity,
      leg: "debezium-to-kafka",
      progress: smoothEaseInOut(
        progressInWindow(stepElapsedMs, ENCODE_END_MS, KAFKA_ARRIVAL_MS),
      ),
      opacity: 1,
    };
  }

  const acceptedAgeMs = stepElapsedMs - KAFKA_ARRIVAL_MS;
  if (acceptedAgeMs >= PAYLOAD_FADE_MS) return undefined;

  return {
    ...identity,
    leg: "arrived",
    progress: 1,
    opacity: 1 - strongEaseOut(acceptedAgeMs / PAYLOAD_FADE_MS),
  };
}

function walRowStatus(index: number, activeIndex: number): WalRowStatus {
  if (index < activeIndex) return "read";
  if (index === activeIndex) return "active";
  return "pending";
}

function phaseForStep(stepElapsedMs: number): WalKafkaPhase {
  if (stepElapsedMs < SELECT_END_MS) return "selecting";
  if (stepElapsedMs < WAL_TRAVEL_END_MS) return "reading";
  if (stepElapsedMs < ENCODE_END_MS) return "encoding";
  if (stepElapsedMs < KAFKA_ARRIVAL_MS) return "emitting";
  if (stepElapsedMs < ACCEPTANCE_END_MS) return "accepting";
  return "settling";
}

function progressInWindow(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1);
}

function strongEaseOut(progress: number) {
  return 1 - Math.pow(1 - clamp(progress, 0, 1), 3);
}

function smoothEaseInOut(progress: number) {
  const targetX = clamp(progress, 0, 1);
  let lowerBound = 0;
  let upperBound = 1;
  let curveTime = targetX;

  for (let iteration = 0; iteration < 16; iteration += 1) {
    const sampledX = cubicBezierCoordinate(curveTime, 0.45, 0.55);

    if (Math.abs(sampledX - targetX) < 1e-7) break;
    if (sampledX < targetX) {
      lowerBound = curveTime;
    } else {
      upperBound = curveTime;
    }
    curveTime = (lowerBound + upperBound) / 2;
  }

  return cubicBezierCoordinate(curveTime, 0, 1);
}

function cubicBezierCoordinate(
  progress: number,
  firstControlPoint: number,
  secondControlPoint: number,
) {
  const inverseProgress = 1 - progress;

  return (
    3 * inverseProgress * inverseProgress * progress * firstControlPoint +
    3 * inverseProgress * progress * progress * secondControlPoint +
    progress * progress * progress
  );
}

function clampElapsed(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value === Number.POSITIVE_INFINITY) return WAL_KAFKA_DURATION_MS;
  return clamp(value, 0, WAL_KAFKA_DURATION_MS);
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
