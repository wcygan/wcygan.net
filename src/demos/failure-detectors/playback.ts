import { createSimulation, isSettled, nextEventAt, transition } from "./model";
import { PLAYBACK_RATE } from "./presentation";
import type { Action, Config } from "./types";

/** One clock for transport, heart positions, and follower timers. React only
 * subscribes to protocol events; reading the clock never publishes a render. */
export function createPlayback(config: Partial<Config> = {}) {
  let state = createSimulation(config);
  let active = false;
  let anchor = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const timeAt = (wallTime: number) =>
    state.now + (active ? Math.max(0, wallTime - anchor) * PLAYBACK_RATE : 0);
  const getTime = () => timeAt(performance.now());
  const getSnapshot = () => state;
  const publish = () => listeners.forEach((listener) => listener());

  function synchronize(wallTime: number) {
    if (active)
      state = transition(state, { type: "advance", to: timeAt(wallTime) });
    anchor = wallTime;
    if (isSettled(state)) active = false;
  }

  function schedule() {
    clearTimeout(timer);
    timer = undefined;
    if (!active) return;
    const delay = (nextEventAt(state) - getTime()) / PLAYBACK_RATE;
    if (!Number.isFinite(delay)) return;
    // Round up so a fractional deadline cannot produce an early timer spin.
    timer = setTimeout(
      () => {
        synchronize(performance.now());
        schedule();
        publish();
      },
      Math.max(1, Math.ceil(delay)),
    );
  }

  return {
    getTime,
    getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setActive(value: boolean) {
      if (active === value) return;
      synchronize(performance.now());
      active = value && !isSettled(state);
      schedule();
      publish();
    },
    dispatch(action: Action) {
      const wallTime = performance.now();
      // Faults act at the current clock time, even between scheduled events.
      if (action.type !== "reset") synchronize(wallTime);
      state = transition(state, action);
      anchor = wallTime;
      if (isSettled(state)) active = false;
      schedule();
      publish();
    },
  };
}

export type Playback = ReturnType<typeof createPlayback>;
