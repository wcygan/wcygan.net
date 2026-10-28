import { useEffect, useRef, useState } from "react";

type Timeline = {
  starts: readonly number[];
  total: number;
};

export function usePlayback<T extends HTMLElement>(timeline: Timeline) {
  const ref = useRef<T>(null);
  const [elapsed, setElapsed] = useState(0);
  const [wanted, setWanted] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const done = elapsed >= timeline.total;

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(motion.matches);
      if (motion.matches) {
        setWanted(false);
        setElapsed(timeline.total);
      }
    };
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [timeline.total]);

  const running = wanted && visible && documentVisible && !reduced && !done;
  useEffect(() => {
    if (!running) return;
    let previous: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      // Clamp large gaps so a throttled tab never skips causal beats.
      const delta = previous === null ? 0 : Math.min(now - previous, 64);
      previous = now;
      setElapsed((value) => Math.min(timeline.total, value + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, timeline.total]);

  return {
    ref,
    elapsed,
    reduced,
    done,
    playing: wanted && !done,
    toggle: () => setWanted((value) => !value),
    step: () => {
      setWanted(false);
      setElapsed(
        (value) =>
          timeline.starts.find((start) => start > value) ?? timeline.total,
      );
    },
    replay: () => {
      setElapsed(0);
      setWanted(!reduced);
    },
  };
}
