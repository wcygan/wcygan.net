export type RegionCode = "OR" | "VA" | "TX";

export type RoutingPhase =
  | "enter-edge"
  | "lookup-home"
  | "route-write"
  | "commit-home"
  | "replicate"
  | "complete";

export type PacketTone = "request" | "lookup" | "write" | "replication";

export type DemoState = {
  progress: number;
  playing: boolean;
};

export type RegionSnapshot = {
  code: RegionCode;
  label: string;
  city: string;
  role: "entry" | "home" | "replica";
  status: "receiving" | "routing" | "committing" | "replicating" | "current";
  version: 18 | 19;
};

export type RoutingPacket = {
  from: "user" | "oregon" | "directory" | "virginia" | "texas";
  to: "oregon" | "directory" | "virginia" | "texas";
  label: string;
  progress: number;
  tone: PacketTone;
};

export type RoutingSnapshot = {
  progress: number;
  playing: boolean;
  phase: RoutingPhase;
  phaseLabel: string;
  directoryStatus: string;
  homeRegion: RegionCode;
  accountVersion: 18 | 19;
  regions: readonly RegionSnapshot[];
  packets: readonly RoutingPacket[];
};

export const ROUTING_STEPS = [
  { phase: "enter-edge", label: "Closest edge" },
  { phase: "lookup-home", label: "Find home" },
  { phase: "route-write", label: "Route write" },
  { phase: "commit-home", label: "Commit v19" },
  { phase: "replicate", label: "Replicate" },
  { phase: "complete", label: "One account" },
] as const satisfies readonly { phase: RoutingPhase; label: string }[];

const LOOKUP_START = 0.16;
const ROUTE_START = 0.32;
const COMMIT_START = 0.52;
const REPLICATE_START = 0.66;
const COMPLETE_START = 0.86;
const HOME_COMMIT_AT = 0.58;
const TEXAS_REPLICA_APPLY_AT = 0.78;
const OREGON_REPLICA_APPLY_AT = 0.84;

export const REDUCED_MOTION_PROGRESS = 0.92;

export function deriveRoutingSnapshot(state: DemoState): RoutingSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);
  const accountVersion = progress >= HOME_COMMIT_AT ? 19 : 18;

  return {
    progress,
    playing: state.playing,
    phase,
    phaseLabel: phaseLabel(phase),
    directoryStatus: directoryStatus(progress),
    homeRegion: "VA",
    accountVersion,
    regions: [
      region("OR", progress),
      region("VA", progress),
      region("TX", progress),
    ],
    packets: packets(progress),
  };
}

export function routingStepState(currentPhase: RoutingPhase, index: number) {
  const currentIndex = ROUTING_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (currentIndex === ROUTING_STEPS.length - 1 && index <= currentIndex) {
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

function derivePhase(progress: number): RoutingPhase {
  if (progress < LOOKUP_START) return "enter-edge";
  if (progress < ROUTE_START) return "lookup-home";
  if (progress < COMMIT_START) return "route-write";
  if (progress < REPLICATE_START) return "commit-home";
  if (progress < COMPLETE_START) return "replicate";
  return "complete";
}

function phaseLabel(phase: RoutingPhase) {
  switch (phase) {
    case "enter-edge":
      return "The request enters through the closest healthy region in Oregon.";
    case "lookup-home":
      return "The account directory returns Virginia as the write home.";
    case "route-write":
      return "The write travels to the account's home region instead of committing at the edge.";
    case "commit-home":
      return "Virginia commits the write and advances the account from version 18 to version 19.";
    case "replicate":
      return "Texas and Oregon receive the new version so reads can catch up around the country.";
    case "complete":
      return "The user saw one account, even though the application ran in three places.";
  }
}

function directoryStatus(progress: number) {
  if (progress < LOOKUP_START) return "waiting";
  if (progress < ROUTE_START) return "lookup: account 42 -> Virginia";
  if (progress < COMPLETE_START) return "home: Virginia";
  return "home: Virginia, version 19";
}

function region(code: RegionCode, progress: number): RegionSnapshot {
  if (code === "OR") {
    return {
      code,
      label: "Oregon",
      city: "Hillsboro",
      role: "entry",
      status:
        progress < LOOKUP_START
          ? "receiving"
          : progress < ROUTE_START
            ? "routing"
            : progress < OREGON_REPLICA_APPLY_AT
              ? "replicating"
              : "current",
      version: progress >= OREGON_REPLICA_APPLY_AT ? 19 : 18,
    };
  }

  if (code === "VA") {
    return {
      code,
      label: "Virginia",
      city: "Ashburn",
      role: "home",
      status: progress < HOME_COMMIT_AT ? "committing" : "current",
      version: progress >= HOME_COMMIT_AT ? 19 : 18,
    };
  }

  return {
    code,
    label: "Texas",
    city: "Richardson",
    role: "replica",
    status: progress < TEXAS_REPLICA_APPLY_AT ? "replicating" : "current",
    version: progress >= TEXAS_REPLICA_APPLY_AT ? 19 : 18,
  };
}

function packets(progress: number): RoutingPacket[] {
  return [
    packet(progress, 0.02, 0.15, "user", "oregon", "request", "request"),
    packet(
      progress,
      LOOKUP_START,
      0.24,
      "oregon",
      "directory",
      "lookup account 42",
      "lookup",
    ),
    packet(
      progress,
      0.24,
      ROUTE_START,
      "directory",
      "oregon",
      "home = Virginia",
      "lookup",
    ),
    packet(
      progress,
      ROUTE_START,
      0.5,
      "oregon",
      "virginia",
      "write profile change",
      "write",
    ),
    packet(
      progress,
      REPLICATE_START,
      TEXAS_REPLICA_APPLY_AT,
      "virginia",
      "texas",
      "replicate v19",
      "replication",
    ),
    packet(
      progress,
      0.7,
      OREGON_REPLICA_APPLY_AT,
      "virginia",
      "oregon",
      "replicate v19",
      "replication",
    ),
  ].filter(
    (activePacket): activePacket is RoutingPacket => activePacket !== undefined,
  );
}

function packet(
  progress: number,
  start: number,
  end: number,
  from: RoutingPacket["from"],
  to: RoutingPacket["to"],
  label: string,
  tone: PacketTone,
): RoutingPacket | undefined {
  if (progress < start || progress > end) return undefined;

  return {
    from,
    to,
    label,
    progress: easeInOut((progress - start) / (end - start)),
    tone,
  };
}
