import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  CELL_LAYERS,
  fleetSnapshot,
  nextPageStep,
  pageChangeSnapshot,
  type CameraAction,
  type CameraCommand,
  type CellLayer,
  type FleetView,
  type PageStep,
} from "~/demos/celld/spatial/model";
import {
  initialNamedState,
  NAMED_CELL_IDS,
  namedStateSummary,
  requestCell,
  restartNamedCells,
  type NamedState,
} from "~/demos/celld/spatial/named-state-model";
import {
  failureSnapshot,
  type FailureLayout,
  type FailurePhase,
} from "~/demos/celld/spatial/failure-domains-model";
import type { CameraMemory, SpatialKind } from "~/demos/celld/spatial/Scene";
import {
  advanceNamedStateTour,
  ANATOMY_TOUR,
  FAILURE_TOUR,
  failureTourStep,
  FLEET_TOUR,
  NAMED_STATE_TOUR_LENGTH,
  PAGE_TOUR,
} from "~/demos/celld/spatial/tour";
import { useCelldAutoplay } from "~/demos/celld/use-celld-autoplay";
import { DemoSceneLoading } from "./DemoSceneLoading";

const EMPTY_NAMED_STATE = initialNamedState();
const Scene = lazy(() => import("~/demos/celld/spatial/Scene"));

class SpatialBoundary extends Component<
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

function SpatialWorkbench({
  kind,
  title,
  layer = "sqlite",
  view = "two-nodes",
  pageStep = 0,
  namedState = EMPTY_NAMED_STATE,
  failureLayout = "separate",
  failurePhase = "acknowledged",
  tour,
  selection,
  fallback,
  children,
}: {
  kind: SpatialKind;
  title: string;
  layer?: CellLayer;
  view?: FleetView;
  pageStep?: PageStep;
  namedState?: NamedState;
  failureLayout?: FailureLayout;
  failurePhase?: FailurePhase;
  tour: {
    step: number;
    total: number;
    onStep: (step: number) => void;
    onReset: () => void;
    durationMs?: number;
  };
  selection: ReactNode;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const figure = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cameraMemory = useRef<CameraMemory | null>(null);
  const hintId = useId();
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({
    action: "reset",
    sequence: 0,
  });
  const markReady = useCallback(() => setReady(true), []);
  const markUnavailable = useCallback(() => setUnavailable(true), []);
  const playback = useCelldAutoplay({
    stageRef: stage,
    ...tour,
    onStep: () => tour.onStep(Math.min(tour.total, tour.step + 1)),
    ready: ready && !unavailable,
  });
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (!entry.isIntersecting) setReady(false);
      },
      { rootMargin: "0px", threshold: 0 },
    );
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  const command = (action: CameraAction) =>
    setCameraCommand((previous) => ({
      action,
      sequence: previous.sequence + 1,
    }));
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const action: CameraAction | undefined = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      "+": "in",
      "=": "in",
      "-": "out",
      "0": "reset",
      Home: "reset",
    }[event.key] as CameraAction | undefined;
    if (!action || unavailable || !ready) return;
    event.preventDefault();
    command(action);
  }
  const pending = inView && !ready && !unavailable;
  return (
    <figure
      ref={figure}
      className="celld-demo celld-spatial-demo"
      data-graphic-frame="workbench"
      data-graphic-key={`celld-${kind}`}
      data-graphic-kind="canvas"
      data-graphic-label={title}
      aria-label={title}
      aria-busy={pending}
      data-playback-state={playback.state}
      data-playback-step={tour.step}
    >
      <header className="celld-spatial-header" onClickCapture={playback.pause}>
        <p className="article-graphic-title">{title}</p>
        {selection}
      </header>
      <div
        ref={stage}
        className="celld-spatial-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        role="img"
        aria-label={`${title}. An illustrative three-dimensional model; the same state is described below.`}
        aria-describedby={hintId}
        tabIndex={ready && !unavailable ? 0 : -1}
        onKeyDown={onKeyDown}
      >
        {pending && <DemoSceneLoading />}
        {unavailable || !inView ? (
          <div className="celld-spatial-fallback">
            <p>{unavailable ? "3D view unavailable" : "Model overview"}</p>
            {fallback}
          </div>
        ) : (
          <SpatialBoundary onFailed={markUnavailable}>
            <Suspense fallback={null}>
              <Scene
                kind={kind}
                layer={layer}
                view={view}
                pageStep={pageStep}
                namedState={namedState}
                failureLayout={failureLayout}
                failurePhase={failurePhase}
                cameraMemory={cameraMemory}
                cameraCommand={cameraCommand}
                onReady={markReady}
                onUnavailable={markUnavailable}
              />
            </Suspense>
          </SpatialBoundary>
        )}
      </div>
      <div
        className="celld-playback-controls"
        role="group"
        aria-label={`${title} playback`}
      >
        <button
          type="button"
          disabled={
            tour.step >= tour.total ||
            unavailable ||
            playback.state === "blocked" ||
            playback.state === "reduced-motion"
          }
          onClick={playback.toggle}
        >
          {playback.playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={playback.replay}>
          Replay
        </button>
        <button
          type="button"
          disabled={tour.step >= tour.total}
          onClick={playback.manualStep}
        >
          Next step
        </button>
        <span className="celld-playback-progress">
          Beat {tour.step + 1} of {tour.total + 1}
          {playback.state === "reduced-motion" &&
            " · Reduced motion: use Next step"}
          {playback.state === "complete" && " · complete"}
        </span>
      </div>
      <div
        className="celld-spatial-camera"
        role="group"
        aria-label={`${title} camera controls`}
      >
        <button
          type="button"
          disabled={!ready || unavailable}
          onClick={() => command("left")}
          aria-label="Orbit left"
        >
          ↶
        </button>
        <button
          type="button"
          disabled={!ready || unavailable}
          onClick={() => command("right")}
          aria-label="Orbit right"
        >
          ↷
        </button>
        <button
          type="button"
          disabled={!ready || unavailable}
          onClick={() => command("out")}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          disabled={!ready || unavailable}
          onClick={() => command("in")}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          disabled={!ready || unavailable}
          onClick={() => command("front")}
        >
          Front view
        </button>
        <button
          type="button"
          disabled={!ready || unavailable}
          onClick={() => command("reset")}
        >
          Reset view
        </button>
      </div>
      <p className="celld-spatial-hint" id={hintId}>
        Drag to orbit · scroll to zoom · focus the view for arrow keys, + / −
        and 0
      </p>
      <figcaption className="celld-spatial-caption">{children}</figcaption>
    </figure>
  );
}

