import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createLagPlayback,
  PLAYBACK_RATE,
  readSummary,
  formatWallTime,
} from "./playback";

const advance = (ms: number) => vi.advanceTimersByTime(ms / PLAYBACK_RATE);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("starts one visible write automatically and waits for each subsequent click", () => {
  const playback = createLagPlayback();
  advance(20_000);
  expect(playback.getSnapshot().submitted).toBe(0);
  playback.setActive(true);
  expect(playback.getSnapshot().submitted).toBe(1);
  advance(20_000);
  expect(
    playback.getSnapshot().members.map((member) => member.applied),
  ).toEqual([1, 1, 1]);
  expect(vi.getTimerCount()).toBe(0);
  playback.setActive(false);
  playback.setActive(true);
  expect(playback.getSnapshot().submitted).toBe(1);
  playback.write();
  expect(playback.getSnapshot().submitted).toBe(2);
  playback.write();
  expect(playback.getSnapshot().submitted).toBe(2);
  playback.setActive(false);
});

it("allows manual bursts while B applies serially and settles without a scripted pause", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  for (let write = 2; write <= 6; write++) {
    advance(1200);
    playback.write();
  }
  advance(1300);
  expect(
    playback.getSnapshot().members.map((member) => member.applied),
  ).toEqual([6, 6, 2]);
  expect(playback.getSnapshot().canWrite).toBe(false);
  expect(playback.getSnapshot().running).toBe(true);
  advance(11600);
  expect(
    playback.getSnapshot().members.map((member) => member.applied),
  ).toEqual([6, 6, 6]);
  expect(playback.getSnapshot().pending).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it("freezes delivery and captures only applied values until the comparison closes", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  advance(500);
  playback.readAll();
  const reads = playback.getSnapshot().reads;
  expect(reads?.map((read) => read.version)).toEqual([0, 0, 0]);
  expect(
    playback
      .getSnapshot()
      .flights.filter((flight) => flight.kind === "replicating"),
  ).toHaveLength(2);
  advance(5000);
  playback.setActive(false);
  playback.setActive(true);
  expect(playback.getTime()).toBeCloseTo(500);
  expect(playback.getSnapshot().reads).toBe(reads);
  playback.resume();
  advance(400);
  expect(
    playback.getSnapshot().members.map((member) => member.received),
  ).toEqual([1, 1, 1]);
  advance(400);
  playback.readAll();
  expect(playback.getSnapshot().reads?.map((read) => read.version)).toEqual([
    1, 1, 0,
  ]);
  expect(readSummary(playback.getSnapshot().reads!)).toContain(
    "Replica B returned a value 1 version behind",
  );
  expect(vi.getTimerCount()).toBe(0);
});

it("reset clears queued work and reads without scheduling another automatic write", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  advance(1500);
  playback.write();
  playback.readAll();
  playback.reset();
  expect(playback.getTime()).toBe(0);
  expect(playback.getSnapshot().reads).toBeNull();
  expect(playback.getSnapshot().flights).toEqual([]);
  expect(
    playback.getSnapshot().members.map((member) => member.applied),
  ).toEqual([0, 0, 0]);
  playback.setActive(false);
  playback.setActive(true);
  advance(20_000);
  expect(playback.getSnapshot().submitted).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
  playback.write();
  expect(playback.getSnapshot().submitted).toBe(1);
  playback.setActive(false);
});

