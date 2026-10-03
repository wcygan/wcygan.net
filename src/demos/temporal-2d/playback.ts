import { useCallback, useEffect, useRef, useState } from "react";

export const BEAT_MS = 3200;
export const AUTOPLAY_DELAY_MS = 1000;
export const STAGE_VISIBILITY_RATIO = 0.3;
export function useTemporalPlayback(last: number) {
  const ref = useRef<HTMLElement>(null);
  const clock = useRef({
    elapsed: 0,
    subscribers: new Set<(progress: number) => void>(),
  });
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autostartEligible, setAutostartEligible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const complete = step >= last;
  const running =
    playing && visible && documentVisible && !reduced && !complete;

  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(preference.matches);
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    preference.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) =>
        setVisible(
          entry.isIntersecting &&
            entry.intersectionRatio >= STAGE_VISIBILITY_RATIO,
        ),
      { threshold: STAGE_VISIBILITY_RATIO },
    );
    const resize = new ResizeObserver(([entry]) =>
      setCompact(entry.contentRect.width < 520),
    );
    if (element) {
      const stage = element.querySelector("[data-graphic-stage]");
      if (stage) observer.observe(stage);
      resize.observe(element);
      setCompact(element.clientWidth < 520);
    }
    return () => {
      observer.disconnect();
      resize.disconnect();
      preference.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (
      !autostartEligible ||
      !visible ||
      !documentVisible ||
      reduced ||
      complete
    )
      return;
    const timer = window.setTimeout(() => {
      setAutostartEligible(false);
      setPlaying(true);
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autostartEligible, visible, documentVisible, reduced, complete]);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null)
        clock.current.elapsed += Math.min(100, now - previous);
      previous = now;
      const progress = Math.min(1, clock.current.elapsed / BEAT_MS);
      clock.current.subscribers.forEach((subscriber) => subscriber(progress));
      if (progress >= 1) {
        clock.current.elapsed = 0;
        setStep((current) => Math.min(last, current + 1));
      } else frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [last, running, step]);

  const subscribe = useCallback((subscriber: (progress: number) => void) => {
    clock.current.subscribers.add(subscriber);
    subscriber(clock.current.elapsed / BEAT_MS);
    return () => {
      clock.current.subscribers.delete(subscriber);
    };
  }, []);
  return {
    ref,
    step,
    last,
    playing,
    reduced,
    complete,
    running,
    compact,
    subscribe,
    next() {
      setAutostartEligible(false);
      setPlaying(false);
      clock.current.elapsed = 0;
      setStep((current) => Math.min(last, current + 1));
    },
    toggle() {
      setAutostartEligible(false);
      setPlaying((current) => !current);
    },
    replay() {
      setAutostartEligible(false);
      setPlaying(!reduced);
      clock.current.elapsed = 0;
      setStep(0);
      clock.current.subscribers.forEach((subscriber) => subscriber(0));
    },
  };
}
export type TemporalPlayback = ReturnType<typeof useTemporalPlayback>;
