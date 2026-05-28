import {
  type ReplaySnapshot,
  type ReplayState,
  deriveReplaySnapshot,
  INITIAL_REPLAY_STATE,
  nextAppliedCount,
  REDUCED_MOTION_REPLAY_STATE,
} from "./replay-model";
import { drawMySqlRedoReplayDemo } from "./replay-render-canvas";
import { resizeCanvas } from "./viewport";

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
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const state: ReplayState = prefersReducedMotion
    ? { ...REDUCED_MOTION_REPLAY_STATE }
    : { ...INITIAL_REPLAY_STATE };
  const shouldAnimate = !prefersReducedMotion;
  let frameId: number | undefined;
  let lastTime = 0;
  let resizeObserver: ResizeObserver | undefined;
  let resumeAfterHidden = shouldAnimate;

  function currentSnapshot() {
    return deriveReplaySnapshot(state);
  }

  function render() {
    const ctx = canvas.getContext("2d");
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

  function loop(now: number) {
    const dt = lastTime === 0 ? 0 : Math.min(now - lastTime, 80);
    lastTime = now;
    advance(dt);
    render();
    frameId = requestAnimationFrame(loop);
  }

  function scheduleLoop() {
    if (frameId !== undefined) return;
    lastTime = 0;
    frameId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (frameId === undefined) return;
    cancelAnimationFrame(frameId);
    frameId = undefined;
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      resumeAfterHidden = frameId !== undefined;
      stopLoop();
      return;
    }

    if (resumeAfterHidden && shouldAnimate) scheduleLoop();
    render();
  }

  return {
    start() {
      resizeObserver = new ResizeObserver(render);
      resizeObserver.observe(canvas);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      render();
      if (shouldAnimate) scheduleLoop();
    },
    destroy() {
      stopLoop();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
    snapshot() {
      return currentSnapshot();
    },
  };
}
