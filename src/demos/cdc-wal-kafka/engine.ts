import {
  type DemoState,
  deriveWalKafkaSnapshot,
  progressForProducedCount,
} from "./model";
import { drawWalKafkaDemo } from "./render-canvas";
import { resizeCanvas } from "./viewport";

const LOOP_MS = 9600;

export type CdcWalKafkaDemoEngine = {
  start(): void;
  destroy(): void;
};

export function createCdcWalKafkaDemo(
  canvas: HTMLCanvasElement,
): CdcWalKafkaDemoEngine {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const state: DemoState = {
    progress: prefersReducedMotion ? progressForProducedCount(1) : 0,
    playing: !prefersReducedMotion,
  };
  let frameId: number | undefined;
  let lastTime = 0;
  let resizeObserver: ResizeObserver | undefined;
  let resumeAfterHidden = false;

  function currentSnapshot() {
    return deriveWalKafkaSnapshot(state);
  }

  function render() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawWalKafkaDemo(ctx, snapshot, viewport);
  }

  function loop(now: number) {
    if (!state.playing) {
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
      resumeAfterHidden = state.playing;
      stopLoop();
      return;
    }

    if (resumeAfterHidden && state.playing) scheduleLoop();
    render();
  }

  return {
    start() {
      resizeObserver = new ResizeObserver(render);
      resizeObserver.observe(canvas);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      render();
      if (state.playing) scheduleLoop();
    },
    destroy() {
      stopLoop();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
  };
}
