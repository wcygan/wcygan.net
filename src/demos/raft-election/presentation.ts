import type { NodeId, Simulation } from "./types";
export const PLAYBACK_RATE = 0.5;
export function describeNode(s: Simulation, id: NodeId) {
  const n = s.nodes[id];
  return `${id} · ${s.crashed.includes(id) ? "crashed" : n.role} · term ${n.term} · voted for ${n.votedFor ?? "nobody"}${n.role === "candidate" ? ` · ${n.votes.length} of 5 votes` : ""}`;
}

export const NODE_COLORS = {
  A: "#efba91",
  B: "#ead082",
  C: "#cbd5a3",
  D: "#e7b2ba",
  E: "#cdbadf",
};

/** Golden-angle hue steps separate adjacent terms without a short repeating cycle. */
export function termColor(term: number) {
  const hue = ((Math.max(1, term) - 1) * 137.50776405003785) % 360;
  return `hsl(${hue.toFixed(4)} 68% 82%)`;
}
