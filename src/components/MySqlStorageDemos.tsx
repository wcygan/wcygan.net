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
  type RefObject,
} from "react";
import { DemoWorkbench } from "./DemoWorkbench";
import { DemoSceneLoading } from "./DemoSceneLoading";
import { MySqlPlaybackControls } from "./MySqlPlaybackControls";
import { useMySqlPlayback } from "~/demos/mysql-primer/useMySqlPlayback";
import {
  advanceLookup,
  bufferMessage,
  createBufferPool,
  createLookup,
  lookupMessage,
  lookupSnapshot,
  lookupSteps,
  readPage,
  type BufferPool,
  type IndexScenario,
  type Lookup,
} from "~/demos/mysql-storage/model";
import {
  SPATIAL_LESSONS,
  type SpatialKind,
  type StorageState,
} from "~/demos/mysql-storage/lessons";
import type { CameraPose, ViewCommand } from "~/demos/mysql-storage/types";
import "~/styles/mysql-storage.css";

const Scene = lazy(() => import("~/demos/mysql-storage/Scene"));
const VIEW_KEYS: Record<string, ViewCommand["kind"]> = {
  ArrowLeft: "left",
  ArrowRight: "right",
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

function StorageStage({
  stageRef,
  onReadyChange,
  ...props
}: StorageState & {
  stageRef: RefObject<HTMLDivElement | null>;
  onReadyChange: (ready: boolean) => void;
}) {
  const pose = useRef<CameraPose | null>(null);
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const markReady = useCallback(() => setReady(true), []);
  const markUnavailable = useCallback(() => setUnavailable(true), []);
  const command = (kind: ViewCommand["kind"]) =>
    setView((previous) => ({ kind, revision: previous.revision + 1 }));
  useEffect(() => {
    const visibility = () => setDocumentVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    if (stageRef.current) observer.observe(stageRef.current);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [stageRef]);
  useEffect(() => {
    // Capture on the stage before Fiber creates its renderer. A context can be
    // lost during initialization, before the scene's Camera effect is installed.
    const stage = stageRef.current;
    const lost = (event: Event) => {
      event.preventDefault();
      markUnavailable();
    };
    stage?.addEventListener("webglcontextlost", lost, true);
    return () => stage?.removeEventListener("webglcontextlost", lost, true);
  }, [markUnavailable, stageRef]);
  const mounted = visible && documentVisible && !unavailable;
  useEffect(() => {
    if (!mounted) setReady(false);
  }, [mounted]);
  useEffect(() => {
    onReadyChange((mounted && ready) || unavailable);
  }, [mounted, ready, unavailable, onReadyChange]);
  useEffect(() => () => onReadyChange(false), [onReadyChange]);
  return (
    <>
      <div
        ref={stageRef}
        className="demo-workbench-stage mysql-storage-stage"
        data-graphic-stage="flush"
        data-scene-loading={mounted && !ready}
        tabIndex={0}
        role="group"
        aria-label="3D storage view"
        aria-describedby={id}
        aria-busy={mounted && !ready}
        onKeyDown={(event) => {
          if (event.altKey || event.metaKey || event.ctrlKey) return;
          const kind = VIEW_KEYS[event.key];
          if (kind) {
            event.preventDefault();
            command(kind);
          }
        }}
      >
        {mounted && !ready && <DemoSceneLoading />}
        {mounted ? (
          <div className="mysql-storage-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={markUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  {...props}
                  view={view}
                  pose={pose}
                  onReady={markReady}
                  onUnavailable={markUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        ) : (
          <div className="mysql-storage-fallback">
            <p>
              {unavailable
                ? "3D is unavailable. The controls and results still work."
                : "An inspectable 3D model loads when this figure is in view."}
            </p>
            {props.kind === "index" ? (
              <ol>
                <li>Secondary index: customer 1 → primary keys 101, 102</li>
                <li>
                  Clustered rows: total_cents and other fields live with each
                  primary key
                </li>
                <li>
                  A covered query can return id and customer_id from the
                  secondary entries
                </li>
              </ol>
            ) : props.kind === "buffer" ? (
              <ol>
                <li>
                  Memory:{" "}
                  {props.buffer.resident.length
                    ? props.buffer.resident
                        .map((page) => `page ${page}`)
                        .join(", ")
                    : "empty"}
                </li>
                <li>Disk: pages 1 and 2</li>
                <li>{bufferMessage(props.buffer)}</li>
              </ol>
            ) : (
              <p>{SPATIAL_LESSONS[props.kind].steps[props.step].message}</p>
            )}
          </div>
        )}
      </div>
      <div
        className="mysql-storage-camera"
        role="group"
        aria-label="Camera controls"
      >
        <button
          type="button"
          disabled={!ready}
          onClick={() => command("left")}
          aria-label="Rotate view left"
        >
          ↶
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => command("right")}
          aria-label="Rotate view right"
        >
          ↷
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => command("out")}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => command("in")}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => command("reset")}
        >
          Reset view
        </button>
      </div>
      <p id={id} className="mysql-storage-camera-help">
        Drag to orbit · scroll to zoom. Keyboard: ← → rotate, + − zoom, Home
        resets.
      </p>
    </>
  );
}