it("suspends the continuous clock when hidden and handles delayed timers without extra writes", () => {
  let wallTime = 0;
  const playback = createLagPlayback(() => wallTime);
  playback.setActive(true);
  wallTime = 500 / PLAYBACK_RATE;
  playback.setActive(false);
  wallTime += 30_000;
  expect(playback.getTime()).toBeCloseTo(500);
  playback.setActive(true);
  wallTime += 30_000;
  advance(200);
  expect(playback.getSnapshot().submitted).toBe(1);
  expect(playback.getTime()).toBe(3900);
  expect(playback.getSnapshot().pending).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it("retains lag without motion and lets the reader apply the pending queue", () => {
  const playback = createLagPlayback();
  playback.setReduced(true);
  playback.setActive(true);
  expect(
    playback.getSnapshot().members.map((member) => member.applied),
  ).toEqual([1, 1, 0]);
  for (let write = 2; write <= 6; write++) playback.write();
  expect(
    playback.getSnapshot().members.map((member) => member.applied),
  ).toEqual([6, 6, 2]);
  expect(vi.getTimerCount()).toBe(0);
  playback.catchUp();
  expect(
    playback.getSnapshot().members.map((member) => member.applied),
  ).toEqual([6, 6, 6]);
  expect(playback.getSnapshot().pending).toBe(false);
});

it("notifies only at meaningful events and disposes its timer on deactivation", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  const listener = vi.fn();
  const unsubscribe = playback.subscribe(listener);
  advance(100);
  expect(playback.getTime()).toBe(100);
  expect(listener).not.toHaveBeenCalled();
  advance(100);
  expect(listener).toHaveBeenCalledTimes(2);
  advance(150);
  expect(playback.getTime()).toBeCloseTo(350);
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
  playback.setActive(false);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

it("runs travel and event publication at one third of wall-clock speed", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  vi.advanceTimersByTime(599);
  expect(playback.getTime()).toBeCloseTo(599 / 3);
  expect(playback.getSnapshot().flights[0].kind).toBe("ordering");
  vi.advanceTimersByTime(1);
  expect(
    playback
      .getSnapshot()
      .flights.filter((flight) => flight.kind === "replicating"),
  ).toHaveLength(2);
  vi.advanceTimersByTime(2100);
  expect(playback.getSnapshot().committed).toBe(1);
  playback.setActive(false);
});

it("re-enables writes every 500 wall-clock milliseconds while prior writes are in flight", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  for (let submitted = 1; submitted < 6; submitted++) {
    vi.advanceTimersByTime(499);
    expect(playback.getSnapshot().canWrite).toBe(false);
    playback.write();
    expect(playback.getSnapshot().submitted).toBe(submitted);
    vi.advanceTimersByTime(1);
    expect(playback.getSnapshot().canWrite).toBe(true);
    playback.write();
    expect(playback.getSnapshot().submitted).toBe(submitted + 1);
  }
  expect(playback.getSnapshot().committed).toBe(0);
  expect(
    new Set(playback.getSnapshot().flights.map((f) => f.transaction)).size,
  ).toBe(6);
  vi.advanceTimersByTime(60_000);
  expect(playback.getSnapshot().members.map((m) => m.applied)).toEqual([
    6, 6, 6,
  ]);
  expect(vi.getTimerCount()).toBe(0);
});

it("freezes the captured wall time and excludes inspection time when resuming", () => {
  const playback = createLagPlayback();
  expect(playback.getWallTime()).toBe(0);
  playback.setActive(true);
  vi.advanceTimersByTime(4200);
  playback.readAll();
  const snapshot = playback.getSnapshot();
  expect(snapshot.readAt).toBe(4200);
  expect(
    snapshot.reads?.map(({ version, received, pending }) => ({
      version,
      received,
      pending,
    })),
  ).toEqual([
    { version: 1, received: 1, pending: 0 },
    { version: 1, received: 1, pending: 0 },
    { version: 0, received: 1, pending: 1 },
  ]);
  vi.advanceTimersByTime(5000);
  expect(playback.getWallTime()).toBe(4200);
  expect(playback.getSnapshot().readAt).toBe(4200);
  expect(playback.getSnapshot().reads).toBe(snapshot.reads);
  playback.resume();
  playback.setActive(false);
  vi.advanceTimersByTime(1000);
  expect(playback.getWallTime()).toBe(5200);
  playback.readAll();
  vi.advanceTimersByTime(3000);
  playback.readAll();
  expect(playback.getWallTime()).toBe(5200);
  playback.resume();
  playback.resume();
  vi.advanceTimersByTime(500);
  expect(playback.getWallTime()).toBe(5700);
  playback.reset();
  expect(playback.getWallTime()).toBe(0);
  expect(playback.getSnapshot().readAt).toBeNull();
});

it("formats wall-clock minutes, seconds and hundredths without wrapping minutes", () => {
  expect(formatWallTime(0)).toBe("00:00.00");
  expect(formatWallTime(61999)).toBe("01:01.99");
  expect(formatWallTime(6000000)).toBe("100:00.00");
});

it("freezes outage deadlines during snapshots and offscreen playback", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  playback.toggleLink();
  vi.advanceTimersByTime(4000);
  playback.readAll();
  const captured = playback.getWallTime();
  expect(playback.getSnapshot().reads?.[2].available).toBe(false);
  vi.advanceTimersByTime(20_000);
  expect(playback.getWallTime()).toBe(captured);
  expect(playback.getSnapshot().membership).toBe("online");
  expect(vi.getTimerCount()).toBe(0);
  playback.resume();
  playback.setActive(false);
  vi.advanceTimersByTime(20_000);
  expect(playback.getSnapshot().membership).toBe("online");
  playback.setActive(true);
  vi.advanceTimersByTime(1000);
  expect(playback.getSnapshot().membership).toBe("suspected");
  vi.advanceTimersByTime(5000);
  expect(playback.getSnapshot().membership).toBe("expelled");
  expect(vi.getTimerCount()).toBe(0);
  playback.toggleLink();
  vi.advanceTimersByTime(30_000);
  expect(playback.getSnapshot().membership).toBe("online");
  expect(playback.getSnapshot().members.map((m) => m.applied)).toEqual([
    1, 1, 1,
  ]);
  expect(vi.getTimerCount()).toBe(0);
});

it("reset clears a fault and recovery while retaining both sliders", () => {
  const playback = createLagPlayback();
  playback.setActive(true);
  playback.configure({ processingTime: 5000, linkLatency: 2800 });
  playback.toggleLink();
  vi.advanceTimersByTime(10_000);
  playback.toggleLink();
  playback.reset();
  const state = playback.getSnapshot();
  expect(state.conditions).toEqual({ processingTime: 5000, linkLatency: 2800 });
  expect(state.membership).toBe("online");
  expect(state.disconnected).toBe(false);
  expect(state.recoverySource).toBe("live");
  expect(state.submitted).toBe(0);
  expect(state.flights).toEqual([]);
  expect(playback.getWallTime()).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

it("reduced motion keeps outage timers and cannot apply across a broken link", () => {
  const playback = createLagPlayback();
  playback.setReduced(true);
  playback.setActive(true);
  playback.toggleLink();
  playback.write();
  vi.advanceTimersByTime(10_000);
  expect(playback.getSnapshot().membership).toBe("expelled");
  playback.catchUp();
  expect(playback.getSnapshot().members[2].received).toBe(1);
  expect(playback.getSnapshot().members[2].applied).toBeLessThan(2);
  playback.toggleLink();
  expect(playback.getSnapshot().membership).toBe("rejoining");
  playback.catchUp();
  expect(playback.getSnapshot().membership).toBe("online");
  expect(playback.getSnapshot().members.map((m) => m.applied)).toEqual([
    2, 2, 2,
  ]);
  expect(vi.getTimerCount()).toBe(0);
});
