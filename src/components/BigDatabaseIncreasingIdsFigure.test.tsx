/** @vitest-environment jsdom */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BigDatabaseIncreasingIdsFigure } from "./BigDatabaseFigures";

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
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) =>
    setTimeout(() => fn(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const view = render(<BigDatabaseIncreasingIdsFigure />);
  return {
    view,
    visible: (value: boolean) =>
      act(() => intersect([{ isIntersecting: value }])),
    advance: (ms: number) => act(() => vi.advanceTimersByTime(ms)),
  };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("animates only in view and highlights reached hot leaves", () => {
  const { view, visible, advance } = setup();
  const initial = view.container.querySelector("[data-tree-read]")!.outerHTML;
  advance(3000);
  expect(view.container.querySelector("[data-tree-read]")!.outerHTML).toBe(
    initial,
  );
  visible(true);
  advance(2200);
  expect(
    view.container.querySelectorAll('[data-found="true"]').length,
  ).toBeGreaterThan(0);
  expect(
    view.container.querySelectorAll('[data-temperature="0"][data-found="true"]')
      .length,
  ).toBe(0);
  visible(false);
  const paused = view.container.innerHTML;
  advance(5000);
  expect(view.container.innerHTML).toBe(paused);
});
it("preserves all three percentages and settled destinations under reduced motion", () => {
  const { view, visible, advance } = setup(true);
  visible(true);
  advance(5000);
  expect(view.container.querySelector("[data-tree-read]")).toBeNull();
  expect(view.container.querySelectorAll('[data-found="true"]')).toHaveLength(
    3,
  );
  for (const share of ["5%", "25%", "70%"])
    expect(view.getByText(share)).toBeTruthy();
});
