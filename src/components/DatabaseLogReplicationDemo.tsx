import { DemoSceneLoading } from "./DemoSceneLoading";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createReplicationPlayback } from "~/demos/database-log-replication/playback";

import { concurrentStatus } from "~/demos/database-log-replication/model";

const Scene = lazy(() => import("~/demos/database-log-replication/Scene"));

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

export function DatabaseLogReplicationDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const [playback] = useState(createReplicationPlayback);
  const state = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const started = useRef(false);
  const [readVersion, setReadVersion] = useState(0);
  const [readOffset, setReadOffset] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [top, setTop] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const active = (sceneReady || unavailable) && visible && documentVisible;
  const markReady = useCallback(() => setSceneReady(true), []);
  const markUnavailable = useCallback(() => {
    setUnavailable(true);
    setSceneReady(true);
  }, []);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(media.matches);
      playback.setReduced(media.matches);
    };
    updateMotion();
    media.addEventListener("change", updateMotion);
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    // Warm the scene near the viewport without starting offscreen playback.
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          preload.disconnect();
        }
      },
      { rootMargin: "400px", threshold: 0 },
    );
    if (stage.current) preload.observe(stage.current);

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
      preload.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [playback]);

  useEffect(() => {
    playback.setActive(active);
    return () => playback.setActive(false);
  }, [active, playback]);

  useEffect(() => {
    if (!sceneReady || !active || started.current) return;
    started.current = true;
    playback.write();
  }, [sceneReady, active, playback]);

  useEffect(() => {
    if (readOffset === null) return;
    const timer = window.setTimeout(() => setReadOffset(null), 2400);
    return () => clearTimeout(timer);
  }, [readOffset, readVersion]);

  function writeNext() {
    if (state.done) {
      setReadOffset(null);
      playback.reset();
    } else playback.write();
  }

  const pending = !sceneReady && !unavailable;

  return (
    <figure
      aria-busy={pending}
      className="database-log-demo database-log-replication-demo"
      data-graphic-frame="workbench"
      data-graphic-key="database-log-replication"
      data-graphic-kind="canvas"
      aria-label="Log replication from a primary database to a replica"
    >
      <header className="database-log-demo-header">
        <p className="article-graphic-title">
          Logs are replicated across nodes
        </p>
      </header>
      <div
        ref={stage}
        className="database-log-replication-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        aria-hidden="true"
      >
        {pending && <DemoSceneLoading />}
        {unavailable ? (
          <p className="database-log-scene-fallback">
            3D is unavailable. Follow the primary, received, and applied counts
            below.
          </p>
        ) : loaded ? (
          <SceneBoundary onFailed={markUnavailable}>
            <Suspense
              fallback={
                <p className="database-log-scene-fallback">
                  Loading primary and replica…
                </p>
              }
            >
              <Scene
                playback={playback}
                state={state}
                active={active && !reduced}
                top={top}
                readOffset={readOffset}
                onReady={markReady}
                onUnavailable={markUnavailable}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          <p className="database-log-scene-fallback">
            Primary log → replication pipeline → replica log
          </p>
        )}
      </div>
      <div className="database-log-controls">
        <div>
          <button
            type="button"
            disabled={
              pending ||
              !sceneReady ||
              state.cooling ||
              (state.full && !state.done)
            }
            onClick={writeNext}
          >
            {state.done ? "Reset" : "Write"}
          </button>
          <button
            type="button"
            disabled={pending || !sceneReady}
            onClick={() => {
              setReadOffset(state.primary.length - 1);
              setReadVersion((current) => current + 1);
            }}
          >
            Read
          </button>
        </div>
        <button
          disabled={pending}
          type="button"
          aria-pressed={top}
          onClick={() => setTop((current) => !current)}
        >
          Top view
        </button>
      </div>
      <div className="database-log-status" role="status" aria-live="polite">
        <p>{concurrentStatus(state)}</p>
        <code>
          Primary {state.primary.length} · Received {state.replica.length} ·
          Applied {state.applied.length} · Lag {state.lag}
        </code>
        <p className="database-log-replication-read">
          {readOffset === null
            ? "Reads and writes → primary only"
            : readOffset < 0
              ? "Read served by primary: no committed entries yet."
              : `Read served by primary at log offset ${readOffset}.`}
        </p>
      </div>
    </figure>
  );
}
