/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftLeaderElectionFigure } from "./RaftLeaderElectionFigure";
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
  reduced = false;
});
const next = () =>
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

for (const scenario of ["success", "split"] as const) {
  it(
    scenario +
      " shows local terms and learns B’s identity only on heartbeat arrival",
    () => {
      render(<RaftLeaderElectionFigure />);
      fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
        target: { value: scenario },
      });
      act(() =>
        intersection(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      );
      act(() => vi.advanceTimersByTime(3400));
      expect(
        document.querySelector('[data-server="B"]')?.getAttribute("data-term"),
      ).toBe("5");
      expect(
        document.querySelector('[data-server="A"]')?.getAttribute("data-term"),
      ).toBe("4");
      act(() => vi.advanceTimersByTime(1700));
      for (const node of document.querySelectorAll(".leader-election-server")) {
        expect(node.getAttribute("data-term")).toBe("5");
        expect(
          node.querySelector(".leader-election-known-leader")?.textContent,
        ).toBe("Leader —");
      }
      act(() =>
        vi.advanceTimersByTime((scenario === "split" ? 19500 : 13100) - 5100),
      );
      for (const node of document.querySelectorAll(
        '.leader-election-server:not([data-server="B"])',
      )) {
        expect(node.getAttribute("data-leader")).toBe("");
        expect(
          node.querySelector(".leader-election-known-leader")?.textContent,
        ).toBe("Leader —");
      }
      act(() => vi.advanceTimersByTime(1800));
      for (const node of document.querySelectorAll(".leader-election-server")) {
        expect(node.getAttribute("data-term")).toBe(
          scenario === "split" ? "6" : "5",
        );
        expect(node.getAttribute("data-leader")).toBe("B");
        expect(
          node.querySelector(".leader-election-known-leader")?.textContent,
        ).toBe("Leader B");
      }
      expect(
        document.querySelector('[data-server="E"]')?.getAttribute("data-vote"),
      ).toBeNull();
    },
  );
}

