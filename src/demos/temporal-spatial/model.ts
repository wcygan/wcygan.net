import type { DemoKind, Point } from "./layout";
export type { DemoKind, Point } from "./layout";
export type SceneKind = DemoKind;
export type Tone = "orange" | "blue" | "green" | "yellow" | "red" | "panel";
export type CameraAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "in"
  | "out"
  | "reset";
export interface CameraCommand {
  action: CameraAction;
  sequence: number;
}
export type CompensationMode = "compensated" | "refund-fails";
export interface HistoryEvent {
  id: number;
  label: string;
  payload: Record<string, string | number>;
  result?: string;
}
export interface NodeState {
  tone: Tone;
  visible?: boolean;
  note?: string;
}
export interface SpatialFrame {
  kind: DemoKind;
  step: number;
  last: number;
  done: boolean;
  title: string;

  nodes: Record<string, NodeState>;
  routes: string[];
  history: HistoryEvent[];
  readouts: { label: string; value: string }[];
}
const clamp = (value: number, last: number) =>
  Math.max(0, Math.min(last, Number.isFinite(value) ? Math.floor(value) : 0));
const node = (tone: Tone, note?: string, visible = true): NodeState => ({
  tone,
  note,
  visible,
});
const event = (
  id: number,
  label: string,
  payload: HistoryEvent["payload"],
  result?: string,
): HistoryEvent => ({ id, label, payload, result });
const finish = (
  kind: DemoKind,
  step: number,
  last: number,
  frame: Omit<SpatialFrame, "kind" | "step" | "last" | "done">,
): SpatialFrame => ({ ...frame, kind, step, last, done: step === last });
const readout = (label: string, value: string | number) => ({
  label,
  value: String(value),
});
export const ARCHITECTURE_LAST_STEP = 7;
export const REPLAY_LAST_STEP = 8;
export const REPLAY_EVENTS = [
  event(1, "WorkflowExecutionStarted", { orderId: "order-42" }),
  event(2, "ActivityTaskScheduled · reserveInventory", { orderId: "order-42" }),
  event(
    3,
    "ActivityTaskCompleted · reserveInventory",
    { reservationId: "R-42" },
    "R-42",
  ),
  event(4, "ActivityTaskScheduled · chargePayment", {
    orderId: "order-42",
    reservationId: "R-42",
  }),
  event(
    5,
    "ActivityTaskCompleted · chargePayment",
    { paymentId: "P-42" },
    "P-42",
  ),
  event(6, "WorkflowExecutionCompleted", { result: "fulfilled" }, "fulfilled"),
];
const architectureBeats = [
  "Code, coordination, and side effects",
  "The client starts one execution",
  "A worker receives a Workflow Task",
  "Workflow code schedules reserveInventory",
  "A worker receives an Activity Task",
  "Activity code calls the inventory API",
  "The worker reports the result",
  "Your workers remain your responsibility",
] as const;
export function architectureSnapshot(value: number): SpatialFrame {
  const step = clamp(value, ARCHITECTURE_LAST_STEP);
  const historyCount = step < 1 ? 0 : step < 3 ? 1 : step < 6 ? 2 : 3;
  const routes = [
    [],
    ["start"],
    ["workflow"],
    ["command"],
    ["activity"],
    ["inventory"],
    ["report"],
    [],
  ][step];
  return finish("architecture", step, ARCHITECTURE_LAST_STEP, {
    title: architectureBeats[step],

    routes,
    history: REPLAY_EVENTS.slice(0, historyCount),
    nodes: {
      client: node(step === 1 ? "orange" : "panel"),
      service: node("blue", `${historyCount} records`),
      worker: node(
        step === 2 || step === 3 || step === 4
          ? "orange"
          : step >= 6
            ? "green"
            : "panel",
        step === 4 || step === 5 ? "Activity code" : "Workflow + Activity code",
      ),
      inventory: node(
        step >= 6 ? "green" : step === 5 ? "orange" : "panel",
        step >= 6 ? "R-42 acknowledged" : "External operation",
      ),
      payment: node("panel", "Not called"),
    },
    readouts: [
      readout("Durable illustrated records", historyCount),
      readout("Execution owner", "Your application workers"),
      readout("Inventory calls", step >= 5 ? 1 : 0),
    ],
  });
}

