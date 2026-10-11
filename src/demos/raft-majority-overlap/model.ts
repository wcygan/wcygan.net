import { type Server } from "../raft-election-overview/model";

// All ten possible three-server majorities in a five-server cluster.
export const majorities = [
  ["A", "B", "C"],
  ["A", "D", "E"],
  ["B", "C", "D"],
  ["A", "B", "D"],
  ["C", "D", "E"],
  ["A", "C", "E"],
  ["A", "B", "E"],
  ["B", "D", "E"],
  ["B", "C", "E"],
  ["A", "C", "D"],
] as const satisfies readonly (readonly Server[])[];

export function overlapRound(index: number) {
  const current: readonly Server[] = majorities[index];
  const previous: readonly Server[] =
    majorities[(index + majorities.length - 1) % majorities.length];
  return {
    current,
    previous,
    shared: current.filter((server) => previous.includes(server)),
  };
}
