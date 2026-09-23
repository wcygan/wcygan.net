import {
  BACK_REPLICA_HEIGHT,
  COORDINATOR_RADIUS,
  DATABASE_HEIGHT,
  DATABASE_RADIUS,
  REPLICA_HEIGHT,
  nodeRadius,
  type Point,
  positionsFor,
  routeBetween,
} from "./geometry";
import type { NodeId } from "./types";

export interface ViewAnchor {
  position: Point;
  /** Screen-space half-width and half-height; HTML labels do not scale with zoom. */
  padding: [number, number];
}

function viewAnchors(replicated: boolean): ViewAnchor[] {
  const layout = replicated ? "replicated" : "split";
  const positions = positionsFor(layout);
  const shift = replicated ? 0.25 : 0.45;
  const anchors: ViewAnchor[] = [];
  const add = (position: Point, padding: [number, number] = [2, 2]) => {
    anchors.push({
      position: [position[0], position[1] + shift, position[2]],
      padding,
    });
  };
  const body = (center: Point, radius: number, height: number) => {
    for (const x of [-radius, radius]) {
      for (const y of [-height / 2, height / 2]) {
        for (const z of [-radius, radius]) {
          add([center[0] + x, center[1] + y, center[2] + z]);
        }
      }
    }
  };
  const wire = (from: NodeId, to: NodeId) => {
    routeBetween(positions, layout, from, to).forEach((point) => add(point));
  };
  if (!replicated) {
    for (const id of ["a", "b"] as const) {
      const [x, , z] = positions[id];
      body(positions[id], DATABASE_RADIUS, DATABASE_HEIGHT);
      add([x, 1.1, z], [70, 7]);
      add([x, -2.3, z], [70, 45]);
      wire("coordinator", id);
    }
    body(positions.coordinator, COORDINATOR_RADIUS, COORDINATOR_RADIUS * 2);
    add([0, 0.85, positions.coordinator[2]], [50, 7]);
    add([0, -0.68, positions.coordinator[2]], [70, 15]);
  } else {
    for (const group of ["a", "b"] as const) {
      add([positions[group][0], 1.7, -4], [30, 7]);
      add([positions[group][0], -2.6, positions[group][2]], [70, 45]);
    }
    for (const id of ["a", "a2", "a3", "b", "b2", "b3"] as const) {
      const [x, , z] = positions[id];
      const front = id.length === 1;
      const height = front ? REPLICA_HEIGHT : BACK_REPLICA_HEIGHT;
      const radius = nodeRadius(layout, id);
      body(positions[id], radius, height);
      add([x, height * 0.2, z + radius + 0.02], [10, 7]);
      add([x, height / 2 + 0.52, z], [55, 7]);
      add([x, -height / 2 - 0.4, z], [front ? 57 : 30, 7]);
    }
    for (const [from, to] of [
      ["a", "a2"],
      ["a", "a3"],
      ["a2", "a3"],
      ["b", "b2"],
      ["b", "b3"],
      ["a", "b"],
      ["a2", "b"],
    ] as const)
      wire(from, to);
  }
  return anchors;
}

const NORMAL_ANCHORS = viewAnchors(false);
const REPLICATED_ANCHORS = viewAnchors(true);

/** Fixed bounds prevent camera motion as protocol state or labels change. */
export function transactionViewAnchors(
  replicated: boolean,
): readonly ViewAnchor[] {
  return replicated ? REPLICATED_ANCHORS : NORMAL_ANCHORS;
}

export interface TransactionZoomOptions {
  replicated: boolean;
  width: number;
  height: number;
  /** Normalized camera basis vectors in world space, looking at the origin. */
  right: Point;
  up: Point;
  defaultFit: number;
}

/** Fit projected geometry and fixed-size labels without enlarging the approved default. */
export function fitTransactionZoom({
  replicated,
  width,
  height,
  right,
  up,
  defaultFit,
}: TransactionZoomOptions): number {
  const halfWidth = width / 2 - 4;
  const halfHeight = height / 2 - 4;
  let zoom = defaultFit;
  for (const { position, padding } of transactionViewAnchors(replicated)) {
    const x = Math.abs(
      position.reduce((sum, value, axis) => sum + value * right[axis], 0),
    );
    const y = Math.abs(
      position.reduce((sum, value, axis) => sum + value * up[axis], 0),
    );
    if (x > 0) zoom = Math.min(zoom, Math.max(0, halfWidth - padding[0]) / x);
    if (y > 0) zoom = Math.min(zoom, Math.max(0, halfHeight - padding[1]) / y);
  }
  return zoom;
}
