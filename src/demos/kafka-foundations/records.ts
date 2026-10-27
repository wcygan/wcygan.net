import { murmur2 } from "~/demos/kafka-partitioning/model";

export const FOUNDATION_PARTITION_COUNT = 3;

const RECORDS = [
  {
    id: "A",
    color: "#ffebdc",
    key: "order-101",
    event: "OrderPlaced",
    timestamp: "2026-10-01T15:00:00Z",
    occurredAt: "2026-10-01T14:59:58Z",
  },
  {
    id: "B",
    color: "#e8f2fa",
    key: "order-102",
    event: "OrderPlaced",
    timestamp: "2026-10-01T15:00:01Z",
    occurredAt: "2026-10-01T14:59:59Z",
  },
  {
    id: "C",
    color: "#eef6e9",
    key: "order-105",
    event: "OrderPlaced",
    timestamp: "2026-10-01T15:00:02Z",
    occurredAt: "2026-10-01T15:00:00Z",
  },
  {
    id: "D",
    color: "#f1ebfa",
    key: "order-101",
    event: "OrderPaid",
    timestamp: "2026-10-01T15:00:03Z",
    occurredAt: "2026-10-01T15:00:01Z",
  },
  {
    id: "E",
    color: "#faedf2",
    key: "order-102",
    event: "OrderCancelled",
    timestamp: "2026-10-01T15:00:04Z",
    occurredAt: "2026-10-01T15:00:02Z",
  },
  {
    id: "F",
    color: "#faf2d9",
    key: "order-101",
    event: "OrderShipped",
    timestamp: "2026-10-01T15:00:05Z",
    occurredAt: "2026-10-01T15:00:03Z",
  },
] as const;

const offsets = Array<number>(FOUNDATION_PARTITION_COUNT).fill(0);
export const FOUNDATION_RECORDS = RECORDS.map((record) => {
  const hash = murmur2(record.key);
  const positiveHash = hash & 0x7fffffff;
  const partition = positiveHash % FOUNDATION_PARTITION_COUNT;
  return {
    ...record,
    hash,
    positiveHash,
    partition,
    offset: offsets[partition]++,
  };
});
