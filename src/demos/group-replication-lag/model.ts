/** Educational timings, not measured MySQL latency. All transactions update
 * the same pre-existing record, so its version is its last applied transaction.
 * Group receipt/order and successful certification are abstracted together;
 * `received` below means admission to the local application queue. */
export const MAX_WRITES = 6;
export interface LagConditions {
  processingTime: number;
  linkLatency: number;
}
export const DEFAULT_CONDITIONS: LagConditions = {
  processingTime: 3000,
  linkLatency: 700,
};

export function normalizeConditions(conditions: LagConditions): LagConditions {
  return {
    processingTime: Math.min(5000, Math.max(400, conditions.processingTime)),
    linkLatency: Math.min(2800, Math.max(700, conditions.linkLatency)),
  };
}

export const PLAYBACK_RATE = 1 / 3;
// A 500ms interaction cooldown, expressed in simulation time.
export const WRITE_COOLDOWN = 500 * PLAYBACK_RATE;

export function canWrite(transactions: readonly Transaction[], time: number) {
  return (
    transactions.length < MAX_WRITES &&
    time + 1e-6 >=
      (transactions.at(-1)?.submittedAt ?? -WRITE_COOLDOWN) + WRITE_COOLDOWN
  );
}

/** Each click submits one write. Application stays serial even for a burst. */
export function appendTransaction(
  transactions: readonly Transaction[],
  submittedAt: number,
): readonly Transaction[] {
  if (!canWrite(transactions, submittedAt)) return transactions;
  const receivedAt = submittedAt + 900;
  const fastApplyAt = Math.max(
    receivedAt,
    transactions.at(-1)?.fastAppliedAt ?? 0,
  );
  return [
    ...transactions,
    {
      id: transactions.length + 1,
      submittedAt,
      dispatchedAt: submittedAt + 200,
      orderedAt: submittedAt + 700,
      committedAt: submittedAt + 900,
      receivedAt,
      fastApplyAt,
      fastAppliedAt: fastApplyAt + 400,
    },
  ];
}

export interface Transaction {
  id: number;
  submittedAt: number;
  dispatchedAt: number;
  orderedAt: number;
  committedAt: number;
  receivedAt: number;
  fastApplyAt: number;
  fastAppliedAt: number;
}

export type MemberId = "primary" | "a" | "b";
export interface Member {
  id: MemberId;
  name: string;
  received: number;
  applied: number;
  lag: number;
}
export interface Flight {
  transaction: number;
  attemptId?: number;
  source?: "live" | "cache" | "donor";
  member: MemberId;
  kind: "ordering" | "replicating" | "committing" | "applying";
  startsAt: number;
  endsAt: number;
}

/** Healthy majority timeline; B is driven by the recovery state machine. */
export function majoritySnapshot(
  transactions: readonly Transaction[],
  time: number,
) {
  const count = (key: keyof Transaction) =>
    transactions.filter((transaction) => transaction[key] <= time).length;
  const committed = count("committedAt");
  const received = count("receivedAt");
  const members: Member[] = [
    {
      id: "primary",
      name: "Primary",
      received: committed,
      applied: committed,
      lag: 0,
    },
    {
      id: "a",
      name: "Replica A",
      received,
      applied: count("fastAppliedAt"),
      lag: committed - count("fastAppliedAt"),
    },
  ];
  const flights: Flight[] = [];
  for (const transaction of transactions) {
    const add = (
      member: MemberId,
      kind: Flight["kind"],
      startsAt: number,
      endsAt: number,
    ) => {
      if (time >= startsAt && time < endsAt)
        flights.push({
          transaction: transaction.id,
          member,
          kind,
          startsAt,
          endsAt,
        });
    };
    // Proposals enter XCom before fanout. Only certified transactions travel
    // into the primary binary log; cached messages remain available afterward.
    add(
      "primary",
      "ordering",
      transaction.submittedAt,
      transaction.dispatchedAt,
    );
    add("a", "replicating", transaction.dispatchedAt, transaction.receivedAt);
    add(
      "primary",
      "committing",
      transaction.orderedAt,
      transaction.committedAt,
    );
    add("a", "applying", transaction.fastApplyAt, transaction.fastAppliedAt);
  }
  return {
    submitted: count("submittedAt"),
    cached: count("dispatchedAt"),
    ordered: count("orderedAt"),
    committed,
    members,
    flights,
  };
}
