export const VOTERS = ["A", "B", "C", "D", "E"] as const;
export const MAJORITY = 3;
export const VOTE_SECONDS = 2.5;
export const VOTE_STAGES = [
  "Propose",
  "Send A",
  "A replies",
  "Send B",
  "B replies",
  "Send C",
  "C replies",
  "Learned",
];
export function votesSnapshot(step: number) {
  const accepted = Math.max(0, Math.min(3, Math.floor(step / 2)));
  const replies = Math.max(0, Math.min(3, Math.floor((step - 1) / 2)));
  return {
    accepted,
    replies,
    known: replies === 3,
    chosen: accepted === 3,
    voters: VOTERS.map((name, index) => ({
      name,
      status:
        index < accepted
          ? "Accepted P"
          : name === "E"
            ? "Unavailable"
            : "Waiting",
    })),
  };
}
