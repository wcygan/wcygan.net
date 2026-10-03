import type { MySqlPlayback } from "~/demos/mysql-primer/useMySqlPlayback";

export function MySqlPlaybackControls({
  playback,
}: {
  playback: MySqlPlayback;
}) {
  return (
    <div className="mysql-playback-controls" role="group" aria-label="Playback">
      <button
        type="button"
        disabled={playback.finished || playback.reducedMotion}
        onClick={playback.toggle}
      >
        {playback.playing && !playback.finished ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={playback.replay}>
        Replay
      </button>
      {playback.reducedMotion && (
        <span className="mysql-playback-note">
          Reduced motion · use the step controls
        </span>
      )}
    </div>
  );
}
