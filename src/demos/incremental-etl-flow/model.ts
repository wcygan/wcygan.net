const INCREMENTAL_ETL_TRANSITION_STEP_COUNT = 7;
export const INCREMENTAL_ETL_DURATION_MS = 16_000;
export const INCREMENTAL_ETL_STEP_DURATION_MS =
  INCREMENTAL_ETL_DURATION_MS / INCREMENTAL_ETL_TRANSITION_STEP_COUNT;
export const INCREMENTAL_ETL_FINAL_SUMMARY =
  "1 online update → 1 offline row synchronized";

const progressAtStep = (step: number) =>
  step / INCREMENTAL_ETL_TRANSITION_STEP_COUNT;

const SUBMIT_START = progressAtStep(1);
const COMMIT_START = progressAtStep(2);
const CAPTURE_START = progressAtStep(3);
const PUBLISH_START = progressAtStep(4);
const CONSUME_START = progressAtStep(5);
const APPLY_START = progressAtStep(6);
const SYNCHRONIZED_START = progressAtStep(7);
const HOP_TRAVEL_START = 0.25;
const HOP_TRAVEL_END = 0.75;

export type IncrementalEtlPhase =
  | "establishing"
  | "submitting"
  | "committing"
  | "capturing"
  | "publishing"
  | "consuming"
  | "applying"
  | "synchronized";

export type IncrementalEtlActor =
  | "mysql"
  | "brooklin"
  | "kafka"
  | "gobblin"
  | "opal";

export type IncrementalEtlActorStatus = "waiting" | "active" | "complete";

export type IncrementalEtlEventState =
  | "hidden"
  | "departing"
  | "traveling"
  | "arrived";

export type IncrementalEtlEvent = {
  visible: boolean;
  handoffIndex: 0 | 1 | 2 | 3;
  from: IncrementalEtlActor;
  to: IncrementalEtlActor;
  payload: "commit" | "CDC" | "Kafka" | "HDFS";
  hopProgress: number;
  state: IncrementalEtlEventState;
};

const INCREMENTAL_ETL_HANDOFFS = [
  {
    index: 0,
    phase: "capturing",
    from: "mysql",
    to: "brooklin",
    payload: "commit",
    start: CAPTURE_START,
    end: PUBLISH_START,
  },
  {
    index: 1,
    phase: "publishing",
    from: "brooklin",
    to: "kafka",
    payload: "CDC",
    start: PUBLISH_START,
    end: CONSUME_START,
  },
  {
    index: 2,
    phase: "consuming",
    from: "kafka",
    to: "gobblin",
    payload: "Kafka",
    start: CONSUME_START,
    end: APPLY_START,
  },
  {
    index: 3,
    phase: "applying",
    from: "gobblin",
    to: "opal",
    payload: "HDFS",
    start: APPLY_START,
    end: SYNCHRONIZED_START,
  },
] as const;

export type IncrementalEtlSnapshot = {
  phase: IncrementalEtlPhase;
  mysqlPlan: "free" | "pro";
  opalPlan: "free" | "pro";
  sqlProgress: number;
  event: IncrementalEtlEvent;
  actors: Record<IncrementalEtlActor, IncrementalEtlActorStatus>;
  status: string;
  summary: string | null;
  isComplete: boolean;
};

export const INCREMENTAL_ETL_PHASE_ORDER: readonly IncrementalEtlPhase[] = [
  "establishing",
  "submitting",
  "committing",
  "capturing",
  "publishing",
  "consuming",
  "applying",
  "synchronized",
];

export const INITIAL_INCREMENTAL_ETL_SNAPSHOT = deriveIncrementalEtlSnapshot(0);
export const COMPLETE_INCREMENTAL_ETL_SNAPSHOT =
  deriveIncrementalEtlSnapshot(1);

