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
  INDEXING_BEAT_MS,
  INDEXING_INTRO_MS,
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

function Harness({ ready = true }: { ready?: boolean }) {
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
    ready,
  });
  return (
    <>
      <div ref={stageRef} data-testid="stage" />
      <output data-testid="step">{step}</output>
      <output data-testid="active">{String(playback.active)}</output>
      <output data-testid="complete">{String(playback.complete)}</output>
      <output data-testid="reduced">{String(playback.reducedMotion)}</output>
      <button onClick={playback.pause}>Pause</button>
      <button onClick={playback.toggle}>Toggle</button>
      <button onClick={playback.replay}>Replay</button>
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

function expectStep(value: number) {
  expect(screen.getByTestId("step").textContent).toBe(String(value));
}

beforeEach(() => {
  vi.useFakeTimers();
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

describe("indexing autoplay", () => {
  it("holds the opening frame, advances at a readable pace, and stops at the final state", () => {
    render(<Harness />);
    visible();
    expect(screen.getByTestId("active").textContent).toBe("true");
    advance(INDEXING_INTRO_MS - 1);
    expectStep(0);
    advance(1);
    expectStep(1);
    advance(INDEXING_BEAT_MS - 1);
    expectStep(1);
    advance(1);
    expectStep(2);
    advance(INDEXING_BEAT_MS);
    expectStep(3);
    expect(screen.getByTestId("complete").textContent).toBe("true");
    expect(screen.getByTestId("active").textContent).toBe("false");
    advance(INDEXING_BEAT_MS * 20);
    expectStep(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for a meaningful visible area and a ready renderer without spending the hold", () => {
    const view = render(<Harness ready={false} />);
    visible();
    advance(INDEXING_INTRO_MS * 2);
    expectStep(0);
    view.rerender(<Harness ready />);
    visible(100);
    advance(INDEXING_INTRO_MS * 2);
    expectStep(0);
    visible(180);
    advance(1000);
    visible(0);
    advance(INDEXING_INTRO_MS * 2);
    expectStep(0);
    visible();
    advance(INDEXING_INTRO_MS - 1001);
    expectStep(0);
    advance(1);
    expectStep(1);
    advance(1000);
    view.rerender(<Harness ready={false} />);
    advance(INDEXING_BEAT_MS * 2);
    expectStep(1);
    view.rerender(<Harness ready />);
    advance(INDEXING_BEAT_MS - 1001);
    expectStep(1);
    advance(1);
    expectStep(2);
  });

  it("preserves the remaining hold while the document is hidden or the reader pauses", () => {
    render(<Harness />);
    visible();
    advance(1100);
    hidden(true);
    advance(INDEXING_INTRO_MS * 2);
    expectStep(0);
    hidden(false);
    advance(INDEXING_INTRO_MS - 1101);
    expectStep(0);
    advance(1);
    expectStep(1);
    advance(1000);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    advance(INDEXING_BEAT_MS * 2);
    expectStep(1);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(INDEXING_BEAT_MS - 1001);
    expectStep(1);
    advance(1);
    expectStep(2);
  });

  it("pauses after a manual step and replays from a fresh opening hold", () => {
    render(<Harness />);
    visible();
    advance(1000);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(1);
    expect(screen.getByTestId("active").textContent).toBe("false");
    advance(INDEXING_BEAT_MS * 4);
    expectStep(1);
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expectStep(0);
    expect(screen.getByTestId("active").textContent).toBe("true");
    advance(INDEXING_INTRO_MS - 1);
    expectStep(0);
    advance(1);
    expectStep(1);
  });

  it("keeps reduced-motion playback manual, including replay and a changed preference", () => {
    reducedMotion = true;
    render(<Harness />);
    visible();
    expect(screen.getByTestId("reduced").textContent).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(INDEXING_INTRO_MS * 2);
    expectStep(0);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(1);
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    advance(INDEXING_INTRO_MS * 2);
    expectStep(0);
    motion(false);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    advance(INDEXING_INTRO_MS);
    expectStep(1);
    motion(true);
    expect(screen.getByTestId("active").textContent).toBe("false");
    advance(INDEXING_BEAT_MS * 2);
    expectStep(1);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expectStep(2);
  });

  it("removes timers, observers, and motion listeners when unmounted", () => {
    const view = render(<Harness />);
    visible();
    expect(vi.getTimerCount()).toBe(1);
    expect(motionListeners.size).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(observers.every((observer) => !observer.target)).toBe(true);
    expect(motionListeners.size).toBe(0);
  });
});
