import {
  type DemoState,
  deriveLagSnapshot,
  type LagSnapshot,
  REDUCED_MOTION_PROGRESS,
} from "./model";
import { drawReplicationLagDemo } from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const LOOP_MS = 12800;

export type ReplicationLagDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): LagSnapshot;
};

export function createReplicationLagDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: LagSnapshot) => void,
): ReplicationLagDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: DemoState = {
    progress: motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0,
    playing: !motionQuery.matches,
  };

  function currentSnapshot() {
    return deriveLagSnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawReplicationLagDemo(ctx, snapshot, viewport);
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