const taskBeats = [
  "A pool polls logical task queues",
  "Worker A receives Activity T2",
  "Worker B receives Activity T1",
  "Worker C receives Activity T3",
  "Worker A acknowledges T2",
  "Worker B goes offline",
  "T1 times out and becomes retryable",
  "A replacement worker receives T1",
  "The replacement acknowledges T1",
  "Worker C acknowledges T3",
] as const;
export function taskQueueSnapshot(value: number): SpatialFrame {
  const step = clamp(value, 9);
  const routes = [
    [],
    ["taskA"],
    ["taskB"],
    ["taskC"],
    ["ackA"],
    [],
    [],
    ["replace"],
    ["ackReplacement"],
    ["ackC"],
  ][step];
  const pending =
    step === 0 ? 3 : step === 1 ? 2 : step === 2 ? 1 : step === 6 ? 1 : 0;
  const completed = Number(step >= 4) + Number(step >= 8) + Number(step >= 9);
  return finish("tasks", step, 9, {
    title: taskBeats[step],

    routes,
    history: [],
    nodes: {
      wfQueue: node("blue", "orders · Workflow"),
      activityQueue: node(pending ? "yellow" : "blue", `${pending} available`),
      workerA: node(
        step >= 4 ? "green" : step >= 1 ? "orange" : "panel",
        step >= 4 ? "T2 acknowledged" : step >= 1 ? "T2 attempt" : "Polling",
      ),
      workerB: node(
        step >= 5 ? "red" : step >= 2 ? "orange" : "panel",
        step >= 5
          ? "Offline · T1 unacked"
          : step >= 2
            ? "T1 attempt 1"
            : "Polling",
      ),
      workerC: node(
        step >= 9 ? "green" : step >= 3 ? "orange" : "panel",
        step >= 9 ? "T3 acknowledged" : step >= 3 ? "T3 attempt" : "Polling",
      ),
      replacement: node(
        step >= 8 ? "green" : "orange",
        step >= 8 ? "T1 acknowledged" : "T1 attempt 2",
        step >= 7,
      ),
    },
    readouts: [
      readout("Available Activity attempts", pending),
      readout("Acknowledged Activities", `${completed} / 3`),
      readout("T1 attempts", step >= 7 ? 2 : step >= 2 ? 1 : 0),
    ],
  });
}

const HISTORY_EVENTS = [
  REPLAY_EVENTS[0],
  REPLAY_EVENTS[1],
  REPLAY_EVENTS[2],
  event(4, "TimerStarted", { delay: "2 minutes" }),
  event(5, "TimerFired", { timerId: "follow-up" }),
  event(6, "WorkflowExecutionCompleted", { reservationId: "R-42" }, "R-42"),
];
const historyBeats = [
  "A per-execution history begins empty",
  "Append the execution input",
  "Append an Activity request",
  "Append the acknowledged result",
  "Append a durable timer",
  "Worker memory disappears; records remain",
  "The Service records the timer firing",
  "Append completion after a worker resumes",
] as const;
export function historySnapshot(value: number): SpatialFrame {
  const step = clamp(value, 7);
  const count = [0, 1, 2, 3, 4, 4, 5, 6][step];
  const history = HISTORY_EVENTS.slice(0, count);
  const nodes: Record<string, NodeState> = {
    timerService: node(
      "blue",
      step >= 6 ? "Timer fired" : "Durable wait",
      step >= 4,
    ),
    memory: node(
      step === 5 || step === 6 ? "red" : "orange",
      step === 5 || step === 6
        ? "Local variable lost"
        : step >= 3
          ? "reservation = R-42"
          : "reservation unset",
    ),
  };
  for (let id = 1; id <= 6; id += 1)
    nodes[`record${id}`] = node(
      id === count && step !== 5 ? "green" : "blue",
      undefined,
      id <= count,
    );
  return finish("history", step, 7, {
    title: historyBeats[step],

    nodes,
    routes: step === 0 || step === 5 ? [] : [`append${count}`],
    history,
    readouts: [
      readout("Durable history records", count),
      readout(
        "Worker memory",
        step === 5 || step === 6 ? "Lost" : step >= 3 ? "R-42" : "Unset",
      ),
      readout("Stored state format", "Events and payloads"),
    ],
  });
}

