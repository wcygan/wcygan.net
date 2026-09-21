import { afterEach, expect, it, vi } from "vitest";
import { createPlayback } from "./playback";
import { BEAT_MS, DEFAULT_SPEED, DURATION } from "./model";
afterEach(() => vi.useRealTimers());
it("preserves partial exchanges across pauses and stops at the outcome", () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const player = createPlayback();
  player.setActive(true);
  vi.advanceTimersByTime(300);
  player.setActive(false);
  vi.advanceTimersByTime(5000);
  expect(player.getTime()).toBe(300 * DEFAULT_SPEED);
  player.setActive(true);
  vi.advanceTimersByTime(BEAT_MS / DEFAULT_SPEED - 300);
  expect(player.getSnapshot()).toBe(1);
  vi.advanceTimersByTime(DURATION / DEFAULT_SPEED);
  expect(player.getSnapshot()).toBe(6);
  expect(player.getTime()).toBe(DURATION);
  expect(vi.getTimerCount()).toBe(0);
  player.seek(0);
  expect(player.getSnapshot()).toBe(0);
});

it("changes speed without skipping a story beat", () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const player = createPlayback();
  player.setActive(true);
  vi.advanceTimersByTime(200);
  expect(player.getTime()).toBe(800);
  player.setSpeed(2);
  vi.advanceTimersByTime(200);
  expect(player.getTime()).toBe(1_200);
  expect(player.getSnapshot()).toBe(0);
});
