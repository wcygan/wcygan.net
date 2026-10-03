import { useCallback, useEffect, useRef, useState } from "react";

interface AutoplayOptions {
  steps: number;
  onStep: (step: number) => void;
  onReset: () => void;
  intervalMs?: number;
}

/** Finite, viewport-driven lessons. Domain state and the camera stay with the demo. */
export function useKafkaAutoplay({
  steps,
  onStep,
  onReset,
  intervalMs = 2600,
}: AutoplayOptions) {
  const callbacks = useRef({ onStep, onReset });
  callbacks.current = { onStep, onReset };
  const [target, stageRef] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(true);
  const [state, setState] = useState({
    step: 0,
    playing: true,
    manual: false,
    run: 0,
  });

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(media?.matches ?? false);
    const visibility = () => setVisible(!document.hidden);
    motion();
    visibility();
    media?.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media?.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.3);
      },
      { threshold: [0, 0.3] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);

  const complete = state.step >= steps;
  const playing = state.playing && !state.manual && !complete;
  const running = playing && inView && visible && ready && !reducedMotion;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      const step = state.step + 1;
      callbacks.current.onStep(step);
      setState((current) => ({ ...current, step }));
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [running, state.step, state.run, intervalMs]);

  // A manual domain action takes ownership until the reader chooses Play again.
  const pause = useCallback(() => {
    setState((current) => ({ ...current, playing: false, manual: true }));
  }, []);
  const replay = () => {
    callbacks.current.onReset();
    setState((current) => ({
      step: 0,
      playing: true,
      manual: false,
      run: current.run + 1,
    }));
  };
  const toggle = () => {
    if (state.manual) {
      replay();
      return;
    }
    if (reducedMotion) {
      if (complete) return;
      const step = state.step + 1;
      callbacks.current.onStep(step);
      setState((current) => ({ ...current, step }));
      return;
    }
    setState((current) => ({ ...current, playing: !current.playing }));
  };

  return {
    stageRef,
    setReady,
    pause,
    replay,
    toggle,
    step: state.step,
    steps,
    playing,
    running,
    complete,
    ready,
    reducedMotion,
    manual: state.manual,
  };
}

export function KafkaPlaybackControls({
  playback,
}: {
  playback: ReturnType<typeof useKafkaAutoplay>;
}) {
  const label = playback.reducedMotion
    ? playback.manual
      ? "Restart steps"
      : "Next step"
    : playback.playing
      ? "Pause"
      : "Play";
  return (
    <div
      className="kafka-intro-controls kafka-intro-playback"
      role="group"
      aria-label="Demo playback"
    >
      <button
        type="button"
        onClick={playback.toggle}
        disabled={!playback.ready || (playback.complete && !playback.manual)}
      >
        {label}
      </button>
      <button type="button" onClick={playback.replay}>
        Replay
      </button>
      <span
        className="kafka-intro-playback-progress"
        aria-label={`${playback.step} of ${playback.steps} steps`}
      >
        <span className="kafka-intro-playback-track" aria-hidden="true">
          {Array.from({ length: playback.steps }, (_, i) => (
            <i key={i} data-done={i < playback.step} />
          ))}
        </span>
        {playback.manual
          ? "Explore"
          : playback.complete
            ? "Complete"
            : `${playback.step} / ${playback.steps}`}
      </span>
    </div>
  );
}
