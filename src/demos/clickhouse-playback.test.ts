// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceFiniteClock,
  MAX_CLICKHOUSE_FRAME_DELTA_MS,
  shouldAdvance,
  useClickHousePlayback,
  type PlaybackOptions,
} from "./clickhouse-playback";

describe("finite beat clock", () => {
  it("keeps travel and step transitions on one clock", () => {
    expect(
      advanceFiniteClock({ step: 1, elapsedMs: 1600 }, 16, 4, 3200),
    ).toEqual({
      step: 1,
      elapsedMs: 1616,
    });
    expect(
      advanceFiniteClock({ step: 1, elapsedMs: 3190 }, 16, 4, 3200),
    ).toEqual({
      step: 2,
      elapsedMs: 0,
    });
  });

  it("bounds delayed frames and ignores invalid or backwards elapsed time", () => {
    const previous = { step: 0, elapsedMs: 200 };
    expect(advanceFiniteClock(previous, 60_000, 4, 3200)).toEqual({
      step: 0,
      elapsedMs: 200 + MAX_CLICKHOUSE_FRAME_DELTA_MS,
    });
    for (const delta of [-100, NaN, Infinity]) {
      expect(advanceFiniteClock(previous, delta, 4, 3200)).toEqual(previous);
    }
    // Even a beat shorter than the frame cap cannot skip a causal step.
    expect(advanceFiniteClock({ step: 0, elapsedMs: 0 }, 1000, 5, 20)).toEqual({
      step: 1,
      elapsedMs: 0,
    });
  });

  it("settles at the final step without looping or accumulating travel", () => {
    const terminal = advanceFiniteClock(
      { step: 2, elapsedMs: 3199 },
      16,
      4,
      3200,
    );
    expect(terminal).toEqual({ step: 3, elapsedMs: 0 });
    expect(advanceFiniteClock(terminal, 60_000, 4, 3200)).toEqual(terminal);
    expect(
      advanceFiniteClock({ step: 20, elapsedMs: 100 }, 16, 4, 3200),
    ).toEqual(terminal);
    expect(advanceFiniteClock({ step: 0, elapsedMs: 0 }, 16, 1, 3200)).toEqual({
      step: 0,
      elapsedMs: 0,
    });
  });

  it("requires a usable finite playback configuration", () => {
    const previous = { step: 0, elapsedMs: 0 };
    expect(() => advanceFiniteClock(previous, 16, 0, 3200)).toThrow(RangeError);
    expect(() => advanceFiniteClock(previous, 16, 2.5, 3200)).toThrow(
      RangeError,
    );
    expect(() => advanceFiniteClock(previous, 16, 3, 0)).toThrow(RangeError);
    expect(() => advanceFiniteClock(previous, 16, 3, Infinity)).toThrow(
      RangeError,
    );
  });
});

describe("clock eligibility", () => {
  it("needs Play intent, a visible stage, a visible document, and permitted motion", () => {
    expect(shouldAdvance(true, true, false, false)).toBe(true);
    expect(shouldAdvance(false, true, false, false)).toBe(false);
    expect(shouldAdvance(true, false, false, false)).toBe(false);
    expect(shouldAdvance(true, true, true, false)).toBe(false);
    expect(shouldAdvance(true, true, false, true)).toBe(false);
  });
});

let documentHidden: boolean;
let reducedMotion: boolean;
let timestamp: number;
let nextFrameId: number;
let frames: Map<number, FrameRequestCallback>;
let intersections: Set<IntersectionObserverCallback>;
let motionListeners: Set<() => void>;

