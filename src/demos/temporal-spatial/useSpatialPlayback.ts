import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { spatialSnapshot, type CompensationMode, type DemoKind } from "./model";

export function motionPhases(kind: DemoKind, routes: string[]) {
  if (kind === "parallel" && routes.includes("begin"))
    return [["begin"], routes.filter((route) => route !== "begin")];
  // A reserve call must return before its result can be reported to history.
  return kind === "replay" &&
    routes.includes("reserve") &&
    routes.includes("record")
    ? [["reserve"], ["record"]]
    : [routes];
}
interface Motion {
  target: number;
  phase: number;
  paused: boolean;
}

/** Playback owns only discrete domain commits; packet positions use a ref. */
export function useSpatialPlayback(
  kind: DemoKind,
  mode: CompensationMode,
  presentationReady: boolean,
) {
  const stage = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [step, setStep] = useState(0);
  const [motion, setMotion] = useState<Motion | null>(null);
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const [playing, setPlaying] = useState(true);
  const [startupPending, setStartupPending] = useState(true);
  const startupRemaining = useRef(1000);
  const settledRemaining = useRef(1600);
  const settledRevision = useRef(0);
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const frame = useMemo(
    () => spatialSnapshot(kind, step, mode),
    [kind, step, mode],
  );
  const target = useMemo(
    () => (motion ? spatialSnapshot(kind, motion.target, mode) : null),
    [kind, mode, motion?.target],
  );
  const phases = useMemo(
    () => (target ? motionPhases(kind, target.routes) : []),
    [kind, target],
  );
  const active = visible && documentVisible && !reduced && presentationReady;
  const moving = motion !== null;
  const running = moving && !motion.paused && active;
  const wantsMotion = !reduced && (playing || (moving && !motion.paused));

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(preference.matches);
      if (preference.matches) {
        setPlaying(false);
        setStartupPending(false);
        const current = motionRef.current;
        if (current) setStep(current.target);
        setMotion(null);
      }
    };
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const nearby = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: "200px" },
    );
    const onscreen = new IntersectionObserver(
      ([entry]) =>
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.3),
      { threshold: 0.3 },
    );
    if (stage.current) {
      nearby.observe(stage.current);
      onscreen.observe(stage.current);
    }
    return () => {
      nearby.disconnect();
      onscreen.disconnect();
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!playing || !startupPending || !active || frame.done) return;
    const startedAt = performance.now();
    const remaining = startupRemaining.current;
    let started = false;
    const timer = window.setTimeout(() => {
      started = true;
      setStartupPending(false);
    }, remaining);
    return () => {
      window.clearTimeout(timer);
      if (!started)
        startupRemaining.current = Math.max(
          0,
          remaining - (performance.now() - startedAt),
        );
    };
  }, [playing, startupPending, active, frame.done]);

  useEffect(() => {
    if (!playing || startupPending || moving || !active || frame.done) return;
    const startedAt = performance.now();
    const remaining = settledRemaining.current;
    const revision = settledRevision.current;
    let delivered = false;
    const timer = window.setTimeout(() => {
      delivered = true;
      settledRemaining.current = 1600;
      progress.current = 0;
      setMotion({ target: step + 1, phase: 0, paused: false });
    }, remaining);
    return () => {
      window.clearTimeout(timer);
      if (!delivered && revision === settledRevision.current)
        settledRemaining.current = Math.max(
          0,
          remaining - (performance.now() - startedAt),
        );
    };
  }, [
    playing,
    startupPending,
    moving,
    active,
    frame.done,
    step,
    playbackRevision,
  ]);

  useEffect(() => {
    if (!running || !motion) return;
    let frameId: number;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null)
        progress.current = Math.min(
          1,
          progress.current + Math.min(50, now - previous) / 1200,
        );
      previous = now;
      if (progress.current < 1) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      if (motion.phase < phases.length - 1) {
        progress.current = 0;
        setMotion({ ...motion, phase: motion.phase + 1 });
      } else {
        setStep(motion.target);
        setMotion(null);
        if (motion.target === frame.last) setPlaying(false);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [running, motion, phases.length, frame.last]);

  const next = useCallback(() => {
    setPlaying(false);
    setStartupPending(false);
    setMotion(null);
    setPlaybackRevision(++settledRevision.current);
    settledRemaining.current = 1600;
    progress.current = 0;
    setStep((value) => Math.min(frame.last, value + 1));
  }, [frame.last]);
  const replay = useCallback(() => {
    setPlaying(!reduced);
    setStartupPending(false);
    setMotion(null);
    // Replay at step zero must also restart an already running settled wait.
    setPlaybackRevision(++settledRevision.current);
    settledRemaining.current = 1600;
    progress.current = 0;
    setStep(0);
  }, [reduced]);
  const toggle = useCallback(() => {
    // Reader controls take over from the pending viewport start.
    setStartupPending(false);
    if (wantsMotion) {
      setPlaying(false);
      setMotion((value) => (value ? { ...value, paused: true } : null));
    } else {
      setPlaying(true);
      setMotion((value) => (value ? { ...value, paused: false } : null));
    }
  }, [wantsMotion]);
  return {
    stage,
    frame,
    target,
    progress,
    step,
    moving,
    running,
    wantsMotion,
    playing,
    loaded,
    reduced,
    active,
    routeIds: motion ? phases[motion.phase] : frame.routes,
    next,
    replay,
    toggle,
  };
}
