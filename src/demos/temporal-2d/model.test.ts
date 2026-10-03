import { describe, expect, it } from "vitest";
import {
  acceptCharge,
  idempotencySnapshot,
  recoverySnapshot,
  resumeWaitingWorkflow,
  retryDelaySeconds,
  retrySchedule,
  retrySnapshot,
  waitingSnapshot,
  workflowSnapshot,
} from "./model";

describe("Workflow coordination", () => {
  it("waits for each recorded result before scheduling the next Activity", () => {
    for (let step = 0; step <= 8; step++) {
      const state = workflowSnapshot(step);
      expect(state.activities.filter((a) => a.recordedResult)).toHaveLength(
        Math.floor(step / 2),
      );
      expect(state.activities.filter((a) => a.state === "active")).toHaveLength(
        step % 2,
      );
      const active = state.activities.findIndex((a) => a.state === "active");
      if (active >= 0)
        expect(
          state.activities
            .slice(0, active)
            .every((a) => a.recordedResult !== null),
        ).toBe(true);
      expect(state.complete).toBe(step === 8);
    }
  });
  it("keeps its settled result under additional steps", () => {
    expect(workflowSnapshot(100)).toEqual(workflowSnapshot(8));
    expect(workflowSnapshot(-1)).toEqual(workflowSnapshot(0));
  });
});

describe("Provider idempotency", () => {
  it("returns a stable charge for a repeated key while keyless requests create new effects", () => {
    const first = acceptCharge({ charges: [], keys: {} }, "order-1042:charge");
    const repeated = acceptCharge(first.ledger, "order-1042:charge");
    expect(repeated.ledger).toBe(first.ledger);
    expect(repeated.chargeId).toBe(first.chargeId);
    expect(repeated.reused).toBe(true);
    const keyless = acceptCharge(first.ledger);
    expect(keyless.chargeId).not.toBe(first.chargeId);
    expect(keyless.ledger.charges).toHaveLength(2);
  });
  it("exposes a successful effect before any recorded Activity completion", () => {
    const crashed = idempotencySnapshot(2);
    for (const lane of crashed.lanes) {
      expect(lane.ledger.charges).toHaveLength(1);
      expect(lane.recordedResult).toBeNull();
    }
    const retried = idempotencySnapshot(5);
    expect(retried.lanes.map((lane) => lane.ledger.charges.length)).toEqual([
      1, 2,
    ]);
    expect(retried.lanes.map((lane) => lane.recordedResult)).toEqual([
      "charge-1",
      "charge-2",
    ]);
  });
});

describe("Durable waits", () => {
  it.each(["timer", "signal"] as const)(
    "records a %s event offline without executing application code",
    (kind) => {
      const eventReceived = waitingSnapshot(2, kind);
      expect(eventReceived.workerOnline).toBe(false);
      expect(eventReceived.inputRecorded).toBe(true);
      expect(eventReceived.pendingTask).toBe(true);
      expect(eventReceived.resumed).toBe(false);
      expect(resumeWaitingWorkflow(eventReceived)).toBe(eventReceived);
      const polling = waitingSnapshot(3, kind);
      expect(polling.workerOnline).toBe(true);
      expect(polling.resumed).toBe(false);
      expect(polling.pendingTask).toBe(true);
      expect(resumeWaitingWorkflow(polling)).toBe(polling);
      const returned = waitingSnapshot(4, kind);
      expect(returned.workerOnline).toBe(true);
      expect(returned.resumed).toBe(true);
      expect(returned.pendingTask).toBe(false);
    },
  );
  it("does not resume solely because a Worker is available", () => {
    const waiting = waitingSnapshot(0, "signal");
    expect(waiting.workerOnline).toBe(true);
    expect(resumeWaitingWorkflow(waiting)).toBe(waiting);
    expect(waiting.resumed).toBe(false);
  });
});

describe("Activity timeout and bounded retry", () => {
  it("waits through each timeout and exponential backoff before starting a retry", () => {
    const schedule = retrySchedule("success");
    expect(schedule.map((attempt) => [attempt.start, attempt.end])).toEqual([
      [0, 5],
      [6, 11],
      [13, 15],
    ]);
    expect(retryDelaySeconds(1)).toBe(1);
    expect(retryDelaySeconds(2)).toBe(2);
    expect(retrySnapshot(1, "success").attempts[0]).toMatchObject({
      workerCrashed: true,
      state: "active",
    });
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].start).toBe(
        schedule[i - 1].end + retryDelaySeconds(i),
      );
      expect(schedule[i - 1].end).toBeGreaterThan(schedule[i - 1].crash);
    }
  });
  it("counts the first attempt toward the limit and settles after three failures", () => {
    const failed = retrySnapshot(7, "exhausted");
    expect(failed.schedule).toHaveLength(3);
    expect(failed.attempts.every((attempt) => attempt.state === "failed")).toBe(
      true,
    );
    expect(failed.time).toBe(18);
    expect(failed.complete).toBe(true);
    expect(retrySnapshot(100, "exhausted")).toEqual(failed);
  });
});

describe("Order recovery", () => {
  it("loses process memory while preserving recorded results and external effects", () => {
    const before = recoverySnapshot(2);
    const crashed = recoverySnapshot(3);
    expect(before.fragileMemory).toBe(2);
    expect(crashed.fragileMemory).toBe(0);
    expect(crashed.durableResults).toBe(before.durableResults);
    expect(crashed.completedEffects).toBe(before.completedEffects);
    expect(crashed.durableProvisioned).toBe(false);
    const settled = recoverySnapshot(5);
    expect(settled.durableProvisioned).toBe(true);
    expect(settled.completedEffects).toBe(2);
    expect(recoverySnapshot(100)).toEqual(settled);
  });
});
