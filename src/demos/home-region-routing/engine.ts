import {
  type DemoState,
  deriveRoutingSnapshot,
  REDUCED_MOTION_PROGRESS,
  type RoutingSnapshot,
} from "./model";
import { drawHomeRegionRoutingDemo } from "./render-canvas";
import { resizeCanvas } from "./viewport";

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
  let frameId: number | undefined;
  let lastTime = 0;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let inViewport = true;

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

  function loop(now: number) {
    if (!shouldAnimate()) {
      frameId = undefined;
      return;
    }

    const dt = lastTime === 0 ? 0 : Math.min(now - lastTime, 80);
    lastTime = now;
    state.progress = (state.progress + dt / LOOP_MS) % 1;
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
