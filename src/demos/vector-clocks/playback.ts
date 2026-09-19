import { EVENTS, snapshot } from "./model";
export const EVENT_MS = 4000;
export const SPEEDS = [0.5, 1, 2, 4] as const;
export const STEP_ENDS = [0, 1, 2, 3, 4, 5, 6] as const;
export function createPlayback(now = () => performance.now()) {
  let step = 0;
  let elapsed = 0;
  let anchor = now();
  let active = false;
  let stepping = false;
  let reduced = false;
  let speed = 1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const running = () => active && stepping && step < EVENTS.length;
  const duration = () => EVENT_MS;
  const getElapsed = () =>
    Math.min(
      duration(),
      elapsed + (running() ? Math.max(0, now() - anchor) * speed : 0),
    );
  const makeState = () => ({
    ...snapshot(step),
    step,
    completedSteps: STEP_ENDS.filter((end) => end <= step).length - 1,
    stepping,
    reduced,
    speed,
    running: running(),
    inProgress: step < EVENTS.length && (stepping || elapsed > 0),
  });
  let state = makeState();
  function sync() {
    elapsed = getElapsed();
    anchor = now();
  }
  function publish() {
    clearTimeout(timer);
    state = makeState();
    listeners.forEach((listener) => listener());
    if (running())
      timer = setTimeout(
        () => {
          step++;
          elapsed = 0;
          anchor = now();
          stepping = false;
          publish();
        },
        Math.max(1, (duration() - elapsed) / speed),
      );
  }
  return {
    getSnapshot: () => state,
    getProgress: () => getElapsed() / duration(),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setActive(value: boolean) {
      if (value === active) return;
      sync();
      active = value;
      publish();
    },
    setSpeed(value: number) {
      if (!SPEEDS.some((option) => option === value) || value === speed) return;
      sync();
      speed = value;
      publish();
    },
    setReduced(value: boolean) {
      if (value === reduced) return;
      sync();
      reduced = value;
      if (value) {
        if (stepping) step = STEP_ENDS.find((end) => end > step) ?? step;
        stepping = false;
        elapsed = 0;
      }
      publish();
    },
    step() {
      if (stepping) return;
      sync();
      if (step < EVENTS.length) {
        if (reduced) {
          step = STEP_ENDS.find((end) => end > step) ?? step;
          elapsed = 0;
        } else stepping = true;
      }
      publish();
    },
    restart() {
      step = 0;
      elapsed = 0;
      anchor = now();
      stepping = false;
      publish();
    },
    dispose() {
      clearTimeout(timer);
      active = false;
    },
  };
}
export type Playback = ReturnType<typeof createPlayback>;
export type PlaybackState = ReturnType<Playback["getSnapshot"]>;
