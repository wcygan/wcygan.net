import type { TourPhase } from "~/lib/use-demo-tour";

/**
 * Countdown bar shown at the bottom of the tour-driven demos. Drains from
 * full to empty over the current tween or hold, with the phase name in the
 * middle so the reader knows what they are waiting for.
 */

export function TourCountdownBar({ phase }: { phase: TourPhase | null }) {
  if (!phase) {
    return <div className="ps-countdown" aria-hidden="true" />;
  }
  const remaining = Math.round((1 - phase.progress) * 100);
  const label = phase.kind === "transition" ? "TRANSITION" : "WAIT";
  return (
    <div
      className="ps-countdown"
      role="timer"
      aria-label={`${label}, ${remaining}% remaining`}
    >
      <div
        className={`ps-countdown-fill is-${phase.kind}`}
        style={{ width: `${remaining}%` }}
      />
      <span className="ps-countdown-label">{label}</span>
    </div>
  );
}
