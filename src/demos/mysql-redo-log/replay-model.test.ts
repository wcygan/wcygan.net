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
    const snapshot = deriveReplayTimelineSnapshot(0.075);

    expect(REPLAY_DURATION_MS).toBe(16_000);
    expect(snapshot.appliedCount).toBe(0);
    expect(snapshot.stepProgress).toBe(0);
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
    expect(snapshot.cursorProgress).toBe(1);
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
