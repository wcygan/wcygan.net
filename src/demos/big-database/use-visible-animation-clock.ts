import { useCallback, useEffect, useRef, useState } from "react";

export function useVisibleAnimationClock(duration = Infinity) {
  const figure = useRef<HTMLElement>(null);
  const clock = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [run, setRun] = useState(0);

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
    if (!visible || !documentVisible || reduced || clock.current >= duration)
      return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined)
        clock.current = Math.min(duration, clock.current + now - previous);
      previous = now;
      setElapsed(clock.current);
      if (clock.current < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, documentVisible, reduced, duration, run]);

  const replay = useCallback(() => {
    clock.current = 0;
    setElapsed(0);
    setRun((value) => value + 1);
  }, []);

  return { figure, elapsed, reduced, replay };
}
