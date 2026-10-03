import { useEffect, useRef, useState } from "react";

type PlaybackOptions = {
  step: number;
  lastStep: number;
  onStep: (nextStep: number) => void;
  onReset: () => void;
  intervalMs?: number;
  enabled?: boolean;
};

/** A bounded reading sequence: visibility pauses the clock, never the reader's intent. */
export function usePrometheusPlayback({
  step,
  lastStep,
  onStep,
  onReset,
  intervalMs = 2200,
  enabled = true,
}: PlaybackOptions) {
  const ref = useRef<HTMLElement>(null);
  const callbacks = useRef({ onStep, onReset });
  callbacks.current = { onStep, onReset };
  const [intent, setIntent] = useState(true);
  const [inViewport, setInViewport] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setInViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updatePreference = () =>
      setReducedMotion(preference?.matches ?? false);
    updatePreference();
    preference?.addEventListener("change", updatePreference);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      preference?.removeEventListener("change", updatePreference);
    };
  }, []);

  const playing = intent && enabled && !reducedMotion && step < lastStep;
  const motionAllowed =
    intent && enabled && !reducedMotion && inViewport && documentVisible;
  const active = motionAllowed && step < lastStep;
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(
      () => callbacks.current.onStep(Math.min(lastStep, step + 1)),
      intervalMs,
    );
    return () => window.clearTimeout(timer);
  }, [active, intervalMs, lastStep, step]);

  const replay = () => {
    callbacks.current.onReset();
    setIntent(true);
  };
  const toggle = () => {
    if (step >= lastStep) replay();
    else setIntent((value) => !value);
  };
  return {
    ref,
    playing,
    active,
    motionAllowed,
    reducedMotion,
    complete: step >= lastStep,
    toggle,
    replay,
    pause: () => setIntent(false),
  };
}
