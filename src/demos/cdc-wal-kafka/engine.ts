import {
  type DemoState,
  deriveWalKafkaSnapshot,
  progressForProducedCount,
  type WalKafkaSnapshot,
} from "./model";
import { drawWalKafkaDemo } from "./render-canvas";
import { createLoopingCanvasEngine } from "../shared/looping-canvas-engine";
import { resizeCanvas } from "../shared/viewport";

const LOOP_MS = 16000;

export type CdcWalKafkaDemoEngine = {
  start(): void;
  destroy(): void;
  snapshot(): WalKafkaSnapshot;
};

export function createCdcWalKafkaDemo(
  canvas: HTMLCanvasElement,
  onSnapshot?: (snapshot: WalKafkaSnapshot) => void,
): CdcWalKafkaDemoEngine {
  const ctx = canvas.getContext("2d");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state: DemoState = {
    progress: motionQuery.matches ? progressForProducedCount(1) : 0,
    playing: !motionQuery.matches,
  };

  function currentSnapshot() {
    return deriveWalKafkaSnapshot(state);
  }

  function render() {
    if (!ctx) return;

    const viewport = resizeCanvas(canvas);
    const snapshot = currentSnapshot();
    drawWalKafkaDemo(ctx, snapshot, viewport);
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
      state.progress = prefersReducedMotion ? progressForProducedCount(1) : 0;
    },
  });
}
