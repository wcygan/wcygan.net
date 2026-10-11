import { expect, it } from "vitest";
import {
  TREE_READ_TARGETS,
  TREE_READ_INTERVAL_MS,
  TREE_TRAVEL_MS,
  TREE_FOUND_MS,
  TREE_LEAF_X,
  treeReadSnapshot,
} from "./tree-reads";

it("allocates exactly 5, 25, and 70 percent to the right subtree", () => {
  expect(
    [3, 4, 5].map(
      (leaf) => TREE_READ_TARGETS.filter((target) => target === leaf).length,
    ),
  ).toEqual([5, 25, 70]);
});
it("highlights only after reaching the target and clears the highlight afterward", () => {
  const leaf = TREE_READ_TARGETS[0];
  expect(treeReadSnapshot(TREE_TRAVEL_MS - 1).found.has(leaf)).toBe(false);
  expect(treeReadSnapshot(TREE_TRAVEL_MS).found.has(leaf)).toBe(true);
  // Isolate the first arrival from the following reads' arrival times.
  const arrival = treeReadSnapshot(TREE_TRAVEL_MS - 1).packets.find(
    (read) => read.id === 0,
  )!;
  expect(arrival.position[0]).toBeCloseTo(TREE_LEAF_X[leaf], 0);
  expect(arrival.position[1]).toBeCloseTo(154, 0);
  expect(
    treeReadSnapshot(TREE_TRAVEL_MS + TREE_FOUND_MS).packets.some(
      (read) => read.id === 0,
    ),
  ).toBe(false);
});
it("keeps a small number of reads in flight across sample boundaries", () => {
  for (const time of [
    100 * TREE_READ_INTERVAL_MS - 1,
    100 * TREE_READ_INTERVAL_MS,
    3600000,
  ]) {
    const state = treeReadSnapshot(time);
    expect(state.packets.length).toBeGreaterThan(0);
    expect(state.packets.length).toBeLessThanOrEqual(5);
    expect(state.packets.every((read) => read.leaf >= 3)).toBe(true);
  }
});
