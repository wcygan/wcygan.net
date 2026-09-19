import {
  LOG_RECORDS,
  WRITE_COOLDOWN,
  COMMIT,
  RECEIVE,
  APPLY,
  concurrentSnapshot,
} from "./model";
/** Publish only phase/cooldown boundaries; meshes sample the continuous clock. */
export function createReplicationPlayback() {
  let starts: number[] = [];
  let now = 0;
  let anchor = 0;
  let active = false;
  let reduced = false;
  let cooldownUntil = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  let snapshot = concurrentSnapshot(starts, now);
  const getTime = () =>
    now + (active ? Math.max(0, performance.now() - anchor) : 0);
  const synchronize = () => {
    now = getTime();
    anchor = performance.now();
  };
  function publish() {
    snapshot = {
      ...concurrentSnapshot(starts, now),
      cooling: now < cooldownUntil,
    };
    listeners.forEach((listener) => listener());
  }
  function schedule() {
    clearTimeout(timer);
    if (!active) return;
    const events = starts.flatMap((t) => [t + COMMIT, t + RECEIVE, t + APPLY]);
    events.push(cooldownUntil);
    const next = Math.min(...events.filter((t) => t > now));
    if (!Number.isFinite(next)) return;
    timer = setTimeout(
      () => {
        synchronize();
        publish();
        schedule();
      },
      Math.max(1, Math.ceil(next - getTime())),
    );
  }
  return {
    getTime,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setActive(value: boolean) {
      synchronize();
      active = value;
      publish();
      schedule();
    },
    setReduced(value: boolean) {
      synchronize();
      reduced = value;
      if (value) starts = starts.map((t) => Math.min(t, now - APPLY));
      publish();
      schedule();
    },
    write() {
      synchronize();
      if (now < cooldownUntil || starts.length === LOG_RECORDS.length) return;
      starts = [...starts, reduced ? now - APPLY : now];
      cooldownUntil = now + WRITE_COOLDOWN;
      publish();
      schedule();
    },
    reset() {
      synchronize();
      starts = [];
      cooldownUntil = 0;
      publish();
      schedule();
    },
  };
}
export type ReplicationPlayback = ReturnType<typeof createReplicationPlayback>;
