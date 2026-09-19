import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import {
  Component,
  lazy,
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { currentLeader } from "~/demos/raft-election/model";
import { createPlayback } from "~/demos/raft-election/playback";
import { describeNode } from "~/demos/raft-election/presentation";
import { NODES, type Scenario } from "~/demos/raft-election/types";
import type { ViewCommand } from "~/demos/raft-election/Scene";
const Scene = lazy(() => import("~/demos/raft-election/Scene"));
class Boundary extends Component<
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
export function RaftElectionDemo() {
  const { ready: sceneReady, onReady: markReady } = useSceneReady();
  const [playback] = useState(createPlayback);
  const state = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const [visible, setVisible] = useState(false),
    [loaded, setLoaded] = useState(false),
    [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false),
    [paused, setPaused] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const fail = useCallback(() => setUnavailable(true), []);
  const active =
    (sceneReady || unavailable) && visible && documentVisible && !paused;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) setPaused(true);
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting && e.intersectionRatio >= 0.25);
        if (e.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.25] },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    playback.setActive(active);
    return () => playback.setActive(false);
  }, [active, playback]);
  const reset = (scenario?: Scenario) => {
    playback.dispatch({ type: "reset", scenario });
    setPaused(reduced);
  };
  const fallback = (
    <div className="raft-fallback">
      <p>
        {unavailable
          ? "3D is unavailable. The election still works below."
          : "Five nodes, one election. Loading the 3D scene…"}
      </p>
      <ul>
        {NODES.map((id) => (
          <li key={id}>{describeNode(state, id)}</li>
        ))}
      </ul>
    </div>
  );
  const pending = !sceneReady && !unavailable;

  return (
    <figure
      aria-busy={pending}
      className="raft-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="canvas"
      data-graphic-key="raft-election"
      aria-label="Raft leader election in five nodes"
    >
      <label className="raft-scenario">
        Scenario{" "}
        <select
          disabled={pending}
          value={state.scenario}
          onChange={(e) =>
            playback.dispatch({
              type: "scenario",
              scenario: e.target.value as Scenario,
            })
          }
        >
          <option value="success">Successful election</option>
          <option value="split">Split vote</option>
        </select>
      </label>
      <div
        ref={stage}
        className="raft-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        tabIndex={0}
        role="group"
        aria-label="Election network. Arrow keys rotate or zoom; Home restores the view."
        onKeyDown={(e) => {
          const keys: Record<string, ViewCommand["kind"]> = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "in",
            ArrowDown: "out",
            Home: "reset",
          };
          if (keys[e.key]) {
            e.preventDefault();
            setView((v) => ({ kind: keys[e.key], revision: v.revision + 1 }));
          }
        }}
      >
        {pending && <DemoSceneLoading />}
        {unavailable || !loaded ? (
          fallback
        ) : (
          <Boundary onUnavailable={fail}>
            <Suspense fallback={fallback}>
              <div className="raft-canvas" aria-hidden="true">
                <Scene
                  onReady={markReady}
                  state={state}
                  playback={playback}
                  active={active}
                  reduced={reduced}
                  view={view}
                  onUnavailable={fail}
                />
              </div>
            </Suspense>
          </Boundary>
        )}
      </div>
      <div className="raft-controls">
        <button
          disabled={pending || !currentLeader(state)}
          onClick={() => playback.dispatch({ type: "crash" })}
        >
          Crash leader
        </button>
        <button disabled={pending} onClick={() => setPaused((p) => !p)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button disabled={pending} onClick={() => reset()}>
          Reset
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {state.status}
      </p>
    </figure>
  );
}
