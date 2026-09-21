export const NODES = ["A", "B", "C", "D", "E"] as const;
export type Node = (typeof NODES)[number];
export type Knowledge = Record<Node, number>;
export const BEAT_MS = 2600;

// One illustrative schedule of peer choices, not a simulation of Cassandra's
// entire gossip handshake. Zero means E is unknown; versions share a generation.
export const EXCHANGES: readonly { from: Node; to: Node; stale?: boolean }[] = [
  { from: "E", to: "A" },
  { from: "A", to: "B" },
  { from: "B", to: "A" },
  { from: "B", to: "C" },
  { from: "C", to: "D" },
  { from: "E", to: "D", stale: true },
];
export const DURATION = EXCHANGES.length * BEAT_MS;

export function exchange(
  knowledge: Knowledge,
  from: Node,
  to: Node,
): Knowledge {
  const version = Math.max(knowledge[from], knowledge[to]);
  return { ...knowledge, [from]: version, [to]: version };
}

export function snapshot(completed: number) {
  const count = Math.max(0, Math.min(EXCHANGES.length, Math.floor(completed)));
  let knowledge: Knowledge = { A: 0, B: 0, C: 0, D: 0, E: 2 };
  for (const event of EXCHANGES.slice(0, count)) {
    knowledge = event.stale
      ? { ...knowledge, [event.to]: Math.max(knowledge[event.to], 1) }
      : exchange(knowledge, event.from, event.to);
  }
  return {
    knowledge,
    count,
    done: count === EXCHANGES.length,
    event: EXCHANGES[count],
  };
}

export const CAPTIONS = [
  "E introduces itself to seed A. Only E knows its current state, v2.",
  "A learned about E directly. Now A shares that knowledge with B.",
  "B and A meet again. Both already know E v2; nobody learns anything new.",
  "B passes E’s state to C. C does not need to contact E.",
  "C shares E’s state with D, the last peer that has not heard about E.",
  "All five know E v2. An earlier message from E, carrying v1, arrives late at D.",
  "All five retain E v2. D ignores the delayed v1: newer knowledge wins.",
];
