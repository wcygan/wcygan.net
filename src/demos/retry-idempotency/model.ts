export type TrackKey = "naive" | "guarded";

export type RetryPhase = "send" | "crash" | "retry" | "resolve";

export type WorkerStatus =
  | "sending"
  | "sent"
  | "crashed"
  | "retrying"
  | "resent"
  | "skipped";

export type TrackOutcome = "pending" | "duplicate" | "exactly-once";

export type Outcome = {
  tone: "neutral" | "success" | "duplicate";
  label: string;
};

export type TrackSnapshot = {
  key: TrackKey;
  title: string;
  guardLabel: string;
  status: WorkerStatus;
  statusLabel: string;
  emailsSent: 0 | 1 | 2;
  counterFlash: number;
  crashFlash: number;
  outcome: TrackOutcome;
  outcomeLabel: string;
};

export type RetryDemoState = {
  progress: number;
  playing: boolean;
};

export type RetrySnapshot = {
  progress: number;
  playing: boolean;
  phase: RetryPhase;
  tracks: Record<TrackKey, TrackSnapshot>;
  phaseLabel: string;
};

const SEND_END = 0.28;
const CRASH_END = 0.5;
const RETRY_END = 0.72;

// The side effect (the email send) lands a beat before its phase boundary so
// the counter visibly ticks while the phase chip is still "send" / "retry".
const SEND_APPLY_AT = 0.18;
const CRASH_AT = 0.4;
const RESOLVE_APPLY_AT = 0.86;

export const REDUCED_MOTION_PROGRESS = 0.94;

export function deriveRetrySnapshot(state: RetryDemoState): RetrySnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);

  return {
    progress,
    playing: state.playing,
    phase,
    tracks: {
      naive: trackSnapshot("naive", progress),
      guarded: trackSnapshot("guarded", progress),
    },
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

function derivePhase(progress: number): RetryPhase {
  if (progress < SEND_END) return "send";
  if (progress < CRASH_END) return "crash";
  if (progress < RETRY_END) return "retry";
  return "resolve";
}

function trackSnapshot(key: TrackKey, progress: number): TrackSnapshot {
  const isGuarded = key === "guarded";
  const base = {
    key,
    title: isGuarded ? "Idempotency key abc-123" : "No idempotency key",
    guardLabel: isGuarded ? "sendEmail() if !done(abc-123)" : "sendEmail()",
  } as const;

  const counterFlash = Math.max(
    flashAround(progress, SEND_APPLY_AT, 0.05),
    !isGuarded ? flashAround(progress, RESOLVE_APPLY_AT, 0.05) : 0,
  );
  const crashFlash = flashAround(progress, CRASH_AT, 0.06);

  // Phase: send — the Activity runs the side effect, counter ticks to 1.
  if (progress < SEND_END) {
    const sent = progress >= SEND_APPLY_AT;
    return {
      ...base,
      status: sent ? "sent" : "sending",
      statusLabel: sent ? "email sent (1)" : "running sendEmail",
      emailsSent: sent ? 1 : 0,
      counterFlash,
      crashFlash,
      outcome: "pending",
      outcomeLabel: "in progress",
    };
  }

  // Phase: crash — completion is never recorded; one email already went out.
  if (progress < CRASH_END) {
    return {
      ...base,
      status: "crashed",
      statusLabel: "crash before ack",
      emailsSent: 1,
      counterFlash,
      crashFlash,
      outcome: "pending",
      outcomeLabel: "completion not recorded",
    };
  }

  // Phase: retry — Temporal reruns the same Activity code.
  if (progress < RETRY_END) {
    return {
      ...base,
      status: "retrying",
      statusLabel: isGuarded ? "retry checks abc-123" : "retry runs the code",
      emailsSent: 1,
      counterFlash,
      crashFlash,
      outcome: "pending",
      outcomeLabel: "replaying activity",
    };
  }

  // Phase: resolve — the divergence. Naive resends, guarded skips.
  if (isGuarded) {
    return {
      ...base,
      status: "skipped",
      statusLabel: "already done, skip send",
      emailsSent: 1,
      counterFlash,
      crashFlash,
      outcome: "exactly-once",
      outcomeLabel: "emails sent: 1",
    };
  }

  const resent = progress >= RESOLVE_APPLY_AT;
  return {
    ...base,
    status: resent ? "resent" : "retrying",
    statusLabel: resent ? "sends the email again" : "no guard, resends",
    emailsSent: resent ? 2 : 1,
    counterFlash,
    crashFlash,
    outcome: resent ? "duplicate" : "pending",
    outcomeLabel: resent ? "emails sent: 2" : "about to resend",
  };
}

function flashAround(progress: number, center: number, radius: number) {
  const distance = Math.abs(progress - center);
  return easeOut(1 - clamp(distance / radius, 0, 1));
}

function phaseLabel(phase: RetryPhase, progress: number) {
  if (phase === "send") {
    if (progress < SEND_APPLY_AT) {
      return "Both tracks run the same sendEmail Activity for the first time.";
    }
    return "Each Activity sends the email, so both counters tick to one.";
  }

  if (phase === "crash") {
    return "The Worker crashes before the completion is recorded, so durable state never learns the email went out.";
  }

  if (phase === "retry") {
    return "Temporal retries the Activity and runs the exact same code again.";
  }

  return "The naive retry resends and duplicates the email; the idempotency key sees the work is already done and skips the send.";
}
