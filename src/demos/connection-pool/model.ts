export const POOL_SIZE = 4;
export const TOTAL_REQUESTS = 7;
export const SIMULATION_DURATION_MS = 24_000;

export type ConnectionState = "idle" | "active" | "returning";

export type ConnectionSnapshot = {
  id: number;
  state: ConnectionState;
  activeRequestId?: number;
  query?: string;
  progress: number; // 0 to 1 for query round trip
};

export type RequestStatus = "queued" | "executing" | "completed";

export type ClientRequest = {
  id: number;
  label: string;
  query: string;
  status: RequestStatus;
  connectionId?: number;
  durationMs: number;
};

export type PoolMetrics = {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  completedRequests: number;
  totalThroughput: number;
};

export type PoolSimulationSnapshot = {
  connections: ConnectionSnapshot[];
  requests: ClientRequest[];
  metrics: PoolMetrics;
  phase: "initial" | "active" | "queued" | "draining" | "complete";
  elapsedMs: number;
  isComplete: boolean;
};

// Requests timeline definition
type RequestSchedule = {
  id: number;
  label: string;
  query: string;
  startRatio: number;
  durationRatio: number;
};

const SCHEDULE: RequestSchedule[] = [
  // First wave saturates the pool of 4 connections
  {
    id: 1,
    label: "Req #1",
    query: "SELECT * FROM users WHERE id = 42",
    startRatio: 0.05,
    durationRatio: 0.22,
  },
  {
    id: 2,
    label: "Req #2",
    query: "SELECT name, email FROM accounts WHERE org_id = 9",
    startRatio: 0.08,
    durationRatio: 0.28,
  },
  {
    id: 3,
    label: "Req #3",
    query: "UPDATE sessions SET last_seen = NOW() WHERE id = 110",
    startRatio: 0.12,
    durationRatio: 0.24,
  },
  {
    id: 4,
    label: "Req #4",
    query: "SELECT count(*) FROM orders WHERE status = 'pending'",
    startRatio: 0.15,
    durationRatio: 0.2,
  },
  // Second wave: Req #5 & #6 arrive while all 4 connections are busy -> queued in pool!
  {
    id: 5,
    label: "Req #5",
    query: "INSERT INTO audit_logs (action, ts) VALUES ('login', NOW())",
    startRatio: 0.22, // arrives while conns 1,2,3,4 are busy!
    durationRatio: 0.25,
  },
  {
    id: 6,
    label: "Req #6",
    query: "SELECT id, balance FROM wallets WHERE user_id = 42",
    startRatio: 0.27, // arrives while still saturated!
    durationRatio: 0.22,
  },
  // Third wave: Req #7 arrives later
  {
    id: 7,
    label: "Req #7",
    query: "SELECT * FROM products WHERE in_stock = 1 LIMIT 20",
    startRatio: 0.48,
    durationRatio: 0.25,
  },
];

export function derivePoolSimulationSnapshot(
  progress: number,
): PoolSimulationSnapshot {
  const p = Math.max(0, Math.min(1, progress));
  const elapsedMs = Math.round(p * SIMULATION_DURATION_MS);

  // Initialize pool connections
  const connections: ConnectionSnapshot[] = Array.from(
    { length: POOL_SIZE },
    (_, idx) => ({
      id: idx + 1,
      state: "idle",
      progress: 0,
    }),
  );

  // Process requests dynamically according to availability of connections
  // We simulate exact pool allocation logic:
  // Sort requests by startRatio, assign to first free connection when they start or when a connection frees up.
  type LiveAlloc = {
    req: RequestSchedule;
    connId?: number;
    actualStart: number;
    actualEnd: number;
  };

  const allocations: LiveAlloc[] = [];
  const connFreeTime: number[] = Array(POOL_SIZE).fill(0);

  for (const item of SCHEDULE) {
    // Find earliest available connection at or after item.startRatio
    let bestConn = 0;
    let earliestAvailable = connFreeTime[0];
    for (let c = 1; c < POOL_SIZE; c++) {
      if (connFreeTime[c] < earliestAvailable) {
        earliestAvailable = connFreeTime[c];
        bestConn = c;
      }
    }

    const actualStart = Math.max(item.startRatio, earliestAvailable);
    const actualEnd = actualStart + item.durationRatio;
    connFreeTime[bestConn] = actualEnd;

    allocations.push({
      req: item,
      connId: bestConn + 1,
      actualStart,
      actualEnd,
    });
  }

  // Determine current status of each request and connection at progress p
  const requests: ClientRequest[] = [];
  let waitingCount = 0;
  let activeConnCount = 0;
  let completedCount = 0;

  for (const alloc of allocations) {
    const { req, connId, actualStart, actualEnd } = alloc;
    let status: RequestStatus = "queued";

    if (p < req.startRatio) {
      // Not yet arrived
      continue;
    } else if (p >= actualEnd) {
      status = "completed";
      completedCount++;
    } else if (p >= actualStart) {
      status = "executing";
      activeConnCount++;
      if (connId !== undefined) {
        const conn = connections[connId - 1];
        const reqProgress = (p - actualStart) / (actualEnd - actualStart);
        conn.state = reqProgress > 0.9 ? "returning" : "active";
        conn.activeRequestId = req.id;
        conn.query = req.query;
        conn.progress = Math.max(0, Math.min(1, reqProgress));
      }
    } else {
      // Arrived (p >= req.startRatio) but p < actualStart -> queued in pool!
      status = "queued";
      waitingCount++;
    }

    requests.push({
      id: req.id,
      label: req.label,
      query: req.query,
      status,
      connectionId: p >= actualStart && p < actualEnd ? connId : undefined,
      durationMs: Math.round(req.durationRatio * SIMULATION_DURATION_MS),
    });
  }

  const idleCount = POOL_SIZE - activeConnCount;

  let phase: PoolSimulationSnapshot["phase"] = "initial";
  if (p >= 0.95 || completedCount === TOTAL_REQUESTS) {
    phase = "complete";
  } else if (waitingCount > 0) {
    phase = "queued";
  } else if (activeConnCount > 0 && p > 0.6) {
    phase = "draining";
  } else if (activeConnCount > 0) {
    phase = "active";
  }

  return {
    connections,
    requests,
    metrics: {
      activeConnections: activeConnCount,
      idleConnections: idleCount,
      waitingRequests: waitingCount,
      completedRequests: completedCount,
      totalThroughput: completedCount,
    },
    phase,
    elapsedMs,
    isComplete: phase === "complete",
  };
}

export const INITIAL_POOL_SNAPSHOT = derivePoolSimulationSnapshot(0);
