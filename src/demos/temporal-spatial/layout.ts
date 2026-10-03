export type Point = [number, number, number];
export type DemoKind =
  | "architecture"
  | "tasks"
  | "history"
  | "replay"
  | "parallel"
  | "compensation";
export type NodeShape = "box" | "cylinder" | "gate" | "record";

export interface SpatialNode {
  id: string;
  label: string;
  position: Point;
  size: Point;
  shape?: NodeShape;
  domain?: "service" | "worker" | "external" | "history";
}

export interface SpatialRoute {
  id: string;
  from: string;
  to: string;
  points: Point[];
}

export interface SpatialRegion {
  id: string;
  label: string;
  position: Point;
  size: Point;
  tone: "blue" | "orange" | "green" | "yellow" | "red" | "panel";
}

export interface SpatialLayout {
  nodes: SpatialNode[];
  routes: SpatialRoute[];
  regions: SpatialRegion[];
  worldWidth: number;
  worldHeight: number;
  pose: Point;
}

type Face = "left" | "right" | "bottom" | "top" | "back" | "front";
const FACES: Record<Face, { axis: 0 | 1 | 2; direction: -1 | 1 }> = {
  left: { axis: 0, direction: -1 },
  right: { axis: 0, direction: 1 },
  bottom: { axis: 1, direction: -1 },
  top: { axis: 1, direction: 1 },
  back: { axis: 2, direction: -1 },
  front: { axis: 2, direction: 1 },
};

function node(
  id: string,
  label: string,
  position: Point,
  size: Point,
  domain: SpatialNode["domain"],
  shape: NodeShape = "box",
): SpatialNode {
  return { id, label, position, size, domain, shape };
}

function region(
  id: string,
  label: string,
  position: Point,
  size: Point,
  tone: SpatialRegion["tone"],
): SpatialRegion {
  return { id, label, position, size, tone };
}

