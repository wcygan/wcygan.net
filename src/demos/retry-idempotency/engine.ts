import {
  deriveRetrySnapshot,
  REDUCED_MOTION_PROGRESS,
  type RetryDemoState,
  type RetrySnapshot,
} from "./model";
import { drawRetryIdempotencyDemo } from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const LOOP_MS = 15000;

export type RetryIdempotencyDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): RetrySnapshot;
};

export function createRetryIdempotencyDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: RetrySnapshot) => void,
): RetryIdempotencyDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: RetryDemoState = {
    progress: motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0,
    playing: !motionQuery.matches,
  };

  function currentSnapshot() {
    return deriveRetrySnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawRetryIdempotencyDemo(ctx, snapshot, viewport);
    onSnapshot?.(snapshot);
  }

  return createLoopingCanvasEngine({
    canvas,
    motionQuery,
    render,
    snapshot: currentSnapshot,
    shouldPlay: () => state.playing,
    advance(deltaMs) {
      state.progress = (state.progress + deltaMs / LOOP_MS) % 1;
    },
    onMotionPreferenceChange(prefersReducedMotion) {
      state.playing = !prefersReducedMotion;
      state.progress = prefersReducedMotion ? REDUCED_MOTION_PROGRESS : 0;
    },
  });
}