export function CelldCellAnatomyDemo() {
  const [layer, setLayer] = useState<CellLayer>(ANATOMY_TOUR[0]);
  const [tourStep, setTourStep] = useState(0);
  function setTourFrame(step: number) {
    setTourStep(step);
    setLayer(ANATOMY_TOUR[step]);
  }
  return (
    <SpatialWorkbench
      kind="anatomy"
      title="Inside one cell"
      layer={layer}
      tour={{
        step: tourStep,
        total: ANATOMY_TOUR.length - 1,
        onStep: setTourFrame,
        onReset: () => setTourFrame(0),
        durationMs: 4000,
      }}
      selection={
        <div
          className="celld-spatial-selection"
          role="group"
          aria-label="Inspect a cell layer"
        >
          {(Object.keys(CELL_LAYERS) as CellLayer[]).map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={layer === key}
              onClick={() => setTourFrame(ANATOMY_TOUR.indexOf(key))}
            >
              {CELL_LAYERS[key].label}
            </button>
          ))}
        </div>
      }
      fallback={
        <ol>
          <li>V8 runs the room:blue JavaScript handler</li>
          <li>Private SQLite stores six illustrated pages</li>
          <li>LTX captures changes to pages 2 and 5</li>
        </ol>
      }
    >
      <p role="status" aria-live="polite">
        {CELL_LAYERS[layer].explanation}
      </p>
      <p className="celld-spatial-note">
        Logical responsibilities of one cell, not separate daemons or a physical
        memory layout. The handler uses V8; a cell need not own a dedicated V8
        isolate. Replication and acknowledgement are separate steps.
      </p>
    </SpatialWorkbench>
  );
}

