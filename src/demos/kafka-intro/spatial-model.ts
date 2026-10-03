/** Small, explicit teaching models; these are not a Kafka implementation. */
export const RETAINED_OFFSETS = [0, 1, 2, 3, 4, 5] as const;
export type Reader = "billing" | "analytics";
export type ReaderPositions = Record<Reader, number>;

export function readNext(positions: ReaderPositions, reader: Reader) {
  return {
    ...positions,
    [reader]: Math.min(RETAINED_OFFSETS.length, positions[reader] + 1),
  };
}

export function replayReader(positions: ReaderPositions, reader: Reader) {
  return { ...positions, [reader]: 0 };
}

export const ILLUSTRATIVE_KEY_MAP = { A: 0, B: 1, C: 2 } as const;
export const KEY_SEQUENCE = ["A", "B", "A", "C", "B", "A"] as const;
export type IntroKey = keyof typeof ILLUSTRATIVE_KEY_MAP;

export function keyRoutingSnapshot(sent: number) {
  const count = Math.max(0, Math.min(KEY_SEQUENCE.length, Math.floor(sent)));
  const nextOffsets = [0, 0, 0];
  const records = KEY_SEQUENCE.slice(0, count).map((key, index) => {
    const partition = ILLUSTRATIVE_KEY_MAP[key];
    return { id: index + 1, key, partition, offset: nextOffsets[partition]++ };
  });
  return {
    records,
    next: KEY_SEQUENCE[count] ?? null,
    current: records.at(-1) ?? null,
    done: count === KEY_SEQUENCE.length,
  };
}

export const REPLICATION_STEPS = 4;
export const REPLICATION_ACTIONS = [
  "Fail broker 1",
  "Write record 3",
  "Fail broker 3",
  "Try another write",
] as const;

/**
 * All three replicas start caught up. Each failure step includes completed
 * failure detection and an eligible-replica election, not instantaneous failover.
 * We omit Kafka's broader ELR eligibility rules from this small scenario.
 */
export function replicationSnapshot(step: number) {
  const tick = Math.max(0, Math.min(REPLICATION_STEPS, Math.floor(step)));
  const brokers = [0, 1, 2].map((id) => ({
    id,
    online: id === 0 ? tick === 0 : id === 2 ? tick < 3 : true,
    offsets: tick >= 2 && id !== 0 ? [0, 1, 2, 3] : [0, 1, 2],
  }));
  const leader = tick === 0 ? 0 : 1;
  const inSync = brokers.filter((broker) => broker.online).map((b) => b.id);
  return {
    step: tick,
    brokers,
    leader,
    inSync,
    canWrite: inSync.length >= 2,
    rejected: tick === 4,
    done: tick === REPLICATION_STEPS,
    nextAction: REPLICATION_ACTIONS[tick] ?? null,
  };
}

export type CameraAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "in"
  | "out"
  | "reset";
export interface CameraCommand {
  action: CameraAction;
  revision: number;
}

export type IntroSceneState =
  | { kind: "retained"; readers: ReaderPositions }
  | { kind: "routing"; sent: number }
  | { kind: "replication"; step: number }
  | { kind: "lag"; end: number; processed: number }
  | { kind: "skew"; skewed: boolean }
  | { kind: "placement"; distributed: boolean };

/** One reader; lag here uses completed processing, not a committed group offset. */
export function lagSnapshot(end: number, processed: number) {
  const logEnd = Math.max(0, Math.min(8, Math.floor(end)));
  const position = Math.max(0, Math.min(logEnd, Math.floor(processed)));
  return { end: logEnd, processed: position, lag: logEnd - position };
}

/** The same six records under two key distributions; P0 remains the hot lane. */
export function skewSnapshot(skewed: boolean) {
  const keys: readonly IntroKey[] = skewed
    ? ["A", "A", "A", "A", "B", "C"]
    : ["A", "B", "C", "A", "B", "C"];
  const counts = [0, 0, 0];
  const records = keys.map((key, id) => {
    const partition = ILLUSTRATIVE_KEY_MAP[key];
    return { id, key, partition, offset: counts[partition]++ };
  });
  return { records, counts, rounds: Math.max(...counts) };
}

/** Leader placement only; replicas are intentionally shown in a separate demo. */
export function placementSnapshot(distributed: boolean) {
  return [0, 1, 2].map((partition) => ({
    partition,
    broker: distributed ? partition : 0,
  }));
}
