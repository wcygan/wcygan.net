import { describe, expect, it } from "vitest";
import { deriveCrashSnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveCrashSnapshot", () => {
  it("opens on the Workflow Task act while the Activity act waits idle", () => {
    const snapshot = deriveCrashSnapshot({ progress: 0, playing: false });

    expect(snapshot.activeAct).toBe("workflow-task");
    expect(snapshot.workflowTask.phase).toBe("scheduling");
    expect(snapshot.activity.phase).toBe("idle");
    expect(snapshot.activity.rows).toHaveLength(0);
  });

  describe("Act 1 — crash during a Workflow Task (recovery is written to history)", () => {
    it("runs the first attempt with Worker A before the crash", () => {
      const snapshot = deriveCrashSnapshot({ progress: 0.1, playing: false });

      expect(snapshot.workflowTask.phase).toBe("running");
      expect(snapshot.workflowTask.worker).toMatchObject({
        glyph: "A",
        state: "running",
      });
    });

    it("orphans the Started row and drains the task timeout after a crash", () => {
      const snapshot = deriveCrashSnapshot({ progress: 0.18, playing: false });

      expect(snapshot.workflowTask.phase).toBe("waiting");
      expect(snapshot.workflowTask.worker?.state).toBe("crashed");
      expect(snapshot.workflowTask.timeout.active).toBe(true);

      const orphan = snapshot.workflowTask.rows.find((row) => row.orphaned);
      expect(orphan?.type).toBe("WorkflowTaskStarted");
    });

    it("replays on a second Worker, then completes with the recovery visible", () => {
      const replaying = deriveCrashSnapshot({ progress: 0.35, playing: false });
      expect(replaying.workflowTask.phase).toBe("recovering");
      expect(replaying.workflowTask.worker).toMatchObject({
        glyph: "B",
        state: "replaying",
      });
      expect(replaying.workflowTask.footerProgress).toMatchObject({
        label: "Worker B replaying Event History",
        tone: "green",
      });
      expect(replaying.workflowTask.footerProgress?.value).toBeGreaterThan(0);
      expect(replaying.workflowTask.footerProgress?.value).toBeLessThan(1);

      const complete = deriveCrashSnapshot({ progress: 0.6, playing: false });
      // Every recovery step is a durable row: the WorkflowTaskTimedOut is recorded.
      expect(complete.workflowTask.rows).toHaveLength(7);
      expect(
        complete.workflowTask.rows.some(
          (r) => r.type === "WorkflowTaskTimedOut",
        ),
      ).toBe(true);
      expect(complete.workflowTask.worker?.state).toBe("resumed");
    });
  });

  describe("Act 2 — crash during an Activity (recovery is invisible in history)", () => {
    it("keeps ActivityTaskScheduled pending while the first attempt runs", () => {
      const snapshot = deriveCrashSnapshot({ progress: 0.56, playing: false });

      expect(snapshot.activeAct).toBe("activity");
      expect(snapshot.activity.phase).toBe("running");
      expect(snapshot.activity.attempt).toBe(1);
      // The Worker started the Activity Task, but the start is not yet recorded.
      expect(snapshot.activity.footerProgress?.label).toContain("started");
      expect(snapshot.activity.footerProgress?.value).toBeGreaterThan(0);
      expect(snapshot.activity.footerProgress?.value).toBeLessThan(1);
      const pending = snapshot.activity.rows.find((r) => r.pending);
      expect(pending?.type).toBe("ActivityTaskScheduled");
    });

    it("waits out the start-to-close timeout when the Worker crashes", () => {
      const snapshot = deriveCrashSnapshot({ progress: 0.68, playing: false });

      expect(snapshot.activity.phase).toBe("waiting");
      expect(snapshot.activity.worker?.state).toBe("crashed");
      expect(snapshot.activity.timeout.active).toBe(true);
      expect(snapshot.activity.timeout.label).toBe("start-to-close timeout");
      expect(snapshot.activity.footerProgress).toBeNull();
    });

    it("retries silently — attempt 2 with no new history rows", () => {
      const snapshot = deriveCrashSnapshot({ progress: 0.82, playing: false });

      expect(snapshot.activity.phase).toBe("retrying");
      expect(snapshot.activity.attempt).toBe(2);
      expect(snapshot.activity.worker?.state).toBe("retrying");
      expect(snapshot.activity.footerProgress?.label).toContain(
        "no new events",
      );
      expect(snapshot.activity.footerProgress?.value).toBeGreaterThan(0);
      expect(snapshot.activity.footerProgress?.value).toBeLessThan(1);
      // The retry writes nothing: only the bootstrap + ActivityTaskScheduled exist.
      expect(snapshot.activity.rows).toHaveLength(2);
      expect(
        snapshot.activity.rows.some((r) => r.type === "ActivityTaskStarted"),
      ).toBe(false);
    });

    it("spaces the terminal Activity rows so Started is readable before Completed", () => {
      const snapshot = deriveCrashSnapshot({ progress: 0.91, playing: false });

      expect(snapshot.activity.phase).toBe("publishing");
      expect(snapshot.activity.worker?.state).toBe("completing");
      expect(snapshot.activity.footerProgress?.label).toContain(
        "terminal events",
      );
      expect(snapshot.activity.rows.map((r) => r.type)).toEqual([
        "WorkflowTaskCompleted",
        "ActivityTaskScheduled",
        "ActivityTaskStarted",
      ]);
    });

    it("writes ActivityTaskStarted only with the terminal ActivityTaskCompleted", () => {
      const snapshot = deriveCrashSnapshot({
        progress: REDUCED_MOTION_PROGRESS,
        playing: false,
      });

      expect(snapshot.activity.phase).toBe("complete");
      const types = snapshot.activity.rows.map((r) => r.type);
      expect(types).toEqual([
        "WorkflowTaskCompleted",
        "ActivityTaskScheduled",
        "ActivityTaskStarted",
        "ActivityTaskCompleted",
      ]);
    });
  });

  it("ends with two opposite-shaped histories: 7 written rows vs 4", () => {
    const snapshot = deriveCrashSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.workflowTask.phase).toBe("complete");
    expect(snapshot.activity.phase).toBe("complete");
    // The contrast is the lesson: Workflow Task recovery is recorded; the
    // Activity retry is not, so its history stays short.
    expect(snapshot.workflowTask.rows.length).toBeGreaterThan(
      snapshot.activity.rows.length,
    );
    expect(snapshot.workflowTask.rows).toHaveLength(7);
    expect(snapshot.activity.rows).toHaveLength(4);
  });
});
