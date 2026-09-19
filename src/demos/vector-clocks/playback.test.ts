import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayback, EVENT_MS, STEP_ENDS } from "./playback";
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const create = () => createPlayback(() => Date.now());
describe("manual playback", () => {
  it("advances exactly one clock event per manual step and stops at the final state", () => {
    const p = create();
    p.setActive(true);
    vi.advanceTimersByTime(10000);
    expect(p.getSnapshot().step).toBe(0);
    for (let event = 1; event <= 6; event++) {
      p.step();
      expect(p.getSnapshot().inProgress).toBe(true);
      expect(p.getSnapshot().running).toBe(true);
      vi.advanceTimersByTime(EVENT_MS);
      expect(p.getSnapshot().inProgress).toBe(false);
      expect(p.getSnapshot().step).toBe(STEP_ENDS[event]);
      vi.advanceTimersByTime(10000);
      expect(p.getSnapshot().step).toBe(STEP_ENDS[event]);
    }
    expect(p.getSnapshot().done).toBe(true);
    expect(p.getSnapshot().clocks.C).toEqual([2, 2, 2]);
    p.step();
    p.setActive(false);
    p.setActive(true);
    vi.advanceTimersByTime(10000);
    expect(p.getSnapshot().step).toBe(6);
    p.dispose();
  });
  it("commits the sender increment before exposing its copied message", () => {
    const p = create();
    p.setActive(true);
    for (let i = 0; i < 2; i++) {
      p.step();
      vi.advanceTimersByTime(EVENT_MS);
    }
    p.step();
    vi.advanceTimersByTime(EVENT_MS - 1);
    expect(p.getSnapshot().clocks.A).toEqual([1, 0, 0]);
    expect(p.getSnapshot().message).toBeNull();
    vi.advanceTimersByTime(1);
    const sent = p.getSnapshot();
    expect(sent.clocks.A).toEqual([2, 0, 0]);
    expect(sent.message?.clock).toEqual(sent.clocks.A);
    expect(sent.message?.clock).not.toBe(sent.clocks.A);
    expect(sent.clocks.B).toEqual([0, 0, 0]);
    vi.advanceTimersByTime(EVENT_MS * 5);
    expect(p.getSnapshot().step).toBe(3);
    expect(p.getSnapshot().message).toBe(sent.message);
    p.step();
    vi.advanceTimersByTime(EVENT_MS);
    expect(p.getSnapshot().clocks.B).toEqual([2, 1, 0]);
    expect(p.getSnapshot().message).toBeNull();
    expect(sent.message?.clock).toEqual([2, 0, 0]);
    p.dispose();
  });
  it("suspends a step midflight while hidden and resumes only that event", () => {
    const p = create();
    p.setActive(true);
    for (let i = 0; i < 2; i++) {
      p.step();
      vi.advanceTimersByTime(EVENT_MS);
    }
    p.step();
    vi.advanceTimersByTime(EVENT_MS);
    p.step();
    vi.advanceTimersByTime(EVENT_MS / 2);
    expect(p.getProgress()).toBe(0.5);
    expect(p.getSnapshot().clocks.A).toEqual([2, 0, 0]);
    expect(p.getSnapshot().clocks.B).toEqual([0, 0, 0]);
    p.setActive(false);
    vi.advanceTimersByTime(4000);
    expect(p.getProgress()).toBe(0.5);
    expect(p.getSnapshot().step).toBe(3);
    p.setActive(true);
    vi.advanceTimersByTime(EVENT_MS / 2);
    expect(p.getSnapshot().clocks.B).toEqual([2, 1, 0]);
    vi.advanceTimersByTime(10000);
    expect(p.getSnapshot().step).toBe(4);
    p.dispose();
  });
  it("restart cancels an animation and waits for another step", () => {
    const p = create();
    p.setActive(true);
    p.step();
    vi.advanceTimersByTime(EVENT_MS / 2);
    p.restart();
    vi.advanceTimersByTime(10000);
    expect(p.getSnapshot().step).toBe(0);
    expect(p.getSnapshot().inProgress).toBe(false);
    expect(p.getProgress()).toBe(0);
    p.step();
    vi.advanceTimersByTime(EVENT_MS);
    expect(p.getSnapshot().step).toBe(1);
    p.dispose();
  });
  it("ignores repeated step clicks during animation", () => {
    const p = create();
    p.setActive(true);
    p.step();
    vi.advanceTimersByTime(EVENT_MS / 2);
    p.step();
    vi.advanceTimersByTime(EVENT_MS / 2);
    expect(p.getSnapshot().step).toBe(1);
    vi.advanceTimersByTime(10000);
    expect(p.getSnapshot().step).toBe(1);
    p.dispose();
  });
  it("applies reduced-motion steps immediately and restarts idle", () => {
    const p = create();
    p.setActive(true);
    p.setReduced(true);
    for (let i = 0; i < 6; i++) p.step();
    expect(p.getSnapshot().clocks.C).toEqual([2, 2, 2]);
    p.restart();
    vi.advanceTimersByTime(10000);
    expect(p.getSnapshot().step).toBe(0);
    expect(p.getSnapshot().inProgress).toBe(false);
    p.dispose();
  });
  it("defaults to four-second steps and preserves progress when speed changes", () => {
    const p = create();
    p.setActive(true);
    expect(p.getSnapshot().speed).toBe(1);
    p.step();
    vi.advanceTimersByTime(1000);
    expect(p.getProgress()).toBe(0.25);
    expect(p.getSnapshot().step).toBe(0);
    p.setSpeed(4);
    expect(p.getProgress()).toBe(0.25);
    vi.advanceTimersByTime(749);
    expect(p.getSnapshot().step).toBe(0);
    vi.advanceTimersByTime(1);
    expect(p.getSnapshot().step).toBe(1);
    p.restart();
    expect(p.getSnapshot().speed).toBe(4);
    p.step();
    vi.advanceTimersByTime(1000);
    expect(p.getSnapshot().step).toBe(1);
    p.dispose();
  });
  it("changes speed while suspended without advancing the simulation", () => {
    const p = create();
    p.setActive(true);
    p.step();
    vi.advanceTimersByTime(1000);
    p.setActive(false);
    p.setSpeed(2);
    vi.advanceTimersByTime(10000);
    expect(p.getProgress()).toBe(0.25);
    p.setActive(true);
    vi.advanceTimersByTime(1500);
    expect(p.getSnapshot().step).toBe(1);
    p.dispose();
  });
  it("cleans up timers", () => {
    const p = create();
    p.setActive(true);
    p.step();
    p.dispose();
    vi.advanceTimersByTime(5000);
    expect(p.getSnapshot().step).toBe(0);
  });
});
