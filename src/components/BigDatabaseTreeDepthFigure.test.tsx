/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BigDatabaseTreeDepthFigure } from "./BigDatabaseTreeDepthFigure";
import { DEPTH_DURATION_MS } from "~/demos/big-database/tree-depth";

function setup(reduced = false) {
  vi.useFakeTimers();
  let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {};
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: typeof intersect) {
        intersect = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  const frames = vi.fn((fn: FrameRequestCallback) =>
    setTimeout(() => fn(performance.now()), 16),
  );
  vi.stubGlobal("requestAnimationFrame", frames);
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const view = render(<BigDatabaseTreeDepthFigure />);
  return {
    view,
    frames,
    visible: (value: boolean) =>
      act(() => intersect([{ isIntersecting: value }])),
    advance: (ms: number) => act(() => vi.advanceTimersByTime(ms)),
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("visits four pages, settles without an animation loop, and replays on request", () => {
  const { view, frames, visible, advance } = setup();
  const visited = () =>
    view.container.querySelectorAll('[data-level][data-visited="true"]');
  expect(visited()).toHaveLength(1);
  visible(true);
  advance(1_600);
  expect(visited()).toHaveLength(2);
  advance(DEPTH_DURATION_MS);
  expect(visited()).toHaveLength(4);
  expect(view.getByRole("status").textContent).toContain(
    "3 routing pages + 1 leaf",
  );
  expect(view.container.querySelector("[data-depth-request]")).toBeNull();
  const scheduled = frames.mock.calls.length;
  advance(DEPTH_DURATION_MS * 2);
  expect(frames.mock.calls.length).toBe(scheduled);
  fireEvent.click(view.getByRole("button", { name: "Replay tree depth" }));
  expect(visited()).toHaveLength(1);
  advance(1_600);
  expect(visited()).toHaveLength(2);
});

it("pauses offscreen and while the document is hidden without catching up", () => {
  const { view, visible, advance } = setup();
  let hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  advance(DEPTH_DURATION_MS);
  expect(view.getByRole("status").textContent).toContain("Level 1");
  visible(true);
  advance(1_600);
  visible(false);
  const before = view.container.innerHTML;
  advance(DEPTH_DURATION_MS);
  expect(view.container.innerHTML).toBe(before);
  visible(true);
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(DEPTH_DURATION_MS);
  expect(view.container.innerHTML).toBe(before);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(1_600);
  expect(view.getByRole("status").textContent).toContain("Level 3");
});

it("keeps the complete cached path visible under reduced motion", () => {
  const { view, frames, visible, advance } = setup(true);
  visible(true);
  advance(DEPTH_DURATION_MS * 2);
  expect(
    view.container.querySelectorAll('[data-level][data-visited="true"]'),
  ).toHaveLength(4);
  expect(
    view.container.querySelector('[data-hot="true"][data-visited="true"]'),
  ).toBeTruthy();
  expect(view.container.querySelector("[data-depth-request]")).toBeNull();
  expect(frames).not.toHaveBeenCalled();
  expect(view.getByRole("status").textContent).toBe(
    "4 levels visited: 3 routing pages + 1 leaf.",
  );
});
