import { useEffect, useRef, useState } from "react";
import {
  BEAT_MS,
  WORKING_SET_DURATION,
  workingSetSnapshot,
} from "./working-set";

export function useWorkingSetPlayback() {
  const figure = useRef<HTMLElement>(null);
  const clock = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const snapshot = workingSetSnapshot(elapsed);

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
    clock.current = WORKING_SET_DURATION;
    setElapsed(clock.current);
    setPlaying(false);
  }, [reduced]);

  useEffect(() => {
    if (!playing || !visible || !documentVisible || reduced) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined)
        clock.current = Math.min(
          WORKING_SET_DURATION,
          clock.current + now - previous,
        );
      previous = now;
      setElapsed(clock.current);
      if (clock.current < WORKING_SET_DURATION)
        frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, documentVisible, reduced]);

  const reset = () => {
    clock.current = 0;
    setElapsed(clock.current);
  };
  const step = () => {
    setPlaying(false);
    clock.current = Math.min(
      WORKING_SET_DURATION,
      (Math.floor(clock.current / BEAT_MS) + 1) * BEAT_MS,
    );
    setElapsed(clock.current);
  };
  const run = () => {
    if (reduced) {
      clock.current = WORKING_SET_DURATION;
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
  return { figure, snapshot, playing, reduced, step, run, replay };
}
