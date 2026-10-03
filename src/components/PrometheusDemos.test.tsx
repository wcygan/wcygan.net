/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PrometheusHistogramDemo,
  PrometheusMetricTypesDemo,
  PrometheusRateDemo,
  PrometheusRecordingRuleDemo,
  PrometheusScrapeDemo,
} from "~/components/PrometheusDemos";

let observers: VisibilityObserver[] = [];
let hidden = false;
let reducedMotion = false;
const preferenceListeners = new Set<() => void>();

class VisibilityObserver {
  target: Element | null = null;
  constructor(readonly callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  disconnect() {
    observers = observers.filter((observer) => observer !== this);
  }
}

function enterViewport(visible = true, ratio = visible ? 1 : 0) {
  act(() => {
    for (const observer of observers) {
      observer.callback(
        [
          {
            isIntersecting: visible,
            intersectionRatio: ratio,
            target: observer.target,
          } as IntersectionObserverEntry,
        ],
        observer as unknown as IntersectionObserver,
      );
    }
  });
}

function advanceSteps(count: number, interval = 2200) {
  for (let index = 0; index < count; index++) {
    act(() => vi.advanceTimersByTime(interval));
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  hidden = false;
  reducedMotion = false;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  vi.stubGlobal("IntersectionObserver", VisibilityObserver);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reducedMotion;
    },
    addEventListener: (_event: string, listener: () => void) =>
      preferenceListeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) =>
      preferenceListeners.delete(listener),
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "hidden");
  preferenceListeners.clear();
});