/** Meshes, wires, arrowheads, and moving payloads share these surface ports. */
function port(nodes: SpatialNode[], id: string, face: Face): Point {
  const item = nodes.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown spatial node: ${id}`);
  const { axis, direction } = FACES[face];
  const point: Point = [...item.position];
  point[axis] += (item.size[axis] / 2) * direction;
  return point;
}

function route(
  nodes: SpatialNode[],
  id: string,
  from: string,
  fromFace: Face,
  to: string,
  toFace: Face,
  lanes: Point[] = [],
): SpatialRoute {
  return {
    id,
    from,
    to,
    points: [port(nodes, from, fromFace), ...lanes, port(nodes, to, toFace)],
  };
}

// x reads across responsibilities; z separates providers and request/report
// lanes. Task delivery leaves a different Service face from result reporting.
const architectureNodes = [
  node("client", "Client", [-4.4, 0.5, -0.7], [1.25, 0.85, 1.1], "external"),
  node(
    "service",
    "Temporal Service",
    [-1.6, 0.5, -0.7],
    [1.65, 1, 1.6],
    "service",
  ),
  node("worker", "Worker", [1.6, 0.5, 0.4], [1.6, 1, 1.55], "worker"),
  node(
    "inventory",
    "Inventory",
    [4.6, 0.5, -1.25],
    [1.35, 0.8, 1.25],
    "external",
    "cylinder",
  ),
  node(
    "payment",
    "Payments",
    [4.6, 0.5, 1.8],
    [1.35, 0.8, 1.25],
    "external",
    "cylinder",
  ),
];
const architecture: SpatialLayout = {
  nodes: architectureNodes,
  routes: [
    route(architectureNodes, "start", "client", "right", "service", "left"),
    route(architectureNodes, "workflow", "service", "right", "worker", "left", [
      [0, 0.5, -0.7],
      [0, 0.5, 0.4],
    ]),
    route(architectureNodes, "command", "worker", "back", "service", "front", [
      [1.6, 0.5, -1.8],
      [-0.1, 0.5, -1.8],
      [-0.1, 0.5, 0.55],
      [-1.6, 0.5, 0.55],
    ]),
    route(architectureNodes, "activity", "service", "top", "worker", "top", [
      [-1.6, 1.8, -0.7],
      [1.6, 1.8, -0.7],
      [1.6, 1.8, 0.4],
    ]),
    route(
      architectureNodes,
      "inventory",
      "worker",
      "right",
      "inventory",
      "left",
      [
        [3.1, 0.5, 0.4],
        [3.1, 0.5, -1.25],
      ],
    ),
    route(
      architectureNodes,
      "report",
      "worker",
      "bottom",
      "service",
      "bottom",
      [
        [1.6, -0.5, 0.4],
        [-1.6, -0.5, 0.4],
        [-1.6, -0.5, -0.7],
      ],
    ),
  ],
  regions: [
    region(
      "service-domain",
      "Durable orchestration",
      [-1.6, -0.92, -0.7],
      [2.7, 0.12, 3.25],
      "blue",
    ),
    region(
      "worker-domain",
      "Your code",
      [1.6, -0.92, 0.4],
      [2.5, 0.12, 2.5],
      "orange",
    ),
    region(
      "external-domain",
      "External operations",
      [4.6, -0.92, 0.275],
      [2.1, 0.12, 4.8],
      "green",
    ),
  ],
  worldWidth: 12.8,
  worldHeight: 7.6,
  pose: [5.5, 5.4, 11],
};

// Workflow Tasks occupy their own rear lane. Only the Activity Task queue
// fans out to competing Activity workers; replacement is a fourth destination.
const taskNodes = [
  node("wfQueue", "Workflow Tasks", [-3.2, 0.4, -2], [2, 0.5, 0.85], "service"),
  node(
    "activityQueue",
    "Activity Tasks",
    [-2, 0.4, 0.8],
    [2.4, 0.5, 0.85],
    "service",
  ),
  node("workerA", "Worker A", [1.4, 0.4, -1.85], [1.1, 0.9, 1.1], "worker"),
  node("workerB", "Worker B", [3.1, 0.4, 0.6], [1.2, 0.9, 1.1], "worker"),
  node("workerC", "Worker C", [1.4, 0.4, 2.8], [1.1, 0.9, 1.1], "worker"),
  node(
    "replacement",
    "Replacement",
    [3.3, 0.4, -1.85],
    [1.1, 0.9, 1.1],
    "worker",
  ),
];
const tasks: SpatialLayout = {
  nodes: taskNodes,
  routes: [
    route(taskNodes, "taskA", "activityQueue", "right", "workerA", "left", [
      [-0.25, 0.4, 0.8],
      [-0.25, 0.4, -1.85],
    ]),
    route(taskNodes, "taskB", "activityQueue", "right", "workerB", "left", [
      [0.25, 0.4, 0.8],
      [0.25, 0.4, 0.6],
    ]),
    route(taskNodes, "taskC", "activityQueue", "front", "workerC", "left", [
      [-2, 0.4, 2.8],
    ]),
    route(
      taskNodes,
      "replace",
      "activityQueue",
      "back",
      "replacement",
      "front",
      [
        [-2, 0.4, -0.35],
        [3.3, 0.4, -0.35],
      ],
    ),
    route(taskNodes, "ackA", "workerA", "top", "activityQueue", "top", [
      [1.4, 1.45, -1.85],
      [-2, 1.45, -1.85],
      [-2, 1.45, 0.8],
    ]),
    route(taskNodes, "ackC", "workerC", "front", "activityQueue", "front", [
      [1.4, 0.4, 3.8],
      [-2, 0.4, 3.8],
    ]),
    route(
      taskNodes,
      "ackReplacement",
      "replacement",
      "back",
      "activityQueue",
      "back",
      [
        [3.3, 0.4, -3.1],
        [-2, 0.4, -3.1],
      ],
    ),
  ],
  regions: [
    region(
      "task-types",
      "Separate task types",
      [-2.65, -0.38, -0.55],
      [3.8, 0.12, 4.9],
      "blue",
    ),
    region(
      "activity-workers",
      "Competing Activity workers",
      [2.2, -0.38, 0.35],
      [4.6, 0.12, 6.3],
      "orange",
    ),
  ],
  worldWidth: 11.6,
  worldHeight: 8.8,
  pose: [6, 6.5, 10],
};

const RECORD_SPACING = 1.3;
const RECORD_START = -3.25;
function historyNodes(y: number, z: number): SpatialNode[] {
  return Array.from({ length: 6 }, (_, index) =>
    node(
      `record${index + 1}`,
      String(index + 1).padStart(2, "0"),
      [RECORD_START + index * RECORD_SPACING, y, z],
      [0.86, 0.45, 0.9],
      "history",
      "record",
    ),
  );
}

// Appending reveals fixed slots; it never recenters the surviving prefix.
// Durable records sit above a tape, separate from volatile memory in depth.
const appendNodes = [
  ...historyNodes(0.75, -0.9),
  node(
    "memory",
    "Worker memory",
    [-1.8, -0.9, 1.7],
    [1.65, 0.8, 1.25],
    "worker",
  ),
  node(
    "timerService",
    "Durable timer",
    [2.2, -0.9, 1.7],
    [1.4, 0.8, 1.25],
    "service",
  ),
];
const history: SpatialLayout = {
  nodes: appendNodes,
  routes: appendNodes
    .filter((item) => item.domain === "history")
    .map((record) => {
      const source = record.id === "record5" ? "timerService" : "memory";
      const sourceX = source === "timerService" ? 2.2 : -1.8;
      return route(
        appendNodes,
        `append${record.id.slice(6)}`,
        source,
        "top",
        record.id,
        "front",
        [
          [sourceX, -0.15, 1.7],
          [record.position[0], -0.15, 1.7],
          [record.position[0], -0.15, 0.05],
          [record.position[0], 0.75, 0.05],
        ],
      );
    }),
  regions: [
    region(
      "history-tape",
      "Durable Event History",
      [0, 0.43, -0.9],
      [8.2, 0.14, 1.55],
      "blue",
    ),
    region(
      "memory-domain",
      "Volatile worker memory",
      [-1.8, -1.37, 1.7],
      [3.1, 0.12, 2.2],
      "orange",
    ),
    region("timer-domain", "", [2.2, -1.37, 1.7], [2.4, 0.12, 2.2], "blue"),
  ],
  worldWidth: 10.5,
  worldHeight: 7.6,
  pose: [4.8, 5.4, 10],
};

// The same left-to-right history axis is reused for replay. Worker lifetimes
// occupy separate x/z positions; providers sit below their calling worker.
const replayNodes = [
  ...historyNodes(1.1, -1.5),
  node(
    "oldWorker",
    "Old worker",
    [-2.2, -0.35, 1.6],
    [1.6, 0.8, 1.25],
    "worker",
  ),
  node("newWorker", "New worker", [2, -0.35, 0.2], [1.6, 0.8, 1.25], "worker"),
  node(
    "inventory",
    "Inventory",
    [-2.2, -1.85, 1.6],
    [1.5, 0.7, 1.5],
    "external",
    "cylinder",
  ),
  node(
    "payment",
    "Payments",
    [2, -1.85, 0.2],
    [1.5, 0.7, 1.5],
    "external",
    "cylinder",
  ),
];
const replay: SpatialLayout = {
  nodes: replayNodes,
  routes: [
    route(replayNodes, "reserve", "oldWorker", "front", "inventory", "top", [
      [-2.2, -0.35, 2.85],
      [-2.2, -1.05, 2.85],
      [-2.2, -1.05, 1.6],
    ]),
    route(replayNodes, "record", "oldWorker", "top", "record3", "front", [
      [-2.2, 0.42, 1.6],
      [-0.65, 0.42, 1.6],
      [-0.65, 0.42, -0.5],
      [-0.65, 1.1, -0.5],
    ]),
    route(replayNodes, "load", "record1", "top", "newWorker", "top", [
      [-3.25, 1.95, -1.5],
      [2, 1.95, -1.5],
      [2, 1.95, 0.2],
    ]),
    route(replayNodes, "reuse", "record3", "front", "newWorker", "left", [
      [-0.65, 1.1, -0.6],
      [0.65, 1.1, -0.6],
      [0.65, -0.35, -0.6],
      [0.65, -0.35, 0.2],
    ]),
    route(replayNodes, "schedule", "newWorker", "top", "record4", "front", [
      [2, 0.45, 0.2],
      [0.65, 0.45, 0.2],
      [0.65, 0.45, -0.6],
      [0.65, 1.1, -0.6],
    ]),
    route(replayNodes, "charge", "newWorker", "front", "payment", "top", [
      [2, -0.35, 1.65],
      [2, -1.05, 1.65],
      [2, -1.05, 0.2],
    ]),
    route(replayNodes, "finish", "newWorker", "right", "record6", "front", [
      [3.8, -0.35, 0.2],
      [3.8, 1.1, 0.2],
      [3.25, 1.1, 0.2],
    ]),
  ],
  regions: [
    region(
      "history-tape",
      "Durable Event History",
      [0, 0.78, -1.5],
      [8.2, 0.14, 1.55],
      "blue",
    ),
    region(
      "old-worker-domain",
      "",
      [-2.2, -0.82, 1.6],
      [2.8, 0.12, 2],
      "orange",
    ),
    region("new-worker-domain", "", [2, -0.82, 0.2], [2.8, 0.12, 2], "orange"),
    region(
      "external-domain",
      "External side effects",
      [0, -2.3, 0.9],
      [7.2, 0.12, 3.3],
      "green",
    ),
  ],
  worldWidth: 11.2,
  worldHeight: 8.4,
  pose: [4.8, 5.8, 11],
};

// Inventory and risk occupy genuinely separate depth lanes. The join is a
// thin, tall gate at their convergence rather than another processing box.
const parallelNodes = [
  node("orchestrator", "Workflow", [-4.2, 0, 0], [1.5, 0.9, 1.25], "worker"),
  node("fork", "Fork", [-1.9, 0, 0], [0.6, 1.3, 2], "worker", "gate"),
  node(
    "inventory",
    "Reserve inventory",
    [0.35, 0.15, -2],
    [1.7, 0.85, 1.3],
    "external",
  ),
  node("risk", "Risk check", [0.35, 0.15, 2], [1.7, 0.85, 1.3], "external"),
  node(
    "join",
    "Wait for both",
    [2.7, 0, 0],
    [0.45, 1.2, 2.6],
    "worker",
    "gate",
  ),
  node("fulfill", "Fulfill order", [4.55, 0, 0], [1.55, 0.8, 1.3], "external"),
];
const parallel: SpatialLayout = {
  nodes: parallelNodes,
  routes: [
    route(parallelNodes, "begin", "orchestrator", "right", "fork", "left"),
    route(parallelNodes, "fanInventory", "fork", "right", "inventory", "left", [
      [-1.1, 0, 0],
      [-1.1, 0.15, 0],
      [-1.1, 0.15, -2],
    ]),
    route(parallelNodes, "fanRisk", "fork", "front", "risk", "left", [
      [-1.9, 0, 2],
      [-1.9, 0.15, 2],
    ]),
    route(
      parallelNodes,
      "inventoryResult",
      "inventory",
      "right",
      "join",
      "left",
      [
        [1.9, 0.15, -2],
        [1.9, 0.15, 0],
        [1.9, 0, 0],
      ],
    ),
    route(parallelNodes, "riskResult", "risk", "right", "join", "front", [
      [2.7, 0.15, 2],
      [2.7, 0, 2],
    ]),
    route(parallelNodes, "fulfill", "join", "right", "fulfill", "left"),
  ],
  regions: [
    region(
      "coordination",
      "Workflow coordination",
      [-0.25, -0.7, 0],
      [10.8, 0.12, 1.05],
      "orange",
    ),
    region("inventory-branch", "", [0.35, -0.35, -2], [2.6, 0.1, 2], "green"),
    region("risk-branch", "", [0.35, -0.35, 2], [2.6, 0.1, 2], "yellow"),
  ],
  worldWidth: 12,
  worldHeight: 8.6,
  pose: [6, 7, 11],
};

// Compensation is new work on a lower rear lane, moving right-to-left.
// A failed refund branches farther back into explicit manual recovery.
const compensationNodes = [
  node("reserve", "Reserve", [-3.1, 0.75, 1.2], [1.5, 0.75, 1.1], "external"),
  node("charge", "Charge", [0, 0.75, 1.2], [1.5, 0.75, 1.1], "external"),
  node("ship", "Ship", [3.1, 0.75, 1.2], [1.5, 0.75, 1.1], "external"),
  node("refund", "Refund", [1.55, -2.3, -1.4], [1.5, 0.75, 1.1], "external"),
  node("release", "Release", [-1.55, -2.3, -1.4], [1.5, 0.75, 1.1], "external"),
  node(
    "manual",
    "Manual recovery",
    [3.75, -2.3, -2.6],
    [1.5, 0.75, 1.1],
    "external",
  ),
];
const compensation: SpatialLayout = {
  nodes: compensationNodes,
  routes: [
    route(compensationNodes, "pay", "reserve", "right", "charge", "left"),
    route(compensationNodes, "ship", "charge", "right", "ship", "left"),
    route(compensationNodes, "refund", "ship", "back", "refund", "front", [
      [3.1, 0.75, 0],
      [3.1, -2.3, 0],
      [1.55, -2.3, 0],
    ]),
    route(compensationNodes, "release", "refund", "left", "release", "right"),
    route(compensationNodes, "manual", "refund", "back", "manual", "left", [
      [1.55, -2.3, -2.6],
    ]),
  ],
  regions: [
    region(
      "forward-operations",
      "Forward operations",
      [0, 0.3, 1.2],
      [9, 0.1, 2],
      "green",
    ),
    region(
      "compensation-operations",
      "New compensation Activities",
      [0, -2.75, -1.4],
      [6.1, 0.1, 1.9],
      "orange",
    ),
    region("manual-recovery", "", [3.75, -2.75, -2.6], [2, 0.1, 1.9], "red"),
  ],
  worldWidth: 12.5,
  worldHeight: 9.2,
  pose: [5.5, 5.5, 11],
};

export const LAYOUTS: Record<DemoKind, SpatialLayout> = {
  architecture,
  tasks,
  history,
  replay,
  parallel,
  compensation,
};
