/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getElectionTiming } from "~/demos/raft-election-overview/timing";
import {
  lessons,
  voteRecordingTime,
  messageDeparture,
} from "~/demos/raft-election-overview/model";
import { RaftLeaderElectionFigure } from "./RaftLeaderElectionFigure";
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
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const advance = (time: number) => act(() => vi.advanceTimersByTime(time));
const visible = (isIntersecting = true) =>
  act(() =>
    intersection(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
const node = (id: string) =>
  document.querySelector(`.leader-election-server[data-server="${id}"]`)!;
const stage = () => document.querySelector("[data-playback]")!;
const starts = (scenario: "success" | "split") => {
  const { durations } = getElectionTiming(scenario, false);
  return durations.map((_, i) =>
    durations.slice(0, i).reduce((a, b) => a + b, 0),
  );
};
it.each(["success", "split"] as const)(
  "%s preserves local terms until requests and heartbeats arrive",
  (scenario) => {
    render(<RaftLeaderElectionFigure />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: scenario },
    });
    visible();
    const timing = getElectionTiming(scenario, false);
    const start = starts(scenario);
    advance(start[1] + 100);
    expect(node("B").getAttribute("data-term")).toBe("5");
    expect(node("A").getAttribute("data-term")).toBe(
      scenario === "split" ? "5" : "4",
    );
    advance(timing.durations[1] + 100);
    for (const id of ["A", "B", "C"])
      expect(node(id).getAttribute("data-term")).toBe("5");
    click("Replay");
    const last = start.at(-1)!;
    advance(last + 100);
    expect(node("B").getAttribute("data-role")).toBe("Leader");
    expect(node("A").getAttribute("data-leader")).toBe("");
    advance(timing.durations.at(-1)! + 100);
    for (const id of ["A", "B", "C"])
      expect(node(id).getAttribute("data-leader")).toBe("B");
    expect(node("C").getAttribute("data-vote")).toBe("B");
  },
);
it("records choices before replying, and counts only arrived votes", () => {
  render(<RaftLeaderElectionFigure />);
  visible();
  const timing = getElectionTiming("success", false);
  advance(starts("success")[2] + 100);
  expect(node("A").getAttribute("data-vote")).toBe("B");
  expect(node("C").getAttribute("data-vote")).toBe("B");
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 1 / 3");
  expect(document.querySelector(".leader-election-reply")).toBeNull();
  advance(voteRecordingTime + 200);
  expect(document.querySelector(".leader-election-reply")).not.toBeNull();
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 1 / 3");
  advance(timing.flights[2][0]);
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 2 / 3");
  expect(document.querySelector(".leader-election-majority")).not.toBeNull();
});
it("elects B as soon as the second vote arrives", () => {
  render(<RaftLeaderElectionFigure />);
  visible();
  const timing = getElectionTiming("success", false);
  advance(starts("success")[2] + 100);
  expect(node("B").getAttribute("data-role")).toBe("Candidate");
  advance(voteRecordingTime + timing.flights[2][0] + 150);
  expect(document.querySelector(".leader-election-majority")?.textContent).toBe(
    "B: 2 / 3",
  );
  expect(node("B").getAttribute("data-role")).toBe("Leader");
});
it("keeps timers visible, resets grants and heartbeats, and pauses their clock", () => {
  render(<RaftLeaderElectionFigure />);
  visible();
  const timing = getElectionTiming("success", false);
  advance(timing.starts[1] + 100);
  expect(document.querySelectorAll("[data-timer]")).toHaveLength(3);
  expect(
    Number(
      node("B").querySelector("[data-timer]")!.getAttribute("data-progress"),
    ),
  ).toBeLessThan(0.02);
  const d = () =>
    node("C").querySelector("[data-timer]")!.getAttribute("data-progress");
  click("Pause");
  const held = d();
  advance(20000);
  expect(d()).toBe(held);
  click("Next");
  click("Next");
  expect(
    Number(
      node("A").querySelector("[data-timer]")!.getAttribute("data-reset-at"),
    ),
  ).toBe(timing.starts[1] + timing.flights[1][0]);
  for (let i = 0; i < 2; i++) click("Next");
  expect(
    Number(
      node("C").querySelector("[data-timer]")!.getAttribute("data-reset-at"),
    ),
  ).toBe(timing.starts[3] + timing.flights[3][1]);
  expect(document.querySelector('[data-timer="B"]')).toBeNull();
});
it.each(["success", "split"] as const)(
  "%s stops at completion and Replay starts again",
  (scenario) => {
    render(<RaftLeaderElectionFigure />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: scenario },
    });
    const duration = getElectionTiming(scenario, false).durations.reduce(
      (a, b) => a + b,
      0,
    );
    advance(duration);
    expect(stage().getAttribute("data-playback")).toBe("paused");
    visible();
    advance(duration + 500);
    expect(stage().getAttribute("data-playback")).toBe("complete");
    expect(node("B").getAttribute("data-role")).toBe("Leader");
    advance(duration);
    expect(stage().getAttribute("data-playback")).toBe("complete");
    click("Replay");
    expect(stage().getAttribute("data-playback")).toBe("playing");
    expect(node("B").getAttribute("data-term")).toBe("4");
  },
);
it("freezes replies on pause and offscreen, then resumes them", () => {
  render(<RaftLeaderElectionFigure />);
  visible();
  advance(starts("success")[2] + voteRecordingTime + 300);
  const packet = () =>
    document.querySelector(".leader-election-reply")?.getAttribute("transform");
  const first = packet();
  expect(first).toBeTruthy();
  advance(200);
  expect(packet()).not.toBe(first);
  click("Pause");
  const held = packet();
  advance(10000);
  expect(packet()).toBe(held);
  click("Play");
  visible(false);
  advance(10000);
  expect(packet()).toBe(held);
  visible();
  advance(200);
  expect(packet()).not.toBe(held);
});
it("labels moving requests and replies with their election term", () => {
  render(<RaftLeaderElectionFigure />);
  visible();
  advance(starts("success")[1] + 300);
  expect(
    document.querySelector(".leader-election-request")?.textContent,
  ).toContain("Request voteTerm: 5");
  advance(starts("success")[2] - starts("success")[1] + voteRecordingTime);
  expect(
    document.querySelector(".leader-election-reply")?.textContent,
  ).toContain("Vote grantedTerm: 5");
});
it("exposes the split vote and settled result without motion", () => {
  reduced = true;
  render(<RaftLeaderElectionFigure />);
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "split" },
  });
  click("Next");
  click("Next");
  expect(node("A").textContent).toContain("Vote → A");
  expect(node("C").textContent).toContain("Vote → C");
  expect(screen.getByRole("status").textContent).toContain(
    "A → B: Refused (term 5) · B → C: Refused (term 5) · C → A: Refused (term 5)",
  );
  const { steps } = lessons.split;
  for (let i = 2; i < steps.length - 1; i++) click("Next");
  expect(stage().getAttribute("data-playback")).toBe("complete");
  expect(node("B").getAttribute("data-term")).toBe("6");
  expect(document.querySelectorAll(".leader-election-message")).toHaveLength(0);
  click("Replay");
  expect(stage().getAttribute("data-playback")).toBe("paused");
});

