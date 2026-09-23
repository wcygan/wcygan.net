import type { Message, NodeId, TransactionFrame } from "./types";

export type Point = [number, number, number];
export type Positions = Record<NodeId, Point>;

export const DATABASE_RADIUS = 0.7;
export const DATABASE_HEIGHT = 1.25;
export const REPLICA_RADIUS = 0.66;
export const REPLICA_HEIGHT = 1.18;
export const BACK_REPLICA_RADIUS = 0.5;
export const BACK_REPLICA_HEIGHT = 0.9;
export const COORDINATOR_RADIUS = 0.32;
export const CONNECTION_HEIGHT = 0;
const ROUTE_CLEARANCE = 0.35;
const CROSS_GROUP_ROW = -0.3;

/** Match the visible cylinder at its fixed position, independent of leadership. */
export function nodeRadius(
  layout: TransactionFrame["layout"],
  id: NodeId,
): number {
  if (id === "coordinator") return COORDINATOR_RADIUS;
  if (layout !== "replicated") return DATABASE_RADIUS;
  return id === "a" || id === "b" ? REPLICA_RADIUS : BACK_REPLICA_RADIUS;
}

export interface TransactionConnection {
  from: NodeId;
  to: NodeId;
  interrupted: boolean;
  active: boolean;
}

/** One physical wire per pair, shared by static topology and both traffic directions. */
export function connectionsFor(
  frame: TransactionFrame,
  messages: Message[],
): TransactionConnection[] {
  const connections = new Map<string, TransactionConnection>();
  const add = (
    from: NodeId,
    to: NodeId,
    interrupted = false,
    active = false,
  ) => {
    const key = [from, to].sort().join(":");
    const connection = connections.get(key);
    if (connection) {
      connection.interrupted ||= interrupted;
      connection.active ||= active;
    } else {
      connections.set(key, { from, to, interrupted, active });
    }
  };

  if (frame.layout === "split" && frame.coordinator.visible) {
    for (const id of ["a", "b"] as const) {
      add(
        "coordinator",
        id,
        !frame.coordinator.online || (id === "b" && frame.isolated),
      );
    }
  } else if (frame.layout === "replicated") {
    for (const group of ["a", "b"] as const) {
      const nodes = frame.replicas.filter((node) => node.group === group);
      const leader = nodes.find((node) => node.leader);
      if (!leader) continue;
      for (const node of nodes) {
        if (node.id !== leader.id) {
          add(leader.id, node.id, !leader.online || !node.online);
        }
      }
    }
    const leaderA = frame.replicas.find(
      (node) => node.group === "a" && node.leader,
    );
    const leaderB = frame.replicas.find(
      (node) => node.group === "b" && node.leader,
    );
    if (leaderA && leaderB) {
      add(leaderA.id, leaderB.id, !frame.coordinator.online);
    }
  }
  for (const message of messages) {
    add(message.from, message.to, false, true);
  }
  return [...connections.values()];
}

/** Server centers also anchor ports and packets; together-mode A/B are account anchors. */
export function positionsFor(layout: TransactionFrame["layout"]): Positions {
  if (layout === "replicated") {
    return {
      coordinator: [0, 0, -4.8],
      a: [-2.5, 0, 3],
      a2: [-3.4, 0, -4],
      a3: [-1.6, 0, -4],
      b: [2.5, 0, 3],
      b2: [1.6, 0, -4],
      b3: [3.4, 0, -4],
    };
  }
  const x = layout === "together" ? 1.35 : 2.2;
  return {
    coordinator: [0, 0, -7],
    a: [-x, 0, 0],
    b: [x, 0, 0],
    a2: [-x, 0, -2],
    b2: [x, 0, -2],
    a3: [-x, 0, -4],
    b3: [x, 0, -4],
  };
}

const planePoint = (x: number, z: number): Point => [x, CONNECTION_HEIGHT, z];

