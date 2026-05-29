import { describe, expect, it } from "vitest";
import {
  deriveDurableTaskLoopSnapshot,
  REDUCED_MOTION_PROGRESS,
} from "./model";

function snapshotAt(progress: number) {
  return deriveDurableTaskLoopSnapshot({ progress, playing: false });
}

describe("deriveDurableTaskLoopSnapshot", () => {
  it("opens with the workflow bootstrap and an empty queue", () => {
    const snapshot = snapshotAt(0);

    expect(snapshot.worker.phase).toBe("polling");
    expect(snapshot.queue.level).toBe(0);
    // The four canonical workflow-task bootstrap events are already committed.
    expect(snapshot.history.map((row) => row.type)).toEqual([
      "WorkflowExecutionStarted",
      "WorkflowTaskScheduled",
      "WorkflowTaskStarted",
      "WorkflowTaskCompleted",
    ]);
    expect(snapshot.history.every((row) => !row.newest)).toBe(true);
  });

  it("fills the queue as the workflow schedules its activities", () => {
    const snapshot = snapshotAt(0.08);

    // All three activity tasks have been scheduled before the Worker drains them.
    expect(snapshot.queue.level).toBe(3);
    const types = snapshot.history.map((row) => row.type);
    expect(
      types.filter((type) => type === "ActivityTaskScheduled"),
    ).toHaveLength(3);
  });

  it("runs the first activity with a filling progress ring", () => {
    const snapshot = snapshotAt(0.18);

    expect(snapshot.worker.phase).toBe("executing");
    expect(snapshot.worker.ringProgress).toBeGreaterThan(0);
    expect(snapshot.worker.ringProgress).toBeLessThan(1);
  });

  it("polls and takes an activity task off the queue", () => {
    const snapshot = snapshotAt(0.11);

    const pollPackets = snapshot.packets.filter(
      (packet) => packet.kind === "poll",
    );
    expect(pollPackets).toHaveLength(1);
    expect(pollPackets[0].route).toBe("queue-to-worker");
  });

  it("fails the second activity, then backs off and retries it", () => {
    const failing = snapshotAt(0.43);
    expect(failing.worker.outcome).toBe("failure");
    expect(failing.worker.ringProgress).toBeLessThan(1);

    const backingOff = snapshotAt(0.49);
    expect(backingOff.worker.phase).toBe("backoff");

    // The retried attempt fills a fresh ring back toward 100%.
    const retrying = snapshotAt(0.57);
    expect(retrying.worker.phase).toBe("executing");
    expect(retrying.worker.taskLabel).toBe("activity #2");
  });

  it("records the failure then the retry's completion in history", () => {
    const types = snapshotAt(0.6).history.map((row) => row.type);
    expect(types).toContain("ActivityTaskFailed");
    // Two ActivityTaskStarted for activity #2 (first attempt + retry) plus #1.
    expect(
      types.filter((type) => type === "ActivityTaskStarted").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("drains the queue to empty and settles on a completed state", () => {
    const snapshot = snapshotAt(0.95);

    expect(snapshot.queue.level).toBe(0);
    expect(snapshot.queue.slots.every((slot) => !slot.filled)).toBe(true);
    expect(snapshot.worker.phase).toBe("complete");
    expect(snapshot.worker.outcome).toBe("success");
    expect(snapshot.worker.ringProgress).toBe(1);
  });

  it("grows the durable history across the loop", () => {
    const start = snapshotAt(0).history.length;
    const end = snapshotAt(0.99).history.length;

    // 4 workflow bootstrap + 3 ActivityTaskScheduled + 4 ActivityTaskStarted
    // (activity #2 starts twice) + 1 ActivityTaskFailed + 3 ActivityTaskCompleted.
    expect(start).toBe(4);
    expect(end).toBe(15);
  });

  it("ends with every activity completed (no failures left unresolved)", () => {
    const history = snapshotAt(0.99).history;
    const completed = history.filter(
      (row) => row.type === "ActivityTaskCompleted",
    );
    expect(completed).toHaveLength(3);
  });

  it("uses the completed frame for reduced motion", () => {
    const snapshot = snapshotAt(REDUCED_MOTION_PROGRESS);

    expect(snapshot.worker.phase).toBe("complete");
    const types = snapshot.history.map((row) => row.type);
    expect(types).toContain("ActivityTaskCompleted");
    expect(types).toContain("ActivityTaskFailed");
  });
});
