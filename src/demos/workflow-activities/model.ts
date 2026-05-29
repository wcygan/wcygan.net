export type ActivityKey =
  | "reserveSeat"
  | "chargeCard"
  | "confirmSeat"
  | "sendItinerary";

export type WorkflowPhase =
  | "dispatch-reserve"
  | "run-reserve"
  | "dispatch-charge"
  | "run-charge"
  | "fail-charge"
  | "retry-charge"
  | "run-charge-retry"
  | "dispatch-confirm"
  | "run-confirm"
  | "dispatch-send"
  | "run-send";

export type ActivityStatus =
  | "pending"
  | "scheduled"
  | "working"
  | "failed"
  | "done";

export type WorkflowStatus = "orchestrating" | "complete";

export type PacketDirection = "to-activity" | "to-workflow";

// A failure result travels back tinted as an error rather than a normal result.
export type PacketTone = "default" | "error";

export type PacketSnapshot = {
  activity: ActivityKey;
  direction: PacketDirection;
  progress: number;
  label: string;
  tone: PacketTone;
};

export type ActivitySnapshot = {
  key: ActivityKey;
  label: string;
  job: string;
  status: ActivityStatus;
  statusLabel: string;
  resultLabel?: string;
  pulse: number;
  // Fraction of this activity's work that is done, 0..1. Drives the ring.
  progress: number;
};

export type WorkflowSnapshot = {
  fn: "bookTrip()";
  note: "orchestrates, holds state";
  status: WorkflowStatus;
  statusLabel: string;
  completedCount: number;
};

export type WorkflowDemoState = {
  progress: number;
  playing: boolean;
};

export type ActivitiesSnapshot = {
  progress: number;
  playing: boolean;
  phase: WorkflowPhase;
  workflow: WorkflowSnapshot;
  activities: Record<ActivityKey, ActivitySnapshot>;
  packets: PacketSnapshot[];
  phaseLabel: string;
};

const PACKET_TRAVEL = 0.05;
// How long a ring takes to fill 0..100% once work starts.
const WORK_SPAN = 0.085;

// The timeline runs 0..1. Each activity gets a dispatch window (the schedule
// packet travels out), a work window (the ring fills), then a result window
// (the result travels back). chargeCard is the exception: its first attempt
// fails at 50%, Temporal backs off, then re-dispatches a second attempt that
// succeeds. The four activities finish near 0.94, then the loop holds complete.

// reserveSeat
const RESERVE_DISPATCH_START = 0;
const RESERVE_DONE_AT = 0.135;
const RESERVE_RUN_END = 0.19;

// chargeCard — attempt 1 fails, Temporal retries, attempt 2 succeeds.
const CHARGE_DISPATCH_START = 0.19;
const CHARGE_FAIL_AT = 0.2825; // attempt 1 ring reaches 50%, then fails
const CHARGE_BACKOFF_END = 0.37; // failure recorded + retry backoff
const CHARGE_RETRY_DISPATCH_START = 0.37;
const CHARGE_RETRY_DONE_AT = 0.505; // attempt 2 fills to 100%
const CHARGE_RUN_END = 0.56;

// confirmSeat
const CONFIRM_DISPATCH_START = 0.56;
const CONFIRM_DONE_AT = 0.695;
const CONFIRM_RUN_END = 0.75;

// sendItinerary
const SEND_DISPATCH_START = 0.75;
const SEND_DONE_AT = 0.885;

const ACTIVITY_META: Record<
  ActivityKey,
  { label: string; job: string; result: string }
> = {
  reserveSeat: {
    label: "reserveSeat",
    job: "hold a seat",
    result: "seat 14C",
  },
  chargeCard: {
    label: "chargeCard",
    job: "capture payment",
    result: "charged $480",
  },
  confirmSeat: {
    label: "confirmSeat",
    job: "commit the hold",
    result: "seat confirmed",
  },
  sendItinerary: {
    label: "sendItinerary",
    job: "email the traveler",
    result: "email sent",
  },
};

const ACTIVITY_ORDER: ActivityKey[] = [
  "reserveSeat",
  "chargeCard",
  "confirmSeat",
  "sendItinerary",
];

export const REDUCED_MOTION_PROGRESS = 0.97;

