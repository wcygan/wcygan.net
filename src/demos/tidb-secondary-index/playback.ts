import { LAST_STEP } from "./model";

export const STEP_DURATION_MS = 2400;
export { TIDB_PLAYBACK_SPEEDS as SPEEDS } from "~/demos/tidb-playback";
import type { TidbPlaybackSpeed as Speed } from "~/demos/tidb-playback";
export type { TidbPlaybackSpeed as Speed } from "~/demos/tidb-playback";
export interface Snapshot {
  step: number;
  playing: boolean;
  moving: boolean;
  speed: Speed;
  settled: boolean;
}

/** One continuous clock; subscribers only hear about controls and step boundaries. */
export function createPlayback() {
  let state: Snapshot = {
    step: 0,
    playing: false,
    moving: false,
    speed: 2,
    settled: true,
  };
  let elapsed = 0;
  const listeners = new Set<() => void>();
  const update = (next: Partial<Snapshot>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };
  const enter = (step: number, playing: boolean) => {
    elapsed = 0;
    const done = step === LAST_STEP;
    update({ step, playing: playing && !done, moving: !done, settled: done });
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    progress: () => Math.min(1, elapsed / STEP_DURATION_MS),
    setSpeed(speed: Speed) {
      update({ speed });
    },
    play() {
      if (state.step === 0 || state.step === LAST_STEP) enter(1, true);
      else if (state.settled) enter(state.step + 1, true);
      else update({ playing: true, moving: true });
    },
    pause() {
      update({ playing: false, moving: false });
    },
    step() {
      if (state.step === LAST_STEP) return;
      if (state.step > 0 && !state.settled) {
        elapsed = STEP_DURATION_MS;
        update({ playing: false, moving: false, settled: true });
      } else enter(state.step + 1, false);
    },
    replay() {
      enter(1, true);
    },
    advance(deltaMs: number) {
      if (!state.moving) return;
      elapsed += Math.max(0, deltaMs) * state.speed;
      while (elapsed >= STEP_DURATION_MS && state.moving) {
        const remaining = elapsed - STEP_DURATION_MS;
        if (state.playing) {
          enter(state.step + 1, true);
          if (state.moving) elapsed = remaining;
        } else {
          elapsed = STEP_DURATION_MS;
          update({ moving: false, settled: true });
        }
      }
    },
  };
}
export type Playback = ReturnType<typeof createPlayback>;
