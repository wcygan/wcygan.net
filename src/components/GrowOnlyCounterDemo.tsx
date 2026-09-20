import {
  NodeLetter,
  VectorNotation,
  VectorText,
} from "~/demos/grow-only-counter/VectorNotation";
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
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import { createPlayback, SPEEDS } from "~/demos/grow-only-counter/playback";
import { formatVector, NODES, value } from "~/demos/grow-only-counter/model";
import type { View } from "~/demos/grow-only-counter/Scene";
const CAMERA_KEYS: Record<string, View["kind"] | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "in",
  ArrowDown: "out",
  Home: "reset",
};
const Scene = lazy(() => import("~/demos/grow-only-counter/Scene"));
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
export function GrowOnlyCounterDemo() {
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
  const figure = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [view, setView] = useState<View>({ kind: "reset", revision: 0 });
  const [cameraView, setCameraView] = useState<"side" | "top">("side");
  const camera = (kind: View["kind"]) => {
    if (kind === "reset") setCameraView("side");
    if (kind === "top") setCameraView("top");
    setView((v) => ({ kind, revision: v.revision + 1 }));
  };
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
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: 0 },
    );
    // Keep deliveries usable while the reader is viewing the message controls.
    if (figure.current) observer.observe(figure.current);
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
  const event = state.action;
  const action = event
    ? event.kind === "increment"
      ? `${event.client} sends Increment +1 to ${event.node}.`
      : `Delivering ${event.message.from} → ${event.message.to}: saved state ${formatVector(
          event.message.vector,
        )}. The receiver changes only on arrival.`
    : state.status;
  return (
    <figure
      ref={figure}
      className="gc-demo"
      data-graphic-frame="workbench"
      data-graphic-key="grow-only-counter"
      aria-label="Grow-only counter free-form demo"
    >
      <header className="gc-header">
        <p className="gc-help">
          Increments by node: [<NodeLetter index={0} />,{" "}
          <NodeLetter index={1} />, <NodeLetter index={2} />]
        </p>
      </header>
      <p className="gc-transfer" aria-hidden="true">
        {event?.kind === "deliver" ? (
          <>
            {event.message.from} → {event.message.to} · State{" "}
            <VectorNotation value={event.message.vector} />
          </>
        ) : (
          " "
        )}
      </p>
      <div
        className="gc-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
      >
        <div aria-hidden="true" className="gc-canvas">
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
          <p className="gc-fallback">
            3D is unavailable. Follow the counters and use the controls below.
          </p>
        )}
      </div>
      <div className="gc-controls">
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
          onClick={() => camera(cameraView === "top" ? "reset" : "top")}
          onKeyDown={(event) => {
            const key = CAMERA_KEYS[event.key];
            if (key) {
              event.preventDefault();
              camera(key);
            }
          }}
          aria-describedby={cameraHelpId}
        >
          {cameraView === "top" ? "Side view" : "Top view"}
        </button>
        <label className="gc-speed">
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
      <div className="gc-controls" aria-label="Client increments">
        <button
          type="button"
          disabled={pending || state.inProgress}
          onClick={() => playback.increment("A")}
        >
          Increment A
        </button>
        <button
          type="button"
          disabled={pending || state.inProgress}
          onClick={() => playback.increment("C")}
        >
          Increment C
        </button>
      </div>
      <p className="gc-help">
        Deliver saved counts in any order—even twice. Incrementing a node
        refreshes its messages.
      </p>
      <div className="gc-messages" aria-label="Saved messages">
        {state.messages.map((message) => (
          <button
            className="gc-message"
            key={message.id}
            type="button"
            disabled={pending || state.inProgress}
            onClick={() => playback.deliver(message.id)}
            aria-label={`${state.delivered.includes(message.id) ? "Deliver again" : "Deliver"} ${message.from} to ${message.to}`}
          >
            <span>
              {message.from} → {message.to}
            </span>
            <VectorNotation value={message.vector} />
            <span className="gc-message-check" aria-hidden="true">
              {state.delivered.includes(message.id) ? "✓" : ""}
            </span>
          </button>
        ))}
      </div>
      <p id={cameraHelpId} className="gc-help">
        Drag to orbit · Scroll to zoom
        <span className="sr-only">
          . With the view toggle focused, use arrow keys to rotate or zoom, and
          Home to return to the side view.
        </span>
      </p>
      <div
        className={unavailable ? "gc-replicas" : "sr-only"}
        aria-label="Current node counters"
      >
        {NODES.map((node) => (
          <div key={node}>
            <strong>Node {node}</strong>{" "}
            <VectorNotation value={state.replicas[node]} />
            <span>Value: {value(state.replicas[node])}</span>
          </div>
        ))}
      </div>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p>
          {state.delivered.length} of {state.messages.length} saved messages
          delivered
        </p>
        <p>
          <VectorText text={action} />
        </p>
      </div>
      {!state.inProgress && state.converged && (
        <figcaption>
          All three replicas hold <VectorNotation value={state.replicas.A} />.
          Each reads {state.replicas.A.join(" + ")} = {value(state.replicas.A)}:
          every increment is counted once.
        </figcaption>
      )}
    </figure>
  );
}
