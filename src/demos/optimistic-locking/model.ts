export type WorkerKey = "workerA" | "workerB";

export type RacePhase =
  | "read"
  | "prepare"
  | "worker-a-commit"
  | "worker-b-conflict"
  | "worker-b-reread"
  | "worker-b-retry";

export type WorkerStatus =
  | "reading"
  | "prepared"
  | "waiting"
  | "committing"
  | "committed"
  | "conflicting"
  | "conflict"
  | "rereading"
  | "retrying";

export type PacketKind = "select" | "read-result" | "write" | "result";

export type PacketTone = "neutral" | "success" | "conflict";

export type InventoryRow = {
  sku: "SKU-42";
  available: 0 | 1 | 2;
  version: 7 | 8 | 9;
  lastWriter: "-" | "A" | "B";
};

export type WorkerSnapshot = {
  key: WorkerKey;
  label: "Worker A" | "Worker B";
  mutationLabel: string;
  expectedVersion: 7 | 8;
  status: WorkerStatus;
  statusLabel: string;
  resultLabel?: string;
};

export type PacketSnapshot = {
  writer: WorkerKey;
  kind: PacketKind;
  direction: "to-db" | "from-db";
  progress: number;
  label: string;
  tone: PacketTone;
};

export type VersionMismatch = {
  expected: 7;
  current: 8;
  intensity: number;
};

export type RaceDemoState = {
  progress: number;
  playing: boolean;
};

export type RaceSnapshot = {
  progress: number;
  playing: boolean;
  phase: RacePhase;
  row: InventoryRow;
  workers: Record<WorkerKey, WorkerSnapshot>;
  packets: PacketSnapshot[];
  tableFlash: number;
  mismatch?: VersionMismatch;
  phaseLabel: string;
};

const PACKET_TRAVEL = 0.075;
const READ_END = 0.2;
const PREPARE_END = 0.31;
const WORKER_A_END = 0.47;
const WORKER_B_CONFLICT_END = 0.62;
const WORKER_B_REREAD_END = 0.76;

const WORKER_A_APPLY_AT = 0.39;
const WORKER_B_STALE_CHECK_AT = 0.55;
const WORKER_B_REREAD_START = 0.62;
const WORKER_B_RETRY_APPLY_AT = 0.84;

export const REDUCED_MOTION_PROGRESS = 0.9;

