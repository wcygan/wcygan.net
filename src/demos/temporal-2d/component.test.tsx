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
import {
  TemporalIdempotencyDemo,
  TemporalRetryDemo,
  TemporalWorkflowDemo,
} from "~/components/TemporalDemos";
import { AUTOPLAY_DELAY_MS, BEAT_MS } from "./playback";

let observeVisibility: (visibility: boolean | number) => void;
let changeMotion: (reduced: boolean) => void;
let hidden = false;
let mediaMatches = false;
let observedSurface: Element | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  mediaMatches = false;
  observedSurface = undefined;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(Date.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observeVisibility = (visibility) =>
          callback(
            [
              {
                isIntersecting: visibility !== false && visibility !== 0,
                intersectionRatio:
                  typeof visibility === "number"
                    ? visibility
                    : visibility
                      ? 1
                      : 0,
              } as IntersectionObserverEntry,
            ],
            this as unknown as IntersectionObserver,
          );
      }
      observe(element: Element) {
        observedSurface = element;
      }
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
  const media = {
    get matches() {
      return mediaMatches;
    },
    addEventListener: (_name: string, handler: () => void) => {
      changeMotion = (reduced) => {
        mediaMatches = reduced;
        handler();
      };
    },
    removeEventListener() {},
  };
  vi.stubGlobal("matchMedia", () => media);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const advanceBeat = () => act(() => vi.advanceTimersByTime(BEAT_MS + 48));
const settleForAutoplay = () =>
  act(() => vi.advanceTimersByTime(AUTOPLAY_DELAY_MS));

it("autoplays after the authored stage is meaningfully visible and the settling delay ends", () => {
  render(<TemporalWorkflowDemo />);
  expect(observedSurface).toBe(document.querySelector("[data-graphic-stage]"));
  act(() => observeVisibility(0.2));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Workflow ready");
  act(() => observeVisibility(0.35));
  act(() => vi.advanceTimersByTime(AUTOPLAY_DELAY_MS - 1));
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  advanceBeat();
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
});

it("cancels pending autoplay offscreen and waits again after reentry", () => {
  render(<TemporalWorkflowDemo />);
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(AUTOPLAY_DELAY_MS / 2));
  act(() => observeVisibility(false));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain("Workflow ready");
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  act(() => observeVisibility(true));
  settleForAutoplay();
  advanceBeat();
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
});

it("honors Next before autoplay and stays manual when the reader returns", () => {
  render(<TemporalWorkflowDemo />);
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(AUTOPLAY_DELAY_MS / 2));
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  act(() => observeVisibility(false));
  act(() => vi.advanceTimersByTime(20_000));
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
});

it("moves a packet without advancing the destination state before arrival", () => {
  render(<TemporalWorkflowDemo />);
  act(() => observeVisibility(true));
  const packet = document.querySelector(".temporal-packet")!;
  const origin = packet.getAttribute("transform");
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => vi.advanceTimersByTime(1000));
  expect(document.querySelector(".temporal-packet")).toBe(packet);
  expect(packet.getAttribute("transform")).not.toBe(origin);
  expect(screen.getByRole("status").textContent).toContain("Workflow ready");
  expect(screen.getAllByText("Not scheduled")).toHaveLength(4);
  const inFlight = packet.getAttribute("transform");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  act(() => vi.advanceTimersByTime(20_000));
  expect(packet.getAttribute("transform")).toBe(inFlight);
  expect(packet.getAttribute("opacity")).toBe("1");
});

it("suspends viewport autoplay offscreen and hidden, settles once, and explicitly replays", () => {
  render(<TemporalWorkflowDemo />);
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain("Workflow ready");
  act(() => observeVisibility(true));
  settleForAutoplay();
  advanceBeat();
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
  act(() => observeVisibility(false));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
  hidden = true;
  act(() => {
    observeVisibility(true);
    document.dispatchEvent(new Event("visibilitychange"));
  });
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  for (let i = 0; i < 7; i++) advanceBeat();
  expect(screen.getByRole("status").textContent).toContain("Order fulfilled");
  expect(
    (screen.getByRole("button", { name: "Next step" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain("Order fulfilled");
  act(() => observeVisibility(false));
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain("Order fulfilled");
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(screen.getByRole("status").textContent).toContain("Workflow ready");
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  advanceBeat();
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
});

it("does not autostart while hidden and gives a settling delay when the document returns", () => {
  hidden = true;
  render(<TemporalWorkflowDemo />);
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  settleForAutoplay();
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
});

it("keeps an explicit Pause manual after viewport reentry", () => {
  render(<TemporalWorkflowDemo />);
  act(() => observeVisibility(true));
  settleForAutoplay();
  act(() => vi.advanceTimersByTime(1000));
  const packet = document.querySelector(".temporal-packet")!;
  const stoppedAt = packet.getAttribute("transform");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  act(() => observeVisibility(false));
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  expect(packet.getAttribute("transform")).toBe(stoppedAt);
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  advanceBeat();
  expect(screen.getByRole("status").textContent).toContain(
    "Run: Reserve inventory",
  );
});

it("keeps initial reduced motion and reduced-motion Replay manual", () => {
  mediaMatches = true;
  render(<TemporalWorkflowDemo />);
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain("Workflow ready");
  expect(
    (screen.getByRole("button", { name: "Play" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  act(() => changeMotion(false));
  act(() => observeVisibility(false));
  act(() => observeVisibility(true));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain("Workflow ready");
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
});

it("restarts the selected retry scenario when its mode changes", () => {
  render(<TemporalRetryDemo />);
  act(() => observeVisibility(true));
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  fireEvent.click(
    screen.getByRole("button", { name: "All attempts time out" }),
  );
  expect(screen.getByRole("status").textContent).toContain("Attempt 1 starts");
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  advanceBeat();
  expect(screen.getByRole("status").textContent).toContain(
    "Worker crashes at 1s",
  );
});

it("preserves the same explanation with reduced motion and exactly one SVG stage", () => {
  render(<TemporalIdempotencyDemo />);
  act(() => observeVisibility(true));
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => changeMotion(true));
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("status").textContent).toContain(
    "One charge requested",
  );
  const figure = screen.getByRole("figure", {
    name: "One payment, two attempts",
  });
  expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
  expect(within(figure).getByRole("img")).toBeTruthy();
  expect(
    (within(figure).getByRole("button", { name: "Pause" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  for (let i = 0; i < 5; i++)
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(screen.getByRole("status").textContent).toContain(
    "Completion recorded",
  );
  expect(within(figure).getByText("2 charges!")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(screen.getByRole("status").textContent).toContain(
    "One charge requested",
  );
});
