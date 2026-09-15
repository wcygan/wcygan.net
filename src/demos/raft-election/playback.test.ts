import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPlayback } from "./playback";
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it.each([60, 120])("runs continuously at %i Hz", (hz) => {
  const p = createPlayback("split");
  p.dispatch({ type: "crash" });
  p.setActive(true);
  for (let i = 0; i < hz * 25; i++) {
    p.getTime();
    vi.advanceTimersByTime(1000 / hz);
  }
  expect(p.getSnapshot().nodes.A.term).toBe(3);
  const end = p.getTime();
  p.setActive(true);
  vi.advanceTimersByTime(10000);
  expect(p.getTime()).toBeGreaterThan(end);
  p.setActive(false);
});
it("freezes offscreen and resets without losing scenario", () => {
  const p = createPlayback("split");
  p.setActive(true);
  vi.advanceTimersByTime(100);
  p.setActive(false);
  const time = p.getTime();
  vi.advanceTimersByTime(10000);
  expect(p.getTime()).toBe(time);
  p.dispatch({ type: "crash" });
  p.dispatch({ type: "step" });
  expect(p.getTime()).toBeGreaterThan(time);
  p.dispatch({ type: "reset" });
  expect(p.getSnapshot().scenario).toBe("split");
  expect(p.getTime()).toBe(0);
});

it("recovers after exactly five active seconds and pauses recovery offscreen", () => {
  const p = createPlayback("success");
  p.dispatch({ type: "crash" });
  p.setActive(true);
  vi.advanceTimersByTime(2000);
  p.setActive(false);
  vi.advanceTimersByTime(10000);
  expect(p.getSnapshot().crashed).toEqual(["B"]);
  p.setActive(true);
  vi.advanceTimersByTime(2999);
  expect(p.getSnapshot().crashed).toEqual(["B"]);
  vi.advanceTimersByTime(1);
  expect(p.getSnapshot().crashed).toEqual([]);
  expect(p.getSnapshot().nodes.B.role).toBe("follower");
  p.setActive(false);
});
