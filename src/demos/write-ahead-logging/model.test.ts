import { describe, expect, it } from "vitest";
import {
  deriveReplaySnapshot,
  nextAppliedCount,
  REPLAY_LOG_RECORDS,
} from "./model";

describe("deriveReplaySnapshot", () => {
  it("starts with eight log records and three in-memory records", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 0,
      stepProgress: 0,
    });

    expect(REPLAY_LOG_RECORDS).toHaveLength(8);
    expect(snapshot.database.map((record) => record.key)).toEqual([
      "A",
      "B",
      "C",
    ]);
    expect(
      snapshot.database.every((record) => record.status === "missing"),
    ).toBe(true);
  });

  it("applies the first three INSERT records", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 3,
      stepProgress: 1,
    });

    expect(snapshot.database).toMatchObject([
      { key: "A", status: "present", balance: 900 },
      { key: "B", status: "present", balance: 250 },
      { key: "C", status: "present", balance: 1200 },
    ]);
  });

  it("updates Account A when its UPDATE record is replayed", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 4,
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

  it("deletes Account C when its DELETE record is replayed", () => {
    const snapshot = deriveReplaySnapshot({
      appliedCount: 7,
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
      appliedCount: 8,
      stepProgress: 1,
    });

    expect(snapshot.database).toMatchObject([
      { key: "A", status: "present", balance: 725 },
      { key: "B", status: "present", balance: 180 },
      { key: "C", status: "deleted", balance: undefined },
    ]);
    expect(snapshot.activeRecord).toBeUndefined();
  });

  it("loops from the complete replay state back to an empty in-memory DB", () => {
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
      { key: "A", status: "missing", balance: undefined },
      { key: "B", status: "missing", balance: undefined },
      { key: "C", status: "missing", balance: undefined },
    ]);
  });
});
