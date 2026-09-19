/** @vitest-environment jsdom */
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FailureDetectorDemo } from "~/components/FailureDetectorDemo";
import type { Simulation } from "./types";
import type { Playback } from "./playback";

const scene = vi.hoisted(() => ({
  fail: false,
  state: null as Simulation | null,
  playback: null as Playback | null,
}));
vi.mock("./Scene", () => ({
  default: ({
    onReady,
    view,
    state,
    reduced,
    playback,
  }: {
    view: { kind: string; revision: number };
    state: Simulation;
    reduced: boolean;
    onReady: () => void;
    playback: Playback;
  }) => {
    useEffect(onReady, [onReady]);
    if (scene.fail) throw new Error("WebGL unavailable");
    scene.state = state;
    scene.playback = playback;
    return (
      <div
        data-testid="scene"
        data-view={`${view.kind}-${view.revision}`}
        data-reduced={reduced}
      />
    );
  },
}));
let intersection: IntersectionObserverCallback;
let reduced = false;
const clock = () => scene.playback?.getTime() ?? 0;
const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const view = async (visible: boolean) => {
  await act(async () => {
    intersection(
      [
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
};
beforeEach(() => {
  vi.useFakeTimers();
  scene.fail = false;
  scene.state = null;
  scene.playback = null;
  reduced = false;
  // jsdom does not implement native dialog methods; real focus/Escape behavior
  // is also exercised in the article's browser checks.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
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
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

describe("heartbeat scene controls", () => {
  it("exposes only four actions and node count, with no observer panels", async () => {
    render(<FailureDetectorDemo />);
    await view(true);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Reset",
      "Crash leader",
      "Cut random link",
      "Drop random heartbeat",
    ]);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(screen.queryByText("A’s view")).toBeNull();
    expect(screen.queryByText("Timing")).toBeNull();
    expect(document.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    expect(scene.state!.config.nodeCount).toBe(5);
  });

  it("autoplays at half speed and suspends offscreen or in hidden documents", async () => {
    render(<FailureDetectorDemo />);
    tick(1000);
    expect(clock()).toBe(0);
    await view(true);
    tick(1000);
    expect(clock()).toBe(500);
    await view(false);
    tick(1000);
    expect(clock()).toBe(500);
    await view(true);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    tick(1000);
    expect(clock()).toBe(500);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    fireEvent(document, new Event("visibilitychange"));
    tick(500);
    expect(clock()).toBe(750);
  });

  it("keeps reduced-motion experiments functional without projectile animation", async () => {
    reduced = true;
    render(<FailureDetectorDemo />);
    await view(true);
    expect(screen.getByTestId("scene").getAttribute("data-reduced")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Crash leader" }));
    tick(12000);
    expect(
      screen.getByRole("dialog", { name: /Demo paused: .* timed out/ }),
    ).toBeTruthy();
    expect(
      Object.values(scene.state!.followers).filter(
        (p) => p.role === "candidate",
      ),
    ).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Step" })).toBeNull();
  });

  it("freezes on the first timeout and stays paused after the diagnostic is dismissed", async () => {
    render(<FailureDetectorDemo />);
    await view(true);
    fireEvent.click(screen.getByRole("button", { name: "Crash leader" }));
    tick(1400); // Deliver the already-sent broadcast.
    const deadlines = Object.values(scene.state!.followers)
      .map(
        (p) =>
          p.timerStartedAt +
          Math.round(scene.state!.config.electionMin * (1 + p.timeoutFraction)),
      )
      .sort((a, b) => a - b);
    tick(Math.ceil(((deadlines[0] - clock()) * 2) / 50) * 50);
    const dialog = screen.getByRole("dialog", {
      name: /Demo paused: .* timed out/,
    });
    expect(
      Object.values(scene.state!.followers).filter(
        (p) => p.role === "candidate",
      ),
    ).toHaveLength(1);
    const frozen = scene.state;
    const stopped = clock();
    expect(stopped).toBe(deadlines[0]);
    tick(12000);
    expect(scene.state).toBe(frozen);
    expect(dialog.textContent).toContain(
      "In Raft, it would start an election at this point.",
    );
    expect(dialog.textContent).toContain("Reset to begin again");
    for (const name of [
      "Crash leader",
      "Cut random link",
      "Drop random heartbeat",
    ])
      expect(
        (screen.getByRole("button", { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".fd-paused")!.textContent).toContain(
      "Reset to begin again",
    );
    await view(false);
    await view(true);
    tick(1000);
    expect(clock()).toBe(stopped);
    expect(scene.state).toBe(frozen);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(document.querySelector(".fd-paused")).toBeNull();
    tick(1000);
    expect(clock()).toBe(500);
    fireEvent.click(screen.getByRole("button", { name: "Crash leader" }));
    tick(13000);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("can reset directly from the diagnostic and closes it for the new experiment", async () => {
    render(<FailureDetectorDemo />);
    await view(true);
    fireEvent.click(screen.getByRole("button", { name: "Cut random link" }));
    tick(13000);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(scene.state!.transport.cut).toEqual([]);
    expect(clock()).toBe(0);
    tick(1000);
    expect(clock()).toBe(500);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reports random fault targets and resets faults while retaining count and camera", async () => {
    render(<FailureDetectorDemo />);
    await view(true);
    tick(500);
    const prior = clock(),
      evidence = scene.state!.followers.A;
    fireEvent.change(screen.getByRole("slider", { name: "Number of nodes" }), {
      target: { value: "3" },
    });
    expect(clock()).toBe(prior);
    expect(scene.state!.followers.A).toEqual(evidence);
    fireEvent.keyDown(
      screen.getByRole("group", { name: /Heartbeat network/ }),
      { key: "ArrowLeft" },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Drop random heartbeat" }),
    );
    expect(document.querySelector(".fd-faults")!.textContent).toContain(
      `Next heartbeat to ${scene.state!.transport.dropNext}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cut random link" }));
    expect(document.querySelector(".fd-faults")!.textContent).toContain(
      `B–${scene.state!.transport.cut[0]}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(clock()).toBe(0);
    expect(scene.state!.config.nodeCount).toBe(3);
    expect(document.querySelector(".fd-faults")!.textContent).toBe("");
    expect(screen.getByTestId("scene").getAttribute("data-view")).toBe(
      "left-1",
    );
  });

  it("does not announce every heartbeat", async () => {
    render(<FailureDetectorDemo />);
    await view(true);
    const statuses = () =>
      screen.getAllByRole("status").map((s) => s.textContent);
    const initial = statuses();
    tick(4000);
    expect(statuses()).toEqual(initial);
  });

  it("keeps fault controls and timeout explanations working when WebGL fails", async () => {
    scene.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<FailureDetectorDemo />);
    await view(true);
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Crash leader" }));
    tick(12000);
    expect(
      screen.getByRole("dialog", { name: /Demo paused: .* timed out/ }),
    ).toBeTruthy();
    expect(
      [...document.querySelectorAll(".fd-fallback li")].filter((li) =>
        li.textContent?.includes("Timed out"),
      ),
    ).toHaveLength(1);
    expect(document.querySelectorAll(".fd-fallback li")).toHaveLength(4);
  });
});