export function deriveActivitiesSnapshot(
  state: WorkflowDemoState,
): ActivitiesSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);
  const completedCount = countCompleted(progress);
  const workflowComplete = completedCount === ACTIVITY_ORDER.length;

  return {
    progress,
    playing: state.playing,
    phase,
    workflow: {
      fn: "bookTrip()",
      note: "orchestrates, holds state",
      status: workflowComplete ? "complete" : "orchestrating",
      statusLabel: workflowComplete
        ? "all activities complete"
        : "dispatching activities in order",
      completedCount,
    },
    activities: {
      reserveSeat: activitySnapshot("reserveSeat", progress),
      chargeCard: activitySnapshot("chargeCard", progress),
      confirmSeat: activitySnapshot("confirmSeat", progress),
      sendItinerary: activitySnapshot("sendItinerary", progress),
    },
    packets: derivePackets(progress),
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

function derivePhase(progress: number): WorkflowPhase {
  if (progress < RESERVE_DISPATCH_START + PACKET_TRAVEL)
    return "dispatch-reserve";
  if (progress < RESERVE_RUN_END) return "run-reserve";
  if (progress < CHARGE_DISPATCH_START + PACKET_TRAVEL)
    return "dispatch-charge";
  if (progress < CHARGE_FAIL_AT) return "run-charge";
  if (progress < CHARGE_BACKOFF_END) return "fail-charge";
  if (progress < CHARGE_RETRY_DISPATCH_START + PACKET_TRAVEL) {
    return "retry-charge";
  }
  if (progress < CHARGE_RUN_END) return "run-charge-retry";
  if (progress < CONFIRM_DISPATCH_START + PACKET_TRAVEL)
    return "dispatch-confirm";
  if (progress < CONFIRM_RUN_END) return "run-confirm";
  if (progress < SEND_DISPATCH_START + PACKET_TRAVEL) return "dispatch-send";
  return "run-send";
}

function countCompleted(progress: number): number {
  let count = 0;
  // A result counts only once it has traveled back and reached the workflow,
  // one packet-trip after the activity hit 100%. chargeCard counts on the
  // successful retry, not the failed first attempt.
  if (progress >= RESERVE_DONE_AT + PACKET_TRAVEL) count += 1;
  if (progress >= CHARGE_RETRY_DONE_AT + PACKET_TRAVEL) count += 1;
  if (progress >= CONFIRM_DONE_AT + PACKET_TRAVEL) count += 1;
  if (progress >= SEND_DONE_AT + PACKET_TRAVEL) count += 1;
  return count;
}

// The three straightforward activities own a [dispatchStart, runEnd] window
// plus a doneAt moment. chargeCard has its own two-attempt timeline below.
function activityWindow(key: ActivityKey) {
  if (key === "reserveSeat") {
    return {
      dispatchStart: RESERVE_DISPATCH_START,
      doneAt: RESERVE_DONE_AT,
      runEnd: RESERVE_RUN_END,
    };
  }
  if (key === "confirmSeat") {
    return {
      dispatchStart: CONFIRM_DISPATCH_START,
      doneAt: CONFIRM_DONE_AT,
      runEnd: CONFIRM_RUN_END,
    };
  }
  return {
    dispatchStart: SEND_DISPATCH_START,
    doneAt: SEND_DONE_AT,
    runEnd: 1,
  };
}

function activitySnapshot(
  key: ActivityKey,
  progress: number,
): ActivitySnapshot {
  if (key === "chargeCard") return chargeSnapshot(progress);

  const meta = ACTIVITY_META[key];
  const window = activityWindow(key);
  const base = { key, label: meta.label, job: meta.job, pulse: 0, progress: 0 };

  if (progress < window.dispatchStart) {
    return { ...base, status: "pending", statusLabel: "waiting in queue" };
  }

  const dispatchEnd = window.dispatchStart + PACKET_TRAVEL;
  if (progress < dispatchEnd) {
    return { ...base, status: "scheduled", statusLabel: "task scheduled" };
  }

  if (progress < window.doneAt) {
    const span = window.doneAt - dispatchEnd;
    const local = span > 0 ? (progress - dispatchEnd) / span : 1;
    return {
      ...base,
      status: "working",
      statusLabel: "doing real work",
      pulse: pulseWave(local),
      progress: clamp(local, 0, 1),
    };
  }

  return {
    ...base,
    status: "done",
    statusLabel: "result returned",
    resultLabel: meta.result,
    progress: 1,
  };
}

// chargeCard models an external call that fails the first time: the ring fills
// to 50% then trips into a failed state, Temporal waits out a backoff, and a
// second attempt fills cleanly to 100%.
function chargeSnapshot(progress: number): ActivitySnapshot {
  const meta = ACTIVITY_META.chargeCard;
  const base = {
    key: "chargeCard" as const,
    label: meta.label,
    job: meta.job,
    pulse: 0,
    progress: 0,
  };

  if (progress < CHARGE_DISPATCH_START) {
    return { ...base, status: "pending", statusLabel: "waiting in queue" };
  }

  const attempt1Work = CHARGE_DISPATCH_START + PACKET_TRAVEL;
  if (progress < attempt1Work) {
    return { ...base, status: "scheduled", statusLabel: "task scheduled" };
  }

  if (progress < CHARGE_FAIL_AT) {
    const local = (progress - attempt1Work) / WORK_SPAN;
    return {
      ...base,
      status: "working",
      statusLabel: "doing real work",
      pulse: pulseWave(local),
      progress: clamp(local, 0, 1),
    };
  }

  if (progress < CHARGE_BACKOFF_END) {
    return {
      ...base,
      status: "failed",
      statusLabel: "payment failed",
      progress: 0.5,
    };
  }

  const attempt2Work = CHARGE_RETRY_DISPATCH_START + PACKET_TRAVEL;
  if (progress < attempt2Work) {
    return { ...base, status: "scheduled", statusLabel: "scheduled (retry)" };
  }

  if (progress < CHARGE_RETRY_DONE_AT) {
    const local = (progress - attempt2Work) / WORK_SPAN;
    return {
      ...base,
      status: "working",
      statusLabel: "retrying payment",
      pulse: pulseWave(local),
      progress: clamp(local, 0, 1),
    };
  }

  return {
    ...base,
    status: "done",
    statusLabel: "result returned",
    resultLabel: meta.result,
    progress: 1,
  };
}

// Smooth 0..1..0 hump used to make a working card breathe.
function pulseWave(local: number) {
  const phase = clamp(local, 0, 1);
  return 0.5 - 0.5 * Math.cos(phase * Math.PI * 4);
}

function derivePackets(progress: number): PacketSnapshot[] {
  const packets: (PacketSnapshot | undefined)[] = [];

  // reserveSeat, confirmSeat, sendItinerary: a schedule out, a result back.
  for (const key of ["reserveSeat", "confirmSeat", "sendItinerary"] as const) {
    const window = activityWindow(key);
    const meta = ACTIVITY_META[key];
    packets.push(
      packetWindow(
        progress,
        window.dispatchStart,
        key,
        "to-activity",
        "schedule",
      ),
    );
    // The result leaves only after the work finishes (the ring hits 100%),
    // then travels back during the activity's done window.
    packets.push(
      packetWindow(progress, window.doneAt, key, "to-workflow", meta.result),
    );
  }

  // chargeCard: schedule out, a failure reported back, a retry out, then the
  // successful result back.
  packets.push(
    packetWindow(
      progress,
      CHARGE_DISPATCH_START,
      "chargeCard",
      "to-activity",
      "schedule",
    ),
  );
  packets.push(
    packetWindow(
      progress,
      CHARGE_FAIL_AT,
      "chargeCard",
      "to-workflow",
      "payment failed",
      "error",
    ),
  );
  packets.push(
    packetWindow(
      progress,
      CHARGE_RETRY_DISPATCH_START,
      "chargeCard",
      "to-activity",
      "retry",
    ),
  );
  packets.push(
    packetWindow(
      progress,
      CHARGE_RETRY_DONE_AT,
      "chargeCard",
      "to-workflow",
      "charged $480",
    ),
  );

  return packets.filter(
    (packet): packet is PacketSnapshot => packet !== undefined,
  );
}

function packetWindow(
  progress: number,
  start: number,
  activity: ActivityKey,
  direction: PacketDirection,
  label: string,
  tone: PacketTone = "default",
): PacketSnapshot | undefined {
  const end = start + PACKET_TRAVEL;
  if (progress < start || progress > end) return undefined;

  return {
    activity,
    direction,
    progress: easeInOut((progress - start) / PACKET_TRAVEL),
    label,
    tone,
  };
}

function phaseLabel(phase: WorkflowPhase, progress: number): string {
  if (phase === "dispatch-reserve") {
    return "bookTrip() schedules reserveSeat, the first activity in the sequence.";
  }

  if (phase === "run-reserve") {
    if (progress < RESERVE_DONE_AT) {
      return "reserveSeat does its one unit of work, holding a seat.";
    }
    return "reserveSeat returns seat 14C, and the workflow records the result.";
  }

  if (phase === "dispatch-charge") {
    return "With the seat held, bookTrip() schedules chargeCard next.";
  }

  if (phase === "run-charge") {
    return "chargeCard attempts the payment, the kind of external call that can fail.";
  }

  if (phase === "fail-charge") {
    return "chargeCard fails midway. Temporal records the failure and waits out a retry backoff.";
  }

  if (phase === "retry-charge") {
    return "Per its retry policy, Temporal re-dispatches chargeCard for another attempt.";
  }

  if (phase === "run-charge-retry") {
    if (progress < CHARGE_RETRY_DONE_AT) {
      return "The retry runs, and this time chargeCard captures the payment.";
    }
    return "chargeCard returns charged $480 back to the workflow.";
  }

  if (phase === "dispatch-confirm") {
    return "Payment captured, bookTrip() schedules confirmSeat to commit the hold.";
  }

  if (phase === "run-confirm") {
    if (progress < CONFIRM_DONE_AT) {
      return "confirmSeat turns the held seat into a committed booking.";
    }
    return "confirmSeat returns seat confirmed back to the workflow.";
  }

  if (phase === "dispatch-send") {
    return "Last in order, bookTrip() schedules sendItinerary.";
  }

  if (progress < SEND_DONE_AT) {
    return "sendItinerary emails the traveler while the workflow holds state.";
  }
  return "sendItinerary returns email sent. bookTrip() is complete.";
}
