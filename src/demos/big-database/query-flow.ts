export type LookupMode = "hit" | "miss" | "secondary";
export type Point = readonly [number, number];
export const FLOW_STEP_MS = 2_000;

// Endpoints are face centers of the diagram's authored node bounds.
export const FLOW_PATHS = {
  lookup: [
    [160, 80],
    [160, 130],
  ],
  disk: [
    [160, 190],
    [160, 260],
  ],
  fill: [
    [60, 290],
    [30, 290],
    [30, 160],
    [60, 160],
  ],
  result: [
    [260, 160],
    [290, 160],
    [290, 415],
    [260, 415],
  ],
  secondaryRoot: [
    [300, 90],
    [300, 105],
    [150, 105],
    [150, 120],
  ],
  secondaryLeaf: [
    [150, 170],
    [150, 190],
    [75, 190],
    [75, 210],
  ],
  primaryKey: [
    [75, 300],
    [75, 365],
    [300, 365],
    [300, 440],
  ],
  clusteredRoot: [
    [300, 490],
    [300, 505],
    [150, 505],
    [150, 520],
  ],
  clusteredLeaf: [
    [150, 570],
    [150, 590],
    [75, 590],
    [75, 610],
  ],
} as const satisfies Record<string, readonly Point[]>;

const lookup = {
  label: "Index lookup",
  path: "lookup",
  node: "index",
  reads: 0,
} as const;
const check = {
  label: "Buffer pool check",
  node: "pool",
  reads: 0,
} as const;
const result = {
  label: "Cached page read",
  path: "result",
  node: "pool",
  reads: 0,
} as const;
const hitSteps = [
  lookup,
  check,
  result,
  {
    label: "Order 9001 returned · 0 SSD reads",
    node: "row",
    reads: 0,
  },
] as const;
const missSteps = [
  lookup,
  check,
  {
    label: "Cache miss · SSD read",
    path: "disk",
    node: "ssd",
    reads: 0,
  },
  {
    label: "Buffer pool fill",
    path: "fill",
    node: "pool",
    reads: 1,
  },
  { ...result, reads: 1 },
  {
    label: "Order 9001 returned · 1 SSD read",
    node: "row",
    reads: 1,
  },
] as const;
const secondarySteps = [
  {
    label: "Email root · left branch",
    path: "secondaryRoot",
    node: "index",
    reads: 0,
  },
  {
    label: "Email branch · left leaf",
    path: "secondaryLeaf",
    node: "pool",
    reads: 0,
  },
  {
    label: "Email leaf · primary key 9001",
    node: "pool",
    reads: 0,
  },
  {
    label: "Clustered index root · key 9001",
    path: "primaryKey",
    node: "ssd",
    reads: 0,
  },
  {
    label: "Primary-key root · left branch",
    path: "clusteredRoot",
    node: "ssd",
    reads: 0,
  },
  {
    label: "Primary-key branch · left leaf",
    path: "clusteredLeaf",
    node: "ssd",
    reads: 0,
  },
  {
    label: "Row 9001 · status = paid",
    node: "row",
    reads: 0,
  },
  {
    label: "Order 9001 returned · 2 index traversals",
    node: "row",
    reads: 0,
  },
] as const;
export function flowSteps(mode: LookupMode) {
  return mode === "secondary"
    ? secondarySteps
    : mode === "hit"
      ? hitSteps
      : missSteps;
}
export function flowDuration(mode: LookupMode) {
  return flowSteps(mode).length * FLOW_STEP_MS;
}

export function pointOnPath(points: readonly Point[], progress: number): Point {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let distance =
    Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]) {
      const fraction = lengths[i] ? distance / lengths[i] : 0;
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * fraction,
        points[i][1] + (points[i + 1][1] - points[i][1]) * fraction,
      ];
    }
    distance -= lengths[i];
  }
  return points[points.length - 1];
}

export function flowSnapshot(mode: LookupMode, elapsed: number) {
  const steps = flowSteps(mode);
  const step = Math.min(
    steps.length - 1,
    Math.floor(Math.max(0, elapsed) / FLOW_STEP_MS),
  );
  const current = steps[step];
  const complete = elapsed >= flowDuration(mode);
  const progress = complete
    ? 1
    : (Math.max(0, elapsed) % FLOW_STEP_MS) / FLOW_STEP_MS;
  const path = "path" in current ? current.path : undefined;
  return {
    step,
    current,
    complete,
    path,
    packet:
      path && progress < 0.75
        ? pointOnPath(FLOW_PATHS[path], progress / 0.75)
        : undefined,
  };
}