/** Both the connector and its packet use this exact surface-to-surface path. */
export function routeBetween(
  positions: Positions,
  layout: TransactionFrame["layout"],
  from: NodeId,
  to: NodeId,
): Point[] {
  // Route each unordered pair once, including floating-point arithmetic. Replies
  // then follow the very same wire even when routing depends on the front row.
  if (from > to) return routeBetween(positions, layout, to, from).reverse();
  const start = positions[from];
  const end = positions[to];
  const port = (id: NodeId, toward: Point): Point => {
    const center = positions[id];
    const dx = toward[0] - center[0];
    const dz = toward[2] - center[2];
    const distance = Math.hypot(dx, dz);
    if (distance === 0) return planePoint(center[0], center[2]);
    const extent = nodeRadius(layout, id);
    return planePoint(
      center[0] + (dx / distance) * extent,
      center[2] + (dz / distance) * extent,
    );
  };
  if (from === "coordinator" || to === "coordinator") {
    const participant = from === "coordinator" ? to : from;
    const center = positions[participant];
    const outside =
      center[0] +
      Math.sign(center[0]) *
        (nodeRadius(layout, participant) + ROUTE_CLEARANCE);
    const near = planePoint(outside, positions.coordinator[2]);
    const far = planePoint(outside, center[2]);
    const route = [
      port("coordinator", near),
      near,
      far,
      port(participant, far),
    ];
    return from === "coordinator" ? route : route.reverse();
  }
  if (layout === "replicated" && start[2] !== end[2]) {
    const front = start[2] > end[2] ? from : to;
    const back = front === from ? to : from;
    const frontCenter = positions[front];
    const backCenter = positions[back];
    const sameGroup = Math.sign(frontCenter[0]) === Math.sign(backCenter[0]);
    const groupFront = positions[back.startsWith("a") ? "a" : "b"];
    const outside =
      backCenter[0] +
      Math.sign(backCenter[0] - groupFront[0]) *
        (nodeRadius(layout, back) + ROUTE_CLEARANCE);
    const rearTurn = planePoint(outside, backCenter[2]);
    let route: Point[];
    if (sameGroup) {
      const frontTurn = planePoint(outside, frontCenter[2]);
      route = [
        port(back, rearTurn),
        rearTurn,
        frontTurn,
        port(front, frontTurn),
      ];
    } else {
      // A replacement leader must first clear its neighbor in the back row.
      // Cross the empty row before joining the center channel between groups.
      const clearTurn = planePoint(outside, CROSS_GROUP_ROW);
      const centerTurn = planePoint(0, CROSS_GROUP_ROW);
      const frontTurn = planePoint(0, frontCenter[2]);
      route = [
        port(back, rearTurn),
        rearTurn,
        clearTurn,
        centerTurn,
        frontTurn,
        port(front, frontTurn),
      ];
    }
    return from === back ? route : route.reverse();
  }
  if (layout === "replicated" && start[0] * end[0] < 0 && start[2] < 0) {
    // A cross-group back-row route cannot run through the inner replicas.
    const firstTurn = planePoint(start[0], CROSS_GROUP_ROW);
    const lastTurn = planePoint(end[0], CROSS_GROUP_ROW);
    return [port(from, firstTurn), firstTurn, lastTurn, port(to, lastTurn)];
  }
  return [port(from, end), port(to, start)];
}

/** Distance-based interpolation keeps packets at one speed around route bends. */
export function pointOnRoute(points: Point[], progress: number): Point {
  if (progress <= 0) return [...points[0]];
  if (progress >= 1) return [...points.at(-1)!];
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(...point.map((value, axis) => value - points[index][axis])),
    );
  let remaining =
    Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = lengths[i] === 0 ? 0 : remaining / lengths[i];
      return points[i].map(
        (value, axis) => value + (points[i + 1][axis] - value) * t,
      ) as Point;
    }
    remaining -= lengths[i];
  }
  return [...points.at(-1)!];
}