const replayBeats = [
  "Worker A starts one execution",
  "Schedule the reserve Activity",
  "Record the completed reserve result",
  "Lose local memory after acknowledgment",
  "Worker B reexecutes the Workflow code",
  "Consume R-42 from the recorded result",
  "Schedule new work after replay",
  "Call and acknowledge the payment Activity",
  "Two code runs; one execution",
] as const;
export function replaySnapshot(value: number): SpatialFrame {
  const step = clamp(value, REPLAY_LAST_STEP);
  const count = [1, 2, 3, 3, 3, 3, 4, 5, 6][step];
  const routes = [
    [],
    [],
    ["reserve", "record"],
    [],
    ["load"],
    ["reuse"],
    ["schedule"],
    ["charge"],
    ["finish"],
  ][step];
  const nodes: Record<string, NodeState> = {
    oldWorker: node(
      step >= 3 ? "red" : "orange",
      step >= 3 ? "Memory lost" : step >= 2 ? "reservation = R-42" : "Running",
    ),
    newWorker: node(
      step === 8 ? "green" : "orange",
      step >= 5 ? "reservation = R-42" : "Reexecuting code",
      step >= 4,
    ),
    inventory: node(
      step >= 2 ? "green" : "panel",
      step >= 2 ? "Called once" : "Not called",
    ),
    payment: node(
      step >= 7 ? "green" : "panel",
      step >= 7 ? "Called once" : "Not called",
    ),
  };
  for (let id = 1; id <= 6; id += 1)
    nodes[`record${id}`] = node(
      id === 3 && (step === 2 || step === 5) ? "green" : "blue",
      undefined,
      id <= count,
    );
  return finish("replay", step, REPLAY_LAST_STEP, {
    title: replayBeats[step],

    nodes,
    routes,
    history: REPLAY_EVENTS.slice(0, count),
    readouts: [
      readout("Workflow code runs", `${step >= 4 ? 2 : 1} · one execution`),
      readout(
        "Local reservation",
        step === 2 || step >= 5 ? "R-42" : step >= 3 ? "Lost / unset" : "Unset",
      ),
      readout(
        "External calls",
        `Reserve ${step >= 2 ? 1 : 0} · Charge ${step >= 7 ? 1 : 0}`,
      ),
    ],
  });
}

const parallelBeats = [
  "Two prerequisites, one fulfillment",
  "Schedule both branches",
  "Inventory finishes first",
  "Wait for the slower branch",
  "Risk completes; the join is satisfied",
  "Schedule fulfillment after both results",
  "Fulfillment completes",
] as const;
export function parallelSnapshot(value: number): SpatialFrame {
  const step = clamp(value, 6);
  const ready = step >= 4 ? 2 : step >= 2 ? 1 : 0;
  const routes = [
    [],
    ["begin", "fanInventory", "fanRisk"],
    ["inventoryResult"],
    [],
    ["riskResult"],
    ["fulfill"],
    [],
  ][step];
  const history = [] as HistoryEvent[];
  if (step >= 1) {
    history.push(
      event(1, "Inventory and risk Activities scheduled", { prerequisites: 2 }),
    );
  }
  if (step >= 2) {
    history.push(
      event(
        2,
        "Inventory result acknowledged",
        { reservationId: "R-42" },
        "R-42",
      ),
    );
  }
  if (step >= 4) {
    history.push(
      event(3, "Risk result acknowledged", { riskScore: 0.2 }, "0.2"),
    );
  }
  if (step >= 6) {
    history.push(
      event(
        4,
        "Fulfillment result acknowledged",
        { shipmentId: "S-42" },
        "S-42",
      ),
    );
  }
  return finish("parallel", step, 6, {
    title: parallelBeats[step],

    routes,
    history,
    nodes: {
      orchestrator: node("orange", "Deterministic code"),
      fork: node(step >= 1 ? "orange" : "panel", "Schedule both"),
      inventory: node(
        step >= 2 ? "green" : step >= 1 ? "yellow" : "panel",
        step >= 2 ? "R-42 recorded" : "Independent Activity",
      ),
      risk: node(
        step >= 4 ? "green" : step >= 1 ? "yellow" : "panel",
        step >= 4 ? "0.2 recorded" : "Independent Activity",
      ),
      join: node(ready === 2 ? "green" : "yellow", `${ready} / 2 results`),
      fulfill: node(
        step === 6 ? "green" : step === 5 ? "orange" : "panel",
        step < 5 ? "Blocked by join" : step === 5 ? "Running" : "S-42 recorded",
      ),
    },
    readouts: [
      readout("Prerequisites acknowledged", `${ready} / 2`),
      readout("Fulfillment scheduled", step >= 5 ? "Yes" : "No"),
      readout("Capacity in this illustration", "Two Activity workers"),
    ],
  });
}

