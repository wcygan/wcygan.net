import { DemoSceneLoading } from "./DemoSceneLoading";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { databaseLogSnapshot, LOG_RECORDS } from "~/demos/database-log/model";

const Scene = lazy(() => import("~/demos/database-log/Scene"));

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
    return this.state.failed ? (
      <p className="database-log-scene-fallback">
        3D is unavailable. Use the controls to follow each write in the log.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function DatabaseLogDemo() {
  const started = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const markUnavailable = useCallback(() => {
    setUnavailable(true);
    setSceneReady(true);
  }, []);
  const figure = useRef<HTMLElement>(null);
  const highlightTimer = useRef<number | null>(null);
  const speed = 4;
  const [step, setStep] = useState(0);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [missingId, setMissingId] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [top, setTop] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const state = databaseLogSnapshot(step);
  const active = (sceneReady || unavailable) && visible && documentVisible;
  const markSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  useEffect(() => {
    if (!sceneReady || !active || started.current) return;
    started.current = true;
    setStep((current) => (current === 0 ? 1 : current));
  }, [sceneReady, active]);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(media.matches);
      if (media.matches) {
        setStep(2);
      }
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
    if (figure.current) preload.observe(figure.current);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.5] },
    );
    if (figure.current) observer.observe(figure.current);

    return () => {
      if (highlightTimer.current !== null) {
        window.clearTimeout(highlightTimer.current);
      }
      observer.disconnect();
      preload.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!sceneReady || !active || step % 2 !== 1) return;
    const timer = window.setTimeout(
      () => setStep((current) => Math.min(LOG_RECORDS.length * 2, current + 1)),
      900 / speed,
    );
    return () => clearTimeout(timer);
  }, [sceneReady, active, step, speed]);

  function writeNext() {
    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = null;
    }
    setMissingId(null);
    if (state.done) {
      setHighlightedId(null);
      setStep(0);
      return;
    }
    setHighlightedId(null);
    setMissingId(null);
    setStep(state.appended.length * 2 + 1);
  }

  function readRandom() {
    const record = LOG_RECORDS[Math.floor(Math.random() * LOG_RECORDS.length)];
    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = null;
    }
    const present = record.id <= state.appended.length;
    setHighlightedId(present ? record.id : null);
    setMissingId(present ? null : record.id);
    highlightTimer.current = window.setTimeout(() => {
      setHighlightedId(null);
      setMissingId(null);
      highlightTimer.current = null;
    }, 1000);
  }

  const status =
    state.writing && state.current
      ? `Writing ${state.current.operation} ${state.current.key} from the database.`
      : missingId !== null
        ? `Element ${missingId} Not Found`
        : highlightedId
          ? `Read ${LOG_RECORDS[highlightedId - 1].operation} ${LOG_RECORDS[highlightedId - 1].key} at offset ${highlightedId - 1}.`
          : state.done
            ? `${state.appended.length} writes appended to one ordered log.`
            : state.appended.length
              ? `${state.appended.length} write${state.appended.length === 1 ? "" : "s"} appended. Read or write the next element.`
              : "A database write travels to an append-only log.";

  const pending = !sceneReady && !unavailable;

  return (
    <figure
      aria-busy={pending}
      ref={figure}
      className="database-log-demo"
      data-graphic-frame="workbench"
      data-graphic-key="database-log"
      data-graphic-kind="canvas"
      aria-label="Database cylinder connected to an append-only log"
    >
      <header className="database-log-demo-header">
        <p className="article-graphic-title">
          A database write becomes an ordered log entry
        </p>
      </header>
      <div
        className="database-log-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        aria-hidden="true"
      >
        {pending && <DemoSceneLoading />}
        {unavailable ? (
          <p className="database-log-scene-fallback">
            3D is unavailable. Use the controls to follow each write in the log.
          </p>
        ) : loaded ? (
          <>
            <SceneBoundary onFailed={markUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  step={step}
                  reduced={reduced}
                  active={active}
                  speed={speed}
                  top={top}
                  highlightedId={highlightedId}
                  missingId={missingId}
                  onUnavailable={markUnavailable}
                  onReady={markSceneReady}
                />
              </Suspense>
            </SceneBoundary>
          </>
        ) : (
          <p className="database-log-scene-fallback">
            Database → append-only log
          </p>
        )}
      </div>
      <div className="database-log-controls">
        <div>
          <button
            type="button"
            disabled={pending || !sceneReady || state.writing}
            onClick={writeNext}
          >
            {state.done ? "Reset" : "Write"}
          </button>
          <button
            type="button"
            disabled={pending || !sceneReady || state.writing}
            onClick={readRandom}
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
        <p>{status}</p>
        <code>database → log[offset]</code>
      </div>
    </figure>
  );
}
