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
} from "react";
import {
  durableRecords,
  recoveryFrames,
  type Protocol,
} from "~/demos/commit-recovery/model";
import "~/demos/commit-recovery/styles.css";
const Scene = lazy(() => import("~/demos/commit-recovery/Scene"));
class Boundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
const traces = { "2pc": recoveryFrames("2pc"), "3pc": recoveryFrames("3pc") };
export function CommitRecoveryDemo({ protocol }: { protocol: Protocol }) {
  const frames = traces[protocol];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(0);
  const [angle, setAngle] = useState(0.22);
  const [zoom, setZoom] = useState(1);
  const id = useId();
  const frame = frames[index];
  const done = index === frames.length - 1;
  const active = visible && documentVisible;
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => setFailed(true), []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    update();
    visibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: 0.2 },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (
      !active ||
      !playing ||
      reduced ||
      frame.gate ||
      done ||
      (!ready && !failed)
    )
      return;
    const timer = setTimeout(() => setIndex((i) => i + 1), 3600);
    return () => clearTimeout(timer);
  }, [active, playing, reduced, frame, done, ready, failed]);
  const title =
    protocol === "2pc"
      ? "Waiting for the Decision"
      : "Recovering from Pre-commit";
  return (
    <figure
      className="cr-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="canvas"
      data-graphic-key={`recovery-${protocol}`}
      aria-labelledby={id}
      data-step={index}
    >
      <header className="cr-header">
        <span className="cr-eyebrow">
          {protocol.toUpperCase()} · alternative 3D study
        </span>
        <h3 id={id}>{title}</h3>
        <p>
          Pending changes above. Durable records below. Locks hold back the next
          update.
        </p>
      </header>
      <div
        ref={stage}
        className="cr-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        {loaded && (
          <Boundary onError={onUnavailable}>
            <Suspense fallback={null}>
              <Scene
                protocol={protocol}
                frame={frame}
                active={active && playing}
                reduced={reduced}
                view={view}
                angle={angle}
                zoom={zoom}
                onReady={onReady}
                onUnavailable={onUnavailable}
              />
            </Suspense>
          </Boundary>
        )}
        {(!ready || failed) && (
          <div className="cr-loading">
            {failed
              ? "3D unavailable — follow the state below."
              : "Loading the storage view…"}
          </div>
        )}
      </div>
      <div className="cr-controls">
        <button
          onClick={() => {
            setIndex(0);
            setPlaying(!reduced);
          }}
        >
          Replay
        </button>
        <button
          disabled={done || !!frame.gate || reduced}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing && !frame.gate && !done ? "Pause" : "Play"}
        </button>
        <button
          disabled={done || !!frame.gate}
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.min(i + 1, frames.length - 1));
          }}
        >
          Step
        </button>
      </div>
      <details className="cr-camera">
        <summary>Camera controls · drag to orbit</summary>
        <div className="cr-controls">
          <button onClick={() => setAngle((a) => a - Math.PI / 8)}>
            Rotate left
          </button>
          <button onClick={() => setAngle((a) => a + Math.PI / 8)}>
            Rotate right
          </button>
          <button
            disabled={zoom >= 1.4}
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
          >
            Zoom in
          </button>
          <button
            disabled={zoom <= 0.7}
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
          >
            Zoom out
          </button>
          <button
            onClick={() => {
              setAngle(0.22);
              setZoom(1);
              setView((v) => v + 1);
            }}
          >
            Reset view
          </button>
        </div>
      </details>
      <div className="cr-story" aria-live={playing ? "off" : "polite"}>
        <div className="cr-progress" aria-hidden="true">
          {frames.map((_, i) => (
            <span key={i} data-done={i <= index} />
          ))}
        </div>
        <strong>
          {index + 1} / {frames.length} · {frame.title}
        </strong>
        <p>{frame.description}</p>
        {frame.gate && (
          <button
            className="cr-action"
            onClick={() => {
              setIndex((i) => i + 1);
              setPlaying(!reduced);
            }}
          >
            {frame.gate}
          </button>
        )}
      </div>
      <dl className="cr-ledger">
        {(["A", "B"] as const).map((shard, i) => (
          <div key={shard}>
            <dt>
              Shard {shard} · ${frame.committed ? (i === 0 ? 90 : 110) : 100}
            </dt>
            <dd>
              {frame.prepared && !frame.committed
                ? `Pending ${i === 0 ? "−" : "+"}$10 · lock held`
                : frame.committed
                  ? "Transfer committed · lock released"
                  : "No pending change"}
            </dd>
            <dd>Log: {durableRecords(frame).join(" → ") || "empty"}</dd>
          </div>
        ))}
      </dl>
      <figcaption>
        {protocol === "2pc"
          ? "A prepared participant waits when no reachable participant knows the decision."
          : "Recovery assumes bounded delays, reliable failure detection, and connected surviving participants. Network partitions are outside this trace."}
      </figcaption>
    </figure>
  );
}
