import { changeHighlightDurationMs } from "../shared/change-highlight";

export type CascadeEntityKind = "customer" | "order" | "shipment";

export type CascadeEntityKey =
  | "customer-91"
  | "order-7012"
  | "order-7013"
  | "shipment-5012"
  | "shipment-5013";

export type CascadePurgeEventKey =
  | "customer-91-to-order-7012"
  | "customer-91-to-order-7013"
  | "order-7012-to-shipment-5012"
  | "order-7013-to-shipment-5013";

export type CascadeEntityDefinition = {
  key: CascadeEntityKey;
  kind: CascadeEntityKind;
  id: string;
  label: string;
  parentKey?: CascadeEntityKey;
};

export type CascadeEntityState = "live" | "deleting" | "receiving" | "deleted";

export type CascadeEntitySnapshot = CascadeEntityDefinition & {
  state: CascadeEntityState;
  deletionProgress: number;
  isHighlighted: boolean;
};

export type CascadePurgeEventDefinition = {
  key: CascadePurgeEventKey;
  sourceKey: CascadeEntityKey;
  targetKey: CascadeEntityKey;
  label: string;
  emittedAtMs: number;
  travelStartMs: number;
  arriveAtMs: number;
  deliveredAtMs: number;
};

export type CascadePurgeEventStatus =
  | "pending"
  | "queued"
  | "traveling"
  | "arrived"
  | "delivered";

export type CascadePurgeEventSnapshot = CascadePurgeEventDefinition & {
  status: CascadePurgeEventStatus;
  localProgress: number;
  travelProgress: number;
  arrivalProgress: number;
  isVisible: boolean;
};

export type DataRetentionCascadePhase =
  | "establishing"
  | "deleting-customer"
  | "purging-orders"
  | "deleting-orders"
  | "purging-shipments"
  | "deleting-shipments"
  | "settling"
  | "complete";

export type CascadeDeletedCounts = {
  customers: number;
  orders: number;
  shipments: number;
};

export type DataRetentionCascadeSnapshot = {
  elapsedMs: number;
  progress: number;
  phase: DataRetentionCascadePhase;
  entities: CascadeEntitySnapshot[];
  events: CascadePurgeEventSnapshot[];
  deletedCounts: CascadeDeletedCounts;
  summary?: string;
  isSettled: boolean;
  isComplete: boolean;
};

export const DATA_RETENTION_CASCADE_INTRO_MS = 1_200;
export const DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS =
  changeHighlightDurationMs(900);
export const DATA_RETENTION_CASCADE_EVENT_TRAVEL_DURATION_MS = 2_200;
export const DATA_RETENTION_CASCADE_EVENT_STAGGER_MS = 300;
export const DATA_RETENTION_CASCADE_FINAL_HOLD_MS = 1_100;
export const DATA_RETENTION_CASCADE_SUMMARY =
  "1 customer → 2 orders → 2 shipments deleted";

const CUSTOMER_DELETE_START_MS = DATA_RETENTION_CASCADE_INTRO_MS;
const CUSTOMER_DELETED_AT_MS =
  CUSTOMER_DELETE_START_MS + DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS;

const FIRST_ORDER_EVENT_START_MS = CUSTOMER_DELETED_AT_MS;
const SECOND_ORDER_EVENT_START_MS =
  FIRST_ORDER_EVENT_START_MS + DATA_RETENTION_CASCADE_EVENT_STAGGER_MS;
const FIRST_ORDER_EVENT_ARRIVAL_MS =
  FIRST_ORDER_EVENT_START_MS + DATA_RETENTION_CASCADE_EVENT_TRAVEL_DURATION_MS;
const SECOND_ORDER_EVENT_ARRIVAL_MS =
  SECOND_ORDER_EVENT_START_MS + DATA_RETENTION_CASCADE_EVENT_TRAVEL_DURATION_MS;
