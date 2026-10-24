/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftLeaderElectionFigure } from "./RaftLeaderElectionFigure";
import { RaftLogReplicationFigure } from "./RaftLogReplicationFigure";
import { RaftLeaderRecoveryFigure } from "./RaftLeaderRecoveryFigure";
import { RaftLogConflictFigure } from "./RaftLogConflictFigure";
let width = 644;
let resize: () => void;
let intersection: IntersectionObserverCallback;
beforeEach(() => {
  vi.useFakeTimers();
  width = 644;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    () => width,
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 50),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const components = [
  ["election", RaftLeaderElectionFigure],
  ["replication", RaftLogReplicationFigure],
  ["recovery", RaftLeaderRecoveryFigure],
  ["repair", RaftLogConflictFigure],
] as const;
const visible = () =>
  act(() =>
    intersection(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
it.each(components)(
  "%s preserves the current checkpoint and playback intent across a breakpoint",
  (_, Component) => {
    render(<Component />);
    visible();
    click("Next");
    click("Next");
    const progress = () =>
      document.querySelector('[role="group"] span')!.textContent;
    click("Play");
    act(() => vi.advanceTimersByTime(200));
    const before = progress();
    width = 342;
    act(() => resize());
    expect(progress()).toBe(before);
    expect(
      document.querySelector("[data-playback]")?.getAttribute("data-playback"),
    ).toBe("playing");
    expect(document.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    click("Pause");
    width = 644;
    act(() => resize());
    expect(progress()).toBe(before);
    expect(
      document.querySelector("[data-playback]")?.getAttribute("data-playback"),
    ).toBe("paused");
  },
);
it.each(components)(
  "%s suspends hidden-document work without jumping forward",
  (_, Component) => {
    render(<Component />);
    visible();
    act(() => vi.advanceTimersByTime(4500));
    const svg = () => document.querySelector("svg")!.innerHTML;
    const held = svg();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(60000));
    expect(svg()).toBe(held);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(5000));
    expect(svg()).not.toBe(held);
  },
);

it.each(components)(
  "%s presents the current state and announces only manual or paused changes",
  (name, Component) => {
    const states = {
      election: ["Waiting for a heartbeat", "B starts first"],
      replication: ["Empty logs", "B stores command #1"],
      recovery: ["Working majority", "Leader stops"],
      repair: [
        "A returning server has a conflicting suffix",
        "Check the preceding entry",
      ],
    } as const;
    render(<Component />);
    const status = screen.getByRole("status");
    const state = () => status.querySelector("p:not(.sr-only)")!;
    expect(state().textContent).toBe(states[name][0]);
    expect(status.getAttribute("aria-live")).toBe("polite");
    visible();
    expect(status.getAttribute("aria-live")).toBe("off");
    click("Next");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(state().textContent).toBe(states[name][1]);
  },
);
