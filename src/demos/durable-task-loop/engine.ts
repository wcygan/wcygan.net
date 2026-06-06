import {
  deriveDurableTaskLoopSnapshot,
  type DurableTaskLoopSnapshot,
  type DurableTaskLoopState,
  REDUCED_MOTION_PROGRESS,
} from "./model";
import { drawDurableTaskLoopDemo } from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const LOOP_MS = 34000;

export type DurableTaskLoopDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): DurableTaskLoopSnapshot;
};

export function createDurableTaskLoopDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: DurableTaskLoopSnapshot) => void,
): DurableTaskLoopDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: DurableTaskLoopState = {
    progress: motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0,
    playing: !motionQuery.matches,
  };

  function currentSnapshot() {
    return deriveDurableTaskLoopSnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawDurableTaskLoopDemo(ctx, snapshot, viewport);
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
