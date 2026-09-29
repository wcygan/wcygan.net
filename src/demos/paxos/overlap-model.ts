export const MEMBERS = ["A", "B", "C", "D", "E"] as const;
export type Member = (typeof MEMBERS)[number];
export const ROUNDS: readonly (readonly Member[])[] = [
  ["A", "B", "C"],
  ["C", "D", "E"],
  ["A", "D", "E"],
  ["A", "B", "D"],
  ["B", "C", "E"],
];
export function overlapSnapshot(round: number) {
  const index = Math.max(0, Math.min(ROUNDS.length, round));
  const current: readonly Member[] = index > 0 ? ROUNDS[index - 1] : [];
  const previous: readonly Member[] = index > 1 ? ROUNDS[index - 2] : [];
  const shared = current.filter((member) => previous.includes(member));
  return { index, current, previous, shared };
}
