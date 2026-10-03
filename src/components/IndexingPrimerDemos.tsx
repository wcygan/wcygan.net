import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { lessons } from "~/demos/indexing-primer/model";
import "~/styles/indexing-primer.css";
import { visual } from "~/demos/indexing-primer/visual";
import { TreeDiagram } from "~/demos/indexing-primer/TreeDiagram";
import type { CameraPose } from "~/demos/indexing-primer/Scene";
import { useIndexingPlayback } from "~/demos/indexing-primer/playback";
const Scene = lazy(() => import("~/demos/indexing-primer/Scene"));
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode; onUnavailable: () => void },
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
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function IndexingPrimerDemo({ lesson: id }: { lesson: string }) {
  const lesson = lessons.find((l) => l.id === id)!;
  const [step, setStep] = useState(0);
  const [view, setView] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pose, setPose] = useState<CameraPose>();
  const savePose = useCallback((next: CameraPose, nextZoom: number) => {
    setPose(next);
    setZoom(nextZoom);
  }, []);
  const fail = useCallback(() => setUnavailable(true), []);
  const [visible, setVisible] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const markReady = useCallback(() => setSceneReady(true), []);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const state = visual(id, step);
  const [width, setWidth] = useState(640);
  const message = lesson.steps[step];
  const spatial = lesson.dimension === "3D";
  const playback = useIndexingPlayback({
    stageRef: ref,
    step,
    lastStep: lesson.steps.length - 1,
    ready: !spatial || unavailable || sceneReady,
    onStep: () => setStep((s) => Math.min(lesson.steps.length - 1, s + 1)),
    onReset: () => setStep(0),
  });
  useEffect(() => {
    if (!visible || hidden) setSceneReady(false);
  }, [visible, hidden]);
  useEffect(() => {
    const resize = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    if (ref.current) resize.observe(ref.current);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    if (ref.current) observer.observe(ref.current);
    const change = () => setHidden(document.hidden);
    change();
    document.addEventListener("visibilitychange", change);
    return () => {
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", change);
    };
  }, []);
  return (
    <figure
      className="ip-demo"
      data-graphic-frame="workbench"
      data-graphic-kind={spatial ? "canvas" : "svg"}
      aria-labelledby={titleId}
    >
      <header>
        <p id={titleId} className="article-graphic-title">
          {lesson.title}
        </p>
      </header>
      <div
        className="ip-stage"
        ref={ref}
        data-graphic-stage="padded"
        tabIndex={spatial ? 0 : undefined}
        aria-label={
          spatial
            ? "3D view: arrow keys rotate, plus and minus zoom, Home resets"
            : undefined
        }
        onPointerDown={spatial ? playback.pause : undefined}
        onWheel={spatial ? playback.pause : undefined}
        onKeyDown={(e) => {
          if (!spatial) return;
          if (["ArrowLeft", "ArrowRight", "+", "-", "Home"].includes(e.key)) {
            e.preventDefault();
            playback.pause();
            if (e.key === "Home") {
              setView(0);
              setZoom(1);
              setPose(undefined);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              setPose(undefined);
              setView((v) => v + (e.key === "ArrowLeft" ? -1 : 1));
            } else
              setZoom((z) =>
                Math.max(0.7, Math.min(1.5, z + (e.key === "+" ? 0.1 : -0.1))),
              );
          }
        }}
      >
        <div className="ip-query">
          <code>{state.query}</code>
        </div>
        <div className="ip-tree-region" style={{ height: state.height }}>
          {spatial && visible && !hidden && !unavailable ? (
            <Boundary
              fallback={<TreeDiagram visual={state} width={width} />}
              onUnavailable={fail}
            >
              <Suspense fallback={<TreeDiagram visual={state} width={width} />}>
                <Scene
                  visual={state}
                  view={view}
                  onUnavailable={fail}
                  zoom={zoom}
                  pose={pose}
                  onPoseChange={savePose}
                  onReady={markReady}
                />
              </Suspense>
            </Boundary>
          ) : (
            <TreeDiagram visual={state} width={width} />
          )}
        </div>
        <div className="ip-metric">{state.takeaway}</div>
      </div>
      <div className="ip-controls">
        <button
          type="button"
          onClick={playback.toggle}
          disabled={playback.reducedMotion || playback.complete}
          aria-pressed={playback.playing}
        >
          {playback.playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={step === lesson.steps.length - 1}
          onClick={playback.manualStep}
        >
          Next step
        </button>
        <button type="button" onClick={playback.replay}>
          Replay
        </button>
        {spatial && (
          <>
            <button
              type="button"
              onClick={() => {
                playback.pause();
                setPose(undefined);
                setView((v) => v + 1);
              }}
            >
              Change angle
            </button>
            <button
              type="button"
              onClick={() => {
                playback.pause();
                setView(0);
                setZoom(1);
                setPose(undefined);
              }}
            >
              Reset view
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => {
                playback.pause();
                setZoom((z) => Math.min(1.5, z + 0.1));
              }}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => {
                playback.pause();
                setZoom((z) => Math.max(0.7, z - 0.1));
              }}
            >
              −
            </button>
          </>
        )}
      </div>
      <p
        className="ip-status"
        role="status"
        aria-live={playback.active ? "off" : "polite"}
      >
        {message}
      </p>
    </figure>
  );
}
