import { describe, expect, it } from "vitest";
import {
  BATCH_QUERY_MS,
  buildQueryComparison,
  DEFAULT_RECORD_COUNT,
  deriveRoundTripSnapshot,
  QUERY_TURN_MS,
  REDUCED_MOTION_ROUND_TRIP_PROGRESS,
} from "./model";

describe("buildQueryComparison", () => {
  it("models per-id lookups as one query per known order id", () => {
    const comparison = buildQueryComparison(DEFAULT_RECORD_COUNT);

    expect(comparison.nPlusOne.recordsWanted).toBe(10);
    expect(comparison.nPlusOne.queryCount).toBe(10);
    expect(
      comparison.nPlusOne.trips.filter((trip) => trip.role === "individual"),
    ).toHaveLength(10);
    expect(comparison.nPlusOne.trips[0]).toMatchObject({
      label: "Order id 1",
      detail: "orders WHERE id = ?",
      recordCount: 1,
    });
  });

  it("models the batched version as one set lookup for all known ids", () => {
    const comparison = buildQueryComparison(DEFAULT_RECORD_COUNT);

    expect(comparison.batch.recordsWanted).toBe(10);
    expect(comparison.batch.queryCount).toBe(1);
    expect(comparison.batch.trips).toEqual([
      {
        id: "orders",
        label: "Fetch 10 orders once",
        detail: "orders WHERE id IN (...)",
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
    expect(comparison.maxQueryCount).toBe(10);
    expect(comparison.nPlusOne.estimatedMs).toBe(10 * QUERY_TURN_MS);
    expect(comparison.batch.estimatedMs).toBe(BATCH_QUERY_MS);
  });

  it("normalizes invalid record counts to at least one order id", () => {
    const comparison = buildQueryComparison(0);

    expect(comparison.recordCount).toBe(1);
    expect(comparison.nPlusOne.queryCount).toBe(1);
    expect(comparison.batch.queryCount).toBe(1);
  });

  it("animates N+1 orders one at a time", () => {
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

  it("animates the batch response as a jump from zero to all orders", () => {
    expect(deriveRoundTripSnapshot({ progress: 0.04 }).batch).toMatchObject({
      fetchedRecords: 0,
      phase: "request",
    });
    expect(deriveRoundTripSnapshot({ progress: 0.2 }).batch).toMatchObject({
      fetchedRecords: 0,
      phase: "response",
    });
    expect(deriveRoundTripSnapshot({ progress: 0.29 }).batch).toMatchObject({
      fetchedRecords: 10,
      phase: "settled",
    });
  });

  it("tracks elapsed query time until each lane completes", () => {
    expect(deriveRoundTripSnapshot({ progress: 0 }).nPlusOne.elapsedMs).toBe(0);
    expect(deriveRoundTripSnapshot({ progress: 0 }).batch.elapsedMs).toBe(0);
    expect(deriveRoundTripSnapshot({ progress: 0.1 }).nPlusOne.elapsedMs).toBe(
      QUERY_TURN_MS,
    );
    expect(deriveRoundTripSnapshot({ progress: 0.6 }).nPlusOne.elapsedMs).toBe(
      6 * QUERY_TURN_MS,
    );
    expect(deriveRoundTripSnapshot({ progress: 0.29 }).batch.elapsedMs).toBe(
      BATCH_QUERY_MS,
    );
    expect(
      deriveRoundTripSnapshot({
        progress: REDUCED_MOTION_ROUND_TRIP_PROGRESS,
      }).nPlusOne.elapsedMs,
    ).toBe(10 * QUERY_TURN_MS);
    expect(
      deriveRoundTripSnapshot({
        progress: REDUCED_MOTION_ROUND_TRIP_PROGRESS,
      }).batch.elapsedMs,
    ).toBe(BATCH_QUERY_MS);
  });

  it("starts both request lanes at the same time", () => {
    const snapshot = deriveRoundTripSnapshot({ progress: 0 });

    expect(snapshot.nPlusOne).toMatchObject({
      phase: "request",
      elapsedMs: 0,
    });
    expect(snapshot.nPlusOne.packet).toMatchObject({
      direction: "to-db",
      progress: 0,
      tone: "request",
    });
    expect(snapshot.batch).toMatchObject({
      phase: "request",
      elapsedMs: 0,
    });
    expect(snapshot.batch.packet).toMatchObject({
      direction: "to-db",
      progress: 0,
      tone: "request",
    });
  });

  it("keeps the per-id timer running between one response and the next request", () => {
    const afterResponse = deriveRoundTripSnapshot({ progress: 0.083 }).nPlusOne;
    const beforeNextRequest = deriveRoundTripSnapshot({
      progress: 0.099,
    }).nPlusOne;

    expect(afterResponse.fetchedRecords).toBe(1);
    expect(beforeNextRequest.fetchedRecords).toBe(1);
    expect(beforeNextRequest.elapsedMs).toBeGreaterThan(
      afterResponse.elapsedMs,
    );
    expect(beforeNextRequest.elapsedMs).toBe(QUERY_TURN_MS);
  });

  it("holds a settled final state at the end of the animation", () => {
    const snapshot = deriveRoundTripSnapshot({ progress: 1 });

    expect(snapshot.nPlusOne).toMatchObject({
      fetchedRecords: 10,
      elapsedMs: 10 * QUERY_TURN_MS,
      phase: "settled",
      packet: undefined,
    });
    expect(snapshot.batch).toMatchObject({
      fetchedRecords: 10,
      elapsedMs: BATCH_QUERY_MS,
      phase: "settled",
      packet: undefined,
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
      deriveRoundTripSnapshot({ progress: 0.03 }).batch.packet,
    ).toMatchObject({
      direction: "to-db",
      tone: "request",
    });
    expect(
      deriveRoundTripSnapshot({ progress: 0.23 }).batch.packet,
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
      deriveRoundTripSnapshot({ progress: 0.03 }).batch.packet?.progress,
    ).toBeCloseTo(0.5);
  });

  it("uses stable explanatory lane copy", () => {
    const snapshot = deriveRoundTripSnapshot({ progress: 0.42 });

    expect(snapshot.nPlusOne.statusLabel).toBe(
      "Each of the 10 known order ids is requested and fetched individually.",
    );
    expect(snapshot.batch.statusLabel).toBe(
      "All 10 orders are fetched and returned together.",
    );
  });
});
