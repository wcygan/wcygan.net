import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export interface FiniteClock {
  step: number;
  elapsedMs: number;
}

export const MAX_CLICKHOUSE_FRAME_DELTA_MS = 100;

function validateClock(totalSteps: number, beatMs: number) {
  if (!Number.isInteger(totalSteps) || totalSteps < 1) {
    throw new RangeError("Playback needs at least one whole step");
  }
  if (!Number.isFinite(beatMs) || beatMs <= 0) {
    throw new RangeError("Playback beat duration must be positive and finite");
  }
}

// A delayed frame advances at most one beat, with no accumulated catch-up.
// Entering a new step resets its travel fraction, including the terminal step.
export function advanceFiniteClock(
  previous: FiniteClock,
  deltaMs: number,
  totalSteps: number,
  beatMs: number,
): FiniteClock {
  validateClock(totalSteps, beatMs);
  const lastStep = totalSteps - 1;
  const step = Math.min(lastStep, Math.max(0, Math.floor(previous.step)));
  if (step === lastStep) return { step, elapsedMs: 0 };
  const delta = Number.isFinite(deltaMs)
    ? Math.min(MAX_CLICKHOUSE_FRAME_DELTA_MS, Math.max(0, deltaMs))
    : 0;
  const elapsedMs = Math.max(0, previous.elapsedMs) + delta;
  return elapsedMs >= beatMs
    ? { step: step + 1, elapsedMs: 0 }
    : { step, elapsedMs };
}

export function shouldAdvance(
  playing: boolean,
  visible: boolean,
  hidden: boolean,
  reducedMotion: boolean,
) {
  return playing && visible && !hidden && !reducedMotion;
}

export interface ClickHousePlayback {
  totalSteps: number;
  step: number;
  fraction: number;
  playing: boolean;
  running: boolean;
  reducedMotion: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
  fractionRef: RefObject<number>;
  togglePlayback: () => void;
  pause: () => void;
  replay: () => void;
  next: () => void;
  reset: () => void;
}

export interface PlaybackOptions {
  stageRef?: RefObject<HTMLDivElement | null>;
  enabled?: boolean;
  autoplay?: boolean;
  startDelayMs?: number;
  publishFractions?: boolean;
}

