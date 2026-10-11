import { servers, type Message, type Server, type Step } from "./model";

export type Point = readonly [number, number];
export type Bounds = { x: number; y: number; width: number; height: number };
export function electionLayout(compact: boolean) {
  const width = compact ? 380 : 600;
  const nodeSize = { width: compact ? 136 : 162, height: 68 };
  const nodes = {} as Record<Server, Bounds>;
  nodes.B = {
    x: compact ? 12 : 24,
    y: 142,
    ...nodeSize,
  };
  servers
    .filter((server) => server !== "B")
    .forEach((server, index) => {
      nodes[server] = {
        x: compact ? 202 : 396,
        y: 25 + index * 76,
        ...nodeSize,
      };
    });
  return { width, height: 340, nodes, trunk: compact ? 166 : 286 };
}
const port = (bounds: Bounds, side: "left" | "right"): Point => [
  bounds.x + (side === "right" ? bounds.width : 0),
  bounds.y + bounds.height / 2,
];
export function messageRoute(
  layout: ReturnType<typeof electionLayout>,
  message: NonNullable<Step["traffic"]>[number],
): Point[] {
  if (message.kind === "vote")
    return messageRoute(layout, {
      kind: "request",
      from: message.to,
      to: message.from,
    }).reverse();
  const from = layout.nodes[message.from],
    to = layout.nodes[message.to];
  if (message.from === "B" || message.to === "B") {
    const outgoing = message.from === "B";
    const start = port(from, outgoing ? "right" : "left");
    const end = port(to, outgoing ? "left" : "right");
    const trunk = layout.trunk;
    return [start, [trunk, start[1]], [trunk, end[1]], end];
  }
  const start = port(from, "right"),
    end = port(to, "right");
  const trunk = layout.width - 22;
  return [start, [trunk, start[1]], [trunk, end[1]], end];
}

// Draw each shared trunk once, with a stable dash origin in both directions.
export function connectionWires(
  layout: ReturnType<typeof electionLayout>,
  connections: readonly Message[],
) {
  const lines = new Map<
    string,
    {
      vertical: boolean;
      fixed: number;
      spans: [number, number][];
    }
  >();
  for (const message of connections) {
    const route = messageRoute(layout, message);
    for (let index = 1; index < route.length; index++) {
      const [start, end] = [route[index - 1], route[index]];
      const vertical = start[0] === end[0];
      const fixed = start[vertical ? 0 : 1];
      const axis = vertical ? 1 : 0;
      const key = `${vertical}:${fixed}`;
      const line = lines.get(key) ?? {
        vertical,
        fixed,
        spans: [],
      };
      line.spans.push([
        Math.min(start[axis], end[axis]),
        Math.max(start[axis], end[axis]),
      ]);
      lines.set(key, line);
    }
  }
  return [...lines.values()].flatMap(({ vertical, fixed, spans }) => {
    const merged: [number, number][] = [];
    for (const span of spans.sort((a, b) => a[0] - b[0])) {
      const previous = merged.at(-1);
      if (previous && span[0] <= previous[1])
        previous[1] = Math.max(previous[1], span[1]);
      else merged.push([...span]);
    }
    return merged.map(
      ([start, end]) =>
        (vertical
          ? [
              [fixed, start],
              [fixed, end],
            ]
          : [
              [start, fixed],
              [end, fixed],
            ]) as Point[],
    );
  });
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
    const dx = Math.sign(tip[0] - previous[0]);
    const dy = Math.sign(tip[1] - previous[1]);
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