export function CelldFleetDemo() {
  const [view, setView] = useState<FleetView>("two-nodes");
  const [tourStep, setTourStep] = useState(0);
  function setTourFrame(step: number) {
    setTourStep(step);
    setView(FLEET_TOUR[step]);
  }
  const snapshot = fleetSnapshot(view);
  return (
    <SpatialWorkbench
      kind="fleet"
      title="Cell placement"
      view={view}
      tour={{
        step: tourStep,
        total: FLEET_TOUR.length - 1,
        onStep: setTourFrame,
        onReset: () => setTourFrame(0),
        durationMs: 4000,
      }}
      selection={
        <div
          className="celld-spatial-selection"
          role="group"
          aria-label="Select fleet placement"
        >
          {(
            [
              ["two-nodes", "Two nodes"],
              ["third-node", "Add node C"],
              ["handoff", "Move room:blue"],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={view === key}
              onClick={() => setTourFrame(FLEET_TOUR.indexOf(key))}
            >
              {label}
            </button>
          ))}
        </div>
      }
      fallback={
        <ul>
          {snapshot.nodes.map((node) => (
            <li key={node.id}>
              Node {node.id}:{" "}
              {snapshot.cells
                .filter((cell) => cell.owner === node.id)
                .map((cell) => cell.name)
                .join(", ") || "capacity available"}
            </li>
          ))}
          <li>
            One shared bucket holds ownership records and long-term cell state
          </li>
        </ul>
      }
    >
      <p role="status" aria-live="polite">
        {snapshot.explanation}
      </p>
      <ul className="celld-spatial-owners" aria-label="Current cell owners">
        {snapshot.cells.map((cell) => (
          <li key={cell.name}>
            <span className="celld-spatial-cell-number">{cell.number}</span>
            <span className="celld-spatial-cell-name">{cell.name}</span>
            <span>
              node {cell.owner}
              {cell.hibernated ? " · hibernated" : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="celld-spatial-note">
        Each numbered tile is a separate cell with its own database. LOG denotes
        node-log storage for recent replicated writes. This model shows
        placement, not a failure or durability simulation. A hibernated handoff
        preserves durable state, not live JavaScript memory; parked clients
        reconnect.
      </p>
    </SpatialWorkbench>
  );
}

export function CelldNamedStateDemo() {
  const [state, setState] = useState(initialNamedState);
  const [tourStep, setTourStep] = useState(0);
  function advanceTourFrame(step: number) {
    setTourStep(step);
    setState((current) => advanceNamedStateTour(current, step));
  }
  function resetTour() {
    setTourStep(0);
    setState(initialNamedState());
  }
  return (
    <SpatialWorkbench
      kind="named-state"
      title="Named cells, private state"
      namedState={state}
      tour={{
        step: tourStep,
        total: NAMED_STATE_TOUR_LENGTH - 1,
        onStep: advanceTourFrame,
        onReset: resetTour,
      }}
      selection={
        <div
          className="celld-spatial-selection"
          role="group"
          aria-label="Send an illustrated request"
        >
          <button
            type="button"
            data-tone="blue"
            onClick={() => setState((current) => requestCell(current, "blue"))}
          >
            Request blue
          </button>
          <button
            type="button"
            data-tone="green"
            onClick={() => setState((current) => requestCell(current, "green"))}
          >
            Request green
          </button>
          <button type="button" onClick={() => setState(restartNamedCells)}>
            Restart runtime
          </button>
          <button type="button" onClick={resetTour}>
            Reset example
          </button>
        </div>
      }
      fallback={
        <ul>
          {NAMED_CELL_IDS.map((id) => (
            <li key={id}>
              {state.cells[id].name}: saved {state.cells[id].committedCount},
              temporary JavaScript {state.cells[id].volatileCount}
            </li>
          ))}
        </ul>
      }
    >
      <p role="status" aria-live="polite">
        {namedStateSummary(state)}
      </p>
      <ul className="celld-spatial-state" aria-label="Named cell counters">
        {NAMED_CELL_IDS.map((id) => (
          <li key={id}>
            <span>{state.cells[id].name}</span>
            <span>
              saved {state.cells[id].committedCount} · temporary{" "}
              {state.cells[id].volatileCount}
            </span>
          </li>
        ))}
      </ul>
      <p className="celld-spatial-note">
        Each request represents an already acknowledged commit. Restart clears
        only the explicitly temporary JavaScript values. This is a conceptual
        model, not a running celld fleet or a durability test.
      </p>
    </SpatialWorkbench>
  );
}

export function CelldPageChangesDemo() {
  const [step, setStep] = useState<PageStep>(0);
  const snapshot = pageChangeSnapshot(step);
  return (
    <SpatialWorkbench
      kind="pages"
      title="Changed pages become LTX"
      pageStep={step}
      tour={{
        step,
        total: PAGE_TOUR.length - 1,
        onStep: (next) => setStep(PAGE_TOUR[next]),
        onReset: () => setStep(0),
        durationMs: 4000,
      }}
      selection={
        <div
          className="celld-spatial-selection"
          role="group"
          aria-label="Step through page capture"
        >
          <button
            type="button"
            disabled={step === 2}
            onClick={() => setStep(nextPageStep)}
          >
            {step === 0
              ? "Commit pages 2 + 5"
              : step === 1
                ? "Capture LTX"
                : "LTX captured"}
          </button>
          <button type="button" onClick={() => setStep(0)}>
            Reset example
          </button>
        </div>
      }
      fallback={
        <ul>
          <li>
            Six SQLite page images;{" "}
            {step === 0 ? "all version 1" : "pages 2 and 5 now version 2"}
          </li>
          <li>
            {step === 2
              ? "LTX contains new images for pages 2 and 5, with transaction and checksum metadata"
              : "No later LTX record captured yet"}
          </li>
          <li>A complete baseline is already stored</li>
        </ul>
      }
    >
      <p role="status" aria-live="polite">
        {snapshot.explanation}
      </p>
      <p className="celld-spatial-note">
        Orange identifies changed page images; blue pages retain their previous
        images. Actual page numbers and metadata depend on the write. Initial
        snapshots and compaction can include more pages.
      </p>
    </SpatialWorkbench>
  );
}

export function CelldFailureDomainsDemo() {
  const [layout, setLayout] = useState<FailureLayout>("separate");
  const [phase, setPhase] = useState<FailurePhase>("acknowledged");
  const [tourStep, setTourStep] = useState(0);
  const [comparison, setComparison] = useState(FAILURE_TOUR[0].comparison);
  function setTourFrame(step: number) {
    const frame = FAILURE_TOUR[step];
    setTourStep(step);
    setLayout(frame.layout);
    setPhase(frame.phase);
    setComparison(frame.comparison);
  }
  function selectLayout(next: FailureLayout) {
    setComparison("");
    setLayout(next);
    setTourStep(failureTourStep(next, phase));
  }
  function selectPhase(next: FailurePhase) {
    setComparison("");
    setPhase(next);
    setTourStep(failureTourStep(layout, next));
  }
  const snapshot = failureSnapshot(layout, phase);
  return (
    <SpatialWorkbench
      kind="failure-domains"
      title="Copies and failure domains"
      failureLayout={layout}
      failurePhase={phase}
      tour={{
        step: tourStep,
        total: FAILURE_TOUR.length - 1,
        onStep: setTourFrame,
        onReset: () => setTourFrame(0),
        durationMs: 4200,
      }}
      selection={
        <>
          <div
            className="celld-spatial-selection"
            role="group"
            aria-label="Place compute disks"
          >
            <button
              type="button"
              aria-pressed={layout === "separate"}
              onClick={() => selectLayout("separate")}
            >
              Separate hosts
            </button>
            <button
              type="button"
              aria-pressed={layout === "shared"}
              onClick={() => selectLayout("shared")}
            >
              Shared host
            </button>
          </div>
          <div
            className="celld-spatial-selection"
            role="group"
            aria-label="Compare permanent host loss"
          >
            <button
              type="button"
              aria-pressed={phase === "acknowledged"}
              onClick={() => selectPhase("acknowledged")}
            >
              Acknowledged write
            </button>
            <button
              type="button"
              data-tone="red"
              aria-pressed={phase === "lose-host"}
              onClick={() => selectPhase("lose-host")}
            >
              Lose host + disks
            </button>
            <button
              type="button"
              data-tone="green"
              aria-pressed={phase === "bucket-covered"}
              onClick={() => selectPhase("bucket-covered")}
            >
              Upload before loss
            </button>
          </div>
        </>
      }
      fallback={
        <ul>
          <li>
            Owner disk:{" "}
            {snapshot.ownerLost ? "permanently lost" : "retains write 42"}
          </li>
          <li>
            Follower disk:{" "}
            {snapshot.followerLost
              ? "permanently lost"
              : "retains complete tail for write 42"}
          </li>
          <li>
            Independent bucket: through write{" "}
            {snapshot.bucketCovered ? "42" : "41"}
          </li>
        </ul>
      }
    >
      <p role="status" aria-live="polite">
        {comparison && `${comparison} `}
        {snapshot.explanation}
      </p>
      <p className="celld-spatial-note">
        {snapshot.caveat} The bucket remains separate and accessible in every
        state. “Lose host + disks” means permanent destruction, not a process
        restart. These copy states are illustrative, not measured failure tests.
      </p>
    </SpatialWorkbench>
  );
}
