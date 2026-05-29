// Model for the worker-crash explainer.
//
// One Worker crash, told as two acts whose Event Histories look OPPOSITE — which
// is the accurate, doc-grounded contrast (docs.temporal.io/workflow-execution/event):
//
//   Act 1, crash during a Workflow Task: recovery is WRITTEN to history. The
//   task times out (WorkflowTaskTimedOut), is rescheduled, and another Worker
//   replays the durable history and completes it. Every recovery step is a row.
//
//   Act 2, crash during an Activity: recovery is INVISIBLE in history. "While the
//   Activity is running and retrying, ActivityTaskScheduled is the only
//   Activity-related Event in History," and "ActivityTaskStarted is written along
//   with a terminal Event." So the crash, the start-to-close timeout, and the
//   silent retry leave no rows — only the attempt counter changes — until a
//   final ActivityTaskStarted + ActivityTaskCompleted land. The charge may have
//   run twice and history will not show it, which is why the Activity must be
//   idempotent. Rendering lives in ./render-canvas.

export type ActKind = "workflow-task" | "activity";

// idle: not started yet (the second act while the first one plays)
// scheduling: the task is queued but no Worker has picked it up
// running: a Worker is executing the first attempt
// waiting: the Worker has died; the timeout is draining toward detection
// recovering: a rescheduled Workflow Task is being replayed by another Worker
// retrying: an Activity is being silently retried, writing no new history
// publishing: the terminal Activity events are landing in history
// complete: the work finished on the recovered/retried attempt
export type ActPhase =
  | "idle"
  | "scheduling"
  | "running"
  | "waiting"
  | "recovering"
  | "retrying"
  | "publishing"
  | "complete";

export type RowTone = "neutral" | "timeout" | "success";

export type WorkerState =
  | "running"
  | "crashed"
  | "replaying"
  | "retrying"
  | "completing"
  | "resumed"
  | "done";

export type ProgressTone = "blue" | "green" | "gold";

export type EventRow = {
  seq: number;
  type: string;
  detail: string;
  tone: RowTone;
  newest: boolean;
  // A Workflow Task Started with no terminal event yet (Act 1, during the
  // crash-to-timeout gap). It is gold-dashed because the timeout is draining.
  orphaned: boolean;
  // An ActivityTaskScheduled that stays the only Activity event while the Worker
  // runs, crashes, and silently retries (Act 2). The recovery happens here with
  // no new rows — the whole point of the second act.
  pending: boolean;
};

export type FooterProgress = {
  label: string;
  value: number;
  tone: ProgressTone;
};

export type WorkerMarker = {
  glyph: string;
  label: string;
  state: WorkerState;
  // The marker rides whichever row the Worker is currently driving.
  rowSeq: number;
};

export type TimeoutMeter = {
  active: boolean;
  // 1 -> 0 as the start-to-close (or workflow task) timeout drains.
  remaining: number;
  label: string;
  rowSeq: number;
};

export type ActSnapshot = {
  kind: ActKind;
  title: string;
  tag: string;
  phase: ActPhase;
  rows: EventRow[];
  worker: WorkerMarker | null;
  timeout: TimeoutMeter;
  // Current attempt number, surfaced while a crash is being recovered (null
  // before a Worker picks the task up).
  attempt: number | null;
  // Horizontal footer motion for work that is happening without a new row
  // landing every frame: Workflow replay, Activity execution, retry, or publish.
  footerProgress: FooterProgress | null;
  footnote: string;
  showFootnote: boolean;
};

export type CrashDemoState = {
  progress: number;
  playing: boolean;
};

export type CrashSnapshot = {
  progress: number;
  playing: boolean;
  activeAct: ActKind;
  caption: string;
  workflowTask: ActSnapshot;
  activity: ActSnapshot;
};

// Act 1 plays in the front half; the back half freezes it complete while Act 2
// plays. Both end held so the final frame shows the two histories side by side.
const ACT2_START = 0.5;

// Shared local beats (0..1 within an act).
const START_1 = 0.12; // a Worker picks up the task
const CRASH_AT = 0.26; // the Worker dies mid-task
const TIMED_OUT_AT = 0.5; // the timeout fires and detects the crash
const RESCHEDULE_AT = 0.58; // Act 1 only: the task is rescheduled
const START_2 = 0.66; // the recovered/retried attempt begins
const REPLAY_DONE = 0.84; // Act 1 only: the replay cursor finishes
const COMPLETE_AT = 0.88; // the work completes

