import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export const CELLD_AUTOPLAY_DELAY_MS = 3600;

type PlaybackState =
  | "playing"
  | "waiting"
  | "paused"
  | "complete"
  | "blocked"
  | "reduced-motion";

/** Advance causal beats once, preserving the reader's pause and remaining hold. */
export function useCelldAutoplay({
  stageRef,
  step,
  total,
  onStep,
  onReset,
  durationMs = CELLD_AUTOPLAY_DELAY_MS,
  ready = true,
  blocked = false,
}: {
  stageRef: RefObject<HTMLElement | null>;
  step: number;
  total: number;
  onStep: () => void;
  onReset: () => void;
  durationMs?: number;
  ready?: boolean;
  blocked?: boolean;
}) {
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  // Do not schedule before the client's motion preference is known.
  const [reduced, setReduced] = useState(true);
  const [intent, setIntent] = useState(true);
  const [run, setRun] = useState(0);
  const callbacks = useRef({ onStep, onReset });
  callbacks.current = { onStep, onReset };
  const remaining = useRef(durationMs);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => {
      const next = media?.matches ?? false;
      setReduced(next);
      if (next) setIntent(false);
    };
    update();
    media?.addEventListener?.("change", update);
    return () => media?.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const element = stageRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [stageRef]);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    remaining.current = durationMs;
  }, [step, durationMs, run]);

  const complete = step >= total;
  const playing = intent && !complete && !blocked && !reduced;
  const active = playing && inView && pageVisible && ready;
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const timer = window.setTimeout(() => {
      remaining.current = 0;
      callbacks.current.onStep();
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (performance.now() - start),
      );
    };
  }, [active, step, durationMs, run]);

  const pause = useCallback(() => setIntent(false), []);
  const replay = useCallback(() => {
    callbacks.current.onReset();
    setRun((value) => value + 1);
    setIntent(!reduced);
  }, [reduced]);
  const toggle = useCallback(() => {
    if (reduced || blocked) return;
    if (complete) replay();
    else setIntent((value) => !value);
  }, [reduced, blocked, complete, replay]);
  const manualStep = useCallback(() => {
    setIntent(false);
    callbacks.current.onStep();
  }, []);
  const reset = useCallback(() => {
    setIntent(false);
    callbacks.current.onReset();
    setRun((value) => value + 1);
  }, []);

  const state: PlaybackState = complete
    ? "complete"
    : blocked
      ? "blocked"
      : reduced
        ? "reduced-motion"
        : !intent
          ? "paused"
          : active
            ? "playing"
            : "waiting";

  return { playing, active, state, pause, toggle, replay, manualStep, reset };
}
