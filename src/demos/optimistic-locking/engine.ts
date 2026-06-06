import {
  deriveRaceSnapshot,
  REDUCED_MOTION_PROGRESS,
  type RaceDemoState,
  type RaceSnapshot,
} from "./model";
import { drawOptimisticLockingRaceDemo } from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const LOOP_MS = 22400;

export type OptimisticLockingRaceDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): RaceSnapshot;
};

export function createOptimisticLockingRaceDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: RaceSnapshot) => void,
): OptimisticLockingRaceDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: RaceDemoState = {
    progress: motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0,
    playing: !motionQuery.matches,
  };

  function currentSnapshot() {
    return deriveRaceSnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawOptimisticLockingRaceDemo(ctx, snapshot, viewport);
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
