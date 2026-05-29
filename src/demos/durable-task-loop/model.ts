export type NodeKey = "service" | "queue" | "worker";

export type ServiceStatus = "idle" | "scheduling" | "storing";

// The Worker walks one activity through these stages. A failed attempt backs off
// and retries in place; once the queue is empty the loop settles on "complete".
export type WorkerPhase =
  | "polling"
  | "taking"
  | "executing"
  | "resolved"
  | "backoff"
  | "reporting"
  | "complete";

export type TaskOutcome = "success" | "failure";

export type PacketKind = "enqueue" | "poll" | "result";

export type PacketRoute =
  | "service-to-queue"
  | "queue-to-worker"
  | "worker-to-service";

// A failure result travels back tinted as an error rather than a normal result.
export type PacketTone = "default" | "success" | "error";

// The loop opens with the canonical workflow-task bootstrap (the workflow code
// ran once and scheduled its activities), then records the activity-task
// lifecycle the Worker actually drives. Activities — not Workflow Tasks — are
// the unit that queues as a backlog, runs real work, and can fail and retry.
export type HistoryEventType =
  | "WorkflowExecutionStarted"
  | "WorkflowTaskScheduled"
  | "WorkflowTaskStarted"
  | "WorkflowTaskCompleted"
  | "ActivityTaskScheduled"
  | "ActivityTaskStarted"
  | "ActivityTaskCompleted"
  | "ActivityTaskFailed";

export type HistoryTone = "neutral" | "success" | "failure";

export type HistoryRow = {
  id: number;
  type: HistoryEventType;
  tone: HistoryTone;
  newest: boolean;
};

export type SlotSnapshot = {
  filled: boolean;
  flash: number;
};

export type ServiceSnapshot = {
  status: ServiceStatus;
  statusLabel: string;
  active: boolean;
};

export type QueueSnapshot = {
  level: number;
  capacity: number;
  slots: SlotSnapshot[];
  label: string;
};

export type WorkerSnapshot = {
  phase: WorkerPhase;
  outcome: TaskOutcome | null;
  ringProgress: number;
  showRing: boolean;
  statusLabel: string;
  taskLabel: string;
};

export type PacketSnapshot = {
  kind: PacketKind;
  route: PacketRoute;
  progress: number;
  label: string;
  tone: PacketTone;
};

export type DurableTaskLoopState = {
  progress: number;
  playing: boolean;
};

export type DurableTaskLoopSnapshot = {
  progress: number;
  playing: boolean;
  service: ServiceSnapshot;
  queue: QueueSnapshot;
  worker: WorkerSnapshot;
  packets: PacketSnapshot[];
  history: HistoryRow[];
  historyFlash: number;
  phaseLabel: string;
};

const CAPACITY = 4;
// The queue starts empty; the completed workflow task schedules every activity
// at the start of the loop, so the buffer fills and then drains back to zero.
const ENQUEUE_AT = [0.02, 0.04, 0.06];

const PACKET_TRAVEL = 0.03;
// How long a ring takes to fill 0..100% on a single attempt.
const WORK_SPAN = 0.1;
// A failing attempt trips at this fraction of the ring instead of completing.
const FAIL_FRACTION = 0.55;
// How long the resolved check/cross holds before the Worker reports it.
const OUTCOME_HOLD = 0.025;
// Retry backoff the Worker waits out before a failed activity runs again.
const RETRY_BACKOFF = 0.06;
const FLASH_RADIUS = 0.05;

export const REDUCED_MOTION_PROGRESS = 0.95;

type CycleOutcome = "success" | "retry";

type CyclePlan = {
  index: number;
  outcome: CycleOutcome;
  takeAt: number;
};

type CycleTimes = CyclePlan & {
  execStart: number;
  // Successful attempt: the ring fills to 100% at doneAt.
  doneAt: number;
  reportStart: number;
  appendAt: number;
  endAt: number;
  // Retry-only beats (the first attempt fails, then a second attempt succeeds).
  failAt?: number;
  failAppendAt?: number;
  backoffEnd?: number;
  retryDoneAt?: number;
};

// Three activities run per loop, drained in order until the queue is empty. The
// middle one fails its first attempt; Temporal retries it after a backoff and it
// completes, so every activity ends successful — Success, Retry->Success, Success.
const CYCLES: CycleTimes[] = (
  [
    { index: 1, outcome: "success", takeAt: 0.1 },
    { index: 2, outcome: "retry", takeAt: 0.34 },
    { index: 3, outcome: "success", takeAt: 0.7 },
  ] satisfies CyclePlan[]
).map(cycleTimes);

