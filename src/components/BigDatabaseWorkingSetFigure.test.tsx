/** @vitest-environment jsdom */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BigDatabaseWorkingSetFigure } from "./BigDatabaseWorkingSetFigure";

function setup(reduced = false) {
  vi.useFakeTimers();
  let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {};
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduced && query.includes("reduced-motion"),
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
  const view = render(<BigDatabaseWorkingSetFigure />);
  const visible = (value: boolean) =>
    act(() => intersect([{ isIntersecting: value }]));
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  return { view, visible, advance };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const packets = (view: ReturnType<typeof render>) =>
  Array.from(
    view.container.querySelectorAll("[data-request]"),
    (node) => node.outerHTML,
  );

it("runs continuously across cycle boundaries and suspends offscreen", () => {
  const { view, visible, advance } = setup();
  expect(view.queryByRole("button")).toBeNull();
  const initial = packets(view);
  advance(3000);
  expect(packets(view)).toEqual(initial);
  visible(true);
  advance(40000);
  expect(
    view.container.querySelectorAll("[data-request]").length,
  ).toBeGreaterThan(20);
  expect(
    Math.max(
      ...Array.from(view.container.querySelectorAll("[data-request]"), (node) =>
        Number(node.getAttribute("data-request")),
      ),
    ),
  ).toBeGreaterThan(600);
  visible(false);
  const before = packets(view);
  advance(5000);
  expect(packets(view)).toEqual(before);
});
it("preserves the explanation without moving packets under reduced motion", () => {
  const { view, visible, advance } = setup(true);
  visible(true);
  advance(40000);
  expect(view.getByRole("status").textContent).toBe(
    "99% from memory · 1% from disk",
  );
  expect(view.container.querySelector(".big-db-reuse-packet")).toBeNull();
  expect(view.getByText("100 GB · 99% hits")).toBeTruthy();
  expect(view.getByText("15 TB · 1% misses")).toBeTruthy();
});
it("suspends while the document is hidden and resumes without catching up", () => {
  const { view, visible, advance } = setup();
  let hidden = false;
  const visibility = vi
    .spyOn(document, "hidden", "get")
    .mockImplementation(() => hidden);
  visible(true);
  advance(1200);
  const before = packets(view);
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(5000);
  expect(packets(view)).toEqual(before);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(1100);
  expect(packets(view)).not.toEqual(before);
  visibility.mockRestore();
});