it("highlights the majority only after the third vote arrives and sends hearts as heartbeats", () => {
  render(<RaftLeaderElectionFigure />);
  act(() =>
    intersection(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  act(() => vi.advanceTimersByTime(10400));
  expect(
    document.querySelector('[data-server="C"]')?.getAttribute("data-vote"),
  ).toBe("B");
  expect(document.querySelector(".leader-election-majority")).toBeNull();
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 2 / 5");
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("3 needed to win");
  act(() => vi.advanceTimersByTime(1600));
  expect(document.querySelector(".leader-election-majority")?.textContent).toBe(
    "B has 3 of 5 votes",
  );
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("Majority achieved");
  expect(
    document.querySelector('[data-server="B"]')?.getAttribute("data-role"),
  ).toBe("Candidate");
  act(() => vi.advanceTimersByTime(1000));
  expect(
    document.querySelectorAll('[data-kind="heartbeat"] .leader-election-heart'),
  ).toHaveLength(4);
  expect(
    document.querySelectorAll('[data-kind="heartbeat"] circle'),
  ).toHaveLength(0);
  act(() => vi.advanceTimersByTime(2000));
  expect(document.querySelectorAll(".leader-election-heart")).toHaveLength(0);
  expect(document.querySelector(".leader-election-majority")?.textContent).toBe(
    "B has 3 of 5 votes",
  );
});
it("provides a complete split-vote walkthrough under reduced motion", () => {
  reduced = true;
  render(<RaftLeaderElectionFigure />);
  expect(
    (screen.getByRole("button", { name: "Play" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
    target: { value: "split" },
  });
  next();
  next();
  expect(screen.getByRole("status").textContent).toContain(
    "Neither has a majority",
  );
  expect(document.querySelector('[data-server="A"]')?.textContent).toContain(
    "Vote → B",
  );
  expect(document.querySelector('[data-server="C"]')?.textContent).toContain(
    "Vote → D",
  );
  next();
  expect(screen.getByRole("status").textContent).toContain("term 6");
  next();
  next();
  next();
  expect(
    document.querySelector('[data-server="B"]')?.getAttribute("data-role"),
  ).toBe("Leader");
  expect(document.querySelector(".leader-election-majority")?.textContent).toBe(
    "B has 3 of 5 votes",
  );
  expect(
    document.querySelector('.leader-election-tally-label[data-majority="true"]')
      ?.textContent,
  ).toBe("Majority achieved");
  for (const node of document.querySelectorAll(".leader-election-server")) {
    expect(node.getAttribute("data-term")).toBe("6");
    expect(node.getAttribute("data-leader")).toBe("B");
  }
  expect(
    (screen.getByRole("button", { name: "Next" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(screen.getByRole("status").textContent).toContain(
    "Waiting for a heartbeat",
  );
  for (const node of document.querySelectorAll(".leader-election-server")) {
    expect(node.getAttribute("data-term")).toBe("4");
    expect(node.getAttribute("data-leader")).toBe("");
    expect(node.getAttribute("data-vote")).toBeNull();
  }
});
it.each(["success", "split"])(
  "loops the %s election and resets local state",
  (scenario) => {
    render(<RaftLeaderElectionFigure />);
    fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
      target: { value: scenario },
    });
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole("status").textContent).toContain(
      "Waiting for a heartbeat",
    );
    act(() =>
      intersection(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    act(() => vi.advanceTimersByTime(scenario === "split" ? 22000 : 15000));
    expect(
      document.querySelector("[data-playback]")?.getAttribute("data-playback"),
    ).toBe("playing");
    expect(screen.getByRole("status").textContent).toContain(
      "Three votes elected one leader",
    );
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByRole("status").textContent).toContain(
      "Waiting for a heartbeat",
    );
    for (const node of document.querySelectorAll(".leader-election-server")) {
      expect(node.getAttribute("data-term")).toBe("4");
      expect(node.getAttribute("data-leader")).toBe("");
      expect(node.getAttribute("data-vote")).toBeNull();
    }
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(30000));
    expect(
      document.querySelector("[data-playback]")?.getAttribute("data-playback"),
    ).toBe("paused");
    expect(screen.getByRole("status").textContent).toContain(
      "Waiting for a heartbeat",
    );
  },
);

it("keeps all election connections and exposes affirmative and refused replies without motion", () => {
  reduced = true;
  render(<RaftLeaderElectionFigure />);
  fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
    target: { value: "split" },
  });
  next();
  const requests = [
    ...document.querySelectorAll(".leader-election-connection path"),
  ].map((path) => path.getAttribute("d"));
  expect(requests.length).toBeGreaterThan(0);
  next();
  expect(
    [...document.querySelectorAll(".leader-election-connection path")].map(
      (path) => path.getAttribute("d"),
    ),
  ).toEqual(requests);
  expect(document.querySelectorAll(".leader-election-reply")).toHaveLength(0);
  expect(screen.getByRole("status").textContent).toContain(
    "A → B: Yes · C → D: Yes · C → B: No · A → D: No",
  );
});

it("records a follower's choice before sending its reply and counts it only on arrival", () => {
  render(<RaftLeaderElectionFigure />);
  act(() =>
    intersection(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  act(() => vi.advanceTimersByTime(6700));
  const follower = document.querySelector('[data-server="A"]')!;
  expect(follower.getAttribute("data-vote")).toBe("B");
  expect(
    follower
      .querySelector(".leader-election-recorded-vote")
      ?.getAttribute("data-identity"),
  ).toBe("B");
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 1 / 5");
  expect(document.querySelectorAll(".leader-election-reply")).toHaveLength(0);
  act(() => vi.advanceTimersByTime(500));
  expect(document.querySelectorAll(".leader-election-reply")).toHaveLength(1);
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 1 / 5");
  act(() => vi.advanceTimersByTime(1600));
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 2 / 5");
  expect(document.querySelector(".leader-election-majority")).toBeNull();
  expect(document.querySelectorAll(".leader-election-reply")).toHaveLength(0);
  expect(screen.getByRole("status").textContent).toContain("A → B: Yes");
});

it("moves replies continuously, hides payloads on pause, and resumes until arrival", () => {
  render(<RaftLeaderElectionFigure />);
  act(() =>
    intersection(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  act(() => vi.advanceTimersByTime(7500));
  const before = document
    .querySelector(".leader-election-reply")
    ?.getAttribute("transform");
  expect(before).toBeTruthy();
  act(() => vi.advanceTimersByTime(200));
  expect(
    document.querySelector(".leader-election-reply")?.getAttribute("transform"),
  ).not.toBe(before);
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(
    document.querySelectorAll(
      ".leader-election-message circle, .leader-election-reply",
    ),
  ).toHaveLength(0);
  act(() => vi.advanceTimersByTime(3000));
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 1 / 5");
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => vi.advanceTimersByTime(200));
  expect(document.querySelector(".leader-election-reply")).not.toBeNull();
  act(() => vi.advanceTimersByTime(1000));
  expect(document.querySelectorAll(".leader-election-reply")).toHaveLength(0);
  expect(
    document.querySelector(".leader-election-tally")?.textContent,
  ).toContain("B: 2 / 5");
});
