/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftCurrentTermFigure } from "./RaftCurrentTermFigure";
import {
  frameDuration,
  flightsFor,
  playbackRate,
} from "~/demos/raft-current-term/transport";

let reduced = false;
let hidden = false;
let intersection: IntersectionObserverCallback;
let motionChange: () => void;
const observe = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_event: string, listener: () => void) => {
      motionChange = listener;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe = observe;
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  observe.mockClear();
  reduced = false;
  hidden = false;
});
const stage = () => document.querySelector("[data-graphic-stage]")!;
const advance = (duration: number) =>
  act(() => vi.advanceTimersByTime(duration / playbackRate + 16));
const visible = (isIntersecting = true) =>
  act(() =>
    intersection(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
const documentVisibility = (value: boolean) =>
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event("visibilitychange"));
  });

it("animates requests and replies before settling both endings", () => {
  render(<RaftCurrentTermFigure />);
  visible();
  for (let frame = 0; frame < 8; frame++) {
    advance(frameDuration(frame));
    expect(stage().getAttribute("data-step")).toBe(String(frame + 1));
  }
  expect(stage().getAttribute("data-playback")).toBe("playing");
  advance(800);
  expect(document.querySelector('[data-kind="vote-request"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  const position = document
    .querySelector(".raft-current-term-packet > g")
    ?.getAttribute("style");
  advance(2000);
  expect(
    document
      .querySelector(".raft-current-term-packet > g")
      ?.getAttribute("style"),
  ).toBe(position);
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  advance(frameDuration(8));
  expect(stage().getAttribute("data-playback")).toBe("complete");
  expect(
    within(
      screen.getByRole("table", { name: "Three server logs" }),
    ).getAllByRole("row"),
  ).toHaveLength(4);
  expect(screen.getByRole("table", { name: "Stage c: Majority" })).toBeTruthy();
  expect(
    screen.getByRole("table", { name: "Stage e: Committed" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Next" }).hasAttribute("disabled"),
  ).toBe(true);
});

it("freezes elapsed playback offscreen and in a hidden document, then replays from the start", () => {
  render(<RaftCurrentTermFigure />);
  advance(20000);
  expect(stage().getAttribute("data-step")).toBe("0");
  visible();
  advance(frameDuration(0));
  visible(false);
  advance(20000);
  expect(stage().getAttribute("data-step")).toBe("1");
  visible();
  documentVisibility(true);
  advance(20000);
  expect(stage().getAttribute("data-step")).toBe("1");
  documentVisibility(false);
  advance(frameDuration(1));
  expect(stage().getAttribute("data-step")).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(stage().getAttribute("data-step")).toBe("0");
});

it("shows the conclusion in reduced motion and allows explicit playback without moving packets", () => {
  reduced = true;
  render(<RaftCurrentTermFigure />);
  visible();
  expect(stage().getAttribute("data-playback")).toBe("complete");
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  advance(frameDuration(0));
  advance(800);
  expect(stage().getAttribute("data-step")).toBe("1");
  expect(document.querySelector(".raft-current-term-packet")).toBeNull();
  act(() => motionChange());
  expect(stage().getAttribute("data-playback")).toBe("complete");
});

it("updates motion between 40ms timer ticks", () => {
  render(<RaftCurrentTermFigure />);
  visible();
  advance(frameDuration(0));
  advance(800);
  const packet = () =>
    document
      .querySelector(".raft-current-term-packet > g")
      ?.getAttribute("style");
  const before = packet();
  expect(before).toBeTruthy();
  advance(16);
  expect(packet()).not.toBe(before);
});

it("shows storage-only after entry 2’s ACK, then commits entries 2 and 3 after entry 3’s ACK", () => {
  render(<RaftCurrentTermFigure />);
  visible();
  advance(frameDuration(0));
  advance(frameDuration(1));
  advance(flightsFor(2).at(-1)!.end + 32);
  expect(
    screen.getAllByRole("cell", { name: "Index 2, term 2, uncommitted" }),
  ).toHaveLength(2);
  for (let frame = 2; frame < 7; frame++) advance(frameDuration(frame));
  advance(flightsFor(7).at(-1)!.end + 32);
  expect(
    screen.getAllByRole("cell", { name: "Index 2, term 2, committed" }),
  ).toHaveLength(2);
  expect(
    screen.getAllByRole("cell", { name: "Index 3, term 4, committed" }),
  ).toHaveLength(2);
});

it("highlights only B and C’s last entries after the vote request arrives", () => {
  render(<RaftCurrentTermFigure />);
  visible();
  for (let frame = 0; frame < 4; frame++) advance(frameDuration(frame));
  expect(document.querySelectorAll('[data-compared="true"]')).toHaveLength(0);
  advance(flightsFor(4)[0].end + 32);
  expect(
    [...document.querySelectorAll('[data-compared="true"]')].map((e) => [
      e.closest("tr")?.getAttribute("data-server"),
      e.getAttribute("data-term"),
    ]),
  ).toEqual([
    ["B", "2"],
    ["C", "3"],
  ]);
  for (let frame = 4; frame < 8; frame++) advance(frameDuration(frame));
  expect(document.querySelectorAll('[data-compared="true"]')).toHaveLength(0);
  advance(flightsFor(8)[0].end + 32);
  expect(
    [...document.querySelectorAll('[data-compared="true"]')].map((e) => [
      e.closest("tr")?.getAttribute("data-server"),
      e.getAttribute("data-term"),
    ]),
  ).toEqual([
    ["B", "4"],
    ["C", "3"],
  ]);
  expect(
    screen.getAllByRole("cell", { name: /last log entry compared for voting/ }),
  ).toHaveLength(2);
});

it("steps through settled outcomes in both directions and pauses playback", () => {
  render(<RaftCurrentTermFigure />);
  visible();
  const back = screen.getByRole("button", { name: "Back" });
  const next = screen.getByRole("button", { name: "Next" });
  expect(back.hasAttribute("disabled")).toBe(true);
  fireEvent.click(next);
  expect(screen.getByText("Term 3 · C leads")).toBeTruthy();
  expect(
    screen.getByRole("cell", { name: "Index 2, term 3, uncommitted" }),
  ).toBeTruthy();
  expect(stage().getAttribute("data-playback")).toBe("paused");
  advance(30000);
  expect(stage().getAttribute("data-step")).toBe("1");
  fireEvent.click(back);
  expect(screen.getByText("Term 2 · A leads")).toBeTruthy();
  expect(back.hasAttribute("disabled")).toBe(true);
  for (let i = 0; i < 8; i++) fireEvent.click(next);
  expect(stage().getAttribute("data-playback")).toBe("complete");
  expect(next.hasAttribute("disabled")).toBe(true);
  expect(
    screen.getByRole("table", { name: "Stage e: Committed" }),
  ).toBeTruthy();
  fireEvent.click(back);
  expect(stage().getAttribute("data-step")).toBe("7");
  expect(
    screen.getAllByRole("cell", { name: "Index 3, term 4, committed" }),
  ).toHaveLength(2);
  expect(next.hasAttribute("disabled")).toBe(false);
});

it("allows reduced-motion readers to inspect earlier steps without starting animation", () => {
  reduced = true;
  render(<RaftCurrentTermFigure />);
  visible();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(stage().getAttribute("data-step")).toBe("7");
  expect(stage().getAttribute("data-playback")).toBe("paused");
  expect(
    screen.getAllByRole("cell", { name: "Index 3, term 4, committed" }),
  ).toHaveLength(2);
  advance(30000);
  expect(stage().getAttribute("data-step")).toBe("7");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(stage().getAttribute("data-playback")).toBe("complete");
});
