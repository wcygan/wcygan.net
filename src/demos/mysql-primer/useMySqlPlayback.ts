import { useCallback, useEffect, useRef, useState } from "react";

interface PlaybackOptions {
  complete: boolean;
  beat: string | number;
  onAdvance: () => void;
  onReplay: () => void;
  delayMs?: number;
  ready?: boolean;
}

/** One visible causal beat at a time; never catch up elapsed background time. */
export function useMySqlPlayback({
  complete,
  beat,
  onAdvance,
  onReplay,
  delayMs = 2600,
  ready = true,
}: PlaybackOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [motionKnown, setMotionKnown] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [replayRevision, setReplayRevision] = useState(0);
  const advanceRef = useRef(onAdvance);
  useEffect(() => {
    advanceRef.current = onAdvance;
  }, [onAdvance]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setPlaying(false);
      setMotionKnown(true);
    };
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { threshold: [0, 0.5] },
    );
    if (stageRef.current) observer.observe(stageRef.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const running =
    playing &&
    motionKnown &&
    !reducedMotion &&
    visible &&
    documentVisible &&
    ready &&
    !complete;
  useEffect(() => {
    if (!running) return;
    const timeout = window.setTimeout(() => advanceRef.current(), delayMs);
    return () => window.clearTimeout(timeout);
  }, [running, beat, replayRevision, delayMs]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    if (!reducedMotion) setPlaying((value) => !value);
  }, [reducedMotion]);
  const replay = () => {
    onReplay();
    setReplayRevision((value) => value + 1);
    setPlaying(!reducedMotion);
  };
  return {
    stageRef,
    running,
    playing,
    finished: complete,
    reducedMotion,
    pause,
    toggle,
    replay,
  };
}
export type MySqlPlayback = ReturnType<typeof useMySqlPlayback>;
