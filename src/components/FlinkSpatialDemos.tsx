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
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import {
  KEY_ASSIGNMENT,
  KEY_RECORDS,
  keyedSnapshot,
  recoverySnapshot,
  runtimeSnapshot,
  shuffleSnapshot,
  skewSnapshot,
  barrierSnapshot,
} from "~/demos/flink-spatial/model";
import type { SceneKind, ViewCommand } from "~/demos/flink-spatial/Scene";
import { useFlinkPlayback } from "~/demos/flink-shared/useFlinkPlayback";
import "~/demos/flink-shared/theme.css";
import "~/demos/flink-spatial/styles.css";

const Scene = lazy(() => import("~/demos/flink-spatial/Scene"));
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

const descriptions: Record<
  SceneKind,
  { title: string; steps: number; caption: string; initial: string }
> = {
  keyed: {
    title: "Keyed State",
    steps: KEY_RECORDS.length,
    caption:
      "One independent count per key, even when keys share a subtask. This assignment is illustrative, not Flink’s actual hashing.",
    initial: "Six records; three independent key counts.",
  },
  runtime: {
    title: "Flink Workers",
    steps: 3,
    caption:
      "Raised blocks are subtasks. Yellow dashed routes coordinate; colored solid routes carry records. Placement is illustrative. Task slots allocate resources, not dedicated CPU cores.",
    initial: "JobManager coordinates; TaskManagers execute.",
  },
  recovery: {
    title: "Checkpoint Recovery",
    steps: 11,
    caption:
      "Restore source position and count together from a completed checkpoint, then replay. This scene models state recovery; external sink guarantees require a suitable protocol.",
    initial: "Consume → checkpoint → crash → restore → replay.",
  },
  shuffle: {
    title: "Bring the same key together",
    steps: 4,
    initial: "Two sources; ownership follows the key.",
    caption:
      "Same key, same owner, regardless of source. Dashed routes show possible destinations. This illustrates keyBy; the assignment is not Flink’s hash function.",
  },
  skew: {
    title: "One hot key limits parallel work",
    steps: 10,
    initial: "Twelve records; four equally capable subtasks.",
    caption:
      "Three batches of four; each subtask serves one record per teaching step. Compare one hot key with four balanced keys. Idle workers cannot split a per-key counter.",
  },
  barrier: {
    title: "Take a consistent checkpoint",
    steps: 6,
    initial: "Two input channels; one checkpoint boundary.",
    caption:
      "Each input pauses at its yellow barrier until both arrive. Later records stay outside the snapshot. One operator with aligned checkpoints; unaligned checkpoints and global acknowledgments omitted.",
  },
};