describe("Prometheus 2D workbenches", () => {
  it("shows a failed scrape without writing a fabricated counter zero", () => {
    const { container, getByRole } = render(<PrometheusScrapeDemo />);
    fireEvent.click(getByRole("button", { name: "Scenario: success" }));
    for (let index = 0; index < 3; index++)
      fireEvent.click(getByRole("button", { name: "Next step" }));
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toBe("15sNo value · stale0");
    expect(getByRole("status").textContent).toContain(
      "appends timestamped samples",
    );
    expect(
      (getByRole("button", { name: "Next step" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(getByRole("button", { name: "Replay the scrape" }));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(
      getByRole("button", { name: "Scenario: timeout" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
  });

  it("lowers the gauge without lowering the counter and resets one instance independently", () => {
    const { container } = render(
      <>
        <PrometheusMetricTypesDemo />
        <PrometheusMetricTypesDemo />
      </>,
    );
    const figures = container.querySelectorAll("figure");
    const first = within(figures[0]);
    const second = within(figures[1]);
    fireEvent.click(first.getByRole("button", { name: "Start request" }));
    fireEvent.click(first.getByRole("button", { name: "Finish request" }));
    expect(figures[0].querySelector(".prom2d-takeaway")?.textContent).toContain(
      "Received: 1. Finished: 1. Running: 0.",
    );
    expect(figures[1].querySelector(".prom2d-takeaway")?.textContent).toContain(
      "Received: 0.",
    );
    fireEvent.click(
      first.getByRole("button", { name: "Reset counters and gauges" }),
    );
    expect(figures[0].querySelector(".prom2d-takeaway")?.textContent).toContain(
      "Received: 0.",
    );
    expect(
      (
        first.getByRole("button", {
          name: "Finish request",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(figures[0].getAttribute("aria-labelledby")).not.toBe(
      figures[1].getAttribute("aria-labelledby"),
    );
  });

  it("exposes the reset-adjusted calculation and the alternative without a restart", () => {
    const { container, getByRole } = render(<PrometheusRateDemo />);
    expect(container.textContent).not.toContain("100 / 60 = 1.67 req/s");
    for (let index = 0; index < 5; index++)
      fireEvent.click(getByRole("button", { name: "Next step" }));
    expect(container.textContent).toContain("100 / 60 = 1.67 req/s");
    expect(container.textContent).toContain("-60 / 60 = -1.00 req/s");
    expect(container.textContent).toContain("Actual PromQL");
    fireEvent.click(getByRole("button", { name: "Restart at 45s: on" }));
    for (let index = 0; index < 5; index++)
      fireEvent.click(getByRole("button", { name: "Next step" }));
    expect(container.textContent).toContain("120 / 60 = 2.00 req/s");
    expect(container.querySelector(".prom2d-chart-corrected")).toBeNull();
  });

  it("autoplays a visible scrape, preserves an explicit pause, and stops at the final sample", () => {
    const { container, getByRole } = render(<PrometheusScrapeDemo />);
    const figure = container.querySelector("figure")!;
    enterViewport();
    advanceSteps(1);
    expect(figure.dataset.playbackStep).toBe("1");
    fireEvent.click(getByRole("button", { name: "Pause a scrape" }));
    advanceSteps(2);
    expect(figure.dataset.playbackStep).toBe("1");
    enterViewport(false);
    enterViewport();
    advanceSteps(1);
    expect(figure.dataset.playbackStep).toBe("1");
    fireEvent.click(getByRole("button", { name: "Play a scrape" }));
    advanceSteps(2);
    expect(figure.dataset.playback).toBe("complete");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(getByRole("button", { name: "Replay the scrape" }));
    expect(figure.dataset.playbackStep).toBe("0");
    advanceSteps(1);
    expect(figure.dataset.playbackStep).toBe("1");
  });

  it("suspends autoplay offscreen and in a hidden tab without catching up", () => {
    const { container } = render(<PrometheusScrapeDemo />);
    const figure = container.querySelector("figure")!;
    enterViewport(true, 0.1);
    advanceSteps(1);
    expect(figure.dataset.playbackStep).toBe("0");
    enterViewport();
    advanceSteps(1);
    enterViewport(false);
    advanceSteps(10);
    expect(figure.dataset.playbackStep).toBe("1");
    enterViewport();
    act(() => {
      hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advanceSteps(10);
    expect(figure.dataset.playbackStep).toBe("1");
    act(() => {
      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => vi.advanceTimersByTime(2199));
    expect(figure.dataset.playbackStep).toBe("1");
    act(() => vi.advanceTimersByTime(1));
    expect(figure.dataset.playbackStep).toBe("2");
  });

  it("keeps reduced-motion demonstrations manual and responds to preference changes", () => {
    reducedMotion = true;
    const { container, getByRole } = render(<PrometheusScrapeDemo />);
    const figure = container.querySelector("figure")!;
    enterViewport();
    advanceSteps(5);
    expect(figure.dataset.playbackStep).toBe("0");
    expect(
      (getByRole("button", { name: "Play a scrape" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(getByRole("button", { name: "Next step" }));
    expect(figure.dataset.playbackStep).toBe("1");
    act(() => {
      reducedMotion = false;
      preferenceListeners.forEach((listener) => listener());
    });
    advanceSteps(1);
    expect(figure.dataset.playbackStep).toBe("1");
    fireEvent.click(getByRole("button", { name: "Play a scrape" }));
    advanceSteps(1);
    expect(figure.dataset.playbackStep).toBe("2");
  });

  it("naturally finishes the counter/gauge, histogram, rate, and recording sequences", () => {
    const { container } = render(
      <>
        <PrometheusMetricTypesDemo />
        <PrometheusHistogramDemo />
        <PrometheusRateDemo />
        <PrometheusRecordingRuleDemo />
      </>,
    );
    enterViewport();
    advanceSteps(12, 2500);
    const figures = container.querySelectorAll("figure");
    expect(Array.from(figures, (figure) => figure.dataset.playback)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
    ]);
    expect(figures[0].textContent).toContain(
      "Received: 4. Finished: 4. Running: 0.",
    );
    expect(figures[1].textContent).toContain("11 requests");
    expect(figures[2].textContent).toContain("100 / 60 = 1.67 req/s");
    expect(figures[3].textContent).toContain("3 recorded sample(s) each");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resumes a valid counter/gauge sequence after the reader manually finishes a request", () => {
    const { container, getByRole } = render(<PrometheusMetricTypesDemo />);
    enterViewport();
    fireEvent.click(getByRole("button", { name: "Start request" }));
    fireEvent.click(getByRole("button", { name: "Finish request" }));
    fireEvent.click(getByRole("button", { name: "Play counters and gauges" }));
    advanceSteps(1, 1800);
    expect(container.querySelector("figure")!.dataset.playbackStep).toBe("3");
    advanceSteps(5, 1800);
    expect(container.querySelector("figure")!.dataset.playback).toBe(
      "complete",
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("updates histogram count and sum, then restores the original observations", () => {
    const { container, getByRole } = render(<PrometheusHistogramDemo />);
    const originalWidths = Array.from(
      container.querySelectorAll(".prom2d-bar"),
      (bar) => bar.getAttribute("width"),
    );
    fireEvent.click(getByRole("button", { name: "Observe a 1.2s request" }));
    const addedWidths = Array.from(
      container.querySelectorAll(".prom2d-bar"),
      (bar) => bar.getAttribute("width"),
    );
    expect(addedWidths.slice(0, 4)).toEqual(originalWidths.slice(0, 4));
    expect(Number(addedWidths[4])).toBeGreaterThan(Number(originalWidths[4]));
    expect(
      container.querySelector(".prom2d-histogram-totals")?.textContent,
    ).toContain("9 requests_sum4.11 seconds");
    expect(
      Array.from(
        container.querySelectorAll(".prom2d-buckets strong"),
        (node) => node.textContent,
      ),
    ).toEqual(["2", "4", "6", "8", "9"]);
    fireEvent.click(getByRole("button", { name: "Reset the histogram" }));
    expect(
      container.querySelector(".prom2d-histogram-totals")?.textContent,
    ).toContain("8 requests_sum2.91 seconds");
  });

  it("records new method series across evaluations while preserving four input rows", () => {
    const { container, getByRole } = render(<PrometheusRecordingRuleDemo />);
    fireEvent.click(getByRole("button", { name: "Evaluate rule" }));
    fireEvent.click(getByRole("button", { name: "Evaluate rule at next 15s" }));
    expect(
      container.querySelectorAll("table")[0].querySelectorAll("tbody tr"),
    ).toHaveLength(4);
    const recorded = container.querySelectorAll("table")[1];
    expect(recorded.textContent).toContain('{method="GET"}0s: 10 · 15s: 13');
    expect(recorded.textContent).toContain('{method="POST"}0s: 3 · 15s: 5');
    fireEvent.click(
      getByRole("button", { name: "Replay recording rule evaluations" }),
    );
    expect(recorded.textContent).toContain("Not evaluated yet");
    expect(container.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    expect(
      container.querySelector("[data-graphic-stage]")?.querySelector("button"),
    ).toBeNull();
  });
});
