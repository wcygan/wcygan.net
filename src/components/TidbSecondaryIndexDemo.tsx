import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import { TidbPlaybackControls } from "./TidbPlaybackControls";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  LAST_STEP,
  PRIMARY_ENTRIES,
  QUERY,
  RESULT,
  SECONDARY_ENTRIES,
  STEPS,
  READ_TS,
  type ViewCommand,
} from "~/demos/tidb-secondary-index/model";
import { createPlayback } from "~/demos/tidb-secondary-index/playback";

const Scene = lazy(() => import("~/demos/tidb-secondary-index/Scene"));
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
function IndexSummary({ unavailable }: { unavailable: boolean }) {
  return (
    <div className="secondary-fallback">
      <p>
        {unavailable
          ? "3D is unavailable. Use the controls to follow the lookup below."
          : `Email → row handle → full record · snapshot ${READ_TS}`}
      </p>
      <p>
        <strong>Secondary index · keys contain (email, row handle)</strong>
        <br />
        Region A · leader on TiKV 1
      </p>
      <p>
        Logical views over RocksDB memory and SST files, not physical blocks.
      </p>
      <ul>
        {SECONDARY_ENTRIES.map((entry) => (
          <li key={entry.id}>
            {entry.email} → {entry.id}
          </li>
        ))}
      </ul>
      <p>
        <strong>Clustered primary index · ID → record</strong>
        <br />
        Region B · leader on TiKV 2
      </p>
      <ul>
        {PRIMARY_ENTRIES.map((row) => (
          <li key={row.id}>
            {row.id} → {row.name} · {row.email}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TidbSecondaryIndexDemo() {
  const { ready: sceneReady, onReady: markReady } = useSceneReady();
  const stage = useRef<HTMLDivElement>(null);
  const [playback] = useState(createPlayback);
  const state = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const active = (sceneReady || unavailable) && visible && documentVisible;
  const done = state.step === LAST_STEP;
  const current = STEPS[state.step];
  // Stable callback: scene context-loss listeners must not churn with playback.
  const [failScene] = useState(() => () => setUnavailable(true));
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) setLoaded(true);
              setVisible(
                entry.isIntersecting && entry.intersectionRatio >= 0.15,
              );
            },
            { threshold: [0, 0.15] },
          );
    if (observer && stage.current) observer.observe(stage.current);
    else {
      setLoaded(true);
      setVisible(true);
    }
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!active || !state.moving) return;
    let frame: number;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) playback.advance(now - previous);
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, state.moving, playback]);

  const pending = !sceneReady && !unavailable;

  return (
    <figure
      aria-busy={pending}
      className="secondary-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="canvas"
      data-graphic-key="tidb-secondary-index"
      aria-label="TiDB secondary-index read"
    >
      <div className="secondary-query">
        <span>users · clustered primary key: id · nonunique index: email</span>
        <code>{QUERY}</code>
        <span>IndexLookUp · read timestamp {READ_TS} for both phases</span>
      </div>
      <div
        ref={stage}
        className="secondary-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        role="group"
        tabIndex={unavailable ? undefined : 0}
        aria-label="3D index lookup. Drag to rotate; scroll or pinch to zoom. Arrow keys rotate and zoom; Home resets the view."
        onKeyDown={(event) => {
          const kind = VIEW_KEYS[event.key];
          if (kind && event.target === event.currentTarget && !unavailable) {
            event.preventDefault();
            setView((old) => ({ kind, revision: old.revision + 1 }));
          }
        }}
      >
        {pending && <DemoSceneLoading />}
        {unavailable || !loaded ? (
          <IndexSummary unavailable={unavailable} />
        ) : (
          <div className="secondary-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={failScene}>
              <Suspense
                fallback={
                  <p className="secondary-loading">Loading the indexes…</p>
                }
              >
                <Scene
                  onReady={markReady}
                  playback={playback}
                  state={state}
                  active={active}
                  reduced={reduced}
                  view={view}
                  onUnavailable={failScene}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
      </div>
      <TidbPlaybackControls
        disabled={pending}
        moving={state.moving}
        done={done}
        speed={state.speed}
        onToggle={() => (state.moving ? playback.pause() : playback.play())}
        onStep={playback.step}
        onReplay={playback.replay}
        onSpeed={playback.setSpeed}
      />
      <div
        className="secondary-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p>
          <span>
            {state.step === 0 ? "Ready" : `Step ${state.step} of ${LAST_STEP}`}
          </span>
          <strong>
            {current.title === "Ready" ? "Follow one lookup" : current.title}
          </strong>
        </p>
        <p>{current.narration}</p>
      </div>
      {done && (
        <div className="secondary-result" aria-label="Query result">
          <span>1 row returned</span>
          <dl>
            <div>
              <dt>id</dt>
              <dd>{RESULT.id}</dd>
            </div>
            <div>
              <dt>email</dt>
              <dd>{RESULT.email}</dd>
            </div>
            <div>
              <dt>name</dt>
              <dd>{RESULT.name}</dd>
            </div>
          </dl>
        </div>
      )}
    </figure>
  );
}
