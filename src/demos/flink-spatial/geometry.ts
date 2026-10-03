import type { Key, RuntimeEdge, RuntimeNodeId } from "./model";

export type Point = [number, number, number];
export interface Box {
  at: Point;
  size: Point;
}
export function face(box: Box, axis: 0 | 1 | 2, direction: -1 | 1): Point {
  const point: Point = [...box.at];
  point[axis] += (box.size[axis] / 2) * direction;
  return point;
}

export const KEY_Z: Record<Key, number> = { Ada: -2.4, Bo: -0.4, Cy: 2.5 };
export const KEY_SOURCE: Box = { at: [-3.5, 0.28, 0], size: [1.3, 0.56, 1.3] };
export function keyTray(key: Key): Box {
  return { at: [0.65, -0.03, KEY_Z[key]], size: [3.2, 0.2, 0.95] };
}
export function keyRoute(key: Key): Point[] {
  const start = face(KEY_SOURCE, 0, 1),
    end = face(keyTray(key), 0, -1);
  return [
    start,
    [-2.15, start[1], start[2]],
    [-2.15, end[1], start[2]],
    [-2.15, end[1], end[2]],
    end,
  ];
}

export const RUNTIME_POSITION: Record<RuntimeNodeId, Point> = {
  input: [-4.2, 0.45, 0],
  sink: [4.2, 0.45, 0],
  jobmanager: [0, 0.5, -4.2],
  "taskmanager-0": [0, -0.22, -1.8],
  "taskmanager-1": [0, -0.22, 1.8],
  "source-0": [-1.3, 0.5, -1.8],
  "count-0": [1.3, 0.5, -1.8],
  "source-1": [-1.3, 0.5, 1.8],
  "count-1": [1.3, 0.5, 1.8],
};
export function runtimeBox(id: RuntimeNodeId): Box {
  return {
    at: RUNTIME_POSITION[id],
    size: id.startsWith("taskmanager")
      ? [5, 0.18, 2.4]
      : id === "input" || id === "sink"
        ? [0.9, 0.9, 0.9]
        : [1.2, 1, 1],
  };
}
export function runtimeRoute(edge: RuntimeEdge): Point[] {
  if (edge.kind === "control") {
    const start = face(runtimeBox(edge.from), 2, 1),
      end = face(runtimeBox(edge.to), 1, 1);
    return [start, [start[0], 1.3, start[2] + 0.3], [end[0], 1.3, end[2]], end];
  }
  const start = face(runtimeBox(edge.from), 0, 1),
    end = face(runtimeBox(edge.to), 0, -1);
  const bend = (start[0] + end[0]) / 2;
  return [start, [bend, start[1], start[2]], [bend, end[1], end[2]], end];
}

export const LIVE_OFFSET: Box = { at: [0, 0.4, -0.9], size: [1.5, 0.8, 1.15] };
export const LIVE_COUNT: Box = { at: [0, 0.4, 0.9], size: [1.5, 0.8, 1.15] };
export const SAVED_OFFSET: Box = {
  at: [3.05, 0.4, -0.75],
  size: [1.5, 0.8, 1.15],
};
export const SAVED_COUNT: Box = {
  at: [3.05, 0.4, 0.75],
  size: [1.5, 0.8, 1.15],
};
export function recoveryRecord(offset: number): Box {
  return { at: [-3.15, 0.3, -1.12 + offset * 0.56], size: [1.8, 0.45, 0.42] };
}
export function recoveryInputRoute(offset: number): Point[] {
  const start = face(recoveryRecord(offset), 0, 1),
    end = face(LIVE_OFFSET, 0, -1);
  return [start, [-1.5, start[1], start[2]], [-1.5, end[1], end[2]], end];
}
export function snapshotRoute(live: Box, saved: Box): Point[] {
  const start = face(live, 0, 1),
    end = face(saved, 0, -1);
  return [start, [1.2, start[1], start[2]], [1.2, end[1], end[2]], end];
}

export function shuffleBox(side: "source" | "owner", lane: 0 | 1): Box {
  return {
    at: [side === "source" ? -2.9 : 2.9, 0.45, lane === 0 ? -1.6 : 1.6],
    size: [1.5, 0.9, 1.2],
  };
}
export function shuffleRoute(source: 0 | 1, owner: 0 | 1): Point[] {
  const a = face(shuffleBox("source", source), 0, 1),
    b = face(shuffleBox("owner", owner), 0, -1);
  return [a, [-0.7, a[1], a[2]], [0.7, b[1], b[2]], b];
}
export function skewTray(lane: number): Box {
  return { at: [0.7, -0.04, -2.7 + lane * 1.8], size: [4, 0.16, 0.95] };
}
export const BARRIER_INPUTS: Box[] = [
  { at: [-3.1, 0.35, -1.3], size: [1.5, 0.7, 1] },
  { at: [-3.1, 0.35, 1.3], size: [1.5, 0.7, 1] },
];
export const BARRIER_OPERATOR: Box = { at: [0, 0.5, 0], size: [1.5, 1, 1.5] };
export const BARRIER_STORAGE: Box = {
  at: [3.2, 0.45, 0],
  size: [1.3, 0.9, 1.3],
};
export function barrierInputRoute(lane: number): Point[] {
  const a = face(BARRIER_INPUTS[lane], 0, 1),
    b = face(BARRIER_OPERATOR, 0, -1);
  return [a, [-1.3, a[1], a[2]], [-1.3, b[1], b[2]], b];
}
