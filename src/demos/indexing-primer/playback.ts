import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export const INDEXING_BEAT_MS = 3600;
export const INDEXING_INTRO_MS = 4200;

/** One readable beat at a time, with a settled ending and no background catch-up. */
export function useIndexingPlayback({
  stageRef,
  step,
  lastStep,
  onStep,
  onReset,
  ready = true,
}: {
  stageRef: RefObject<HTMLElement | null>;
  step: number;
  lastStep: number;
  onStep: () => void;
  onReset: () => void;
  ready?: boolean;
}) {
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  // Keep the clock stopped until the client's motion preference is known.
  const [reducedMotion, setReducedMotion] = useState(true);
  const [intent, setIntent] = useState(true);
  const [run, setRun] = useState(0);
  const callbacks = useRef({ onStep, onReset });
  callbacks.current = { onStep, onReset };
  const duration = step === 0 ? INDEXING_INTRO_MS : INDEXING_BEAT_MS;
  const remaining = useRef(duration);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReducedMotion(media.matches);
      if (media.matches) setIntent(false);
    };
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const element = stageRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const minimum = Math.min(
          160,
          entry.boundingClientRect.height * 0.35,
          window.innerHeight * 0.3,
        );
        setInView(
          entry.isIntersecting && entry.intersectionRect.height >= minimum,
        );
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    if (element) observer.observe(element);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [stageRef]);

  useEffect(() => {
    remaining.current = duration;
  }, [step, duration, run]);

  const complete = step >= lastStep;
  const playing = intent && !complete && !reducedMotion;
  const active = playing && inView && documentVisible && ready;
  useEffect(() => {
    if (!active) return;
    const started = performance.now();
    const timer = window.setTimeout(
      () => callbacks.current.onStep(),
      remaining.current,
    );
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (performance.now() - started),
      );
    };
  }, [active, step, duration, run]);

  const pause = useCallback(() => setIntent(false), []);
  const replay = useCallback(() => {
    callbacks.current.onReset();
    setRun((value) => value + 1);
    setIntent(!reducedMotion);
  }, [reducedMotion]);
  const toggle = useCallback(() => {
    if (reducedMotion) return;
    if (complete) replay();
    else setIntent((value) => !value);
  }, [complete, reducedMotion, replay]);
  const manualStep = useCallback(() => {
    setIntent(false);
    callbacks.current.onStep();
  }, []);

  return {
    playing,
    active,
    complete,
    reducedMotion,
    pause,
    toggle,
    replay,
    manualStep,
  };
}
