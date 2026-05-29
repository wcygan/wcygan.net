export type TrackKey = "task" | "activity";

export type CrashPhase = "running" | "crash" | "recover-1" | "recover-2";

export type TaskStatus = "processing" | "crashed" | "replaying" | "resumed";

export type ActivityStatus = "running" | "crashed" | "timing-out" | "retrying";

export type WorkerTone = "blue" | "red" | "gold" | "green" | "idle";

export type TaskTrackSnapshot = {
  key: "task";
  title: string;
  workerALabel: "Worker A";
  workerBLabel: "Worker B";
  status: TaskStatus;
  statusLabel: string;
  workerATone: WorkerTone;
  workerBTone: WorkerTone;
  // 0..1 how far Worker B's replay cursor has scanned the history strip
  replayProgress: number;
  outcomeLabel: string;
};

export type ActivityTrackSnapshot = {
  key: "activity";
  title: string;
  workerLabel: "Worker";
  status: ActivityStatus;
  statusLabel: string;
  workerTone: WorkerTone;
  attempt: 1 | 2;
  // 0..1 remaining fraction of the start-to-close timeout countdown
  timeoutRemaining: number;
  timeoutActive: boolean;
  outcomeLabel: string;
};

export type CrashDemoState = {
  progress: number;
  playing: boolean;
};

export type CrashSnapshot = {
  progress: number;
  playing: boolean;
  phase: CrashPhase;
  // shared crash beat intensity for both tracks, 0..1
  crashFlash: number;
  task: TaskTrackSnapshot;
  activity: ActivityTrackSnapshot;
  phaseLabel: string;
};

const RUNNING_END = 0.26;
const CRASH_END = 0.46;
const RECOVER_1_END = 0.72;

// Both tracks crash at the same shared beat.
const CRASH_BEAT = 0.36;
const REPLAY_START = 0.46;
const REPLAY_DONE = 0.72;
const RESUME_AT = 0.78;
const TIMEOUT_START = 0.46;
const TIMEOUT_DONE = 0.72;
const RETRY_AT = 0.78;

export const REDUCED_MOTION_PROGRESS = 0.9;

export function deriveCrashSnapshot(state: CrashDemoState): CrashSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);

  return {
    progress,
    playing: state.playing,
    phase,
    crashFlash: flashAround(progress, CRASH_BEAT, 0.06),
    task: deriveTaskTrack(progress, phase),
    activity: deriveActivityTrack(progress, phase),
    phaseLabel: phaseLabel(phase, progress),
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

function derivePhase(progress: number): CrashPhase {
  if (progress < RUNNING_END) return "running";
  if (progress < CRASH_END) return "crash";
  if (progress < RECOVER_1_END) return "recover-1";
  return "recover-2";
}

function deriveTaskTrack(
  progress: number,
  phase: CrashPhase,
): TaskTrackSnapshot {
  const base = {
    key: "task",
    title: "Crash during a Workflow Task",
    workerALabel: "Worker A",
    workerBLabel: "Worker B",
  } as const;

  if (phase === "running") {
    return {
      ...base,
      status: "processing",
      statusLabel: "Worker A processes the Workflow Task",
      workerATone: "blue",
      workerBTone: "idle",
      replayProgress: 0,
      outcomeLabel: "advancing Event History",
    };
  }

  if (phase === "crash") {
    return {
      ...base,
      status: "crashed",
      statusLabel: "Worker A dies mid-task",
      workerATone: "red",
      workerBTone: "idle",
      replayProgress: 0,
      outcomeLabel: "progress is safe in history",
    };
  }

  if (phase === "recover-1") {
    return {
      ...base,
      status: "replaying",
      statusLabel: "Worker B replays the Event History",
      workerATone: "red",
      workerBTone: "green",
      replayProgress: easeInOut(
        clamp((progress - REPLAY_START) / (REPLAY_DONE - REPLAY_START), 0, 1),
      ),
      outcomeLabel: "reading durable events",
    };
  }

  return {
    ...base,
    status: "resumed",
    statusLabel: "Worker B resumes from the exact same point",
    workerATone: "red",
    workerBTone: "green",
    replayProgress: 1,
    outcomeLabel: progress >= RESUME_AT ? "no data loss" : "rebuilding state",
  };
}

function deriveActivityTrack(
  progress: number,
  phase: CrashPhase,
): ActivityTrackSnapshot {
  const base = {
    key: "activity",
    title: "Crash during an Activity",
    workerLabel: "Worker",
  } as const;

  if (phase === "running") {
    return {
      ...base,
      status: "running",
      statusLabel: "Worker runs an Activity (a side effect)",
      workerTone: "blue",
      attempt: 1,
      timeoutRemaining: 1,
      timeoutActive: false,
      outcomeLabel: "calling external system",
    };
  }

  if (phase === "crash") {
    return {
      ...base,
      status: "crashed",
      statusLabel: "Worker dies mid-Activity",
      workerTone: "red",
      attempt: 1,
      timeoutRemaining: 1,
      timeoutActive: false,
      outcomeLabel: "did the side effect happen?",
    };
  }

  if (phase === "recover-1") {
    const elapsed = clamp(
      (progress - TIMEOUT_START) / (TIMEOUT_DONE - TIMEOUT_START),
      0,
      1,
    );
    return {
      ...base,
      status: "timing-out",
      statusLabel: "Temporal waits for the start-to-close timeout",
      workerTone: "gold",
      attempt: 1,
      timeoutRemaining: 1 - easeInOut(elapsed),
      timeoutActive: true,
      outcomeLabel: "outcome unobservable",
    };
  }

  return {
    ...base,
    status: "retrying",
    statusLabel: "Retry policy starts a fresh Activity attempt",
    workerTone: "blue",
    attempt: 2,
    timeoutRemaining: 0,
    timeoutActive: false,
    outcomeLabel:
      progress >= RETRY_AT ? "attempt 2 running" : "scheduling retry",
  };
}

function flashAround(progress: number, center: number, radius: number) {
  const distance = Math.abs(progress - center);
  return easeOut(1 - clamp(distance / radius, 0, 1));
}

function phaseLabel(phase: CrashPhase, progress: number) {
  if (phase === "running") {
    return "Both Workers are healthy: one drives a Workflow Task, the other runs an Activity.";
  }

  if (phase === "crash") {
    return "Both Workers crash on the same beat, but what they were doing decides what happens next.";
  }

  if (phase === "recover-1") {
    return "The Workflow Task is recoverable from durable Event History; the Activity's side effect is not, so Temporal must wait out the start-to-close timeout.";
  }

  if (progress < RESUME_AT) {
    return "Worker B finishes replaying history while the Activity's retry is scheduled.";
  }

  return "Top: clean recovery, no data loss. Bottom: the Activity retries because its external side effect was unobservable.";
}
