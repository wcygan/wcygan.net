export const CDC_PROPAGATION_DURATION_MS = 10_000;
export const CDC_ACCEPTANCE_FLASH_DURATION_MS = 500;

const INTRO_END = 0.08;
const SQL_TRAVEL_END = 0.26;
const CDC_TRAVEL_START = 0.36;
const EVENT_TRAVEL_END = 0.82;
const REDIS_SETTLE_END = 0.87;
const ACCEPTANCE_FLASH_HOLD_MS = 350;

export type CdcPropagationPhase =
  | "establishing"
  | "writing"
  | "committing"
  | "propagating"
  | "applying"
  | "settled";

export type CdcPropagationSnapshot = {
  phase: CdcPropagationPhase;
  sqlProgress: number;
  sqlOpacity: number;
  postgresPlanProgress: number;
  postgresAcceptanceFlash: number;
  eventProgress: number;
  eventOpacity: number;
  redisPlanProgress: number;
  redisAcceptanceFlash: number;
  isComplete: boolean;
};

export const INITIAL_CDC_PROPAGATION_SNAPSHOT = deriveCdcPropagationSnapshot(0);

export function deriveCdcPropagationSnapshot(
  progress: number,
): CdcPropagationSnapshot {
  const normalizedProgress = clamp(progress, 0, 1);
  const phase = phaseForProgress(normalizedProgress);
  const postgresPlanProgress = normalizedProgress >= SQL_TRAVEL_END ? 1 : 0;
  const redisPlanProgress = normalizedProgress >= EVENT_TRAVEL_END ? 1 : 0;

  return {
    phase,
    sqlProgress: strongEaseInOut(
      progressInWindow(normalizedProgress, INTRO_END, SQL_TRAVEL_END),
    ),
    sqlOpacity:
      1 -
      strongEaseInOut(
        progressInWindow(normalizedProgress, SQL_TRAVEL_END, CDC_TRAVEL_START),
      ),
    postgresPlanProgress,
    postgresAcceptanceFlash: acceptanceFlashForProgress(
      normalizedProgress,
      SQL_TRAVEL_END,
    ),
    eventProgress: progressInWindow(
      normalizedProgress,
      CDC_TRAVEL_START,
      EVENT_TRAVEL_END,
    ),
    eventOpacity: eventOpacityForProgress(normalizedProgress),
    redisPlanProgress,
    redisAcceptanceFlash: acceptanceFlashForProgress(
      normalizedProgress,
      EVENT_TRAVEL_END,
    ),
    isComplete: normalizedProgress >= 1,
  };
}

function phaseForProgress(progress: number): CdcPropagationPhase {
  if (progress < INTRO_END) return "establishing";
  if (progress < SQL_TRAVEL_END) return "writing";
  if (progress < CDC_TRAVEL_START) return "committing";
  if (progress < EVENT_TRAVEL_END) return "propagating";
  if (progress < REDIS_SETTLE_END) return "applying";
  return "settled";
}

function eventOpacityForProgress(progress: number) {
  if (progress < CDC_TRAVEL_START) return 0;
  if (progress < EVENT_TRAVEL_END) return 1;

  return (
    1 -
    strongEaseInOut(
      progressInWindow(progress, EVENT_TRAVEL_END, REDIS_SETTLE_END),
    )
  );
}

function acceptanceFlashForProgress(progress: number, acceptedAt: number) {
  const elapsedMs = (progress - acceptedAt) * CDC_PROPAGATION_DURATION_MS;
  if (elapsedMs < 0) return 0;
  if (elapsedMs <= ACCEPTANCE_FLASH_HOLD_MS) return 1;

  return (
    1 -
    strongEaseInOut(
      progressInWindow(
        elapsedMs,
        ACCEPTANCE_FLASH_HOLD_MS,
        CDC_ACCEPTANCE_FLASH_DURATION_MS,
      ),
    )
  );
}

function progressInWindow(progress: number, start: number, end: number) {
  return clamp((progress - start) / (end - start), 0, 1);
}

function strongEaseInOut(progress: number) {
  const targetX = clamp(progress, 0, 1);
  let lowerBound = 0;
  let upperBound = 1;
  let curveTime = targetX;

  for (let iteration = 0; iteration < 16; iteration += 1) {
    const sampledX = cubicBezierCoordinate(curveTime, 0.77, 0.175);

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
