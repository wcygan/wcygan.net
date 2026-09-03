import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scripted tour playback for the connection-pool demos.
 *
 * A tour walks a numeric value (the pool size) through narrative beats:
 * tween to each beat's value, then hold. It reports live tween/hold
 * progress via `phase` for the countdown bar. Any user input on the real
 * control cancels the tour permanently until "Replay". Respects
 * prefers-reduced-motion by jumping between beats without tweens.
 */

export interface TourBeat {
  value: number;
  holdMs: number;
  caption: string;
}

export interface TourPhase {
  kind: "transition" | "wait";
  /** 0 → 1 elapsed fraction of the current tween or hold. */
  progress: number;
}

const TWEEN_MS = 7500;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function runTimed(
  durationMs: number,
  onProgress: (fraction: number) => void,
  isCancelled: () => boolean,
): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const start = performance.now();
  const step = (now: number) => {
    if (isCancelled()) {
      resolve();
      return;
    }
    const t = Math.min(1, (now - start) / durationMs);
    onProgress(t);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      resolve();
    }
  };
  requestAnimationFrame(step);
  return promise;
}

export function useDemoTour(beats: TourBeat[], initialValue: number) {
  const [value, setValue] = useState(initialValue);
  const [caption, setCaption] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<TourPhase | null>(null);
  const tokenRef = useRef(0);
  const valueRef = useRef(initialValue);
  valueRef.current = value;

  const cancelled = useCallback(
    (token: number) => tokenRef.current !== token,
    [],
  );

  const stop = useCallback(() => {
    tokenRef.current += 1;
    setPlaying(false);
    setCaption(null);
    setPhase(null);
  }, []);

  const start = useCallback(() => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    const reduced = prefersReducedMotion();

    const run = async () => {
      setPlaying(true);
      for (let i = 0; i < beats.length; i += 1) {
        const beat = beats[i];
        setCaption(beat.caption);
        if (i === 0 || reduced) {
          setValue(beat.value);
        } else {
          const from = valueRef.current;
          setPhase({ kind: "transition", progress: 0 });
          await runTimed(
            TWEEN_MS,
            (fraction) => {
              setValue(from + (beat.value - from) * easeInOutCubic(fraction));
              setPhase({ kind: "transition", progress: fraction });
            },
            () => cancelled(token),
          );
        }
        if (cancelled(token)) return;
        setPhase({ kind: "wait", progress: 0 });
        await runTimed(
          beat.holdMs,
          (fraction) => {
            setPhase({ kind: "wait", progress: fraction });
          },
          () => cancelled(token),
        );
        if (cancelled(token)) return;
      }
      if (!cancelled(token)) setPlaying(false);
    };

    void run();
  }, [beats, cancelled]);

  // Slider handler: adopt the user's value and kill any running tour.
  const onManualChange = useCallback(
    (next: number) => {
      stop();
      setValue(next);
    },
    [stop],
  );

  return { value, caption, phase, playing, start, onManualChange };
}

/** Play the tour once, the first time the element scrolls into view. */
export function usePlayOnceOnVisible(
  ref: React.RefObject<HTMLElement | null>,
  start: () => void,
) {
  const startedRef = useRef(false);
  const startRef = useRef(start);
  startRef.current = start;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !startedRef.current
        ) {
          startedRef.current = true;
          startRef.current();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