export function deriveIncrementalEtlSnapshot(
  progress: number,
): IncrementalEtlSnapshot {
  const normalizedProgress = clamp(progress, 0, 1);
  const phase = phaseForProgress(normalizedProgress);
  const mysqlPlan = normalizedProgress >= COMMIT_START ? "pro" : "free";
  const opalPlan = normalizedProgress >= SYNCHRONIZED_START ? "pro" : "free";
  const isComplete = phase === "synchronized";

  return {
    phase,
    mysqlPlan,
    opalPlan,
    sqlProgress: strongEaseInOut(
      progressInWindow(normalizedProgress, SUBMIT_START, COMMIT_START),
    ),
    event: eventForProgress(normalizedProgress),
    actors: actorStatusesForPhase(phase),
    status: statusForPhase(phase),
    summary: isComplete ? INCREMENTAL_ETL_FINAL_SUMMARY : null,
    isComplete,
  };
}

function phaseForProgress(progress: number): IncrementalEtlPhase {
  if (progress < SUBMIT_START) return "establishing";
  if (progress < COMMIT_START) return "submitting";
  if (progress < CAPTURE_START) return "committing";
  if (progress < PUBLISH_START) return "capturing";
  if (progress < CONSUME_START) return "publishing";
  if (progress < APPLY_START) return "consuming";
  if (progress < SYNCHRONIZED_START) return "applying";
  return "synchronized";
}

function eventForProgress(progress: number): IncrementalEtlEvent {
  if (progress < CAPTURE_START) {
    return {
      visible: false,
      handoffIndex: 0,
      from: "mysql",
      to: "brooklin",
      payload: "commit",
      hopProgress: 0,
      state: "hidden",
    };
  }

  if (progress >= SYNCHRONIZED_START) {
    return {
      visible: false,
      handoffIndex: 3,
      from: "gobblin",
      to: "opal",
      payload: "HDFS",
      hopProgress: 1,
      state: "hidden",
    };
  }

  const handoff =
    INCREMENTAL_ETL_HANDOFFS.find(
      ({ start, end }) => progress >= start && progress < end,
    ) ?? INCREMENTAL_ETL_HANDOFFS[3];
  const phaseProgress = progressInWindow(progress, handoff.start, handoff.end);
  const state =
    phaseProgress < HOP_TRAVEL_START
      ? "departing"
      : phaseProgress < HOP_TRAVEL_END
        ? "traveling"
        : "arrived";
  const hopProgress =
    state === "departing"
      ? 0
      : state === "arrived"
        ? 1
        : strongEaseInOut(
            progressInWindow(phaseProgress, HOP_TRAVEL_START, HOP_TRAVEL_END),
          );

  return {
    visible: true,
    handoffIndex: handoff.index,
    from: handoff.from,
    to: handoff.to,
    payload: handoff.payload,
    hopProgress,
    state,
  };
}

function actorStatusesForPhase(
  phase: IncrementalEtlPhase,
): Record<IncrementalEtlActor, IncrementalEtlActorStatus> {
  const phaseIndex = INCREMENTAL_ETL_PHASE_ORDER.indexOf(phase);
  const activeAt: Record<IncrementalEtlActor, number> = {
    mysql: 2,
    brooklin: 3,
    kafka: 4,
    gobblin: 5,
    opal: 6,
  };

  return Object.fromEntries(
    Object.entries(activeAt).map(([actor, activeIndex]) => {
      const status =
        phaseIndex < activeIndex
          ? "waiting"
          : phaseIndex === activeIndex
            ? "active"
            : "complete";
      return [actor, status];
    }),
  ) as Record<IncrementalEtlActor, IncrementalEtlActorStatus>;
}

function statusForPhase(phase: IncrementalEtlPhase) {
  switch (phase) {
    case "establishing":
      return "MySQL and Opal both serve plan free";
    case "submitting":
      return "Application submits the update for users.id = 42";
    case "committing":
      return "MySQL commits id 42 with plan pro";
    case "capturing":
      return "Brooklin captures the committed MySQL change";
    case "publishing":
      return "Brooklin publishes it; Kafka accepts and records it in app.public.users";
    case "consuming":
      return "Gobblin reads app.public.users and writes the record to HDFS";
    case "applying":
      return "Opal on HDFS applies the update";
    case "synchronized":
      return INCREMENTAL_ETL_FINAL_SUMMARY;
  }
}

function progressInWindow(progress: number, start: number, end: number) {
  return clamp((progress - start) / (end - start), 0, 1);
}

function strongEaseInOut(progress: number) {
  const value = clamp(progress, 0, 1);
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
