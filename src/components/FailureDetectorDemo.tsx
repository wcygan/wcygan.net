import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  candidates,
  deadline,
  followerIds,
  isSettled,
  reachableFollowers,
} from "~/demos/failure-detectors/model";
import {
  faultSummary,
  outcome,
  seconds,
} from "~/demos/failure-detectors/presentation";
import type { ViewCommand } from "~/demos/failure-detectors/Scene";
import {
  createPlayback,
  type Playback,
} from "~/demos/failure-detectors/playback";
import type { Simulation } from "~/demos/failure-detectors/types";

const Scene = lazy(() => import("~/demos/failure-detectors/Scene"));
const VIEW_KEYS: Record<string, ViewCommand["kind"] | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "in",
  ArrowDown: "out",
  Home: "reset",
};
class SceneBoundary extends Component<
  { children: ReactNode; onUnavailable: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Fallback({
  state,
  playback,
  active,
}: {
  state: Simulation;
  playback: Playback;
  active: boolean;
}) {
  const [now, setNow] = useState(playback.getTime);
  useEffect(() => {
    setNow(playback.getTime());
    if (!active) return;
    const timer = setInterval(() => setNow(playback.getTime()), 100);
    return () => clearInterval(timer);
  }, [state, playback, active]);
  return (
    <div className="fd-fallback">
      <p>3D is unavailable. The experiment still runs below.</p>
      <p>
        Leader B · {state.transport.crashed ? "crashed" : "sending heartbeats"}
      </p>
      <ul>
        {followerIds(state).map((peer) => (
          <li key={peer}>
            {peer} ·{" "}
            {state.followers[peer]?.role === "candidate"
              ? "Timed out"
              : `${seconds(Math.max(0, deadline(state, peer) - now))} left`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FailureDetectorDemo() {
  const [playback] = useState(() => createPlayback());
  const state = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const { dispatch } = playback;
  const stage = useRef<HTMLDivElement>(null);
  const diagnostic = useRef<HTMLDialogElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const expired = candidates(state);
  const settled = isSettled(state);
  const listeners = followerIds(state);
  const running = visible && documentVisible && !settled;
  const failScene = useCallback(() => setUnavailable(true), []);
  const faults = faultSummary(state);
  const canDisrupt =
    !settled &&
    !state.transport.crashed &&
    reachableFollowers(state).length > 0;
  const reset = () => {
    diagnostic.current?.close();
    dispatch({ type: "reset" });
  };

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.25] },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    playback.setActive(running);
    return () => playback.setActive(false);
  }, [running, playback]);
  useEffect(() => {
    // Dismissal only closes the explanation. Only Reset leaves the settled state.
    if (settled) diagnostic.current?.showModal();
    else diagnostic.current?.close();
  }, [settled]);

  return (
    <figure
      className="fd-demo"
      data-graphic-frame="workbench"
      data-graphic-key="failure-detectors"
      data-graphic-kind="canvas"
      aria-label="Leader heartbeats and independent follower timeouts"
    >
      <label className="fd-slider fd-node-count">
        <span>
          Number of nodes <output>{state.config.nodeCount}</output>
        </span>
        <input
          type="range"
          aria-label="Number of nodes"
          min={2}
          max={5}
          step={1}
          value={state.config.nodeCount}
          disabled={settled}
          onChange={(e) =>
            dispatch({
              type: "configure",
              values: { nodeCount: Number(e.target.value) },
            })
          }
        />
      </label>
      <div
        className="fd-stage"
        ref={stage}
        data-graphic-stage="flush"
        data-clock={state.now}
        tabIndex={0}
        role="group"
        aria-label="Heartbeat network. Arrow keys rotate or zoom; Home resets the view."
        onKeyDown={(event) => {
          const command = VIEW_KEYS[event.key];
          if (command) {
            event.preventDefault();
            setView((v) => ({ kind: command, revision: v.revision + 1 }));
          }
        }}
      >
        {unavailable ? (
          <Fallback state={state} playback={playback} active={running} />
        ) : (
          <div className="fd-canvas" aria-hidden="true">
            {loaded ? (
              <SceneBoundary onUnavailable={failScene}>
                <Suspense
                  fallback={
                    <p className="fd-fallback">
                      Loading the heartbeat network…
                    </p>
                  }
                >
                  <Scene
                    state={state}
                    playback={playback}
                    active={running}
                    reduced={reduced}
                    view={view}
                    onUnavailable={failScene}
                  />
                </Suspense>
              </SceneBoundary>
            ) : (
              <p className="fd-fallback">Leader B → {listeners.join(", ")}</p>
            )}
          </div>
        )}
        <span className="sr-only">
          Leader B. Followers {listeners.join(", ")}, each with an independent
          randomized timeout.{" "}
          {expired.length
            ? `Timed out: ${expired.join(", ")}.`
            : "No timeouts."}
        </span>
      </div>
      <figcaption className="fd-guide">
        Hearts refill each follower’s timer. Red means timed out.
        <br />
        Drag to rotate · scroll to zoom · ½ speed
      </figcaption>
      <div className="fd-actions" role="group" aria-label="Experiment controls">
        <button ref={resetButton} type="button" onClick={reset}>
          Reset
        </button>
        <button
          type="button"
          disabled={state.transport.crashed || settled}
          onClick={() => dispatch({ type: "crash" })}
        >
          Crash leader
        </button>
        <button
          type="button"
          disabled={!canDisrupt}
          onClick={() => dispatch({ type: "cut" })}
        >
          Cut random link
        </button>
        <button
          type="button"
          disabled={!canDisrupt || !!state.transport.dropNext}
          onClick={() => dispatch({ type: "drop" })}
        >
          Drop random heartbeat
        </button>
      </div>
      <p className="fd-faults" role="status">
        {faults}
      </p>
      {settled && (
        <p className="fd-paused">
          Paused at {seconds(state.now)}: {expired.join(", ")} timed out. Select
          Reset to begin again.
        </p>
      )}
      <dialog
        ref={diagnostic}
        className="fd-notice"
        aria-labelledby={`${id}-timeout`}
        aria-describedby={`${id}-diagnostic ${id}-restart`}
        onClose={() => resetButton.current?.focus({ preventScroll: true })}
      >
        <h2 id={`${id}-timeout`}>
          Demo paused: {expired.join(", ")} timed out
        </h2>
        <p id={`${id}-diagnostic`}>{outcome(state)}</p>
        {faults && (
          <p className="fd-notice-faults">Injected faults: {faults}</p>
        )}
        <p id={`${id}-restart`}>
          Dismiss to inspect the frozen scene, or select Reset to begin again.
        </p>
        <div className="fd-actions">
          <button type="button" onClick={() => diagnostic.current?.close()}>
            Dismiss
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </dialog>
    </figure>
  );
}
