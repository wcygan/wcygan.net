import { describe, expect, it } from "vitest";
import {
  derivePoolSimulationSnapshot,
  INITIAL_POOL_SNAPSHOT,
  POOL_SIZE,
  TOTAL_REQUESTS,
} from "./model";

describe("connection pool simulation model", () => {
  it("initializes with 4 idle connections and 0 active", () => {
    expect(INITIAL_POOL_SNAPSHOT.connections).toHaveLength(POOL_SIZE);
    expect(INITIAL_POOL_SNAPSHOT.metrics.activeConnections).toBe(0);
    expect(INITIAL_POOL_SNAPSHOT.metrics.idleConnections).toBe(4);
    expect(INITIAL_POOL_SNAPSHOT.metrics.waitingRequests).toBe(0);
    expect(INITIAL_POOL_SNAPSHOT.metrics.completedRequests).toBe(0);
  });

  it("saturates connections and queues requests when pool is full", () => {
    // At p = 0.28, requests 1..4 are executing and req 5 and 6 should be queued
    const snap = derivePoolSimulationSnapshot(0.28);
    expect(snap.connections).toHaveLength(4);
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
    expect(snap.metrics.idleConnections).toBe(4);
  });
});
