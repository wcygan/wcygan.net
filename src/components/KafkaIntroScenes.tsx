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
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import {
  KafkaPlaybackControls,
  useKafkaAutoplay,
} from "~/demos/kafka-intro/useKafkaAutoplay";
import {
  type CameraAction,
  type CameraCommand,
  type IntroSceneState,
  KEY_SEQUENCE,
  keyRoutingSnapshot,
  readNext,
  replayReader,
  replicationSnapshot,
  RETAINED_OFFSETS,
  lagSnapshot,
  skewSnapshot,
  placementSnapshot,
} from "~/demos/kafka-intro/spatial-model";

const Scene = lazy(() => import("~/demos/kafka-intro/KafkaIntroScene"));

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

export function KafkaLagDemo() {
  const [end, setEnd] = useState(4);
  const [processed, setProcessed] = useState(1);
  const playback = useKafkaAutoplay({
    steps: 9,
    intervalMs: 2200,
    onStep: (step) => {
      setEnd(4 + Math.min(step, 3));
      setProcessed(1 + Math.max(0, step - 3));
    },
    onReset: () => {
      setEnd(4);
      setProcessed(1);
    },
  });
  const snapshot = lagSnapshot(end, processed);
  return (
    <SceneFigure
      title="A Slow Reader"
      graphicKey="kafka-intro-lag"
      scene={{ kind: "lag", end, processed }}
      playback={playback}
      controls={
        <>
          <button
            type="button"
            disabled={end === 8}
            onClick={() => setEnd((n) => n + 1)}
          >
            Produce one
          </button>
          <button
            type="button"
            disabled={processed === end}
            onClick={() => setProcessed((n) => n + 1)}
          >
            Process one
          </button>
          <button
            type="button"
            onClick={() => {
              setEnd(4);
              setProcessed(1);
            }}
          >
            Reset backlog
          </button>
        </>
      }
      caption="Yellow records are waiting; green are processed. All remain retained. This shows processing-position lag, not the committed-offset lag usually reported for consumer groups."
    >
      <p>
        Produced: {snapshot.end}. Processed: {snapshot.processed}. Waiting:{" "}
        {snapshot.lag}.
      </p>
      <p>
        {snapshot.lag
          ? "Storage and retention bound the backlog; this demo caps it at eight records."
          : "Caught up. All records remain available."}
      </p>
    </SceneFigure>
  );
}

export function KafkaHotKeyDemo() {
  const [skewed, setSkewed] = useState(true);
  const playback = useKafkaAutoplay({
    steps: 1,
    intervalMs: 3000,
    onStep: () => setSkewed(false),
    onReset: () => setSkewed(true),
  });
  const snapshot = skewSnapshot(skewed);
  return (
    <SceneFigure
      title="One Busy Key"
      graphicKey="kafka-intro-hot-key"
      scene={{ kind: "skew", skewed }}
      playback={playback}
      controls={
        <>
          <button
            type="button"
            aria-pressed={skewed}
            onClick={() => setSkewed(true)}
          >
            Hot key
          </button>
          <button
            type="button"
            aria-pressed={!skewed}
            onClick={() => setSkewed(false)}
          >
            Balanced keys
          </button>
        </>
      }
      caption="One record per partition per round: a busy key bottlenecks its partition. These schematic rounds are not a Kafka benchmark."
    >
      <p>
        P0: {snapshot.counts[0]} records. P1: {snapshot.counts[1]}. P2:{" "}
        {snapshot.counts[2]}.
      </p>
      <p>Finish in {snapshot.rounds} rounds.</p>
    </SceneFigure>
  );
}

export function KafkaPlacementDemo() {
  const [distributed, setDistributed] = useState(false);
  const playback = useKafkaAutoplay({
    steps: 1,
    intervalMs: 3000,
    onStep: () => setDistributed(true),
    onReset: () => setDistributed(false),
  });
  const placement = placementSnapshot(distributed);
  return (
    <SceneFigure
      title="Partitions Across Brokers"
      graphicKey="kafka-intro-placement"
      scene={{ kind: "placement", distributed }}
      playback={playback}
      controls={
        <>
          <button
            type="button"
            aria-pressed={!distributed}
            onClick={() => setDistributed(false)}
          >
            One broker
          </button>
          <button
            type="button"
            aria-pressed={distributed}
            onClick={() => setDistributed(true)}
          >
            Three brokers
          </button>
        </>
      }
      caption="Partition leaders can span brokers. This moves the same three leaders; replicas, transfer traffic, and balancing policy are omitted."
    >
      <p>
        {distributed
          ? "Three brokers each lead one partition."
          : "Broker 1 leads all three partitions; brokers 2 and 3 are idle."}
      </p>
      <ul
        className="kafka-intro-scene-log-list"
        aria-label="Partition placement"
      >
        {placement.map((p) => (
          <li key={p.partition}>
            P{p.partition}: leader on broker {p.broker + 1}.
          </li>
        ))}
      </ul>
    </SceneFigure>
  );
}

