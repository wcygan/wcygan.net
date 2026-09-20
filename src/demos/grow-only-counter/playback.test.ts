import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPlayback, EVENT_MS } from "./playback";
import { experimentReplicas, MESSAGES } from "./model";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const create = () => {
  const playback = createPlayback(() => Date.now());
  playback.setSpeed(1);
  playback.setActive(true);
  return playback;
};

it("defaults to the free-form starting state at 2× speed", () => {
  const playback = createPlayback(() => Date.now());
  const state = playback.getSnapshot();
  expect(state.speed).toBe(2);
  expect(state.replicas).toEqual(experimentReplicas());
  expect(state.messages).toEqual(MESSAGES);
  expect(state.delivered).toEqual([]);
  expect(state.inProgress).toBe(false);
  playback.dispose();
});

it("supports chosen order, duplicate delivery, and bounded delivery tracking", () => {
  const playback = create();
  for (const message of [...MESSAGES].reverse()) {
    const before = playback.getSnapshot().replicas;
    playback.deliver(message.id);
    playback.deliver(message.id);
    vi.advanceTimersByTime(EVENT_MS - 1);
    expect(playback.getSnapshot().replicas).toBe(before);
    vi.advanceTimersByTime(1);
  }
  expect(playback.getSnapshot().converged).toBe(true);
  const before = playback.getSnapshot().replicas;
  for (let i = 0; i < 10; i++) {
    playback.deliver("A-B");
    vi.advanceTimersByTime(EVENT_MS);
  }
  expect(playback.getSnapshot().replicas).toEqual(before);
  expect(playback.getSnapshot().status).toContain("No change");
  expect(playback.getSnapshot().delivered).toHaveLength(4);
  playback.deliver("unknown");
  expect(playback.getSnapshot().inProgress).toBe(false);
  playback.dispose();
});

it("lets clients increment A and C and refreshes their outgoing snapshots", () => {
  const playback = create();
  playback.increment("A");
  vi.advanceTimersByTime(EVENT_MS);
  expect(playback.getSnapshot().replicas.A).toEqual([2, 0, 0]);
  expect(
    playback.getSnapshot().messages.filter((message) => message.from === "A"),
  ).toEqual([
    expect.objectContaining({ id: "A-B", vector: [2, 0, 0] }),
    expect.objectContaining({ id: "A-C", vector: [2, 0, 0] }),
  ]);
  playback.increment("C");
  vi.advanceTimersByTime(EVENT_MS);
  expect(playback.getSnapshot().replicas.C).toEqual([0, 0, 2]);
  for (const message of playback.getSnapshot().messages) {
    playback.deliver(message.id);
    vi.advanceTimersByTime(EVENT_MS);
  }
  expect(playback.getSnapshot().converged).toBe(true);
  expect(playback.getSnapshot().replicas).toEqual({
    A: [2, 0, 2],
    B: [2, 0, 2],
    C: [2, 0, 2],
  });
  playback.dispose();
});

it("suspends midflight and preserves progress through speed changes", () => {
  const playback = create();
  playback.deliver("A-B");
  vi.advanceTimersByTime(1000);
  playback.setActive(false);
  playback.setSpeed(2);
  vi.advanceTimersByTime(10000);
  expect(playback.getProgress()).toBe(0.25);
  expect(playback.getSnapshot().replicas.B).toEqual([0, 0, 0]);
  playback.setActive(true);
  vi.advanceTimersByTime(1499);
  expect(playback.getSnapshot().replicas.B).toEqual([0, 0, 0]);
  vi.advanceTimersByTime(1);
  expect(playback.getSnapshot().replicas.B).toEqual([1, 0, 0]);
  playback.dispose();
});

it("changes speed midflight without resetting progress", () => {
  const playback = create();
  playback.increment("A");
  vi.advanceTimersByTime(1000);
  playback.setSpeed(4);
  expect(playback.getProgress()).toBe(0.25);
  vi.advanceTimersByTime(750);
  expect(playback.getSnapshot().replicas.A).toEqual([2, 0, 0]);
  playback.setSpeed(99);
  expect(playback.getSnapshot().speed).toBe(4);
  playback.dispose();
});

it("ignores competing actions and cancels pending work on restart", () => {
  const playback = create();
  playback.deliver("A-B");
  playback.deliver("C-B");
  vi.advanceTimersByTime(EVENT_MS);
  expect(playback.getSnapshot().replicas.B).toEqual([1, 0, 0]);
  playback.deliver("C-B");
  vi.advanceTimersByTime(1000);
  playback.restart();
  vi.advanceTimersByTime(EVENT_MS);
  expect(playback.getSnapshot().replicas).toEqual(experimentReplicas());
  expect(playback.getSnapshot().delivered).toEqual([]);
  expect(playback.getSnapshot().inProgress).toBe(false);
  playback.dispose();
});

it("uses immediate reduced-motion actions and settles an active action", () => {
  const playback = create();
  playback.increment("A");
  vi.advanceTimersByTime(1000);
  playback.setReduced(true);
  expect(playback.getSnapshot().replicas.A).toEqual([2, 0, 0]);
  expect(playback.getSnapshot().inProgress).toBe(false);
  expect(
    playback.getSnapshot().messages.filter((message) => message.from === "A"),
  ).toEqual([
    expect.objectContaining({ vector: [2, 0, 0] }),
    expect.objectContaining({ vector: [2, 0, 0] }),
  ]);
  playback.deliver("C-B");
  expect(playback.getSnapshot().replicas.B).toEqual([0, 0, 1]);
  playback.restart();
  expect(playback.getSnapshot().replicas).toEqual(experimentReplicas());
  playback.dispose();
});

it("cleans up timers", () => {
  const playback = create();
  playback.increment("A");
  playback.dispose();
  vi.advanceTimersByTime(EVENT_MS * 2);
  expect(playback.getSnapshot().replicas).toEqual(experimentReplicas());
  expect(vi.getTimerCount()).toBe(0);
});
