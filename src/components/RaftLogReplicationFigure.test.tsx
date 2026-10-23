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
import {
  beats,
  cycleDuration,
  replicationTime as time,
} from "~/demos/raft-log-replication/model";

let reduced = false;
let intersection: IntersectionObserverCallback;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(644);
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

it("commits with B and A while C lags, batch-catches up, and stops at the settled result", () => {
  render(<RaftLogReplicationFigure />);
  visible();
  let clock = 0;
  const to = (time: number) => {
    advance(time - clock);
    clock = time;
  };
  expect(document.querySelectorAll('[data-present="true"]')).toHaveLength(0);
  to(time(9200));
  expect(node("B").getAttribute("data-committed")).toBe("1");
  expect(node("A").getAttribute("data-stored")).toBe("1");
  expect(node("A").getAttribute("data-committed")).toBe("0");
  expect(node("C").getAttribute("data-stored")).toBe("0");
  to(time(22100));
  expect(node("A").getAttribute("data-committed")).toBe("2");
  expect(node("C").getAttribute("data-stored")).toBe("0");
  expect(
    document.querySelector(".raft-log-confirmations")?.textContent,
  ).toContain("A confirmed 2 · C confirmed 0");
  to(time(25500));
  expect(node("C").getAttribute("data-stored")).toBe("2");
  expect(node("C").getAttribute("data-committed")).toBe("2");
  expect(
    document.querySelector(".raft-log-confirmations")?.textContent,
  ).toContain("C confirmed 0");
  expect(
    document.querySelectorAll('[data-committed="true"].log-replication-entry'),
  ).toHaveLength(6);
  to(time(27900));
  expect(
    document.querySelector(".raft-log-confirmations")?.textContent,
  ).toContain("C confirmed 2");
  to(time(36400));
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
  to(time(40700));
  expect(node("A").getAttribute("data-committed")).toBe("3");
  expect(node("C").getAttribute("data-committed")).toBe("2");
  to(cycleDuration - 100);
  expect(
    document.querySelectorAll('.log-replication-entry[data-committed="true"]'),
  ).toHaveLength(9);
  to(cycleDuration + 100);
  for (const server of ["A", "B", "C"])
    expect(node(server).getAttribute("data-committed")).toBe("3");
  expect(
    document.querySelector("[data-playback]")?.getAttribute("data-playback"),
  ).toBe("complete");
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(node("B").getAttribute("data-stored")).toBe("0");
  expect(
    document.querySelector("[data-playback]")?.getAttribute("data-playback"),
  ).toBe("playing");
});

it("moves explicit payloads on an unchanged bus and freezes them on pause until arrival", () => {
  render(<RaftLogReplicationFigure />);
  visible();
  const wire = document
    .querySelector(".log-replication-wire")
    ?.getAttribute("d");
  advance(time(5100));
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
  advance(time(6400) - time(5200));
  expect(document.querySelectorAll('[data-kind="entry"]')).toHaveLength(0);
  expect(
    document.querySelector(".log-replication-wire")?.getAttribute("d"),
  ).toBe(wire);
  advance(time(8100) - time(6400));
  expect(document.querySelector('[data-kind="ack"]')?.textContent).toContain(
    "#1",
  );
  advance(time(10700) - time(8100));
  expect(
    document.querySelector('[data-kind="commit"] .log-replication-heart'),
  ).toBeTruthy();
  expect(document.querySelector('[data-kind="commit"]')?.textContent).toBe(
    "HeartbeatTerm: 5Commit: 1",
  );
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  const paused = document
    .querySelector(".log-replication-payload")
    ?.getAttribute("transform");
  expect(paused).toBeTruthy();
  const committed = node("A").getAttribute("data-committed");
  advance(10000);
  expect(node("A").getAttribute("data-committed")).toBe(committed);
  expect(
    document
      .querySelector(".log-replication-payload")
      ?.getAttribute("transform"),
  ).toBe(paused);
});
it("labels entry and heartbeat metadata and keeps the packet layer above the cards", () => {
  render(<RaftLogReplicationFigure />);
  visible();
  advance(time(5500));
  const packet = document.querySelector('[data-kind="entry"]')!;
  expect(packet.textContent).toBe("Entry #1Term: 5Commit: 0");
  expect(packet.getAttribute("data-term")).toBe("5");
  const scene = document.querySelector(".log-replication-scene")!;
  expect(
    scene.lastElementChild!.classList.contains("log-replication-payload-layer"),
  ).toBe(true);
  expect(document.querySelector("figcaption")?.textContent).toContain(
    "Each server’s Commit label shows its local commitment knowledge",
  );
});

it("settles the current in-flight step before advancing to another checkpoint", () => {
  render(<RaftLogReplicationFigure />);
  visible();
  advance(time(5500));
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
  advance(time(4000));
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
  advance(time(7000) - time(4000));
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
