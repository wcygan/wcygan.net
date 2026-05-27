import {
  deriveWalWritePathSnapshot,
  INITIAL_WAL_WRITE_PATH_STATE,
  nextWalWritePathProgress,
  REDUCED_MOTION_WAL_WRITE_PATH_STATE,
  type WalWritePathSnapshot,
  type WalWritePathState,
} from "./write-path-model";
import { drawWalWritePathDemo } from "./write-path-render-canvas";
import { resizeCanvas } from "./viewport";

const CYCLE_MS = 5200;

export type WalWritePathDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): WalWritePathSnapshot;
};

export function createWalWritePathDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: WalWritePathSnapshot) => void,
): WalWritePathDemoEngine {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const state: WalWritePathState = prefersReducedMotion
    ? { ...REDUCED_MOTION_WAL_WRITE_PATH_STATE }
    : { ...INITIAL_WAL_WRITE_PATH_STATE };
  const shouldAnimate = !prefersReducedMotion;
  let frameId: number | undefined;
  let lastTime = 0;
  let resizeObserver: ResizeObserver | undefined;
  let resumeAfterHidden = shouldAnimate;

  function currentSnapshot() {
    return deriveWalWritePathSnapshot(state);
  }

  function render() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawWalWritePathDemo(ctx, snapshot, viewport);
    onSnapshot?.(snapshot);
  }

  function advance(dt: number) {
    state.progress = nextWalWritePathProgress(state.progress, dt / CYCLE_MS);
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