// Activity-specific beats give the invisible retry room to breathe. They do not
// change the Temporal semantics: ActivityTaskScheduled stays the only Activity
// row until the terminal publish begins.
const ACTIVITY_START_1 = 0.1;
const ACTIVITY_CRASH_AT = 0.34;
const ACTIVITY_TIMED_OUT_AT = 0.58;
const ACTIVITY_TERMINAL_AT = 0.8;
const ACTIVITY_COMPLETE_AT = 0.92;

export const REDUCED_MOTION_PROGRESS = 0.99;

type EventPlan = {
  type: string;
  detail: string;
  tone: RowTone;
  at: number;
};

const WORKFLOW_TASK_PLAN: EventPlan[] = [
  {
    type: "WorkflowExecutionStarted",
    detail: "bootstrap",
    tone: "neutral",
    at: 0,
  },
  { type: "WorkflowTaskScheduled", detail: "", tone: "neutral", at: 0.04 },
  {
    type: "WorkflowTaskStarted",
    detail: "Worker A",
    tone: "neutral",
    at: START_1,
  },
  {
    type: "WorkflowTaskTimedOut",
    detail: "task timeout",
    tone: "timeout",
    at: TIMED_OUT_AT,
  },
  {
    type: "WorkflowTaskScheduled",
    detail: "rescheduled",
    tone: "neutral",
    at: RESCHEDULE_AT,
  },
  {
    type: "WorkflowTaskStarted",
    detail: "Worker B",
    tone: "neutral",
    at: START_2,
  },
  {
    type: "WorkflowTaskCompleted",
    detail: "resumed · no loss",
    tone: "success",
    at: COMPLETE_AT,
  },
];

// Only four rows ever land: the crash and the retry write nothing to history.
const ACTIVITY_PLAN: EventPlan[] = [
  {
    type: "WorkflowTaskCompleted",
    detail: "schedules charge",
    tone: "neutral",
    at: 0,
  },
  {
    type: "ActivityTaskScheduled",
    detail: "chargeCard",
    tone: "neutral",
    at: 0.04,
  },
  {
    type: "ActivityTaskStarted",
    detail: "attempt 2",
    tone: "neutral",
    at: ACTIVITY_TERMINAL_AT,
  },
  {
    type: "ActivityTaskCompleted",
    detail: "charged $480",
    tone: "success",
    at: ACTIVITY_COMPLETE_AT,
  },
];

// The first WorkflowTaskStarted (Act 1) and the ActivityTaskScheduled (Act 2)
// are the rows a crashing Worker leaves dangling.
const WORKFLOW_GAP_SEQ = 3;
const ACTIVITY_PENDING_SEQ = 2;

