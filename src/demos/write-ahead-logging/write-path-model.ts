export type WalWritePathPhase =
  | "accepting-sql"
  | "writing-wal"
  | "applying-memory"
  | "complete";

export type WalWritePathState = {
  progress: number;
  playing: boolean;
};

export type WalWritePathStatus = "pending" | "active" | "complete";

export type WalRecordStatus = "pending" | "writing" | "durable";

export type MemoryRowStatus = "waiting-for-wal" | "applying" | "current";

export type WalWritePacketStage =
  | "sql-to-database"
  | "database-to-wal"
  | "database-to-memory";

export type WalWritePacket = {
  stage: WalWritePacketStage;
  progress: number;
};

export type WalWritePathSnapshot = {
  progress: number;
  timelineProgress: number;
  playing: boolean;
  phase: WalWritePathPhase;
  phaseProgress: number;
  sql: {
    lines: readonly string[];
    status: WalWritePathStatus;
  };
  database: {
    label: string;
    detail: string;
    status: "accepting" | "accepted" | "applied";
  };
  walRecord: {
    lsn: string;
    summary: string;
    detail: string;
    status: WalRecordStatus;
  };
  memoryRow: {
    id: number;
    plan: "free" | "pro";
    status: MemoryRowStatus;
  };
  packet?: WalWritePacket;
  phaseLabel: string;
};

export const WAL_WRITE_SQL = [
  "UPDATE users",
  "SET plan = 'pro'",
  "WHERE id = 42;",
] as const;

export const WAL_WRITE_TIMING = {
  sqlAcceptedAt: 0.24,
  walDurableAt: 0.58,
  memoryAppliedAt: 0.84,
} as const;

export const INITIAL_WAL_WRITE_PATH_STATE: WalWritePathState = {
  progress: 0,
  playing: true,
};

export const REDUCED_MOTION_WAL_WRITE_PATH_STATE: WalWritePathState = {
  progress: WAL_WRITE_TIMING.walDurableAt + 0.08,
  playing: false,
};

export function deriveWalWritePathSnapshot(
  state: WalWritePathState,
): WalWritePathSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = phaseForProgress(progress);
  const phaseProgress = phaseProgressFor(progress, phase);
  const walStatus = walRecordStatus(progress);
  const memoryStatus = memoryRowStatus(progress);

  return {
    progress,
    timelineProgress: timelineProgressFor(progress),
    playing: state.playing,
    phase,
    phaseProgress,
    sql: {
      lines: WAL_WRITE_SQL,
      status: progress < WAL_WRITE_TIMING.sqlAcceptedAt ? "active" : "complete",
    },
    database: {
      label: "Postgres DB",
      detail: "accepts UPDATE",
      status:
        memoryStatus === "current"
          ? "applied"
          : progress < WAL_WRITE_TIMING.sqlAcceptedAt
            ? "accepting"
            : "accepted",
    },
    walRecord: {
      lsn: "24023128",
      summary: "UPDATE users #42",
      detail: "plan: free -> pro",
      status: walStatus,
    },
    memoryRow: {
      id: 42,
      plan: memoryStatus === "current" ? "pro" : "free",
      status: memoryStatus,
    },
    packet: packetForPhase(phase, phaseProgress),
    phaseLabel: phaseLabel(phase),
  };
}

export function nextWalWritePathProgress(progress: number, delta: number) {
  const nextProgress = progress + delta;
  if (nextProgress < 1) return nextProgress;

  return nextProgress - Math.floor(nextProgress);
}

function phaseForProgress(progress: number): WalWritePathPhase {
  if (progress < WAL_WRITE_TIMING.sqlAcceptedAt) return "accepting-sql";
  if (progress < WAL_WRITE_TIMING.walDurableAt) return "writing-wal";
  if (progress < WAL_WRITE_TIMING.memoryAppliedAt) return "applying-memory";
  return "complete";
}

function phaseProgressFor(progress: number, phase: WalWritePathPhase): number {
  if (phase === "accepting-sql") {
    return progress / WAL_WRITE_TIMING.sqlAcceptedAt;
  }

  if (phase === "writing-wal") {
    return (
      (progress - WAL_WRITE_TIMING.sqlAcceptedAt) /
      (WAL_WRITE_TIMING.walDurableAt - WAL_WRITE_TIMING.sqlAcceptedAt)
    );
  }

  if (phase === "applying-memory") {
    return (
      (progress - WAL_WRITE_TIMING.walDurableAt) /
      (WAL_WRITE_TIMING.memoryAppliedAt - WAL_WRITE_TIMING.walDurableAt)
    );
  }

  return 1;
}

function walRecordStatus(progress: number): WalRecordStatus {
  if (progress < WAL_WRITE_TIMING.sqlAcceptedAt) return "pending";
  if (progress < WAL_WRITE_TIMING.walDurableAt) return "writing";
  return "durable";
}

function memoryRowStatus(progress: number): MemoryRowStatus {
  if (progress < WAL_WRITE_TIMING.walDurableAt) return "waiting-for-wal";
  if (progress < WAL_WRITE_TIMING.memoryAppliedAt) return "applying";
  return "current";
}

function packetForPhase(
  phase: WalWritePathPhase,
  phaseProgress: number,
): WalWritePacket | undefined {
  if (phase === "complete") return undefined;

  const stageByPhase: Record<
    Exclude<WalWritePathPhase, "complete">,
    WalWritePacketStage
  > = {
    "accepting-sql": "sql-to-database",
    "writing-wal": "database-to-wal",
    "applying-memory": "database-to-memory",
  };

  return {
    stage: stageByPhase[phase],
    progress: phaseProgress,
  };
}

function timelineProgressFor(progress: number) {
  return clamp(progress / WAL_WRITE_TIMING.memoryAppliedAt, 0, 1);
}

function phaseLabel(phase: WalWritePathPhase) {
  if (phase === "accepting-sql") {
    return "The database accepts the SQL update.";
  }

  if (phase === "writing-wal") {
    return "The update is appended to the WAL before memory changes.";
  }

  if (phase === "applying-memory") {
    return "The WAL record is durable; memory can now apply the update.";
  }

  return "Memory now shows users #42 on the pro plan.";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
