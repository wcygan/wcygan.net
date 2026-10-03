/** @vitest-environment jsdom */

import { act, cleanup, renderHook } from "@testing-library/react";
import { useState, type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlinkPlayback } from "./useFlinkPlayback";

let hidden: boolean;
let reduced: boolean;
let motionListeners: Set<() => void>;
let observers: IntersectionObserverStub[];
let figure: HTMLElement;
let stage: HTMLElement;
let targetRef: RefObject<HTMLElement | null>;

class IntersectionObserverStub {
  target: Element | null = null;
  disconnect = vi.fn();
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit,
  ) {
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  intersect(ratio: number) {
    this.callback(
      [
        {
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function setVisible(ratio: number) {
  act(() => observers[0].intersect(ratio));
}

function setHidden(value: boolean) {
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

function setReduced(value: boolean) {
  act(() => {
    reduced = value;
    for (const listener of motionListeners) listener();
  });
}

function beat() {
  act(() => vi.advanceTimersByTime(2200));
}

function setup(
  initial: { ready?: boolean; total?: number; revision?: number } = {},
) {
  const onBeat = vi.fn();
  const onReset = vi.fn();
  const hook = renderHook(
    ({ ready = true, total = 3, revision = 0 }) => {
      const [step, setStep] = useState(0);
      const playback = useFlinkPlayback({
        targetRef,
        step,
        total,
        ready,
        onStep: () => {
          onBeat(revision);
          setStep((value) => value + 1);
        },
        onReset: () => {
          onReset();
          setStep(0);
        },
      });
      return { ...playback, step };
    },
    { initialProps: initial },
  );
  return { ...hook, onBeat, onReset };
}

describe("Flink viewport playback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    reduced = false;
    motionListeners = new Set();
    observers = [];
    figure = document.createElement("figure");
    stage = document.createElement("div");
    stage.dataset.graphicStage = "padded";
    const progress = document.createElement("span");
    figure.append(stage, progress);
    document.body.append(figure);
    targetRef = { current: progress };
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    vi.stubGlobal("matchMedia", (media: string) => ({
      get matches() {
        return reduced;
      },
      media,
      addEventListener(_type: string, listener: () => void) {
        motionListeners.add(listener);
      },
      removeEventListener(_type: string, listener: () => void) {
        motionListeners.delete(listener);
      },
    }));
  });

  afterEach(() => {
    cleanup();
    figure.remove();
    Reflect.deleteProperty(document, "hidden");
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("observes the visual stage and starts at 35% visibility", () => {
    const { result, onBeat } = setup();
    expect(observers[0].target).toBe(stage);
    expect(observers[0].options.threshold).toEqual([0, 0.35]);
    setVisible(0.34);
    beat();
    expect(onBeat).not.toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
    setVisible(0.35);
    expect(result.current.running).toBe(true);
    act(() => vi.advanceTimersByTime(2199));
    expect(result.current.step).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.step).toBe(1);
  });

  it("waits for a ready scene even when the stage is visible", () => {
    const { result, rerender, onBeat } = setup({ ready: false });
    setVisible(1);
    beat();
    expect(onBeat).not.toHaveBeenCalled();
    rerender({ ready: true });
    expect(result.current.running).toBe(true);
    beat();
    expect(result.current.step).toBe(1);
    rerender({ ready: false });
    beat();
    expect(result.current.step).toBe(1);
    rerender({ ready: true });
    beat();
    expect(result.current.step).toBe(2);
  });

  it("suspends offscreen or in a hidden tab and resumes the same run", () => {
    const { result } = setup();
    setVisible(1);
    beat();
    setVisible(0);
    expect(result.current.playing).toBe(true);
    expect(result.current.running).toBe(false);
    beat();
    expect(result.current.step).toBe(1);
    setVisible(1);
    setHidden(true);
    beat();
    expect(result.current.step).toBe(1);
    setHidden(false);
    beat();
    expect(result.current.step).toBe(2);
  });

  it("does not start while the document is initially hidden", () => {
    hidden = true;
    const { result } = setup();
    setVisible(1);
    beat();
    expect(result.current.step).toBe(0);
    expect(result.current.playing).toBe(false);
    setHidden(false);
    beat();
    expect(result.current.step).toBe(1);
  });

  it("uses current callbacks without restarting a beat on unrelated renders", () => {
    const { result, rerender, onBeat } = setup({ revision: 0 });
    setVisible(1);
    act(() => vi.advanceTimersByTime(1200));
    rerender({ revision: 1 });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.step).toBe(1);
    expect(onBeat).toHaveBeenLastCalledWith(1);
  });

  it("keeps a manually paused demo paused when returning to it", () => {
    const { result } = setup();
    setVisible(1);
    beat();
    act(() => result.current.pause());
    setVisible(0);
    setVisible(1);
    setHidden(true);
    setHidden(false);
    beat();
    expect(result.current.step).toBe(1);
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    beat();
    expect(result.current.step).toBe(2);
  });

  it("manual input before first visibility suppresses the initial autoplay", () => {
    const { result } = setup();
    act(() => result.current.advance());
    expect(result.current.step).toBe(1);
    setVisible(1);
    beat();
    expect(result.current.step).toBe(1);
    expect(result.current.playing).toBe(false);
  });

  it("finishes once and keeps its settled state across visibility changes", () => {
    const { result, onBeat } = setup({ total: 2 });
    setVisible(1);
    beat();
    beat();
    expect(result.current.step).toBe(2);
    expect(result.current.playing).toBe(false);
    expect(result.current.running).toBe(false);
    setVisible(0);
    setVisible(1);
    setHidden(true);
    setHidden(false);
    act(() => vi.advanceTimersByTime(20_000));
    expect(result.current.step).toBe(2);
    expect(onBeat).toHaveBeenCalledTimes(2);
    act(() => result.current.advance());
    expect(onBeat).toHaveBeenCalledTimes(2);
  });

  it("can replay a completed demo without another automatic loop", () => {
    const { result, onReset } = setup({ total: 1 });
    setVisible(1);
    beat();
    act(() => result.current.toggle());
    expect(onReset).toHaveBeenCalledOnce();
    expect(result.current.step).toBe(0);
    expect(result.current.playing).toBe(true);
    beat();
    expect(result.current.step).toBe(1);
    expect(result.current.playing).toBe(false);
    act(() => result.current.replay());
    expect(result.current.step).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it("reset returns to the beginning and waits for the reader to play", () => {
    const { result } = setup();
    setVisible(1);
    beat();
    act(() => result.current.reset());
    expect(result.current.step).toBe(0);
    expect(result.current.playing).toBe(false);
    setVisible(0);
    setVisible(1);
    beat();
    expect(result.current.step).toBe(0);
  });

  it("reduced motion preserves manual steps and cancels active playback", () => {
    reduced = true;
    const { result } = setup();
    setVisible(1);
    beat();
    expect(result.current.reduced).toBe(true);
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    act(() => result.current.advance());
    expect(result.current.step).toBe(1);
    act(() => result.current.replay());
    expect(result.current.step).toBe(0);
    expect(result.current.playing).toBe(false);
    setReduced(false);
    act(() => result.current.toggle());
    beat();
    expect(result.current.step).toBe(1);
    setReduced(true);
    expect(result.current.playing).toBe(false);
    beat();
    expect(result.current.step).toBe(1);
    setReduced(false);
    beat();
    expect(result.current.step).toBe(1);
  });

  it("disconnects observers, media listeners, and the clock on unmount", () => {
    const { unmount, onBeat } = setup();
    setVisible(1);
    expect(motionListeners.size).toBe(1);
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(motionListeners.size).toBe(0);
    beat();
    expect(onBeat).not.toHaveBeenCalled();
  });
});
