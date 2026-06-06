import {
  type DemoState,
  deriveRoutingSnapshot,
  REDUCED_MOTION_PROGRESS,
  type RoutingSnapshot,
} from "./model";
import { drawHomeRegionRoutingDemo } from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const LOOP_MS = 13200;

export type HomeRegionRoutingDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): RoutingSnapshot;
};

export function createHomeRegionRoutingDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: RoutingSnapshot) => void,
): HomeRegionRoutingDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: DemoState = {
    progress: motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0,
    playing: !motionQuery.matches,
  };

  function currentSnapshot() {
    return deriveRoutingSnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawHomeRegionRoutingDemo(ctx, snapshot, viewport);
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
