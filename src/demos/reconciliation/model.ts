export const INGESTION_DURATION_MS = 12_000;
export const REPAIR_DURATION_MS = 14_000;

const EVENT_TRAVEL_START = 0.18;
const EVENT_TRAVEL_END = 0.82;
const REPAIR_APPLIED_AT = 0.93;

export type FlowEventState = "hidden" | "departing" | "traveling" | "arrived";

export type FlowEvent = {
  visible: boolean;
  handoffIndex: number;
  payload: string;
  hopProgress: number;
  state: FlowEventState;
};

export type ActorStatus = "waiting" | "active" | "complete";

export type IngestionActor = "mysql" | "debezium" | "kafka" | "flink" | "lake";

export type IngestionPhase =
  | "establishing"
  | "capturing"
  | "publishing"
  | "consuming"
  | "storing"
  | "complete";

export type IngestionSnapshot = {
  phase: IngestionPhase;
  event: FlowEvent;
  completedHandoffs: number;
  actors: Record<IngestionActor, ActorStatus>;
  lakeVersion: number | null;
  status: string;
  isComplete: boolean;
};

export type RepairActor =
  | "airflow"
  | "lake"
  | "trino"
  | "kafka"
  | "flink"
  | "mysql";

export type RepairPhase =
  | "establishing"
  | "scheduling"
  | "scanning"
  | "detecting"
  | "publishing"
  | "consuming"
  | "applying"
  | "complete";

export type RepairSnapshot = {
  phase: RepairPhase;
  event: FlowEvent;
  completedHandoffs: number;
  actors: Record<RepairActor, ActorStatus>;
  mysqlVersion: 6 | 7;
  mysqlState: "pending" | "paid";
  mismatchFound: boolean;
  repairPublished: boolean;
  status: string;
  isComplete: boolean;
};

type EventWindow = {
  start: number;
  end: number;
  handoffIndex: number;
  payload: string;
};

export const INGESTION_HANDOFFS = [
  {
    start: 0.1,
    end: 0.3,
    handoffIndex: 0,
    payload: "row v7",
  },
  {
    start: 0.3,
    end: 0.5,
    handoffIndex: 1,
    payload: "CDC v7",
  },
  {
    start: 0.5,
    end: 0.7,
    handoffIndex: 2,
    payload: "offset 81",
  },
  {
    start: 0.7,
    end: 0.9,
    handoffIndex: 3,
    payload: "order v7",
  },
] as const satisfies readonly EventWindow[];

export const REPAIR_HANDOFFS = [
  {
    start: 0.52,
    end: 0.68,
    handoffIndex: 0,
    payload: "repair v7",
  },
  {
    start: 0.68,
    end: 0.82,
    handoffIndex: 1,
    payload: "repair v7",
  },
  {
    start: 0.82,
    end: 0.95,
    handoffIndex: 2,
    payload: "apply v7",
  },
] as const satisfies readonly EventWindow[];

export const INITIAL_INGESTION_SNAPSHOT = deriveIngestionSnapshot(0);
export const COMPLETE_INGESTION_SNAPSHOT = deriveIngestionSnapshot(1);
export const INITIAL_REPAIR_SNAPSHOT = deriveRepairSnapshot(0);
export const COMPLETE_REPAIR_SNAPSHOT = deriveRepairSnapshot(1);

export function deriveIngestionSnapshot(progress: number): IngestionSnapshot {
  const normalizedProgress = clamp(progress, 0, 1);
  const phase = ingestionPhaseForProgress(normalizedProgress);
  const event = eventForProgress(normalizedProgress, INGESTION_HANDOFFS);
  const completedHandoffs = completedHandoffsAt(
    normalizedProgress,
    INGESTION_HANDOFFS,
  );
  const isComplete = phase === "complete";

  return {
    phase,
    event,
    completedHandoffs,
    actors: ingestionActorStatuses(phase),
    lakeVersion: normalizedProgress >= INGESTION_HANDOFFS[3].end ? 7 : null,
    status: ingestionStatusForPhase(phase),
    isComplete,
  };
}

export function deriveRepairSnapshot(progress: number): RepairSnapshot {
  const normalizedProgress = clamp(progress, 0, 1);
  const phase = repairPhaseForProgress(normalizedProgress);
  const event = eventForProgress(normalizedProgress, REPAIR_HANDOFFS);
  const completedHandoffs = completedHandoffsAt(
    normalizedProgress,
    REPAIR_HANDOFFS,
  );
  const isComplete = phase === "complete";
  const repairApplied = normalizedProgress >= REPAIR_APPLIED_AT;

  return {
    phase,
    event,
    completedHandoffs,
    actors: repairActorStatuses(phase),
    mysqlVersion: repairApplied ? 7 : 6,
    mysqlState: repairApplied ? "paid" : "pending",
    mismatchFound: normalizedProgress >= 0.42,
    repairPublished: normalizedProgress >= REPAIR_HANDOFFS[0].end,
    status: repairStatusForPhase(phase),
    isComplete,
  };
}

function ingestionPhaseForProgress(progress: number): IngestionPhase {
  if (progress < 0.1) return "establishing";
  if (progress < 0.3) return "capturing";
  if (progress < 0.5) return "publishing";
  if (progress < 0.7) return "consuming";
  if (progress < 0.9) return "storing";
  return "complete";
}

