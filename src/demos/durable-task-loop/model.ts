export type NodeKey = "service" | "queue" | "worker";

export type LoopPhase = "enqueue" | "poll" | "execute" | "report" | "append";

export type NodeStatus =
  | "idle"
  | "scheduling"
  | "holding"
  | "running"
  | "storing";

export type PacketKind = "task" | "poll" | "result";

export type PacketRoute =
  | "service-to-queue"
  | "queue-to-worker"
  | "worker-to-service";

export type HistoryEventType =
  | "WorkflowExecutionStarted"
  | "WorkflowTaskScheduled"
  | "WorkflowTaskStarted"
  | "WorkflowTaskCompleted"
  | "ActivityTaskScheduled";

export type HistoryRow = {
  id: number;
  type: HistoryEventType;
  newest: boolean;
};

export type NodeSnapshot = {
  key: NodeKey;
  label: string;
  role: string;
  status: NodeStatus;
  statusLabel: string;
  active: boolean;
};

export type PacketSnapshot = {
  kind: PacketKind;
  route: PacketRoute;
  progress: number;
  label: string;
};

export type QueueSnapshot = {
  hasTask: boolean;
  label: string;
};

export type DurableTaskLoopState = {
  progress: number;
  playing: boolean;
};

export type DurableTaskLoopSnapshot = {
  progress: number;
  playing: boolean;
  phase: LoopPhase;
  nodes: Record<NodeKey, NodeSnapshot>;
  queue: QueueSnapshot;
  packets: PacketSnapshot[];
  history: HistoryRow[];
  historyFlash: number;
  phaseLabel: string;
};

const PACKET_TRAVEL = 0.12;

const ENQUEUE_END = 0.2;
const POLL_END = 0.4;
const EXECUTE_END = 0.62;
const REPORT_END = 0.82;

const TASK_SENT_AT = 0.02;
const POLL_SENT_AT = 0.24;
const REPORT_SENT_AT = 0.64;
const APPEND_AT = 0.88;

// Each loop appends exactly one event; the list grows by walking this order.
const HISTORY_ORDER: HistoryEventType[] = [
  "WorkflowExecutionStarted",
  "WorkflowTaskScheduled",
  "WorkflowTaskStarted",
  "WorkflowTaskCompleted",
  "ActivityTaskScheduled",
];

export const REDUCED_MOTION_PROGRESS = 0.92;

