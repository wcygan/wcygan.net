import {
  type ReplaySnapshot,
  type ReplayState,
  deriveReplaySnapshot,
  INITIAL_REPLAY_STATE,
  nextAppliedCount,
  REDUCED_MOTION_REPLAY_STATE,
} from "./replay-model";
import { drawMySqlRedoReplayDemo } from "./replay-render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const BASE_STEP_MS = 1700;
const REPLAY_SPEED_MULTIPLIER = 1.56;
const STEP_MS = BASE_STEP_MS / REPLAY_SPEED_MULTIPLIER;

export type MySqlRedoReplayDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): ReplaySnapshot;
};

export function createMySqlRedoReplayDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: ReplaySnapshot) => void,
): MySqlRedoReplayDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: ReplayState = motionQuery.matches
    ? { ...REDUCED_MOTION_REPLAY_STATE }
    : { ...INITIAL_REPLAY_STATE };
  let playing = !motionQuery.matches;

  function currentSnapshot() {
    return deriveReplaySnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawMySqlRedoReplayDemo(ctx, snapshot, viewport);
    onSnapshot?.(snapshot);
  }

  function advance(dt: number) {
    state.stepProgress += dt / STEP_MS;
    while (state.stepProgress >= 1) {
      state.appliedCount = nextAppliedCount(state.appliedCount);
      state.stepProgress -= 1;
    }
  }

  function resetState(nextState: ReplayState) {
    state.appliedCount = nextState.appliedCount;
    state.stepProgress = nextState.stepProgress;
  }

  return createLoopingCanvasEngine({
    canvas,
    motionQuery,
    render,
    snapshot: currentSnapshot,
    shouldPlay: () => playing,
    advance,
    onMotionPreferenceChange(prefersReducedMotion) {
      playing = !prefersReducedMotion;
      resetState(
        prefersReducedMotion
          ? REDUCED_MOTION_REPLAY_STATE
          : INITIAL_REPLAY_STATE,
      );
    },
  });
}
