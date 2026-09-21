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
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import { DEFAULT_SPEED, snapshot, STEPS } from "~/demos/gossip/model";
import { createPlayback } from "~/demos/gossip/playback";

const Scene = lazy(() => import("~/demos/gossip/Scene"));
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

export function GossipDemo() {
  const [playback] = useState(createPlayback);
  const count = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    () => 0,
  );
  const state = snapshot(count);
  const stage = useRef<HTMLDivElement>(null);
  const { ready, onReady } = useSceneReady();
  const [failed, setFailed] = useState(false);
  const onFailed = useCallback(() => setFailed(true), []);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [top, setTop] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const active =
    (ready || failed) &&
    visible &&
    documentVisible &&
    playing &&
    !reduced &&
    !state.done;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) {
        playback.setActive(false);
        playback.seek(STEPS.length);
        setPlaying(false);
      }
    };
    motion();
    media.addEventListener("change", motion);
    const visibility = () => setDocumentVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.25] },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      playback.setActive(false);
    };
  }, [playback]);
  useEffect(() => {
    playback.setActive(active);
    return () => playback.setActive(false);
  }, [active, playback]);

  return (
    <figure
      className="gossip-demo"
      data-graphic-frame="workbench"
      data-graphic-key="gossip"
      aria-label="How gossip spreads knowledge of a new node"
    >
      <p className="article-graphic-title">
        Spreading membership news: “E has joined the cluster”
      </p>
      <p className="gossip-message-key">
        <span aria-hidden="true" data-state="unaware" /> Blue nodes have not
        learned about E. <span aria-hidden="true" data-state="informed" /> Green
        nodes have. Gossip spreads cluster membership knowledge peer to peer.
      </p>
      <p className="gossip-exchange">
        {state.done
          ? "Converged · A–E all know the membership"
          : state.step.kind === "cluster"
            ? "Existing cluster · A–D"
            : state.step.kind === "arrival"
              ? "New node arriving · E"
              : `${state.step.from} → ${state.step.to} · ${state.step.role === "seed" ? "First contact via seed" : "Peer gossip: E joined"}`}
      </p>
      <div
        ref={stage}
        className="gossip-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        {!ready && !failed && <DemoSceneLoading />}
        {failed ? (
          <p className="gossip-fallback">
            3D is unavailable. Step through E’s arrival and the gossip sequence
            using the exchange status above.
          </p>
        ) : (
          loaded && (
            <SceneBoundary onFailed={onFailed}>
              <Suspense fallback={null}>
                <Scene
                  playback={playback}
                  count={count}
                  active={active}
                  reduced={reduced}
                  top={top}
                  onReady={onReady}
                  onUnavailable={onFailed}
                />
              </Suspense>
            </SceneBoundary>
          )
        )}
      </div>
      <div className="gossip-controls">
        <button
          type="button"
          disabled={reduced || state.done}
          onClick={() => setPlaying(!playing)}
        >
          {playing && !state.done ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={state.done}
          onClick={() => {
            setPlaying(false);
            playback.setActive(false);
            playback.seek(count + 1);
          }}
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => {
            playback.setActive(false);
            playback.seek(0);
            setPlaying(!reduced);
          }}
        >
          Replay
        </button>
        <button
          type="button"
          disabled={failed}
          aria-pressed={top}
          onClick={() => setTop(!top)}
        >
          Top view
        </button>
        <label className="gossip-speed">
          Speed
          <select
            aria-label="Gossip speed"
            disabled={reduced}
            value={speed}
            onChange={(event) => {
              const nextSpeed = Number(event.target.value);
              setSpeed(nextSpeed);
              playback.setSpeed(nextSpeed);
            }}
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </label>
      </div>
      <figcaption>
        Dashed lines show established peer relationships. Drag to orbit; scroll
        to zoom.
      </figcaption>
    </figure>
  );
}
