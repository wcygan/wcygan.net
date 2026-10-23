import {
  electionServers as servers,
  type Message,
  type ElectionServer as Server,
  type Step,
} from "./model";

export type Point = readonly [number, number];
export type Bounds = { x: number; y: number; width: number; height: number };

export const payloadTetherGap = 28;
export function electionLayout(compact: boolean, splitVote = false) {
  const width = compact ? 360 : 600;
  const centers: Record<Server, Point> = {
    A: [width / 2, 48],
    B: [compact ? 70 : 120, 220],
    C: [width - (compact ? 70 : 120), 220],
  };
  const nodes = Object.fromEntries(
    servers.map((id) => [
      id,
      { x: centers[id][0] - 20, y: centers[id][1] - 20, width: 40, height: 40 },
    ]),
  ) as Record<Server, Bounds>;
  return {
    width,
    // Reserve extra tally rows only for the split-vote scenario.
    height: (compact ? 413 : 405) + (splitVote ? 46 : 0),
    sidePadding: compact ? 80 : 32,
    top: compact ? -92 : -72,
    payloadWidth: 128,
    payloadHeight: compact ? 72 : 64,
    textPitch: compact ? 20 : 18,
    detailCenters: { A: width / 2, B: centers.B[0] - 96, C: centers.C[0] + 96 },
    detailOffsets: compact ? [0, 20, 40, 56, 80] : [0, 16, 32, 44, 62],
    aDetailOffsets: compact
      ? [-120, -100, -80, -64, -40]
      : [-102, -86, -70, -58, -40],
    nodes,
    centers,
    tallyY: compact ? 348 : 340,
  };
}
export function messageRoute(
  layout: ReturnType<typeof electionLayout>,
  message: NonNullable<Step["traffic"]>[number],
): Point[] {
  const from = layout.centers[message.from],
    to = layout.centers[message.to];
  const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const dx = (to[0] - from[0]) / distance,
    dy = (to[1] - from[1]) / distance;
  return [
    [from[0] + dx * 20, from[1] + dy * 20],
    [to[0] - dx * 20, to[1] - dy * 20],
  ];
}

// Move the metadata parallel to its packet, with the same visible tether gap
// on horizontal and diagonal routes. The tether points outside the triangle.
export function payloadLabelPosition(
  message: Pick<Message, "from" | "to">,
  point: Point,
  layout: ReturnType<typeof electionLayout>,
): Point {
  let direction: Point = [0, 1];
  if (message.from === "A" || message.to === "A") {
    const peer = message.from === "A" ? message.to : message.from;
    const dx = layout.centers[peer][0] - layout.centers.A[0];
    // A shallow outward tether leaves the space directly above A free.
    // The label still follows the packet diagonally at a fixed distance.
    direction = [Math.sign(dx) * Math.sqrt(1 - 0.4 ** 2), -0.4];
  }
  const edgeDistance = Math.min(
    layout.payloadWidth / 2 / Math.abs(direction[0]),
    layout.payloadHeight / 2 / Math.abs(direction[1]),
  );
  const offset = edgeDistance + payloadTetherGap;
  return [point[0] + direction[0] * offset, point[1] + direction[1] * offset];
}

// A direct edge has one stable dash origin, even when both peers send messages.
export function connectionWires(
  layout: ReturnType<typeof electionLayout>,
  connections: readonly Message[],
) {
  const edges = new Map<string, Point[]>();
  for (const message of connections) {
    const route = messageRoute(layout, message);
    const forward = message.from < message.to;
    edges.set(
      [message.from, message.to].sort().join(":"),
      forward ? route : route.reverse(),
    );
  }
  return [...edges.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, route]) => route);
}

export function connectionArrows(
  layout: ReturnType<typeof electionLayout>,
  connections: readonly Message[],
  replying: boolean,
) {
  const arrows = new Map<string, Point[]>();
  for (const message of connections) {
    const route = messageRoute(layout, message);
    if (replying) route.reverse();
    const tip = route.at(-1)!;
    const previous = route.at(-2)!;
    const length = Math.hypot(tip[0] - previous[0], tip[1] - previous[1]);
    const dx = (tip[0] - previous[0]) / length;
    const dy = (tip[1] - previous[1]) / length;
    arrows.set(`${tip}:${dx}:${dy}`, [
      tip,
      [tip[0] - dx * 6 - dy * 3, tip[1] - dy * 6 + dx * 3],
      [tip[0] - dx * 6 + dy * 3, tip[1] - dy * 6 - dx * 3],
    ]);
  }
  return [...arrows.values()];
}
export function pointOnRoute(
  points: readonly Point[],
  progress: number,
): Point {
  if (progress <= 0) return points[0];
  if (progress >= 1) return points.at(-1)!;
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - points[index][0], point[1] - points[index][1]),
    );
  let distance =
    lengths.reduce((sum, length) => sum + length, 0) *
    Math.max(0, Math.min(1, progress));
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index]) {
      const ratio = lengths[index] ? distance / lengths[index] : 0;
      return [
        points[index][0] + (points[index + 1][0] - points[index][0]) * ratio,
        points[index][1] + (points[index + 1][1] - points[index][1]) * ratio,
      ];
    }
    distance -= lengths[index];
  }
  return points.at(-1)!;
}