const FIRST_ORDER_DELETED_AT_MS =
  SECOND_ORDER_EVENT_ARRIVAL_MS + DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS;
const SECOND_ORDER_DELETED_AT_MS = FIRST_ORDER_DELETED_AT_MS;

const FIRST_SHIPMENT_EVENT_START_MS = FIRST_ORDER_DELETED_AT_MS;
const SECOND_SHIPMENT_EVENT_START_MS =
  SECOND_ORDER_DELETED_AT_MS + DATA_RETENTION_CASCADE_EVENT_STAGGER_MS;
const FIRST_SHIPMENT_EVENT_ARRIVAL_MS =
  FIRST_SHIPMENT_EVENT_START_MS +
  DATA_RETENTION_CASCADE_EVENT_TRAVEL_DURATION_MS;
const SECOND_SHIPMENT_EVENT_ARRIVAL_MS =
  SECOND_SHIPMENT_EVENT_START_MS +
  DATA_RETENTION_CASCADE_EVENT_TRAVEL_DURATION_MS;
const FIRST_SHIPMENT_DELETED_AT_MS =
  SECOND_SHIPMENT_EVENT_ARRIVAL_MS +
  DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS;
const SECOND_SHIPMENT_DELETED_AT_MS = FIRST_SHIPMENT_DELETED_AT_MS;

export const DATA_RETENTION_CASCADE_SETTLED_AT_MS =
  SECOND_SHIPMENT_DELETED_AT_MS;
export const DATA_RETENTION_CASCADE_DURATION_MS =
  DATA_RETENTION_CASCADE_SETTLED_AT_MS + DATA_RETENTION_CASCADE_FINAL_HOLD_MS;

export const CASCADE_ENTITIES: readonly CascadeEntityDefinition[] = [
  {
    key: "customer-91",
    kind: "customer",
    id: "#91",
    label: "Customer #91",
  },
  {
    key: "order-7012",
    kind: "order",
    id: "#7012",
    label: "Order #7012",
    parentKey: "customer-91",
  },
  {
    key: "order-7013",
    kind: "order",
    id: "#7013",
    label: "Order #7013",
    parentKey: "customer-91",
  },
  {
    key: "shipment-5012",
    kind: "shipment",
    id: "#5012",
    label: "Shipment #5012",
    parentKey: "order-7012",
  },
  {
    key: "shipment-5013",
    kind: "shipment",
    id: "#5013",
    label: "Shipment #5013",
    parentKey: "order-7013",
  },
] as const;

export const CASCADE_PURGE_EVENTS: readonly CascadePurgeEventDefinition[] = [
  {
    key: "customer-91-to-order-7012",
    sourceKey: "customer-91",
    targetKey: "order-7012",
    label: "Customer #91 deleted",
    emittedAtMs: CUSTOMER_DELETED_AT_MS,
    travelStartMs: FIRST_ORDER_EVENT_START_MS,
    arriveAtMs: FIRST_ORDER_EVENT_ARRIVAL_MS,
    deliveredAtMs: FIRST_ORDER_DELETED_AT_MS,
  },
  {
    key: "customer-91-to-order-7013",
    sourceKey: "customer-91",
    targetKey: "order-7013",
    label: "Customer #91 deleted",
    emittedAtMs: CUSTOMER_DELETED_AT_MS,
    travelStartMs: SECOND_ORDER_EVENT_START_MS,
    arriveAtMs: SECOND_ORDER_EVENT_ARRIVAL_MS,
    deliveredAtMs: SECOND_ORDER_DELETED_AT_MS,
  },
  {
    key: "order-7012-to-shipment-5012",
    sourceKey: "order-7012",
    targetKey: "shipment-5012",
    label: "Order #7012 deleted",
    emittedAtMs: FIRST_ORDER_DELETED_AT_MS,
    travelStartMs: FIRST_SHIPMENT_EVENT_START_MS,
    arriveAtMs: FIRST_SHIPMENT_EVENT_ARRIVAL_MS,
    deliveredAtMs: FIRST_SHIPMENT_DELETED_AT_MS,
  },
  {
    key: "order-7013-to-shipment-5013",
    sourceKey: "order-7013",
    targetKey: "shipment-5013",
    label: "Order #7013 deleted",
    emittedAtMs: SECOND_ORDER_DELETED_AT_MS,
    travelStartMs: SECOND_SHIPMENT_EVENT_START_MS,
    arriveAtMs: SECOND_SHIPMENT_EVENT_ARRIVAL_MS,
    deliveredAtMs: SECOND_SHIPMENT_DELETED_AT_MS,
  },
] as const;

