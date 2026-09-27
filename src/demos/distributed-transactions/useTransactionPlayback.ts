import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSceneReady } from "~/components/DemoSceneLoading";
import { readingTime, transitionTiming } from "./motion";
import type { DemoDefinition } from "./types";

/** Owns the transaction trace clock; rendering and shell markup stay outside. */
export function useTransactionPlayback(definition: DemoDefinition) {
  const [scenarioId, setScenarioId] = useState(definition.scenarios[0].id);
  const scenario = definition.scenarios.find((item) => item.id === scenarioId)!;
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<"auto" | "step" | "paused">("auto");
  const [run, setRun] = useState(0);
  const [moving, setMoving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [viewReset, setViewReset] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const timer = useRef<HTMLDivElement>(null);
  // A completed transition keeps its own final sample until Fiber removes it.
  const progress = useMemo(() => ({ current: 0 }), [scenarioId, step, run]);
  const elapsed = useRef(0);
  const { ready, onReady } = useSceneReady();
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const frame = scenario.frames[step];
  const next = scenario.frames[step + 1];
  const done = !next;
  const active =
    visible && documentVisible && intent !== "paused" && (ready || unavailable);
  const pending = !ready && !unavailable;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) {
        setIntent("paused");
        setMoving(false);
        setRun((value) => value + 1);
        elapsed.current = 0;
      }
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.5] },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!active || reduced || done || (intent === "step" && !moving)) return;
    const { travel, settle } = transitionTiming(frame, next);
    const hold = readingTime(frame);
    let request: number;
    let previous: number | undefined;
    const tick = (now: number) => {
      // The same visible-time clock owns reading pauses, travel, and delivery.
      // Resuming never includes time spent paused, offscreen, or in another tab.
      if (previous !== undefined) elapsed.current += now - previous;
      previous = now;
      if (!moving) {
        const remaining = 1 - Math.max(0, elapsed.current) / hold;
        if (timer.current) {
          timer.current.style.transform = `scaleX(${Math.max(0, remaining)})`;
        }
        if (elapsed.current >= hold) {
          elapsed.current = 0;
          setMoving(true);
          return;
        }
      } else {
        progress.current = Math.max(0, Math.min(1, elapsed.current / travel));
        if (progress.current === 1) {
          if (timer.current) timer.current.style.transform = "scaleX(1)";
          setStep((value) => Math.min(value + 1, scenario.frames.length - 1));
          setMoving(false);
          // Show the arrived state before the next event begins. The old
          // transition retains progress=1; the new frame receives a fresh ref.
          elapsed.current = -settle;
          if (intent === "step") setIntent("paused");
          return;
        }
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [
    active,
    reduced,
    done,
    intent,
    moving,
    scenario,
    frame,
    next,
    step,
    progress,
  ]);

  useEffect(() => {
    const hold = readingTime(frame);
    const remaining =
      done || moving ? 0 : 1 - Math.max(0, elapsed.current) / hold;
    if (timer.current) {
      timer.current.style.transform = `scaleX(${Math.max(0, remaining)})`;
    }
  }, [done, frame, intent, moving, reduced, run]);

  function reset(id = scenarioId) {
    setMoving(false);
    setIntent((value) => (value === "auto" ? "auto" : "paused"));
    setScenarioId(id);
    setStep(0);
    setRun((value) => value + 1);
    elapsed.current = 0;
    if (timer.current) timer.current.style.transform = "scaleX(1)";
  }

  function advance() {
    if (reduced) {
      setIntent("paused");
      setStep((value) => Math.min(value + 1, scenario.frames.length - 1));
    } else {
      if (!moving) elapsed.current = 0;
      setIntent("step");
      setMoving(true);
    }
  }

  const wantsMotion = intent !== "paused" && !reduced && !done;

  return {
    scenarioId,
    scenario,
    step,
    intent,
    moving,
    reduced,
    loaded,
    unavailable,
    viewReset,
    stage,
    timer,
    progress,
    ready,
    onReady,
    onUnavailable,
    frame,
    next,
    done,
    active,
    pending,
    wantsMotion,
    reset,
    advance,
    togglePlayback: () => setIntent(wantsMotion ? "paused" : "auto"),
    resetView: () => setViewReset((value) => value + 1),
  };
}
