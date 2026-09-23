/** @vitest-environment jsdom */
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMOS } from "~/demos/distributed-transactions/model";
import type {
  DemoKind,
  TransactionFrame,
} from "~/demos/distributed-transactions/types";
import { DistributedTransactionDemo } from "./DistributedTransactionDemo";

interface SceneProps {
  frame: TransactionFrame;
  progress: { current: number };
  active: boolean;
  moving: boolean;
  reduced: boolean;
  viewReset: number;
  onReady: () => void;
}

const scene = vi.hoisted(() => ({
  fail: false,
  autoReady: true,
  loaded: vi.fn(),
  props: null as SceneProps | null,
}));

vi.mock("~/demos/distributed-transactions/Scene", () => {
  scene.loaded();
  return {
    default: (props: SceneProps) => {
      useEffect(() => {
        if (scene.autoReady) props.onReady();
      }, [props.onReady]);
      if (scene.fail) throw new Error("WebGL unavailable");
      scene.props = props;
      return <div data-testid="transaction-scene" />;
    },
  };
});

let intersection: IntersectionObserverCallback;
let motionChange: (() => void) | undefined;
let reduced = false;
let now = 0;
let requestId = 0;
const requests = new Map<number, FrameRequestCallback>();
const disconnect = vi.fn();

// Each call delivers one browser frame, allowing React effects to settle.
// Suspended wall time advances without delivering cancelled callbacks.
function tick(ms = 16) {
  now += ms;
  act(() => {
    const callbacks = [...requests.values()];
    requests.clear();
    for (const callback of callbacks) callback(now);
  });
}

function elapse(ms: number) {
  tick();
  tick(ms);
}