export function MySqlIndexDemo() {
  const [lookup, setLookup] = useState(() => createLookup());
  const [ready, setReady] = useState(false);
  const snapshot = lookupSnapshot(lookup);
  const playback = useMySqlPlayback({
    complete: snapshot.complete,
    beat: `${lookup.scenario}:${lookup.step}`,
    onAdvance: () => setLookup(advanceLookup),
    onReplay: () => setLookup(createLookup(lookup.scenario)),
    ready,
  });
  const columns =
    lookup.scenario === "covered"
      ? ["id", "customer_id"]
      : ["id", "total_cents"];
  return (
    <DemoWorkbench.Root
      title="An index finds a row"
      className="mysql-storage-demo"
      data-graphic-key="mysql-index"
      data-graphic-kind="canvas"
    >
      <DemoWorkbench.Header>
        <p>The secondary entries and full rows occupy separate structures.</p>
      </DemoWorkbench.Header>
      <DemoWorkbench.Options
        options={[
          { id: "row", label: "Fetch order totals" },
          { id: "covered", label: "Covered query" },
        ]}
        value={lookup.scenario}
        onChange={(scenario) => {
          playback.pause();
          setLookup(createLookup(scenario as IndexScenario));
        }}
      />
      <pre className="mysql-storage-query">
        <code>{`SELECT ${lookup.scenario === "covered" ? "id, customer_id" : "id, total_cents"}\nFROM orders WHERE customer_id = 1;`}</code>
      </pre>
      <StorageStage
        kind="index"
        lookup={lookup}
        stageRef={playback.stageRef}
        onReadyChange={setReady}
      />
      <MySqlPlaybackControls playback={playback} />
      <div className="mysql-storage-actions">
        <button
          type="button"
          disabled={snapshot.complete}
          onClick={() => {
            playback.pause();
            setLookup(advanceLookup);
          }}
        >
          Next step
        </button>
        <button
          type="button"
          onClick={() => {
            playback.pause();
            setLookup(createLookup(lookup.scenario));
          }}
        >
          Start again
        </button>
        <span>
          {lookup.step} / {lookupSteps(lookup)} steps
        </span>
      </div>
      <DemoWorkbench.Step live={playback.running ? "off" : "polite"}>
        <p>{lookupMessage(lookup)}</p>
        <p className="mysql-storage-metric">
          Clustered rows fetched: <strong>{snapshot.rowFetches}</strong>
        </p>
      </DemoWorkbench.Step>
      {snapshot.complete && (
        <div className="mysql-storage-result" aria-label="Query result">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshot.results.map((row, i) => (
                <tr key={i}>
                  {columns.map((column) => (
                    <td key={column}>{row[column]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DemoWorkbench.Guide>
        Conceptual InnoDB structure, not physical bytes. Spacing, depth, and
        page geometry are illustrative; the optimizer may choose another plan.
      </DemoWorkbench.Guide>
    </DemoWorkbench.Root>
  );
}

export function MySqlBufferPoolDemo() {
  const [buffer, setBuffer] = useState(createBufferPool);
  const [ready, setReady] = useState(false);
  const playback = useMySqlPlayback({
    complete: buffer.requests >= 4,
    beat: buffer.requests,
    onAdvance: () =>
      setBuffer((state) => readPage(state, state.requests < 2 ? 1 : 2)),
    onReplay: () => setBuffer(createBufferPool()),
    ready,
  });
  return (
    <DemoWorkbench.Root
      title="Memory before disk"
      className="mysql-storage-demo"
      data-graphic-key="mysql-buffer-pool"
      data-graphic-kind="canvas"
    >
      <DemoWorkbench.Header>
        <p>A disk page can stay in memory for the next read.</p>
      </DemoWorkbench.Header>
      <StorageStage
        kind="buffer"
        buffer={buffer}
        stageRef={playback.stageRef}
        onReadyChange={setReady}
      />
      <MySqlPlaybackControls playback={playback} />
      <div className="mysql-storage-actions">
        <button
          type="button"
          onClick={() => {
            playback.pause();
            setBuffer((state) => readPage(state, 1));
          }}
        >
          Read page 1
        </button>
        <button
          type="button"
          onClick={() => {
            playback.pause();
            setBuffer((state) => readPage(state, 2));
          }}
        >
          Read page 2
        </button>
        <button
          type="button"
          onClick={() => {
            playback.pause();
            setBuffer(createBufferPool());
          }}
        >
          Clear demo
        </button>
      </div>
      <DemoWorkbench.Step live={playback.running ? "off" : "polite"}>
        <p>{bufferMessage(buffer)}</p>
      </DemoWorkbench.Step>
      <dl className="mysql-storage-counters">
        <div>
          <dt>Logical requests</dt>
          <dd>{buffer.requests}</dd>
        </div>
        <div>
          <dt>Memory hits</dt>
          <dd>{buffer.hits}</dd>
        </div>
        <div>
          <dt>Disk misses</dt>
          <dd>{buffer.misses}</dd>
        </div>
      </dl>
      <DemoWorkbench.Guide>
        Two pages fit in memory. Counters show logical requests, not timings or
        measured I/O. Eviction, read-ahead, and changed pages are omitted.
      </DemoWorkbench.Guide>
    </DemoWorkbench.Root>
  );
}

function SpatialLesson({ kind }: { kind: SpatialKind }) {
  const lesson = SPATIAL_LESSONS[kind];
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const current = lesson.steps[step];
  const playback = useMySqlPlayback({
    complete: step === lesson.steps.length - 1,
    beat: step,
    onAdvance: () =>
      setStep((previous) => Math.min(previous + 1, lesson.steps.length - 1)),
    onReplay: () => setStep(0),
    ready,
    delayMs: 3200,
  });
  return (
    <DemoWorkbench.Root
      title={lesson.title}
      className="mysql-storage-demo"
      data-graphic-key={`mysql-${kind}`}
      data-graphic-kind="canvas"
    >
      <DemoWorkbench.Header>
        <p>{lesson.description}</p>
      </DemoWorkbench.Header>
      <StorageStage
        kind={kind}
        step={step}
        stageRef={playback.stageRef}
        onReadyChange={setReady}
      />
      <MySqlPlaybackControls playback={playback} />
      <div className="mysql-storage-actions">
        <button
          type="button"
          disabled={step === lesson.steps.length - 1}
          onClick={() => {
            playback.pause();
            setStep(step + 1);
          }}
        >
          {current.next ?? "Finished"}
        </button>
        <button
          type="button"
          onClick={() => {
            playback.pause();
            setStep(0);
          }}
        >
          Start again
        </button>
        <span>
          Step {step + 1} of {lesson.steps.length}
        </span>
      </div>
      <DemoWorkbench.Step live={playback.running ? "off" : "polite"}>
        <p>{current.message}</p>
      </DemoWorkbench.Step>
      <dl className="mysql-storage-counters">
        {current.facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <DemoWorkbench.Guide>{lesson.caption}</DemoWorkbench.Guide>
    </DemoWorkbench.Root>
  );
}
export function MySqlLockingDemo() {
  return <SpatialLesson kind="locking" />;
}
export function MySqlRecoveryDemo() {
  return <SpatialLesson kind="recovery" />;
}
export function MySqlReplicationDemo() {
  return <SpatialLesson kind="replication" />;
}
