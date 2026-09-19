import {
  appendTransaction,
  canWrite,
  DEFAULT_CONDITIONS,
  majoritySnapshot,
  normalizeConditions,
  PLAYBACK_RATE,
  WRITE_COOLDOWN,
  type Flight,
  type LagConditions,
  type Transaction,
} from "./model";

export const DETECTION_TIME = 5000 * PLAYBACK_RATE;
export const EXPEL_TIME = 10000 * PLAYBACK_RATE;
const REJOIN_TIME = 400;
const EPSILON = 1e-6;
export type RecoverySource = "live" | "cache" | "donor";
export type Membership =
  | "online"
  | "suspected"
  | "expelled"
  | "rejoining"
  | "recovering";
export interface Attempt {
  id: number;
  transaction: number;
  source: RecoverySource;
  startsAt: number;
  endsAt: number;
}
interface Application {
  transaction: number;
  startsAt: number;
  endsAt: number;
}
export interface Simulation {
  now: number;
  conditions: LagConditions;
  transactions: readonly Transaction[];
  interruptedAt: number | null;
  membership: Membership;
  source: RecoverySource;
  donorRequired: boolean;
  rejoinAt: number | null;
  localRecoveryTarget: number;
  received: number;
  applied: number;
  attempts: Attempt[];
  application: Application | null;
  suspendedProgress: number;
  nextAttempt: number;
}
export function createSimulation(conditions = DEFAULT_CONDITIONS): Simulation {
  return {
    now: 0,
    conditions: normalizeConditions(conditions),
    transactions: [],
    interruptedAt: null,
    membership: "online",
    source: "live",
    donorRequired: false,
    rejoinAt: null,
    localRecoveryTarget: 0,
    received: 0,
    applied: 0,
    attempts: [],
    application: null,
    suspendedProgress: 0,
    nextAttempt: 1,
  };
}
function suspendApplication(state: Simulation) {
  if (!state.application) return;
  const { startsAt, endsAt } = state.application;
  state.suspendedProgress = Math.min(
    1,
    (state.now - startsAt) / (endsAt - startsAt),
  );
  state.application = null;
}
function reconcile(state: Simulation) {
  const now = state.now;
  if (state.application && state.application.endsAt <= now + EPSILON) {
    state.applied = state.application.transaction;
    state.application = null;
    state.suspendedProgress = 0;
  }

  if (state.interruptedAt !== null) {
    const elapsed = now - state.interruptedAt;
    if (elapsed + EPSILON >= EXPEL_TIME) {
      state.membership = "expelled";
      state.donorRequired = true;
      suspendApplication(state);
    } else if (elapsed + EPSILON >= DETECTION_TIME && !state.donorRequired) {
      state.membership = "suspected";
    }
  }
  if (state.rejoinAt !== null && now + EPSILON >= state.rejoinAt) {
    state.rejoinAt = null;
    state.membership = "recovering";
  }
  // Only the contiguous delivered prefix is admitted to B's relay log.
  while (true) {
    const index = state.attempts.findIndex(
      (a) => a.transaction === state.received + 1 && a.endsAt <= now + EPSILON,
    );
    if (index < 0) break;
    state.received++;
    state.attempts.splice(index, 1);
  }
  const canApply =
    state.membership !== "expelled" &&
    state.membership !== "rejoining" &&
    !(state.donorRequired && state.interruptedAt !== null);
  if (canApply && !state.application && state.applied < state.received) {
    const duration = state.conditions.processingTime;
    state.application = {
      transaction: state.applied + 1,
      startsAt: now - state.suspendedProgress * duration,
      endsAt: now + (1 - state.suspendedProgress) * duration,
    };
  }
  const canDeliver =
    state.interruptedAt === null &&
    state.membership !== "rejoining" &&
    (!state.donorRequired || state.applied >= state.localRecoveryTarget);
  if (canDeliver) {
    for (const transaction of state.transactions) {
      if (
        transaction.id <= state.received ||
        state.attempts.some((a) => a.transaction === transaction.id)
      )
        continue;
      // Cache/donor recovery transfers decided transactions only.
      const readyAt =
        state.source === "live"
          ? transaction.dispatchedAt
          : transaction.committedAt;
      if (readyAt > now + EPSILON) continue;
      const last = state.attempts.at(-1);
      const startsAt =
        state.source === "live"
          ? now
          : Math.max(
              now,
              (last?.startsAt ?? now - WRITE_COOLDOWN) + WRITE_COOLDOWN,
            );
      state.attempts.push({
        id: state.nextAttempt++,
        transaction: transaction.id,
        source: state.source,
        startsAt,
        endsAt: Math.max(
          startsAt + state.conditions.linkLatency,
          transaction.committedAt,
          last?.endsAt ?? 0,
        ),
      });
    }
  }
  const committed = state.transactions.filter(
    (t) => t.committedAt <= now + EPSILON,
  ).length;
  if (
    state.interruptedAt === null &&
    state.source === "cache" &&
    state.received === state.transactions.length
  )
    state.source = "live";
  if (
    state.membership === "recovering" &&
    state.applied === committed &&
    committed === state.transactions.length
  ) {
    state.membership = "online";
    state.source = "live";
    state.donorRequired = false;
  }
}
export function nextEventAt(state: Simulation) {
  const candidates = state.transactions.flatMap((t) => [
    t.submittedAt + WRITE_COOLDOWN,
    t.dispatchedAt,
    t.orderedAt,
    t.committedAt,
    t.receivedAt,
    t.fastApplyAt,
    t.fastAppliedAt,
  ]);
  candidates.push(...state.attempts.flatMap((a) => [a.startsAt, a.endsAt]));
  if (state.application) candidates.push(state.application.endsAt);
  if (state.rejoinAt !== null) candidates.push(state.rejoinAt);
  if (state.interruptedAt !== null && state.membership !== "expelled") {
    // One notification per displayed countdown second; no frame-level React updates.
    for (let second = 1; second <= 10; second++)
      candidates.push(state.interruptedAt + second * 1000 * PLAYBACK_RATE);
  }
  return Math.min(...candidates.filter((t) => t > state.now + EPSILON));
}
export function advanceSimulation(input: Simulation, to: number): Simulation {
  const state = structuredClone(input);
  let next = nextEventAt(state);
  while (Number.isFinite(next) && next <= to + EPSILON) {
    state.now = next;
    reconcile(state);
    next = nextEventAt(state);
  }
  if (Number.isFinite(next)) state.now = Math.max(state.now, to);
  reconcile(state);
  return state;
}
export function submitWrite(input: Simulation) {
  if (!canWrite(input.transactions, input.now)) return input;
  const state = structuredClone(input);
  state.transactions = appendTransaction(state.transactions, state.now);
  reconcile(state);
  return state;
}
export function toggleLink(input: Simulation) {
  const state = structuredClone(input);
  if (state.interruptedAt === null) {
    state.interruptedAt = state.now;
    state.attempts = [];
    state.rejoinAt = null;
    if (state.donorRequired) {
      state.membership = "expelled";
      suspendApplication(state);
    }
  } else {
    state.interruptedAt = null;
    if (state.donorRequired) {
      state.membership = "rejoining";
      state.source = "donor";
      state.localRecoveryTarget = state.received;
      state.rejoinAt = state.now + REJOIN_TIME;
    } else {
      state.membership = "online";
      state.source = "cache";
    }
  }
  reconcile(state);
  return state;
}
export function configureSimulation(
  input: Simulation,
  update: Partial<LagConditions>,
) {
  const state = structuredClone(input);
  state.conditions = normalizeConditions({ ...state.conditions, ...update });
  let precedingEnd = 0;
  for (const attempt of state.attempts) {
    const progress = Math.max(
      0,
      (state.now - attempt.startsAt) / (attempt.endsAt - attempt.startsAt),
    );
    const remaining = Math.max(
      (1 - progress) * state.conditions.linkLatency,
      precedingEnd - state.now,
      state.transactions[attempt.transaction - 1].committedAt - state.now,
    );
    if (attempt.startsAt > state.now) {
      attempt.endsAt = Math.max(
        attempt.startsAt + state.conditions.linkLatency,
        precedingEnd,
      );
    } else {
      const duration = remaining / (1 - progress);
      attempt.startsAt = state.now - progress * duration;
      attempt.endsAt = state.now + remaining;
    }
    precedingEnd = attempt.endsAt;
  }
  if (state.application) {
    const progress =
      (state.now - state.application.startsAt) /
      (state.application.endsAt - state.application.startsAt);
    state.application.startsAt =
      state.now - progress * state.conditions.processingTime;
    state.application.endsAt =
      state.now + (1 - progress) * state.conditions.processingTime;
  }
  return state;
}
export function simulationSnapshot(state: Simulation) {
  const snapshot = majoritySnapshot(state.transactions, state.now);
  snapshot.members[2] = {
    id: "b",
    name: "Replica B",
    received: state.received,
    applied: state.applied,
    lag: snapshot.committed - state.applied,
  };
  const flights: Flight[] = snapshot.flights.filter((f) => f.member !== "b");
  for (const attempt of state.attempts) {
    if (attempt.startsAt <= state.now && attempt.endsAt > state.now)
      flights.push({
        transaction: attempt.transaction,
        member: "b",
        kind: "replicating",
        startsAt: attempt.startsAt,
        endsAt: attempt.endsAt,
        attemptId: attempt.id,
        source: attempt.source,
      });
  }
  if (state.application)
    flights.push({
      transaction: state.application.transaction,
      member: "b",
      kind: "applying",
      startsAt: state.application.startsAt,
      endsAt: state.application.endsAt,
    });
  const disconnected = state.interruptedAt !== null;
  const status =
    state.membership === "online"
      ? disconnected
        ? "Disconnected"
        : state.source === "cache"
          ? "Recovering messages"
          : "Online"
      : state.membership === "suspected"
        ? "Suspected unreachable"
        : state.membership === "expelled"
          ? "Expelled"
          : state.membership === "rejoining"
            ? "Rejoining"
            : "Recovering";
  const remaining =
    disconnected && state.membership !== "expelled"
      ? Math.max(
          0,
          ((state.membership === "suspected" ? EXPEL_TIME : DETECTION_TIME) -
            (state.now - state.interruptedAt!)) /
            PLAYBACK_RATE /
            1000,
        )
      : null;
  return {
    ...snapshot,
    flights,
    disconnected,
    membership: state.membership,
    recoverySource: state.source,
    replicaStatus: status,
    countdown: remaining === null ? null : Math.ceil(remaining - EPSILON),
    pending:
      state.applied < state.transactions.length ||
      snapshot.members[1].applied < state.transactions.length,
    reads: snapshot.members.map((m) => ({
      id: m.id,
      name: m.name,
      version: m.applied,
      received: m.received,
      pending: m.received - m.applied,
      available:
        m.id !== "b" || (!disconnected && state.membership === "online"),
      status: m.id === "b" ? status : "Online",
    })),
  };
}
