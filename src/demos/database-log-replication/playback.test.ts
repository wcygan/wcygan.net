import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createReplicationPlayback } from "./playback";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("rejects early writes, samples a smooth clock, and pauses all flights", () => {
  const playback = createReplicationPlayback();
  playback.setActive(true);
  playback.write();
  vi.advanceTimersByTime(499);
  playback.write();
  expect(playback.getSnapshot().flights).toHaveLength(1);
  vi.advanceTimersByTime(1);
  playback.write();
  expect(playback.getSnapshot().flights).toHaveLength(2);
  vi.advanceTimersByTime(123);
  expect(playback.getTime()).toBe(623);
  playback.setActive(false);
  vi.advanceTimersByTime(10000);
  expect(playback.getTime()).toBe(623);
  playback.setActive(true);
  vi.advanceTimersByTime(4000);
  expect(playback.getSnapshot().applied).toHaveLength(2);
  expect(playback.getSnapshot().flights).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});

it("settles every in-flight write under reduced motion and resets safely", () => {
  const playback = createReplicationPlayback();
  playback.setActive(true);
  playback.write();
  vi.advanceTimersByTime(500);
  playback.write();
  playback.setReduced(true);
  expect(playback.getSnapshot().applied).toHaveLength(2);
  expect(playback.getSnapshot().flights).toHaveLength(0);
  vi.advanceTimersByTime(500);
  playback.write();
  expect(playback.getSnapshot().applied).toHaveLength(3);
  playback.reset();
  expect(playback.getSnapshot().leader).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
  playback.setActive(false);
});
