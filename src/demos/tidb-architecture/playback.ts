import { INITIAL_OPERATION, operationSteps, type Operation } from "./model";

export const STEP_DURATION_MS = 2400;
export { TIDB_PLAYBACK_SPEEDS as PLAYBACK_SPEEDS } from "~/demos/tidb-playback";
import type { TidbPlaybackSpeed as PlaybackSpeed } from "~/demos/tidb-playback";
export type { TidbPlaybackSpeed as PlaybackSpeed } from "~/demos/tidb-playback";
export interface PlaybackSnapshot {
  operation: Operation;
  step: number;
  playing: boolean;
  moving: boolean;
  revision: number;
  speed: PlaybackSpeed;
}

/** One clock drives narration and packets. React is notified only at event boundaries. */
export function createPlayback() {
  let snapshot: PlaybackSnapshot = {
    operation: INITIAL_OPERATION,
    step: 0,
    playing: false,
    moving: false,
    revision: 0,
    speed: 2,
  };
  let elapsed = 0;
  const listeners = new Set<() => void>();
  const lastStep = () => operationSteps(snapshot.operation).length - 1;
  function update(next: Partial<PlaybackSnapshot>) {
    snapshot = { ...snapshot, ...next, revision: snapshot.revision + 1 };
    listeners.forEach((listener) => listener());
  }
  function enter(step: number, playing: boolean) {
    elapsed = 0;
    const complete = step === lastStep();
    update({
      step,
      playing: playing && !complete,
      moving: !complete && step > 0,
    });
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    progress: () => Math.min(1, elapsed / STEP_DURATION_MS),
    setSpeed(speed: PlaybackSpeed) {
      if (speed !== snapshot.speed) update({ speed });
    },
    reset(operation: Operation, autoplay = false) {
      elapsed = 0;
      update({
        operation,
        step: autoplay ? 1 : 0,
        playing: autoplay,
        moving: autoplay,
      });
    },
    play() {
      if (snapshot.step === 0 || snapshot.step === lastStep()) enter(1, true);
      else if (elapsed >= STEP_DURATION_MS) enter(snapshot.step + 1, true);
      else update({ playing: true, moving: true });
    },
    pause() {
      update({ playing: false, moving: false });
    },
    step() {
      if (snapshot.step === lastStep()) return;
      if (snapshot.step > 0 && elapsed < STEP_DURATION_MS) {
        elapsed = STEP_DURATION_MS;
        update({ playing: false, moving: false });
      } else enter(snapshot.step + 1, false);
    },
    advance(deltaMs: number) {
      if (!snapshot.moving) return;
      elapsed += Math.max(0, deltaMs) * snapshot.speed;
      if (elapsed < STEP_DURATION_MS) return;
      elapsed = STEP_DURATION_MS;
      if (snapshot.playing) enter(snapshot.step + 1, true);
      else update({ moving: false });
    },
  };
}
export type Playback = ReturnType<typeof createPlayback>;
