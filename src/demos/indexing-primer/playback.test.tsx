/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useCallback, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INDEXING_LOOP_PAUSE_MS,
  INDEXING_TRANSITION_MS,
  useIndexingPlayback,
} from "./playback";

let observers: MockIntersectionObserver[] = [];
let reducedMotion = false;
const motionListeners = new Set<(event: MediaQueryListEvent) => void>();

class MockIntersectionObserver {
  target?: Element;
  constructor(private callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  disconnect() {
    this.target = undefined;
  }
  show(visibleHeight: number) {
    if (!this.target) return;
    this.callback(
      [
        {
          target: this.target,
          isIntersecting: visibleHeight > 0,
          intersectionRatio: visibleHeight / 500,
          boundingClientRect: { height: 500 },
          intersectionRect: { height: visibleHeight },
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function Harness({ transitionMs }: { transitionMs?: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const onStep = useCallback(
    () => setStep((value) => Math.min(value + 1, 3)),
    [],
  );
  const onReset = useCallback(() => setStep(0), []);
  const playback = useIndexingPlayback({
    stageRef,
    step,
    lastStep: 3,
    onStep,
    onReset,
    transitionMs,
  });
  return (
    <>
      <div ref={stageRef} data-testid="stage" />
      <output data-testid="step">{step}</output>
      <output data-testid="progress">{playback.progress}</output>
      <output data-testid="reset-progress">
        {String(playback.resetProgress)}
      </output>
      <output data-testid="active">{String(playback.active)}</output>
      <output data-testid="playing">{String(playback.playing)}</output>
      <output data-testid="reduced">{String(playback.reducedMotion)}</output>
      <button onClick={playback.pause}>Pause</button>
      <button onClick={playback.toggle}>Toggle</button>
      <button onClick={playback.manualStep}>Next</button>
    </>
  );
}

function advance(milliseconds: number) {
  act(() => vi.advanceTimersByTime(milliseconds));
}

function visible(height = 500) {
  act(() => observers.forEach((observer) => observer.show(height)));
}

function hidden(value: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value,
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}

function motion(value: boolean) {
  reducedMotion = value;
  act(() =>
    motionListeners.forEach((listener) =>
      listener({ matches: value } as MediaQueryListEvent),
    ),
  );
}

function progress() {
  return Number(screen.getByTestId("progress").textContent);
}

function resetProgress() {
  const value = screen.getByTestId("reset-progress").textContent;
  return value === "null" ? null : Number(value);
}

function expectStep(value: number) {
  expect(screen.getByTestId("step").textContent).toBe(String(value));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 10),
  );
  vi.stubGlobal("cancelAnimationFrame", (request: number) =>
    window.clearTimeout(request),
  );
  observers = [];
  motionListeners.clear();
  reducedMotion = false;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reducedMotion;
    },
    addEventListener(
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) {
      motionListeners.add(listener);
    },
    removeEventListener(
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) {
      motionListeners.delete(listener);
    },
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "hidden");
});

function finishCycle() {
  for (let step = 1; step <= 3; step++) {
    advance(INDEXING_TRANSITION_MS);
    expectStep(step);
    expect(progress()).toBe(0);
  }
}

describe("indexing autoplay", () => {
  it("starts immediately, holds the final result for four seconds, and repeats", () => {
    render(<Harness />);
    visible();
    expect(screen.getByTestId("active").textContent).toBe("true");
    expectStep(0);
    expect(progress()).toBe(0);
    advance(10);
    expect(progress()).toBeGreaterThan(0);
    advance(INDEXING_TRANSITION_MS / 2 - 10);
    expectStep(0);
    expect(progress()).toBeCloseTo(0.5);
    advance(INDEXING_TRANSITION_MS / 2);
    expectStep(1);
    expect(progress()).toBe(0);
    advance(10);
    expect(progress()).toBeGreaterThan(0);
    advance(INDEXING_TRANSITION_MS - 10);
    expectStep(2);
    advance(INDEXING_TRANSITION_MS);
    expectStep(3);
    expect(progress()).toBe(0);
    expect(resetProgress()).toBe(0);
    expect(screen.getByTestId("playing").textContent).toBe("true");
    expect(screen.getByTestId("active").textContent).toBe("true");
    expect(vi.getTimerCount()).toBe(1);
    advance(INDEXING_LOOP_PAUSE_MS - 1);
    expectStep(3);
    expect(progress()).toBe(0);
    advance(1);
    expectStep(0);
    expect(progress()).toBe(0);
    expect(resetProgress()).toBeNull();
    advance(10);
    expect(progress()).toBeGreaterThan(0);
  });

  it("keeps both completed results visible for the same pause across two cycles", () => {
    render(<Harness />);
    visible();
    for (let cycle = 0; cycle < 2; cycle++) {
      finishCycle();
      advance(INDEXING_LOOP_PAUSE_MS - 1);
      expectStep(3);
      expect(progress()).toBe(0);
      advance(1);
      expectStep(0);
      expect(progress()).toBe(0);
    }
  });

  it("drives the visible reset countdown from the same active clock", () => {
    render(<Harness />);
    visible();
    expect(resetProgress()).toBeNull();
    finishCycle();
    expect(resetProgress()).toBe(0);
    advance(1000);
    expect(resetProgress()).toBeCloseTo(0.25);
    expect(progress()).toBe(0);
    advance(1000);
    expect(resetProgress()).toBeCloseTo(0.5);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    advance(10_000);
    expect(resetProgress()).toBeCloseTo(0.5);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(1000);
    expect(resetProgress()).toBeCloseTo(0.75);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(0);
    expect(resetProgress()).toBeNull();
  });

  it("uses the requested transition duration from its first frame", () => {
    render(<Harness transitionMs={3600} />);
    visible();
    advance(10);
    expect(progress()).toBeGreaterThan(0);
    advance(1790);
    expectStep(0);
    expect(progress()).toBeCloseTo(0.5);
    advance(1800);
    expectStep(1);
    expect(progress()).toBe(0);
  });

  it("removes the reset countdown when reduced motion is enabled during the hold", () => {
    render(<Harness />);
    visible();
    finishCycle();
    advance(2000);
    expect(resetProgress()).toBeCloseTo(0.5);
    motion(true);
    expect(resetProgress()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    advance(10_000);
    expectStep(3);
    motion(false);
    expect(resetProgress()).toBe(0);
    advance(10_000);
    expectStep(3);
    expect(resetProgress()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(0);
    expect(resetProgress()).toBeNull();
  });

  it("waits for meaningful visibility and preserves the flight offscreen", () => {
    render(<Harness />);
    visible(100);
    advance(10_000);
    expectStep(0);
    expect(progress()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    visible(180);
    advance(INDEXING_TRANSITION_MS / 4);
    expect(progress()).toBeCloseTo(0.25);
    visible(0);
    advance(10_000);
    expectStep(0);
    expect(progress()).toBeCloseTo(0.25);
    visible();
    advance(INDEXING_TRANSITION_MS / 4);
    expectStep(0);
    expect(progress()).toBeCloseTo(0.5);
    visible(0);
    advance(10_000);
    expect(progress()).toBeCloseTo(0.5);
    expectStep(0);
    expect(vi.getTimerCount()).toBe(0);
    visible();
    advance(INDEXING_TRANSITION_MS / 2);
    expectStep(1);
    expect(progress()).toBe(0);
  });

  it("freezes a moving lookup while hidden or paused and resumes without catch-up", () => {
    render(<Harness />);
    visible();
    advance(INDEXING_TRANSITION_MS / 4);
    expect(progress()).toBeCloseTo(0.25);
    hidden(true);
    advance(10_000);
    expectStep(0);
    expect(progress()).toBeCloseTo(0.25);
    expect(vi.getTimerCount()).toBe(0);
    hidden(false);
    advance(INDEXING_TRANSITION_MS / 4);
    expect(progress()).toBeCloseTo(0.5);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    advance(10_000);
    expectStep(0);
    expect(progress()).toBeCloseTo(0.5);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(INDEXING_TRANSITION_MS / 2);
    expectStep(1);
    expect(progress()).toBe(0);
  });

  it.each(["paused", "hidden", "offscreen"])(
    "preserves the remaining four-second result hold while %s",
    (mode) => {
      render(<Harness />);
      visible();
      finishCycle();
      advance(1500);
      expect(resetProgress()).toBeCloseTo(0.375);
      if (mode === "paused")
        fireEvent.click(screen.getByRole("button", { name: "Pause" }));
      else if (mode === "hidden") hidden(true);
      else visible(0);
      advance(10_000);
      expectStep(3);
      expect(progress()).toBe(0);
      expect(resetProgress()).toBeCloseTo(0.375);
      expect(vi.getTimerCount()).toBe(0);
      if (mode === "paused")
        fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
      else if (mode === "hidden") hidden(false);
      else visible();
      advance(INDEXING_LOOP_PAUSE_MS - 1501);
      expectStep(3);
      advance(1);
      expectStep(0);
      expect(progress()).toBe(0);
    },
  );

  it("manual steps settle immediately and wrap the last result without resuming", () => {
    render(<Harness />);
    visible();
    advance(INDEXING_TRANSITION_MS / 2);
    expect(progress()).toBeCloseTo(0.5);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(1);
    expect(progress()).toBe(0);
    expect(screen.getByTestId("active").textContent).toBe("false");
    advance(10_000);
    expectStep(1);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(2);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(3);
    expect(resetProgress()).toBe(0);
    advance(10_000);
    expectStep(3);
    expect(resetProgress()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(0);
    expect(progress()).toBe(0);
    expect(screen.getByTestId("active").textContent).toBe("false");
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(10);
    expect(progress()).toBeGreaterThan(0);
  });

  it("keeps reduced motion manual through the final result and its wrap", () => {
    reducedMotion = true;
    render(<Harness />);
    visible();
    expect(screen.getByTestId("reduced").textContent).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(60_000);
    expectStep(0);
    expect(progress()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    for (let step = 1; step <= 3; step++) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expectStep(step);
      advance(10_000);
      expectStep(step);
      expect(progress()).toBe(0);
      expect(resetProgress()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    }
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(0);
    motion(false);
    advance(10_000);
    expectStep(0);
    expect(progress()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(INDEXING_TRANSITION_MS / 2);
    expect(progress()).toBeCloseTo(0.5);
    motion(true);
    expect(screen.getByTestId("active").textContent).toBe("false");
    expectStep(0);
    expect(progress()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["flight", "hold"])(
    "removes frames, timers, observers, and motion listeners during %s",
    (phase) => {
      const view = render(<Harness />);
      visible();
      if (phase === "hold") finishCycle();
      else advance(500);
      expect(vi.getTimerCount()).toBe(1);
      expect(motionListeners.size).toBe(1);
      view.unmount();
      expect(vi.getTimerCount()).toBe(0);
      expect(observers.every((observer) => !observer.target)).toBe(true);
      expect(motionListeners.size).toBe(0);
      advance(10_000);
    },
  );
});
