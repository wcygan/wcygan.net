import { useEffect, useRef, useState } from "react";
import {
  type LookupMode,
  FLOW_STEP_MS,
  flowDuration,
  flowSnapshot,
  flowSteps,
} from "./query-flow";

export function useQueryPlayback(mode: LookupMode) {
  const figure = useRef<HTMLElement>(null);
  const clock = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const snapshot = flowSnapshot(mode, elapsed);
  const steps = flowSteps(mode);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    const visibility = () => setDocumentVisible(!document.hidden);
    update();
    visibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    if (figure.current) observer.observe(figure.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!reduced) return;
    clock.current = flowDuration(mode);
    setElapsed(clock.current);
    setPlaying(false);
  }, [reduced, mode]);

  useEffect(() => {
    if (!playing || !visible || !documentVisible || reduced) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined)
        clock.current = Math.min(
          flowDuration(mode),
          clock.current + now - previous,
        );
      previous = now;
      setElapsed(clock.current);
      if (clock.current < flowDuration(mode))
        frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, playing, visible, documentVisible, reduced]);

  const reset = () => {
    clock.current = 0;
    setElapsed(clock.current);
  };
  const step = () => {
    setPlaying(false);
    clock.current = Math.min(
      flowDuration(mode),
      (Math.floor(clock.current / FLOW_STEP_MS) + 1) * FLOW_STEP_MS,
    );
    setElapsed(clock.current);
  };
  const run = () => {
    if (reduced) {
      clock.current = flowDuration(mode);
      setElapsed(clock.current);
      return;
    }
    if (snapshot.complete) reset();
    setPlaying((value) => snapshot.complete || !value);
  };

  const replay = () => {
    reset();
    setPlaying(!reduced);
  };
  return { figure, snapshot, steps, playing, reduced, step, run, replay };
}
export type QueryPlayback = ReturnType<typeof useQueryPlayback>;
