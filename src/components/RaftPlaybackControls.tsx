export function RaftPlaybackControls({
  label,
  reduced,
  complete,
  playing,
  step,
  count,
  onPlay,
  onBack,
  onNext,
  onReplay,
}: {
  label: string;
  reduced: boolean;
  complete: boolean;
  playing: boolean;
  step: number;
  count: number;
  onPlay: () => void;
  onBack: () => void;
  onNext: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="leader-recovery-controls" role="group" aria-label={label}>
      <button type="button" disabled={reduced || complete} onClick={onPlay}>
        {playing && !complete ? "Pause" : "Play"}
      </button>
      <button type="button" disabled={step === 0} onClick={onBack}>
        Back
      </button>
      <button type="button" disabled={complete} onClick={onNext}>
        Next
      </button>
      <button type="button" onClick={onReplay}>
        Replay
      </button>
      <span>
        {step + 1} / {count}
      </span>
    </div>
  );
}
