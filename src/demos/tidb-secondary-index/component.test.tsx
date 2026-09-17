/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TidbSecondaryIndexDemo } from "~/components/TidbSecondaryIndexDemo";
import type { Props } from "./Scene";
const scene = vi.hoisted(() => ({ props: null as Props | null, fail: false }));
vi.mock("./Scene", () => ({
  default: (props: Props) => {
    if (scene.fail) throw new Error("WebGL unavailable");
    scene.props = props;
    return <div data-testid="secondary-scene" />;
  },
}));
let intersection: IntersectionObserverCallback;
let reduced = false;
let motionChanged: () => void;
const visible = (value: boolean) =>
  act(async () => {
    intersection(
      [
        {
          isIntersecting: value,
          intersectionRatio: value ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
beforeEach(() => {
  scene.props = null;
  scene.fail = false;
  reduced = false;
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) => {
      motionChanged = callback;
    },
    removeEventListener() {},
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
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("secondary-index workbench", () => {
  it("starts paused and exposes each step and final record through HTML", async () => {
    render(<TidbSecondaryIndexDemo />);
    await visible(true);
    expect(scene.props?.state.step).toBe(0);
    expect(screen.getByRole("status").textContent).toContain(
      "Follow one lookup",
    );
    expect(screen.queryByLabelText("Query result")).toBeNull();
    click("Play");
    advance(600);
    click("Pause");
    const progress = scene.props!.playback.progress();
    advance(5000);
    expect(scene.props!.playback.progress()).toBe(progress);
    click("Step");
    expect(scene.props?.state).toMatchObject({ step: 1, settled: true });
    click("Play");
    advance(33000);
    expect(screen.getByRole("status").textContent).toContain("Step 14 of 14");
    expect(screen.getByLabelText("Query result").textContent).toContain(
      "427emailwill@example.comnameWill",
    );
    expect(
      (screen.getByRole("button", { name: "Step" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    click("Replay");
    expect(screen.queryByLabelText("Query result")).toBeNull();
  });
  it("suspends offscreen and in a hidden tab without discarding manual pause", async () => {
    render(<TidbSecondaryIndexDemo />);
    await visible(true);
    click("Play");
    advance(500);
    await visible(false);
    const progress = scene.props!.playback.progress();
    advance(5000);
    expect(scene.props!.playback.progress()).toBe(progress);
    await visible(true);
    advance(500);
    expect(scene.props!.playback.progress()).toBeGreaterThan(progress);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    const hiddenProgress = scene.props!.playback.progress();
    advance(5000);
    expect(scene.props!.playback.progress()).toBe(hiddenProgress);
    click("Pause");
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    advance(5000);
    expect(scene.props?.state.moving).toBe(false);
  });
  it("keeps camera and speed through replay and supplies reduced-motion state", async () => {
    render(<TidbSecondaryIndexDemo />);
    await visible(true);
    const stage = screen.getByRole("group", { name: /3D index lookup/ });
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    const view = scene.props!.view;
    fireEvent.change(screen.getByLabelText("Speed"), {
      target: { value: "2" },
    });
    click("Replay");
    expect(scene.props!.view).toEqual(view);
    expect(scene.props!.state.speed).toBe(2);
    act(() => {
      reduced = true;
      motionChanged();
    });
    expect(scene.props!.reduced).toBe(true);
    advance(18000);
    expect(scene.props!.state.step).toBe(14);
  });
  it("retains entries, controls and result after a renderer failure", async () => {
    scene.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TidbSecondaryIndexDemo />);
    await visible(true);
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(screen.getByText("will@example.com → 427")).toBeTruthy();
    click("Play");
    advance(34000);
    expect(screen.getByLabelText("Query result").textContent).toContain("Will");
  });
});
