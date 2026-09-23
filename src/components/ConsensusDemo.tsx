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
import { LESSONS } from "~/demos/consensus/model";
import {
  colorStyle,
  ENTRY_COLORS,
  ENTRY_EMPTY,
  ENTRY_PENDING,
  entryColor,
  nodeColor,
} from "~/demos/consensus/colors";
import type {
  ConsensusFrame,
  ConsensusSceneProps,
  ConsensusTopic,
} from "~/demos/consensus/types";
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";

const Scene = lazy(() => import("~/demos/consensus/Scene"));

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

function StateTable({ frame }: { frame: ConsensusFrame }) {
  return (
    <div className="consensus-table-scroll" tabIndex={0}>
      <table>
        <caption>
          Each entry is index / term / command. Commit and applied are indexes.
        </caption>
        <thead>
          <tr>
            <th scope="col">Server</th>
            <th scope="col">Log</th>
            <th scope="col">Commit</th>
            <th scope="col">Applied</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {frame.nodes.map((node) => (
            <tr key={node.id}>
              <th scope="row">
                <i
                  className="consensus-swatch"
                  style={colorStyle(nodeColor(node.id))}
                  aria-hidden="true"
                />
                {node.id} · {node.role}
                <span>
                  Term {node.term}
                  {node.offline ? " · offline" : ""}
                </span>
                <span>Known leader: {node.leader ?? "none"}</span>
                {node.note && <span>{node.note}</span>}
              </th>
              <td>
                {node.snapshot && (
                  <span>
                    Snapshot through {node.snapshot.index}, term{" "}
                    {node.snapshot.term}, value {node.snapshot.value}
                    {", voters "}
                    {node.snapshot.configuration.join(", ")}
                  </span>
                )}
                {node.log.length ? (
                  node.log.map((entry) => (
                    <span key={entry.index}>
                      <i
                        className="consensus-swatch"
                        style={colorStyle(
                          entry.index <= node.commitIndex
                            ? entryColor(entry)
                            : ENTRY_PENDING,
                        )}
                        aria-hidden="true"
                      />
                      {entry.index} / {entry.term} / {entry.command}
                      {entry.index <= node.commitIndex
                        ? " · committed"
                        : " · pending"}
                    </span>
                  ))
                ) : (
                  <span>{node.snapshot ? "No retained entries" : "Empty"}</span>
                )}
              </td>
              <td>{node.commitIndex}</td>
              <td>{node.lastApplied}</td>
              <td>{node.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConsensusDemo({ topic }: { topic: ConsensusTopic }) {
  const lesson = LESSONS[topic];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [top, setTop] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<
    ConsensusSceneProps["cameraCommand"]
  >({
    sequence: 0,
    action: "reset",
  });
  const stage = useRef<HTMLDivElement>(null);
  const { ready, onReady } = useSceneReady();
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const titleId = useId();
  const guideId = useId();
  const frame = lesson.frames[step];
  const done = step === lesson.frames.length - 1;
  const active = visible && documentVisible;
  const pending = !ready && !unavailable;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
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
    };
  }, []);

  useEffect(() => {
    if (!playing || !active || pending || reduced || done) return;
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, lesson.frames.length - 1));
    }, 4200);
    return () => clearTimeout(timer);
  }, [playing, active, pending, reduced, done, step, lesson.frames.length]);

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  function goTo(next: number) {
    setPlaying(false);
    setStep(next);
  }

  return (
    <figure
      className="consensus-demo"
      data-graphic-frame="workbench"
      data-graphic-key={`consensus-${topic}`}
      data-graphic-kind="canvas"
      data-step={step}
      aria-labelledby={titleId}
    >
      <header className="consensus-header">
        <p id={titleId} className="article-graphic-title">
          {lesson.title}
        </p>
        <p>{lesson.guide}</p>
      </header>
      <div className="consensus-node-key" aria-label="Stable node colors">
        {Array.from(
          new Set(
            lesson.frames.flatMap((state) =>
              state.nodes.map((node) => node.id),
            ),
          ),
        ).map((id) => (
          <span key={id}>
            <i
              className="consensus-swatch"
              style={colorStyle(nodeColor(id))}
              aria-hidden="true"
            />
            {id}
          </span>
        ))}
      </div>
      {lesson.layout === "membership" ? (
        <div className="consensus-legend">✓ = acknowledged</div>
      ) : (
        <div className="consensus-legend">
          {lesson.layout === "logs" && (
            <span>
              <i
                className="consensus-swatch"
                style={colorStyle(ENTRY_EMPTY)}
                aria-hidden="true"
              />
              Empty
            </span>
          )}
          <span>
            <i
              className="consensus-swatch"
              style={colorStyle(ENTRY_PENDING)}
              aria-hidden="true"
            />
            Pending
          </span>
          <span>
            <span className="consensus-committed-key" aria-hidden="true">
              {ENTRY_COLORS.map((color) => (
                <i
                  key={color.css}
                  className="consensus-swatch"
                  style={colorStyle(color)}
                />
              ))}
            </span>
            Committed by index
          </span>
          <span>
            {lesson.layout === "machines"
              ? "✓ = applied"
              : "i = index · t = entry term"}
          </span>
        </div>
      )}
      <div
        ref={stage}
        className="consensus-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        tabIndex={unavailable ? -1 : 0}
        role="group"
        aria-label={`${lesson.title}: 3D view`}
        aria-describedby={guideId}
        onKeyDown={(event) => {
          const action = (
            {
              ArrowLeft: "left",
              ArrowRight: "right",
              ArrowUp: "in",
              ArrowDown: "out",
              Home: "reset",
            } as const
          )[
            event.key as
              | "ArrowLeft"
              | "ArrowRight"
              | "ArrowUp"
              | "ArrowDown"
              | "Home"
          ];
          if (!action) return;
          event.preventDefault();
          setCameraCommand((command) => ({
            sequence: command.sequence + 1,
            action,
          }));
        }}
      >
        <div className="consensus-canvas" aria-hidden="true">
          {pending && <DemoSceneLoading />}
          {unavailable ? (
            <p className="consensus-fallback">
              3D is unavailable. Every step is available in the explanation and
              server state below.
            </p>
          ) : loaded ? (
            <SceneBoundary onFailed={onUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  lesson={lesson}
                  frame={frame}
                  frameIndex={step}
                  active={active}
                  reduced={reduced}
                  top={top}
                  cameraCommand={cameraCommand}
                  onReady={onReady}
                  onUnavailable={onUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          ) : null}
        </div>
      </div>
      <div
        className="consensus-controls"
        role="group"
        aria-label={`${lesson.title} playback`}
      >
        <button
          type="button"
          disabled={step === 0}
          onClick={() => goTo(step - 1)}
        >
          Back
        </button>
        <button type="button" disabled={done} onClick={() => goTo(step + 1)}>
          Next
        </button>
        <button
          type="button"
          disabled={reduced}
          onClick={() => {
            if (done) setStep(0);
            setPlaying((current) => !current);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => goTo(0)}>
          Replay
        </button>
        <button
          type="button"
          disabled={unavailable}
          aria-pressed={top}
          onClick={() => setTop((current) => !current)}
        >
          Top view
        </button>
        <span className="consensus-progress">
          {step + 1} / {lesson.frames.length}
        </span>
      </div>
      <p id={guideId} className="consensus-camera-help">
        Drag to orbit · scroll to zoom · arrow keys to rotate or zoom · Home to
        reset
        <span>
          T = term · — = no known leader · × = offline. Status is each server’s
          local view.
        </span>
        {reduced && (
          <span>Reduced motion: use Next to inspect each settled step.</span>
        )}
      </p>
      <div
        className="consensus-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="consensus-step-title">{frame.title}</p>
        <p>{frame.detail}</p>
      </div>
      {frame.configuration && (
        <p className="consensus-quorums">
          {(["old", "next"] as const).map((set) => {
            const voters = frame.configuration![set];
            if (!voters.length) return null;
            const received = voters.filter((id) =>
              frame.configuration!.acknowledgements.includes(id),
            ).length;
            return (
              <span key={set}>
                {set === "old" ? "Old" : "New"} ({voters.join(", ")}):{" "}
                {received} / {Math.floor(voters.length / 2) + 1} required.{" "}
              </span>
            );
          })}
        </p>
      )}
      <details className="consensus-inspector" open={unavailable || undefined}>
        <summary>Inspect server state</summary>
        <StateTable frame={frame} />
      </details>
    </figure>
  );
}
