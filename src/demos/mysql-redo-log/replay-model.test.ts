import { describe, expect, it } from "vitest";
import {
  deriveReplaySnapshot,
  nextAppliedCount,
  REPLAY_LOG_RECORDS,
} from "./replay-model";

describe("deriveReplaySnapshot", () => {
  it("starts with checkpointed data files and six redo records", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 0,
      stepProgress: 0,
    });

    expect(REPLAY_LOG_RECORDS).toHaveLength(6);
    expect(snapshot.database).toMatchObject([
      { key: "A", status: "present", balance: 900 },
      { key: "B", status: "present", balance: 250 },
      { key: "C", status: "missing" },
    ]);
  });

  it("applies the first redo record after the checkpoint", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 1,
      stepProgress: 1,
    });

    expect(
      snapshot.database.find((record) => record.key === "A"),
    ).toMatchObject({
      status: "present",
      balance: 800,
      lastOperation: "UPDATE",
    });
  });

  it("inserts Account C when its INSERT record is replayed", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 2,
      stepProgress: 1,
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
      stepProgress: 1,
    });

    expect(
      snapshot.database.find((record) => record.key === "C"),
    ).toMatchObject({
      status: "deleted",
      balance: undefined,
      lastOperation: "DELETE",
    });
  });

  it("finishes with the latest values for all replayed records", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 6,
      stepProgress: 1,
    });

    expect(snapshot.database).toMatchObject([
      { key: "A", status: "present", balance: 725 },
      { key: "B", status: "present", balance: 180 },
      { key: "C", status: "deleted", balance: undefined },
    ]);
    expect(snapshot.activeRecord).toBeUndefined();
  });

  it("loops from the complete replay state back to the checkpoint", () => {
    const nextCount = nextAppliedCount(REPLAY_LOG_RECORDS.length);
    const snapshot = deriveReplaySnapshot({
      appliedCount: nextCount,
      stepProgress: 0,
    });

    expect(nextCount).toBe(0);
    expect(snapshot.appliedCount).toBe(0);
    expect(
      snapshot.database.map((record) => ({
        key: record.key,
        status: record.status,
        balance: record.balance,
      })),
    ).toEqual([
      { key: "A", status: "present", balance: 900 },
      { key: "B", status: "present", balance: 250 },
      { key: "C", status: "missing", balance: undefined },
    ]);
  });
});
