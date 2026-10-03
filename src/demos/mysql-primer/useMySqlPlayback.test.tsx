/** @vitest-environment jsdom */
import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlPlaybackControls } from "~/components/MySqlPlaybackControls";
import { useMySqlPlayback } from "./useMySqlPlayback";
import { installPlaybackBrowser } from "./playback-test-utils";

function Lesson({ ready = true }: { ready?: boolean }) {
  const [step, setStep] = useState(0);
  const playback = useMySqlPlayback({
    complete: step === 3,
    beat: step,
    onAdvance: () => setStep((s) => s + 1),
    onReplay: () => setStep(0),
    delayMs: 1000,
    ready,
  });
  return (
    <figure>
      <div ref={playback.stageRef}>Step {step}</div>
      <MySqlPlaybackControls playback={playback} />
      <button
        onClick={() => {
          playback.pause();
          setStep((s) => Math.min(s + 1, 3));
        }}
      >
        Next step
      </button>
      <button
        onClick={() => {
          playback.pause();
          setStep(0);
        }}
      >
        Reset
      </button>
    </figure>
  );
}
let browser: ReturnType<typeof installPlaybackBrowser>;
beforeEach(() => {
  vi.useFakeTimers();
  browser = installPlaybackBrowser();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function tick(ms = 1000) {
  act(() => vi.advanceTimersByTime(ms));
}
function visible(value: boolean) {
  act(() => browser.visible(value));
}

describe("MySQL autoplay lifecycle", () => {
  it("starts only in view, advances at a readable pace, and remains settled at the end", () => {
    render(<Lesson />);
    tick(5000);
    expect(screen.getByText("Step 0")).toBeTruthy();
    visible(true);
    tick(999);
    expect(screen.getByText("Step 0")).toBeTruthy();
    tick(1);
    expect(screen.getByText("Step 1")).toBeTruthy();
    tick();
    tick();
    expect(screen.getByText("Step 3")).toBeTruthy();
    tick(5000);
    expect(screen.getByText("Step 3")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Play" }).hasAttribute("disabled"),
    ).toBe(true);
  });
  it("suspends offscreen and hidden work without catching up background time", () => {
    render(<Lesson />);
    visible(true);
    tick(700);
    visible(false);
    tick(8000);
    expect(screen.getByText("Step 0")).toBeTruthy();
    visible(true);
    tick(999);
    expect(screen.getByText("Step 0")).toBeTruthy();
    tick(1);
    expect(screen.getByText("Step 1")).toBeTruthy();
    act(() => browser.hidden(true));
    tick(8000);
    expect(screen.getByText("Step 1")).toBeTruthy();
    act(() => browser.hidden(false));
    tick();
    expect(screen.getByText("Step 2")).toBeTruthy();
  });
  it("waits for the first rendered frame and ignores unrelated rerenders", () => {
    const view = render(<Lesson ready={false} />);
    visible(true);
    tick(8000);
    expect(screen.getByText("Step 0")).toBeTruthy();
    view.rerender(<Lesson ready />);
    tick(700);
    view.rerender(<Lesson ready />);
    tick(300);
    expect(screen.getByText("Step 1")).toBeTruthy();
  });
  it("manual steps and reset pause, while Replay starts a new complete sequence", () => {
    render(<Lesson />);
    visible(true);
    tick(400);
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    tick(5000);
    expect(screen.getByText("Step 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    tick();
    expect(screen.getByText("Step 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    tick(5000);
    expect(screen.getByText("Step 0")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    tick();
    tick();
    tick();
    expect(screen.getByText("Step 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(screen.getByText("Step 0")).toBeTruthy();
    tick();
    expect(screen.getByText("Step 1")).toBeTruthy();
  });
  it("preserves pause through scrolling and tab visibility changes", () => {
    render(<Lesson />);
    visible(true);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    visible(false);
    act(() => browser.hidden(true));
    visible(true);
    act(() => browser.hidden(false));
    tick(8000);
    expect(screen.getByText("Step 0")).toBeTruthy();
  });
  it("honors initial and changed reduced-motion preferences, with manual steps available", () => {
    browser = installPlaybackBrowser(true);
    render(<Lesson />);
    visible(true);
    tick(8000);
    expect(screen.getByText("Step 0")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Step 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    tick(5000);
    expect(screen.getByText("Step 0")).toBeTruthy();
    act(() => browser.motion(false));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    tick();
    expect(screen.getByText("Step 1")).toBeTruthy();
    act(() => browser.motion(true));
    tick(5000);
    expect(screen.getByText("Step 1")).toBeTruthy();
  });
  it("cleans up pending advancement on unmount", () => {
    const view = render(<Lesson />);
    visible(true);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