export const INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT =
  deriveDataRetentionCascadeSnapshot(0);
export const COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT =
  deriveDataRetentionCascadeSnapshot(DATA_RETENTION_CASCADE_DURATION_MS);
export const REDUCED_MOTION_DATA_RETENTION_CASCADE_SNAPSHOT =
  COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT;

export function deriveDataRetentionCascadeSnapshot(
  elapsedMs: number,
): DataRetentionCascadeSnapshot {
  const safeElapsedMs = clampElapsed(elapsedMs);
  const entities = CASCADE_ENTITIES.map((entity) =>
    deriveEntitySnapshot(entity, safeElapsedMs),
  );
  const deletedCounts = countDeletedEntities(entities);
  const isSettled = safeElapsedMs >= DATA_RETENTION_CASCADE_SETTLED_AT_MS;

  return {
    elapsedMs: safeElapsedMs,
    progress: safeElapsedMs / DATA_RETENTION_CASCADE_DURATION_MS,
    phase: phaseForElapsedMs(safeElapsedMs),
    entities,
    events: CASCADE_PURGE_EVENTS.map((event) =>
      deriveEventSnapshot(event, safeElapsedMs),
    ),
    deletedCounts,
    summary: isSettled ? DATA_RETENTION_CASCADE_SUMMARY : undefined,
    isSettled,
    isComplete: safeElapsedMs >= DATA_RETENTION_CASCADE_DURATION_MS,
  };
}

export function eventTimeFor(eventKey: CascadePurgeEventKey) {
  const event = CASCADE_PURGE_EVENTS.find(({ key }) => key === eventKey);

  if (!event) {
    throw new Error(`Unknown cascade purge event: ${eventKey}`);
  }

  return {
    emittedAtMs: event.emittedAtMs,
    travelStartMs: event.travelStartMs,
    arriveAtMs: event.arriveAtMs,
    deliveredAtMs: event.deliveredAtMs,
  };
}

function deriveEntitySnapshot(
  entity: CascadeEntityDefinition,
  elapsedMs: number,
): CascadeEntitySnapshot {
  const { changeStartMs, deletedAtMs } = timingForEntity(entity.key);
  const isCustomer = entity.kind === "customer";

  if (elapsedMs < changeStartMs) {
    return {
      ...entity,
      state: "live",
      deletionProgress: 0,
      isHighlighted: false,
    };
  }

  if (elapsedMs < deletedAtMs) {
    return {
      ...entity,
      state: isCustomer ? "deleting" : "receiving",
      deletionProgress: strongEaseInOut(
        progressInWindow(elapsedMs, changeStartMs, deletedAtMs),
      ),
      isHighlighted: true,
    };
  }

  return {
    ...entity,
    state: "deleted",
    deletionProgress: 1,
    isHighlighted: false,
  };
}

function deriveEventSnapshot(
  event: CascadePurgeEventDefinition,
  elapsedMs: number,
): CascadePurgeEventSnapshot {
  const status = eventStatus(event, elapsedMs);
  const travelProgress =
    elapsedMs < event.travelStartMs
      ? 0
      : progressInWindow(elapsedMs, event.travelStartMs, event.arriveAtMs);
  const arrivalProgress =
    elapsedMs < event.arriveAtMs
      ? 0
      : progressInWindow(elapsedMs, event.arriveAtMs, event.deliveredAtMs);

  return {
    ...event,
    status,
    localProgress: localEventProgress(status, travelProgress, arrivalProgress),
    travelProgress,
    arrivalProgress,
    isVisible:
      status === "queued" || status === "traveling" || status === "arrived",
  };
}

