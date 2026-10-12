/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftLogConflictFigure } from "./RaftLogConflictFigure";
import { conflictLesson } from "~/demos/raft-log-conflicts/model";

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

it("keeps refused logs intact, then exposes the removed suffix in a complete manual walkthrough", () => {
  reduced = true;
  render(<RaftLogConflictFigure />);
  visible();
  const b = () =>
    document.querySelector('.log-conflict-server[data-server="B"]')!;
  const old4 = () => b().querySelector('[data-index="4"]')!;
  const old5 = () => b().querySelector('[data-index="5"]')!;
  expect(old4().getAttribute("data-term")).toBe("5");
  click("Next");
  click("Next");
  expect(old5().getAttribute("data-present")).toBe("true");
  expect(old4().getAttribute("data-term")).toBe("5");
  click("Next");
  expect(b().textContent).toContain("Persisting replacement");
  click("Next");
  expect(old4().getAttribute("data-deleted")).toBe("true");
  expect(old5().getAttribute("data-deleted")).toBe("true");
  expect(old4().textContent).toContain("Deleted");
  expect(b().querySelector('[data-index="3"]')?.textContent).toContain("Kept");
  expect(
    b().querySelector('[data-index="3"]')?.getAttribute("data-committed"),
  ).toBe("true");
  click("Next");
  expect(old4().getAttribute("data-term")).toBe("7");
  expect(old4().getAttribute("data-replacement")).toBe("true");
  expect(old4().textContent).toContain("From A");
  expect(b().querySelector('[data-index="3"]')?.textContent).toContain("Kept");
  expect(old4().getAttribute("data-committed")).toBe("true");
  expect(old5().getAttribute("data-present")).toBe("false");
  click("Next");
  click("Next");
  expect(stage().getAttribute("data-playback")).toBe("complete");
  expect(disabled("Next")).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("x = 16");
  expect(document.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
  click("Back");
  expect(stage().getAttribute("data-step")).toBe("6");
  click("Replay");
  expect(stage().getAttribute("data-step")).toBe("0");
  expect(stage().getAttribute("data-playback")).toBe("paused");
});
it("pauses moving payloads and visibility work, then stops at the settled result", () => {
  render(<RaftLogConflictFigure />);
  visible();
  const lesson = conflictLesson();
  advance(lesson.check.start + 500);
  const packet = document.querySelector(".leader-recovery-packet")!;
  expect(packet).not.toBeNull();
  const first = packet.getAttribute("transform");
  advance(200);
  expect(
    document
      .querySelector(".leader-recovery-packet")
      ?.getAttribute("transform"),
  ).not.toBe(first);
  click("Pause");
  advance(10000);
  expect(stage().getAttribute("data-step")).toBe("1");
  expect(document.querySelector(".leader-recovery-packet")).toBeNull();
  click("Play");
  visible(false);
  advance(10000);
  expect(stage().getAttribute("data-step")).toBe("1");
  visible();
  advance(lesson.duration);
  expect(stage().getAttribute("data-playback")).toBe("complete");
  advance(10000);
  expect(stage().getAttribute("data-step")).toBe("7");
  click("Replay");
  expect(stage().getAttribute("data-playback")).toBe("playing");
});

it("moves only the suffix and replacement, and freezes both when paused", () => {
  render(<RaftLogConflictFigure />);
  visible();
  const lesson = conflictLesson();
  const prefix = document.querySelector(
    '.log-conflict-server[data-server="B"] [data-index="3"]',
  )!;
  const prefixTransform = prefix.getAttribute("transform");
  advance(lesson.deletingAt + 650);
  const removed = () =>
    document.querySelector(
      '.log-conflict-server[data-server="B"] [data-index="4"] .log-conflict-cell-content',
    )!;
  const before = removed().getAttribute("transform");
  advance(300);
  expect(removed().getAttribute("transform")).not.toBe(before);
  expect(prefix.getAttribute("transform")).toBe(prefixTransform);
  expect(
    prefix
      .querySelector(".log-conflict-cell-content")
      ?.getAttribute("transform"),
  ).toBeNull();
  click("Pause");
  const paused = removed().getAttribute("transform");
  advance(10000);
  expect(removed().getAttribute("transform")).toBe(paused);
  click("Next");
  click("Play");
  advance(lesson.replacementAt - lesson.deletedAt + 600);
  const moving = () =>
    document.querySelector('[data-moving-replacement="true"]')!;
  expect(moving()).not.toBeNull();
  const ahead = () =>
    document.querySelector(".log-conflict-replacement-route")!;
  const pathBefore = ahead().getAttribute("d");
  const from = moving().getAttribute("transform");
  advance(300);
  expect(moving().getAttribute("transform")).not.toBe(from);
  expect(ahead().getAttribute("d")).not.toBe(pathBefore);
  const [x, y] = moving()
    .getAttribute("transform")!
    .match(/[\d.]+/g)!
    .map(Number);
  expect(ahead().getAttribute("d")).toBe(
    `M${x + lesson.replacementBounds.width / 2} ${y}V${lesson.replacementBounds.toY}`,
  );
  expect(prefix.getAttribute("transform")).toBe(prefixTransform);
  click("Pause");
  const copyPaused = moving().getAttribute("transform");
  advance(10000);
  expect(moving().getAttribute("transform")).toBe(copyPaused);
  click("Next");
  expect(document.querySelector(".log-conflict-replacement-route")).toBeNull();
});
