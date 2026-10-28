export type Point = readonly [number, number];
export type Broker = 0 | 1 | 2;
export type RecordLabel = "A" | "B";
export type ReplicationStage = {
  name: string;
  leader: Broker | null;
  failed?: boolean;
  logs: readonly [string, string, string];
  move?: {
    from: Broker | "producer";
    to: Broker;
    label: RecordLabel | "fetch";
  };
};
export const brokers = [0, 1, 2] as const;
export const layout = {
  producer: [16, 135, 116, 50],
  nodes: [
    [190, 114],
    [410, 24],
    [410, 204],
  ],
  w: 172,
  h: 92,
} as const;
export const stages: readonly ReplicationStage[] = [
  {
    name: "Producer writes A",
    leader: 0,
    logs: ["", "", ""],
    move: { from: "producer", to: 0, label: "A" },
  },
  {
    name: "Follower fetches A",
    leader: 0,
    logs: ["A", "", ""],
    move: { from: 1, to: 0, label: "fetch" },
  },
  {
    name: "A reaches Broker 1",
    leader: 0,
    logs: ["A", "", ""],
    move: { from: 0, to: 1, label: "A" },
  },
  {
    name: "Follower fetches A",
    leader: 0,
    logs: ["A", "A", ""],
    move: { from: 2, to: 0, label: "fetch" },
  },
  {
    name: "A reaches Broker 2",
    leader: 0,
    logs: ["A", "A", ""],
    move: { from: 0, to: 2, label: "A" },
  },
  { name: "Broker 0 fails", leader: null, failed: true, logs: ["A", "A", "A"] },
  {
    name: "Broker 1 becomes leader",
    leader: 1,
    failed: true,
    logs: ["A", "A", "A"],
  },
  {
    name: "Producer writes B",
    leader: 1,
    failed: true,
    logs: ["A", "A", "A"],
    move: { from: "producer", to: 1, label: "B" },
  },
  {
    name: "Follower fetches B",
    leader: 1,
    failed: true,
    logs: ["A", "AB", "A"],
    move: { from: 2, to: 1, label: "fetch" },
  },
  {
    name: "B reaches Broker 2",
    leader: 1,
    failed: true,
    logs: ["A", "AB", "A"],
    move: { from: 1, to: 2, label: "B" },
  },
  {
    name: "Two replicas in sync",
    leader: 1,
    failed: true,
    logs: ["A", "AB", "AB"],
  },
];
const speed = 250;
export function logOrigin(i: Broker): Point {
  const [x, y] = layout.nodes[i];
  return [x + 14, y + 58];
}
export function port(i: Broker | "producer", right = false): Point {
  if (i === "producer") {
    const [x, y, w, h] = layout.producer;
    return [x + w, y + h / 2];
  }
  const [x, y] = layout.nodes[i];
  return [x + (right ? layout.w : 0), y + layout.h / 2];
}
export function routePoints(from: Broker | "producer", to: Broker): Point[] {
  const a = port(
    from,
    from === "producer" || layout.nodes[from][0] < layout.nodes[to][0],
  );
  const b = port(
    to,
    from !== "producer" && layout.nodes[from][0] > layout.nodes[to][0],
  );
  const followerGutter = layout.nodes[1][0] - 20;
  if (from === "producer" && to === 1) {
    const producerGutter = (a[0] + layout.nodes[0][0]) / 2;
    const [, leaderY] = layout.nodes[0];
    if (b[1] >= leaderY && b[1] <= leaderY + layout.h) {
      const top = Math.min(...layout.nodes.map((p) => p[1])) - 18;
      return [
        a,
        [producerGutter, a[1]],
        [producerGutter, top],
        [followerGutter, top],
        [followerGutter, b[1]],
        b,
      ];
    }
    return [a, [producerGutter, a[1]], [producerGutter, b[1]], b];
  }
  if (from !== "producer" && layout.nodes[from][0] === layout.nodes[to][0])
    return [a, [followerGutter, a[1]], [followerGutter, b[1]], b];
  return [a, b];
}
export function position(points: readonly Point[], progress: number): Point {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let distance = lengths.reduce((a, b) => a + b, 0) * progress;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]) {
      const t = lengths[i] ? distance / lengths[i] : 1;
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * t,
        points[i][1] + (points[i + 1][1] - points[i][1]) * t,
      ];
    }
    distance -= lengths[i];
  }
  return points[points.length - 1];
}
export function motionPath(state: ReplicationStage): Point[] {
  if (!state.move) return [];
  const points = routePoints(state.move.from, state.move.to);
  if (state.move.label !== "fetch") {
    const [x, y] = logOrigin(state.move.to);
    const entry = points[points.length - 1];
    points.push(
      [entry[0], y + 12],
      [x + state.logs[state.move.to].length * 36 + 14, y + 12],
    );
  }
  return points;
}
export function timing(state: ReplicationStage) {
  if (!state.move)
    return { moving: 0, total: state.leader === null ? 1000 : 1100 };
  const points = motionPath(state);
  const length = points
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]),
      0,
    );
  const moving = (length / speed) * 1000;
  return { moving, total: moving + 350 };
}

export const stageStarts = stages.map((_, i) =>
  stages.slice(0, i).reduce((total, state) => total + timing(state).total, 0),
);
export const totalDuration = stageStarts[stageStarts.length - 1];
export function snapshot(elapsed: number) {
  const index = Math.max(
    0,
    stageStarts.findLastIndex((start) => elapsed >= start),
  );
  const state = stages[index];
  const moving = timing(state).moving;
  return {
    index,
    state,
    progress: moving ? Math.min(1, (elapsed - stageStarts[index]) / moving) : 1,
  };
}
