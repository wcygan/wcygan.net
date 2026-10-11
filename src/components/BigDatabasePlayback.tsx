import type { QueryPlayback } from "~/demos/big-database/use-query-playback";

export function BigDatabasePlaybackControls({
  playback,
}: {
  playback: QueryPlayback;
}) {
  return (
    <div className="big-db-flow-controls" aria-label="Playback controls">
      <button type="button" onClick={playback.run}>
        {playback.reduced ? "Show result" : playback.playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={playback.step}
        disabled={playback.snapshot.complete}
      >
        Step
      </button>
      <button type="button" onClick={playback.replay}>
        Replay
      </button>
    </div>
  );
}
export function BigDatabasePlaybackSteps({
  playback,
  label,
  count,
}: {
  playback: QueryPlayback;
  label: string;
  count: string;
}) {
  return (
    <div className="big-db-flow-explanation">
      <p className="big-db-label">{label}</p>
      <ol>
        {playback.steps.map((entry, i) => (
          <li
            key={entry.label}
            aria-current={playback.snapshot.step === i ? "step" : undefined}
            data-done={i < playback.snapshot.step}
          >
            {entry.label}
          </li>
        ))}
      </ol>
      <p className="big-db-flow-count">{count}</p>
    </div>
  );
}
export function BigDatabasePlaybackStatus({
  playback,
}: {
  playback: QueryPlayback;
}) {
  return (
    <p className="big-db-flow-status" role="status">
      {playback.snapshot.current.label}
      {playback.snapshot.complete
        ? " Complete."
        : ` Step ${playback.snapshot.step + 1} of ${playback.steps.length}.`}
    </p>
  );
}
