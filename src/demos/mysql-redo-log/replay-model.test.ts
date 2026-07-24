import { describe, expect, it } from "vitest";
import {
  deriveReplaySnapshot,
  deriveReplayTimelineSnapshot,
  nextAppliedCount,
  REDUCED_MOTION_REPLAY_STATE,
  REPLAY_DURATION_MS,
  REPLAY_LOG_RECORDS,
} from "./replay-model";

describe("deriveReplaySnapshot", () => {
  it("starts with checkpointed data files and six ordered redo records", () => {
    const snapshot = deriveReplayTimelineSnapshot(0);

    expect(REPLAY_LOG_RECORDS.map((record) => record.sequence)).toEqual([
      101, 102, 103, 104, 105, 106,
    ]);
    expect(snapshot.database).toMatchObject([
      { key: "A", status: "present", balance: 900 },
      { key: "B", status: "present", balance: 250 },
      { key: "C", status: "missing" },
    ]);
  });

  it("leaves time to establish the checkpoint before replay begins", () => {
    const snapshot = deriveReplayTimelineSnapshot(0.07);

    expect(REPLAY_DURATION_MS).toBe(20_000);
    expect(snapshot.appliedCount).toBe(0);
    expect(snapshot.stepProgress).toBe(0);
    expect(snapshot.phase).toBe("checkpoint");
  });

  it("applies records progressively without skipping LSNs", () => {
    const snapshot = deriveReplayTimelineSnapshot(0.5);

    expect(snapshot.appliedCount).toBe(2);
    expect(snapshot.activeRecord?.sequence).toBe(103);
    expect(snapshot.records.map((record) => record.status)).toEqual([
      "applied",
      "applied",
      "active",
      "pending",
      "pending",
      "pending",
    ]);
  });

  it("changes the served state only after the active record reaches the database", () => {
    const inTransit = deriveReplaySnapshot({
      appliedCount: 0,
      stepProgress: 0.57,
    });
    const written = deriveReplaySnapshot({
      appliedCount: 0,
      stepProgress: 0.58,
    });

    expect(inTransit.phase).toBe("transfer");
    expect(inTransit.databaseAppliedCount).toBe(0);
    expect(inTransit.database[0]).toMatchObject({ key: "A", balance: 900 });
    expect(written.phase).toBe("write");
    expect(written.databaseAppliedCount).toBe(1);
    expect(written.highlightedRecordKey).toBe("A");
    expect(written.highlightedOperation).toBe("UPDATE");
    expect(written.database[0]).toMatchObject({ key: "A", balance: 800 });
  });

  it("highlights an inserted row only after it becomes queryable", () => {
    const inTransit = deriveReplaySnapshot({
      appliedCount: 1,
      stepProgress: 0.57,
    });
    const written = deriveReplaySnapshot({
      appliedCount: 1,
      stepProgress: 0.58,
    });

    expect(inTransit.highlightedOperation).toBe("INSERT");
    expect(inTransit.highlightedRecordKey).toBeUndefined();
    expect(written.highlightedRecordKey).toBe("C");
    expect(written.database[2]).toMatchObject({
      key: "C",
      status: "present",
      balance: 1200,
    });
  });

  it("highlights a deleted row before removing it from the query result", () => {
    const inTransit = deriveReplaySnapshot({
      appliedCount: 4,
      stepProgress: 0.57,
    });
    const written = deriveReplaySnapshot({
      appliedCount: 4,
      stepProgress: 0.58,
    });

    expect(inTransit.highlightedOperation).toBe("DELETE");
    expect(inTransit.highlightedRecordKey).toBe("C");
    expect(inTransit.database[2]).toMatchObject({
      key: "C",
      status: "present",
      balance: 1200,
    });
    expect(written.highlightedOperation).toBe("DELETE");
    expect(written.highlightedRecordKey).toBeUndefined();
    expect(written.database[2]).toMatchObject({
      key: "C",
      status: "deleted",
    });
  });

  it("inserts Account C when its INSERT record is replayed", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 2,
      stepProgress: 0,
    });

    expect(
      snapshot.database.find((record) => record.key === "C"),
    ).toMatchObject({
      status: "present",
      balance: 1200,
      lastOperation: "INSERT",
    });
  });

  it("deletes Account C when its DELETE record is replayed", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 5,
      stepProgress: 0,
    });

    expect(
      snapshot.database.find((record) => record.key === "C"),
    ).toMatchObject({
      status: "deleted",
      balance: undefined,
      lastOperation: "DELETE",
    });
  });

  it("finishes with the latest values for every durable record", () => {
    const snapshot = deriveReplayTimelineSnapshot(1);

    expect(snapshot.database).toMatchObject([
      { key: "A", status: "present", balance: 725 },
      { key: "B", status: "present", balance: 180 },
      { key: "C", status: "deleted", balance: undefined },
    ]);
    expect(snapshot.activeRecord).toBeUndefined();
    expect(
      snapshot.records.every((record) => record.status === "applied"),
    ).toBe(true);
  });

  it("uses the complete recovered state when motion is reduced", () => {
    const snapshot = deriveReplaySnapshot(REDUCED_MOTION_REPLAY_STATE);

    expect(snapshot.appliedCount).toBe(REPLAY_LOG_RECORDS.length);
    expect(snapshot.databaseAppliedCount).toBe(REPLAY_LOG_RECORDS.length);
    expect(snapshot.phase).toBe("complete");
  });

  it("holds the completed replay instead of looping to the checkpoint", () => {
    const nextCount = nextAppliedCount(REPLAY_LOG_RECORDS.length);

    expect(nextCount).toBe(REPLAY_LOG_RECORDS.length);
    expect(
      deriveReplaySnapshot({ appliedCount: nextCount, stepProgress: 1 })
        .database,
    ).toMatchObject([
      { key: "A", balance: 725 },
      { key: "B", balance: 180 },
      { key: "C", status: "deleted" },
    ]);
  });
});
