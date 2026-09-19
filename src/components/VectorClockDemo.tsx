import {
  ClockLetter,
  VectorNotation,
  VectorText,
} from "~/demos/vector-clocks/VectorNotation";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import {
  createPlayback,
  SPEEDS,
  STEP_ENDS,
} from "~/demos/vector-clocks/playback";
import { EVENTS, NODES, formatVector } from "~/demos/vector-clocks/model";
import type { View } from "~/demos/vector-clocks/Scene";
const CAMERA_KEYS: Record<string, View["kind"] | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "in",
  ArrowDown: "out",
  Home: "reset",
};
const Scene = lazy(() => import("~/demos/vector-clocks/Scene"));
class SceneBoundary extends Component<
  { children: ReactNode; onFailed: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailed();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function VectorClockDemo() {
  const cameraHelpId = useId();
  const [playback] = useState(createPlayback);
  const state = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const { ready, onReady } = useSceneReady();
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const stage = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [view, setView] = useState<View>({ kind: "reset", revision: 0 });
  const camera = (kind: View["kind"]) =>
    setView((v) => ({ kind, revision: v.revision + 1 }));
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => playback.setReduced(media.matches);
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
      playback.dispose();
    };
  }, [playback]);
  useEffect(() => {
    playback.setActive(visible && documentVisible && (ready || unavailable));
  }, [playback, visible, documentVisible, ready, unavailable]);
  const pending = !ready && !unavailable;
  const event = state.inProgress ? EVENTS[state.step] : undefined;
  const action = event
    ? event.kind === "local"
      ? `${event.client} writes to Node ${event.node}.`
      : event.kind === "send"
        ? `Sending is also an event: ${event.node} increases its own counter from 1 to 2.`
        : `${event.node} receives clock ${formatVector(state.message!.clock)} from ${event.peer}, takes the larger count in each position, then adds 1 to its own counter.`
    : [
        "Press Step to send the first client write.",
        "A counts one write: its event counter is now 1.",
        "C records an independent write. These two writes are concurrent: neither caused the other.",
        "A counts its send (1 → 2) and attaches [2, 0, 0]. B has not received it yet.",
        "B merges [2, 0, 0], then counts receipt (0 → 1): [2, 1, 0].",
        "B counts its send (1 → 2) and attaches [2, 2, 0]. C has not received it yet.",
        "C merges [2, 2, 0] with [0, 0, 1] to get [2, 2, 1], then counts receipt (1 → 2): [2, 2, 2].",
      ][state.completedSteps];
  return (
    <figure
      className="vc-demo"
      data-graphic-frame="workbench"
      data-graphic-key="vector-clocks"
      aria-label="Vector clocks guided demo"
    >
      <header className="vc-header">
        <p className="vc-help">
          Counters by node: [<ClockLetter index={0} />,{" "}
          <ClockLetter index={1} />, <ClockLetter index={2} />]
        </p>
      </header>
      <div
        ref={stage}
        className="vc-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
      >
        <div aria-hidden="true" className="vc-canvas">
          {pending && <DemoSceneLoading />}
          {loaded && !unavailable && (
            <SceneBoundary onFailed={onUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  state={state}
                  playback={playback}
                  view={view}
                  onReady={onReady}
                  onUnavailable={onUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          )}
        </div>
        {unavailable && (
          <p className="vc-fallback">
            3D is unavailable. Follow the clocks and use the controls below.
          </p>
        )}
      </div>
      <div className="vc-controls">
        <button
          type="button"
          disabled={pending || state.done || state.stepping}
          onClick={() => playback.step()}
        >
          Step
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => playback.restart()}
        >
          Restart
        </button>
        <button
          type="button"
          disabled={pending || unavailable}
          onClick={() => camera("reset")}
          onKeyDown={(event) => {
            const key = CAMERA_KEYS[event.key];
            if (key) {
              event.preventDefault();
              camera(key);
            }
          }}
          aria-describedby={cameraHelpId}
        >
          Reset view
        </button>
        <label className="vc-speed">
          Speed
          <select
            value={state.speed}
            onChange={(event) => playback.setSpeed(Number(event.target.value))}
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <p id={cameraHelpId} className="vc-help">
        Drag to orbit · Scroll to zoom
        <span className="sr-only">
          . With Reset view focused, use arrow keys to rotate or zoom, and Home
          to reset.
        </span>
      </p>
      <div
        className={unavailable ? "vc-clocks" : "sr-only"}
        aria-label="Current node clocks"
      >
        {NODES.map((node) => (
          <div key={node}>
            <strong>Node {node}</strong>{" "}
            <VectorNotation value={state.clocks[node]} />
          </div>
        ))}
      </div>
      <div
        className="vc-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="vc-progress">
          {state.inProgress ? "Animating step" : "Step"}{" "}
          {state.completedSteps + (state.inProgress ? 1 : 0)} of{" "}
          {STEP_ENDS.length - 1}
        </p>
        <p>
          <VectorText text={action} />
        </p>
      </div>
      {state.done && (
        <figcaption>
          C learned about A through B. The original writes remain concurrent.
        </figcaption>
      )}
    </figure>
  );
}
