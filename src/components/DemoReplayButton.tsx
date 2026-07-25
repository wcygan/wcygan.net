import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export const DEMO_REPLAY_COUNTDOWN_MS = 4_000;

type DemoReplayButtonProps = {
  ariaLabel: string;
  isComplete: boolean;
  onReplay: () => void;
  countdownDurationMs?: number;
};

type ReplayButtonStyle = CSSProperties & {
  "--demo-replay-progress": string;
};

export function DemoReplayButton({
  ariaLabel,
  countdownDurationMs = DEMO_REPLAY_COUNTDOWN_MS,
  isComplete,
  onReplay,
}: DemoReplayButtonProps) {
  const { isCountingDown, progress, replayNow } = useAutoReplayCountdown({
    countdownDurationMs,
    isComplete,
    onReplay,
  });
  const progressPercent = Math.round(progress * 100);
  const style: ReplayButtonStyle = {
    "--demo-replay-progress": `${progress.toFixed(4)}turn`,
  };

  return (
    <button
      className="demo-replay-button"
      type="button"
      onClick={replayNow}
      aria-label={
        isCountingDown
          ? `${ariaLabel}. Automatically replays when the countdown border completes.`
          : ariaLabel
      }
      data-counting-down={isCountingDown ? "true" : "false"}
      data-replay-progress={progressPercent}
      style={style}
    >
      <span className="demo-replay-button-progress" aria-hidden="true" />
      <span className="demo-replay-button-label">Replay</span>
    </button>
  );
}

function useAutoReplayCountdown({
  countdownDurationMs,
  isComplete,
  onReplay,
}: {
  countdownDurationMs: number;
  isComplete: boolean;
  onReplay: () => void;
}) {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [progress, setProgress] = useState(0);
  const onReplayRef = useRef(onReplay);

  useEffect(() => {
    onReplayRef.current = onReplay;
  }, [onReplay]);

  const replayNow = useCallback(() => {
    setIsCountingDown(false);
    setProgress(0);
    onReplayRef.current();
  }, []);

  useEffect(() => {
    setIsCountingDown(false);
    setProgress(0);
    if (!isComplete || typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const durationMs = Math.max(1, countdownDurationMs);
    let animationFrame = 0;
    let elapsedMs = 0;
    let previousFrame: number | undefined;

    const cancelFrame = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const nextProgress = Math.min(1, elapsedMs / durationMs);
      setProgress(nextProgress);

      if (nextProgress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
        return;
      }

      animationFrame = window.requestAnimationFrame(replayNow);
    };

    const start = () => {
      cancelFrame();
      if (reducedMotion.matches || document.hidden) {
        setIsCountingDown(false);
        return;
      }
      setIsCountingDown(true);
      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      setProgress(0);
      start();
    };

    const handleVisibility = () => {
      start();
    };

    start();
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelFrame();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [countdownDurationMs, isComplete, replayNow]);

  return { isCountingDown, progress, replayNow };
}
