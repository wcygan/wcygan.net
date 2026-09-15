import { candidates, electionTimeout, follower } from "./model";
import type { Simulation } from "./types";

export const PLAYBACK_RATE = 0.5;
export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** Explain local timeout decisions without reading injected transport faults. */
export function outcome(s: Simulation): string {
  const expired = candidates(s);
  if (!expired.length)
    return "Each follower listens for leader B’s heartbeats.";
  const evidence = expired
    .map((id) => {
      const node = follower(s, id);
      const since = node.lastReceived
        ? `its last heartbeat at ${seconds(node.lastReceived.at)}`
        : "the experiment began";
      return `Follower ${id}’s ${seconds(electionTimeout(s, id))} election timer expired at ${seconds(node.electionStartedAt!)}. It heard nothing from leader B since ${since}.`;
    })
    .join(" ");
  return `${evidence} ${expired.length === 1 ? "It would start an election" : "They would start elections"}. Silence is suspicion, not proof that B crashed.`;
}

export function faultSummary(s: Simulation): string {
  return [
    s.transport.crashed ? "Leader B crashed." : null,
    s.transport.cut.length
      ? `Links cut: ${s.transport.cut.map((id) => `B–${id}`).join(", ")}.`
      : null,
    s.transport.dropNext
      ? `Next heartbeat to ${s.transport.dropNext} will drop.`
      : s.transport.lastDrop
        ? `One heartbeat to ${s.transport.lastDrop} dropped.`
        : null,
  ]
    .filter(Boolean)
    .join(" ");
}
