import { describe, expect, it } from "vitest";
import {
  ILLUSTRATIVE_KEY_MAP,
  KEY_SEQUENCE,
  keyRoutingSnapshot,
  readNext,
  replayReader,
  replicationSnapshot,
  RETAINED_OFFSETS,
  lagSnapshot,
  skewSnapshot,
  placementSnapshot,
} from "./spatial-model";

it("caps the toy producer and catches up without changing the log end", () => {
  expect(lagSnapshot(99, 3)).toEqual({ end: 8, processed: 3, lag: 5 });
  expect(lagSnapshot(8, 99)).toEqual({ end: 8, processed: 8, lag: 0 });
  expect(lagSnapshot(4, 1)).toEqual({ end: 4, processed: 1, lag: 3 });
});
it("keeps six records and key affinity while exposing the busiest lane", () => {
  const hot = skewSnapshot(true),
    balanced = skewSnapshot(false);
  expect(hot.counts).toEqual([4, 1, 1]);
  expect(balanced.counts).toEqual([2, 2, 2]);
  expect(hot.rounds).toBe(4);
  expect(balanced.rounds).toBe(2);
  for (const snapshot of [hot, balanced]) {
    expect(snapshot.records).toHaveLength(6);
    for (const r of snapshot.records)
      expect(r.partition).toBe(ILLUSTRATIVE_KEY_MAP[r.key]);
  }
});
it("moves every leader exactly once without inventing replicas", () => {
  expect(placementSnapshot(false).map((p) => p.broker)).toEqual([0, 0, 0]);
  const spread = placementSnapshot(true);
  expect(spread.map((p) => p.partition)).toEqual([0, 1, 2]);
  expect(spread.map((p) => p.broker)).toEqual([0, 1, 2]);
});

describe("Kafka intro spatial lessons", () => {
  it("advances readers independently and keeps the retained log intact", () => {
    let positions = { billing: 0, analytics: 0 };
    for (let i = 0; i < 8; i++) positions = readNext(positions, "billing");
    expect(positions).toEqual({ billing: 6, analytics: 0 });
    positions = readNext(positions, "analytics");
    expect(replayReader(positions, "billing")).toEqual({
      billing: 0,
      analytics: 1,
    });
    expect(RETAINED_OFFSETS).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("keeps keys in their illustrative partition with independent local offsets", () => {
    const { records } = keyRoutingSnapshot(99);
    expect(records.map((record) => record.key)).toEqual(KEY_SEQUENCE);
    for (const record of records) {
      expect(record.partition).toBe(ILLUSTRATIVE_KEY_MAP[record.key]);
    }
    expect(
      [0, 1, 2].map((partition) =>
        records.filter((r) => r.partition === partition).map((r) => r.offset),
      ),
    ).toEqual([[0, 1, 2], [0, 1], [0]]);
    expect(records.filter((record) => record.offset === 0)).toHaveLength(3);
    expect(keyRoutingSnapshot(-1).records).toEqual([]);
    expect(keyRoutingSnapshot(2).next).toBe("A");
  });

  it("elects a caught-up safe replica and retains copies on stopped brokers", () => {
    const initial = replicationSnapshot(0);
    expect(initial.brokers.map((b) => b.offsets)).toEqual([
      [0, 1, 2],
      [0, 1, 2],
      [0, 1, 2],
    ]);
    const failed = replicationSnapshot(1);
    expect(failed.leader).toBe(1);
    expect(failed.inSync).toContain(failed.leader);
    expect(failed.inSync).toEqual([1, 2]);
    const written = replicationSnapshot(2);
    expect(written.brokers[0].offsets).toEqual([0, 1, 2]);
    expect(written.brokers[1].offsets).toEqual(written.brokers[2].offsets);
    expect(written.brokers[1].offsets).toEqual([0, 1, 2, 3]);
  });

  it("rejects the final write when acks=all cannot meet min.insync.replicas=2", () => {
    expect(replicationSnapshot(1).canWrite).toBe(true);
    expect(replicationSnapshot(2).canWrite).toBe(true);
    const before = replicationSnapshot(3);
    const after = replicationSnapshot(4);
    expect(before.inSync).toEqual([1]);
    expect(before.canWrite).toBe(false);
    expect(after.rejected).toBe(true);
    expect(after.brokers).toEqual(before.brokers);
    expect(after.done).toBe(true);
    expect(replicationSnapshot(99)).toEqual(after);
  });
});