const compensationBeats = [
  "A multi-step order can partly succeed",
  "Reserve succeeds",
  "Charge succeeds",
  "Shipping fails",
  "Request a refund as new work",
  "Refund succeeds",
  "Release the reservation as new work",
  "Compensation completed",
] as const;
export function compensationSnapshot(
  value: number,
  mode: CompensationMode = "compensated",
): SpatialFrame {
  const last = mode === "refund-fails" ? 6 : 7;
  const step = clamp(value, last);
  const refundFailed = mode === "refund-fails" && step >= 5;
  const title = refundFailed
    ? step === 5
      ? "The refund retry budget is exhausted"
      : "Manual recovery is required"
    : compensationBeats[step];
  const history: HistoryEvent[] = [];
  if (step >= 1)
    history.push(
      event(1, "Reserve acknowledged", { reservationId: "R-42" }, "R-42"),
    );
  if (step >= 2)
    history.push(
      event(2, "Charge acknowledged", { paymentId: "P-42" }, "P-42"),
    );
  if (step >= 3)
    history.push(event(3, "Ship failed", { reason: "No shipment created" }));
  if (step >= 4)
    history.push(
      event(4, "Refund requested", {
        paymentId: "P-42",
        idempotencyKey: "refund-order-42",
      }),
    );
  if (step >= 5)
    history.push(
      event(
        5,
        refundFailed ? "Refund failed finally" : "Refund acknowledged",
        { paymentId: "P-42" },
        refundFailed ? undefined : "refunded",
      ),
    );
  if (step >= 6 && !refundFailed)
    history.push(
      event(6, "Release acknowledged", { reservationId: "R-42" }, "released"),
    );
  return finish("compensation", step, last, {
    title,

    history,
    routes:
      step === 2
        ? ["pay"]
        : step === 3
          ? ["ship"]
          : step === 4 || (step === 5 && !refundFailed)
            ? ["refund"]
            : step === 6
              ? [refundFailed ? "manual" : "release"]
              : [],
    nodes: {
      reserve: node(
        step >= 1 ? "green" : "panel",
        step >= 1 ? "R-42 reserved" : "Forward work",
      ),
      charge: node(
        step >= 2 ? "green" : "panel",
        step >= 2 ? "P-42 captured" : "Forward work",
      ),
      ship: node(
        step >= 3 ? "red" : "panel",
        step >= 3 ? "Failed · no shipment" : "Forward work",
      ),
      refund: node(
        refundFailed
          ? "red"
          : step >= 5
            ? "green"
            : step === 4
              ? "orange"
              : "panel",
        refundFailed
          ? "Retry budget exhausted"
          : step >= 5
            ? "Refund acknowledged"
            : "New Activity",
      ),
      release: node(
        !refundFailed && step >= 6 ? "green" : "panel",
        !refundFailed && step >= 6 ? "Release acknowledged" : "New Activity",
      ),
      manual: node("red", "Outstanding refund", refundFailed && step >= 6),
    },
    readouts: [
      readout(
        "Payment",
        step < 2
          ? "Not captured"
          : !refundFailed && step >= 5
            ? "Refunded"
            : "Captured",
      ),
      readout(
        "Inventory",
        step < 1
          ? "Free"
          : !refundFailed && step >= 6
            ? "Released"
            : "Reserved",
      ),
      readout(
        "Outcome",
        refundFailed && step >= 6
          ? "Manual recovery"
          : step === last
            ? "Canceled · compensated"
            : "In progress",
      ),
    ],
  });
}

export function spatialSnapshot(
  kind: DemoKind,
  value: number,
  mode: CompensationMode = "compensated",
): SpatialFrame {
  return {
    architecture: architectureSnapshot,
    tasks: taskQueueSnapshot,
    history: historySnapshot,
    replay: replaySnapshot,
    parallel: parallelSnapshot,
    compensation: (step: number) => compensationSnapshot(step, mode),
  }[kind](value);
}
export const DEMOS: Record<DemoKind, { title: string }> = {
  architecture: {
    title: "Temporal Architecture",
  },
  tasks: {
    title: "Task Queues and Workers",
  },
  history: {
    title: "What Event History Stores",
  },
  replay: {
    title: "How Replay Rebuilds State",
  },
  parallel: {
    title: "Parallel Activities and the Join",
  },
  compensation: {
    title: "Compensation Is New Work",
  },
};