function repairPhaseForProgress(progress: number): RepairPhase {
  if (progress < 0.1) return "establishing";
  if (progress < 0.24) return "scheduling";
  if (progress < 0.42) return "scanning";
  if (progress < 0.52) return "detecting";
  if (progress < 0.68) return "publishing";
  if (progress < 0.82) return "consuming";
  if (progress < 0.95) return "applying";
  return "complete";
}

function eventForProgress(
  progress: number,
  handoffs: readonly EventWindow[],
): FlowEvent {
  const active = handoffs.find(
    ({ start, end }) => progress >= start && progress < end,
  );

  if (!active) {
    return {
      visible: false,
      handoffIndex: 0,
      payload: "",
      hopProgress: 0,
      state: "hidden",
    };
  }

  const windowProgress = progressInWindow(progress, active.start, active.end);
  const state = eventStateForProgress(windowProgress);
  const hopProgress =
    state === "departing"
      ? 0
      : state === "arrived"
        ? 1
        : strongEaseInOut(
            progressInWindow(
              windowProgress,
              EVENT_TRAVEL_START,
              EVENT_TRAVEL_END,
            ),
          );

  return {
    visible: true,
    handoffIndex: active.handoffIndex,
    payload: active.payload,
    hopProgress,
    state,
  };
}

function eventStateForProgress(progress: number): FlowEventState {
  if (progress < EVENT_TRAVEL_START) return "departing";
  if (progress < EVENT_TRAVEL_END) return "traveling";
  return "arrived";
}

function completedHandoffsAt(
  progress: number,
  handoffs: readonly EventWindow[],
) {
  return handoffs.filter(({ end }) => progress >= end).length;
}

function ingestionActorStatuses(
  phase: IngestionPhase,
): Record<IngestionActor, ActorStatus> {
  const activeActor: Partial<Record<IngestionPhase, IngestionActor>> = {
    establishing: "mysql",
    capturing: "debezium",
    publishing: "kafka",
    consuming: "flink",
    storing: "lake",
  };
  const actorOrder: readonly IngestionActor[] = [
    "mysql",
    "debezium",
    "kafka",
    "flink",
    "lake",
  ];

  return statusesFromOrder(
    actorOrder,
    activeActor[phase],
    phase === "complete",
  );
}

function repairActorStatuses(
  phase: RepairPhase,
): Record<RepairActor, ActorStatus> {
  const statuses: Record<RepairActor, ActorStatus> = {
    airflow: "waiting",
    lake: "waiting",
    trino: "waiting",
    kafka: "waiting",
    flink: "waiting",
    mysql: "waiting",
  };

  switch (phase) {
    case "establishing":
      statuses.lake = "complete";
      break;
    case "scheduling":
      statuses.airflow = "active";
      statuses.lake = "complete";
      break;
    case "scanning":
      statuses.airflow = "complete";
      statuses.lake = "active";
      statuses.trino = "active";
      break;
    case "detecting":
      statuses.airflow = "complete";
      statuses.lake = "complete";
      statuses.trino = "active";
      break;
    case "publishing":
      statuses.airflow = "complete";
      statuses.lake = "complete";
      statuses.trino = "active";
      statuses.kafka = "active";
      break;
    case "consuming":
      statuses.airflow = "complete";
      statuses.lake = "complete";
      statuses.trino = "complete";
      statuses.kafka = "active";
      statuses.flink = "active";
      break;
    case "applying":
      statuses.airflow = "complete";
      statuses.lake = "complete";
      statuses.trino = "complete";
      statuses.kafka = "complete";
      statuses.flink = "active";
      statuses.mysql = "active";
      break;
    case "complete":
      for (const actor of Object.keys(statuses) as RepairActor[]) {
        statuses[actor] = "complete";
      }
      break;
  }

  return statuses;
}

function statusesFromOrder<Actor extends string>(
  actors: readonly Actor[],
  activeActor: Actor | undefined,
  isComplete: boolean,
) {
  const activeIndex = activeActor ? actors.indexOf(activeActor) : actors.length;

  return Object.fromEntries(
    actors.map((actor, index) => [
      actor,
      isComplete || index < activeIndex
        ? "complete"
        : index === activeIndex
          ? "active"
          : "waiting",
    ]),
  ) as Record<Actor, ActorStatus>;
}

function ingestionStatusForPhase(phase: IngestionPhase) {
  switch (phase) {
    case "establishing":
      return "MySQL stores order 42 at source version 7";
    case "capturing":
      return "Debezium reads the committed database change";
    case "publishing":
      return "Kafka records the CDC event at offset 81";
    case "consuming":
      return "The Flink ingestion job consumes the event";
    case "storing":
      return "Flink writes source version 7 into Hadoop";
    case "complete":
      return "The data lake retains order 42 at source version 7";
  }
}

function repairStatusForPhase(phase: RepairPhase) {
  switch (phase) {
    case "establishing":
      return "MySQL has regressed to version 6; Hadoop retains version 7";
    case "scheduling":
      return "Airflow starts the scheduled reconciliation run";
    case "scanning":
      return "Trino reads the trusted version from the data lake";
    case "detecting":
      return "Trino finds order 42 at version 6 instead of version 7";
    case "publishing":
      return "Trino publishes a versioned repair event to Kafka";
    case "consuming":
      return "The Flink repair job consumes the repair event";
    case "applying":
      return "Flink applies version 7 without moving the row backward";
    case "complete":
      return "MySQL version 7 now matches the trusted data lake";
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