const ALL_COMPLETE_AT = CYCLES[CYCLES.length - 1].appendAt;

function cycleTimes(plan: CyclePlan): CycleTimes {
  const execStart = plan.takeAt + PACKET_TRAVEL;

  if (plan.outcome === "success") {
    const doneAt = execStart + WORK_SPAN;
    const reportStart = doneAt + OUTCOME_HOLD;
    const appendAt = reportStart + PACKET_TRAVEL;
    return {
      ...plan,
      execStart,
      doneAt,
      reportStart,
      appendAt,
      endAt: appendAt,
    };
  }

  // Retry: ring fills to FAIL_FRACTION then trips, the failure is reported and
  // recorded, the Worker waits out a backoff, then a fresh attempt fills to 100%.
  const failAt = execStart + WORK_SPAN * FAIL_FRACTION;
  const failAppendAt = failAt + PACKET_TRAVEL;
  const backoffEnd = failAppendAt + RETRY_BACKOFF;
  const retryDoneAt = backoffEnd + WORK_SPAN;
  const reportStart = retryDoneAt + OUTCOME_HOLD;
  const appendAt = reportStart + PACKET_TRAVEL;
  return {
    ...plan,
    execStart,
    doneAt: retryDoneAt,
    reportStart,
    appendAt,
    endAt: appendAt,
    failAt,
    failAppendAt,
    backoffEnd,
    retryDoneAt,
  };
}

type HistoryPlan = { at: number; type: HistoryEventType; tone: HistoryTone };

// The history opens with the workflow-task bootstrap that scheduled the work,
// then interleaves the Service scheduling activity tasks with each activity's
// Started -> Completed/Failed lifecycle (including the retry's second attempt).
const HISTORY_TIMELINE: HistoryPlan[] = buildHistoryTimeline();

function buildHistoryTimeline(): HistoryPlan[] {
  const timeline: HistoryPlan[] = [
    { at: 0, type: "WorkflowExecutionStarted", tone: "neutral" },
    { at: 0, type: "WorkflowTaskScheduled", tone: "neutral" },
    { at: 0, type: "WorkflowTaskStarted", tone: "neutral" },
    { at: 0, type: "WorkflowTaskCompleted", tone: "neutral" },
  ];

  for (const at of ENQUEUE_AT) {
    timeline.push({ at, type: "ActivityTaskScheduled", tone: "neutral" });
  }

  for (const cycle of CYCLES) {
    timeline.push({
      at: cycle.takeAt,
      type: "ActivityTaskStarted",
      tone: "neutral",
    });

    if (cycle.outcome === "retry") {
      timeline.push({
        at: cycle.failAppendAt!,
        type: "ActivityTaskFailed",
        tone: "failure",
      });
      // The retried attempt starts after the backoff, then completes.
      timeline.push({
        at: cycle.backoffEnd!,
        type: "ActivityTaskStarted",
        tone: "neutral",
      });
    }

    timeline.push({
      at: cycle.appendAt,
      type: "ActivityTaskCompleted",
      tone: "success",
    });
  }

  // Enqueue and cycle beats interleave in time, so order the log chronologically
  // (a stable sort keeps the four bootstrap events in their canonical order).
  return timeline.sort((a, b) => a.at - b.at);
}

