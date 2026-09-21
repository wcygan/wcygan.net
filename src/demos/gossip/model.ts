export const NODES = ["A", "B", "C", "D", "E"] as const;
export type Node = (typeof NODES)[number];
export type Knowledge = Record<Node, boolean>;
export const DEFAULT_SPEED = 4;
export const BEAT_MS = 3_200;

export type GossipStep =
  | { kind: "cluster" }
  | { kind: "arrival"; node: "E" }
  | { kind: "exchange"; from: Node; to: Node; role: "seed" | "peer" };

// A seed is only E's first contact. After that introduction, ordinary peer
// exchanges carry E's membership information through the existing cluster.
export const STEPS: readonly GossipStep[] = [
  { kind: "cluster" },
  { kind: "arrival", node: "E" },
  { kind: "exchange", from: "E", to: "A", role: "seed" },
  { kind: "exchange", from: "A", to: "B", role: "peer" },
  { kind: "exchange", from: "B", to: "C", role: "peer" },
  { kind: "exchange", from: "A", to: "D", role: "peer" },
];
export const DURATION = STEPS.length * BEAT_MS;

export function exchange(
  knowledge: Knowledge,
  from: Node,
  to: Node,
): Knowledge {
  const knowsE = knowledge[from] || knowledge[to];
  return { ...knowledge, [from]: knowsE, [to]: knowsE };
}

export function snapshot(completed: number) {
  const count = Math.max(0, Math.min(STEPS.length, Math.floor(completed)));
  let knowledge: Knowledge = {
    A: false,
    B: false,
    C: false,
    D: false,
    E: true,
  };
  for (const step of STEPS.slice(0, count)) {
    if (step.kind === "exchange") {
      knowledge = exchange(knowledge, step.from, step.to);
    }
  }
  return {
    knowledge,
    count,
    ePresent: count >= 2,
    done: count === STEPS.length,
    step: STEPS[count],
  };
}

export const CAPTIONS = [
  "A–D already form a Cassandra cluster. E is not a member yet.",
  "New node E approaches the cluster from outside.",
  "E contacts seed A. The seed is its first peer, not a broadcaster.",
  "A gossips E’s membership to B.",
  "B gossips the same membership information to C.",
  "A passes E’s membership to D, the last uninformed peer.",
  "The cluster has converged: every node now knows E.",
] as const;
