export type WalUpdate = {
  lsn: string;
  id: number;
  operation: "UPDATE" | "DELETE";
  walSummary: string;
  walDetail: string;
  kafkaSummary: string;
};

export type WalUpdateStatus = "pending" | "reading" | "emitting" | "produced";

export type PacketStage = "wal-to-debezium" | "debezium-to-kafka";

export type DemoState = {
  progress: number;
  playing: boolean;
};

export type DerivedWalUpdate = WalUpdate & {
  status: WalUpdateStatus;
  offset?: number;
};

export type EventPacket = {
  stage: PacketStage;
  progress: number;
  update: DerivedWalUpdate;
};

export type WalKafkaSnapshot = {
  progress: number;
  playing: boolean;
  updates: DerivedWalUpdate[];
  activeIndex: number;
  activeUpdate: DerivedWalUpdate;
  emittedCount: number;
  packet?: EventPacket;
  phaseLabel: string;
};

export const WAL_UPDATES: readonly WalUpdate[] = [
  {
    lsn: "24023128",
    id: 42,
    operation: "UPDATE",
    walSummary: "UPDATE users #42",
    walDetail: "plan: free -> pro",
    kafkaSummary: "user 42 plan changed",
  },
  {
    lsn: "24023144",
    id: 7,
    operation: "DELETE",
    walSummary: "DELETE users #7",
    walDetail: "row removed",
    kafkaSummary: "user 7 deleted",
  },
  {
    lsn: "24023160",
    id: 9,
    operation: "UPDATE",
    walSummary: "UPDATE users #9",
    walDetail: "plan: free -> team",
    kafkaSummary: "user 9 plan changed",
  },
] as const;

const READ_END = 0.34;
const EMIT_END = 0.82;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function easeOut(value: number) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

export function progressForProducedCount(count: number) {
  if (count <= 0) return 0;
  if (count >= WAL_UPDATES.length) return 0.96;

  return (count - 1 + 0.9) / WAL_UPDATES.length;
}

export function deriveWalKafkaSnapshot(state: DemoState): WalKafkaSnapshot {
  const progress = clamp(state.progress, 0, 1);
  const scaledProgress = progress * WAL_UPDATES.length;
  const activeIndex = Math.min(
    WAL_UPDATES.length - 1,
    Math.floor(scaledProgress),
  );
  const localProgress =
    activeIndex === WAL_UPDATES.length - 1 && progress === 1
      ? 1
      : scaledProgress - activeIndex;

  let emittedOffset = 0;
  const updates = WAL_UPDATES.map((update, index): DerivedWalUpdate => {
    const status = updateStatus(index, activeIndex, localProgress);
    const offset = status === "produced" ? emittedOffset++ : undefined;
    return { ...update, status, offset };
  });

  const activeUpdate = updates[activeIndex];

  return {
    progress,
    playing: state.playing,
    updates,
    activeIndex,
    activeUpdate,
    emittedCount: updates.filter((update) => update.status === "produced")
      .length,
    packet: activePacket(activeUpdate, localProgress),
    phaseLabel: phaseLabel(localProgress),
  };
}

function updateStatus(
  index: number,
  activeIndex: number,
  localProgress: number,
): WalUpdateStatus {
  if (index < activeIndex) return "produced";
  if (index > activeIndex) return "pending";
  if (localProgress < READ_END) return "reading";
  if (localProgress < EMIT_END) return "emitting";
  return "produced";
}

function activePacket(
  update: DerivedWalUpdate,
  localProgress: number,
): EventPacket | undefined {
  if (localProgress < READ_END) {
    return {
      stage: "wal-to-debezium",
      progress: easeOut(localProgress / READ_END),
      update,
    };
  }

  if (localProgress < EMIT_END) {
    return {
      stage: "debezium-to-kafka",
      progress: easeOut((localProgress - READ_END) / (EMIT_END - READ_END)),
      update,
    };
  }

  return undefined;
}

function phaseLabel(localProgress: number) {
  if (localProgress < READ_END) return "Reading WAL";
  if (localProgress < EMIT_END) return "Producing Kafka event";
  return "Kafka event appended";
}
