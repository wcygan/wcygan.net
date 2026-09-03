import { describe, expect, it } from "vitest";
import {
  derivePoolSimulationSnapshot,
  INITIAL_POOL_SNAPSHOT,
  MAX_POOL_SIZE,
  MIN_POOL_SIZE,
  POOL_SIZE,
  TOTAL_REQUESTS,
} from "./model";

describe("connection pool simulation model", () => {
  it("initializes with 4 idle connections and 0 active", () => {
    expect(INITIAL_POOL_SNAPSHOT.connections).toHaveLength(POOL_SIZE);
    expect(INITIAL_POOL_SNAPSHOT.metrics.activeConnections).toBe(0);
    expect(INITIAL_POOL_SNAPSHOT.metrics.idleConnections).toBe(POOL_SIZE);
    expect(INITIAL_POOL_SNAPSHOT.metrics.waitingRequests).toBe(0);
    expect(INITIAL_POOL_SNAPSHOT.metrics.completedRequests).toBe(0);
  });

  it("saturates connections and queues requests when pool is full", () => {
    // At p = 0.28, requests 1..4 are executing and req 5 and 6 should be queued
    const snap = derivePoolSimulationSnapshot(0.28);
    expect(snap.connections).toHaveLength(POOL_SIZE);
    expect(snap.metrics.activeConnections).toBe(4);
    expect(snap.metrics.idleConnections).toBe(0);
    expect(snap.metrics.waitingRequests).toBeGreaterThanOrEqual(1);
    expect(snap.phase).toBe("queued");
  });

  it("eventually completes all requests and returns connections to idle", () => {
    const snap = derivePoolSimulationSnapshot(1);
    expect(snap.isComplete).toBe(true);
    expect(snap.metrics.completedRequests).toBe(TOTAL_REQUESTS);
    expect(snap.metrics.waitingRequests).toBe(0);
    expect(snap.metrics.activeConnections).toBe(0);
    expect(snap.metrics.idleConnections).toBe(POOL_SIZE);
  });

  it("supports a pool of 2 connections and still completes every request", () => {
    const snap = derivePoolSimulationSnapshot(1, 2);
    expect(snap.connections).toHaveLength(2);
    expect(snap.metrics.completedRequests).toBe(TOTAL_REQUESTS);
    expect(snap.metrics.idleConnections).toBe(2);
  });

  it("marks a connection returning only after the query leg completes", () => {
    // Req #1: actualStart 0.05, actualEnd 0.27. Query leg ends at
    // 0.05 + 0.7 * 0.22 = 0.204.
    const midQuery = derivePoolSimulationSnapshot(0.16);
    expect(midQuery.connections[0].state).toBe("active");
    const inReturn = derivePoolSimulationSnapshot(0.25);
    expect(inReturn.connections[0].state).toBe("returning");
  });

  it("with 6 connections requests 5 and 6 execute without queueing", () => {
    const wide = derivePoolSimulationSnapshot(0.4, MAX_POOL_SIZE);
    expect(wide.metrics.waitingRequests).toBe(0);
    const narrow = derivePoolSimulationSnapshot(0.4, MIN_POOL_SIZE);
    expect(narrow.metrics.waitingRequests).toBeGreaterThanOrEqual(1);
  });

  it("clamps out-of-range pool sizes", () => {
    expect(derivePoolSimulationSnapshot(0, 1).connections).toHaveLength(
      MIN_POOL_SIZE,
    );
    expect(derivePoolSimulationSnapshot(0, 99).connections).toHaveLength(
      MAX_POOL_SIZE,
    );
  });
});
