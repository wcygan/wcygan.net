import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const BEAT_MS = 2200;
const VISIBLE_STAGE_RATIO = 0.35;

interface FlinkPlaybackOptions {
  targetRef: RefObject<HTMLElement | null>;
  step: number;
  total: number;
  onStep: () => void;
  onReset: () => void;
  ready?: boolean;
}

/** Finite teaching beats, started once when the reader reaches the visual. */
export function useFlinkPlayback({
  targetRef,
  step,
  total,
  onStep,
  onReset,
  ready = true,
}: FlinkPlaybackOptions) {
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [motionKnown, setMotionKnown] = useState(false);
  const started = useRef(false);
  const manuallyControlled = useRef(false);
  const latest = useRef({ step, total, onStep, onReset, playing, reduced });

  // Callback identity and camera renders must not restart the teaching clock.
  useEffect(() => {
    latest.current = { step, total, onStep, onReset, playing, reduced };
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(media.matches);
      setMotionKnown(true);
      if (media.matches) setPlaying(false);
    };
    const updateDocument = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateDocument();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateDocument);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateDocument);
    };
  }, []);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const stage =
      target.closest("figure")?.querySelector("[data-graphic-stage]") ?? target;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        setVisible(
          entry.isIntersecting &&
            entry.intersectionRatio >= VISIBLE_STAGE_RATIO,
        ),
      { threshold: [0, VISIBLE_STAGE_RATIO] },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [targetRef]);

  const complete = step >= total;
  const eligible =
    visible && documentVisible && ready && motionKnown && !reduced;
  const running = playing && eligible && !complete;

  useEffect(() => {
    if (
      eligible &&
      !complete &&
      !started.current &&
      !manuallyControlled.current
    ) {
      started.current = true;
      setPlaying(true);
    }
  }, [eligible, complete]);

  useEffect(() => {
    if (complete) setPlaying(false);
  }, [complete]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      const current = latest.current;
      if (current.step < current.total) current.onStep();
    }, BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [running, step]);

  const pause = useCallback(() => {
    manuallyControlled.current = true;
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    manuallyControlled.current = true;
    const current = latest.current;
    if (current.reduced) {
      setPlaying(false);
      return;
    }
    if (current.step >= current.total) {
      current.onReset();
      setPlaying(true);
    } else {
      setPlaying((value) => !value);
    }
  }, []);

  const reset = useCallback(() => {
    pause();
    latest.current.onReset();
  }, [pause]);

  const replay = useCallback(() => {
    manuallyControlled.current = true;
    latest.current.onReset();
    setPlaying(!latest.current.reduced);
  }, []);

  const advance = useCallback(() => {
    pause();
    const current = latest.current;
    if (current.step < current.total) current.onStep();
  }, [pause]);

  return { playing, running, reduced, pause, toggle, reset, replay, advance };
}
