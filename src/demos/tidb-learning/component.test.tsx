/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TidbLearningDemo } from "~/components/TidbLearningDemos";
let intersection: IntersectionObserverCallback;
let preferenceChanged: () => void;
let reduced = false;
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const inView = (value: boolean, ratio = value ? 1 : 0) =>
  act(() =>
    intersection(
      [
        {
          isIntersecting: value,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
beforeEach(() => {
  reduced = false;
  vi.useFakeTimers();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
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
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) => {
      preferenceChanged = callback;
    },
    removeEventListener() {},
  }));
  Object.defineProperty(document, "hidden", {
    value: false,
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("TiDB lesson playback and camera", () => {
  it("autoplays when visible, suspends offscreen and hidden clocks, and pauses on manual stepping", () => {
    render(<TidbLearningDemo lesson="routing" />);
    tick(10000);
    inView(true, 0.39);
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain("Accept SQL");
    expect(vi.getTimerCount()).toBe(0);
    inView(true, 0.4);
    tick(2600);
    expect(screen.getByRole("status").textContent).toContain("Get a snapshot");
    inView(false);
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain("Get a snapshot");
    inView(true);
    tick(2600);
    expect(screen.getByRole("status").textContent).toContain(
      "Route to the Region",
    );
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain(
      "Route to the Region",
    );
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    click("Next step");
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain(
      "Read the visible row",
    );
    expect(
      screen.getByRole("button", { name: "Play" }).getAttribute("aria-pressed"),
    ).toBe("false");
    click("Next step");
    expect(screen.getByRole("status").textContent).toContain(
      "Return the SQL result",
    );
    expect(
      (screen.getByRole("button", { name: "Next step" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("respects a manual pause on re-entry and replays once to a settled result", () => {
    render(<TidbLearningDemo lesson="capacity" />);
    inView(true);
    tick(2600);
    click("Pause");
    inView(false);
    tick(10000);
    inView(true);
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain(
      "Find a real constraint",
    );
    expect(vi.getTimerCount()).toBe(0);
    click("Replay");
    expect(screen.getByRole("status").textContent).toContain(
      "Start with one machine",
    );
    tick(2600);
    tick(2600);
    inView(false);
    inView(true);
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain(
      "Keep one SQL interface",
    );
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();
  });
  it("retains the same lesson under reduced motion without starting automatic playback", () => {
    reduced = true;
    render(<TidbLearningDemo lesson="snapshot" />);
    inView(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Play",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    click("Snapshot 160");
    click("Next step");
    click("Next step");
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain(
      "Snapshot 160 returns William",
    );
    expect(vi.getTimerCount()).toBe(0);
    click("Replay");
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain(
      "Keep committed versions",
    );
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      reduced = false;
      preferenceChanged();
    });
    click("Play");
    tick(2600);
    act(() => {
      reduced = true;
      preferenceChanged();
    });
    tick(10000);
    expect(screen.getByRole("status").textContent).toContain(
      "Fix the read timestamp",
    );
  });
  it("keeps camera state and SVG identities independent of simulation replay", () => {
    const { container } = render(<TidbLearningDemo lesson="quorum" />);
    const svg = screen.getByRole("img", { name: /orbitable/ });
    const polygon = container.querySelector("polygon")!;
    const initial = polygon.getAttribute("points");
    fireEvent.keyDown(svg, { key: "ArrowLeft" });
    const rotated = polygon.getAttribute("points");
    expect(rotated).not.toBe(initial);
    click("Next step");
    expect(container.contains(polygon)).toBe(true);
    click("Replay");
    expect(polygon.getAttribute("points")).toBe(rotated);
    click("Next step");
    click("Reset view");
    expect(polygon.getAttribute("points")).toBe(initial);
    expect(screen.getByRole("status").textContent).toContain(
      "Append at the leader",
    );
    expect(container.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
  });
  it("shows a finite quorum result after follower loss and stops scheduling", () => {
    render(<TidbLearningDemo lesson="quorum" />);
    inView(true);
    click("Lose 2 followers");
    click("Play");
    tick(2600);
    tick(2600);
    tick(2600);
    expect(screen.getByRole("status").textContent).toContain(
      "1/3 copies · no quorum",
    );
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();
  });
});
