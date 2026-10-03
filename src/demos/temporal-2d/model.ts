/** Bounded teaching models. These do not connect to a Temporal Service. */
export type StepState = "pending" | "active" | "complete" | "failed";

export function boundStep(step: number, last: number) {
  return Math.min(
    last,
    Math.max(0, Math.floor(Number.isFinite(step) ? step : 0)),
  );
}

export const RECOVERY_LAST_STEP = 5;
/** Both paths have already recorded successful external operations before the crash. */
export function recoverySnapshot(input: number) {
  const step = boundStep(input, RECOVERY_LAST_STEP);
  const completedEffects = step >= 2 ? 2 : step >= 1 ? 1 : 0;
  const crashed = step === 3;
  const restarted = step >= 4;
  const durableResults = completedEffects;
  const fragileMemory = step >= 3 ? 0 : completedEffects;
  const titles = [
    "An order begins",
    "Inventory reserved",
    "Payment completed",
    "Both Workers crash",
    "Replacement Workers start",
    "Durable execution continues",
  ];
  const details = [
    "Compare a process whose progress lives only in memory with one whose completed results are recorded durably.",
    "Both Workers know reservation-7. Temporal also records the completed Activity result.",
    "Both Workers know charge-1. The durable path has two recorded Activity results before the crash.",
    "Worker memory disappears. External effects still exist; the durable recorded results survive.",
    "The fragile process lost its progress. The durable process can continue from recorded results.",
    "The durable Workflow can provision the order using the recorded reservation and charge; no repeat of those completed Activities is needed.",
  ];
  return {
    step,
    completedEffects,
    crashed,
    restarted,
    fragileMemory,
    durableResults,
    durableProvisioned: step === 5,
    title: titles[step],
    detail: details[step],
  };
}

export const ORDER_ACTIVITIES = [
  {
    name: "Reserve inventory",
    effect: "Stock service",
    result: "reservation-7",
  },
  { name: "Charge payment", effect: "Payment provider", result: "charge-1" },
  {
    name: "Provision subscription",
    effect: "Account service",
    result: "subscription-9",
  },
  { name: "Send confirmation", effect: "Email provider", result: "message-3" },
] as const;

export function workflowSnapshot(input: number) {
  const step = boundStep(input, ORDER_ACTIVITIES.length * 2);
  const completed = Math.floor(step / 2);
  const activities = ORDER_ACTIVITIES.map((activity, index) => ({
    ...activity,
    state: (index < completed
      ? "complete"
      : step === index * 2 + 1
        ? "active"
        : "pending") as StepState,
    recordedResult: index < completed ? activity.result : null,
  }));
  const active = activities.find((activity) => activity.state === "active");
  return {
    step,
    complete: completed === ORDER_ACTIVITIES.length,
    completed,
    activities,
    title:
      step === 0
        ? "Workflow ready"
        : active
          ? `Run: ${active.name}`
          : completed === ORDER_ACTIVITIES.length
            ? "Order fulfilled"
            : `${activities[completed - 1].name}: result recorded`,
    detail:
      step === 0
        ? "Workflow code chooses the order. Activities perform the external operations."
        : active
          ? `A Worker executes Activity code against the ${active.effect.toLowerCase()}.`
          : completed === ORDER_ACTIVITIES.length
            ? "Four Activity results are recorded. The Workflow can finish."
            : "The Service records the result; Workflow code can choose the next step.",
  };
}

export interface PaymentLedger {
  charges: readonly string[];
  keys: Readonly<Record<string, string>>;
}

export function acceptCharge(ledger: PaymentLedger, key?: string) {
  const prior = key ? ledger.keys[key] : undefined;
  if (prior) return { ledger, chargeId: prior, reused: true };
  const chargeId = `charge-${ledger.charges.length + 1}`;
  return {
    ledger: {
      charges: [...ledger.charges, chargeId],
      keys: key ? { ...ledger.keys, [key]: chargeId } : ledger.keys,
    },
    chargeId,
    reused: false,
  };
}

export const IDEMPOTENCY_LAST_STEP = 5;
const IDEMPOTENCY_STEPS = [
  [
    "One charge requested",
    "Compare the same order with a stable provider key and with no key.",
  ],
  [
    "Provider accepts payment",
    "Both requests create a charge. The Worker has not reported completion yet.",
  ],
  [
    "Worker crashes",
    "The provider has the charge, but Temporal has no recorded completion result.",
  ],
  [
    "Timeout, then retry",
    "After the configured timeout and backoff, another Worker can execute the Activity again.",
  ],
  [
    "Provider receives a second call",
    "The stable key returns the first charge. Without a key, the provider creates another charge.",
  ],
  [
    "Completion recorded",
    "Both Activities now have a result. Only the provider with deduplication performed one charge.",
  ],
] as const;

export function idempotencySnapshot(input: number) {
  const step = boundStep(input, IDEMPOTENCY_LAST_STEP);
  const lanes = ["stable", "none"].map((mode) => {
    const key = mode === "stable" ? "order-1042:charge" : undefined;
    let ledger: PaymentLedger = { charges: [], keys: {} };
    let response: string | null = null;
    let reused = false;
    for (let call = 0; call < (step >= 4 ? 2 : step >= 1 ? 1 : 0); call++) {
      const accepted = acceptCharge(ledger, key);
      ledger = accepted.ledger;
      response = accepted.chargeId;
      reused = accepted.reused;
    }
    return {
      mode,
      key,
      ledger,
      response,
      reused,
      recordedResult: step === 5 ? response : null,
    };
  });
  return {
    step,
    title: IDEMPOTENCY_STEPS[step][0],
    detail: IDEMPOTENCY_STEPS[step][1],
    lanes,
  };
}

