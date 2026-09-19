import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
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
import {
  KEYS,
  PARTITION_COUNT,
  partitionSnapshot,
  TOTAL_STEPS,
  type RoutingMode,
} from "~/demos/kafka-partitioning/model";

const Scene = lazy(() => import("~/demos/kafka-partitioning/Scene"));
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
    return this.state.failed ? (
      <p className="kafka-scene-fallback">
        3D is unavailable. Use the controls to follow each record in the status
        below.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function KafkaPartitioningDemo() {
  const { ready: sceneReady, onReady: markReady } = useSceneReady();
  const [unavailable, setUnavailable] = useState(false);
  const markUnavailable = useCallback(() => setUnavailable(true), []);
  const figure = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<RoutingMode>("keyed");
  const [partitions, setPartitions] = useState(PARTITION_COUNT);
  const [speed, setSpeed] = useState(4);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [stepping, setStepping] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [top, setTop] = useState(false);
  const state = partitionSnapshot(mode, step, partitions);
  const active = (sceneReady || unavailable) && visible && documentVisible;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(media.matches);
      if (media.matches) {
        setPlaying(false);
        setStepping(false);
        setStep(TOTAL_STEPS);
      }
    };
    update();
    media.addEventListener("change", update);
    const visibility = () => {
      setDocumentVisible(!document.hidden);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        if (entry.isIntersecting) setLoaded(true);
      },
      { threshold: [0, 0.5] },
    );
    if (figure.current) observer.observe(figure.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if ((!playing && !stepping) || !active || state.done) return;
    const timer = window.setTimeout(() => {
      setStep((s) => Math.min(TOTAL_STEPS, s + 1));
      setStepping(false);
    }, 1250 / speed);
    return () => clearTimeout(timer);
  }, [playing, stepping, active, state.done, step, speed]);
  useEffect(() => {
    if (state.done) setPlaying(false);
  }, [state.done]);

  function reset(nextMode = mode, autoplay = false) {
    setPlaying(autoplay && !reduced);
    setStepping(false);
    setMode(nextMode);
    setStep(0);
  }
  const current = state.current;
  const status = state.done
    ? mode === "keyed"
      ? "9 records appended. Matching keys stay together in one partition."
      : partitions === 1
        ? "9 records appended to one ordered log."
        : "9 records appended. Round-robin distributes records across the partitions."
    : current
      ? `Record ${current.id}: ${current.key} → P${current.partition}, offset ${current.offset}.`
      : `One producer. ${partitions} ${partitions === 1 ? "partition" : "partitions"}. Follow nine records into their logs.`;

  const pending = !sceneReady && !unavailable;

  return (
    <figure
      aria-busy={pending}
      ref={figure}
      className="kafka-demo"
      data-graphic-frame="workbench"
      data-graphic-key="kafka-partitioning"
      data-graphic-kind="canvas"
      aria-label="Kafka partitioning interactive demo"
    >
      <header className="kafka-demo-header">
        <p className="article-graphic-title">
          Kafka partitions events into separate logs
        </p>
        <div className="kafka-mode" role="group" aria-label="Routing strategy">
          <button
            disabled={pending}
            type="button"
            aria-pressed={mode === "keyed"}
            onClick={() => reset("keyed", true)}
          >
            By key
          </button>
          <button
            disabled={pending}
            type="button"
            aria-pressed={mode === "round-robin"}
            onClick={() => reset("round-robin", true)}
          >
            Round-robin
          </button>
        </div>
      </header>
      <label className="kafka-partitions">
        <span>
          Partitions <output>{partitions}</output>
        </span>
        <input
          disabled={pending}
          type="range"
          aria-label="Partitions"
          min={1}
          max={5}
          step={1}
          value={partitions}
          onChange={(event) => {
            setPartitions(Number(event.target.value));
          }}
        />
      </label>
      <div className="kafka-keys" aria-label="Record keys">
        {KEYS.map((key, index) => (
          <span key={key}>
            <i data-key={index} />
            {key}
          </span>
        ))}
      </div>
      <div
        className="kafka-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        aria-hidden="true"
      >
        {pending && <DemoSceneLoading />}
        {unavailable ? (
          <p className="kafka-scene-fallback">
            3D is unavailable. Follow record routing in the status below.
          </p>
        ) : loaded ? (
          <SceneBoundary onFailed={markUnavailable}>
            <Suspense
              fallback={
                <p className="kafka-scene-fallback">Loading the scene…</p>
              }
            >
              <Scene
                onReady={markReady}
                onUnavailable={markUnavailable}
                mode={mode}
                partitions={partitions}
                step={step}
                reduced={reduced}
                active={active}
                speed={speed}
                top={top}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          <p className="kafka-scene-fallback">
            {partitions} partitions, ordered by offset.
          </p>
        )}
      </div>
      <div className="kafka-controls">
        <div>
          <button
            type="button"
            disabled={pending || state.done || stepping}
            onClick={() => {
              setPlaying(false);
              if (reduced) {
                setStep((s) =>
                  Math.min(TOTAL_STEPS, (Math.floor(s / 2) + 1) * 2),
                );
              } else {
                setStep((s) => (s % 2 === 0 ? s + 1 : s));
                setStepping(true);
              }
            }}
          >
            Step
          </button>
          <button
            type="button"
            disabled={pending || reduced}
            onClick={() => {
              setStepping(false);
              if (state.done) setStep(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button disabled={pending} type="button" onClick={() => reset()}>
            Replay
          </button>
        </div>
        <label className="kafka-speed">
          Speed
          <select
            disabled={pending}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            {[1, 2, 4, 8].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={pending}
          type="button"
          aria-pressed={top}
          onClick={() => setTop((t) => !t)}
        >
          Top view
        </button>
      </div>
      <div className="kafka-status" role="status" aria-live="polite">
        <p>{status}</p>
        <code>
          {current
            ? mode === "keyed"
              ? `${current.hash} % ${partitions} = ${current.partition}`
              : `${current.id - 1} % ${partitions} = ${current.partition}`
            : mode === "keyed"
              ? `positive(murmur2(key)) % ${partitions}`
              : `producer counter % ${partitions}`}
        </code>
      </div>
    </figure>
  );
}
