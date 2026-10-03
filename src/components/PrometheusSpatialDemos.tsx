import { INTRO } from "~/demos/prometheus/spatial/intro-model";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSceneReady } from "./DemoSceneLoading";
import {
  cardinalitySnapshot,
  storageSnapshot,
  STORAGE_STEPS,
  type CardinalityScenario,
} from "~/demos/prometheus/spatial/model";
import type { SceneKind, ViewCommand } from "~/demos/prometheus/spatial/Scene";
import { usePrometheusPlayback } from "~/demos/prometheus/playback";

const Scene = lazy(() => import("~/demos/prometheus/spatial/Scene"));

const VIEW_KEYS: Record<string, ViewCommand["kind"] | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "+": "in",
  "=": "in",
  "-": "out",
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

function StaticSummary({
  kind,
  scenario,
  step,
}: {
  kind: SceneKind;
  scenario: CardinalityScenario;
  step: number;
}) {
  if (kind === "cardinality") {
    const snapshot = cardinalitySnapshot(scenario);
    return (
      <div className="prometheus-spatial-fallback">
        <p className="prometheus-spatial-fallback-count">
          {snapshot.count} observed series
        </p>
        <p>
          2 methods × 3 routes × 2 statuses
          {scenario === "users" ? " × 10 users" : ""}
        </p>
        <div className="prometheus-spatial-fallback-grid">
          {["/orders", "/search", "/health"].map((route) => (
            <div key={route}>
              <code>{route}</code>
              <span>{scenario === "users" ? 40 : 4} series</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind !== "storage")
    return (
      <div className="prometheus-spatial-fallback">
        <p className="prometheus-spatial-fallback-count">{INTRO[kind].title}</p>
        <p>{INTRO[kind].states[step]}</p>
      </div>
    );
  const snapshot = storageSnapshot(step);
  return (
    <div className="prometheus-spatial-fallback">
      <p className="prometheus-spatial-fallback-count">{snapshot.title}</p>
      <div className="prometheus-spatial-fallback-blocks">
        {snapshot.blocks.map((block) => (
          <span key={block.id}>
            {block.startHour}–{block.endHour} h<br />
            Immutable
          </span>
        ))}
      </div>
      <p>
        Head: {snapshot.head.startHour}–{snapshot.head.endHour} h ·{" "}
        {snapshot.head.samples} recent samples
      </p>
      <p>
        WAL: {snapshot.walSamples} recent samples
        {snapshot.recovery ? " · replayed after restart" : ""}
      </p>
      {snapshot.deletedRange && (
        <p>
          Expired block: {snapshot.deletedRange.startHour}–
          {snapshot.deletedRange.endHour} h
        </p>
      )}
    </div>
  );
}

function SpatialDemo({ kind }: { kind: SceneKind }) {
  const title =
    kind === "cardinality"
      ? "Label Cardinality"
      : kind === "storage"
        ? "Local Storage"
        : INTRO[kind].title;
  const titleId = useId();
  const guideId = useId();
  const stage = useRef<HTMLDivElement>(null);
  const { ready, onReady } = useSceneReady();
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [scenario, setScenario] = useState<CardinalityScenario>("bounded");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const markUnavailable = useCallback(() => setUnavailable(true), []);
  const cardinality = cardinalitySnapshot(scenario);
  const selected = cardinality.series[selectedIndex];
  const storage = storageSnapshot(step);
  const pending = loaded && !ready && !unavailable;
  const cameraAvailable = ready && !unavailable;
  const advance = (next: number) => {
    setStep(next);
    if (kind === "cardinality") {
      setScenario(next === 3 ? "users" : "bounded");
      setSelectedIndex([0, 1, 6, 0][next]);
    }
  };
  const playback = usePrometheusPlayback({
    step,
    lastStep: STORAGE_STEPS - 1,
    onStep: advance,
    onReset: () => advance(0),
    intervalMs: 2600,
    enabled: ready || unavailable,
  });
  const inspect = (index: number) => {
    playback.pause();
    setSelectedIndex(index);
  };

  useEffect(() => {
    // The HTML model is useful during SSR, without WebGL, and before this
    // figure approaches the viewport. No scene mounts on the server.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: "200px" },
    );
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  const command = (kind: ViewCommand["kind"]) =>
    setView((current) => ({ kind, revision: current.revision + 1 }));

  return (
    <figure
      ref={playback.ref}
      className="prometheus-spatial-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="canvas"
      data-graphic-key={`prometheus-${kind}`}
      data-playback={
        step === STORAGE_STEPS - 1
          ? "complete"
          : playback.playing
            ? "playing"
            : "paused"
      }
      data-playback-active={playback.active}
      data-playback-step={step}
      aria-labelledby={titleId}
      aria-busy={pending}
    >
      <header className="prometheus-spatial-header">
        <p id={titleId} className="article-graphic-title">
          {title}
        </p>
        {kind === "cardinality" && (
          <div
            className="prometheus-spatial-scenarios"
            role="group"
            aria-label="Label cardinality scenario"
          >
            {(
              [
                ["bounded", "Bounded labels"],
                ["users", "Add 10 user IDs"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={scenario === id}
                onClick={() => {
                  playback.pause();
                  setScenario(id);
                  setSelectedIndex(0);
                  setStep(id === "users" ? 3 : 0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div
        ref={stage}
        className="prometheus-spatial-stage"
        data-graphic-stage="flush"
        data-scene-state={
          unavailable ? "unavailable" : ready ? "ready" : "loading"
        }
        role="group"
        tabIndex={0}
        aria-label={`${title}: interactive 3D view`}
        aria-describedby={guideId}
        onKeyDown={(event) => {
          const kind = VIEW_KEYS[event.key];
          if (!kind || !cameraAvailable) return;
          event.preventDefault();
          command(kind);
        }}
      >
        {(!ready || unavailable) && (
          <StaticSummary kind={kind} scenario={scenario} step={step} />
        )}
        {loaded && !unavailable && (
          <div className="prometheus-spatial-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={markUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  kind={kind}
                  scenario={scenario}
                  selectedIndex={selectedIndex}
                  onSelect={inspect}
                  step={step}
                  animate={playback.motionAllowed}
                  reducedMotion={playback.reducedMotion}
                  view={view}
                  onReady={onReady}
                  onUnavailable={markUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
      </div>
      <div className="prometheus-spatial-actions">
        <button
          type="button"
          disabled={playback.reducedMotion || (!ready && !unavailable)}
          onClick={playback.toggle}
        >
          {playback.playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={step === STORAGE_STEPS - 1}
          onClick={() => {
            playback.pause();
            advance(step + 1);
          }}
        >
          Next step
        </button>
        <button type="button" onClick={playback.replay}>
          Replay
        </button>
        {kind === "cardinality" && (
          <button
            type="button"
            onClick={() => inspect((selectedIndex + 1) % cardinality.count)}
          >
            Inspect next series
          </button>
        )}
        <button
          type="button"
          disabled={!cameraAvailable}
          onClick={() => command("reset")}
        >
          Reset view
        </button>
      </div>
      <div
        className="prometheus-spatial-camera"
        role="group"
        aria-label={`${title} camera controls`}
      >
        {(
          [
            ["left", "Rotate left"],
            ["right", "Rotate right"],
            ["in", "Zoom in"],
            ["out", "Zoom out"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={!cameraAvailable}
            onClick={() => command(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p id={guideId} className="prometheus-spatial-guide">
        {unavailable
          ? "3D is unavailable; showing the same model as text."
          : "Drag or arrows: orbit · +/−: zoom · Home: reset"}
        {kind === "cardinality" && " · Select a cube"}
      </p>
      <div
        className="prometheus-spatial-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {kind === "cardinality" ? (
          <>
            <p>
              <strong>{cardinality.count} observed series.</strong>{" "}
              {cardinality.dimensionSummary}
            </p>
            <code className="prometheus-spatial-series">
              http_requests_total&#123;method="{selected.method}", route="
              {selected.route}", status="{selected.status}"
              {selected.userId ? `, user_id="${selected.userId}"` : ""}&#125;
            </code>
          </>
        ) : kind !== "storage" ? (
          <>
            <p className="prometheus-spatial-step">
              {step + 1} / 4 · {title}
            </p>
            <p>{INTRO[kind].states[step]}</p>
          </>
        ) : (
          <>
            <p className="prometheus-spatial-step">
              {step + 1} / {STORAGE_STEPS} · {storage.title}
            </p>
            <p className="prometheus-spatial-readout">
              {storage.blocks.length} immutable{" "}
              {storage.blocks.length === 1 ? "block" : "blocks"} ·{" "}
              {storage.head.samples} Head samples · {storage.walSamples} WAL
              samples
            </p>
          </>
        )}
      </div>
      <figcaption>
        {kind === "cardinality"
          ? "Cube = emitted label set · orange = selection. Ten user IDs multiply these twelve combinations to 120."
          : kind !== "storage"
            ? INTRO[kind].caption
            : "Width = time. WAL recovers Head; compaction preserves samples; retention deletes expired blocks. Simplified sequence."}
      </figcaption>
    </figure>
  );
}

export function PrometheusCardinalityDemo() {
  return <SpatialDemo kind="cardinality" />;
}

export function PrometheusStorageDemo() {
  return <SpatialDemo kind="storage" />;
}

export function PrometheusArchitectureDemo() {
  return <SpatialDemo kind="architecture" />;
}
export function PrometheusSeriesDemo() {
  return <SpatialDemo kind="series" />;
}
export function PrometheusAlertsDemo() {
  return <SpatialDemo kind="alerts" />;
}
