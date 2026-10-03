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
  status: string;
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
  [
    "Code, coordination, and side effects",
    "A client starts executions. The Temporal Service retains durable history and distributes tasks. Your workers execute Workflow and Activity code; Activities call external systems.",
  ],
  [
    "The client starts one execution",
    "The Service accepts order-42 and records its start. A Workflow Task becomes available to compatible workers.",
  ],
  [
    "A worker receives a Workflow Task",
    "A worker-initiated poll receives work through the Service API. Your deterministic Workflow code runs in that worker, outside the Service.",
  ],
  [
    "Workflow code schedules reserveInventory",
    "The worker reports a schedule-Activity command. The Service records the request and makes an Activity Task available.",
  ],
  [
    "A worker receives an Activity Task",
    "A worker registered for reserveInventory takes the Activity Task. Workflow and Activity Tasks are different logical task types.",
  ],
  [
    "Activity code calls the inventory API",
    "The Activity performs the external operation. The inventory API returns reservation R-42; the Service did not call this API itself.",
  ],
  [
    "The worker reports the result",
    "The Service acknowledges and records the completed Activity result R-42. That record remains durable independently of worker memory.",
  ],
  [
    "Your workers remain your responsibility",
    "Temporal Cloud runs the Service. You deploy, scale, and operate the application workers containing your Workflow and Activity code.",
  ],
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
    title: architectureBeats[step][0],
    status: architectureBeats[step][1],
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
  [
    "A pool polls logical task queues",
    "Workflow and Activity Task Queues are distinct types and can share a name such as orders. Compatible workers poll; these are not fixed queue servers or a strict global FIFO.",
  ],
  [
    "Worker A receives Activity T2",
    "A compatible worker's poll receives T2. This illustrated choice deliberately makes no global FIFO ordering promise.",
  ],
  [
    "Worker B receives Activity T1",
    "Another compatible worker receives T1. No application-level affinity binds this Activity permanently to Worker B.",
  ],
  [
    "Worker C receives Activity T3",
    "A third poll receives T3. Available worker capacity allows independent Activity attempts to overlap.",
  ],
  [
    "Worker A acknowledges T2",
    "The Service records the completed result for T2. Acknowledged work is distinct from an in-flight attempt.",
  ],
  [
    "Worker B goes offline",
    "T1 has no acknowledged completion. The Service waits for its configured Activity timeout; a dead worker is not an immediate successful handoff.",
  ],
  [
    "T1 times out and becomes retryable",
    "After the configured timeout and retry policy permit it, T1 has another Activity attempt available. External operations from the first attempt may already have occurred.",
  ],
  [
    "A replacement worker receives T1",
    "A new compatible worker polls the same logical Activity Task Queue and takes the retry. Application worker membership can change without replacing the queue.",
  ],
  [
    "The replacement acknowledges T1",
    "The Service records T1's completed result. Activity idempotency is needed if an earlier attempt already performed the external operation.",
  ],
  [
    "Worker C acknowledges T3",
    "Three Activities completed with four illustrated attempts. Worker replacement preserved access to pending work; it did not provide external exactly-once effects.",
  ],
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
    title: taskBeats[step][0],
    status: taskBeats[step][1],
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
  [
    "A per-execution history begins empty",
    "The blue tape represents one execution's ordered records. The orange box is temporary worker memory. Select an appended record to inspect its persisted payload.",
  ],
  [
    "Append the execution input",
    "WorkflowExecutionStarted records the Workflow input order-42. Later events append to this same ordered history; they do not overwrite this input.",
  ],
  [
    "Append an Activity request",
    "ActivityTaskScheduled identifies reserveInventory and its input. Scheduling records the request, not a completed external effect.",
  ],
  [
    "Append the acknowledged result",
    "ActivityTaskCompleted records reservation R-42. The worker can hold reservation = R-42 locally, and the history retains the result separately.",
  ],
  [
    "Append a durable timer",
    "TimerStarted records a two-minute wait. The execution can wait without keeping a worker thread occupied.",
  ],
  [
    "Worker memory disappears; records remain",
    "The worker goes offline and loses its local variable. The four durable records—including R-42 and the timer—remain. They are not a memory snapshot.",
  ],
  [
    "The Service records the timer firing",
    "TimerFired appends after the deadline even while this worker is offline. A suitable worker can later process the resulting Workflow Task.",
  ],
  [
    "Append completion after a worker resumes",
    "After a worker resumes the execution and reports completion, the Service appends the final result. All six earlier positions retain their ordered meaning.",
  ],
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
    title: historyBeats[step][0],
    status: historyBeats[step][1],
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
  [
    "Worker A starts one execution",
    "The Workflow input is recorded. Worker A begins the deterministic Workflow code with reservation unset.",
  ],
  [
    "Schedule the reserve Activity",
    "Worker A reaches await reserveInventory(). The Service records the Activity request and makes a task available.",
  ],
  [
    "Record the completed reserve result",
    "An Activity calls the provider and returns R-42. Its completion is acknowledged and recorded before the crash. Worker A now has reservation = R-42.",
  ],
  [
    "Lose local memory after acknowledgment",
    "Worker A crashes. Its local reservation variable is lost. The same three durable records survive, including the completed reserve result.",
  ],
  [
    "Worker B reexecutes the Workflow code",
    "A replacement receives history and runs the Workflow from its first line. This is the same execution, not a second business order; local reservation begins unset.",
  ],
  [
    "Consume R-42 from the recorded result",
    "Replay reaches await reserveInventory(). The SDK matches the recorded Activity and supplies R-42. No new reserve Activity is scheduled and no inventory API call occurs during this replay.",
  ],
  [
    "Schedule new work after replay",
    "With reservation reconstructed as R-42, Worker B reaches chargePayment(). The Service appends a new scheduling event; this Activity has no prior recorded result.",
  ],
  [
    "Call and acknowledge the payment Activity",
    "An Activity worker calls the payment provider. The completed result P-42 is acknowledged and recorded. Activities with unrecorded completion can still be retried.",
  ],
  [
    "Two code runs; one execution",
    "The execution completes after two Workflow code runs, one reserve call, and one charge call. Replay reconstructed local state from events; it did not restore a saved memory image.",
  ],
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
    title: replayBeats[step][0],
    status: replayBeats[step][1],
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
  [
    "Two prerequisites, one fulfillment",
    "The Workflow schedules independent inventory and risk Activities before awaiting either. The join requires both successful results; actual overlap depends on available worker capacity.",
  ],
  [
    "Schedule both branches",
    "Both Activity requests become available. Two compatible workers can run them independently; scheduling two requests does not itself guarantee simultaneous execution.",
  ],
  [
    "Inventory finishes first",
    "The inventory result is acknowledged. The join has one of two required results, so fulfillment cannot proceed while risk is still running.",
  ],
  [
    "Wait for the slower branch",
    "Risk remains in flight. Inventory stays complete. One successful prerequisite does not release the join.",
  ],
  [
    "Risk completes; the join is satisfied",
    "The risk result is acknowledged. Both prerequisite results are now recorded, so the Workflow can request fulfillment.",
  ],
  [
    "Schedule fulfillment after both results",
    "Only after both successful results does the Workflow schedule the fulfillment Activity. The branches may finish in either order.",
  ],
  [
    "Fulfillment completes",
    "Two independent Activities converged on one deterministic decision. If a branch fails, application logic must define recovery; Promise.all does not automatically undo or cancel external operations.",
  ],
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
    title: parallelBeats[step][0],
    status: parallelBeats[step][1],
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
  [
    "A multi-step order can partly succeed",
    "The application defines reserve, charge, and ship operations, plus new compensation Activities for refund and inventory release. Temporal does not supply a cross-service database rollback.",
  ],
  [
    "Reserve succeeds",
    "The inventory service acknowledges reservation R-42. The successful operation is a durable fact in this execution's history.",
  ],
  [
    "Charge succeeds",
    "The payment service acknowledges payment P-42. Inventory is reserved and money is captured before shipment is attempted.",
  ],
  [
    "Shipping fails",
    "This example assumes shipment creation failed before any shipment was created. Inventory and payment remain successful; a Workflow failure cannot erase those external operations.",
  ],
  [
    "Request a refund as new work",
    "Application recovery logic schedules a refund Activity referencing P-42. This is another external operation with its own retry policy and idempotency requirements.",
  ],
  [
    "Refund succeeds",
    "The payment provider acknowledges the refund. The original charge remains in history, alongside the later refund; compensation does not delete the successful past.",
  ],
  [
    "Release the reservation as new work",
    "After the refund succeeds, this application's recovery policy runs releaseInventory(R-42). The inventory service acknowledges the release.",
  ],
  [
    "Compensation completed",
    "The order is canceled after acknowledged refund and release operations. It is a recovered business outcome, not an atomic rollback of the earlier history.",
  ],
] as const;
export function compensationSnapshot(
  value: number,
  mode: CompensationMode = "compensated",
): SpatialFrame {
  const last = mode === "refund-fails" ? 6 : 7;
  const step = clamp(value, last);
  const refundFailed = mode === "refund-fails" && step >= 5;
  const titles = refundFailed
    ? [
        step === 5
          ? "The refund retry budget is exhausted"
          : "Manual recovery is required",
        step === 5
          ? "The payment provider rejected every refund attempt before issuing any refund. The configured retry policy is exhausted. Payment is still captured and inventory is still reserved."
          : "This application's policy stops and alerts an operator. The outstanding refund must be resolved; Temporal cannot guarantee a compensating API will succeed.",
      ]
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
    title: titles[0],
    status: titles[1],
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
export const DEMOS: Record<
  DemoKind,
  { title: string; description: string; caption: string }
> = {
  architecture: {
    title: "Temporal Architecture",
    description: "The Service remembers. Your workers run the code.",
    caption:
      "Blue is durable coordination; orange is application execution; green is an acknowledged result. Placement is logical, not one component per machine. Worker RPCs use the Service API. Workers never access Service persistence directly. Cloud hosts the Service; you still operate application workers.",
  },
  tasks: {
    title: "Task Queues and Workers",
    description:
      "Compatible pollers can change while pending work remains available.",
    caption:
      "The Workflow and Activity queue types can share a name. Compatible workers initiate polls; the arrows show returned work and acknowledgments. Tasks have no global FIFO guarantee. An unacknowledged Activity can retry after timeout, so external operations must tolerate duplicate attempts.",
  },
  history: {
    title: "What Event History Stores",
    description:
      "Inspect persisted input, an Activity result, a timer, and completion.",
    caption:
      "The tape is one execution's append-only event order. Select an appended record below or click its block. The worker's local variable is transient. This history omits Workflow Task and Activity start events; it is not a raw history export, and individual failed Activity attempts are not presented as a full persisted retry trail.",
  },
  replay: {
    title: "How Replay Rebuilds State",
    description:
      "A completed result crosses from durable history into new local state.",
    caption:
      "Blue records survive the worker crash; orange code runs again in a replacement. The acknowledged reserve result is reused, so the inventory route stays idle during replay. An operation whose external effect succeeded before its completion was recorded can be retried. External exactly-once effects require application design.",
  },
  parallel: {
    title: "Parallel Activities and the Join",
    description:
      "Independent work can overlap; fulfillment waits for both results.",
    caption:
      "Depth separates the independent inventory and risk branches. Green means a result is acknowledged; yellow means waiting. The join releases only after both successful results. Actual concurrency depends on workers. Promise.all does not automatically cancel another Activity or undo its external effects on failure.",
  },
  compensation: {
    title: "Compensation Is New Work",
    description: "Refund and release repair a partial business outcome.",
    caption:
      "The forward path retains reserve and charge success even when shipping fails. The return path contains new compensating Activities, not time travel or database rollback. Each operation needs its own idempotency and failure handling. In the refund-failure scenario, the provider rejects every attempt before issuing a refund; captured payment requires manual recovery.",
  },
};
