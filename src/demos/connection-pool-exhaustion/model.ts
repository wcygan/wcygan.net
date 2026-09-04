export const POOL_SIZE = 4;
export const ACQUISITION_TIMEOUT_RATIO = 0.18; // queued longer than this -> dropped
export const SIMULATION_DURATION_MS = 30_000;

// A request's progress covers its FULL round trip, not just the query leg:
//   0.00-0.15  request travels from the client and borrows a pooled socket
//   0.15-0.25  request is sent quickly over the wire to mysqld
//   0.25-0.75  query executes at mysqld — the request WAITS at the server
//   0.75-0.85  result set travels quickly back to the connection
//   0.85-1.00  connection released to the pool; response returns to the client
export const ROUND_TRIP = {
  acquireEnd: 0.15,
  sendEnd: 0.25,
  execEnd: 0.75,
  mysqlReturnEnd: 0.85,
} as const;

export type ConnectionState = "idle" | "active" | "returning";

export type ConnectionSnapshot = {
  id: number;
  state: ConnectionState;
  activeRequestId?: number;
  query?: string;
  progress: number; // 0 to 1 for query round trip
};

export type RequestStatus = "queued" | "executing" | "completed" | "dropped";

export type ClientRequest = {
  id: number;
  label: string;
  query: string;
  status: RequestStatus;
  connectionId?: number;
  durationMs: number;
  waitMs: number; // time spent queued so far (0 for dropped after drop point)
  timeoutMs: number;
};

export type PoolMetrics = {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  completedRequests: number;
  droppedRequests: number;
};

