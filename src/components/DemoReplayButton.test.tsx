/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoReplayButton } from "./DemoReplayButton";

let prefersReducedMotion = false;
let documentHidden = false;
let nextFrameId = 1;
let pendingFrames = new Map<number, FrameRequestCallback>();

function runAnimationFrame(now: number) {
  const frames = [...pendingFrames.values()];
  pendingFrames.clear();
  for (const frame of frames) frame(now);
}

describe("DemoReplayButton", () => {
  beforeEach(() => {
    prefersReducedMotion = false;
    documentHidden = false;
    nextFrameId = 1;
    pendingFrames = new Map();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => documentHidden,
    });

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        pendingFrames.set(frameId, callback);
        return frameId;
      }),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((frameId: number) => {
        pendingFrames.delete(frameId);
      }),
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches:
          query === "(prefers-reduced-motion: reduce)" && prefersReducedMotion,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(document, "hidden");
    vi.unstubAllGlobals();
  });

  it("replays immediately when the reader presses the button", () => {
    const onReplay = vi.fn();
    const { getByRole } = render(
      <DemoReplayButton
        ariaLabel="Replay the demo"
        isComplete={false}
        onReplay={onReplay}
      />,
    );

    const button = getByRole("button", { name: /Replay the demo/ });
    expect(button.dataset.replayProgress).toBe("0");

    fireEvent.click(button);

    expect(onReplay).toHaveBeenCalledOnce();
  });

  it("fills the progress border before automatically replaying", () => {
    const onReplay = vi.fn();
    const { getByRole } = render(
      <DemoReplayButton
        ariaLabel="Replay the demo"
        countdownDurationMs={4_000}
        isComplete
        onReplay={onReplay}
      />,
    );
    const button = getByRole("button", { name: /Replay the demo/ });

    act(() => runAnimationFrame(1_000));
    expect(button.dataset.replayProgress).toBe("0");

    act(() => runAnimationFrame(3_000));
    expect(button.dataset.replayProgress).toBe("50");
    expect(onReplay).not.toHaveBeenCalled();

    act(() => runAnimationFrame(5_000));
    expect(button.dataset.replayProgress).toBe("100");
    expect(onReplay).not.toHaveBeenCalled();

    act(() => runAnimationFrame(5_016));
    expect(onReplay).toHaveBeenCalledOnce();
    expect(button.dataset.replayProgress).toBe("0");
  });

  it("holds the completed state for reduced-motion readers", () => {
    prefersReducedMotion = true;
    const onReplay = vi.fn();
    const { getByRole } = render(
      <DemoReplayButton
        ariaLabel="Replay the demo"
        isComplete
        onReplay={onReplay}
      />,
    );
    const button = getByRole("button", { name: /Replay the demo/ });

    expect(button.dataset.countingDown).toBe("false");
    expect(button.dataset.replayProgress).toBe("0");
    expect(pendingFrames.size).toBe(0);
    expect(onReplay).not.toHaveBeenCalled();
  });

  it("pauses the countdown while the document is hidden", () => {
    const onReplay = vi.fn();
    const { getByRole } = render(
      <DemoReplayButton
        ariaLabel="Replay the demo"
        countdownDurationMs={4_000}
        isComplete
        onReplay={onReplay}
      />,
    );
    const button = getByRole("button", { name: /Replay the demo/ });

    act(() => runAnimationFrame(1_000));
    act(() => runAnimationFrame(3_000));
    expect(button.dataset.replayProgress).toBe("50");

    act(() => {
      documentHidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(button.dataset.countingDown).toBe("false");
    expect(pendingFrames.size).toBe(0);

    act(() => {
      documentHidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(button.dataset.countingDown).toBe("true");

    act(() => runAnimationFrame(6_000));
    expect(button.dataset.replayProgress).toBe("50");

    act(() => runAnimationFrame(7_000));
    expect(button.dataset.replayProgress).toBe("75");
    expect(onReplay).not.toHaveBeenCalled();
  });
});