beforeEach(() => {
  documentHidden = false;
  reducedMotion = false;
  timestamp = 0;
  nextFrameId = 0;
  frames = new Map();
  intersections = new Set();
  motionListeners = new Set();
  vi.spyOn(document, "hidden", "get").mockImplementation(() => documentHidden);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrameId;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reducedMotion;
    },
    addEventListener: (_event: string, listener: () => void) =>
      motionListeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) =>
      motionListeners.delete(listener),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {
        intersections.add(callback);
      }
      observe() {}
      disconnect() {
        intersections.delete(this.callback);
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mountPlayback(
  totalSteps = 3,
  beatMs = 200,
  options: PlaybackOptions = { autoplay: false, startDelayMs: 0 },
) {
  let current!: ReturnType<typeof useClickHousePlayback>;
  function Harness() {
    current = useClickHousePlayback(totalSteps, beatMs, options);
    return createElement("div", { ref: current.stageRef });
  }
  const rendered = render(createElement(Harness));
  return {
    get current() {
      return current;
    },
    unmount: rendered.unmount,
  };
}

function setVisible(visible: boolean, height = visible ? 400 : 0) {
  act(() => {
    for (const callback of intersections) {
      callback(
        [
          {
            isIntersecting: visible,
            boundingClientRect: { height: 800 },
            intersectionRect: { height },
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    }
  });
}

function setHidden(hidden: boolean) {
  documentHidden = hidden;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}

function setReducedMotion(reduced: boolean) {
  reducedMotion = reduced;
  act(() => {
    for (const listener of motionListeners) listener();
  });
}

function frame(deltaMs = 16) {
  timestamp += deltaMs;
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => {
    for (const callback of callbacks) callback(timestamp);
  });
}

describe("ClickHouse playback hook", () => {
  it("autoplays once after a visible orientation hold and preserves the terminal state", () => {
    const playback = mountPlayback(3, 200, {});
    expect(playback.current.playing).toBe(false);
    expect(frames.size).toBe(0);
    setVisible(true, 1);
    expect(playback.current.playing).toBe(false);
    setVisible(true, 200);
    expect(playback.current).toMatchObject({ playing: true, running: true });
    frame();
    for (let index = 0; index < 9; index++) frame(100);
    expect(playback.current).toMatchObject({ step: 0, fraction: 0 });
    frame(100);
    expect(playback.current.fraction).toBe(0.5);
    for (let index = 0; index < 3; index++) frame(100);
    expect(playback.current).toMatchObject({ step: 2, playing: false });
    setVisible(false);
    setVisible(true);
    expect(playback.current).toMatchObject({ step: 2, playing: false });
    expect(frames.size).toBe(0);
  });

  it("holds orientation time offscreen instead of consuming background time", () => {
    const playback = mountPlayback(3, 200, { startDelayMs: 300 });
    setVisible(true);
    frame();
    frame(100);
    setVisible(false);
    frame(60_000);
    setVisible(true);
    frame();
    frame(100);
    frame(100);
    expect(playback.current).toMatchObject({ step: 0, fraction: 0 });
    frame(100);
    expect(playback.current.fraction).toBe(0.5);
  });

  it("lets a reader claim the demo before its automatic start", () => {
    const playback = mountPlayback(3, 200, {});
    act(() => playback.current.pause());
    setVisible(true);
    expect(playback.current.playing).toBe(false);
    expect(frames.size).toBe(0);
    act(() => playback.current.replay());
    expect(playback.current).toMatchObject({ step: 0, playing: true });
  });

  it("waits for a useful representation to become ready", () => {
    const options = { enabled: false, startDelayMs: 0 };
    const playback = mountPlayback(3, 200, options);
    setVisible(true);
    expect(frames.size).toBe(0);
    options.enabled = true;
    // A viewport callback causes a rerender, as readiness does in the shell.
    setVisible(false);
    setVisible(true);
    expect(playback.current.running).toBe(true);
    frame();
    frame(100);
    expect(playback.current.fraction).toBe(0.5);
  });

  it("updates the spatial animation ref without publishing a React frame", () => {
    const playback = mountPlayback(3, 200, {
      startDelayMs: 0,
      publishFractions: false,
    });
    setVisible(true);
    frame();
    const previous = playback.current;
    frame(100);
    expect(playback.current).toBe(previous);
    expect(playback.current.fractionRef.current).toBe(0.5);
    frame(100);
    expect(playback.current.step).toBe(1);
  });

  it("keeps reduced-motion startup manual even when the preference changes", () => {
    reducedMotion = true;
    const playback = mountPlayback(3, 200, {});
    setVisible(true);
    expect(playback.current.playing).toBe(false);
    expect(frames.size).toBe(0);
    setReducedMotion(false);
    expect(playback.current.playing).toBe(false);
    act(() => playback.current.next());
    expect(playback.current.step).toBe(1);
    expect(frames.size).toBe(0);
  });

  it("starts paused, plays a finite sequence, and can replay from the start", () => {
    const playback = mountPlayback();
    setVisible(true);
    expect(playback.current).toMatchObject({
      step: 0,
      fraction: 0,
      playing: false,
    });
    expect(frames.size).toBe(0);
    act(() => playback.current.togglePlayback());
    frame();
    frame(100);
    expect(playback.current).toMatchObject({
      step: 0,
      fraction: 0.5,
      playing: true,
    });
    frame(100);
    expect(playback.current).toMatchObject({
      step: 1,
      fraction: 0,
      playing: true,
    });
    frame(100);
    frame(100);
    expect(playback.current).toMatchObject({
      step: 2,
      fraction: 0,
      playing: false,
    });
    expect(frames.size).toBe(0);
    act(() => playback.current.togglePlayback());
    expect(playback.current).toMatchObject({
      step: 0,
      fraction: 0,
      playing: true,
    });
  });

  it("keeps Play intent offscreen and hidden, then resumes without catch-up", () => {
    const playback = mountPlayback();
    setVisible(true);
    act(() => playback.current.togglePlayback());
    frame();
    frame(100);
    setVisible(false);
    expect(playback.current.playing).toBe(true);
    expect(frames.size).toBe(0);
    frame(60_000);
    setVisible(true);
    frame();
    expect(playback.current).toMatchObject({
      step: 0,
      fraction: 0.5,
      playing: true,
    });
    frame(50);
    expect(playback.current.fraction).toBe(0.75);
    setHidden(true);
    expect(playback.current.playing).toBe(true);
    expect(frames.size).toBe(0);
    frame(60_000);
    setHidden(false);
    frame();
    expect(playback.current).toMatchObject({
      step: 0,
      fraction: 0.75,
      playing: true,
    });
    frame(50);
    expect(playback.current).toMatchObject({
      step: 1,
      fraction: 0,
      playing: true,
    });
  });

  it("pauses on Next and preserves the current Play choice on Reset", () => {
    const playback = mountPlayback();
    setVisible(true);
    act(() => playback.current.togglePlayback());
    frame();
    frame(50);
    act(() => playback.current.reset());
    expect(playback.current).toMatchObject({
      step: 0,
      fraction: 0,
      playing: true,
    });
    act(() => playback.current.next());
    expect(playback.current).toMatchObject({
      step: 1,
      fraction: 0,
      playing: false,
    });
    expect(frames.size).toBe(0);
    act(() => playback.current.reset());
    expect(playback.current).toMatchObject({
      step: 0,
      fraction: 0,
      playing: false,
    });
    for (let step = 0; step < 4; step++) act(() => playback.current.next());
    expect(playback.current.step).toBe(2);
  });

  it("reacts to reduced motion and never schedules animation in manual mode", () => {
    reducedMotion = true;
    const playback = mountPlayback();
    setVisible(true);
    expect(playback.current.reducedMotion).toBe(true);
    act(() => playback.current.togglePlayback());
    expect(playback.current.playing).toBe(false);
    expect(frames.size).toBe(0);
    act(() => playback.current.next());
    expect(playback.current).toMatchObject({ step: 1, fraction: 0 });
    setReducedMotion(false);
    act(() => playback.current.togglePlayback());
    expect(frames.size).toBe(1);
    frame();
    frame(50);
    setReducedMotion(true);
    expect(playback.current).toMatchObject({
      playing: false,
      reducedMotion: true,
    });
    expect(frames.size).toBe(0);
    act(() => playback.current.next());
    expect(playback.current).toMatchObject({ step: 2, fraction: 0 });
    expect(frames.size).toBe(0);
  });

  it("cleans up pending animation and browser subscriptions on unmount", () => {
    const playback = mountPlayback();
    setVisible(true);
    act(() => playback.current.togglePlayback());
    expect(frames.size).toBe(1);
    playback.unmount();
    expect(frames.size).toBe(0);
    expect(intersections.size).toBe(0);
    expect(motionListeners.size).toBe(0);
  });
});
