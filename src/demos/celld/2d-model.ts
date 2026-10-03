/**
 * Small, deterministic teaching models, not a celld implementation or benchmark.
 * Source: denoland/celld v0.6.1, docs/guarantees.md and crates/logic/lib.rs.
 */
export interface OwnershipRecord {
  node: string;
  epoch: number;
  etag: string;
}

export const INITIAL_OWNER: OwnershipRecord = {
  node: "A",
  epoch: 7,
  etag: "owner-v7",
};

/** A competing write must compare the version it actually read. */
export function claimOwnership(
  current: OwnershipRecord,
  expectedEtag: string,
  contender: string,
): { accepted: boolean; record: OwnershipRecord } {
  if (current.etag !== expectedEtag) {
    return { accepted: false, record: current };
  }
  const epoch = current.epoch + 1;
  return {
    accepted: true,
    record: { node: contender, epoch, etag: `owner-v${epoch}` },
  };
}

export function cellEpochPrefix(epoch: number) {
  return `cells/room:lobby/ltx/e${epoch}/`;
}

export function bucketAcknowledgementAllowed({
  owner,
  writer,
  epoch,
  covered,
}: {
  owner: OwnershipRecord;
  writer: string;
  epoch: number;
  covered: boolean;
}) {
  return covered && owner.node === writer && owner.epoch === epoch;
}

export interface DurabilityEvidence {
  mode: "bucket" | "fleet";
  committed: boolean;
  bucketCovered: boolean;
  confirmedOwner: boolean;
  ensembleSize: number;
  fsyncedFollowers: number;
  sessionOpen: boolean;
}

/**
 * The teaching example uses one follower. A real ensemble has one or two;
 * all current ensemble members must persist a write before a fleet proof.
 */
export function durabilityDecision(evidence: DurabilityEvidence): {
  acknowledge: boolean;
  proof: "bucket" | "fleet" | null;
} {
  if (!evidence.committed) return { acknowledge: false, proof: null };
  const fleetProof =
    evidence.mode === "fleet" &&
    evidence.ensembleSize > 0 &&
    evidence.fsyncedFollowers === evidence.ensembleSize &&
    evidence.sessionOpen;
  if (fleetProof) return { acknowledge: true, proof: "fleet" };
  if (evidence.bucketCovered && evidence.confirmedOwner) {
    return { acknowledge: true, proof: "bucket" };
  }
  return { acknowledge: false, proof: null };
}

export function deriveDurabilityComparison(step: number) {
  const phase = Math.max(0, Math.min(3, Math.floor(step)));
  const single = durabilityDecision({
    mode: "fleet",
    committed: true,
    bucketCovered: phase >= 1,
    confirmedOwner: phase >= 2,
    ensembleSize: 0,
    fsyncedFollowers: 0,
    sessionOpen: true,
  });
  const fleet = durabilityDecision({
    mode: "fleet",
    committed: true,
    bucketCovered: phase >= 3,
    confirmedOwner: phase >= 3,
    ensembleSize: 1,
    fsyncedFollowers: phase >= 2 ? 1 : 0,
    sessionOpen: true,
  });
  return {
    phase,
    single: { ...single, bucketCovered: phase >= 1 },
    fleet: {
      ...fleet,
      bucketCovered: phase >= 3,
      followerStored: phase >= 2,
    },
  };
}

export const RECOVERY_PHASES = [
  "owner-stopped",
  "lease-expired",
  "log-fenced",
  "tail-recovered",
  "ownership-acquired",
  "restored",
  "serving",
] as const;

export type RecoveryPhase = (typeof RECOVERY_PHASES)[number];
export type TailWitness = "complete" | "unreachable";
export interface RecoveryState {
  phase: RecoveryPhase;
  blocked: boolean;
}
export const INITIAL_RECOVERY: RecoveryState = {
  phase: "owner-stopped",
  blocked: false,
};

/**
 * This path starts with an open prior log and an acknowledged follower tail.
 * "unreachable" means inconclusive evidence, not a conclusively lost disk.
 * In this source version, recovery finishes before the cell ownership claim.
 */
export function advanceRecovery(
  state: RecoveryState,
  witness: TailWitness,
): RecoveryState {
  if (state.phase === "log-fenced" && witness !== "complete") {
    return { phase: "log-fenced", blocked: true };
  }
  const index = RECOVERY_PHASES.indexOf(state.phase);
  return {
    phase: RECOVERY_PHASES[Math.min(index + 1, RECOVERY_PHASES.length - 1)],
    blocked: false,
  };
}

export function recoverySnapshot(state: RecoveryState) {
  const step = RECOVERY_PHASES.indexOf(state.phase);
  return {
    step,
    serving: state.phase === "serving",
    leaseExpired: step >= 1,
    logFenced: step >= 2,
    logSealed: step >= 3,
    bucketComplete: step >= 3,
    ownershipAcquired: step >= 4,
    restored: step >= 5,
  };
}

export interface ScheduledOperation {
  id: number;
  key: string;
  round: number;
}

/** One synchronous state-changing turn per cell per round, with enough nodes. */
export function scheduleCellTurns(
  keys: readonly string[],
): ScheduledOperation[] {
  const turns = new Map<string, number>();
  return keys.map((key, index) => {
    const round = (turns.get(key) ?? 0) + 1;
    turns.set(key, round);
    return { id: index + 1, key, round };
  });
}

export const HOT_KEY_SCHEDULE = scheduleCellTurns(Array(6).fill("room:lobby"));
export const INDEPENDENT_KEY_SCHEDULE = scheduleCellTurns([
  "room:a",
  "room:b",
  "room:c",
  "room:a",
  "room:b",
  "room:c",
]);
