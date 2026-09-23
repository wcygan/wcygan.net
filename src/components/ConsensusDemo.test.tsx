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
import { ConsensusDemo } from "./ConsensusDemo";
import { LESSONS } from "~/demos/consensus/model";
import type { ConsensusSceneProps } from "~/demos/consensus/types";

const scene = vi.hoisted(() => ({ unavailable: false }));
vi.mock("~/demos/consensus/Scene", () => ({
  default: ({
    onReady,
    onUnavailable,
    frameIndex,
    active,
  }: ConsensusSceneProps) => {
    useEffect(() => {
      if (scene.unavailable) onUnavailable();
      else onReady();
    }, [onReady, onUnavailable]);
    return (
      <div data-testid="scene" data-step={frameIndex} data-active={active} />
    );
  },
}));
let observer: IntersectionObserverCallback;
let reduced = false;
const view = async (visible: boolean) => {
  await act(async () =>
    observer(
      [
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
};
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const next = () =>
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
const step = () =>
  Number(document.querySelector("figure")?.getAttribute("data-step"));

beforeEach(() => {
  vi.useFakeTimers();
  scene.unavailable = false;
  reduced = false;
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observer = callback;
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
});

describe("consensus walkthrough playback", () => {
  it("starts on an inspectable frame, settles permanently, and replays without resetting the view", async () => {
    render(<ConsensusDemo topic="replication" />);
    await view(true);
    tick(5000);
    expect(step()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Top view" }));
    for (let index = 1; index < LESSONS.replication.frames.length; index++)
      next();
    expect(step()).toBe(LESSONS.replication.frames.length - 1);
    await view(false);
    await view(true);
    tick(15000);
    expect(step()).toBe(LESSONS.replication.frames.length - 1);
    expect(screen.queryByText(/Raft walkthrough|Raft paper/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(step()).toBe(0);
    expect(
      screen
        .getByRole("button", { name: "Top view" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(document.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
  });

  it("pauses automatic progression offscreen and in hidden documents, retaining manual pause", async () => {
    render(<ConsensusDemo topic="replication" />);
    await view(true);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    tick(4200);
    expect(step()).toBe(1);
    await view(false);
    tick(20000);
    expect(step()).toBe(1);
    await view(true);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    tick(20000);
    expect(step()).toBe(1);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    fireEvent(document, new Event("visibilitychange"));
    tick(4200);
    expect(step()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await view(false);
    await view(true);
    tick(20000);
    expect(step()).toBe(2);
  });

  it("retains all steps and server state with reduced motion", async () => {
    reduced = true;
    render(<ConsensusDemo topic="repair" />);
    await view(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Play",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    next();
    expect(step()).toBe(1);
    fireEvent.click(screen.getByText("Inspect server state"));
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      LESSONS.repair.frames[1].detail,
    );
  });

  it("opens the complete HTML state and keeps controls working when WebGL fails", async () => {
    scene.unavailable = true;
    render(<ConsensusDemo topic="snapshot" />);
    await view(true);
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(document.querySelector("details")?.open).toBe(true);
    expect(screen.getByRole("table")).toBeTruthy();
    next();
    expect(step()).toBe(1);
    expect(screen.getByRole("status").textContent).toContain(
      LESSONS.snapshot.frames[1].detail,
    );
    expect(screen.getByRole("table").textContent).toContain("Snapshot through");
  });

  it("keeps each server’s local leader knowledge available in the inspector", async () => {
    render(<ConsensusDemo topic="partition" />);
    await view(true);
    fireEvent.click(screen.getByText("Inspect server state"));
    next();
    next();
    expect(
      screen.getByRole("row", { name: /A · leader/ }).textContent,
    ).toContain("Known leader: A");
    expect(
      screen.getByRole("row", { name: /C · leader/ }).textContent,
    ).toContain("Known leader: C");
    expect(
      screen.getByRole("row", { name: /D · follower/ }).textContent,
    ).toContain("Known leader: none");
    next();
    expect(
      screen.getByRole("row", { name: /D · follower/ }).textContent,
    ).toContain("Known leader: C");
  });
});
