/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render } from "@testing-library/react";
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
it("pauses offscreen, steps through the miss, and restores empty RAM on replay", () => {
  const { view, visible, advance } = setup();
  advance(3000);
  expect(view.getByRole("status").textContent).toBe("Read 1 → P1");
  visible(true);
  advance(2200);
  expect(view.getByRole("status").textContent).toBe("Read 2 → P2");
  fireEvent.click(view.getByRole("button", { name: "Pause" }));
  const paused = view.getByRole("status").textContent;
  advance(3000);
  expect(view.getByRole("status").textContent).toBe(paused);
  fireEvent.click(view.getByRole("button", { name: "Replay" }));
  fireEvent.click(view.getByRole("button", { name: "Pause" }));
  for (let i = 0; i < 14; i++)
    fireEvent.click(view.getByRole("button", { name: "Step" }));
  expect(view.getByRole("status").textContent).toBe("Copy P4 into RAM");
  expect(
    view.container
      .querySelector('[data-page="P4"]')
      ?.getAttribute("data-cached"),
  ).toBe("false");
  fireEvent.click(view.getByRole("button", { name: "Step" }));
  expect(
    view.container
      .querySelector('[data-page="P4"]')
      ?.getAttribute("data-cached"),
  ).toBe("true");
  fireEvent.click(view.getByRole("button", { name: "Replay" }));
  expect(
    view.container
      .querySelector('[data-page="P4"]')
      ?.getAttribute("data-cached"),
  ).toBe("false");
  visible(false);
  advance(4000);
  expect(view.getByRole("status").textContent).toBe("Read 1 → P1");
});
it("settles under reduced motion and permits discrete steps after replay", () => {
  const { view } = setup(true);
  expect(view.getByRole("status").textContent).toBe(
    "Read once from SSD. Reuse from RAM.",
  );
  expect(view.container.querySelector(".big-db-reuse-packet")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Replay" }));
  fireEvent.click(view.getByRole("button", { name: "Step" }));
  expect(view.getByRole("status").textContent).toBe("Hit · return from P1");
});

it("suspends playback while the document is hidden and resumes without catching up", () => {
  const { view, visible, advance } = setup();
  let hidden = false;
  const visibility = vi
    .spyOn(document, "hidden", "get")
    .mockImplementation(() => hidden);
  visible(true);
  advance(1200);
  const before = view.getByRole("status").textContent;
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(5000);
  expect(view.getByRole("status").textContent).toBe(before);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(1100);
  expect(view.getByRole("status").textContent).toBe("Read 2 → P2");
  visibility.mockRestore();
});
