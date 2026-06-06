import { describe, expect, it } from "vitest";
import {
  buildQueryComparison,
  DEFAULT_RECORD_COUNT,
  deriveRoundTripSnapshot,
  REDUCED_MOTION_ROUND_TRIP_PROGRESS,
} from "./model";

describe("buildQueryComparison", () => {
  it("models N+1 as one parent query plus one child query per record", () => {
    const comparison = buildQueryComparison(DEFAULT_RECORD_COUNT);

    expect(comparison.nPlusOne.recordsWanted).toBe(10);
    expect(comparison.nPlusOne.queryCount).toBe(11);
    expect(comparison.nPlusOne.trips[0]).toMatchObject({
      label: "Fetch 10 users",
      role: "parent",
      recordCount: 10,
    });
    expect(
      comparison.nPlusOne.trips.filter((trip) => trip.role === "child"),
    ).toHaveLength(10);
  });

  it("models the batched version as one parent query plus one set lookup", () => {
    const comparison = buildQueryComparison(DEFAULT_RECORD_COUNT);

    expect(comparison.batch.recordsWanted).toBe(10);
    expect(comparison.batch.queryCount).toBe(2);
    expect(comparison.batch.trips).toEqual([
      {
        id: "users",
        label: "Fetch 10 users",
        detail: "SELECT users LIMIT 10",
        recordCount: 10,
        role: "parent",
      },
      {
        id: "orders",
        label: "Fetch orders once",
        detail: "orders WHERE user_id IN (...)",
        recordCount: 10,
        role: "batch",
      },
    ]);
  });

  it("keeps the output fixed while showing the query budget savings", () => {
    const comparison = buildQueryComparison(10);

    expect(comparison.nPlusOne.recordsWanted).toBe(
      comparison.batch.recordsWanted,
    );
    expect(comparison.savedQueries).toBe(9);
    expect(comparison.maxQueryCount).toBe(11);
    expect(comparison.nPlusOne.estimatedMs).toBeGreaterThan(
      comparison.batch.estimatedMs,
    );
  });

  it("normalizes invalid record counts to at least one parent record", () => {
    const comparison = buildQueryComparison(0);

    expect(comparison.recordCount).toBe(1);
    expect(comparison.nPlusOne.queryCount).toBe(2);
    expect(comparison.batch.queryCount).toBe(2);
  });

  it("animates N+1 records one at a time", () => {
    expect(
      deriveRoundTripSnapshot({ progress: 0 }).nPlusOne.fetchedRecords,
    ).toBe(0);
    expect(
      deriveRoundTripSnapshot({ progress: 0.095 }).nPlusOne.fetchedRecords,
    ).toBe(1);
    expect(
      deriveRoundTripSnapshot({ progress: 0.595 }).nPlusOne.fetchedRecords,
    ).toBe(6);
    expect(
      deriveRoundTripSnapshot({
        progress: REDUCED_MOTION_ROUND_TRIP_PROGRESS,
      }).nPlusOne.fetchedRecords,
    ).toBe(10);
  });

  it("animates the batch response as a jump from zero to all records", () => {
    expect(deriveRoundTripSnapshot({ progress: 0.07 }).batch).toMatchObject({
      fetchedRecords: 0,
      phase: "request",
    });
    expect(deriveRoundTripSnapshot({ progress: 0.14 }).batch).toMatchObject({
      fetchedRecords: 0,
      phase: "response",
    });
    expect(deriveRoundTripSnapshot({ progress: 0.19 }).batch).toMatchObject({
      fetchedRecords: 10,
      phase: "settled",
    });
  });

  it("moves packets from app to database and back", () => {
    expect(
      deriveRoundTripSnapshot({ progress: 0.02 }).nPlusOne.packet,
    ).toMatchObject({
      direction: "to-db",
      tone: "request",
    });
    expect(
      deriveRoundTripSnapshot({ progress: 0.06 }).nPlusOne.packet,
    ).toMatchObject({
      direction: "from-db",
      tone: "data",
    });
    expect(
      deriveRoundTripSnapshot({ progress: 0.05 }).batch.packet,
    ).toMatchObject({
      direction: "to-db",
      tone: "request",
    });
    expect(
      deriveRoundTripSnapshot({ progress: 0.14 }).batch.packet,
    ).toMatchObject({
      direction: "from-db",
      tone: "data",
    });
  });

  it("uses linear packet interpolation for steady rail movement", () => {
    expect(
      deriveRoundTripSnapshot({ progress: 0.016 }).nPlusOne.packet?.progress,
    ).toBeCloseTo(0.5);
    expect(
      deriveRoundTripSnapshot({ progress: 0.055 }).batch.packet?.progress,
    ).toBeCloseTo(0.5);
  });

  it("uses stable explanatory lane copy", () => {
    const snapshot = deriveRoundTripSnapshot({ progress: 0.42 });

    expect(snapshot.nPlusOne.statusLabel).toBe(
      "Each of the 10 records is requested and fetched individually.",
    );
    expect(snapshot.batch.statusLabel).toBe(
      "All 10 records are fetched and returned together.",
    );
  });
});
