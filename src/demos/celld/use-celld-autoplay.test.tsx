// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCelldAutoplay } from "./use-celld-autoplay";

let observers: Array<(visible: boolean) => void>;
let motionListeners: Set<() => void>;
let reduced: boolean;

function Example({ ready = true, blocked = false, total = 3 } = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const playback = useCelldAutoplay({
    stageRef,
    step,
    total,
    ready,
    blocked,
    durationMs: 4000,
    onStep: () => setStep((value) => Math.min(total, value + 1)),
    onReset: () => setStep(0),
  });
  return (
    <div ref={stageRef} data-testid="stage" data-state={playback.state}>
      <output>{step}</output>
      <button onClick={playback.toggle}>Toggle</button>
      <button onClick={playback.manualStep}>Step</button>
      <button onClick={playback.reset}>Reset</button>
      <button onClick={playback.replay}>Replay</button>
    </div>
  );
}

const time = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const visible = (value: boolean) =>
  act(() => observers.forEach((notify) => notify(value)));
const step = () => screen.getByRole("status").textContent;
const state = () => screen.getByTestId("stage").getAttribute("data-state");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  observers = [];
  motionListeners = new Set();
  reduced = false;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observers.push((value) =>
          callback(
            [
              { isIntersecting: value, intersectionRatio: value ? 0.75 : 0 },
            ] as IntersectionObserverEntry[],
            this as unknown as IntersectionObserver,
          ),
        );
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) =>
      motionListeners.add(callback),
    removeEventListener: (_: string, callback: () => void) =>
      motionListeners.delete(callback),
  }));
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("celld autoplay lifecycle", () => {
  it("waits for visibility and the first frame, then finishes without looping", () => {
    const { rerender } = render(<Example ready={false} />);
    visible(true);
    time(20000);
    expect(step()).toBe("0");
    expect(state()).toBe("waiting");
    rerender(<Example ready />);
    time(4000);
    expect(step()).toBe("1");
    time(4000);
    time(4000);
    expect(step()).toBe("3");
    expect(state()).toBe("complete");
    time(60000);
    expect(step()).toBe("3");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves the remaining hold while offscreen without catching up", () => {
    render(<Example />);
    visible(true);
    time(1000);
    visible(false);
    time(60000);
    expect(step()).toBe("0");
    visible(true);
    time(2999);
    expect(step()).toBe("0");
    time(1);
    expect(step()).toBe("1");
  });

  it("suspends in a hidden document while preserving manual pause", () => {
    render(<Example />);
    visible(true);
    time(1500);
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    time(60000);
    expect(step()).toBe("0");
    visibility.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    time(2500);
    expect(step()).toBe("1");
    fireEvent.click(screen.getByText("Toggle"));
    visible(false);
    visible(true);
    time(60000);
    expect(step()).toBe("1");
    expect(state()).toBe("paused");
  });

  it("pauses on manual input and explicitly replays from a fresh hold", () => {
    render(<Example />);
    visible(true);
    time(1000);
    fireEvent.click(screen.getByText("Step"));
    expect(step()).toBe("1");
    time(20000);
    expect(step()).toBe("1");
    fireEvent.click(screen.getByText("Replay"));
    expect(step()).toBe("0");
    time(3999);
    expect(step()).toBe("0");
    time(1);
    expect(step()).toBe("1");
    fireEvent.click(screen.getByText("Reset"));
    time(20000);
    expect(step()).toBe("0");
    expect(state()).toBe("paused");
  });

  it("keeps reduced motion manual and stops when the preference changes", () => {
    reduced = true;
    render(<Example />);
    visible(true);
    time(20000);
    expect(step()).toBe("0");
    expect(state()).toBe("reduced-motion");
    fireEvent.click(screen.getByText("Replay"));
    time(20000);
    expect(step()).toBe("0");
    fireEvent.click(screen.getByText("Step"));
    expect(step()).toBe("1");
    act(() => {
      reduced = false;
      motionListeners.forEach((notify) => notify());
    });
    time(20000);
    expect(step()).toBe("1");
    fireEvent.click(screen.getByText("Toggle"));
    time(1000);
    act(() => {
      reduced = true;
      motionListeners.forEach((notify) => notify());
    });
    time(20000);
    expect(step()).toBe("1");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels automatic callbacks at a blocked invariant and on unmount", () => {
    const { rerender, unmount } = render(<Example />);
    visible(true);
    time(1000);
    rerender(<Example blocked />);
    time(60000);
    expect(step()).toBe("0");
    expect(state()).toBe("blocked");
    expect(vi.getTimerCount()).toBe(0);
    rerender(<Example />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(motionListeners.size).toBe(0);
  });
});
