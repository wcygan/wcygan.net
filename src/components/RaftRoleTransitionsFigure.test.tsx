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

const role = () =>
  document
    .querySelector('.raft-roles-node-active[data-active="true"]')
    ?.previousElementSibling?.getAttribute("data-role");
const advance = (time: number) => act(() => vi.advanceTimersByTime(time));
it.each(["rival", "candidateTerm", "leaderTerm"] as const)(
  "%s follows the leader and updates its term at packet arrival, before the marker",
  (scenario) => {
    render(<RaftRoleTransitionsFigure />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: scenario },
    });
    const phases = scenarios[scenario].phases;
    const incomingIndex = phases.findIndex((phase) => phase.message);
    const starts = phases
      .slice(0, incomingIndex)
      .reduce(
        (total, phase, index) =>
          total + phase.duration + (phase.edge && index > 0 ? 900 : 0),
        0,
      );
    visible();
    advance(starts + 1400); // rAF starts at 50ms, so the packet is still in flight.
    expect(role()).toBe(phases[incomingIndex].role);
    advance(100);
    expect(role()).toBe("Follower");
    expect(screen.getByRole("status").textContent).toContain(
      `Role: Follower · Term: ${phases[incomingIndex].message!.term}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    advance(10000);
    expect(role()).toBe("Follower");
    expect(document.querySelector(".raft-roles-transition-marker")).toBeNull();
  },
);
it("becomes leader on the third vote, including a settled manual checkpoint", () => {
  render(<RaftRoleTransitionsFigure />);
  visible();
  const beforeThird = scenarios.win.phases
    .slice(0, 3)
    .reduce(
      (total, phase, index) =>
        total + phase.duration + (phase.edge && index > 0 ? 900 : 0),
      0,
    );
  advance(beforeThird + 1400);
  expect(role()).toBe("Candidate");
  advance(100);
  expect(role()).toBe("Leader");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(role()).toBe("Leader");
});
it.each(["candidateTerm", "leaderTerm"] as const)(
  "%s exposes the updated role and term at the received reduced-motion step",
  (scenario) => {
    reduced = true;
    render(<RaftRoleTransitionsFigure />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: scenario },
    });
    const incoming = scenarios[scenario].phases.findIndex(
      (phase) => phase.message,
    );
    for (let i = 0; i < incoming; i++)
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(role()).toBe("Follower");
    expect(screen.getByRole("status").textContent).toContain(
      "Role: Follower · Term: 6",
    );
    expect(document.querySelector(".raft-roles-incoming")).toBeNull();
  },
);
it.each(["split", "unreachable"] as const)(
  "%s settles before expiry and advances to a fresh term on the retry step",
  (scenario) => {
    reduced = true;
    render(<RaftRoleTransitionsFigure />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: scenario },
    });
    for (let i = 0; i < 3; i++)
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(role()).toBe("Candidate");
    expect(screen.getByRole("status").textContent).toContain("Term: 5");
    const active = document.querySelector(
      '.raft-roles-node-active[data-active="true"]',
    )!;
    const timer = active
      .parentElement!.querySelector(".raft-roles-timer-fill")!
      .parentElement!.getAttribute("transform")!;
    expect(Number(timer.split("scale(")[1].split(" ")[0])).toBeLessThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("status").textContent).toContain("Term: 6");
  },
);

it.each(Object.keys(scenarios) as Scenario[])(
  "finishes the %s scenario and preserves Replay, Pause, and offscreen suspension",
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
    act(() => vi.advanceTimersByTime(cycle));
    expect(screen.getByRole("status").textContent).toContain(
      phases.at(-1)!.event,
    );
    expect(
      document.querySelector("[data-playback]")?.getAttribute("data-playback"),
    ).toBe("complete");
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(screen.getByRole("status").textContent).toContain(phases[0].event);
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