async function view(visible: boolean, ratio = visible ? 1 : 0) {
  await act(async () => {
    intersection(
      [
        {
          isIntersecting: visible,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
}

function hideDocument(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: hidden,
  });
  fireEvent(document, new Event("visibilitychange"));
}

function setReduced(value: boolean) {
  act(() => {
    reduced = value;
    motionChange!();
  });
}

const figure = () => document.querySelector<HTMLElement>("figure.dt-demo")!;
const step = () => Number(figure().dataset.step);
const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

// The large sample intentionally advances only one reading/travel phase.
// It must never skip protocol frames or consume suspended wall time.
function finishAutoEvent() {
  if (!scene.props!.moving) elapse(10000);
  expect(scene.props!.moving).toBe(true);
  elapse(10000);
}

beforeEach(() => {
  scene.fail = false;
  scene.autoReady = true;
  scene.props = null;
  reduced = false;
  motionChange = undefined;
  now = 0;
  requestId = 0;
  requests.clear();
  disconnect.mockClear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++requestId;
    requests.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => requests.delete(id));
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) => {
      motionChange = callback;
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
      disconnect = disconnect;
    },
  );
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("distributed transaction autoplay", () => {
  it("lazy-loads on intersection but waits for a rendered scene and half-stage visibility", async () => {
    scene.autoReady = false;
    render(<DistributedTransactionDemo kind="independent" />);
    expect(scene.loaded).not.toHaveBeenCalled();
    expect(screen.queryByTestId("transaction-scene")).toBeNull();
    expect(document.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    await view(true, 0.1);
    expect(scene.loaded).toHaveBeenCalledOnce();
    expect(screen.getByTestId("transaction-scene")).toBeTruthy();
    expect(screen.getByText("Loading 3D demo…")).toBeTruthy();
    expect(button("Step").disabled).toBe(true);
    await view(true);
    elapse(60000);
    expect(step()).toBe(0);
    expect(scene.props!.moving).toBe(false);
    expect(requests.size).toBe(0);
    await view(true, 0.49);
    act(() => scene.props!.onReady());
    expect(screen.queryByText("Loading 3D demo…")).toBeNull();
    elapse(60000);
    expect(scene.props!.moving).toBe(false);
    await view(true, 0.5);
    tick();
    tick(1099);
    expect(scene.props!.moving).toBe(false);
    tick(1);
    expect(scene.props!.moving).toBe(true);
    expect(step()).toBe(0);
    elapse(1600);
    expect(step()).toBe(1);
  });

  it("holds the initial state, applies arrivals immediately, then gives the new state reading time", async () => {
    render(<DistributedTransactionDemo kind="placement" />);
    await view(true);
    expect(button("Pause").disabled).toBe(false);
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("off");
    tick();
    tick(1099);
    expect(scene.props!.moving).toBe(false);
    tick(1);
    expect(scene.props!.moving).toBe(true);
    tick();
    tick(549);
    expect(step()).toBe(0);
    expect(
      scene.props!.frame.accounts.every((account) => account.pending === 0),
    ).toBe(true);
    tick(1);
    expect(step()).toBe(1);
    expect(scene.props!.moving).toBe(false);
    expect(
      scene.props!.frame.accounts.map((account) => account.pending),
    ).toEqual([-10, 10]);
    tick();
    tick(1049);
    expect(scene.props!.moving).toBe(false);
    tick(1);
    expect(scene.props!.moving).toBe(true);
    elapse(550);
    expect(step()).toBe(2);
    expect(
      scene.props!.frame.accounts.map((account) => account.balance),
    ).toEqual([90, 110]);
    expect(figure().dataset.playback).toBe("complete");
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    expect(requests.size).toBe(0);
    await view(false);
    await view(true);
    elapse(120000);
    expect(step()).toBe(2);
    expect(requests.size).toBe(0);
  });

  it("suspends reading time offscreen and in hidden documents without skipping the initial hold", async () => {
    render(<DistributedTransactionDemo kind="two-phase" />);
    await view(true);
    elapse(400);
    await view(true, 0.49);
    expect(requests.size).toBe(0);
    elapse(60000);
    await view(true);
    tick();
    tick(300);
    hideDocument(true);
    expect(requests.size).toBe(0);
    elapse(60000);
    hideDocument(false);
    tick();
    tick(399);
    expect(scene.props!.moving).toBe(false);
    tick(1);
    expect(scene.props!.moving).toBe(true);
    expect(scene.props!.progress.current).toBe(0);
    expect(step()).toBe(0);
  });

  it("suspends packets offscreen and while hidden without adding suspended time", async () => {
    render(<DistributedTransactionDemo kind="two-phase" />);
    await view(true);
    fireEvent.click(button("Step"));
    elapse(400);
    const progress = scene.props!.progress.current;
    await view(true, 0.49);
    elapse(60000);
    expect(scene.props!.progress.current).toBe(progress);
    expect(requests.size).toBe(0);
    await view(true);
    tick();
    expect(scene.props!.progress.current).toBe(progress);
    hideDocument(true);
    elapse(60000);
    hideDocument(false);
    tick();
    expect(scene.props!.progress.current).toBe(progress);
    tick(799);
    expect(step()).toBe(0);
    tick(1);
    expect(step()).toBe(1);
  });

  it("preserves an explicit pause through visibility changes, Replay, and scenario selection", async () => {
    render(<DistributedTransactionDemo kind="placement" />);
    await view(true);
    elapse(400);
    fireEvent.click(button("Pause"));
    expect(figure().dataset.playback).toBe("paused");
    await view(false);
    hideDocument(true);
    elapse(60000);
    hideDocument(false);
    await view(true);
    elapse(60000);
    expect(scene.props!.moving).toBe(false);
    expect(requests.size).toBe(0);
    fireEvent.click(button("Replay"));
    elapse(60000);
    expect(step()).toBe(0);
    expect(requests.size).toBe(0);
    fireEvent.click(button("Separate"));
    elapse(60000);
    expect(figure().dataset.playback).toBe("paused");
    expect(scene.props!.moving).toBe(false);
    fireEvent.click(button("Play"));
    elapse(1100);
    expect(scene.props!.moving).toBe(true);
    elapse(1200);
    expect(step()).toBe(1);
  });

  it("keeps auto intent on Replay and scenario changes without resetting the camera", async () => {
    render(<DistributedTransactionDemo kind="placement" />);
    await view(true);
    fireEvent.click(button("Reset view"));
    const cameraRevision = scene.props!.viewReset;
    elapse(1100);
    elapse(250);
    const oldProgress = scene.props!.progress;
    fireEvent.click(button("Separate"));
    expect(step()).toBe(0);
    expect(scene.props!.moving).toBe(false);
    expect(scene.props!.progress).not.toBe(oldProgress);
    expect(scene.props!.progress.current).toBe(0);
    expect(scene.props!.viewReset).toBe(cameraRevision);
    finishAutoEvent();
    expect(step()).toBe(1);
    fireEvent.click(button("Replay"));
    expect(step()).toBe(0);
    expect(figure().dataset.playback).toBe("auto");
    expect(button("Separate").getAttribute("aria-pressed")).toBe("true");
    expect(scene.props!.viewReset).toBe(cameraRevision);
    finishAutoEvent();
    expect(step()).toBe(1);
  });

  it("holds the blocked 2PC state before automatically recovering its durable decision", async () => {
    const scenario = DEMOS["two-phase"].scenarios.find(
      (item) => item.id === "interrupted",
    )!;
    const gate = scenario.frames.findIndex((frame) => frame.recoveryAction);
    render(<DistributedTransactionDemo kind="two-phase" />);
    await view(true);
    fireEvent.click(button(scenario.label));
    for (let index = 0; index < gate; index++) finishAutoEvent();
    expect(step()).toBe(gate);
    expect(button("Recover coordinator").disabled).toBe(false);
    expect(screen.getByRole("status").textContent).toContain(
      "Next: Recover coordinator.",
    );
    expect(scene.props!.frame.accounts[1]).toMatchObject({
      balance: 100,
      pending: 10,
      locked: true,
      state: "prepared",
    });
    expect(scene.props!.frame.coordinator.record).toBe("COMMIT");
    tick();
    tick(3399);
    expect(scene.props!.moving).toBe(false);
    expect(scene.props!.frame.coordinator.online).toBe(false);
    tick(1);
    expect(scene.props!.moving).toBe(true);
    elapse(550);
    expect(step()).toBe(gate + 1);
    expect(scene.props!.frame.coordinator.online).toBe(true);
    expect(scene.props!.frame.accounts[1].state).toBe("prepared");
    finishAutoEvent();
    expect(
      scene.props!.frame.accounts.map((account) => account.balance),
    ).toEqual([90, 110]);
  });

  const scenarios = (Object.keys(DEMOS) as DemoKind[]).flatMap((kind) =>
    DEMOS[kind].scenarios.map((scenario) => ({ kind, scenario })),
  );
  it.each(scenarios)(
    "autoplays $kind / $scenario.id through every authored frame and settles",
    async ({ kind, scenario }) => {
      render(<DistributedTransactionDemo kind={kind} />);
      await view(true);
      if (DEMOS[kind].scenarios.length > 1)
        fireEvent.click(button(scenario.label));
      for (let index = 1; index < scenario.frames.length; index++) {
        finishAutoEvent();
        expect(step()).toBe(index);
        expect(scene.props!.frame).toEqual(scenario.frames[index]);
      }
      expect(figure().dataset.playback).toBe("complete");
      expect(button("Step").disabled).toBe(true);
      expect(button("Play").disabled).toBe(true);
      expect(requests.size).toBe(0);
      await view(false);
      await view(true);
      elapse(120000);
      expect(step()).toBe(scenario.frames.length - 1);
      expect(scene.props!.frame).toEqual(scenario.frames.at(-1));
      expect(requests.size).toBe(0);
    },
  );
});

describe("distributed transaction manual controls and fallback", () => {
  it("makes Step skip reading, deliver exactly one event, and retain the old final progress sample", async () => {
    render(<DistributedTransactionDemo kind="two-phase" />);
    await view(true);
    fireEvent.click(button("Step"));
    expect(scene.props!.moving).toBe(true);
    expect(button("Step").disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain(
      "In flight: Prepare",
    );
    const inFlight = scene.props!.progress;
    tick();
    tick(600);
    expect(inFlight.current).toBe(0.5);
    expect(
      scene.props!.frame.accounts.map((account) => account.pending),
    ).toEqual([0, 0]);
    tick(599);
    expect(step()).toBe(0);
    tick(1);
    expect(step()).toBe(1);
    expect(inFlight.current).toBe(1);
    expect(scene.props!.progress).not.toBe(inFlight);
    expect(scene.props!.progress.current).toBe(0);
    expect(scene.props!.frame.accounts.every((account) => account.locked)).toBe(
      true,
    );
    expect(button("Step").disabled).toBe(false);
    expect(figure().dataset.playback).toBe("paused");
    elapse(60000);
    expect(step()).toBe(1);
    expect(requests.size).toBe(0);
  });

  it("lets Step resume only the paused in-flight event while Play resumes automatic playback", async () => {
    render(<DistributedTransactionDemo kind="two-phase" />);
    await view(true);
    elapse(1100);
    elapse(400);
    const progress = scene.props!.progress.current;
    fireEvent.click(button("Pause"));
    expect(screen.getByRole("status").textContent).toContain("Paused: Prepare");
    expect(button("Step").disabled).toBe(false);
    expect(requests.size).toBe(0);
    elapse(120000);
    expect(scene.props!.progress.current).toBe(progress);
    fireEvent.click(button("Step"));
    tick();
    expect(scene.props!.progress.current).toBe(progress);
    tick(799);
    expect(step()).toBe(0);
    tick(1);
    expect(step()).toBe(1);
    expect(figure().dataset.playback).toBe("paused");
    elapse(60000);
    expect(step()).toBe(1);
    fireEvent.click(button("Play"));
    finishAutoEvent();
    expect(step()).toBe(2);
    expect(figure().dataset.playback).toBe("auto");
  });

  it("starts reduced motion at a stable frame and supports discrete Step and Replay", async () => {
    reduced = true;
    render(<DistributedTransactionDemo kind="placement" />);
    await view(true);
    expect(scene.props!.reduced).toBe(true);
    expect(scene.props!.moving).toBe(false);
    expect(button("Play").disabled).toBe(true);
    expect(button("Step").disabled).toBe(false);
    expect(
      screen.getByText(/Reduced motion: Step advances without animation/),
    ).toBeTruthy();
    expect(requests.size).toBe(0);
    elapse(60000);
    expect(step()).toBe(0);
    fireEvent.click(button("Step"));
    expect(step()).toBe(1);
    fireEvent.click(button("Step"));
    expect(
      scene.props!.frame.accounts.map((account) => account.balance),
    ).toEqual([90, 110]);
    expect(button("Step").disabled).toBe(true);
    fireEvent.click(button("Replay"));
    expect(step()).toBe(0);
    expect(button("Step").disabled).toBe(false);
    expect(button("Play").disabled).toBe(true);
    expect(requests.size).toBe(0);
  });

  it("cancels a flight on reduced-motion changes and does not restart on visibility or preference changes", async () => {
    render(<DistributedTransactionDemo kind="two-phase" />);
    await view(true);
    elapse(1100);
    elapse(600);
    expect(scene.props!.progress.current).toBe(0.5);
    const cancelledProgress = scene.props!.progress;
    setReduced(true);
    expect(scene.props!.moving).toBe(false);
    expect(scene.props!.progress).not.toBe(cancelledProgress);
    expect(scene.props!.progress.current).toBe(0);
    expect(step()).toBe(0);
    expect(requests.size).toBe(0);
    expect(button("Step").disabled).toBe(false);
    await view(false);
    await view(true);
    setReduced(false);
    elapse(60000);
    expect(step()).toBe(0);
    expect(scene.props!.moving).toBe(false);
    expect(figure().dataset.playback).toBe("paused");
    fireEvent.click(button("Step"));
    elapse(1200);
    expect(step()).toBe(1);
    expect(figure().dataset.playback).toBe("paused");
  });

  it("keeps autoplay, account state, and manual controls usable without WebGL", async () => {
    scene.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DistributedTransactionDemo kind="placement" />);
    await view(true);
    expect(
      screen.getByText(/3D is unavailable\. Follow every step/),
    ).toBeTruthy();
    expect(button("Reset view").disabled).toBe(true);
    expect(screen.queryByText("Loading 3D demo…")).toBeNull();
    elapse(1100);
    elapse(550);
    expect(step()).toBe(1);
    expect(figure().querySelector(".dt-balance")?.textContent).toContain(
      "pending −$10",
    );
    fireEvent.click(button("Pause"));
    fireEvent.click(button("Step"));
    elapse(550);
    expect(step()).toBe(2);
    expect(screen.getByText("$90")).toBeTruthy();
    expect(screen.getByText("$110")).toBeTruthy();
    fireEvent.click(button("Replay"));
    expect(step()).toBe(0);
    expect(figure().dataset.playback).toBe("paused");
  });

  it("cancels its pending frame and disconnects observation on unmount", async () => {
    const { unmount } = render(<DistributedTransactionDemo kind="two-phase" />);
    await view(true);
    tick();
    expect(requests.size).toBe(1);
    unmount();
    expect(requests.size).toBe(0);
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
