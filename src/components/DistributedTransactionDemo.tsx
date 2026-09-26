import "~/demos/distributed-transactions/styles.css";
import {
  Component,
  Fragment,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEMOS } from "~/demos/distributed-transactions/model";
import { transitionTiming } from "~/demos/distributed-transactions/motion";
import { StateHighlight } from "~/demos/distributed-transactions/StateHighlight";
import type { DemoKind, Message } from "~/demos/distributed-transactions/types";
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";

const Scene = lazy(() => import("~/demos/distributed-transactions/Scene"));
const EMPTY_MESSAGES: Message[] = [];

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

export function DistributedTransactionDemo({
  kind,
  showLedger = true,
}: {
  kind: DemoKind;
  showLedger?: boolean;
}) {
  const definition = DEMOS[kind];
  const [scenarioId, setScenarioId] = useState(definition.scenarios[0].id);
  const scenario = definition.scenarios.find((item) => item.id === scenarioId)!;
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<"auto" | "step" | "paused">("auto");
  const [run, setRun] = useState(0);
  const [moving, setMoving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [viewReset, setViewReset] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  // A completed transition keeps its own final sample until Fiber removes it.
  const progress = useMemo(() => ({ current: 0 }), [scenarioId, step, run]);
  const elapsed = useRef(0);
  const { ready, onReady } = useSceneReady();
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const titleId = useId();
  const guideId = useId();
  const frame = scenario.frames[step];
  const next = scenario.frames[step + 1];
  const done = !next;
  const active =
    visible && documentVisible && intent !== "paused" && (ready || unavailable);
  const pending = !ready && !unavailable;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) {
        setIntent("paused");
        setMoving(false);
        setRun((value) => value + 1);
        elapsed.current = 0;
      }
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.5] },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!active || reduced || done || (intent === "step" && !moving)) return;
    const { dwell, travel, settle } = transitionTiming(frame, next);
    const readingTime = frame.recoveryAction
      ? 3000
      : step === 0
        ? Math.max(dwell, 1100)
        : dwell;
    let request: number;
    let previous: number | undefined;
    const tick = (now: number) => {
      // The same visible-time clock owns reading pauses, travel, and delivery.
      // Resuming never includes time spent paused, offscreen, or in another tab.
      if (previous !== undefined) elapsed.current += now - previous;
      previous = now;
      if (!moving) {
        if (elapsed.current >= readingTime) {
          elapsed.current = 0;
          setMoving(true);
          return;
        }
      } else {
        progress.current = Math.max(0, Math.min(1, elapsed.current / travel));
        if (progress.current === 1) {
          setStep((value) => Math.min(value + 1, scenario.frames.length - 1));
          setMoving(false);
          // Show the arrived state before the next event begins. The old
          // transition retains progress=1; the new frame receives a fresh ref.
          elapsed.current = -settle;
          if (intent === "step") setIntent("paused");
          return;
        }
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [
    active,
    reduced,
    done,
    intent,
    moving,
    scenario,
    frame,
    next,
    step,
    progress,
  ]);

  function reset(id = scenarioId) {
    setMoving(false);
    setIntent((value) => (value === "auto" ? "auto" : "paused"));
    setScenarioId(id);
    setStep(0);
    setRun((value) => value + 1);
    elapsed.current = 0;
  }

  function advance() {
    if (reduced) {
      setIntent("paused");
      setStep((value) => Math.min(value + 1, scenario.frames.length - 1));
    } else {
      if (!moving) elapsed.current = 0;
      setIntent("step");
      setMoving(true);
    }
  }

  const wantsMotion = intent !== "paused" && !reduced && !done;

  return (
    <figure
      className="dt-demo"
      data-graphic-frame="workbench"
      data-graphic-key={`distributed-${kind}`}
      data-graphic-kind="canvas"
      aria-labelledby={titleId}
      data-layout={frame.layout}
      data-step={step}
      data-moving={moving}
      data-playback={reduced ? "reduced" : done ? "complete" : intent}
    >
      <header className="dt-header">
        <p id={titleId} className="article-graphic-title">
          {definition.title}
        </p>
        <p className="dt-description">{scenario.description}</p>
      </header>
      {definition.scenarios.length > 1 && (
        <div
          className="dt-scenarios"
          role="group"
          aria-label={`${definition.title} scenario`}
        >
          {definition.scenarios.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={scenarioId === item.id}
              onClick={() => reset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {scenario.assumption && (
        <p className="dt-assumption">{scenario.assumption}</p>
      )}
      <div
        ref={stage}
        className="dt-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        tabIndex={unavailable ? -1 : 0}
        role="group"
        aria-label={`${definition.title}: 3D view`}
        aria-describedby={guideId}
      >
        <div className="dt-canvas" aria-hidden="true">
          {pending && <DemoSceneLoading />}
          {unavailable ? (
            <p className="dt-fallback">
              3D is unavailable. Follow every step in the account state below.
            </p>
          ) : (
            loaded && (
              <SceneBoundary onFailed={onUnavailable}>
                <Suspense fallback={null}>
                  <Scene
                    sceneId={`distributed-transactions:${kind}`}
                    frame={frame}
                    nextFrame={next}
                    messages={moving && next ? next.messages : EMPTY_MESSAGES}
                    progress={progress}
                    moving={moving}
                    active={active}
                    reduced={reduced}
                    viewReset={viewReset}
                    onReady={onReady}
                    onUnavailable={onUnavailable}
                  />
                </Suspense>
              </SceneBoundary>
            )
          )}
        </div>
      </div>
      <div className="dt-controls">
        <button
          type="button"
          disabled={pending || done || (moving && intent !== "paused")}
          onClick={advance}
        >
          {frame.recoveryAction ?? "Step"}
        </button>
        <button
          type="button"
          disabled={reduced || done}
          onClick={() => setIntent(wantsMotion ? "paused" : "auto")}
        >
          {wantsMotion ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => reset()}>
          Replay
        </button>
        <button
          type="button"
          disabled={pending || unavailable}
          onClick={() => setViewReset((value) => value + 1)}
        >
          Reset view
        </button>
      </div>
      <p id={guideId} className="dt-guide">
        {unavailable
          ? showLedger
            ? "3D is unavailable; the controls and account state remain usable"
            : "3D is unavailable; the controls and transaction progress remain usable"
          : "Drag to orbit · Scroll to zoom · Focus the view for arrow keys, +/− and Home"}
        {reduced && ". Reduced motion: Step advances without animation."}
      </p>
      <div
        className="dt-status"
        role="status"
        aria-live={intent === "auto" && !done && !reduced ? "off" : "polite"}
        aria-atomic="true"
      >
        <p className="dt-step">
          <span>
            {step + 1} / {scenario.frames.length}
          </span>{" "}
          {moving && next ? `Next: ${next.title}` : frame.title}
        </p>
        <p>{frame.status}</p>
        {!moving && frame.recoveryAction && intent === "auto" && !reduced && (
          <p className="dt-messages">Next: {frame.recoveryAction}.</p>
        )}
        {moving && next?.wait && (
          <p className="dt-messages">
            Waiting for the commit timestamp to be certainly in the past.
          </p>
        )}
        {moving && next && next.messages.length > 0 && (
          <p className="dt-messages">
            {intent === "paused"
              ? "Paused: "
              : next.messages.some((message) => message.beat)
                ? "Exchange: "
                : "In flight: "}
            {[...new Set(next.messages.map((message) => message.label))].map(
              (label, index) => (
                <Fragment key={label}>
                  {index > 0 &&
                    (next.messages.some((message) => message.beat)
                      ? " → "
                      : " · ")}
                  <StateHighlight>{label}</StateHighlight>
                </Fragment>
              ),
            )}
          </p>
        )}
      </div>
      {showLedger && (
        <dl className="dt-accounts" aria-label="Account state">
          {frame.accounts.map((account, index) => (
            <div key={index}>
              <dt>Account {index === 0 ? "A" : "B"}</dt>
              <dd className="dt-balance">
                ${account.balance}
                {account.pending !== 0 && (
                  <span>
                    {" "}
                    · <StateHighlight>pending</StateHighlight>{" "}
                    {account.pending > 0 ? "+" : "−"}$
                    {Math.abs(account.pending)}
                  </span>
                )}
              </dd>
              <dd data-state={account.state}>
                <StateHighlight>{account.state}</StateHighlight>
                {account.locked ? " · lock held" : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {showLedger && (
        <details className="dt-records">
          <summary>Inspect durable records</summary>
          <dl>
            {frame.coordinator.visible && (
              <div>
                <dt>
                  Coordinator
                  {!frame.coordinator.online && (
                    <>
                      {" "}
                      (<StateHighlight>unreachable</StateHighlight>)
                    </>
                  )}
                </dt>
                <dd>
                  <StateHighlight>
                    {frame.coordinator.record ?? "No decision recorded"}
                  </StateHighlight>
                </dd>
              </div>
            )}
            {frame.accounts.map((account, index) => (
              <div key={index}>
                <dt>Shard {index === 0 ? "A" : "B"}</dt>
                <dd>
                  {account.records.length
                    ? account.records.map((record, index) => (
                        <Fragment key={index}>
                          {index > 0 && " → "}
                          <StateHighlight>{record}</StateHighlight>
                        </Fragment>
                      ))
                    : "No transaction record"}
                </dd>
              </div>
            ))}
            {frame.replicas.map((replica) => (
              <div key={replica.id}>
                <dt>
                  {replica.id.toUpperCase()}
                  {replica.leader ? " · leader" : ""}
                  {!replica.online && (
                    <>
                      {" "}
                      · <StateHighlight>offline</StateHighlight>
                    </>
                  )}
                </dt>
                <dd>
                  <StateHighlight>
                    {replica.record ?? "No transaction record"}
                  </StateHighlight>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </figure>
  );
}
