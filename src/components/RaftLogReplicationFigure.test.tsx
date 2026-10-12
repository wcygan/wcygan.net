/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftLogReplicationFigure } from "./RaftLogReplicationFigure";
import { beats, cycleDuration } from "~/demos/raft-log-replication/model";

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
const node = (server: string) =>
  document.querySelector(`.log-replication-server[data-server="${server}"]`)!;
const next = () =>
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

it("commits with B and A while C lags, batch-catches up, and loops from the final hold", () => {
  render(<RaftLogReplicationFigure />);
  visible();
  let clock = 0;
  const to = (time: number) => {
    advance(time - clock);
    clock = time;
  };
  expect(document.querySelectorAll('[data-present="true"]')).toHaveLength(0);
  expect(node("C").querySelector(".log-replication-writing")?.textContent).toBe(
    "Replication delayed",
  );
  to(9200);
  expect(node("B").getAttribute("data-committed")).toBe("1");
  expect(node("A").getAttribute("data-stored")).toBe("1");
  expect(node("A").getAttribute("data-committed")).toBe("0");
  expect(node("C").getAttribute("data-stored")).toBe("0");
  to(22100);
  expect(node("A").getAttribute("data-committed")).toBe("2");
  expect(node("C").getAttribute("data-stored")).toBe("0");
  expect(
    document.querySelector(".log-replication-confirmations")?.textContent,
  ).toContain("A confirmed: 2 · C confirmed: 0");
  to(25500);
  expect(node("C").getAttribute("data-stored")).toBe("2");
  expect(node("C").getAttribute("data-committed")).toBe("2");
  expect(
    document.querySelector(".log-replication-confirmations")?.textContent,
  ).toContain("C confirmed: 0");
  expect(
    document.querySelectorAll('[data-committed="true"].log-replication-entry'),
  ).toHaveLength(6);
  to(27900);
  expect(
    document.querySelector(".log-replication-confirmations")?.textContent,
  ).toContain("C confirmed: 2");
  to(36400);
  expect(node("B").getAttribute("data-committed")).toBe("3");
  expect(node("A").getAttribute("data-committed")).toBe("2");
  expect(node("C").getAttribute("data-committed")).toBe("2");
  for (const server of ["B", "A", "C"]) {
    expect(
      node(server).querySelectorAll(
        '.log-replication-entry[data-committed="true"]',
      ),
    ).toHaveLength(server === "B" ? 3 : 2);
  }
  to(40700);
  expect(node("A").getAttribute("data-committed")).toBe("3");
  expect(node("C").getAttribute("data-committed")).toBe("2");
  to(cycleDuration - 100);
  expect(
    document.querySelectorAll('.log-replication-entry[data-committed="true"]'),
  ).toHaveLength(9);
  expect(
    document.querySelector(".log-replication-summary")?.textContent,
  ).toContain("Entry #3 committed at B");
  to(cycleDuration + 100);
  for (const server of ["A", "B", "C"]) {
    expect(node(server).getAttribute("data-stored")).toBe("0");
    expect(node(server).getAttribute("data-committed")).toBe("0");
  }
  expect(
    document.querySelector("[data-playback]")?.getAttribute("data-playback"),
  ).toBe("playing");
});

it("moves explicit payloads on an unchanged bus and removes them on arrival or pause", () => {
  render(<RaftLogReplicationFigure />);
  visible();
  const wire = document
    .querySelector(".log-replication-wire")
    ?.getAttribute("d");
  advance(5100);
  expect(document.querySelectorAll('[data-kind="entry"]')).toHaveLength(1);
  const before = document
    .querySelector('[data-kind="entry"]')
    ?.getAttribute("transform");
  expect(
    document.querySelector('[data-kind="entry"]')?.getAttribute("data-commit"),
  ).toBe("0");
  advance(100);
  expect(
    document.querySelector('[data-kind="entry"]')?.getAttribute("transform"),
  ).not.toBe(before);
  advance(1200);
  expect(document.querySelectorAll('[data-kind="entry"]')).toHaveLength(0);
  expect(
    document.querySelector(".log-replication-wire")?.getAttribute("d"),
  ).toBe(wire);
  advance(1700);
  expect(document.querySelector('[data-kind="ack"]')?.textContent).toContain(
    "Stored",
  );
  expect(document.querySelector('[data-kind="ack"]')?.textContent).toContain(
    "#1",
  );
  advance(2600);
  expect(
    document.querySelector('[data-kind="commit"] .log-replication-heart'),
  ).toBeTruthy();
  expect(document.querySelector('[data-kind="commit"]')?.textContent).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(document.querySelectorAll(".log-replication-payload")).toHaveLength(0);
  const committed = node("A").getAttribute("data-committed");
  advance(10000);
  expect(node("A").getAttribute("data-committed")).toBe(committed);
});

it("settles the current in-flight step before advancing to another checkpoint", () => {
  render(<RaftLogReplicationFigure />);
  visible();
  advance(5500);
  next();
  expect(node("A").getAttribute("data-stored")).toBe("1");
  expect(node("B").getAttribute("data-committed")).toBe("0");
  expect(document.querySelectorAll(".log-replication-payload")).toHaveLength(0);
  next();
  expect(node("B").getAttribute("data-committed")).toBe("1");
});

it("suspends offscreen and in hidden documents without catching up", () => {
  render(<RaftLogReplicationFigure />);
  advance(cycleDuration);
  visible();
  advance(4000);
  expect(node("B").getAttribute("data-stored")).toBe("1");
  visible(false);
  advance(cycleDuration);
  expect(node("A").getAttribute("data-stored")).toBe("0");
  visible();
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(cycleDuration);
  expect(node("A").getAttribute("data-stored")).toBe("0");
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  advance(3000);
  expect(node("A").getAttribute("data-stored")).toBe("1");
});

it("offers the complete reduced-motion walkthrough and keeps Replay paused", () => {
  reduced = true;
  render(<RaftLogReplicationFigure />);
  visible();
  expect(
    (screen.getByRole("button", { name: "Play" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  next();
  expect(node("B").getAttribute("data-stored")).toBe("1");
  next();
  expect(node("A").getAttribute("data-stored")).toBe("1");
  expect(node("B").getAttribute("data-committed")).toBe("0");
  next();
  expect(node("B").getAttribute("data-committed")).toBe("1");
  expect(node("A").getAttribute("data-committed")).toBe("0");
  const commits = new Set([node("C").getAttribute("data-committed")]);
  for (let step = 0; step < beats.length; step++) {
    next();
    commits.add(node("C").getAttribute("data-committed"));
  }
  expect(commits).toEqual(new Set(["0", "2", "3"]));
  advance(cycleDuration);
  expect(
    document.querySelector("[data-playback]")?.getAttribute("data-playback"),
  ).toBe("complete");
  expect(
    (screen.getByRole("button", { name: "Next" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  for (const server of ["A", "B", "C"])
    expect(node(server).getAttribute("data-committed")).toBe("3");
  expect(document.querySelectorAll(".log-replication-payload")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(node("B").getAttribute("data-stored")).toBe("0");
  expect(
    document.querySelector("[data-playback]")?.getAttribute("data-playback"),
  ).toBe("paused");
});
