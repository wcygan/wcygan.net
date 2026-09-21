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
  createState,
  infectRandom,
  INTERVAL_MS,
  nextTurn,
  TOTAL,
} from "~/demos/epidemic/model";
const Scene = lazy(() => import("~/demos/epidemic/Scene"));
class Boundary extends Component<
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
export function EpidemicSpreadDemo() {
  const [state, setState] = useState(createState);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  const { ready, onReady } = useSceneReady();
  const stage = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);
  const infected = state.infected.filter(Boolean).length;
  const done = infected === TOTAL;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    motion();
    media.addEventListener("change", motion);
    const visibility = () => setDocumentVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 1);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 1] },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (
      autoStarted.current ||
      !visible ||
      !documentVisible ||
      (!ready && !failed) ||
      reduced
    )
      return;
    autoStarted.current = true;
    setState(infectRandom());
    setPlaying(true);
  }, [visible, documentVisible, ready, failed, reduced]);
  useEffect(() => {
    if (
      !playing ||
      !visible ||
      !documentVisible ||
      (!ready && !failed) ||
      done ||
      !infected
    )
      return;
    const timer = setTimeout(
      () => setState((current) => nextTurn(current)),
      INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [
    playing,
    visible,
    documentVisible,
    ready,
    failed,
    done,
    infected,
    state.turn,
  ]);
  return (
    <figure
      className="epidemic-demo"
      data-graphic-frame="workbench"
      data-graphic-key="epidemic-spread"
      aria-label="Turn-based infection spreading between neighboring nodes"
    >
      <p className="article-graphic-title">
        A virus spreads through its neighbors
      </p>
      <p className="epidemic-key">
        <span data-infected="false" /> Uninfected{" "}
        <span data-infected="true">+</span> Infected
      </p>
      <div
        ref={stage}
        className="epidemic-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <span className="epidemic-turn-counter">
          Turn {state.turn}
          {done ? " · Complete" : ""}
        </span>
        {!ready && !failed && <DemoSceneLoading />}
        {failed ? (
          <div className="epidemic-fallback-grid">
            {state.infected.map((value, i) => (
              <span key={i} data-infected={value}>
                {value ? "+" : ""}
              </span>
            ))}
          </div>
        ) : (
          loaded && (
            <Boundary onFailed={fail}>
              <Suspense fallback={null}>
                <Scene state={state} onReady={onReady} onUnavailable={fail} />
              </Suspense>
            </Boundary>
          )
        )}
      </div>
      <div className="gossip-controls">
        <button
          type="button"
          disabled={!infected || done}
          onClick={() => setPlaying(!playing)}
        >
          {playing && !done ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={!infected || done}
          onClick={() => {
            setPlaying(false);
            setState((current) => nextTurn(current));
          }}
        >
          Next turn
        </button>
        <button
          type="button"
          onClick={() => {
            autoStarted.current = true;
            setState(infectRandom());
            setPlaying(!reduced);
          }}
        >
          Reset
        </button>
      </div>
    </figure>
  );
}
