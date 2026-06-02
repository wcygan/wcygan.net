export type RegionCode = "VA" | "TX" | "OR";

export type LagPhase =
  | "write"
  | "texas-catches-up"
  | "virginia-fails"
  | "stale-window"
  | "repair"
  | "resolved";

export type DemoState = {
  progress: number;
  playing: boolean;
};

export type ReplicaStatus =
  | "primary"
  | "replica"
  | "caught-up"
  | "lagging"
  | "failed"
  | "new-primary";

export type ReplicaSnapshot = {
  code: RegionCode;
  label: string;
  city: string;
  status: ReplicaStatus;
  version: 18 | 19;
  lagMs: number;
};

export type LagPacket = {
  from: "user" | "virginia" | "texas" | "oregon";
  to: "user" | "virginia" | "texas" | "oregon";
  label: string;
  progress: number;
  tone: "write" | "replication" | "stale-read" | "repair";
};

export type LagSnapshot = {
  progress: number;
  playing: boolean;
  phase: LagPhase;
  phaseLabel: string;
  committedVersion: 18 | 19;
  replicas: readonly ReplicaSnapshot[];
  packets: readonly LagPacket[];
  safeFailoverTarget: RegionCode | undefined;
  staleReadVisible: boolean;
};

export const LAG_STEPS = [
  { phase: "write", label: "Write v19" },
  { phase: "texas-catches-up", label: "TX catches up" },
  { phase: "virginia-fails", label: "VA fails" },
  { phase: "stale-window", label: "OR stale" },
  { phase: "repair", label: "Repair OR" },
  { phase: "resolved", label: "All v19" },
] as const satisfies readonly { phase: LagPhase; label: string }[];

export const LAG_REGION_ORDER = [
  "VA",
  "TX",
  "OR",
] as const satisfies readonly RegionCode[];

const COMMIT_AT = 0.18;
const TEXAS_APPLY_AT = 0.4;
const VIRGINIA_FAIL_AT = 0.52;
const STALE_READ_START = 0.62;
const STALE_RESPONSE_START = 0.72;
const REPAIR_START = 0.86;
const OREGON_APPLY_AT = 0.92;
const RESOLVED_AT = 0.94;

export const LAG_TIMING = {
  commitAt: COMMIT_AT,
  texasApplyAt: TEXAS_APPLY_AT,
  virginiaFailAt: VIRGINIA_FAIL_AT,
  staleReadStart: STALE_READ_START,
  staleResponseStart: STALE_RESPONSE_START,
  repairStart: REPAIR_START,
  oregonApplyAt: OREGON_APPLY_AT,
  resolvedAt: RESOLVED_AT,
} as const;

export const REDUCED_MOTION_PROGRESS = RESOLVED_AT;

export function deriveLagSnapshot(state: DemoState): LagSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);

  return {
    progress,
    playing: state.playing,
    phase,
    phaseLabel: phaseLabel(phase),
    committedVersion: progress >= COMMIT_AT ? 19 : 18,
    replicas: LAG_REGION_ORDER.map((code) => replica(code, progress)),
    packets: packets(progress),
    safeFailoverTarget: progress >= VIRGINIA_FAIL_AT ? "TX" : undefined,
    staleReadVisible:
      progress >= STALE_READ_START && progress < OREGON_APPLY_AT,
  };
}

export function lagStepState(currentPhase: LagPhase, index: number) {
  const currentIndex = LAG_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (currentIndex === LAG_STEPS.length - 1 && index <= currentIndex) {
    return "complete";
  }

  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "active";
  return "pending";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function easeOut(value: number) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

export function easeInOut(value: number) {
  const normalized = clamp(value, 0, 1);
  return normalized < 0.5
    ? 4 * normalized * normalized * normalized
    : 1 - Math.pow(-2 * normalized + 2, 3) / 2;
}

function derivePhase(progress: number): LagPhase {
  if (progress < TEXAS_APPLY_AT) return "write";
  if (progress < VIRGINIA_FAIL_AT) return "texas-catches-up";
  if (progress < STALE_READ_START) return "virginia-fails";
  if (progress < REPAIR_START) return "stale-window";
  if (progress < RESOLVED_AT) return "repair";
  return "resolved";
}

function phaseLabel(phase: LagPhase) {
  switch (phase) {
    case "write":
      return "Virginia accepts a write and advances the account to version 19.";
    case "texas-catches-up":
      return "Texas receives the new version quickly, but Oregon is still behind.";
    case "virginia-fails":
      return "Virginia fails while Oregon is missing the latest write.";
    case "stale-window":
      return "Failover should prefer Texas; reading from Oregon now would return version 18.";
    case "repair":
      return "Oregon repairs from the caught-up region before serving current reads.";
    case "resolved":
      return "All healthy regions have version 19 again.";
  }
}

function replica(code: RegionCode, progress: number): ReplicaSnapshot {
  if (code === "VA") {
    return {
      code,
      label: "Virginia",
      city: "Ashburn",
      status: progress >= VIRGINIA_FAIL_AT ? "failed" : "primary",
      version: progress >= COMMIT_AT ? 19 : 18,
      lagMs: 0,
    };
  }

  if (code === "TX") {
    const caughtUp = progress >= TEXAS_APPLY_AT;

    return {
      code,
      label: "Texas",
      city: "Richardson",
      status:
        progress >= VIRGINIA_FAIL_AT
          ? "new-primary"
          : caughtUp
            ? "caught-up"
            : "replica",
      version: caughtUp ? 19 : 18,
      lagMs: caughtUp ? 0 : 120,
    };
  }

  const caughtUp = progress >= OREGON_APPLY_AT;

  return {
    code,
    label: "Oregon",
    city: "Hillsboro",
    status: caughtUp ? "caught-up" : "lagging",
    version: caughtUp ? 19 : 18,
    lagMs: caughtUp ? 0 : progress >= VIRGINIA_FAIL_AT ? 430 : 240,
  };
}

function packets(progress: number): LagPacket[] {
  return [
    packet(progress, 0.02, COMMIT_AT, "user", "virginia", "write v19", "write"),
    packet(
      progress,
      0.22,
      TEXAS_APPLY_AT,
      "virginia",
      "texas",
      "async copy v19",
      "replication",
    ),
    packet(
      progress,
      STALE_READ_START,
      STALE_RESPONSE_START,
      "user",
      "oregon",
      "read Oregon",
      "stale-read",
    ),
    packet(
      progress,
      STALE_RESPONSE_START,
      REPAIR_START,
      "oregon",
      "user",
      "returns v18",
      "stale-read",
    ),
    packet(
      progress,
      REPAIR_START,
      OREGON_APPLY_AT,
      "texas",
      "oregon",
      "repair v19",
      "repair",
    ),
  ].filter(
    (activePacket): activePacket is LagPacket => activePacket !== undefined,
  );
}

function packet(
  progress: number,
  start: number,
  end: number,
  from: LagPacket["from"],
  to: LagPacket["to"],
  label: string,
  tone: LagPacket["tone"],
): LagPacket | undefined {
  if (progress < start || progress > end) return undefined;

  return {
    from,
    to,
    label,
    progress: easeInOut((progress - start) / (end - start)),
    tone,
  };
}