function eventStatus(
  event: CascadePurgeEventDefinition,
  elapsedMs: number,
): CascadePurgeEventStatus {
  if (elapsedMs < event.emittedAtMs) return "pending";
  if (elapsedMs < event.travelStartMs) return "queued";
  if (elapsedMs < event.arriveAtMs) return "traveling";
  if (elapsedMs < event.deliveredAtMs) return "arrived";
  return "delivered";
}

function localEventProgress(
  status: CascadePurgeEventStatus,
  travelProgress: number,
  arrivalProgress: number,
) {
  if (status === "traveling") return travelProgress;
  if (status === "arrived") return arrivalProgress;
  if (status === "delivered") return 1;
  return 0;
}

function timingForEntity(entityKey: CascadeEntityKey) {
  if (entityKey === "customer-91") {
    return {
      changeStartMs: CUSTOMER_DELETE_START_MS,
      deletedAtMs: CUSTOMER_DELETED_AT_MS,
    };
  }

  const incomingEvent = CASCADE_PURGE_EVENTS.find(
    ({ targetKey }) => targetKey === entityKey,
  );

  if (!incomingEvent) {
    throw new Error(`Cascade entity has no incoming purge event: ${entityKey}`);
  }

  return {
    changeStartMs: incomingEvent.arriveAtMs,
    deletedAtMs: incomingEvent.deliveredAtMs,
  };
}

function countDeletedEntities(
  entities: readonly CascadeEntitySnapshot[],
): CascadeDeletedCounts {
  return {
    customers: countDeletedKind(entities, "customer"),
    orders: countDeletedKind(entities, "order"),
    shipments: countDeletedKind(entities, "shipment"),
  };
}

function countDeletedKind(
  entities: readonly CascadeEntitySnapshot[],
  kind: CascadeEntityKind,
) {
  return entities.filter(
    (entity) => entity.kind === kind && entity.state === "deleted",
  ).length;
}

function phaseForElapsedMs(elapsedMs: number): DataRetentionCascadePhase {
  if (elapsedMs < CUSTOMER_DELETE_START_MS) return "establishing";
  if (elapsedMs < CUSTOMER_DELETED_AT_MS) return "deleting-customer";
  if (elapsedMs < FIRST_ORDER_EVENT_ARRIVAL_MS) return "purging-orders";
  if (elapsedMs < SECOND_ORDER_DELETED_AT_MS) return "deleting-orders";
  if (elapsedMs < FIRST_SHIPMENT_EVENT_ARRIVAL_MS) {
    return "purging-shipments";
  }
  if (elapsedMs < DATA_RETENTION_CASCADE_SETTLED_AT_MS) {
    return "deleting-shipments";
  }
  if (elapsedMs < DATA_RETENTION_CASCADE_DURATION_MS) return "settling";
  return "complete";
}

function progressInWindow(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1);
}

function strongEaseInOut(progress: number) {
  const normalizedProgress = clamp(progress, 0, 1);

  return normalizedProgress < 0.5
    ? 4 * normalizedProgress * normalizedProgress * normalizedProgress
    : 1 - Math.pow(-2 * normalizedProgress + 2, 3) / 2;
}

function clampElapsed(value: number) {
  if (Number.isNaN(value) || value === Number.NEGATIVE_INFINITY) return 0;
  if (value === Number.POSITIVE_INFINITY) {
    return DATA_RETENTION_CASCADE_DURATION_MS;
  }
  return clamp(value, 0, DATA_RETENTION_CASCADE_DURATION_MS);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
