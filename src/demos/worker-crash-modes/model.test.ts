import { describe, expect, it } from "vitest";
import { deriveCrashSnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveCrashSnapshot", () => {
  it("starts with both Workers healthy and working", () => {
    const snapshot = deriveCrashSnapshot({ progress: 0, playing: false });

    expect(snapshot.phase).toBe("running");
    expect(snapshot.task).toMatchObject({
      status: "processing",
      workerATone: "blue",
      workerBTone: "idle",
      replayProgress: 0,
    });
    expect(snapshot.activity).toMatchObject({
      status: "running",
      workerTone: "blue",
      attempt: 1,
      timeoutActive: false,
    });
  });

  it("crashes both tracks on the same shared beat", () => {
    const snapshot = deriveCrashSnapshot({ progress: 0.38, playing: false });

    expect(snapshot.phase).toBe("crash");
    expect(snapshot.task.status).toBe("crashed");
    expect(snapshot.task.workerATone).toBe("red");
    expect(snapshot.activity.status).toBe("crashed");
    expect(snapshot.activity.workerTone).toBe("red");
    expect(snapshot.crashFlash).toBeGreaterThan(0.5);
  });

  it("replays history on top while the bottom drains the timeout", () => {
    const snapshot = deriveCrashSnapshot({ progress: 0.6, playing: false });

    expect(snapshot.phase).toBe("recover-1");
    expect(snapshot.task).toMatchObject({
      status: "replaying",
      workerBTone: "green",
    });
    expect(snapshot.task.replayProgress).toBeGreaterThan(0);
    expect(snapshot.task.replayProgress).toBeLessThanOrEqual(1);
    expect(snapshot.activity).toMatchObject({
      status: "timing-out",
      workerTone: "gold",
      timeoutActive: true,
      attempt: 1,
    });
    expect(snapshot.activity.timeoutRemaining).toBeLessThan(1);
    expect(snapshot.activity.timeoutRemaining).toBeGreaterThan(0);
  });

  it("drains more of the timeout the deeper into recover-1 it gets", () => {
    const early = deriveCrashSnapshot({ progress: 0.5, playing: false });
    const late = deriveCrashSnapshot({ progress: 0.7, playing: false });

    expect(late.activity.timeoutRemaining).toBeLessThan(
      early.activity.timeoutRemaining,
    );
  });

  it("resumes on top and retries on the bottom in recover-2", () => {
    const snapshot = deriveCrashSnapshot({ progress: 0.82, playing: false });

    expect(snapshot.phase).toBe("recover-2");
    expect(snapshot.task).toMatchObject({
      status: "resumed",
      workerBTone: "green",
      replayProgress: 1,
    });
    expect(snapshot.activity).toMatchObject({
      status: "retrying",
      workerTone: "blue",
      attempt: 2,
      timeoutActive: false,
    });
  });

  it("uses the reduced-motion frame as the resumed + retrying outcome", () => {
    const snapshot = deriveCrashSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("recover-2");
    expect(snapshot.task.status).toBe("resumed");
    expect(snapshot.task.outcomeLabel).toBe("no data loss");
    expect(snapshot.activity.status).toBe("retrying");
    expect(snapshot.activity.attempt).toBe(2);
    expect(snapshot.activity.outcomeLabel).toBe("attempt 2 running");
  });
});
