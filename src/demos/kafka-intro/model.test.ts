import { describe, expect, it } from "vitest";
import {
  assignPartitions,
  cleanupRecords,
  committedLag,
  INITIAL_INTRO_READER,
  INTRO_RECORDS,
  moveReader,
  deliverySnapshot,
  pipelineSnapshot,
} from "./model";

it("lets a publisher finish before downstream recovery only in the retained-event design", () => {
  expect(deliverySnapshot("direct", false)).toMatchObject({
    waiting: true,
    checkoutCanFinish: false,
    retained: false,
  });
  expect(deliverySnapshot("kafka", false)).toMatchObject({
    waiting: false,
    checkoutCanFinish: true,
    analyticsReceived: false,
    retained: true,
  });
  expect(deliverySnapshot("kafka", true).analyticsReceived).toBe(true);
});
it("aggregates each finite order exactly once in the toy pipeline", () => {
  expect([0, 1, 2, 3].map((n) => pipelineSnapshot(n).total)).toEqual([
    0, 42, 60, 133,
  ]);
  expect(pipelineSnapshot(8)).toEqual({ count: 3, total: 133, next: null });
});

describe("classic consumer group ownership", () => {
  it.each([1, 2, 3, 4])(
    "assigns every partition exactly once with %i members",
    (count) => {
      const members = assignPartitions(3, count);
      const owned = members.flatMap((member) => member.partitions);
      expect(owned.toSorted()).toEqual([0, 1, 2]);
      expect(new Set(owned).size).toBe(owned.length);
      expect(
        members.filter((member) => member.partitions.length > 0),
      ).toHaveLength(Math.min(3, count));
    },
  );

  it("gives two independent groups the whole topic and leaves a fourth member idle", () => {
    const analytics = assignPartitions(3, 4);
    const fulfillment = assignPartitions(3, 1);
    expect(analytics[3].partitions).toEqual([]);
    expect(fulfillment[0].partitions).toEqual([0, 1, 2]);
    expect(analytics.flatMap((member) => member.partitions).toSorted()).toEqual(
      fulfillment.flatMap((member) => member.partitions),
    );
  });
});

describe("reader position and committed checkpoint", () => {
  it("reads without committing, then saves the next offset rather than the last read offset", () => {
    const reader = moveReader(INITIAL_INTRO_READER, "read", 6);
    expect(reader).toEqual({ nextOffset: 3, committedOffset: 2 });
    expect(committedLag(reader, 6)).toBe(4);
    const committed = moveReader(reader, "commit", 6);
    expect(committed.committedOffset).toBe(3);
    expect(committedLag(committed, 6)).toBe(3);
  });

  it("restarts at the checkpoint and can replay without deleting or renumbering records", () => {
    const before = INTRO_RECORDS.map((record) => ({ ...record }));
    const advanced = moveReader(INITIAL_INTRO_READER, "read", 6);
    expect(moveReader(advanced, "restart", 6)).toEqual(INITIAL_INTRO_READER);
    const replayed = moveReader(advanced, "replay", 6);
    expect(replayed).toEqual({ nextOffset: 0, committedOffset: 2 });
    expect(INTRO_RECORDS).toEqual(before);
  });

  it("stops at the end offset, with zero lag after committing the end", () => {
    let reader = INITIAL_INTRO_READER;
    for (let index = 0; index < 8; index++)
      reader = moveReader(reader, "read", 6);
    expect(reader.nextOffset).toBe(6);
    expect(committedLag(moveReader(reader, "commit", 6), 6)).toBe(0);
  });
});

describe("cleanup preserves log identity", () => {
  it("deletes an expired segment independently of reader progress", () => {
    const result = cleanupRecords(INTRO_RECORDS, "delete");
    expect(result.map((record) => record.offset)).toEqual([3, 4, 5]);
    expect(result[0]).toBe(INTRO_RECORDS[3]);
    expect(INTRO_RECORDS).toHaveLength(6);
  });

  it("keeps the latest value of every key at its original offset, including gaps", () => {
    const result = cleanupRecords(INTRO_RECORDS, "compact");
    expect(result.map((record) => record.offset)).toEqual([1, 3, 4, 5]);
    expect(new Map(result.map((record) => [record.key, record.value]))).toEqual(
      new Map([
        ["102", "created"],
        ["104", "created"],
        ["101", "paid"],
        ["103", "paid"],
      ]),
    );
    expect(
      result.every((record) => INTRO_RECORDS[record.offset] === record),
    ).toBe(true);
  });
});
