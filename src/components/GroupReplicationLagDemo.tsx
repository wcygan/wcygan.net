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
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  createLagPlayback,
  lagStatus,
  readSummary,
  formatWallTime,
  type LagPlayback,
} from "~/demos/group-replication-lag/playback";
import { MAX_WRITES } from "~/demos/group-replication-lag/model";
import type { ViewCommand } from "~/demos/group-replication-lag/Scene";
import { DemoSceneLoading } from "./DemoSceneLoading";

const Scene = lazy(() => import("~/demos/group-replication-lag/Scene"));
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

function WallClock({
  playback,
  active,
  capturedAt,
}: {
  playback: LagPlayback;
  active: boolean;
  capturedAt: number | null;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(playback.getWallTime());
    if (!active || capturedAt !== null) return;
    const update = () => setElapsed(playback.getWallTime());
    const unsubscribe = playback.subscribe(update);
    const timer = setInterval(update, 100);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [playback, active, capturedAt]);
  return (
    <div
      className="group-lag-clock"
      role="timer"
      aria-live="off"
      aria-label="Elapsed wall clock"
    >
      <span>Wall clock</span>
      <time>{formatWallTime(elapsed)}</time>
    </div>
  );
}

export function GroupReplicationLagDemo() {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const readDialog = useRef<HTMLDialogElement>(null);
  const readButton = useRef<HTMLButtonElement>(null);
  const [playback] = useState(createLagPlayback);
  const state = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [top, setTop] = useState(false);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const markReady = useCallback(() => setReady(true), []);
  const markUnavailable = useCallback(() => {
    setUnavailable(true);
    setReady(true);
  }, []);
  const active = ready && visible && documentVisible;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => playback.setReduced(media.matches);
    motion();
    media.addEventListener("change", motion);
    const visibility = () => setDocumentVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          preload.disconnect();
        }
      },
      { rootMargin: "400px", threshold: 0 },
    );
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.5] },
    );
    if (stage.current) {
      preload.observe(stage.current);
      observer.observe(stage.current);
    }
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      preload.disconnect();
      observer.disconnect();
    };
  }, [playback]);
  useEffect(() => {
    playback.setActive(active);
    return () => playback.setActive(false);
  }, [active, playback]);
  useEffect(() => {
    if (state.reads) {
      readDialog.current?.showModal();
      readDialog.current
        ?.querySelector<HTMLElement>("h3")
        ?.focus({ preventScroll: true });
      if (readDialog.current) readDialog.current.scrollTop = 0;
    } else if (readDialog.current?.open) readDialog.current.close();
  }, [state.reads]);
  useEffect(() => {
    if (!loaded || ready) return;
    // A stalled import or renderer must not leave the text experiment disabled.
    const timeout = setTimeout(markUnavailable, 10_000);
    return () => clearTimeout(timeout);
  }, [loaded, ready, markUnavailable]);

  function camera(kind: ViewCommand["kind"]) {
    setTop(kind === "top");
    setView((current) => ({ kind, revision: current.revision + 1 }));
  }
  function onCameraKey(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, ViewCommand["kind"]> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      "+": "in",
      "=": "in",
      "-": "out",
      Home: "reset",
    };
    const kind = keys[event.key];
    if (!kind) return;
    event.preventDefault();
    camera(kind);
  }
  return (
    <figure
      className="database-log-demo group-lag-demo"
      data-graphic-frame="workbench"
      data-graphic-key="group-replication-lag"
      data-graphic-kind="canvas"
      aria-labelledby={`${id}-title`}
      aria-busy={!ready}
    >
      <header className="database-log-demo-header">
        <p className="article-graphic-title" id={`${id}-title`}>
          Replication between nodes takes time
        </p>
      </header>
      <div
        ref={stage}
        className="group-lag-stage"
        data-graphic-stage="flush"
        role="group"
        tabIndex={unavailable ? undefined : 0}
        aria-label="3D replication scene camera"
        aria-describedby={`${id}-camera`}
        onKeyDown={onCameraKey}
      >
        <WallClock
          playback={playback}
          active={active}
          capturedAt={state.readAt}
        />
        <div
          className="group-lag-canvas"
          aria-hidden="true"
          data-scene-loading={!ready}
        >
          {!ready && <DemoSceneLoading />}
          {unavailable ? (
            <p className="database-log-scene-fallback">
              3D is unavailable. Use the controls and member progress below to
              follow the same experiment.
            </p>
          ) : loaded ? (
            <SceneBoundary onFailed={markUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  state={state}
                  playback={playback}
                  view={view}
                  onReady={markReady}
                  onUnavailable={markUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          ) : null}
        </div>
      </div>
      <p className="group-lag-camera-hint" id={`${id}-camera`}>
        {unavailable
          ? "The text simulation remains available."
          : "Drag to orbit · Scroll to zoom · Focus scene: arrow keys, + / −, Home"}
      </p>
      <div className="database-log-controls">
        <div>
          <button
            type="button"
            disabled={!ready || !state.canWrite}
            onClick={() => playback.write()}
          >
            Write
          </button>
          <button
            type="button"
            ref={readButton}
            disabled={!ready}
            onClick={() => playback.readAll()}
          >
            Read all
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => playback.reset()}
          >
            Reset
          </button>
        </div>
        {state.reduced && state.pending && (
          <button type="button" onClick={() => playback.catchUp()}>
            Apply pending
          </button>
        )}
        <button
          type="button"
          disabled={!ready || unavailable}
          aria-pressed={top}
          onClick={() => camera(top ? "reset" : "top")}
        >
          Top view
        </button>
      </div>
      <fieldset className="group-lag-conditions">
        <legend>Replica B</legend>
        <div className="group-lag-sliders">
          <label>
            <span>
              Processing time{" "}
              <output>
                {((state.conditions.processingTime * 3) / 1000).toFixed(1)} s /
                entry
              </output>
            </span>
            <input
              type="range"
              min="400"
              max="5000"
              step="100"
              value={state.conditions.processingTime}
              aria-label="Replica B processing time"
              aria-valuetext={`${((state.conditions.processingTime * 3) / 1000).toFixed(1)} seconds per entry`}
              onChange={(event) =>
                playback.configure({
                  processingTime: Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            <span>
              Link 2 latency{" "}
              <output>
                {((state.conditions.linkLatency * 3) / 1000).toFixed(1)} s
              </output>
            </span>
            <input
              type="range"
              min="700"
              max="2800"
              step="100"
              value={state.conditions.linkLatency}
              aria-label="Link 2 latency"
              aria-valuetext={`${((state.conditions.linkLatency * 3) / 1000).toFixed(1)} seconds illustrated delivery time`}
              onChange={(event) =>
                playback.configure({
                  linkLatency: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
        <div className="database-log-controls">
          <button
            type="button"
            onClick={() => playback.configure({ processingTime: 400 })}
          >
            Speed up B
          </button>
          <button
            type="button"
            aria-pressed={state.disconnected}
            onClick={() => playback.toggleLink()}
          >
            {state.disconnected ? "Reconnect Link 2" : "Interrupt Link 2"}
          </button>
        </div>
        <p>Illustrated timing · Higher values increase lag.</p>
      </fieldset>
      <div
        className={unavailable ? "group-lag-status" : "sr-only"}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p>
          Replica B · {state.replicaStatus}. {lagStatus(state)}
        </p>
      </div>
      {unavailable && (
        <dl className="group-lag-members" aria-label="Member progress">
          {state.members.map((member) => (
            <div key={member.id} data-member={member.id}>
              <dt>{member.name}</dt>
              <dd>Version {member.applied}</dd>
              <dd>
                {member.id === "primary"
                  ? `${state.committed} committed`
                  : `${member.received} received · ${member.received - member.applied} pending · ${member.lag} behind`}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <dialog
        ref={readDialog}
        className="group-lag-read-dialog"
        aria-labelledby={`${id}-reads`}
        aria-describedby={`${id}-read-summary`}
        onClose={() => {
          playback.resume();
          readButton.current?.focus({ preventScroll: true });
        }}
      >
        <h3 id={`${id}-reads`} tabIndex={-1}>
          Read results
        </h3>
        <div className="group-lag-read-time">
          <span>Read captured at</span>
          <time>{formatWallTime(state.readAt ?? 0)}</time>
          <span>elapsed wall time</span>
        </div>
        <dl className="group-lag-read-values">
          {state.reads?.map((read) => (
            <div key={read.id} data-member={read.id}>
              <dt>
                <span className="group-lag-member-dot" aria-hidden="true" />
                {read.name}
              </dt>
              <dd className="group-lag-read-version">
                <span>
                  {read.available ? "Version " : "Last applied state "}
                </span>
                <strong>{read.version}</strong>
              </dd>
              <dd
                className="group-lag-read-track"
                aria-label={`${read.version} applied, ${read.pending} pending, ${MAX_WRITES - read.received} not received`}
              >
                {Array.from({ length: MAX_WRITES }, (_, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    data-state={
                      index < read.version
                        ? "applied"
                        : index < read.received
                          ? "pending"
                          : "empty"
                    }
                  >
                    {index + 1}
                  </span>
                ))}
              </dd>
              <dd className="group-lag-read-status">{read.status}</dd>
              <dd className="group-lag-read-state">
                {read.version
                  ? `Applied through #${read.version}`
                  : "No writes applied"}
              </dd>
              <dd className="group-lag-read-pending">
                {read.pending} pending · {read.received} received
              </dd>
            </div>
          ))}
        </dl>
        <p className="group-lag-read-legend">
          Solid = applied · Dashed = waiting · Faint = not received
        </p>
        <p id={`${id}-read-summary`}>
          {state.reads && readSummary(state.reads)}
        </p>
        <p className="group-lag-read-note">
          Replication and the wall clock pause while this comparison is open.
        </p>
        <button type="button" onClick={() => readDialog.current?.close()}>
          Close
        </button>
      </dialog>
    </figure>
  );
}