export function useClickHousePlayback(
  totalSteps: number,
  beatMs = 3200,
  {
    stageRef: suppliedStageRef,
    enabled = true,
    autoplay = true,
    startDelayMs = 900,
    publishFractions = true,
  }: PlaybackOptions = {},
): ClickHousePlayback {
  validateClock(totalSteps, beatMs);
  const ownStageRef = useRef<HTMLDivElement | null>(null);
  const stageRef = suppliedStageRef ?? ownStageRef;
  const fractionRef = useRef(0);
  const automaticUsedRef = useRef(false);
  const startDelayRef = useRef(Math.max(0, startDelayMs));
  const enabledRef = useRef(enabled);
  const clockRef = useRef<FiniteClock>({ step: 0, elapsedMs: 0 });
  const [clock, setClock] = useState(clockRef.current);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // A tour starts once. Visibility suspends the clock, while manual controls
  // claim the demo and keep it from starting again behind the reader's back.
  const playingRef = useRef(false);
  const visibleRef = useRef(false);
  const hiddenRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const publishClock = useCallback(
    (nextClock: FiniteClock) => {
      const stepChanged = nextClock.step !== clockRef.current.step;
      clockRef.current = nextClock;
      fractionRef.current = Math.min(
        1,
        Math.max(0, nextClock.elapsedMs / beatMs),
      );
      if (publishFractions || stepChanged || nextClock.elapsedMs === 0) {
        setClock(nextClock);
      }
    },
    [beatMs, publishFractions],
  );

  const pause = useCallback(() => {
    automaticUsedRef.current = true;
    playingRef.current = false;
    setPlaying(false);
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      reducedMotionRef.current = media.matches;
      setReducedMotion(media.matches);
      if (media.matches) pause();
    };
    const updateHidden = () => {
      hiddenRef.current = document.hidden;
      setHidden(document.hidden);
    };
    updateMotion();
    updateHidden();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateHidden);

    const stage = stageRef.current;
    let observer: IntersectionObserver | undefined;
    if (stage && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          // A readable slice is enough for a tall mobile diagram. Requiring half
          // the whole stage would prevent some figures from ever starting.
          const minimum = Math.min(
            160,
            entry.boundingClientRect.height * 0.35,
            window.innerHeight * 0.3,
          );
          const readable =
            entry.isIntersecting && entry.intersectionRect.height >= minimum;
          visibleRef.current = readable;
          setVisible(readable);
        },
        { threshold: Array.from({ length: 21 }, (_, index) => index / 20) },
      );
      observer.observe(stage);
    } else {
      visibleRef.current = true;
      setVisible(true);
    }
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateHidden);
    };
  }, [pause, stageRef]);

  useEffect(() => {
    if (
      !autoplay ||
      automaticUsedRef.current ||
      !enabled ||
      !visible ||
      hidden ||
      reducedMotion ||
      totalSteps === 1
    )
      return;
    automaticUsedRef.current = true;
    playingRef.current = true;
    setPlaying(true);
  }, [autoplay, enabled, visible, hidden, reducedMotion, totalSteps]);

  useEffect(() => {
    const lastStep = totalSteps - 1;
    if (clockRef.current.step >= lastStep) {
      publishClock({ step: lastStep, elapsedMs: 0 });
      pause();
    }
  }, [totalSteps, pause, publishClock]);

  useEffect(() => {
    if (!enabled || !shouldAdvance(playing, visible, hidden, reducedMotion))
      return;
    let frameId: number;
    let previousTimestamp: number | null = null;
    const frame = (timestamp: number) => {
      if (
        !enabledRef.current ||
        !shouldAdvance(
          playingRef.current,
          visibleRef.current,
          hiddenRef.current,
          reducedMotionRef.current,
        )
      ) {
        return;
      }
      const delta =
        previousTimestamp === null ? 0 : timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      if (startDelayRef.current > 0) {
        startDelayRef.current = Math.max(
          0,
          startDelayRef.current -
            Math.min(MAX_CLICKHOUSE_FRAME_DELTA_MS, Math.max(0, delta)),
        );
        frameId = requestAnimationFrame(frame);
        return;
      }
      const nextClock = advanceFiniteClock(
        clockRef.current,
        delta,
        totalSteps,
        beatMs,
      );
      publishClock(nextClock);
      if (nextClock.step === totalSteps - 1) {
        pause();
        return;
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [
    playing,
    visible,
    hidden,
    reducedMotion,
    enabled,
    totalSteps,
    beatMs,
    pause,
    publishClock,
  ]);

  const replay = useCallback(() => {
    automaticUsedRef.current = true;
    startDelayRef.current = Math.max(0, startDelayMs);
    publishClock({ step: 0, elapsedMs: 0 });
    playingRef.current = !reducedMotionRef.current && totalSteps > 1;
    setPlaying(playingRef.current);
  }, [publishClock, startDelayMs, totalSteps]);

  const togglePlayback = useCallback(() => {
    if (reducedMotionRef.current || totalSteps === 1) return;
    if (playingRef.current) {
      pause();
      return;
    }
    if (clockRef.current.step === totalSteps - 1) {
      replay();
      return;
    }
    automaticUsedRef.current = true;
    startDelayRef.current = 0;
    playingRef.current = true;
    setPlaying(true);
  }, [totalSteps, pause, replay]);

  const next = useCallback(() => {
    pause();
    publishClock({
      step: Math.min(totalSteps - 1, clockRef.current.step + 1),
      elapsedMs: 0,
    });
  }, [totalSteps, pause, publishClock]);

  const reset = useCallback(() => {
    automaticUsedRef.current = true;
    startDelayRef.current = Math.max(0, startDelayMs);
    publishClock({ step: 0, elapsedMs: 0 });
  }, [publishClock, startDelayMs]);

  return {
    totalSteps,
    step: clock.step,
    fraction: Math.min(1, Math.max(0, clock.elapsedMs / beatMs)),
    playing,
    running: enabled && shouldAdvance(playing, visible, hidden, reducedMotion),
    reducedMotion,
    stageRef,
    fractionRef,
    togglePlayback,
    pause,
    replay,
    next,
    reset,
  };
}
