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
