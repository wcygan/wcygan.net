import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ComponentType,
} from "react";
import { DemoWorkbench } from "./DemoWorkbench";
import { DemoSceneLoading } from "./DemoSceneLoading";
import "~/demos/paxos/styles.css";
export type PaxosSceneProps = {
  step: number;
  active: boolean;
  onAdvance: () => void;
  onReady: () => void;
  onUnavailable: () => void;
};
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
export function PaxosDemo({
  title,
  graphicKey,
  stages,
  Scene,
  caption,
  children,
}: {
  title: string;
  graphicKey: string;
  stages: readonly string[];
  Scene: ComponentType<PaxosSceneProps>;
  caption: ReactNode;
  children: (step: number) => { status: ReactNode; summary?: ReactNode };
}) {
  const last = stages.length - 1;
  const [viewReset, setViewReset] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const figure = useRef<HTMLDivElement>(null);
  const onReady = useCallback(() => setReady(true), []);
  const onFailed = useCallback(() => {
    setFailed(true);
    setPlaying(false);
  }, [last]);
  const advance = useCallback(
    () => setStep((s) => Math.min(last, s + 1)),
    [last],
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(media.matches);
      if (media.matches) {
        setStep(last);
        setPlaying(false);
      }
    };
    change();
    media.addEventListener("change", change);
    const visibility = () => setForeground(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setLoaded(true);
    });
    if (figure.current) observer.observe(figure.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [last]);
  const content = children(step);
  const done = step === last;
  const pending = !ready && !failed;
  return (
    <DemoWorkbench.Root
      title={title}
      className="paxos-demo"
      data-graphic-key={graphicKey}
      data-graphic-kind="webgl"
      data-step={step}
      data-playback={
        reduced ? "reduced" : done ? "complete" : playing ? "auto" : "paused"
      }
    >
      <DemoWorkbench.Header />
      <ol
        className="paxos-pipeline"
        aria-label="Demo progress"
        style={{
          gridTemplateColumns: `repeat(${Math.min(stages.length, 5)}, minmax(0, 1fr))`,
        }}
      >
        {stages.map((label, index) => (
          <li key={label} data-reached={index <= step}>
            <button
              type="button"
              aria-current={index === step ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${label}${index < step ? " (completed)" : ""}`}
              onClick={() => {
                setPlaying(false);
                setStep(index);
              }}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </button>
          </li>
        ))}
      </ol>
      <DemoWorkbench.Stage
        ref={figure}
        state={failed ? "unavailable" : pending ? "loading" : "ready"}
      >
        {pending && <DemoSceneLoading />}
        {failed ? (
          <div className="paxos-3d-fallback">
            3D is unavailable. Use Step to follow the state below.
          </div>
        ) : (
          loaded && (
            <div className="paxos-3d-canvas" aria-hidden="true">
              <Boundary onFailed={onFailed}>
                <Suspense fallback={null}>
                  <Scene
                    key={viewReset}
                    step={step}
                    active={
                      playing &&
                      !done &&
                      ready &&
                      visible &&
                      foreground &&
                      !reduced
                    }
                    onAdvance={advance}
                    onReady={onReady}
                    onUnavailable={onFailed}
                  />
                </Suspense>
              </Boundary>
            </div>
          )
        )}
      </DemoWorkbench.Stage>
      <DemoWorkbench.Controls
        step={{
          label: "Step",
          disabled: done,
          onClick: () => {
            setPlaying(false);
            advance();
          },
        }}
        playback={{
          label: playing && !done ? "Pause" : "Play",
          disabled: pending || failed || reduced || done,
          onClick: () => {
            if (step === 0) advance();
            setPlaying((p) => !p);
          },
        }}
        replay={{
          onClick: () => {
            setStep(0);
            setPlaying(false);
          },
        }}
        resetView={{
          disabled: pending || failed,
          onClick: () => setViewReset((v) => v + 1),
        }}
      />
      <DemoWorkbench.Guide>
        Drag left or right to rotate · Scroll to zoom
        {reduced && ". Reduced motion: use Step to advance."}
      </DemoWorkbench.Guide>
      <DemoWorkbench.Step live={playing && !done ? "off" : "polite"}>
        <DemoWorkbench.StepTitle number={step + 1} total={stages.length}>
          {stages[step]}
        </DemoWorkbench.StepTitle>
        <p>{content.status}</p>
        {content.summary && (
          <div className="paxos-summary">{content.summary}</div>
        )}
      </DemoWorkbench.Step>
      <figcaption>{caption}</figcaption>
    </DemoWorkbench.Root>
  );
}