export function deriveCrashSnapshot(state: CrashDemoState): CrashSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const workflowLocal = progress < ACT2_START ? progress / ACT2_START : 1;
  const activityLocal = (progress - ACT2_START) / (1 - ACT2_START);

  const workflowTask = deriveWorkflowAct(workflowLocal);
  const activity = deriveActivityAct(activityLocal);
  const activeAct: ActKind =
    progress < ACT2_START ? "workflow-task" : "activity";

  return {
    progress,
    playing: state.playing,
    activeAct,
    caption: caption(activeAct === "workflow-task" ? workflowTask : activity),
    workflowTask,
    activity,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function easeInOut(value: number) {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Act 1: every recovery step is a durable Event-History row.
function deriveWorkflowAct(local: number): ActSnapshot {
  const phase = workflowPhase(local);
  const meta = {
    kind: "workflow-task" as const,
    title: "Crash during a Workflow Task",
    tag: "Workflow Task",
    footnote: "Recovery is written to history: timeout, reschedule, replay.",
  };

  if (phase === "idle") return idleAct(meta, "task timeout");

  const rows = visibleRows(WORKFLOW_TASK_PLAN, local).map((row) => ({
    ...row,
    orphaned: row.seq === WORKFLOW_GAP_SEQ && phase === "waiting",
    pending: false,
  }));

  const onSecondWorker = phase === "recovering" || phase === "complete";
  const worker: WorkerMarker = {
    glyph: onSecondWorker ? "B" : "A",
    label: onSecondWorker ? "Worker B" : "Worker A",
    state: workflowWorkerState(phase),
    rowSeq: rows[rows.length - 1].seq,
  };

  return {
    ...meta,
    phase,
    rows,
    worker,
    timeout: workflowTimeout(local, phase),
    attempt: null,
    footerProgress: workflowFooterProgress(local, phase),
    showFootnote: phase === "complete",
  };
}

// Act 2: the crash and retry are invisible — only four rows ever land.
function deriveActivityAct(local: number): ActSnapshot {
  const phase = activityPhase(local);
  // The Worker crashes while executing an Activity Task (the dispatch unit), but
  // it is the Activity itself — the side effect — that must be idempotent.
  const meta = {
    kind: "activity" as const,
    title: "Crash during an Activity Task",
    tag: "Activity Task",
    footnote: "The retry leaves no trace, so the Activity must be idempotent.",
  };

  if (phase === "idle") return idleAct(meta, "start-to-close timeout");

  const live =
    phase === "running" || phase === "waiting" || phase === "retrying";
  const rows = visibleRows(ACTIVITY_PLAN, local).map((row) => ({
    ...row,
    orphaned: row.seq === ACTIVITY_PENDING_SEQ && phase === "waiting",
    pending: row.seq === ACTIVITY_PENDING_SEQ && live,
  }));

  const worker: WorkerMarker | null =
    phase === "scheduling"
      ? null
      : {
          glyph: "W",
          label: "Worker",
          state: activityWorkerState(phase),
          rowSeq:
            phase === "publishing" || phase === "complete"
              ? rows[rows.length - 1].seq
              : ACTIVITY_PENDING_SEQ,
        };

  const attempt =
    phase === "running" || phase === "waiting"
      ? 1
      : phase === "scheduling"
        ? null
        : 2;

  return {
    ...meta,
    phase,
    rows,
    worker,
    timeout: activityTimeout(local, phase),
    attempt,
    footerProgress: activityFooterProgress(local, phase),
    showFootnote: phase === "complete",
  };
}

function idleAct(
  meta: Pick<ActSnapshot, "kind" | "title" | "tag" | "footnote">,
  timeoutLabel: string,
): ActSnapshot {
  return {
    ...meta,
    phase: "idle",
    rows: [],
    worker: null,
    timeout: { active: false, remaining: 1, label: timeoutLabel, rowSeq: -1 },
    attempt: null,
    footerProgress: null,
    showFootnote: false,
  };
}

function visibleRows(plan: EventPlan[], local: number) {
  const visible = plan
    .map((event, index) => ({ event, seq: index + 1 }))
    .filter(({ event }) => event.at <= local);
  const lastIndex = visible.length - 1;

  return visible.map(({ event, seq }, index) => ({
    seq,
    type: event.type,
    detail: event.detail,
    tone: event.tone,
    newest: index === lastIndex,
  }));
}

function workflowPhase(local: number): ActPhase {
  if (local < 0) return "idle";
  if (local < START_1) return "scheduling";
  if (local < CRASH_AT) return "running";
  if (local < TIMED_OUT_AT) return "waiting";
  if (local < COMPLETE_AT) return "recovering";
  return "complete";
}

function activityPhase(local: number): ActPhase {
  if (local < 0) return "idle";
  if (local < ACTIVITY_START_1) return "scheduling";
  if (local < ACTIVITY_CRASH_AT) return "running";
  if (local < ACTIVITY_TIMED_OUT_AT) return "waiting";
  if (local < ACTIVITY_TERMINAL_AT) return "retrying";
  if (local < ACTIVITY_COMPLETE_AT) return "publishing";
  return "complete";
}

function workflowWorkerState(phase: ActPhase): WorkerState {
  if (phase === "running") return "running";
  if (phase === "waiting") return "crashed";
  if (phase === "recovering") return "replaying";
  return "resumed";
}

function activityWorkerState(phase: ActPhase): WorkerState {
  if (phase === "running") return "running";
  if (phase === "waiting") return "crashed";
  if (phase === "retrying") return "retrying";
  if (phase === "publishing") return "completing";
  return "done";
}

function workflowTimeout(local: number, phase: ActPhase): TimeoutMeter {
  return drainTimeout(local, phase, WORKFLOW_GAP_SEQ, "task timeout");
}

function activityTimeout(local: number, phase: ActPhase): TimeoutMeter {
  return drainTimeout(
    local,
    phase,
    ACTIVITY_PENDING_SEQ,
    "start-to-close timeout",
    ACTIVITY_CRASH_AT,
    ACTIVITY_TIMED_OUT_AT,
  );
}

function drainTimeout(
  local: number,
  phase: ActPhase,
  rowSeq: number,
  label: string,
  crashAt = CRASH_AT,
  timedOutAt = TIMED_OUT_AT,
): TimeoutMeter {
  if (phase !== "waiting") {
    return {
      active: false,
      remaining: phase === "running" ? 1 : 0,
      label,
      rowSeq,
    };
  }
  const drained = (local - crashAt) / (timedOutAt - crashAt);
  return { active: true, remaining: 1 - easeInOut(drained), label, rowSeq };
}

function activityAttemptProgress(
  local: number,
  phase: ActPhase,
): number | null {
  if (phase === "running") {
    return easeInOut(
      (local - ACTIVITY_START_1) / (ACTIVITY_CRASH_AT - ACTIVITY_START_1),
    );
  }
  if (phase === "retrying") {
    return easeInOut(
      (local - ACTIVITY_TIMED_OUT_AT) /
        (ACTIVITY_TERMINAL_AT - ACTIVITY_TIMED_OUT_AT),
    );
  }
  if (phase === "publishing") {
    return easeInOut(
      (local - ACTIVITY_TERMINAL_AT) /
        (ACTIVITY_COMPLETE_AT - ACTIVITY_TERMINAL_AT),
    );
  }
  return null;
}

function workflowFooterProgress(
  local: number,
  phase: ActPhase,
): FooterProgress | null {
  if (phase !== "recovering" || local < START_2 || local >= COMPLETE_AT) {
    return null;
  }

  return {
    label: "Worker B replaying Event History",
    value: easeInOut((local - START_2) / (COMPLETE_AT - START_2)),
    tone: "green",
  };
}

function activityFooterProgress(
  local: number,
  phase: ActPhase,
): FooterProgress | null {
  const value = activityAttemptProgress(local, phase);
  if (value === null) return null;

  if (phase === "running") {
    return {
      label: "attempt 1 started — not recorded yet",
      value,
      tone: "gold",
    };
  }

  if (phase === "retrying") {
    return {
      label: "attempt 2 retrying — no new events",
      value,
      tone: "blue",
    };
  }

  return {
    label: "terminal events landing in history",
    value,
    tone: "green",
  };
}

function caption(act: ActSnapshot): string {
  const lines: Record<ActPhase, string> =
    act.kind === "workflow-task"
      ? {
          idle: "",
          scheduling: "A Workflow Task is scheduled and Worker A picks it up.",
          running: "Worker A is executing the Workflow Task.",
          waiting:
            "Worker A died. The task times out — and that timeout is written to history as WorkflowTaskTimedOut.",
          recovering:
            "The task is rescheduled and another Worker replays the durable history — every recovery step is a row.",
          retrying: "",
          publishing: "",
          complete:
            "The Workflow Task finished on a second Worker, with the whole recovery visible in Event History.",
        }
      : {
          idle: "",
          scheduling:
            "A completed Workflow Task schedules the chargeCard Activity Task.",
          running:
            "A Worker started attempt 1 of the Activity Task — a real side effect runs — but no ActivityTaskStarted is recorded yet.",
          waiting:
            "The Worker started attempt 1, then crashed mid-charge. The start-to-close timeout fires — and none of this reaches Event History.",
          retrying:
            "Temporal dispatches a fresh Activity Task for attempt 2. ActivityTaskScheduled stays the only recorded Activity event — the retry leaves no trace.",
          publishing:
            "The terminal publish begins: ActivityTaskStarted appears for the successful attempt, with ActivityTaskCompleted following as the terminal event.",
          recovering: "",
          complete:
            "Only now do ActivityTaskStarted and ActivityTaskCompleted land, recording the final attempt. History never showed the first charge, so the Activity must be idempotent.",
        };

  return lines[act.phase];
}
