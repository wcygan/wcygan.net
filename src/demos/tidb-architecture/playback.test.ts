import { describe, expect, it } from "vitest";
import { INITIAL_OPERATION, operationSteps } from "./model";
import { createPlayback, PLAYBACK_SPEEDS, STEP_DURATION_MS } from "./playback";

describe("query playback", () => {
  it("steps one beat, settles it, and resumes without skipping", () => {
    const clock = createPlayback();
    clock.step();
    expect(clock.getSnapshot()).toMatchObject({
      step: 1,
      moving: true,
      playing: false,
    });
    clock.advance(STEP_DURATION_MS);
    expect(clock.getSnapshot()).toMatchObject({ step: 1, moving: false });
    clock.step();
    expect(clock.getSnapshot()).toMatchObject({
      step: 2,
      moving: true,
      playing: false,
    });
    clock.step();
    expect(clock.progress()).toBe(1);
    expect(clock.getSnapshot().moving).toBe(false);
    clock.play();
    expect(clock.getSnapshot()).toMatchObject({
      step: 3,
      moving: true,
      playing: true,
    });
    for (let i = 0; i < 20; i++) clock.advance(STEP_DURATION_MS);
    const finalStep = clock.getSnapshot().step;
    clock.step();
    expect(clock.getSnapshot().step).toBe(finalStep);
  });
  it.each(PLAYBACK_SPEEDS)(
    "scales packet progress and step transitions together at %sx",
    (speed) => {
      const clock = createPlayback();
      expect(clock.getSnapshot().speed).toBe(2);
      clock.setSpeed(speed);
      clock.play();
      clock.advance(STEP_DURATION_MS / speed / 2);
      expect(clock.progress()).toBe(0.5);
      expect(clock.getSnapshot().step).toBe(1);
      clock.advance(STEP_DURATION_MS / speed / 2);
      expect(clock.getSnapshot().step).toBe(2);
      expect(clock.progress()).toBe(0);
    },
  );
  it("changes speed midflight without rewinding, resuming, or resetting the query", () => {
    const clock = createPlayback();
    clock.play();
    clock.advance(300);
    expect(clock.progress()).toBe(0.25);
    clock.setSpeed(4);
    expect(clock.progress()).toBe(0.25);
    clock.advance(150);
    expect(clock.progress()).toBe(0.5);
    clock.pause();
    clock.setSpeed(8);
    clock.advance(1000);
    expect(clock.progress()).toBe(0.5);
    expect(clock.getSnapshot()).toMatchObject({
      step: 1,
      moving: false,
      playing: false,
    });
    clock.reset({ ...INITIAL_OPERATION, readMode: "follower-caught-up" });
    expect(clock.getSnapshot().speed).toBe(8);
    expect(clock.progress()).toBe(0);
    expect(clock.getSnapshot().moving).toBe(false);
  });
  it.each(["read", "update"] as const)(
    "plays a bounded %s, with pause and resume preserving packet progress",
    (kind) => {
      const clock = createPlayback();
      const operation = { ...INITIAL_OPERATION, kind };
      clock.reset(operation, true);
      clock.advance(400);
      clock.pause();
      clock.advance(5000);
      expect(clock.progress()).toBe(800 / STEP_DURATION_MS);
      clock.play();
      clock.advance(STEP_DURATION_MS / 2 - 400);
      expect(clock.getSnapshot().step).toBe(2);
      for (let i = 0; i < 20; i++) clock.advance(STEP_DURATION_MS);
      expect(clock.getSnapshot()).toMatchObject({
        step: operationSteps(operation).length - 1,
        moving: false,
        playing: false,
      });
      clock.play();
      expect(clock.getSnapshot().step).toBe(1);
    },
  );
  it("replaces a query midflight without carrying old progress or acknowledgments", () => {
    const clock = createPlayback();
    clock.reset({ ...INITIAL_OPERATION, kind: "update" }, true);
    for (let i = 0; i < 4; i++) clock.advance(STEP_DURATION_MS);
    expect(
      operationSteps(clock.getSnapshot().operation)[clock.getSnapshot().step]
        .acknowledged,
    ).toHaveLength(3);
    clock.reset({ kind: "read", userId: 1200, sqlNode: "TiDB 3" });
    expect(clock.getSnapshot()).toMatchObject({
      step: 0,
      playing: false,
      moving: false,
    });
    expect(clock.progress()).toBe(0);
  });
  it("notifies only at meaningful state changes and unsubscribes cleanly", () => {
    const clock = createPlayback();
    let notifications = 0;
    const unsubscribe = clock.subscribe(() => notifications++);
    clock.play();
    for (let i = 0; i < 30; i++) clock.advance(16);
    expect(notifications).toBe(1);
    clock.pause();
    expect(clock.getSnapshot()).toMatchObject({
      moving: false,
      playing: false,
    });
    expect(notifications).toBe(2);
    unsubscribe();
    clock.play();
    expect(notifications).toBe(2);
  });
});
