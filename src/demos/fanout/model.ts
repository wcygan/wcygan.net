export const FANOUT_DURATION_MS = 15_000;
export const FANOUT_FIRST_REQUEST_MS = 800;
export const FANOUT_REQUEST_TRAVEL_MS = 580;
export const FANOUT_DOWNSTREAM_DELAY_MS = 160;

const FANOUT_PHASE_STARTS = {
  client: FANOUT_FIRST_REQUEST_MS,
  "front-end":
    FANOUT_FIRST_REQUEST_MS +
    FANOUT_REQUEST_TRAVEL_MS +
    FANOUT_DOWNSTREAM_DELAY_MS,
  "mid-tier":
    FANOUT_FIRST_REQUEST_MS +
    2 * (FANOUT_REQUEST_TRAVEL_MS + FANOUT_DOWNSTREAM_DELAY_MS),
} as const;

export type FanoutNodeId =
  | "browser"
  | "front-end"
  | "mid-a"
  | "mid-b"
  | "back-a"
  | "back-b"
  | "back-c"
  | "back-d";

export type FanoutNodeShape = "browser" | "service";

export type FanoutNode = {
  id: FanoutNodeId;
  label: string;
  rateLabel: string;
  color: string;
  column: 0 | 1 | 2 | 3;
  shape: FanoutNodeShape;
  x: number;
  y: number;
};

export type FanoutEdgePhase = keyof typeof FANOUT_PHASE_STARTS;

export type FanoutEdge = {
  id: string;
  from: FanoutNodeId;
  to: FanoutNodeId;
  phase: FanoutEdgePhase;
  /** The traffic rate represented by the request orbs on this edge. */
  ratePerSecond: number;
  /** A small deterministic offset keeps normalized links from marching in lockstep. */
  offsetMs: number;
};

export type FanoutPacket = {
  id: string;
  edgeId: string;
  request: number;
  progress: number;
};

export type FanoutSnapshot = {
  elapsedMs: number;
  startedRequests: number;
  packets: FanoutPacket[];
  isComplete: boolean;
};

export const FANOUT_NODES: readonly FanoutNode[] = [
  {
    id: "browser",
    label: "Browser",
    rateLabel: "0.3 req/s",
    color: "#f1f3f6",
    column: 0,
    shape: "browser",
    x: 76,
    y: 210,
  },
  {
    id: "front-end",
    label: "Svc A",
    rateLabel: "0.3 req/s",
    color: "#f0a36a",
    column: 1,
    shape: "service",
    x: 280,
    y: 210,
  },
  {
    id: "mid-a",
    label: "Svc B",
    rateLabel: "0.45 req/s",
    color: "#75c9b5",
    column: 2,
    shape: "service",
    x: 520,
    y: 130,
  },
  {
    id: "mid-b",
    label: "Svc C",
    rateLabel: "0.55 req/s",
    color: "#aaa2ed",
    column: 2,
    shape: "service",
    x: 520,
    y: 290,
  },
  {
    id: "back-a",
    label: "Svc D",
    rateLabel: "0.4 req/s",
    color: "#e78aaf",
    column: 3,
    shape: "service",
    x: 780,
    y: 64,
  },
  {
    id: "back-b",
    label: "Svc E",
    rateLabel: "0.5 req/s",
    color: "#83b6f4",
    column: 3,
    shape: "service",
    x: 780,
    y: 162,
  },
  {
    id: "back-c",
    label: "Svc F",
    rateLabel: "2.5 req/s",
    color: "#d9ba77",
    column: 3,
    shape: "service",
    x: 780,
    y: 260,
  },
  {
    id: "back-d",
    label: "Svc G",
    rateLabel: "0.65 req/s",
    color: "#9fdb74",
    column: 3,
    shape: "service",
    x: 780,
    y: 358,
  },
];

export const FANOUT_EDGES: readonly FanoutEdge[] = [
  {
    id: "browser-front-end",
    from: "browser",
    to: "front-end",
    phase: "client",
    ratePerSecond: 0.3,
    offsetMs: 0,
  },
  {
    id: "front-end-mid-a",
    from: "front-end",
    to: "mid-a",
    phase: "front-end",
    ratePerSecond: 0.45,
    offsetMs: 0,
  },
  {
    id: "front-end-mid-b",
    from: "front-end",
    to: "mid-b",
    phase: "front-end",
    ratePerSecond: 0.55,
    offsetMs: 240,
  },
  {
    id: "mid-a-back-a",
    from: "mid-a",
    to: "back-a",
    phase: "mid-tier",
    ratePerSecond: 0.4,
    offsetMs: 0,
  },
  {
    id: "mid-a-back-b",
    from: "mid-a",
    to: "back-b",
    phase: "mid-tier",
    ratePerSecond: 0.5,
    offsetMs: 210,
  },
  {
    id: "mid-b-back-c",
    from: "mid-b",
    to: "back-c",
    phase: "mid-tier",
    ratePerSecond: 2.5,
    offsetMs: 100,
  },
  {
    id: "mid-b-back-d",
    from: "mid-b",
    to: "back-d",
    phase: "mid-tier",
    ratePerSecond: 0.65,
    offsetMs: 320,
  },
];

export const INITIAL_FANOUT_SNAPSHOT = deriveFanoutSnapshot(0);

export function deriveFanoutSnapshot(elapsedMs: number): FanoutSnapshot {
  const elapsed = clamp(elapsedMs, 0, FANOUT_DURATION_MS);
  const packets: FanoutPacket[] = [];
  let startedRequests = 0;

  for (const edge of FANOUT_EDGES) {
    const intervalMs = 1_000 / edge.ratePerSecond;
    const firstRequestMs = FANOUT_PHASE_STARTS[edge.phase] + edge.offsetMs;

    for (
      let requestStart = firstRequestMs, request = 0;
      requestStart < FANOUT_DURATION_MS;
      requestStart += intervalMs, request += 1
    ) {
      if (elapsed >= requestStart) startedRequests += 1;

      const progress = progressInWindow(
        elapsed,
        requestStart,
        requestStart + FANOUT_REQUEST_TRAVEL_MS,
      );

      if (progress > 0 && progress < 1) {
        packets.push({
          id: `${edge.id}-${request}`,
          edgeId: edge.id,
          request,
          progress,
        });
      }
    }
  }

  const isComplete = elapsed >= FANOUT_DURATION_MS;

  return {
    elapsedMs: elapsed,
    startedRequests,
    packets: isComplete ? [] : packets,
    isComplete,
  };
}

function progressInWindow(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start), 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
