/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useKafkaAutoplay, KafkaPlaybackControls } from "./useKafkaAutoplay";

let intersection: IntersectionObserverCallback;
let motionChange: () => void;
let reduced = false;
let hidden = false;
const step = vi.fn();
const reset = vi.fn();
const disconnect = vi.fn();

function Lesson({ ready = true }: { ready?: boolean }) {
  const playback = useKafkaAutoplay({
    steps: 3,
    onStep: step,
    onReset: reset,
    intervalMs: 2000,
  });
  return (
    <>
      <div ref={playback.stageRef}>Stage</div>
      <KafkaPlaybackControls playback={playback} />
      <button onClick={playback.pause}>Manual action</button>
      <button onClick={() => playback.setReady(ready)}>Set readiness</button>
    </>
  );
}
function enter(visible: boolean) {
  act(() =>
    intersection(
      [
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
}
function tick(ms = 2000) {
  act(() => vi.advanceTimersByTime(ms));
}

beforeEach(() => {
  vi.useFakeTimers();
  reduced = hidden = false;
  step.mockClear();
  reset.mockClear();
  disconnect.mockClear();
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, cb: () => void) => {
      motionChange = cb;
    },
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        intersection = cb;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("waits for visibility, advances at a readable pace, then settles without looping", () => {
  render(<Lesson />);
  tick(10000);
  expect(step).not.toHaveBeenCalled();
  enter(true);
  tick(1999);
  expect(step).not.toHaveBeenCalled();
  tick(1);
  expect(step).toHaveBeenLastCalledWith(1);
  tick();
  tick();
  tick(10000);
  expect(step.mock.calls).toEqual([[1], [2], [3]]);
  expect(screen.getByText("Complete")).toBeTruthy();
});

it("suspends offscreen and hidden without catching up skipped time", () => {
  render(<Lesson />);
  enter(true);
  tick();
  enter(false);
  tick(10000);
  expect(step).toHaveBeenCalledTimes(1);
  enter(true);
  tick();
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  tick(10000);
  expect(step).toHaveBeenCalledTimes(2);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  tick();
  expect(step).toHaveBeenLastCalledWith(3);
});

it("keeps a reader's Pause across leaving and reentering the viewport", () => {
  render(<Lesson />);
  enter(true);
  tick();
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  enter(false);
  enter(true);
  tick(10000);
  expect(step).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  tick();
  expect(step).toHaveBeenLastCalledWith(2);
  expect(reset).not.toHaveBeenCalled();
});

it("lets manual actions take over and starts a fresh lesson only on Play", () => {
  render(<Lesson />);
  enter(true);
  tick();
  fireEvent.click(screen.getByRole("button", { name: "Manual action" }));
  tick(10000);
  expect(step).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(reset).toHaveBeenCalledTimes(1);
  tick();
  expect(step).toHaveBeenLastCalledWith(1);
});

it("uses explicit steps for reduced motion, including after a preference change", () => {
  reduced = true;
  render(<Lesson />);
  enter(true);
  tick(10000);
  expect(step).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(step).toHaveBeenLastCalledWith(1);
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  tick(10000);
  expect(reset).toHaveBeenCalledTimes(1);
  expect(step).toHaveBeenCalledTimes(1);
  reduced = false;
  act(() => motionChange());
  tick();
  expect(step).toHaveBeenLastCalledWith(1);
  reduced = true;
  act(() => motionChange());
  tick(10000);
  expect(step).toHaveBeenCalledTimes(2);
});

it("waits for readiness and cancels timers and observation on unmount", () => {
  const { unmount } = render(<Lesson ready={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Set readiness" }));
  enter(true);
  tick(10000);
  expect(step).not.toHaveBeenCalled();
  unmount();
  tick(10000);
  expect(disconnect).toHaveBeenCalled();
  expect(step).not.toHaveBeenCalled();
});

it("Replay clears a pending beat and restarts at the first step", () => {
  render(<Lesson />);
  enter(true);
  tick();
  tick(1000);
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  tick(1000);
  expect(step).toHaveBeenCalledTimes(1);
  tick(1000);
  expect(step.mock.calls).toEqual([[1], [1]]);
});

it("names the restart explicitly after reduced-motion manual exploration", () => {
  reduced = true;
  render(<Lesson />);
  enter(true);
  fireEvent.click(screen.getByRole("button", { name: "Manual action" }));
  fireEvent.click(screen.getByRole("button", { name: "Restart steps" }));
  expect(reset).toHaveBeenCalledTimes(1);
  expect(step).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(step).toHaveBeenLastCalledWith(1);
  tick(10000);
  expect(step).toHaveBeenCalledTimes(1);
});
