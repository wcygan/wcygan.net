export const READ_PAGES = [
  "P1",
  "P2",
  "P1",
  "P3",
  "P2",
  "P1",
  "P4",
  "P4",
  "P2",
] as const;
export const BEAT_MS = 1_000;
export const WORKING_SET_BEATS = READ_PAGES.flatMap((page, read) =>
  (read === 6
    ? ["lookup", "disk", "fill", "return"]
    : ["lookup", "return"]
  ).map((phase) => ({ page, read, phase })),
);
export const WORKING_SET_DURATION = WORKING_SET_BEATS.length * BEAT_MS;
export function workingSetSnapshot(elapsed: number) {
  const time = Math.max(0, Math.min(elapsed, WORKING_SET_DURATION));
  const beat = Math.min(
    Math.floor(time / BEAT_MS),
    WORKING_SET_BEATS.length - 1,
  );
  const current = WORKING_SET_BEATS[beat];
  const complete = time === WORKING_SET_DURATION;
  return {
    ...current,
    beat,
    complete,
    progress: complete ? 1 : (time % BEAT_MS) / BEAT_MS,
    cached: time >= 15 * BEAT_MS,
    ssdReads: time >= 14 * BEAT_MS ? 1 : 0,
  };
}
