import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import {
  DEMOS,
  type CameraAction,
  type CameraCommand,
  type CompensationMode,
  type DemoKind,
} from "~/demos/temporal-spatial/model";
import { useSpatialPlayback } from "~/demos/temporal-spatial/useSpatialPlayback";
import "~/demos/temporal-palette.css";
import "~/demos/temporal-spatial/styles.css";
import { DemoSceneLoading } from "./DemoSceneLoading";
import { DemoWorkbench } from "./DemoWorkbench";

const Scene = lazy(() => import("~/demos/temporal-spatial/Scene"));
const COMPONENT_LABELS: Record<string, string> = {
  wfQueue: "Workflow Task Queue",
  activityQueue: "Activity Task Queue",
  oldWorker: "Worker A",
  newWorker: "Worker B",
  timerService: "Durable timer",
};
const STATE_LABELS = {
  panel: "Ready",
  orange: "Running",
  blue: "Durable coordination",
  green: "Acknowledged",
  yellow: "Waiting",
  red: "Failed",
};
const CAMERA_KEYS: Record<string, CameraAction | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "+": "in",
  "=": "in",
  "-": "out",
  "0": "reset",
  Home: "reset",
};
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

function TemporalSpatialWorkbench({ kind }: { kind: DemoKind }) {
  const definition = DEMOS[kind];
  const [mode, setMode] = useState<CompensationMode>("compensated");
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const playback = useSpatialPlayback(kind, mode, ready || unavailable);
  const {
    stage,
    frame,
    target,
    step,
    moving,
    running,
    wantsMotion,
    playing,
    loaded,
    reduced,
  } = playback;
  const [sceneRevision, setSceneRevision] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({
    action: "reset",
    sequence: 0,
  });
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const selectEvent = useCallback((id: number) => setSelectedEvent(id), []);
  const pending = loaded && !ready && !unavailable;
  const command = (action: CameraAction) =>
    setCameraCommand((previous) => ({
      action,
      sequence: previous.sequence + 1,
    }));
  const selected =
    frame.history.find((event) => event.id === selectedEvent) ??
    frame.history.at(-1);
  const replay = () => {
    playback.replay();
    setSelectedEvent(null);
  };

  return (
    <DemoWorkbench.Root
      title={definition.title}
      className="temporal-spatial-demo"
      data-graphic-key={`temporal-${kind}`}
      data-graphic-kind="canvas"
      data-demo-kind={kind}
      data-step={step}
      data-moving={moving}
      data-motion-running={running}
      data-playback={
        reduced
          ? "reduced"
          : frame.done
            ? "complete"
            : wantsMotion
              ? "playing"
              : "paused"
      }
      aria-busy={pending}
      onKeyDown={(event) => {
        if (
          event.target !== stage.current ||
          !ready ||
          unavailable ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey
        )
          return;
        const action = CAMERA_KEYS[event.key];
        if (!action) return;
        event.preventDefault();
        command(action);
      }}
    >
      <DemoWorkbench.Header>
        <p className="demo-workbench-description">{definition.description}</p>
      </DemoWorkbench.Header>
      {kind === "compensation" && (
        <DemoWorkbench.Options
          options={[
            { id: "compensated", label: "Refund succeeds" },
            { id: "refund-fails", label: "Refund fails finally" },
          ]}
          value={mode}
          onChange={(value) => {
            setMode(value as CompensationMode);
            replay();
          }}
        />
      )}
      <DemoWorkbench.Stage
        ref={stage}
        state={unavailable ? "unavailable" : pending ? "loading" : "ready"}
      >
        {pending && <DemoSceneLoading />}
        {unavailable || !loaded ? (
          <div className="temporal-spatial-fallback">
            <p>
              {unavailable
                ? "3D is unavailable. Next and the recorded state below explain the same lesson."
                : "Explore each causal step with Next. The 3D view loads as it approaches the viewport."}
            </p>
            {unavailable && (
              <button
                type="button"
                onClick={() => {
                  setReady(false);
                  setUnavailable(false);
                  setSceneRevision((value) => value + 1);
                }}
              >
                Retry 3D
              </button>
            )}
          </div>
        ) : (
          <div className="temporal-spatial-canvas" aria-hidden="true">
            <SceneBoundary key={sceneRevision} onFailed={onUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  frame={frame}
                  target={target}
                  moving={moving}
                  running={running}
                  routeIds={playback.routeIds}
                  progress={playback.progress}
                  cameraCommand={cameraCommand}
                  selectedEvent={selected?.id ?? null}
                  onSelect={selectEvent}
                  onReady={onReady}
                  onUnavailable={onUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
      </DemoWorkbench.Stage>
      <DemoWorkbench.Controls
        step={{ label: "Next", disabled: frame.done, onClick: playback.next }}
        playback={{
          label: wantsMotion ? "Pause" : "Play",
          disabled: reduced || frame.done,
          onClick: playback.toggle,
        }}
        replay={{ onClick: replay }}
        resetView={{
          disabled: !ready || unavailable,
          onClick: () => command("reset"),
        }}
      />
      <div
        className="temporal-spatial-camera"
        role="group"
        aria-label={`${definition.title} camera controls`}
      >
        {(
          [
            ["left", "Orbit left"],
            ["right", "Orbit right"],
            ["in", "Zoom +"],
            ["out", "Zoom −"],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            type="button"
            disabled={!ready || unavailable}
            onClick={() => command(action)}
          >
            {label}
          </button>
        ))}
      </div>
      <DemoWorkbench.Guide>
        {unavailable
          ? "Recorded state, payload inspection, and manual steps remain usable."
          : "Drag to orbit · Scroll to zoom · Focus the view: arrows orbit, +/− zoom, Home resets."}
        {reduced && " Reduced motion: Next shows each settled step."}
      </DemoWorkbench.Guide>
      <DemoWorkbench.Step live={playing && !frame.done ? "off" : "polite"}>
        <DemoWorkbench.StepTitle number={step + 1} total={frame.last + 1}>
          {moving ? "Delivering the next causal step" : frame.title}
        </DemoWorkbench.StepTitle>
        <p>{frame.status}</p>
        {moving && (
          <p className="temporal-spatial-inflight">
            {running
              ? "Packet in transit. State commits after arrival."
              : "Packet paused. Play resumes; Next settles the next step."}
          </p>
        )}
      </DemoWorkbench.Step>
      <dl
        className="temporal-spatial-state"
        aria-label="Current simulation state"
      >
        {frame.readouts.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {frame.history.length > 0 && (
        <details className="temporal-spatial-history" open={kind === "history"}>
          <summary>Inspect recorded events · simplified</summary>
          <div
            className="temporal-spatial-record-controls"
            role="group"
            aria-label="Select a recorded event"
          >
            {frame.history.map((event) => (
              <button
                type="button"
                key={event.id}
                aria-pressed={selected?.id === event.id}
                onClick={() => setSelectedEvent(event.id)}
                aria-label={`Inspect event ${event.id}: ${event.label}`}
              >
                {String(event.id).padStart(2, "0")}
              </button>
            ))}
          </div>
          {selected && (
            <div className="temporal-spatial-payload">
              <p>
                {selected.id} · {selected.label}
              </p>
              <dl>
                {Object.entries(selected.payload).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <p className="temporal-spatial-history-note">
            These selected teaching events omit task lifecycle details. They do
            not present every failed Activity attempt as a separate raw history
            event.
          </p>
        </details>
      )}
      <details className="temporal-spatial-node-details">
        <summary>Inspect current components</summary>
        <dl>
          {Object.entries(frame.nodes)
            .filter(
              ([id, state]) =>
                !id.startsWith("record") && state.visible !== false,
            )
            .map(([id, state]) => (
              <div key={id} data-tone={state.tone}>
                <dt>
                  {COMPONENT_LABELS[id] ??
                    id
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (letter) => letter.toUpperCase())}
                </dt>
                <dd>{state.note ?? STATE_LABELS[state.tone]}</dd>
              </div>
            ))}
        </dl>
      </details>
      <p className="temporal-spatial-key">
        Orange: code or command · Blue: durable coordination · Green:
        acknowledged · Yellow: waiting · Red: failure
      </p>
      <figcaption>{definition.caption}</figcaption>
    </DemoWorkbench.Root>
  );
}
export function TemporalArchitectureDemo() {
  return <TemporalSpatialWorkbench kind="architecture" />;
}
export function TemporalTaskQueueDemo() {
  return <TemporalSpatialWorkbench kind="tasks" />;
}
export function TemporalHistoryDemo() {
  return <TemporalSpatialWorkbench kind="history" />;
}
export function TemporalReplayDemo() {
  return <TemporalSpatialWorkbench kind="replay" />;
}
export function TemporalParallelDemo() {
  return <TemporalSpatialWorkbench kind="parallel" />;
}
export function TemporalCompensationDemo() {
  return <TemporalSpatialWorkbench kind="compensation" />;
}