export function deriveRaceSnapshot(state: RaceDemoState): RaceSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);
  const row = deriveRow(progress);

  return {
    progress,
    playing: state.playing,
    phase,
    row,
    workers: {
      workerA: workerSnapshot("workerA", phase, progress),
      workerB: workerSnapshot("workerB", phase, progress),
    },
    packets: derivePackets(progress),
    tableFlash: Math.max(
      flashAround(progress, WORKER_A_APPLY_AT, 0.05),
      flashAround(progress, WORKER_B_RETRY_APPLY_AT, 0.055),
    ),
    mismatch: deriveMismatch(progress),
    phaseLabel: phaseLabel(phase, progress),
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function easeOut(value: number) {
  const normalized = clamp(value, 0, 1);
  return 1 - Math.pow(1 - normalized, 3);
}

export function easeInOut(value: number) {
  const normalized = clamp(value, 0, 1);
  return normalized < 0.5
    ? 4 * normalized * normalized * normalized
    : 1 - Math.pow(-2 * normalized + 2, 3) / 2;
}

function derivePhase(progress: number): RacePhase {
  if (progress < READ_END) return "read";
  if (progress < PREPARE_END) return "prepare";
  if (progress < WORKER_A_END) return "worker-a-commit";
  if (progress < WORKER_B_CONFLICT_END) return "worker-b-conflict";
  if (progress < WORKER_B_REREAD_END) return "worker-b-reread";
  return "worker-b-retry";
}

function deriveRow(progress: number): InventoryRow {
  if (progress < WORKER_A_APPLY_AT) {
    return {
      sku: "SKU-42",
      available: 2,
      version: 7,
      lastWriter: "-",
    };
  }

  if (progress < WORKER_B_RETRY_APPLY_AT) {
    return {
      sku: "SKU-42",
      available: 1,
      version: 8,
      lastWriter: "A",
    };
  }

  return {
    sku: "SKU-42",
    available: 0,
    version: 9,
    lastWriter: "B",
  };
}

function workerSnapshot(
  key: WorkerKey,
  phase: RacePhase,
  progress: number,
): WorkerSnapshot {
  const isWorkerA = key === "workerA";
  const label = isWorkerA ? "Worker A" : "Worker B";
  const decrementMutation = "available - 1";
  const base = {
    key,
    label,
    mutationLabel: decrementMutation,
    expectedVersion: 7,
  } as const;

  if (phase === "read") {
    return {
      ...base,
      status: "reading",
      statusLabel: "reading stock + version",
    };
  }

  if (phase === "prepare") {
    return {
      ...base,
      status: "prepared",
      statusLabel: "prepare reservation",
    };
  }

  if (phase === "worker-a-commit") {
    if (isWorkerA && progress < WORKER_A_APPLY_AT) {
      return {
        ...base,
        status: "committing",
        statusLabel: "checking expected v7",
      };
    }

    if (isWorkerA) {
      return {
        ...base,
        status: "committed",
        statusLabel: "decremented stock",
        resultLabel: "rows_affected = 1",
      };
    }

    return {
      ...base,
      status: "waiting",
      statusLabel: "still expects v7",
    };
  }

  if (phase === "worker-b-conflict") {
    if (isWorkerA) {
      return {
        ...base,
        status: "committed",
        statusLabel: "decremented stock",
        resultLabel: "rows_affected = 1",
      };
    }

    if (progress < WORKER_B_STALE_CHECK_AT) {
      return {
        ...base,
        status: "conflicting",
        statusLabel: "checking expected v7",
      };
    }

    return {
      ...base,
      status: "conflict",
      statusLabel: "stale version",
      resultLabel: "rows_affected = 0",
    };
  }

  if (phase === "worker-b-reread") {
    if (isWorkerA) {
      return {
        ...base,
        status: "committed",
        statusLabel: "decremented stock",
        resultLabel: "rows_affected = 1",
      };
    }

    return {
      ...base,
      expectedVersion: 8,
      status: "rereading",
      statusLabel: "reread available 1",
    };
  }

  if (isWorkerA) {
    return {
      ...base,
      status: "committed",
      statusLabel: "decremented stock",
      resultLabel: "rows_affected = 1",
    };
  }

  if (progress < WORKER_B_RETRY_APPLY_AT) {
    return {
      ...base,
      expectedVersion: 8,
      status: "retrying",
      statusLabel: "retry checks v8",
    };
  }

  return {
    ...base,
    expectedVersion: 8,
    status: "committed",
    statusLabel: "decremented stock",
    resultLabel: "rows_affected = 1",
  };
}

function derivePackets(progress: number): PacketSnapshot[] {
  return [
    packetWindow(progress, 0.02, "workerA", "select", "to-db", "SELECT"),
    packetWindow(progress, 0.02, "workerB", "select", "to-db", "SELECT"),
    packetWindow(
      progress,
      0.12,
      "workerA",
      "read-result",
      "from-db",
      "2 left, v7",
    ),
    packetWindow(
      progress,
      0.12,
      "workerB",
      "read-result",
      "from-db",
      "2 left, v7",
    ),
    packetWindow(
      progress,
      0.31,
      "workerA",
      "write",
      "to-db",
      "decrement, expect v7",
    ),
    packetWindow(
      progress,
      0.39,
      "workerA",
      "result",
      "from-db",
      "1 row",
      "success",
    ),
    packetWindow(
      progress,
      0.47,
      "workerB",
      "write",
      "to-db",
      "decrement, expect v7",
    ),
    packetWindow(
      progress,
      0.55,
      "workerB",
      "result",
      "from-db",
      "0 rows",
      "conflict",
    ),
    packetWindow(progress, 0.62, "workerB", "select", "to-db", "SELECT"),
    packetWindow(
      progress,
      0.69,
      "workerB",
      "read-result",
      "from-db",
      "1 left, v8",
    ),
    packetWindow(
      progress,
      0.76,
      "workerB",
      "write",
      "to-db",
      "decrement, expect v8",
    ),
    packetWindow(
      progress,
      0.84,
      "workerB",
      "result",
      "from-db",
      "1 row",
      "success",
    ),
  ].filter((packet): packet is PacketSnapshot => packet !== undefined);
}

function packetWindow(
  progress: number,
  start: number,
  writer: WorkerKey,
  kind: PacketKind,
  direction: "to-db" | "from-db",
  label: string,
  tone: PacketTone = "neutral",
): PacketSnapshot | undefined {
  const end = start + PACKET_TRAVEL;
  if (progress < start || progress > end) return undefined;

  return {
    writer,
    kind,
    direction,
    progress: easeInOut((progress - start) / PACKET_TRAVEL),
    label,
    tone,
  };
}

function deriveMismatch(progress: number): VersionMismatch | undefined {
  if (progress < WORKER_B_STALE_CHECK_AT || progress >= WORKER_B_REREAD_START) {
    return undefined;
  }

  return {
    expected: 7,
    current: 8,
    intensity: Math.max(
      flashAround(progress, WORKER_B_STALE_CHECK_AT, 0.055),
      progress >= WORKER_B_CONFLICT_END ? 0.55 : 0.2,
    ),
  };
}

function flashAround(progress: number, center: number, radius: number) {
  const distance = Math.abs(progress - center);
  return easeOut(1 - clamp(distance / radius, 0, 1));
}

function phaseLabel(phase: RacePhase, progress: number) {
  if (phase === "read") {
    return "Both checkout workers read SKU-42 with 2 available units at version 7.";
  }

  if (phase === "prepare") {
    return "Both workers prepare a reservation guarded by the same expected version.";
  }

  if (phase === "worker-a-commit") {
    if (progress < WORKER_A_APPLY_AT) {
      return "Worker A reaches MySQL first and checks whether version 7 still matches.";
    }

    return "Worker A reserves one unit, so the row moves to 1 available unit at version 8.";
  }

  if (phase === "worker-b-conflict") {
    if (progress < WORKER_B_STALE_CHECK_AT) {
      return "Worker B reaches MySQL with the stale version 7 reservation.";
    }

    return "Worker B's stale update touches zero rows because the row is already version 8.";
  }

  if (phase === "worker-b-reread") {
    return "Worker B rereads the latest row, sees one unit left at version 8, and retries the decrement.";
  }

  if (progress < WORKER_B_RETRY_APPLY_AT) {
    return "Worker B retries the decrement with expected version 8 instead of replaying a stale absolute value.";
  }

  return "Worker B's retry succeeds: available reaches 0 and the row advances to version 9.";
}
