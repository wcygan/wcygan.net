export const LEADER_STAGES = [
  "Propose",
  "Chosen",
  "Leader lost",
  "Ask C/D/E",
  "Reuse P",
  "Preserved",
] as const;
export const LEADER_MEMBERS = ["A", "B", "C", "D", "E"] as const;
export function leaderSnapshot(step: number) {
  const index = Math.max(0, Math.min(5, step));
  return {
    index,
    leaderId: index === 2 ? null : index >= 3 ? "D" : "A",
    chosen: index >= 1 ? "P" : null,
    leader: index === 2 ? "absent" : index >= 3 ? "replacement" : "original",
    leaderValue: index === 2 || index === 3 ? null : "P",
    consulted: index >= 3 ? ["C", "D", "E"] : [],
    voters: LEADER_MEMBERS.map((name, i) => ({
      name,
      online: name !== "A" || index < 2,
      accepted: index >= 1 && (i < 3 || index === 5) ? "P" : null,
    })),
  };
}
