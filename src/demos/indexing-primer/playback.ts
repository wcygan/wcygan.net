import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export const INDEXING_TRANSITION_MS = 1800;
export const INDEXING_LOOP_PAUSE_MS = 4000;

/** One causal transition at a time, with a readable loop pause and no hidden catch-up. */
export function useIndexingPlayback({
  stageRef,
  step,
  lastStep,
  onStep,
  onReset,
  transitionMs = INDEXING_TRANSITION_MS,
}: {
  stageRef: RefObject<HTMLElement | null>;
  step: number;
  lastStep: number;
  onStep: () => void;
  onReset: () => void;
  transitionMs?: number;
}) {
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  // Keep the clock stopped until the client's motion preference is known.
  const [reducedMotion, setReducedMotion] = useState(true);
  const [intent, setIntent] = useState(true);
  const [run, setRun] = useState(0);
  const [frame, setFrame] = useState({ step, run: 0, progress: 0 });
  const callbacks = useRef({ onStep, onReset });
  callbacks.current = { onStep, onReset };
  const clock = useRef({ step, run, elapsed: 0 });
  if (clock.current.step !== step || clock.current.run !== run) {
    clock.current = { step, run, elapsed: 0 };
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReducedMotion(media.matches);
      if (media.matches) {
        setIntent(false);
        setRun((value) => value + 1);
      }
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

  const atEnd = step >= lastStep;
  const playing = intent && !reducedMotion;
  const active = playing && inView && documentVisible;
  const running = useRef(active);
  running.current = active;
  const phaseProgress =
    frame.step === step && frame.run === run ? frame.progress : 0;
  const progress = !atEnd && !reducedMotion ? phaseProgress : 0;
  const resetProgress = atEnd && !reducedMotion ? phaseProgress : null;
  useEffect(() => {
    if (!active) return;
    const started = performance.now();
    const elapsedBefore = clock.current.elapsed;
    const duration = atEnd ? INDEXING_LOOP_PAUSE_MS : transitionMs;
    let request: number;
    const tick = (now: number) => {
      if (
        !running.current ||
        clock.current.step !== step ||
        clock.current.run !== run
      ) {
        return;
      }
      const elapsed = elapsedBefore + now - started;
      clock.current.elapsed = elapsed;
      const nextProgress = Math.max(0, Math.min(1, elapsed / duration));
      setFrame((previous) =>
        previous.step === step &&
        previous.run === run &&
        previous.progress === nextProgress
          ? previous
          : { step, run, progress: nextProgress },
      );
      if (nextProgress === 1) {
        if (atEnd) {
          callbacks.current.onReset();
          setRun((value) => value + 1);
        } else {
          callbacks.current.onStep();
        }
      } else {
        request = window.requestAnimationFrame(tick);
      }
    };
    request = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(request);
      if (clock.current.step === step && clock.current.run === run) {
        clock.current.elapsed = elapsedBefore + performance.now() - started;
      }
    };
  }, [active, atEnd, step, run, transitionMs]);

  const pause = useCallback(() => setIntent(false), []);
  const toggle = useCallback(() => {
    if (reducedMotion) return;
    setIntent((value) => !value);
  }, [reducedMotion]);
  const manualStep = useCallback(() => {
    setIntent(false);
    if (atEnd) {
      callbacks.current.onReset();
      setRun((value) => value + 1);
    } else {
      callbacks.current.onStep();
    }
  }, [atEnd]);

  return {
    playing,
    active,
    reducedMotion,
    progress,
    resetProgress,
    pause,
    toggle,
    manualStep,
  };
}
