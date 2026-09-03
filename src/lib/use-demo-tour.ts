import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scripted tour playback for the connection-pool demos.
 *
 * A tour walks a numeric value (the pool size) through narrative beats:
 * tween to each beat's value (~1.5s ease), then hold so the reader can
 * read the gauges and the caption. Any user input on the real control
 * cancels the tour permanently until "Replay". Respects
 * prefers-reduced-motion by jumping between beats without tweens.
 */

export interface TourBeat {
  value: number;
  holdMs: number;
  caption: string;
}

const TWEEN_MS = 1500;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tweenValue(
  from: number,
  to: number,
  durationMs: number,
  onFrame: (value: number) => void,
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
    onFrame(from + (to - from) * easeInOutCubic(t));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      resolve();
    }
  };
  requestAnimationFrame(step);
  return promise;
}

function sleep(ms: number, isCancelled: () => boolean): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  globalThis.setTimeout(() => resolve(), isCancelled() ? 0 : ms);
  return promise;
}

export function useDemoTour(beats: TourBeat[], initialValue: number) {
  const [value, setValue] = useState(initialValue);
  const [caption, setCaption] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
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
          await tweenValue(
            valueRef.current,
            beat.value,
            TWEEN_MS,
            setValue,
            () => cancelled(token),
          );
        }
        if (cancelled(token)) return;
        await sleep(beat.holdMs, () => cancelled(token));
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

  return { value, caption, playing, start, onManualChange };
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
