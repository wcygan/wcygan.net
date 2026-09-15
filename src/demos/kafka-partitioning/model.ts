export type RoutingMode = "keyed" | "round-robin";
export const PARTITION_COUNT = 3;
// These fixed keys cover every partition for each supported count (1–5)
// using Kafka's actual hash, without changing the routing algorithm.
export const KEYS = [
  "order-101",
  "order-102",
  "order-103",
  "order-109",
  "order-113",
  "order-129",
] as const;
export const KEY_COLORS = [
  "#d87842",
  "#527cad",
  "#66886b",
  "#9561c9",
  "#2b9991",
  "#cda52e",
] as const;
const sequence = [0, 1, 2, 3, 4, 5, 1, 2, 0];
export const TOTAL_STEPS = sequence.length * 2;

// Kafka Java client's Murmur2 hash over serialized UTF-8 key bytes.
export function murmur2(key: string): number {
  const bytes = new TextEncoder().encode(key);
  let remaining = bytes.length;
  let hash = (0x9747b28c ^ remaining) >>> 0;
  let i = 0;
  const m = 0x5bd1e995;
  while (remaining >= 4) {
    let k =
      bytes[i] |
      (bytes[i + 1] << 8) |
      (bytes[i + 2] << 16) |
      (bytes[i + 3] << 24);
    k = Math.imul(k, m);
    k ^= k >>> 24;
    k = Math.imul(k, m);
    hash = Math.imul(hash, m) ^ k;
    i += 4;
    remaining -= 4;
  }
  if (remaining === 3) hash ^= bytes[i + 2] << 16;
  if (remaining >= 2) hash ^= bytes[i + 1] << 8;
  if (remaining >= 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, m);
  }
  hash ^= hash >>> 13;
  hash = Math.imul(hash, m);
  hash ^= hash >>> 15;
  return hash >>> 0;
}

export function routeRecords(mode: RoutingMode, partitions = PARTITION_COUNT) {
  const offsets = Array<number>(partitions).fill(0);
  return sequence.map((keyIndex, index) => {
    const key = KEYS[keyIndex];
    const hash = murmur2(key) & 0x7fffffff;
    const partition = (mode === "keyed" ? hash : index) % partitions;
    return {
      id: index + 1,
      key,
      keyIndex,
      hash,
      partition,
      offset: offsets[partition]++,
    };
  });
}
export type KafkaRecord = ReturnType<typeof routeRecords>[number];

export function partitionSnapshot(
  mode: RoutingMode,
  step: number,
  partitions = PARTITION_COUNT,
) {
  const tick = Math.max(0, Math.min(TOTAL_STEPS, Math.floor(step)));
  const records = routeRecords(mode, partitions);
  const appended = records.slice(0, Math.floor(tick / 2));
  const current = tick === 0 ? null : records[Math.floor((tick - 1) / 2)];
  return {
    records,
    appended,
    current,
    routing: tick % 2 === 1,
    done: tick === TOTAL_STEPS,
  };
}