function Summary({
  kind,
  step,
  balanced,
}: {
  kind: SceneKind;
  step: number;
  balanced: boolean;
}) {
  if (kind === "shuffle") {
    const state = shuffleSnapshot(step);
    return (
      <p className="flink-spatial-detail">
        Ada: {state.counts.Ada} → subtask 0 · Cy: {state.counts.Cy} → subtask 1
      </p>
    );
  }
  if (kind === "skew") {
    const state = skewSnapshot(step, balanced);
    return (
      <dl className="flink-spatial-readout">
        <div>
          <dt>Unread at source</dt>
          <dd>{state.unread}</dd>
        </div>
        <div>
          <dt>Queued</dt>
          <dd>{state.queued.reduce((a, b) => a + b, 0)}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{state.totalCompleted} / 12</dd>
        </div>
      </dl>
    );
  }
  if (kind === "barrier") {
    const state = barrierSnapshot(step);
    return (
      <dl className="flink-spatial-readout">
        <div>
          <dt>Live sum</dt>
          <dd>{state.sum}</dd>
        </div>
        <div>
          <dt>Saved sum</dt>
          <dd>{state.saved ?? "None"}</dd>
        </div>
        <div>
          <dt>A2 (+10)</dt>
          <dd>
            {step === 6
              ? "Processed"
              : state.buffered
                ? "Buffered"
                : "Not yet arrived"}
          </dd>
        </div>
      </dl>
    );
  }
  if (kind === "keyed") {
    const state = keyedSnapshot(step);
    return (
      <dl className="flink-spatial-readout">
        {(["Ada", "Bo", "Cy"] as const).map((key) => (
          <div key={key}>
            <dt>
              {key} · subtask {KEY_ASSIGNMENT[key]}
            </dt>
            <dd>Count {state.counts[key]}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (kind === "runtime") {
    return (
      <p className="flink-spatial-detail">
        Worker 0: source 0 + count 0 · Worker 1: source 1 + count 1
      </p>
    );
  }
  const state = recoverySnapshot(step);
  return (
    <dl className="flink-spatial-readout">
      <div>
        <dt>Source next offset</dt>
        <dd>{state.nextOffset ?? "Lost"}</dd>
      </div>
      <div>
        <dt>Local operator count</dt>
        <dd>{state.count ?? "Lost"}</dd>
      </div>
      <div>
        <dt>Completed checkpoint</dt>
        <dd>
          {state.checkpoint
            ? `Offset ${state.checkpoint.nextOffset} · count ${state.checkpoint.count}`
            : "None"}
        </dd>
      </div>
    </dl>
  );
}

function SpatialWorkbench({ kind }: { kind: SceneKind }) {
  const description = descriptions[kind];
  const [balanced, setBalanced] = useState(false);
  const total = kind === "skew" && balanced ? 4 : description.steps;
  const stage = useRef<HTMLDivElement>(null);
  const { ready: sceneReady, onReady } = useSceneReady();
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [step, setStep] = useState(0);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const done = step === total;
  const pending = loaded && !sceneReady && !unavailable;

  const playback = useFlinkPlayback({
    targetRef: stage,
    step,
    total,
    ready: sceneReady || unavailable,
    onStep: () => setStep((value) => Math.min(total, value + 1)),
    onReset: () => setStep(0),
  });
  const { playing, running, reduced } = playback;

  useEffect(() => {
    // Warm nearby scenes, but autoplay waits for the first rendered frame.
    const nearby = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: "160px" },
    );
    if (stage.current) nearby.observe(stage.current);
    return () => nearby.disconnect();
  }, []);

  const keyed = keyedSnapshot(step);
  const status =
    kind === "keyed"
      ? keyed.current
        ? `${keyed.current.key} → subtask ${KEY_ASSIGNMENT[keyed.current.key]}; count ${keyed.counts[keyed.current.key]}.${done ? " All six records counted." : ""}`
        : description.initial
      : kind === "runtime"
        ? runtimeSnapshot(step).status
        : recoverySnapshot(step).status;
  const message =
    kind === "shuffle"
      ? (() => {
          const s = shuffleSnapshot(step);
          return s.current
            ? `Source ${s.current.source}: ${s.current.key} → subtask ${s.current.key === "Ada" ? 0 : 1}.${step === 4 ? " Ownership unchanged." : ""}`
            : description.initial;
        })()
      : kind === "skew"
        ? (() => {
            const s = skewSnapshot(step, balanced);
            return step === 0
              ? description.initial
              : s.totalCompleted === 12
                ? `Complete in ${step} teaching steps.${balanced ? " Four keys share the work." : " Hot key sets the pace."}`
                : `Queues: ${s.queued.join(" / ")}.${balanced ? " Four keys; four workers." : " Ada stays on worker 0."}`;
          })()
        : kind === "barrier"
          ? barrierSnapshot(step).status
          : status;
  const command = (kind: ViewCommand["kind"]) =>
    setView((current) => ({ kind, revision: current.revision + 1 }));

  return (
    <figure
      className="flink-spatial-demo flink-visual"
      data-graphic-frame="workbench"
      data-graphic-key={`flink-${kind}`}
      data-graphic-kind="canvas"
      aria-label={description.title}
      aria-busy={pending}
    >
      <header className="flink-visual-heading">
        <p className="article-graphic-title">{description.title}</p>
        <p className="flink-visual-description">{description.initial}</p>
      </header>
      <div
        ref={stage}
        className="flink-spatial-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        role="group"
        tabIndex={0}
        aria-label={`${description.title} 3D view. Drag to orbit, scroll to zoom. Arrow keys rotate or zoom; Home resets the camera.`}
        onKeyDown={(event) => {
          const kind = VIEW_KEYS[event.key];
          if (!kind) return;
          event.preventDefault();
          command(kind);
        }}
      >
        {pending && <DemoSceneLoading />}
        {unavailable ? (
          <p className="flink-spatial-fallback">
            3D is unavailable. Use Step and the state below to follow the same
            lesson.
          </p>
        ) : loaded ? (
          <div className="flink-spatial-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={onUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  kind={kind}
                  step={step}
                  balanced={balanced}
                  moving={running}
                  view={view}
                  onReady={onReady}
                  onUnavailable={onUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        ) : (
          <p className="flink-spatial-fallback">{description.initial}</p>
        )}
      </div>
      <div
        className="flink-spatial-controls"
        role="group"
        aria-label={`${description.title} playback`}
      >
        <button
          type="button"
          disabled={step === 0}
          onClick={() => {
            playback.pause();
            setStep((value) => Math.max(0, value - 1));
          }}
        >
          Back
        </button>
        <button
          type="button"
          disabled={done}
          onClick={() => {
            playback.pause();
            setStep((value) => Math.min(total, value + 1));
          }}
        >
          Step
        </button>
        <button type="button" disabled={reduced} onClick={playback.toggle}>
          {playing ? "Pause" : done ? "Replay" : "Play"}
        </button>
        <button type="button" onClick={playback.reset}>
          Reset
        </button>
        <span>
          Step {step} / {total}
        </span>
      </div>
      <div
        className="flink-spatial-camera"
        role="group"
        aria-label={`${description.title} camera`}
      >
        <button
          disabled={!sceneReady || unavailable}
          type="button"
          onClick={() => command("left")}
          aria-label="Rotate camera left"
        >
          ↶
        </button>
        <button
          disabled={!sceneReady || unavailable}
          type="button"
          onClick={() => command("right")}
          aria-label="Rotate camera right"
        >
          ↷
        </button>
        <button
          disabled={!sceneReady || unavailable}
          type="button"
          onClick={() => command("in")}
        >
          Zoom +
        </button>
        <button
          disabled={!sceneReady || unavailable}
          type="button"
          onClick={() => command("out")}
        >
          Zoom −
        </button>
        <button
          disabled={!sceneReady || unavailable}
          type="button"
          onClick={() => command("reset")}
        >
          Reset view
        </button>
      </div>
      {kind === "skew" && (
        <div
          className="flink-spatial-options"
          role="group"
          aria-label="Key distribution; changing it restarts the example"
        >
          {[false, true].map((value) => (
            <button
              type="button"
              key={String(value)}
              aria-pressed={balanced === value}
              onClick={() => {
                setBalanced(value);
                playback.replay();
              }}
            >
              {value ? "Balanced keys" : "Hot key"}
            </button>
          ))}
        </div>
      )}
      <p
        className="flink-spatial-status"
        role="status"
        aria-live={playing ? "off" : "polite"}
      >
        {message}
      </p>
      <Summary kind={kind} step={step} balanced={balanced} />
      <figcaption>
        {description.caption} Steps show completed events; Play retraces routes.
      </figcaption>
    </figure>
  );
}

export function FlinkKeyedStateDemo() {
  return <SpatialWorkbench kind="keyed" />;
}
export function FlinkRuntimeDemo() {
  return <SpatialWorkbench kind="runtime" />;
}
export function FlinkRecoveryDemo() {
  return <SpatialWorkbench kind="recovery" />;
}

export function FlinkShuffleDemo() {
  return <SpatialWorkbench kind="shuffle" />;
}
export function FlinkSkewDemo() {
  return <SpatialWorkbench kind="skew" />;
}
export function FlinkBarrierDemo() {
  return <SpatialWorkbench kind="barrier" />;
}