it.each(["success", "split"] as const)(
  "%s keeps all links visible and labels every in-flight payload",
  (scenario) => {
    render(<RaftLeaderElectionFigure />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: scenario },
    });
    visible();
    const timing = getElectionTiming(scenario, false);
    const samples = lessons[scenario].steps
      .flatMap((step, index) =>
        (step.traffic ?? []).map((message, order) => ({
          message,
          term: step.term,
          at:
            timing.starts[index] +
            messageDeparture(step, order, timing.flights[index]) +
            timing.flights[index][order] / 2,
        })),
      )
      .sort((a, b) => a.at - b.at);
    let elapsed = 0;
    for (const sample of samples) {
      advance(sample.at - elapsed);
      elapsed = sample.at;
      expect(document.querySelectorAll(".leader-election-wire")).toHaveLength(
        3,
      );
      const payloads = [
        ...document.querySelectorAll(".leader-election-message"),
      ];
      expect(payloads.length).toBeGreaterThan(0);
      for (const payload of payloads) {
        expect(payload.querySelector("rect")).not.toBeNull();
        expect(payload.textContent).toContain(`Term: ${sample.term}`);
      }
      expect(
        payloads.some((payload) =>
          payload.textContent?.includes(
            `${sample.message.from} → ${sample.message.to}`,
          ),
        ),
      ).toBe(true);
    }
    advance(timing.durations.at(-1)!);
    expect(stage().getAttribute("data-playback")).toBe("complete");
    expect(document.querySelectorAll(".leader-election-wire")).toHaveLength(3);
  },
);
it("keeps all connections visible when stepping without motion", () => {
  reduced = true;
  render(<RaftLeaderElectionFigure />);
  for (let step = 0; step < lessons.success.steps.length; step++) {
    expect(document.querySelectorAll(".leader-election-wire")).toHaveLength(3);
    click("Next");
  }
});

it("moves both B requests together with distinct, persistent metadata", () => {
  render(<RaftLeaderElectionFigure />);
  visible();
  advance(starts("success")[1] + 300);
  const requests = () => [
    ...document.querySelectorAll(
      '.leader-election-message[data-kind="request"]',
    ),
  ];
  expect(requests()).toHaveLength(2);
  expect(requests().map((packet) => packet.textContent)).toEqual([
    expect.stringContaining("Request voteTerm: 5B → A"),
    expect.stringContaining("Request voteTerm: 5B → C"),
  ]);
  const before = requests().map((packet) =>
    packet.querySelector(".leader-election-request")!.getAttribute("transform"),
  );
  advance(200);
  requests().forEach((packet, index) =>
    expect(
      packet
        .querySelector(".leader-election-request")!
        .getAttribute("transform"),
    ).not.toBe(before[index]),
  );
  click("Pause");
  const held = requests().map((packet) =>
    packet.getAttribute("data-packet-position"),
  );
  advance(5000);
  expect(
    requests().map((packet) => packet.getAttribute("data-packet-position")),
  ).toEqual(held);
});
