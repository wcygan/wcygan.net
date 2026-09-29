import { expect, it } from "vitest";
import { MEMBERS, ROUNDS, overlapSnapshot } from "./overlap-model";
it("uses five different majorities and compares the latest pair", () => {
  expect(new Set(ROUNDS.map((r) => r.join(""))).size).toBe(5);
  for (const round of ROUNDS) expect(new Set(round).size).toBe(3);
  expect(overlapSnapshot(0).shared).toEqual([]);
  expect(ROUNDS.map((_, i) => overlapSnapshot(i + 1).shared)).toEqual([
    [],
    ["C"],
    ["D", "E"],
    ["A", "D"],
    ["B"],
  ]);
});
it("every possible pair of three-member majorities intersects among five voters", () => {
  const quorums = MEMBERS.flatMap((a, i) =>
    MEMBERS.slice(i + 1).flatMap((b, j) =>
      MEMBERS.slice(i + j + 2).map((c) => [a, b, c]),
    ),
  );
  expect(quorums).toHaveLength(10);
  for (const a of quorums)
    for (const b of quorums)
      expect(a.some((member) => b.includes(member))).toBe(true);
});

it("starts without a quorum", () => {
  expect(overlapSnapshot(0).current).toEqual([]);
  expect(overlapSnapshot(1).current).toEqual(["A", "B", "C"]);
});