export type WaitKind = "timer" | "signal";
export interface WaitingState {
  kind: WaitKind;
  workerOnline: boolean;
  inputRecorded: boolean;
  taskProcessed: boolean;
  resumed: boolean;
}
export function resumeWaitingWorkflow(state: WaitingState): WaitingState {
  return state.workerOnline && state.inputRecorded && state.taskProcessed
    ? { ...state, resumed: true }
    : state;
}
export const WAITING_LAST_STEP = 4;
export function waitingSnapshot(input: number, kind: WaitKind) {
  const step = boundStep(input, WAITING_LAST_STEP);
  const state = resumeWaitingWorkflow({
    kind,
    workerOnline: step === 0 || step >= 3,
    inputRecorded: step >= 2,
    taskProcessed: step === 4,
    resumed: false,
  });
  const event =
    kind === "timer" ? "Timer fired · 24h elapsed" : "Approval signal accepted";
  const titles = [
    "A durable wait begins",
    "Worker goes offline",
    event,
    "Worker returns to poll the task",
    "Worker processes the task and resumes",
  ];
  const details = [
    kind === "timer"
      ? "The Service stores a durable timer. No Worker thread is held for 24 hours."
      : "Workflow code waits for approval. A waiting Workflow holds no Worker thread.",
    "The Service is still available. Application code cannot run while its Workers are offline.",
    kind === "timer"
      ? "The Service records the timer event even while the Worker is offline."
      : "A Client sends approval. The Service records the signal while the Worker is offline.",
    "The Worker is available again, but the pending Workflow Task has not been processed yet.",
    "The Worker processes the task, restores Workflow state, and continues past the wait.",
  ];
  return {
    ...state,
    step,
    event,
    title: titles[step],
    detail: details[step],
    pendingTask: state.inputRecorded && !state.resumed,
  };
}

export const timerSnapshot = (step: number) => waitingSnapshot(step, "timer");
export const signalSnapshot = (step: number) => waitingSnapshot(step, "signal");

export const RETRY_POLICY = {
  initialIntervalSeconds: 1,
  backoffCoefficient: 2,
  maximumAttempts: 3,
  startToCloseSeconds: 5,
} as const;
export function retryDelaySeconds(failedAttempt: number) {
  return (
    RETRY_POLICY.initialIntervalSeconds *
    RETRY_POLICY.backoffCoefficient ** (failedAttempt - 1)
  );
}
export type RetryOutcome = "success" | "exhausted";
export interface RetryAttempt {
  number: number;
  start: number;
  crash: number;
  end: number;
  outcome: "timeout" | "success";
}
/** Immediate dispatch is illustrative; real queue wait adds time. */
export function retrySchedule(outcome: RetryOutcome): readonly RetryAttempt[] {
  let start = 0;
  return Array.from({ length: RETRY_POLICY.maximumAttempts }, (_, index) => {
    const number = index + 1;
    const success =
      number === RETRY_POLICY.maximumAttempts && outcome === "success";
    const attempt: RetryAttempt = {
      number,
      start,
      crash: start + 1,
      end: start + (success ? 2 : RETRY_POLICY.startToCloseSeconds),
      outcome: success ? "success" : "timeout",
    };
    start = attempt.end + retryDelaySeconds(number);
    return attempt;
  });
}
export function retryBeats(outcome: RetryOutcome) {
  const schedule = retrySchedule(outcome);
  return [
    {
      time: 0,
      title: "Attempt 1 starts",
      detail:
        "The 5s Start-To-Close timeout starts when the Worker begins the Activity.",
    },
    {
      time: 1,
      title: "Worker crashes at 1s",
      detail:
        "No result arrives. The Service does not instantly detect this Worker crash.",
    },
    {
      time: 5,
      title: "Attempt 1 times out at 5s",
      detail: "The timeout expires. The retry policy requires a 1s backoff.",
    },
    {
      time: 6,
      title: "Attempt 2 starts at 6s",
      detail: "The Worker begins a new attempt after the first backoff.",
    },
    {
      time: 7,
      title: "Worker crashes again at 7s",
      detail: "The Service waits for this attempt’s own timeout.",
    },
    {
      time: 11,
      title: "Attempt 2 times out at 11s",
      detail:
        "The next backoff doubles to 2s. Maximum Attempts counts the first attempt too.",
    },
    {
      time: 13,
      title: "Attempt 3 starts at 13s",
      detail: "This is the final permitted attempt in the chosen policy.",
    },
    {
      time: schedule[2].end,
      title:
        outcome === "success"
          ? "Result recorded at 15s"
          : "Retry limit reached at 18s",
      detail:
        outcome === "success"
          ? "Attempt 3 succeeds. Workflow code can resume with the result."
          : "Attempt 3 times out. The Activity fails and Workflow code must handle the error.",
    },
  ];
}
export function retrySnapshot(input: number, outcome: RetryOutcome) {
  const beats = retryBeats(outcome);
  const step = boundStep(input, beats.length - 1);
  const beat = beats[step];
  const schedule = retrySchedule(outcome);
  return {
    step,
    ...beat,
    schedule,
    complete: step === beats.length - 1,
    attempts: schedule.map((attempt) => ({
      ...attempt,
      state: (beat.time < attempt.start
        ? "pending"
        : beat.time >= attempt.end
          ? attempt.outcome === "success"
            ? "complete"
            : "failed"
          : "active") as StepState,
      workerCrashed:
        attempt.outcome === "timeout" &&
        beat.time >= attempt.crash &&
        beat.time < attempt.end,
    })),
  };
}
