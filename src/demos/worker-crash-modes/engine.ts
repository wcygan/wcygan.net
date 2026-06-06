import {
  deriveCrashSnapshot,
  REDUCED_MOTION_PROGRESS,
  type CrashDemoState,
  type CrashSnapshot,
} from "./model";
import {
  drawWorkerCrashModesDemo,
  measureCrashDemoHeight,
} from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

// Two full acts play per loop, then the completed comparison holds long enough
// for the Activity Task's terminal rows to be read before the animation resets.
const ANIMATION_MS = 34000;
const FINAL_HOLD_MS = 5000;
const LOOP_MS = ANIMATION_MS + FINAL_HOLD_MS;

export type WorkerCrashModesDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): CrashSnapshot;
};

export function createWorkerCrashModesDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: CrashSnapshot) => void,
): WorkerCrashModesDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: CrashDemoState = {
    progress: motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0,
    playing: !motionQuery.matches,
  };
  let loopTime = state.progress * ANIMATION_MS;

  function currentSnapshot() {
    return deriveCrashSnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const snapshot = currentSnapshot();

    // Size the canvas to the content before drawing, so the element never
    // reserves proportion-driven whitespace below the logs. The guard keeps the
    // ResizeObserver from looping on a height it just settled.
    const layoutWidth = canvas.getBoundingClientRect().width || 1;
    const targetHeight = measureCrashDemoHeight(
      layoutWidth,
      snapshot.workflowTask.maxRows,
      snapshot.activity.maxRows,
    );
    const heightPx = `${targetHeight}px`;
    if (canvas.style.height !== heightPx) {
      canvas.style.height = heightPx;
    }

    const viewport = resizeCanvas(canvas);
    drawWorkerCrashModesDemo(ctx, snapshot, viewport);
    onSnapshot?.(snapshot);
  }

  return createLoopingCanvasEngine({
    canvas,
    motionQuery,
    render,
    snapshot: currentSnapshot,
    shouldPlay: () => state.playing,
    advance(deltaMs) {
      loopTime = (loopTime + deltaMs) % LOOP_MS;
      state.progress =
        loopTime >= ANIMATION_MS
          ? REDUCED_MOTION_PROGRESS
          : loopTime / ANIMATION_MS;
    },
    onMotionPreferenceChange(prefersReducedMotion) {
      state.playing = !prefersReducedMotion;
      state.progress = prefersReducedMotion ? REDUCED_MOTION_PROGRESS : 0;
      loopTime = state.progress * ANIMATION_MS;
    },
  });
}
