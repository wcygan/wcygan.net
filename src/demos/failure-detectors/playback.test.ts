import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayback } from "./playback";
import { candidates, createSimulation, transition } from "./model";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("heartbeat playback clock", () => {
  it.each([60, 120])(
    "keeps uniform motion at %i Hz across protocol commits",
    (hz) => {
      const playback = createPlayback({ nodeCount: 2 });
      const commits = vi.fn();
      playback.subscribe(commits);
      playback.setActive(true);
      commits.mockClear();
      const start = performance.now();
      let previous = 0;
      for (let frame = 0; frame < hz; frame++) {
        vi.advanceTimersByTime(1000 / hz);
        const time = playback.getTime();
        expect(time).toBeCloseTo((performance.now() - start) * 0.5, 6);
        expect(time).toBeGreaterThan(previous);
        previous = time;
      }
      // One delivered heartbeat, rather than 20 React updates per second.
      expect(commits).toHaveBeenCalledTimes(1);
      expect(playback.getSnapshot().followers.A.received).toBe(1);
      playback.setActive(false);
    },
  );

  it("freezes the clock between frames offscreen and resumes without a jump", () => {
    const playback = createPlayback({ nodeCount: 2 });
    playback.setActive(true);
    vi.advanceTimersByTime(83);
    playback.setActive(false);
    expect(playback.getTime()).toBe(41.5);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(20000);
    expect(playback.getTime()).toBe(41.5);
    playback.setActive(true);
    expect(playback.getTime()).toBe(41.5);
    vi.advanceTimersByTime(17);
    expect(playback.getTime()).toBe(50);
    playback.setActive(false);
  });

  it("applies faults and reconfiguration at the current animation time", () => {
    const playback = createPlayback({ nodeCount: 2 });
    playback.setActive(true);
    const packet = playback.getSnapshot().packets[0];
    vi.advanceTimersByTime(81);
    playback.dispatch({
      type: "configure",
      values: { nodeCount: 5, delay: 1900 },
    });
    expect(playback.getTime()).toBe(40.5);
    expect(playback.getSnapshot().now).toBe(40.5);
    expect(playback.getSnapshot().packets[0]).toEqual(packet);
    vi.advanceTimersByTime(17);
    playback.dispatch({ type: "crash" });
    expect(playback.getTime()).toBe(49);
    expect(playback.getSnapshot().transport.crashed).toBe(true);
    vi.advanceTimersByTime(500);
    expect(playback.getSnapshot().followers.A.received).toBe(1);
    playback.setActive(false);
  });

  it("preserves deterministic transport timing through repeated event wakes", () => {
    const config = { nodeCount: 5 };
    const playback = createPlayback(config);
    playback.setActive(true);
    vi.advanceTimersByTime(30123);
    playback.setActive(false);
    expect(playback.getSnapshot()).toEqual(
      transition(createSimulation(config), { type: "advance", to: 15061.5 }),
    );
  });

  it("stops scheduling at the first timeout and only restarts after Reset", () => {
    const playback = createPlayback();
    playback.setActive(true);
    playback.dispatch({ type: "crash" });
    vi.advanceTimersByTime(13000);
    expect(candidates(playback.getSnapshot())).toHaveLength(1);
    const stopped = playback.getTime();
    expect(vi.getTimerCount()).toBe(0);
    const snapshot = playback.getSnapshot();
    // Visibility changes (or dismissing a popup) must not resume a settled demo.
    playback.setActive(false);
    playback.setActive(true);
    vi.advanceTimersByTime(10000);
    expect(playback.getTime()).toBe(stopped);
    expect(playback.getSnapshot()).toBe(snapshot);
    expect(vi.getTimerCount()).toBe(0);
    playback.dispatch({ type: "reset" });
    expect(playback.getTime()).toBe(0);
    playback.setActive(true);
    vi.advanceTimersByTime(1000);
    expect(playback.getTime()).toBe(500);
    playback.setActive(false);
  });
});
