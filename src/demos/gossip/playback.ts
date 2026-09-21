import { BEAT_MS, DEFAULT_SPEED, DURATION } from "./model";

export function createPlayback(initialSpeed = DEFAULT_SPEED) {
  let elapsed = 0;
  let anchor = 0;
  let active = false;
  let speed = initialSpeed;
  let completed = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const getTime = () =>
    Math.min(
      DURATION,
      elapsed + (active ? (performance.now() - anchor) * speed : 0),
    );
  const publish = () => listeners.forEach((listener) => listener());
  function schedule() {
    clearTimeout(timer);
    if (!active) return;
    timer = setTimeout(
      () => {
        elapsed = getTime();
        anchor = performance.now();
        completed = Math.floor(elapsed / BEAT_MS);
        if (elapsed === DURATION) active = false;
        schedule();
        publish();
      },
      Math.max(1, Math.ceil(((completed + 1) * BEAT_MS - getTime()) / speed)),
    );
  }
  return {
    getTime,
    getSnapshot: () => completed,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setActive(value: boolean) {
      elapsed = getTime();
      anchor = performance.now();
      active = value && elapsed < DURATION;
      schedule();
    },
    setSpeed(value: number) {
      if (!Number.isFinite(value) || value <= 0) return;
      elapsed = getTime();
      anchor = performance.now();
      speed = value;
      schedule();
    },
    seek(count: number) {
      elapsed = Math.max(0, Math.min(DURATION, count * BEAT_MS));
      completed = Math.floor(elapsed / BEAT_MS);
      anchor = performance.now();
      if (elapsed === DURATION) active = false;
      schedule();
      publish();
    },
  };
}
export type Playback = ReturnType<typeof createPlayback>;
