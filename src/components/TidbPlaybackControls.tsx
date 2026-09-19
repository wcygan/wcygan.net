import {
  TIDB_PLAYBACK_SPEEDS,
  type TidbPlaybackSpeed,
} from "~/demos/tidb-playback";

export function TidbPlaybackControls({
  disabled = false,
  moving,
  done,
  speed,
  onToggle,
  onStep,
  onReplay,
  onSpeed,
}: {
  disabled?: boolean;
  moving: boolean;
  done: boolean;
  speed: TidbPlaybackSpeed;
  onToggle: () => void;
  onStep: () => void;
  onReplay: () => void;
  onSpeed: (speed: TidbPlaybackSpeed) => void;
}) {
  return (
    <div
      className="tidb-playback-controls"
      role="group"
      aria-label="Playback controls"
    >
      <button type="button" disabled={disabled} onClick={onToggle}>
        {moving ? "Pause" : done ? "Play again" : "Play"}
      </button>
      <button type="button" disabled={disabled || done} onClick={onStep}>
        Step
      </button>
      <button type="button" disabled={disabled} onClick={onReplay}>
        Replay
      </button>
      <label>
        Speed
        <select
          disabled={disabled}
          value={speed}
          onChange={(event) =>
            onSpeed(Number(event.target.value) as TidbPlaybackSpeed)
          }
        >
          {TIDB_PLAYBACK_SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