const CAMERA_BUTTONS: readonly [CameraAction, string][] = [
  ["left", "Orbit left"],
  ["right", "Orbit right"],
  ["up", "Tilt up"],
  ["down", "Tilt down"],
  ["in", "Zoom in"],
  ["out", "Zoom out"],
  ["reset", "Reset view"],
];
const CAMERA_KEYS: Record<string, CameraAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "+": "in",
  "=": "in",
  "-": "out",
  "0": "reset",
  Home: "reset",
};

function SceneFigure({
  title,
  graphicKey,
  scene,
  controls,
  children,
  caption,
  playback,
}: {
  title: string;
  graphicKey: string;
  scene: IntroSceneState;
  controls: ReactNode;
  children: ReactNode;
  caption: string;
  playback: ReturnType<typeof useKafkaAutoplay>;
}) {
  const titleId = useId();
  const guideId = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const { ready, onReady } = useSceneReady();
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({
    action: "reset",
    revision: 0,
  });
  const pending = !ready && !unavailable;
  const cameraDisabled = pending || unavailable;
  const { stageRef: playbackStageRef, setReady: setPlaybackReady } = playback;
  const setStage = useCallback(
    (element: HTMLDivElement | null) => {
      stage.current = element;
      playbackStageRef(element);
    },
    [playbackStageRef],
  );

  useEffect(() => {
    setPlaybackReady(ready && !unavailable);
  }, [ready, unavailable, setPlaybackReady]);

  useEffect(() => {
    if (!stage.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setLoaded(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  const moveCamera = (action: CameraAction) => {
    setCameraCommand((command) => ({
      action,
      revision: command.revision + 1,
    }));
  };

  return (
    <figure
      className="kafka-intro-figure kafka-intro-scene"
      data-graphic-frame="workbench"
      data-graphic-key={graphicKey}
      data-graphic-kind="canvas"
      aria-labelledby={titleId}
    >
      <p className="kafka-intro-heading article-graphic-title" id={titleId}>
        {title}
      </p>
      <div
        className="kafka-intro-stage kafka-intro-scene-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        ref={setStage}
        role="group"
        aria-label={`${title}: 3D view`}
        aria-describedby={guideId}
        aria-busy={pending}
        tabIndex={unavailable ? -1 : 0}
        onKeyDown={(event) => {
          if (cameraDisabled || event.altKey || event.ctrlKey || event.metaKey)
            return;
          const action = CAMERA_KEYS[event.key];
          if (action) {
            event.preventDefault();
            moveCamera(action);
          }
        }}
      >
        {pending && <DemoSceneLoading />}
        {unavailable ? (
          <p className="kafka-intro-scene-fallback">
            3D is unavailable. Use the controls and state below.
          </p>
        ) : loaded ? (
          <div className="kafka-intro-scene-world" aria-hidden="true">
            <SceneBoundary onFailed={onUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  state={scene}
                  cameraCommand={cameraCommand}
                  onReady={onReady}
                  onUnavailable={onUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        ) : null}
      </div>
      <KafkaPlaybackControls playback={playback} />
      <div
        className="kafka-intro-controls"
        role="group"
        aria-label={`${title} actions`}
        onClickCapture={playback.pause}
      >
        {controls}
      </div>
      <div
        className="kafka-intro-controls kafka-intro-camera-controls"
        role="group"
        aria-label={`${title} camera`}
      >
        {CAMERA_BUTTONS.map(([action, label]) => (
          <button
            key={action}
            type="button"
            disabled={cameraDisabled}
            onClick={() => moveCamera(action)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="kafka-intro-scene-guide" id={guideId}>
        Drag to orbit; scroll to zoom. Keyboard: arrows rotate, + / − zoom, 0
        resets.
      </p>
      <div
        className="kafka-intro-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {children}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function KafkaRetainedLogDemo() {
  const [readers, setReaders] = useState({ billing: 0, analytics: 0 });
  const playback = useKafkaAutoplay({
    steps: 8,
    intervalMs: 2400,
    onStep: (step) => {
      if (step <= 6) {
        setReaders({ billing: step, analytics: Math.floor(step / 2) });
      } else {
        setReaders({ billing: step - 7, analytics: 3 });
      }
    },
    onReset: () => setReaders({ billing: 0, analytics: 0 }),
  });
  return (
    <SceneFigure
      title="A Retained Log"
      graphicKey="kafka-intro-retained-log"
      scene={{ kind: "retained", readers }}
      playback={playback}
      controls={
        <>
          <button
            type="button"
            disabled={readers.billing === 6}
            onClick={() => setReaders((p) => readNext(p, "billing"))}
          >
            Read as Billing
          </button>
          <button
            type="button"
            disabled={readers.analytics === 6}
            onClick={() => setReaders((p) => readNext(p, "analytics"))}
          >
            Read as Analytics
          </button>
          <button
            type="button"
            onClick={() => setReaders((p) => replayReader(p, "billing"))}
          >
            Replay Billing
          </button>
          <button
            type="button"
            onClick={() => setReaders({ billing: 0, analytics: 0 })}
          >
            Reset readers
          </button>
        </>
      }
      caption="Readers advance independently; records remain until Kafka's retention policy removes them."
    >
      <p>Partition 0 still holds offsets {RETAINED_OFFSETS.join(", ")}.</p>
      <p>
        Billing:{" "}
        {readers.billing === 6 ? "caught up" : `next offset ${readers.billing}`}
        . Analytics:{" "}
        {readers.analytics === 6
          ? "caught up"
          : `next offset ${readers.analytics}`}
        .
      </p>
    </SceneFigure>
  );
}

export function KafkaKeyRoutingDemo() {
  const [sent, setSent] = useState(0);
  const playback = useKafkaAutoplay({
    steps: KEY_SEQUENCE.length,
    intervalMs: 2200,
    onStep: setSent,
    onReset: () => setSent(0),
  });
  const snapshot = keyRoutingSnapshot(sent);
  return (
    <SceneFigure
      title="Keys and Partitions"
      graphicKey="kafka-intro-key-routing"
      scene={{ kind: "routing", sent }}
      playback={playback}
      controls={
        <>
          <button
            type="button"
            disabled={snapshot.done}
            onClick={() => setSent((n) => n + 1)}
          >
            {snapshot.next ? `Send ${snapshot.next}` : "All records sent"}
          </button>
          <button type="button" onClick={() => setSent(0)}>
            Reset records
          </button>
        </>
      }
      caption="A producer's partitioner maps keys to partitions. This fixed map illustrates key affinity; order and offsets stay local to each partition."
    >
      <p>
        Illustrative map: A → P0; B → P1; C → P2. Sequence:{" "}
        {KEY_SEQUENCE.join(" / ")}.
      </p>
      <p>
        {snapshot.current
          ? `Sent ${snapshot.records.length} of 6. Last: ${snapshot.current.key} → P${snapshot.current.partition}, offset ${snapshot.current.offset}.`
          : "No records sent yet."}
      </p>
      <ul
        className="kafka-intro-scene-log-list"
        aria-label="Partition contents"
      >
        {[0, 1, 2].map((partition) => (
          <li key={partition}>
            P{partition}:{" "}
            {snapshot.records
              .filter((r) => r.partition === partition)
              .map((r) => `${r.key}@${r.offset}`)
              .join(", ") || "empty"}
          </li>
        ))}
      </ul>
      {snapshot.done && <p>Three logs; no single order across all three.</p>}
    </SceneFigure>
  );
}

export function KafkaReplicationDemo() {
  const [step, setStep] = useState(0);
  const playback = useKafkaAutoplay({
    steps: 4,
    intervalMs: 2800,
    onStep: setStep,
    onReset: () => setStep(0),
  });
  const snapshot = replicationSnapshot(step);
  const messages = [
    "Broker 1 leads; all three replicas hold offsets 0–2.",
    "Broker 1 is offline. After failure detection and safe-replica election, broker 2 leads.",
    "Both in-sync replicas stored record 3; the write is acknowledged.",
    "Broker 3 is offline. One in-sync replica remains; two are required.",
    "The new write is rejected. No record was appended.",
  ];
  return (
    <SceneFigure
      title="Replicas and Failures"
      graphicKey="kafka-intro-replication"
      scene={{ kind: "replication", step }}
      playback={playback}
      controls={
        <>
          <button
            type="button"
            disabled={snapshot.done}
            onClick={() => setStep((n) => n + 1)}
          >
            {snapshot.nextAction ?? "Scenario complete"}
          </button>
          <button type="button" onClick={() => setStep(0)}>
            Reset brokers
          </button>
        </>
      }
      caption="One partition, three copies. Each failure step includes detection and election; all replicas begin caught up."
    >
      <p>{messages[step]}</p>
      <p>
        Leader: broker {snapshot.leader + 1}. In-sync replicas:{" "}
        {snapshot.inSync.length}. Writes:{" "}
        {snapshot.canWrite ? "allowed" : "blocked"} with acks=all and
        min.insync.replicas=2.
      </p>
      <ul className="kafka-intro-scene-log-list" aria-label="Replica contents">
        {snapshot.brokers.map((broker) => (
          <li key={broker.id}>
            Broker {broker.id + 1}:{" "}
            {broker.online
              ? broker.id === snapshot.leader
                ? "leader"
                : "in-sync follower"
              : "offline"}
            ; offsets {broker.offsets.join(", ")}.
          </li>
        ))}
      </ul>
    </SceneFigure>
  );
}
