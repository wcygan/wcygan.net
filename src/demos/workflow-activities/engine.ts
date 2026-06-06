import {
  type ActivitiesSnapshot,
  deriveActivitiesSnapshot,
  REDUCED_MOTION_PROGRESS,
  type WorkflowDemoState,
} from "./model";
import { drawWorkflowActivitiesDemo } from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const LOOP_MS = 17000;

export type WorkflowActivitiesDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): ActivitiesSnapshot;
};

export function createWorkflowActivitiesDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: ActivitiesSnapshot) => void,
): WorkflowActivitiesDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: WorkflowDemoState = {
    progress: motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0,
    playing: !motionQuery.matches,
  };

  function currentSnapshot() {
    return deriveActivitiesSnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawWorkflowActivitiesDemo(ctx, snapshot, viewport);
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