export function deriveDurableTaskLoopSnapshot(
  state: DurableTaskLoopState,
): DurableTaskLoopSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);

  return {
    progress,
    playing: state.playing,
    phase,
    nodes: {
      service: serviceSnapshot(phase),
      queue: queueNodeSnapshot(phase),
      worker: workerSnapshot(phase),
    },
    queue: deriveQueue(phase),
    packets: derivePackets(progress),
    history: deriveHistory(progress),
    historyFlash: flashAround(progress, APPEND_AT, 0.06),
    phaseLabel: phaseLabel(phase),
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function easeOut(value: number) {
  const normalized = clamp(value, 0, 1);
  return 1 - Math.pow(1 - normalized, 3);
}

export function easeInOut(value: number) {
  const normalized = clamp(value, 0, 1);
  return normalized < 0.5
    ? 4 * normalized * normalized * normalized
    : 1 - Math.pow(-2 * normalized + 2, 3) / 2;
}

function derivePhase(progress: number): LoopPhase {
  if (progress < ENQUEUE_END) return "enqueue";
  if (progress < POLL_END) return "poll";
  if (progress < EXECUTE_END) return "execute";
  if (progress < REPORT_END) return "report";
  return "append";
}

function serviceSnapshot(phase: LoopPhase): NodeSnapshot {
  const base = {
    key: "service",
    label: "Temporal Service",
    role: "stores history, schedules tasks",
  } as const;

  if (phase === "enqueue") {
    return {
      ...base,
      status: "scheduling",
      statusLabel: "schedule workflow task",
      active: true,
    };
  }

  if (phase === "append") {
    return {
      ...base,
      status: "storing",
      statusLabel: "append to event history",
      active: true,
    };
  }

  return {
    ...base,
    status: "idle",
    statusLabel: "waiting on the worker",
    active: false,
  };
}

function queueNodeSnapshot(phase: LoopPhase): NodeSnapshot {
  const base = {
    key: "queue",
    label: "Task Queue",
    role: "buffers tasks for workers",
  } as const;

  if (phase === "enqueue") {
    return {
      ...base,
      status: "holding",
      statusLabel: "task enqueued",
      active: true,
    };
  }

  if (phase === "poll") {
    return {
      ...base,
      status: "holding",
      statusLabel: "worker dequeues",
      active: true,
    };
  }

  return {
    ...base,
    status: "idle",
    statusLabel: "empty",
    active: false,
  };
}

function workerSnapshot(phase: LoopPhase): NodeSnapshot {
  const base = {
    key: "worker",
    label: "Worker",
    role: "polls queue, runs your code",
  } as const;

  if (phase === "poll") {
    return {
      ...base,
      status: "holding",
      statusLabel: "took the task",
      active: true,
    };
  }

  if (phase === "execute") {
    return {
      ...base,
      status: "running",
      statusLabel: "executing workflow code",
      active: true,
    };
  }

  if (phase === "report") {
    return {
      ...base,
      status: "running",
      statusLabel: "reporting commands",
      active: true,
    };
  }

  return {
    ...base,
    status: "idle",
    statusLabel: "polling the queue",
    active: false,
  };
}

function deriveQueue(phase: LoopPhase): QueueSnapshot {
  const hasTask = phase === "enqueue" || phase === "poll";
  return {
    hasTask,
    label: hasTask ? "WorkflowTask" : "no pending task",
  };
}

function derivePackets(progress: number): PacketSnapshot[] {
  return [
    packetWindow(
      progress,
      TASK_SENT_AT,
      "task",
      "service-to-queue",
      "WorkflowTask",
    ),
    packetWindow(
      progress,
      POLL_SENT_AT,
      "poll",
      "queue-to-worker",
      "poll + take",
    ),
    packetWindow(
      progress,
      REPORT_SENT_AT,
      "result",
      "worker-to-service",
      "commands + result",
    ),
  ].filter((packet): packet is PacketSnapshot => packet !== undefined);
}

function packetWindow(
  progress: number,
  start: number,
  kind: PacketKind,
  route: PacketRoute,
  label: string,
): PacketSnapshot | undefined {
  const end = start + PACKET_TRAVEL;
  if (progress < start || progress > end) return undefined;

  return {
    kind,
    route,
    progress: easeInOut((progress - start) / PACKET_TRAVEL),
    label,
  };
}

function deriveHistory(progress: number): HistoryRow[] {
  // The list starts with the events committed before this cycle, then the
  // append beat adds the cycle's new event with the newest flag set.
  const committedCount = progress < APPEND_AT ? 4 : 5;
  const rows: HistoryRow[] = [];

  for (let index = 0; index < committedCount; index += 1) {
    rows.push({
      id: index + 1,
      type: HISTORY_ORDER[index],
      newest: index === committedCount - 1 && committedCount === 5,
    });
  }

  return rows;
}

function flashAround(progress: number, center: number, radius: number) {
  const distance = Math.abs(progress - center);
  return easeOut(1 - clamp(distance / radius, 0, 1));
}

function phaseLabel(phase: LoopPhase): string {
  if (phase === "enqueue") {
    return "The Temporal Service schedules a workflow task and places it on the Task Queue. It never runs your code.";
  }

  if (phase === "poll") {
    return "A Worker polls the Task Queue and takes the workflow task off it.";
  }

  if (phase === "execute") {
    return "The Worker executes your workflow code, replaying history, and decides the next command.";
  }

  if (phase === "report") {
    return "The Worker reports the result and commands back to the Service.";
  }

  return "The Service appends a new event to the durable, append-only Event History.";
}
