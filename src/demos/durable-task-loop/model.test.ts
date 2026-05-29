import { describe, expect, it } from "vitest";
import {
  deriveDurableTaskLoopSnapshot,
  REDUCED_MOTION_PROGRESS,
} from "./model";

describe("deriveDurableTaskLoopSnapshot", () => {
  it("starts by scheduling a task onto the queue", () => {
    const snapshot = deriveDurableTaskLoopSnapshot({
      progress: 0,
      playing: false,
    });

    expect(snapshot.phase).toBe("enqueue");
    expect(snapshot.nodes.service.status).toBe("scheduling");
    expect(snapshot.queue.hasTask).toBe(true);
    expect(snapshot.history).toHaveLength(4);
    expect(snapshot.history.every((row) => !row.newest)).toBe(true);
  });

  it("sends the workflow task from the service to the queue", () => {
    const snapshot = deriveDurableTaskLoopSnapshot({
      progress: 0.06,
      playing: false,
    });

    const taskPackets = snapshot.packets.filter(
      (packet) => packet.kind === "task",
    );
    expect(taskPackets).toHaveLength(1);
    expect(taskPackets[0].route).toBe("service-to-queue");
  });

  it("lets the worker poll and take the task off the queue", () => {
    const snapshot = deriveDurableTaskLoopSnapshot({
      progress: 0.3,
      playing: false,
    });

    expect(snapshot.phase).toBe("poll");
    expect(snapshot.nodes.worker.status).toBe("holding");
    expect(snapshot.nodes.worker.statusLabel).toBe("took the task");
    const pollPackets = snapshot.packets.filter(
      (packet) => packet.kind === "poll",
    );
    expect(pollPackets).toHaveLength(1);
    expect(pollPackets[0].route).toBe("queue-to-worker");
  });

  it("runs workflow code on the worker while the service stays idle", () => {
    const snapshot = deriveDurableTaskLoopSnapshot({
      progress: 0.5,
      playing: false,
    });

    expect(snapshot.phase).toBe("execute");
    expect(snapshot.nodes.worker.status).toBe("running");
    expect(snapshot.nodes.service.status).toBe("idle");
    expect(snapshot.queue.hasTask).toBe(false);
  });

  it("reports the result and commands back to the service", () => {
    const snapshot = deriveDurableTaskLoopSnapshot({
      progress: 0.72,
      playing: false,
    });

    expect(snapshot.phase).toBe("report");
    expect(snapshot.nodes.worker.statusLabel).toBe("reporting commands");
    const resultPackets = snapshot.packets.filter(
      (packet) => packet.kind === "result",
    );
    expect(resultPackets).toHaveLength(1);
    expect(resultPackets[0].route).toBe("worker-to-service");
  });

  it("appends a new highlighted event to the history during append", () => {
    const snapshot = deriveDurableTaskLoopSnapshot({
      progress: 0.9,
      playing: false,
    });

    expect(snapshot.phase).toBe("append");
    expect(snapshot.nodes.service.status).toBe("storing");
    expect(snapshot.history).toHaveLength(5);
    expect(snapshot.history[4]).toMatchObject({
      type: "ActivityTaskScheduled",
      newest: true,
    });
  });

  it("uses the reduced-motion frame as the populated append beat", () => {
    const snapshot = deriveDurableTaskLoopSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("append");
    expect(snapshot.history).toHaveLength(5);
    expect(snapshot.history[4].newest).toBe(true);
    expect(snapshot.history.map((row) => row.type)).toEqual([
      "WorkflowExecutionStarted",
      "WorkflowTaskScheduled",
      "WorkflowTaskStarted",
      "WorkflowTaskCompleted",
      "ActivityTaskScheduled",
    ]);
  });
});
