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
import { resizeCanvas } from "./viewport";

// Two full acts play per loop, then the completed comparison holds long enough
// for the Activity Task's terminal rows to be read before the animation resets.
const ANIMATION_MS = 19000;
const FINAL_HOLD_MS = 2000;
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
  let frameId: number | undefined;
  let lastTime = 0;
  let loopTime = state.progress * ANIMATION_MS;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let inViewport = true;

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

  function loop(now: number) {
    if (!shouldAnimate()) {
      frameId = undefined;
      return;
    }

    const dt = lastTime === 0 ? 0 : Math.min(now - lastTime, 80);
    lastTime = now;
    loopTime = (loopTime + dt) % LOOP_MS;
    state.progress =
      loopTime >= ANIMATION_MS
        ? REDUCED_MOTION_PROGRESS
        : loopTime / ANIMATION_MS;
    render();
    frameId = requestAnimationFrame(loop);
  }

  function scheduleLoop() {
    if (frameId !== undefined || !shouldAnimate()) return;
    lastTime = 0;
    frameId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (frameId === undefined) return;
    cancelAnimationFrame(frameId);
    frameId = undefined;
  }

  function shouldAnimate() {
    return state.playing && inViewport && !document.hidden;
  }

  function syncPlayback() {
    if (shouldAnimate()) {
      scheduleLoop();
    } else {
      stopLoop();
    }
  }

  function handleVisibilityChange() {
    syncPlayback();
    render();
  }

  function handleMotionPreferenceChange() {
    state.playing = !motionQuery.matches;
    state.progress = motionQuery.matches ? REDUCED_MOTION_PROGRESS : 0;
    loopTime = state.progress * ANIMATION_MS;
    syncPlayback();
    render();
  }

  function handleIntersection(entries: IntersectionObserverEntry[]) {
    const nextInViewport = entries.some((entry) => entry.isIntersecting);
    if (nextInViewport === inViewport) return;

    inViewport = nextInViewport;
    syncPlayback();
    if (inViewport) render();
  }

  return {
    start() {
      resizeObserver = new ResizeObserver(render);
      resizeObserver.observe(canvas);
      intersectionObserver = new IntersectionObserver(handleIntersection, {
        rootMargin: "160px 0px",
      });
      intersectionObserver.observe(canvas);
      motionQuery.addEventListener("change", handleMotionPreferenceChange);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      render();
      syncPlayback();
    },
    destroy() {
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      motionQuery.removeEventListener("change", handleMotionPreferenceChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
    snapshot() {
      return currentSnapshot();
    },
  };
}