export function deriveDurableTaskLoopSnapshot(
  state: DurableTaskLoopState,
): DurableTaskLoopSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const worker = deriveWorker(progress);
  const queue = deriveQueue(progress);

  return {
    progress,
    playing: state.playing,
    service: deriveService(progress),
    queue,
    worker,
    packets: derivePackets(progress),
    history: deriveHistory(progress),
    historyFlash: deriveHistoryFlash(progress),
    phaseLabel: phaseLabel(worker, queue),
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

function activeCycle(progress: number): CycleTimes | undefined {
  return CYCLES.find(
    (cycle) => progress >= cycle.takeAt && progress < cycle.endAt,
  );
}

function deriveWorker(progress: number): WorkerSnapshot {
  const cycle = activeCycle(progress);
  if (!cycle) return idleWorker(progress);

  const taskLabel = `activity #${cycle.index}`;
  return cycle.outcome === "retry"
    ? retryWorker(progress, cycle, taskLabel)
    : successWorker(progress, cycle, taskLabel);
}

// Between cycles the Worker polls; once the last activity is recorded and the
// queue is empty, it settles on the completed state until the loop restarts.
function idleWorker(progress: number): WorkerSnapshot {
  if (progress >= ALL_COMPLETE_AT) {
    return {
      phase: "complete",
      outcome: "success",
      ringProgress: 1,
      showRing: true,
      statusLabel: "all activities complete",
      taskLabel: "",
    };
  }

  return {
    phase: "polling",
    outcome: null,
    ringProgress: 0,
    showRing: false,
    statusLabel: "polling the queue",
    taskLabel: "idle",
  };
}

function successWorker(
  progress: number,
  cycle: CycleTimes,
  taskLabel: string,
): WorkerSnapshot {
  if (progress < cycle.execStart) {
    return takingWorker(taskLabel);
  }

  if (progress < cycle.doneAt) {
    return executingWorker(
      progress,
      cycle.execStart,
      taskLabel,
      `running ${taskLabel}`,
    );
  }

  if (progress < cycle.reportStart) {
    return resolvedSuccess(taskLabel);
  }

  return reportingWorker(taskLabel);
}

function retryWorker(
  progress: number,
  cycle: CycleTimes,
  taskLabel: string,
): WorkerSnapshot {
  const failAt = cycle.failAt!;
  const failAppendAt = cycle.failAppendAt!;
  const backoffEnd = cycle.backoffEnd!;

  if (progress < cycle.execStart) {
    return takingWorker(taskLabel);
  }

  if (progress < failAt) {
    return executingWorker(
      progress,
      cycle.execStart,
      taskLabel,
      `running ${taskLabel}`,
    );
  }

  // First attempt failed: show the cross, report it, then wait out the backoff.
  if (progress < backoffEnd) {
    return {
      phase: progress < failAppendAt ? "resolved" : "backoff",
      outcome: "failure",
      ringProgress: FAIL_FRACTION,
      showRing: true,
      statusLabel:
        progress < failAppendAt
          ? `${taskLabel} failed`
          : `retrying ${taskLabel} after backoff`,
      taskLabel,
    };
  }

  if (progress < cycle.retryDoneAt!) {
    return executingWorker(
      progress,
      backoffEnd,
      taskLabel,
      `retrying ${taskLabel}`,
    );
  }

  if (progress < cycle.reportStart) {
    return resolvedSuccess(taskLabel);
  }

  return reportingWorker(taskLabel);
}

function takingWorker(taskLabel: string): WorkerSnapshot {
  return {
    phase: "taking",
    outcome: null,
    ringProgress: 0,
    showRing: false,
    statusLabel: `took ${taskLabel}`,
    taskLabel,
  };
}

function executingWorker(
  progress: number,
  fillStart: number,
  taskLabel: string,
  statusLabel: string,
): WorkerSnapshot {
  const local = WORK_SPAN > 0 ? (progress - fillStart) / WORK_SPAN : 1;
  return {
    phase: "executing",
    outcome: null,
    ringProgress: clamp(local, 0, 1),
    showRing: true,
    statusLabel,
    taskLabel,
  };
}

function resolvedSuccess(taskLabel: string): WorkerSnapshot {
  return {
    phase: "resolved",
    outcome: "success",
    ringProgress: 1,
    showRing: true,
    statusLabel: `${taskLabel} completed`,
    taskLabel,
  };
}

function reportingWorker(taskLabel: string): WorkerSnapshot {
  return {
    phase: "reporting",
    outcome: "success",
    ringProgress: 1,
    showRing: true,
    statusLabel: "reporting result",
    taskLabel,
  };
}

function deriveQueue(progress: number): QueueSnapshot {
  const enqueued = ENQUEUE_AT.filter((at) => progress >= at).length;
  const taken = CYCLES.filter((cycle) => progress >= cycle.takeAt).length;
  const level = clamp(enqueued - taken, 0, CAPACITY);

  const enqueueFlash = ENQUEUE_AT.reduce(
    (max, at) => Math.max(max, flashAround(progress, at, FLASH_RADIUS)),
    0,
  );

  const slots: SlotSnapshot[] = [];
  for (let index = 0; index < CAPACITY; index += 1) {
    const filled = index < level;
    // The rightmost filled slot pops when a freshly scheduled task lands.
    const flash = filled && index === level - 1 ? enqueueFlash : 0;
    slots.push({ filled, flash });
  }

  return {
    level,
    capacity: CAPACITY,
    slots,
    label: level === 0 ? "no pending tasks" : `${level} pending`,
  };
}

// The Service is storing whenever a reported result is being recorded — the
// success report of any cycle, plus the failure report of the retry cycle.
function storeWindows(): { start: number; end: number }[] {
  const windows: { start: number; end: number }[] = [];
  for (const cycle of CYCLES) {
    windows.push({
      start: cycle.reportStart,
      end: cycle.appendAt + FLASH_RADIUS,
    });
    if (cycle.outcome === "retry") {
      windows.push({
        start: cycle.failAt!,
        end: cycle.failAppendAt! + FLASH_RADIUS,
      });
    }
  }
  return windows;
}

const STORE_WINDOWS = storeWindows();

function deriveService(progress: number): ServiceSnapshot {
  const storing = STORE_WINDOWS.some(
    (window) => progress >= window.start && progress <= window.end,
  );
  if (storing) {
    return {
      status: "storing",
      statusLabel: "append to event history",
      active: true,
    };
  }

  const scheduling = ENQUEUE_AT.some(
    (at) => progress >= at && progress <= at + PACKET_TRAVEL,
  );
  if (scheduling) {
    return {
      status: "scheduling",
      statusLabel: "schedule activity task",
      active: true,
    };
  }

  return {
    status: "idle",
    statusLabel: "holds durable state",
    active: false,
  };
}

function derivePackets(progress: number): PacketSnapshot[] {
  const packets: (PacketSnapshot | undefined)[] = [];

  for (const at of ENQUEUE_AT) {
    packets.push(
      packetWindow(
        progress,
        at,
        "enqueue",
        "service-to-queue",
        "activity task",
      ),
    );
  }

  for (const cycle of CYCLES) {
    packets.push(
      packetWindow(progress, cycle.takeAt, "poll", "queue-to-worker", "poll"),
    );

    if (cycle.outcome === "retry") {
      packets.push(
        packetWindow(
          progress,
          cycle.failAt!,
          "result",
          "worker-to-service",
          "failed",
          "error",
        ),
      );
    }

    packets.push(
      packetWindow(
        progress,
        cycle.reportStart,
        "result",
        "worker-to-service",
        "completed",
        "success",
      ),
    );
  }

  return packets.filter(
    (packet): packet is PacketSnapshot => packet !== undefined,
  );
}

function packetWindow(
  progress: number,
  start: number,
  kind: PacketKind,
  route: PacketRoute,
  label: string,
  tone: PacketTone = "default",
): PacketSnapshot | undefined {
  const end = start + PACKET_TRAVEL;
  if (progress < start || progress > end) return undefined;

  return {
    kind,
    route,
    progress: easeInOut((progress - start) / PACKET_TRAVEL),
    label,
    tone,
  };
}

function deriveHistory(progress: number): HistoryRow[] {
  const visible = HISTORY_TIMELINE.filter((event) => event.at <= progress);

  // The newest row is the last event appended during this loop (not one of the
  // bootstrap events committed at the start).
  let newestIndex = -1;
  for (let index = 0; index < visible.length; index += 1) {
    if (visible[index].at > 0) newestIndex = index;
  }

  return visible.map((event, index) => ({
    id: index + 1,
    type: event.type,
    tone: event.tone,
    newest: index === newestIndex,
  }));
}

function deriveHistoryFlash(progress: number): number {
  const appended = HISTORY_TIMELINE.filter(
    (event) => event.at > 0 && event.at <= progress,
  );
  if (appended.length === 0) return 0;

  const last = appended[appended.length - 1];
  return flashAround(progress, last.at, FLASH_RADIUS);
}

function flashAround(progress: number, center: number, radius: number) {
  const distance = Math.abs(progress - center);
  return easeOut(1 - clamp(distance / radius, 0, 1));
}

function phaseLabel(worker: WorkerSnapshot, queue: QueueSnapshot): string {
  if (worker.phase === "complete") {
    return "Every activity task has been drained from the queue and completed. The Event History holds the full durable record.";
  }

  if (worker.phase === "polling") {
    return queue.level > 0
      ? `The Worker polls the Task Queue while ${queue.level} activity task${queue.level === 1 ? "" : "s"} sit pending in it.`
      : "The Worker polls the Task Queue, waiting for the Service to schedule activity tasks.";
  }

  if (worker.phase === "taking") {
    return "The Worker takes the next activity task off the queue and starts running it.";
  }

  if (worker.phase === "executing") {
    return `The Worker runs ${worker.taskLabel}; this is real work, so it can take time and may fail.`;
  }

  if (worker.phase === "backoff") {
    return `${worker.taskLabel} failed its first attempt. Temporal waits out a retry backoff before running it again.`;
  }

  if (worker.phase === "resolved") {
    return worker.outcome === "success"
      ? `${worker.taskLabel} finished its work successfully.`
      : `${worker.taskLabel} failed. Temporal will retry it rather than lose the work.`;
  }

  return worker.outcome === "success"
    ? "The Worker reports success and the Service appends ActivityTaskCompleted to the durable history."
    : "The Worker reports the failure and the Service appends ActivityTaskFailed to the durable history.";
}
