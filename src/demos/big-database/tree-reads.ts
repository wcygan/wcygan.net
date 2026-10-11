import { pointOnPath, type Point } from "./query-flow";

export const TREE_READ_INTERVAL_MS = 400;
export const TREE_TRAVEL_MS = 1800;
export const TREE_FOUND_MS = 650;
// Shuffle a complete hundred-read sample, preserving exact 5/25/70 shares.
const targets: number[] = Array.from({ length: 100 }, (_, i) =>
  i < 5 ? 3 : i < 30 ? 4 : 5,
);
let seed = 73;
for (let i = targets.length - 1; i > 0; i--) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const j = seed % (i + 1);
  [targets[i], targets[j]] = [targets[j], targets[i]];
}
export const TREE_READ_TARGETS: readonly number[] = targets;
export const TREE_LEAF_X = [28, 84, 140, 220, 276, 332] as const;
export function treeReadPath(leaf: number): Point[] {
  return [
    [180, 28],
    [180, 42],
    [180, 62],
    [276, 62],
    [276, 82],
    [276, 110],
    [276, 132],
    [TREE_LEAF_X[leaf], 132],
    [TREE_LEAF_X[leaf], 154],
  ];
}
export function treeReadSnapshot(elapsed: number) {
  const time = Math.max(0, elapsed);
  const last = Math.floor(time / TREE_READ_INTERVAL_MS);
  const first = Math.max(
    0,
    Math.floor(
      (time - TREE_TRAVEL_MS - TREE_FOUND_MS) / TREE_READ_INTERVAL_MS,
    ) + 1,
  );
  const reads = Array.from({ length: last - first + 1 }, (_, i) => {
    const id = first + i;
    const leaf = TREE_READ_TARGETS[id % TREE_READ_TARGETS.length];
    const age = time - id * TREE_READ_INTERVAL_MS;
    return {
      id,
      leaf,
      found: age >= TREE_TRAVEL_MS,
      position: pointOnPath(
        treeReadPath(leaf),
        Math.min(1, age / TREE_TRAVEL_MS),
      ),
    };
  });
  return {
    packets: reads.filter((read) => !read.found),
    found: new Set(reads.filter((read) => read.found).map((read) => read.leaf)),
  };
}
