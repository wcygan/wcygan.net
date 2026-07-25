export const CHANGE_HIGHLIGHT_MIN_DURATION_MS = 750;

export function changeHighlightDurationMs(
  preferredDurationMs = CHANGE_HIGHLIGHT_MIN_DURATION_MS,
) {
  return Math.max(CHANGE_HIGHLIGHT_MIN_DURATION_MS, preferredDurationMs);
}

export function changeHighlightProgressSpan(
  timelineDurationMs: number,
  preferredProgressSpan: number,
) {
  const preferredDurationMs = timelineDurationMs * preferredProgressSpan;
  return changeHighlightDurationMs(preferredDurationMs) / timelineDurationMs;
}