export type PoolSimulationSnapshot = {
  connections: ConnectionSnapshot[];
  requests: ClientRequest[];
  metrics: PoolMetrics;
  phase: "initial" | "active" | "saturated" | "failing" | "complete";
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

export const SLOW_QUERY = "SELECT * FROM events";

const SCHEDULE: RequestSchedule[] = [
  // The incident: the same unindexed full table scan lands on every pool
  // socket. Each scan holds its connection for ~30s of wall-clock time, so
  // all four slots are pinned and no other query can acquire a connection.
  {
    id: 1,
    label: "Req #1",
    query: SLOW_QUERY,
    startRatio: 0.03,
    durationRatio: 0.9,
  },
  {
    id: 2,
    label: "Req #2",
    query: SLOW_QUERY,
    startRatio: 0.05,
    durationRatio: 0.9,
  },
  {
    id: 3,
    label: "Req #3",
    query: SLOW_QUERY,
    startRatio: 0.07,
    durationRatio: 0.9,
  },
  {
    id: 4,
    label: "Req #4",
    query: SLOW_QUERY,
    startRatio: 0.09,
    durationRatio: 0.9,
  },
  // Normal workload arrives during the surge and waits out the timeout.
  {
    id: 5,
    label: "Req #5",
    query: "SELECT name FROM users WHERE id = 42",
    startRatio: 0.2,
    durationRatio: 0.15,
  },
  {
    id: 6,
    label: "Req #6",
    query: "UPDATE sessions SET last_seen = NOW()",
    startRatio: 0.24,
    durationRatio: 0.14,
  },
  {
    id: 7,
    label: "Req #7",
    query: "SELECT count(*) FROM orders LIMIT 1",
    startRatio: 0.3,
    durationRatio: 0.15,
  },
  {
    id: 8,
    label: "Req #8",
    query: "SELECT id, total FROM carts WHERE user_id = 7",
    startRatio: 0.36,
    durationRatio: 0.15,
  },
  {
    id: 9,
    label: "Req #9",
    query: "INSERT INTO audit_logs (action) VALUES ('login')",
    startRatio: 0.42,
    durationRatio: 0.14,
  },
  {
    id: 10,
    label: "Req #10",
    query: "SELECT balance FROM wallets WHERE user_id = 42",
    startRatio: 0.48,
    durationRatio: 0.15,
  },
];

export function deriveExhaustionSnapshot(
  progress: number,
): PoolSimulationSnapshot {
  const p = Math.max(0, Math.min(1, progress));
  const elapsedMs = Math.round(p * SIMULATION_DURATION_MS);

  const connections: ConnectionSnapshot[] = Array.from(
    { length: POOL_SIZE },
    (_, idx) => ({
      id: idx + 1,
      state: "idle" as ConnectionState,
      progress: 0,
    }),
  );

  // Deterministic pool allocation: each request takes the first connection
  // that is free when it arrives. Requests that cannot acquire a connection
  // within ACQUISITION_TIMEOUT_RATIO are dropped.
  type LiveAlloc = {
    req: RequestSchedule;
    connId?: number;
    actualStart: number;
    actualEnd: number;
    droppedAt?: number;
  };

  const allocations: LiveAlloc[] = [];
  const connFreeTime: number[] = Array(POOL_SIZE).fill(0);

  for (const item of SCHEDULE) {
    let bestConn = 0;
    let earliestAvailable = connFreeTime[0];
    for (let c = 1; c < POOL_SIZE; c++) {
      if (connFreeTime[c] < earliestAvailable) {
        earliestAvailable = connFreeTime[c];
        bestConn = c;
      }
    }

    const actualStart = Math.max(item.startRatio, earliestAvailable);
    if (actualStart - item.startRatio > ACQUISITION_TIMEOUT_RATIO) {
      // Waited past the pool's acquisition timeout: dropped at arrival.
      allocations.push({
        req: item,
        actualStart,
        actualEnd: actualStart,
        droppedAt: item.startRatio + ACQUISITION_TIMEOUT_RATIO,
      });
      continue;
    }

    const actualEnd = actualStart + item.durationRatio;
    connFreeTime[bestConn] = actualEnd;
    allocations.push({
      req: item,
      connId: bestConn + 1,
      actualStart,
      actualEnd,
    });
  }

  // Determine current status of each request and connection at progress p.
  const requests: ClientRequest[] = [];
  let waitingCount = 0;
  let activeConnCount = 0;
  let completedCount = 0;
  let droppedCount = 0;

  for (const alloc of allocations) {
    const { req, connId, actualStart, actualEnd, droppedAt } = alloc;

    if (droppedAt !== undefined) {
      if (p < req.startRatio) continue; // not yet arrived
      const stillWaiting = p < droppedAt;
      if (stillWaiting) {
        waitingCount++;
      } else {
        droppedCount++;
      }
      requests.push({
        id: req.id,
        label: req.label,
        query: req.query,
        status: stillWaiting ? "queued" : "dropped",
        durationMs: Math.round(req.durationRatio * SIMULATION_DURATION_MS),
        waitMs: Math.round(
          (Math.min(p, droppedAt) - req.startRatio) * SIMULATION_DURATION_MS,
        ),
        timeoutMs: Math.round(
          ACQUISITION_TIMEOUT_RATIO * SIMULATION_DURATION_MS,
        ),
      });
      continue;
    }

    let status: RequestStatus = "queued";

    if (p < req.startRatio) {
      continue; // not yet arrived
    }
    if (p >= actualEnd) {
      status = "completed";
      completedCount++;
    } else if (p >= actualStart) {
      status = "executing";
      activeConnCount++;
      if (connId !== undefined) {
        const conn = connections[connId - 1];
        const reqProgress = (p - actualStart) / (actualEnd - actualStart);
        conn.state = reqProgress > ROUND_TRIP.execEnd ? "returning" : "active";
        conn.activeRequestId = req.id;
        conn.query = req.query;
        conn.progress = Math.max(0, Math.min(1, reqProgress));
      }
    } else {
      // Arrived but queued: wait time grows until the timeout drops it.
      status = "queued";
      waitingCount++;
    }

    const waitRatio = Math.max(0, Math.min(p, actualStart) - req.startRatio);
    requests.push({
      id: req.id,
      label: req.label,
      query: req.query,
      status,
      connectionId: p >= actualStart && p < actualEnd ? connId : undefined,
      durationMs: Math.round(req.durationRatio * SIMULATION_DURATION_MS),
      waitMs: Math.round(waitRatio * SIMULATION_DURATION_MS),
      timeoutMs: Math.round(ACQUISITION_TIMEOUT_RATIO * SIMULATION_DURATION_MS),
    });
  }

  const idleCount = POOL_SIZE - activeConnCount;

  let phase: PoolSimulationSnapshot["phase"] = "initial";
  if (p >= 0.97) {
    phase = "complete";
  } else if (droppedCount > 0) {
    phase = "failing";
  } else if (waitingCount > 0 || idleCount === 0) {
    phase = "saturated";
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
      droppedRequests: droppedCount,
    },
    phase,
    elapsedMs,
    isComplete: phase === "complete",
  };
}

export const INITIAL_EXHAUSTION_SNAPSHOT = deriveExhaustionSnapshot(0);
