/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { scenarios, type Scenario } from "~/demos/raft-roles/model";
import { RaftRoleTransitionsFigure } from "./RaftRoleTransitionsFigure";

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
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 50),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  Object.defineProperties(SVGElement.prototype, {
    getTotalLength: { configurable: true, value: () => 100 },
    getPointAtLength: { configurable: true, value: () => ({ x: 0, y: 0 }) },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (SVGElement.prototype as unknown as Record<string, unknown>)
    .getTotalLength;
  delete (SVGElement.prototype as unknown as Record<string, unknown>)
    .getPointAtLength;
  reduced = false;
});
const visible = (isIntersecting = true) =>
  act(() =>
    intersection(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );

it.each(Object.keys(scenarios) as Scenario[])(
  "loops the %s scenario while preserving Pause and offscreen suspension",
  (scenario) => {
    render(<RaftRoleTransitionsFigure />);
    fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
      target: { value: scenario },
    });
    const phases = scenarios[scenario].phases;
    const cycle = phases.reduce(
      (total, phase, index) =>
        total + phase.duration + (phase.edge && index > 0 ? 900 : 0),
      0,
    );
    act(() => vi.advanceTimersByTime(cycle + 100));
    expect(screen.getByRole("status").textContent).toContain(phases[0].event);
    visible();
    act(() => vi.advanceTimersByTime(cycle - 100));
    expect(screen.getByRole("status").textContent).toContain(
      phases.at(-1)!.event,
    );
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole("status").textContent).toContain(phases[0].event);
    expect(
      document.querySelector("[data-playback]")?.getAttribute("data-playback"),
    ).toBe("playing");
    visible(false);
    act(() => vi.advanceTimersByTime(cycle));
    expect(screen.getByRole("status").textContent).toContain(phases[0].event);
    visible();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(cycle));
    expect(screen.getByRole("status").textContent).toContain(phases[0].event);
  },
);

it("keeps the final state inspectable with reduced motion", () => {
  reduced = true;
  render(<RaftRoleTransitionsFigure />);
  visible();
  for (let index = 1; index < scenarios.win.phases.length; index++) {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  }
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByRole("status").textContent).toContain(
    scenarios.win.phases.at(-1)!.event,
  );
  expect(
    (screen.getByRole("button", { name: "Play" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    document.querySelector("[data-playback]")?.getAttribute("data-playback"),
  ).toBe("complete");
});
