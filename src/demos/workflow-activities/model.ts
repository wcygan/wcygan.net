export type ActivityKey = "chargeCard" | "reserveSeat" | "sendItinerary";

export type WorkflowPhase =
  | "dispatch-charge"
  | "run-charge"
  | "dispatch-reserve"
  | "run-reserve"
  | "dispatch-send"
  | "run-send";

export type ActivityStatus = "pending" | "scheduled" | "working" | "done";

export type WorkflowStatus = "orchestrating" | "complete";

export type PacketDirection = "to-activity" | "to-workflow";

export type PacketSnapshot = {
  activity: ActivityKey;
  direction: PacketDirection;
  progress: number;
  label: string;
};

export type ActivitySnapshot = {
  key: ActivityKey;
  label: string;
  job: string;
  status: ActivityStatus;
  statusLabel: string;
  resultLabel?: string;
  pulse: number;
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

const PACKET_TRAVEL = 0.06;

// Phase boundaries: each activity gets a dispatch window then a run window.
const DISPATCH_CHARGE_END = 0.1;
const RUN_CHARGE_END = 0.34;
const DISPATCH_RESERVE_END = 0.44;
const RUN_RESERVE_END = 0.62;
const DISPATCH_SEND_END = 0.72;

// Moment each activity finishes its real work and returns a result.
const CHARGE_DONE_AT = 0.28;
const RESERVE_DONE_AT = 0.56;
const SEND_DONE_AT = 0.9;

const ACTIVITY_META: Record<
  ActivityKey,
  { label: string; job: string; result: string }
> = {
  chargeCard: {
    label: "chargeCard",
    job: "capture payment",
    result: "charged $480",
  },
  reserveSeat: {
    label: "reserveSeat",
    job: "hold a seat",
    result: "seat 14C",
  },
  sendItinerary: {
    label: "sendItinerary",
    job: "email the traveler",
    result: "email sent",
  },
};

const ACTIVITY_ORDER: ActivityKey[] = [
  "chargeCard",
  "reserveSeat",
  "sendItinerary",
];

export const REDUCED_MOTION_PROGRESS = 0.95;

export function deriveActivitiesSnapshot(
  state: WorkflowDemoState,
): ActivitiesSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);
  const completedCount = countCompleted(progress);
  const workflowComplete = completedCount === 3;

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
      chargeCard: activitySnapshot("chargeCard", progress),
      reserveSeat: activitySnapshot("reserveSeat", progress),
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
  if (progress < DISPATCH_CHARGE_END) return "dispatch-charge";
  if (progress < RUN_CHARGE_END) return "run-charge";
  if (progress < DISPATCH_RESERVE_END) return "dispatch-reserve";
  if (progress < RUN_RESERVE_END) return "run-reserve";
  if (progress < DISPATCH_SEND_END) return "dispatch-send";
  return "run-send";
}

function countCompleted(progress: number): number {
  let count = 0;
  if (progress >= CHARGE_DONE_AT) count += 1;
  if (progress >= RESERVE_DONE_AT) count += 1;
  if (progress >= SEND_DONE_AT) count += 1;
  return count;
}

// Each activity owns a [dispatchStart, runEnd] window plus a doneAt moment.
function activityWindow(key: ActivityKey) {
  if (key === "chargeCard") {
    return { dispatchStart: 0, doneAt: CHARGE_DONE_AT, runEnd: RUN_CHARGE_END };
  }
  if (key === "reserveSeat") {
    return {
      dispatchStart: DISPATCH_RESERVE_END - 0.08,
      doneAt: RESERVE_DONE_AT,
      runEnd: RUN_RESERVE_END,
    };
  }
  return {
    dispatchStart: DISPATCH_SEND_END - PACKET_TRAVEL,
    doneAt: SEND_DONE_AT,
    runEnd: 1,
  };
}

function activitySnapshot(
  key: ActivityKey,
  progress: number,
): ActivitySnapshot {
  const meta = ACTIVITY_META[key];
  const window = activityWindow(key);
  const base = { key, label: meta.label, job: meta.job, pulse: 0 } as const;

  if (progress < window.dispatchStart) {
    return { ...base, status: "pending", statusLabel: "waiting in queue" };
  }

  const dispatchEnd = window.dispatchStart + PACKET_TRAVEL;
  if (progress < dispatchEnd) {
    return { ...base, status: "scheduled", statusLabel: "command received" };
  }

  if (progress < window.doneAt) {
    const span = window.doneAt - dispatchEnd;
    const local = span > 0 ? (progress - dispatchEnd) / span : 1;
    return {
      ...base,
      status: "working",
      statusLabel: "doing real work",
      pulse: pulseWave(local),
    };
  }

  return {
    ...base,
    status: "done",
    statusLabel: "result returned",
    resultLabel: meta.result,
  };
}

// Smooth 0..1..0 hump used to make a working card breathe.
function pulseWave(local: number) {
  const phase = clamp(local, 0, 1);
  return 0.5 - 0.5 * Math.cos(phase * Math.PI * 4);
}

function derivePackets(progress: number): PacketSnapshot[] {
  const packets: (PacketSnapshot | undefined)[] = [];

  for (const key of ACTIVITY_ORDER) {
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
    packets.push(
      packetWindow(
        progress,
        window.doneAt - PACKET_TRAVEL,
        key,
        "to-workflow",
        meta.result,
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
  activity: ActivityKey,
  direction: PacketDirection,
  label: string,
): PacketSnapshot | undefined {
  const end = start + PACKET_TRAVEL;
  if (progress < start || progress > end) return undefined;

  return {
    activity,
    direction,
    progress: easeInOut((progress - start) / PACKET_TRAVEL),
    label,
  };
}

function phaseLabel(phase: WorkflowPhase, progress: number): string {
  if (phase === "dispatch-charge") {
    return "bookTrip() schedules chargeCard, the first activity in the sequence.";
  }

  if (phase === "run-charge") {
    if (progress < CHARGE_DONE_AT) {
      return "chargeCard runs the real payment work while the workflow waits.";
    }
    return "chargeCard returns charged $480, and the workflow records the result.";
  }

  if (phase === "dispatch-reserve") {
    return "With the charge committed, bookTrip() schedules reserveSeat next.";
  }

  if (phase === "run-reserve") {
    if (progress < RESERVE_DONE_AT) {
      return "reserveSeat does its one unit of work, holding a seat.";
    }
    return "reserveSeat returns seat 14C back to the workflow.";
  }

  if (phase === "dispatch-send") {
    return "Last in order, bookTrip() schedules sendItinerary.";
  }

  if (progress < SEND_DONE_AT) {
    return "sendItinerary emails the traveler while the workflow holds state.";
  }
  return "sendItinerary returns email sent. bookTrip() is complete.";
}
