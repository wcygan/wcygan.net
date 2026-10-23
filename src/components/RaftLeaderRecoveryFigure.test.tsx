/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftLeaderRecoveryFigure } from "./RaftLeaderRecoveryFigure";
import {
  recoveryTime as time,
  duration,
  beats,
  messages,
} from "~/demos/raft-leader-recovery/model";

let reduced = false;
let intersection: IntersectionObserverCallback;
let motion: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(644);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) => {
      motion = callback;
    },
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
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  reduced = false;
});
const advance = (time: number) => act(() => vi.advanceTimersByTime(time));
const visible = (isIntersecting = true) =>
  act(() =>
    intersection(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const stage = () => document.querySelector("[data-playback]")!;
const disabled = (name: string) =>
  (screen.getByRole("button", { name }) as HTMLButtonElement).disabled;

it("lets readers follow B's heartbeats before follower timers reset", () => {
  render(<RaftLeaderRecoveryFigure />);
  visible();
  const message = messages[0];
  advance(message.start + 600);
  const packet = document.querySelector(".leader-recovery-packet")!;
  expect(packet).not.toBeNull();
  const before = packet.getAttribute("transform");
  advance(300);
  expect(
    document
      .querySelector(".leader-recovery-packet")
      ?.getAttribute("transform"),
  ).not.toBe(before);
  advance(message.end - message.start - 700);
  expect(document.querySelectorAll(".leader-recovery-packet")).toHaveLength(1);
  expect(
    Number(
      document
        .querySelector('[data-server="A"] .leader-recovery-timer')
        ?.getAttribute("data-progress"),
    ),
  ).toBeLessThan(0.1);
});

it("waits for visibility, suspends without background catch-up, and respects pause", () => {
  render(<RaftLeaderRecoveryFigure />);
  advance(10000);
  expect(stage().getAttribute("data-step")).toBe("0");
  visible();
  advance(time(4100));
  expect(stage().getAttribute("data-step")).toBe("1");
  visible(false);
  advance(20000);
  expect(stage().getAttribute("data-step")).toBe("1");
  visible();
  advance(time(8100) - time(4100) + 200);
  expect(stage().getAttribute("data-step")).toBe("2");
  click("Pause");
  advance(10000);
  expect(stage().getAttribute("data-step")).toBe("2");
  visible(false);
  visible();
  expect(stage().getAttribute("data-playback")).toBe("paused");
});
it("suspends while the document is hidden", () => {
  render(<RaftLeaderRecoveryFigure />);
  visible();
  advance(time(4100));
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(10000);
  expect(stage().getAttribute("data-step")).toBe("1");
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(time(8100) - time(4100) + 200);
  expect(stage().getAttribute("data-step")).toBe("2");
});
it("offers settled manual steps, Back, and a Replay that resumes playback", () => {
  render(<RaftLeaderRecoveryFigure />);
  visible();
  expect(disabled("Back")).toBe(true);
  for (let step = 0; step < 4; step++) click("Next");
  expect(stage().getAttribute("data-playback")).toBe("paused");
  expect(
    document.querySelector('[data-server="A"]')?.getAttribute("data-role"),
  ).toBe("Leader");
  click("Back");
  expect(screen.getByRole("status").textContent).toContain("A refuses");
  click("Replay");
  expect(stage().getAttribute("data-step")).toBe("0");
  expect(stage().getAttribute("data-playback")).toBe("playing");
  expect(
    document.querySelectorAll('[data-graphic-stage="padded"]'),
  ).toHaveLength(1);
});

it("keeps each timer tied to its node role and freezes it with playback", () => {
  render(<RaftLeaderRecoveryFigure />);
  visible();
  advance(time(6000));
  const a = document.querySelector('[data-server="A"] .leader-recovery-timer')!;
  expect(a.textContent).toContain("Election timeout");
  expect(
    document.querySelector('[data-server="B"] .leader-recovery-timer')
      ?.textContent,
  ).toBe("Timer stopped");
  click("Pause");
  const progress = a.getAttribute("data-progress");
  advance(10000);
  expect(a.getAttribute("data-progress")).toBe(progress);
  for (let index = 0; index < 3; index++) click("Next");
  expect(
    document.querySelector('[data-server="A"] .leader-recovery-timer')
      ?.textContent,
  ).toContain("Heartbeat interval");
});
it("stops in a persistent final state and restarts only with Replay", () => {
  render(<RaftLeaderRecoveryFigure />);
  visible();
  advance(duration + 1000);
  expect(stage().getAttribute("data-playback")).toBe("complete");
  expect(screen.getByRole("status").textContent).toContain(
    "Committed entries survived",
  );
  expect(disabled("Next")).toBe(true);
  expect(disabled("Play")).toBe(true);
  advance(50000);
  expect(stage().getAttribute("data-step")).toBe("9");
  click("Replay");
  expect(stage().getAttribute("data-step")).toBe("0");
});
it("preserves the whole lesson without motion, including a changed motion preference", () => {
  render(<RaftLeaderRecoveryFigure />);
  visible();
  advance(time(8500));
  expect(document.querySelector(".leader-recovery-packet")).not.toBeNull();
  reduced = true;
  act(() => motion());
  expect(disabled("Play")).toBe(true);
  expect(document.querySelector(".leader-recovery-packet")).toBeNull();
  click("Replay");
  expect(stage().getAttribute("data-playback")).toBe("paused");
  for (let step = 0; step < 9; step++) click("Next");
  for (const node of document.querySelectorAll(".leader-recovery-server"))
    expect(node.getAttribute("data-commit")).toBe("5");
  expect(screen.getByRole("status").textContent).toContain("x = 18");
});

it("distinguishes a durable majority from the leader’s confirmation", () => {
  render(<RaftLeaderRecoveryFigure />);
  visible();
  advance(time(24500));
  expect(screen.getByRole("status").textContent).toContain(
    "has not yet confirmed commitment of #5",
  );
  expect(
    document.querySelector('[data-server="A"]')?.getAttribute("data-stored"),
  ).toBe("5");
  expect(
    document.querySelector('[data-server="C"]')?.getAttribute("data-stored"),
  ).toBe("5");
  expect(
    document.querySelector('[data-server="A"]')?.getAttribute("data-commit"),
  ).toBe("4");
});
