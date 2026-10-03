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
  TemporalArchitectureDemo,
  TemporalCompensationDemo,
  TemporalHistoryDemo,
  TemporalParallelDemo,
  TemporalReplayDemo,
  TemporalTaskQueueDemo,
} from "~/components/TemporalSpatialDemos";
import type { CameraCommand, SpatialFrame } from "./model";
let preload: IntersectionObserverCallback;
let onscreen: IntersectionObserverCallback;
let onReady: () => void;
let onUnavailable: () => void;
let reduced = false;
let hidden = false;
let motionChange: () => void;
let camera: CameraCommand;
let sceneFrame: SpatialFrame;
let sceneProgress: { current: number };
vi.mock("~/demos/temporal-spatial/Scene", () => ({
  default: (props: {
    onReady: () => void;
    onUnavailable: () => void;
    cameraCommand: CameraCommand;
    frame: SpatialFrame;
    progress: { current: number };
  }) => {
    onReady = props.onReady;
    onUnavailable = props.onUnavailable;
    camera = props.cameraCommand;
    sceneFrame = props.frame;
    sceneProgress = props.progress;
    return null;
  },
}));
const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;
const figure = () => screen.getByRole("figure");
function intersect(callback: IntersectionObserverCallback, ratio: number) {
  act(() =>
    callback(
      [
        {
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
}
function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}
function documentVisibility(visible: boolean) {
  act(() => {
    hidden = !visible;
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
async function mount(
  kind: "architecture" | "replay" | "history" | "compensation" = "replay",
  { ready = true, ratio = 1 }: { ready?: boolean; ratio?: number } = {},
) {
  await act(async () => {
    render(
      kind === "architecture" ? (
        <TemporalArchitectureDemo />
      ) : kind === "history" ? (
        <TemporalHistoryDemo />
      ) : kind === "compensation" ? (
        <TemporalCompensationDemo />
      ) : (
        <TemporalReplayDemo />
      ),
    );
  });
  intersect(preload, 1);
  intersect(onscreen, ratio);
  await act(async () => {});
  if (ready) act(() => onReady());
}
beforeEach(() => {
  reduced = false;
  hidden = false;
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(Date.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener(_event: string, callback: () => void) {
      motionChange = callback;
    },
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        if (options?.rootMargin) preload = callback;
        else onscreen = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("waits for a ready presentation and 30% visibility before the initial entrance delay", async () => {
  await mount("architecture", { ready: false, ratio: 0.29 });
  expect(button("Pause").disabled).toBe(false);
  advance(10_000);
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(figure().getAttribute("data-moving")).toBe("false");
  expect(vi.getTimerCount()).toBe(0);

  intersect(onscreen, 1);
  advance(10_000);
  expect(figure().getAttribute("data-moving")).toBe("false");
  expect(vi.getTimerCount()).toBe(0);
  intersect(onscreen, 0.29);
  act(() => onReady());
  advance(10_000);
  expect(figure().getAttribute("data-moving")).toBe("false");
  expect(vi.getTimerCount()).toBe(0);

  intersect(onscreen, 0.3);
  advance(999);
  expect(figure().getAttribute("data-moving")).toBe("false");
  advance(1);
  advance(1599);
  expect(figure().getAttribute("data-moving")).toBe("false");
  advance(1);
  expect(figure().getAttribute("data-moving")).toBe("true");
  advance(600);
  expect(sceneFrame.history).toHaveLength(0);
  expect(figure().getAttribute("data-step")).toBe("0");
  advance(700);
  expect(figure().getAttribute("data-step")).toBe("1");
  expect(sceneFrame.history).toHaveLength(1);
});

it("starts the same bounded lesson when a useful textual fallback becomes available", async () => {
  await mount("architecture", { ready: false });
  act(() => onUnavailable());
  expect(screen.getByText(/3D is unavailable\. Next/)).toBeTruthy();
  advance(1000);
  advance(1600);
  expect(figure().getAttribute("data-moving")).toBe("true");
  advance(1300);
  expect(figure().getAttribute("data-step")).toBe("1");
  expect(button("Reset view").disabled).toBe(true);
});

it.each(["Pause", "Next"])(
  "%s cancels pending initial autoplay and keeps viewport reentry manual",
  async (action) => {
    await mount("architecture", { ready: false });
    fireEvent.click(button(action));
    const expectedStep = action === "Next" ? "1" : "0";
    expect(figure().getAttribute("data-step")).toBe(expectedStep);
    expect(figure().getAttribute("data-playback")).toBe("paused");
    act(() => onReady());
    intersect(onscreen, 0);
    intersect(onscreen, 1);
    advance(10_000);
    expect(figure().getAttribute("data-step")).toBe(expectedStep);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(button("Play"));
    advance(1600);
    expect(figure().getAttribute("data-moving")).toBe("true");
  },
);

it("suspends offscreen without losing packet progress, then completes without looping", async () => {
  await mount("architecture");
  advance(1000);
  advance(1600);
  advance(600);
  const retainedProgress = sceneProgress.current;
  expect(retainedProgress).toBeGreaterThan(0.4);
  intersect(onscreen, 0);
  advance(10_000);
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(sceneProgress.current).toBe(retainedProgress);
  expect(vi.getTimerCount()).toBe(0);
  intersect(onscreen, 1);
  advance(400);
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(sceneProgress.current).toBeGreaterThan(retainedProgress);
  advance(400);
  expect(figure().getAttribute("data-step")).toBe("1");
  expect(sceneFrame.history).toHaveLength(1);
  for (let index = 0; index < 6; index += 1) {
    advance(1600);
    advance(1300);
  }
  expect(figure().getAttribute("data-step")).toBe("7");
  expect(figure().getAttribute("data-playback")).toBe("complete");
  expect(button("Next").disabled).toBe(true);
  advance(10_000);
  expect(vi.getTimerCount()).toBe(0);
  fireEvent.click(button("Replay"));
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(figure().getAttribute("data-playback")).toBe("playing");
  advance(1600);
  expect(figure().getAttribute("data-moving")).toBe("true");
});

it("waits while the document is hidden and resumes the same packet after visibility returns", async () => {
  hidden = true;
  await mount("architecture");
  advance(10_000);
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(vi.getTimerCount()).toBe(0);
  documentVisibility(true);
  advance(1000);
  advance(1600);
  advance(400);
  const retainedProgress = sceneProgress.current;
  documentVisibility(false);
  advance(10_000);
  expect(sceneProgress.current).toBe(retainedProgress);
  expect(vi.getTimerCount()).toBe(0);
  documentVisibility(true);
  advance(400);
  expect(figure().getAttribute("data-step")).toBe("0");
  advance(600);
  expect(figure().getAttribute("data-step")).toBe("1");
});

it("retains the elapsed entrance delay when the document becomes hidden", async () => {
  await mount("architecture");
  advance(600);
  documentVisibility(false);
  advance(10_000);
  expect(vi.getTimerCount()).toBe(0);
  documentVisibility(true);
  advance(399);
  expect(figure().getAttribute("data-moving")).toBe("false");
  advance(1);
  advance(1599);
  expect(figure().getAttribute("data-moving")).toBe("false");
  advance(1);
  expect(figure().getAttribute("data-moving")).toBe("true");
});

it("retains the elapsed settled beat when the stage leaves the viewport", async () => {
  await mount("architecture");
  advance(1000);
  advance(600);
  intersect(onscreen, 0);
  advance(10_000);
  expect(vi.getTimerCount()).toBe(0);
  intersect(onscreen, 1);
  advance(999);
  expect(figure().getAttribute("data-moving")).toBe("false");
  advance(1);
  expect(figure().getAttribute("data-moving")).toBe("true");
});

it.each(["Replay", "Refund fails finally"])(
  "%s gives a fresh settled beat even when the initial state was already playing",
  async (action) => {
    await mount(action === "Replay" ? "architecture" : "compensation");
    advance(1000);
    advance(1400);
    fireEvent.click(button(action));
    expect(figure().getAttribute("data-step")).toBe("0");
    expect(figure().getAttribute("data-playback")).toBe("playing");
    advance(200);
    expect(figure().getAttribute("data-moving")).toBe("false");
    advance(1399);
    expect(figure().getAttribute("data-moving")).toBe("false");
    advance(1);
    expect(figure().getAttribute("data-moving")).toBe("true");
  },
);

it("keeps orbit and zoom commands independent of settled Next and Replay", async () => {
  await mount();
  fireEvent.click(button("Orbit left"));
  const orbit = { ...camera };
  expect(orbit.action).toBe("left");
  fireEvent.click(button("Next"));
  expect(camera).toEqual(orbit);
  expect(figure().getAttribute("data-moving")).toBe("false");
  fireEvent.click(button("Replay"));
  expect(camera).toEqual(orbit);
  const stage = screen.getByRole("group", {
    name: "How Replay Rebuilds State: 3D view",
  });
  fireEvent.keyDown(stage, { key: "+" });
  expect(camera).toMatchObject({ action: "in", sequence: orbit.sequence + 1 });
  fireEvent.keyDown(stage, { key: "Home" });
  expect(camera.action).toBe("reset");
  expect(figure().getAttribute("data-step")).toBe("0");
});

it("preserves manual replay and retries a failed 3D mount without losing current state", async () => {
  reduced = true;
  await mount();
  expect(button("Play").disabled).toBe(true);
  act(() => onUnavailable());
  expect(screen.getByText(/3D is unavailable\. Next/)).toBeTruthy();
  for (let index = 0; index < 5; index += 1) fireEvent.click(button("Next"));
  expect(screen.getByRole("status").textContent).toContain(
    "No new reserve Activity is scheduled",
  );
  expect(screen.getByText("Reserve 1 · Charge 0")).toBeTruthy();
  expect(button("Reset view").disabled).toBe(true);
  await act(async () => fireEvent.click(button("Retry 3D")));
  act(() => onReady());
  expect(figure().getAttribute("data-step")).toBe("5");
  expect(button("Reset view").disabled).toBe(false);
  expect(figure().querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
});

it("settles in-flight motion and cancels callbacks when reduced motion is enabled", async () => {
  await mount();
  advance(1000);
  advance(1600);
  advance(400);
  expect(figure().getAttribute("data-moving")).toBe("true");
  act(() => {
    reduced = true;
    motionChange();
  });
  expect(figure().getAttribute("data-moving")).toBe("false");
  expect(figure().getAttribute("data-step")).toBe("1");
  advance(10_000);
  expect(vi.getTimerCount()).toBe(0);
  expect(button("Play").disabled).toBe(true);
  fireEvent.click(button("Next"));
  expect(figure().getAttribute("data-step")).toBe("2");
});

it("starts with reduced motion in manual mode and waits for explicit Play after the preference changes", async () => {
  reduced = true;
  await mount("architecture");
  advance(10_000);
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(figure().getAttribute("data-playback")).toBe("reduced");
  expect(vi.getTimerCount()).toBe(0);
  act(() => {
    reduced = false;
    motionChange();
  });
  advance(10_000);
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(figure().getAttribute("data-playback")).toBe("paused");
  expect(vi.getTimerCount()).toBe(0);
  fireEvent.click(button("Play"));
  advance(1600);
  expect(figure().getAttribute("data-moving")).toBe("true");
});

it("allows persisted payload inspection without changing the append-only history", async () => {
  await mount("history");
  for (let index = 0; index < 3; index += 1) fireEvent.click(button("Next"));
  fireEvent.click(button("Inspect event 1: WorkflowExecutionStarted"));
  expect(screen.getByText("orderId")).toBeTruthy();
  expect(screen.getByText("order-42")).toBeTruthy();
  fireEvent.click(
    button("Inspect event 3: ActivityTaskCompleted · reserveInventory"),
  );
  expect(screen.getByText("reservationId")).toBeTruthy();
  expect(figure().getAttribute("data-step")).toBe("3");
  fireEvent.click(button("Next"));
  expect(screen.getByText("reservationId")).toBeTruthy();
  expect(sceneFrame.history).toHaveLength(4);
});

it("offers a refund failure mode that ends with manual recovery and captured payment", async () => {
  await mount("compensation");
  fireEvent.click(button("Refund fails finally"));
  for (let index = 0; index < 6; index += 1) fireEvent.click(button("Next"));
  expect(screen.getByRole("status").textContent).toContain(
    "Manual recovery is required",
  );
  expect(screen.getByText("Captured")).toBeTruthy();
  expect(screen.getByText("Reserved")).toBeTruthy();
  expect(button("Next").disabled).toBe(true);
  fireEvent.click(button("Refund succeeds"));
  expect(figure().getAttribute("data-step")).toBe("0");
  expect(figure().getAttribute("data-playback")).toBe("playing");
});

it("authors six independent workbenches, each with one semantic stage", () => {
  render(
    <>
      <TemporalArchitectureDemo />
      <TemporalTaskQueueDemo />
      <TemporalHistoryDemo />
      <TemporalReplayDemo />
      <TemporalParallelDemo />
      <TemporalCompensationDemo />
    </>,
  );
  const figures = screen.getAllByRole("figure");
  expect(figures).toHaveLength(6);
  expect(
    new Set(figures.map((item) => item.getAttribute("aria-labelledby"))).size,
  ).toBe(6);
  for (const item of figures) {
    expect(item.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    expect(within(item).getByRole("button", { name: "Next" })).toBeTruthy();
  }
});
