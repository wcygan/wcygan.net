export const MULTIPLIER_INPUT_INTERVAL_MS = 200;
export const MULTIPLIER_DOWNSTREAM_REQUEST_COUNT = 3;
export const MULTIPLIER_READS_PER_REQUEST = 2;
export const MULTIPLIER_DOWNSTREAM_INTERVAL_MS =
  MULTIPLIER_INPUT_INTERVAL_MS / MULTIPLIER_DOWNSTREAM_REQUEST_COUNT;
export const MULTIPLIER_READ_INTERVAL_MS =
  MULTIPLIER_INPUT_INTERVAL_MS /
  (MULTIPLIER_DOWNSTREAM_REQUEST_COUNT * MULTIPLIER_READS_PER_REQUEST);

// Short packet lifetimes keep each causal burst legible instead of turning a
// singular rail into a continuously glowing band of traffic.
export const MULTIPLIER_INPUT_TRAVEL_MS = 220;
export const MULTIPLIER_DOWNSTREAM_TRAVEL_MS = 180;
export const MULTIPLIER_DATABASE_READ_TRAVEL_MS = 150;
export const MULTIPLIER_DATABASE_HANDOFF_MS = 80;

export type MultiplierPacketKind = "input" | "downstream" | "db-read";

export type MultiplierPacket = {
  id: string;
  kind: MultiplierPacketKind;
  inputIndex: number;
  downstreamIndex?: number;
  childIndex?: number;
  readIndex?: number;
  progress: number;
};

export type MultiplierSnapshot = {
  elapsedMs: number;
  inputRequestsStarted: number;
  downstreamRequestsStarted: number;
  databaseReadsStarted: number;
  packets: MultiplierPacket[];
};

export const INITIAL_MULTIPLIER_SNAPSHOT = deriveMultiplierSnapshot(0);

export function deriveMultiplierSnapshot(
  elapsedMs: number,
): MultiplierSnapshot {
  const elapsed = Math.max(0, elapsedMs);
  const packets: MultiplierPacket[] = [];

  for (const index of activeEventIndices(
    elapsed,
    0,
    MULTIPLIER_INPUT_INTERVAL_MS,
    MULTIPLIER_INPUT_TRAVEL_MS,
  )) {
    packets.push({
      id: `input-${index}`,
      kind: "input",
      inputIndex: index,
      progress: eventProgress(
        elapsed,
        index * MULTIPLIER_INPUT_INTERVAL_MS,
        MULTIPLIER_INPUT_TRAVEL_MS,
      ),
    });
  }

  const downstreamStartMs = MULTIPLIER_INPUT_TRAVEL_MS;
  for (const downstreamIndex of activeEventIndices(
    elapsed,
    downstreamStartMs,
    MULTIPLIER_DOWNSTREAM_INTERVAL_MS,
    MULTIPLIER_DOWNSTREAM_TRAVEL_MS,
  )) {
    const inputIndex = Math.floor(
      downstreamIndex / MULTIPLIER_DOWNSTREAM_REQUEST_COUNT,
    );
    const childIndex = downstreamIndex % MULTIPLIER_DOWNSTREAM_REQUEST_COUNT;
    packets.push({
      id: `downstream-${inputIndex}-${childIndex}`,
      kind: "downstream",
      inputIndex,
      downstreamIndex,
      childIndex,
      progress: eventProgress(
        elapsed,
        downstreamStartMs + downstreamIndex * MULTIPLIER_DOWNSTREAM_INTERVAL_MS,
        MULTIPLIER_DOWNSTREAM_TRAVEL_MS,
      ),
    });
  }

  const databaseStartMs =
    downstreamStartMs +
    MULTIPLIER_DOWNSTREAM_TRAVEL_MS +
    MULTIPLIER_DATABASE_HANDOFF_MS;
  for (const readSequenceIndex of activeEventIndices(
    elapsed,
    databaseStartMs,
    MULTIPLIER_READ_INTERVAL_MS,
    MULTIPLIER_DATABASE_READ_TRAVEL_MS,
  )) {
    const downstreamIndex = Math.floor(
      readSequenceIndex / MULTIPLIER_READS_PER_REQUEST,
    );
    const inputIndex = Math.floor(
      downstreamIndex / MULTIPLIER_DOWNSTREAM_REQUEST_COUNT,
    );
    const childIndex = downstreamIndex % MULTIPLIER_DOWNSTREAM_REQUEST_COUNT;
    const readIndex = readSequenceIndex % MULTIPLIER_READS_PER_REQUEST;
    packets.push({
      id: `db-read-${inputIndex}-${childIndex}-${readIndex}`,
      kind: "db-read",
      inputIndex,
      downstreamIndex,
      childIndex,
      readIndex,
      progress: eventProgress(
        elapsed,
        databaseStartMs + readSequenceIndex * MULTIPLIER_READ_INTERVAL_MS,
        MULTIPLIER_DATABASE_READ_TRAVEL_MS,
      ),
    });
  }

  return {
    elapsedMs: elapsed,
    inputRequestsStarted: startedEventCount(
      elapsed,
      0,
      MULTIPLIER_INPUT_INTERVAL_MS,
    ),
    downstreamRequestsStarted: startedEventCount(
      elapsed,
      downstreamStartMs,
      MULTIPLIER_DOWNSTREAM_INTERVAL_MS,
    ),
    databaseReadsStarted: startedEventCount(
      elapsed,
      databaseStartMs,
      MULTIPLIER_READ_INTERVAL_MS,
    ),
    packets,
  };
}

function activeEventIndices(
  elapsedMs: number,
  startMs: number,
  intervalMs: number,
  travelMs: number,
) {
  const first = Math.max(
    0,
    Math.floor((elapsedMs - startMs - travelMs) / intervalMs) + 1,
  );
  const last = Math.floor((elapsedMs - startMs) / intervalMs);
  const indices: number[] = [];

  for (let index = first; index <= last; index += 1) {
    const progress = eventProgress(
      elapsedMs,
      startMs + index * intervalMs,
      travelMs,
    );
    if (progress >= 0 && progress < 1) indices.push(index);
  }

  return indices;
}

function startedEventCount(
  elapsedMs: number,
  startMs: number,
  intervalMs: number,
) {
  if (elapsedMs < startMs) return 0;
  return Math.floor((elapsedMs - startMs) / intervalMs + 1e-9) + 1;
}

function eventProgress(elapsedMs: number, startMs: number, travelMs: number) {
  return clamp((elapsedMs - startMs) / travelMs, 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
