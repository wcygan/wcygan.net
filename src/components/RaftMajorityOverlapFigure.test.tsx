/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftMajorityOverlapFigure } from "./RaftMajorityOverlapFigure";
import { overlapRound } from "~/demos/raft-majority-overlap/model";

let reduced = false;
let intersection: IntersectionObserverCallback;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
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
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  reduced = false;
});
const visible = (isIntersecting = true) =>
  act(() =>
    intersection(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
const round = () =>
  document.querySelector("[data-round]")?.getAttribute("data-round");

it("advances once per second, supports pausing and stepping, and loops after ten rounds", () => {
  render(<RaftMajorityOverlapFigure />);
  act(() => vi.advanceTimersByTime(5000));
  expect(round()).toBe("1");
  visible();
  act(() => vi.advanceTimersByTime(999));
  expect(round()).toBe("1");
  act(() => vi.advanceTimersByTime(1));
  expect(round()).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  act(() => vi.advanceTimersByTime(4000));
  expect(round()).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(round()).toBe("3");
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => vi.advanceTimersByTime(7000));
  expect(round()).toBe("10");
  expect(
    document.querySelector("[data-playback]")?.getAttribute("data-playback"),
  ).toBe("playing");
  act(() => vi.advanceTimersByTime(1000));
  expect(round()).toBe("1");
  expect(
    [...document.querySelectorAll('[data-previous="true"]')].map((node) =>
      node.getAttribute("data-server"),
    ),
  ).toEqual(["A", "C", "D"]);
  act(() => vi.advanceTimersByTime(1000));
  expect(round()).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(round()).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  act(() => vi.advanceTimersByTime(10000));
  expect(round()).toBe("1");
});

it("keeps both groups and the exact shared servers inspectable under reduced motion", () => {
  reduced = true;
  render(<RaftMajorityOverlapFigure />);
  visible();
  expect(
    (screen.getByRole("button", { name: "Play" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  act(() => vi.advanceTimersByTime(5000));
  expect(round()).toBe("1");
  for (let index = 0; index < 10; index++) {
    const { current, previous, shared } = overlapRound(index);
    const highlighted = (attribute: string) =>
      [...document.querySelectorAll(`[${attribute}="true"]`)].map((node) =>
        node.getAttribute("data-server"),
      );
    expect(highlighted("data-current")).toEqual(current);
    expect(highlighted("data-previous")).toEqual(previous);
    expect(highlighted("data-shared")).toEqual(shared);
    expect(document.querySelectorAll(".majority-overlap-node")).toHaveLength(5);
    expect(
      document.querySelectorAll(".majority-overlap-shared-ring"),
    ).toHaveLength(shared.length);
    expect(
      document.querySelectorAll(
        ".majority-overlap-previous-bound, .majority-overlap-current-bound",
      ),
    ).toHaveLength(2);
    if (index < 9)
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
  }
  expect(
    (screen.getByRole("button", { name: "Next" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

it("suspends offscreen and in hidden documents without catching up", () => {
  render(<RaftMajorityOverlapFigure />);
  visible();
  act(() => vi.advanceTimersByTime(1000));
  visible(false);
  act(() => vi.advanceTimersByTime(5000));
  expect(round()).toBe("2");
  visible();
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => vi.advanceTimersByTime(5000));
  expect(round()).toBe("2");
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => vi.advanceTimersByTime(1000));
  expect(round()).toBe("3");
});
