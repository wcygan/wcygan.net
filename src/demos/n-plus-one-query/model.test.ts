import { describe, expect, it } from "vitest";
import {
  BATCH_TOTAL_MS,
  deriveQueryRaceSnapshot,
  INITIAL_QUERY_RACE_SNAPSHOT,
  ORDER_COUNT,
  PER_ID_TOTAL_MS,
  QUERY_RACE_DURATION_MS,
} from "./model";

describe("deriveQueryRaceSnapshot", () => {
  it("paces the comparison slowly enough to read each round trip", () => {
    expect(QUERY_RACE_DURATION_MS).toBe(32_000);
  });

  it("starts both lanes with the same ten-row goal", () => {
    expect(INITIAL_QUERY_RACE_SNAPSHOT.nPlusOne).toMatchObject({
      returnedOrders: 0,
      remainingTrips: ORDER_COUNT,
      phase: "waiting",
    });
    expect(INITIAL_QUERY_RACE_SNAPSHOT.batch).toMatchObject({
      returnedOrders: 0,
      remainingTrips: 1,
      phase: "waiting",
    });
  });

  it("groups all ten ids into the batch request", () => {
    const snapshot = deriveQueryRaceSnapshot(0.055);

    expect(snapshot.batch.packet).toMatchObject({
      direction: "outbound",
      label: "10 ids",
    });
    expect(snapshot.nPlusOne.packet).toMatchObject({
      direction: "outbound",
      label: "id 1",
    });
  });

  it("returns the batch rows together", () => {
    const inFlight = deriveQueryRaceSnapshot(0.16).batch;
    const returned = deriveQueryRaceSnapshot(0.2).batch;

    expect(inFlight.packet).toMatchObject({
      direction: "inbound",
      label: "10 rows",
    });
    expect(inFlight.returnedOrders).toBe(0);
    expect(returned.returnedOrders).toBe(10);
  });

  it("makes the per-id lane return one row at a time", () => {
    expect(deriveQueryRaceSnapshot(0.12).nPlusOne.returnedOrders).toBe(0);
    expect(deriveQueryRaceSnapshot(0.13).nPlusOne.returnedOrders).toBe(1);
    expect(deriveQueryRaceSnapshot(0.5).nPlusOne.returnedOrders).toBe(5);
    expect(deriveQueryRaceSnapshot(0.87).nPlusOne.returnedOrders).toBe(9);
  });

  it("holds the batch lane while N plus one keeps crossing the boundary", () => {
    const snapshot = deriveQueryRaceSnapshot(0.5);

    expect(snapshot.batch).toMatchObject({
      elapsedMs: BATCH_TOTAL_MS,
      returnedOrders: 10,
      isComplete: true,
    });
    expect(snapshot.nPlusOne.isComplete).toBe(false);
  });

  it("settles with identical rows and different round-trip costs", () => {
    const snapshot = deriveQueryRaceSnapshot(1);

    expect(snapshot.isComplete).toBe(true);
    expect(snapshot.nPlusOne).toMatchObject({
      elapsedMs: PER_ID_TOTAL_MS,
      returnedOrders: ORDER_COUNT,
      remainingTrips: 0,
      phase: "settled",
      packet: undefined,
    });
    expect(snapshot.batch).toMatchObject({
      elapsedMs: BATCH_TOTAL_MS,
      returnedOrders: ORDER_COUNT,
      remainingTrips: 0,
      phase: "settled",
      packet: undefined,
    });
  });

  it("clamps progress outside the animation range", () => {
    expect(deriveQueryRaceSnapshot(-1)).toEqual(INITIAL_QUERY_RACE_SNAPSHOT);
    expect(deriveQueryRaceSnapshot(2)).toEqual(deriveQueryRaceSnapshot(1));
  });
});
