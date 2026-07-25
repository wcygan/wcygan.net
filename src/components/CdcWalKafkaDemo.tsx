import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DemoReplayButton } from "~/components/DemoReplayButton";
import { ConverterIcon } from "~/components/icons/ConverterIcon";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";
import { KafkaIcon } from "~/components/icons/KafkaIcon";
import {
  COMPLETE_WAL_KAFKA_SNAPSHOT,
  deriveWalKafkaSnapshot,
  INITIAL_WAL_KAFKA_SNAPSHOT,
  WAL_KAFKA_DURATION_MS,
  type WalKafkaPhase,
  type WalKafkaSnapshot,
} from "~/demos/cdc-wal-kafka/model";

type Point = {
  x: number;
  y: number;
};

type MotionGeometry = {
  inbound: Point[];
  outbound: Point[];
};

const INITIAL_MOTION_GEOMETRY: MotionGeometry = {
  inbound: [{ x: 0, y: 0 }],
  outbound: [{ x: 0, y: 0 }],
};

const PAYLOAD_HALF_WIDTH_PX = 38;
const PAYLOAD_HALF_HEIGHT_PX = 23;
const MOBILE_LAYOUT_MAX_WIDTH_PX = 560;
const MOBILE_LEDGER_RAIL_INSET_PX = 54;
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function CdcWalKafkaDemo() {
  const { replay, snapshot } = useWalKafkaPlayback();
  const stageRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const walPanelRef = useRef<HTMLElement>(null);
  const connectorRef = useRef<HTMLDivElement>(null);
  const kafkaPanelRef = useRef<HTMLElement>(null);
  const walRowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const kafkaRowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const geometryIndex =
    snapshot.activeIndex ??
    (snapshot.isComplete ? snapshot.walRows.length - 1 : 0);
  const geometry = useWalKafkaGeometry({
    activeIndex: geometryIndex,
    connectorRef,
    kafkaPanelRef,
    kafkaRowRefs,
    pipelineRef,
    stageRef,
    walPanelRef,
    walRowRefs,
  });
  const payloadStyle = payloadMotionStyle(snapshot, geometry);

  return (
    <figure
      className="cdc-wal-kafka-demo"
      data-graphic-frame="workbench"
      data-graphic-key="cdc-wal-kafka"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="cdc-wal-kafka-title"
      aria-describedby="cdc-wal-kafka-description"
    >
      <header className="cdc-wal-kafka-header">
        <p className="article-graphic-title" id="cdc-wal-kafka-title">
          Debezium reads the WAL in order
        </p>
        <DemoReplayButton
          ariaLabel="Replay ordered WAL to Kafka appends"
          isComplete={snapshot.isComplete}
          onReplay={replay}
        />
      </header>

      <p className="sr-only" id="cdc-wal-kafka-description">
        Debezium reads committed Postgres WAL records in increasing LSN order.
        LSN 24023128 updates user 42 from plan free to pro and maps to Kafka
        offset zero. LSN 24023144 deletes the row for user 7 and maps to offset
        one. LSN 24023160 updates user 9 from plan free to team and maps to
        offset two. Consumers can follow this ordered topic without polling
        Postgres tables.
      </p>

      <div
        className="cdc-wal-kafka-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
        ref={stageRef}
      >
        <div className="cdc-wal-kafka-pipeline" ref={pipelineRef}>
          <section
            className="cdc-wal-kafka-ledger cdc-wal-kafka-ledger--wal"
            ref={walPanelRef}
          >
            <ActorHeader
              icon={<DatabaseIcon aria-hidden="true" />}
              label="Postgres WAL"
              meta="Committed records"
              system="postgres"
            />
            <ol className="cdc-wal-kafka-list">
              {snapshot.walRows.map((row, index) => (
                <li
                  className="cdc-wal-kafka-row cdc-wal-kafka-wal-row"
                  data-status={row.status}
                  key={row.lsn}
                  ref={(element) => {
                    walRowRefs.current[index] = element;
                  }}
                >
                  <div className="cdc-wal-kafka-row-meta">
                    <code>LSN {row.lsn}</code>
                    <span>{walStatusLabel(row.status)}</span>
                  </div>
                  <strong>{row.summary}</strong>
                  <span className="cdc-wal-kafka-row-detail">{row.detail}</span>
                </li>
              ))}
            </ol>
          </section>

          <FlowArrow direction="forward" />

          <div className="cdc-wal-kafka-connector" ref={connectorRef}>
            <ConverterIcon
              className="cdc-wal-kafka-connector-icon"
              aria-hidden="true"
            />
            <strong>Debezium</strong>
            <span>Logical decoding cursor</span>
            <code>
              {snapshot.cursorLsn ? `LSN ${snapshot.cursorLsn}` : "LSN —"}
            </code>
            <small>{connectorStatus(snapshot.phase)}</small>
          </div>

          <FlowArrow direction="forward" />

          <section
            className="cdc-wal-kafka-ledger cdc-wal-kafka-ledger--kafka"
            ref={kafkaPanelRef}
          >
            <ActorHeader
              icon={<KafkaIcon aria-hidden="true" />}
              label="Kafka topic"
              meta="app.public.users"
              system="kafka"
            />
            <ol className="cdc-wal-kafka-list">
              {snapshot.kafkaRows.map((row, index) => (
                <li
                  className="cdc-wal-kafka-row cdc-wal-kafka-kafka-row"
                  data-status={row.status}
                  key={row.slot}
                  ref={(element) => {
                    kafkaRowRefs.current[index] = element;
                  }}
                >
                  <span
                    className="cdc-wal-kafka-acceptance-highlight"
                    aria-hidden="true"
                  />
                  {row.event ? (
                    <>
                      <div className="cdc-wal-kafka-row-meta">
                        <code>offset {row.event.offset}</code>
                        <span>
                          {row.status === "accepting"
                            ? "append accepted"
                            : "appended"}
                        </span>
                      </div>
                      <strong>{row.event.summary}</strong>
                      <span className="cdc-wal-kafka-row-detail">
                        source LSN {row.event.sourceLsn}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="cdc-wal-kafka-empty-slot">
                        Next append
                      </span>
                      <span className="cdc-wal-kafka-row-detail">
                        waiting for event
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {snapshot.payload ? (
          <span
            className="cdc-wal-kafka-payload"
            data-leg={snapshot.payload.leg}
            data-moving={snapshot.payload.leg === "arrived" ? "false" : "true"}
            style={payloadStyle}
          >
            <code>{snapshot.payload.sourceLsn}</code>
            <span>{snapshot.payload.changeLabel}</span>
          </span>
        ) : null}

        <div className="cdc-wal-kafka-result">
          <strong>3 WAL records</strong>
          <span aria-hidden="true">→</span>
          <strong>Kafka offsets 0–2</strong>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Complete. WAL LSNs 24023128, 24023144, and 24023160 map in order to Kafka offsets 0, 1, and 2."
          : ""}
      </p>
    </figure>
  );
}

function ActorHeader({
  icon,
  label,
  meta,
  system,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  system: "postgres" | "kafka";
}) {
  return (
    <header className="cdc-wal-kafka-actor-header" data-system={system}>
      <span className="cdc-wal-kafka-actor-icon">{icon}</span>
      <strong>{label}</strong>
      <code>{meta}</code>
    </header>
  );
}

function FlowArrow({ direction }: { direction: "forward" }) {
  return (
    <div
      className="cdc-wal-kafka-flow-arrow"
      data-direction={direction}
      aria-hidden="true"
    >
      <span />
    </div>
  );
}

function useWalKafkaPlayback(): {
  replay: () => void;
  snapshot: WalKafkaSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_WAL_KAFKA_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);

  useClientLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSnapshot(COMPLETE_WAL_KAFKA_SNAPSHOT);
    }
  }, []);

  const replay = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSnapshot(
      prefersReducedMotion
        ? COMPLETE_WAL_KAFKA_SNAPSHOT
        : INITIAL_WAL_KAFKA_SNAPSHOT,
    );
    setPlaybackId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = reducedMotion.matches ? WAL_KAFKA_DURATION_MS : 0;
    let previousFrame: number | undefined;

    const cancelFrame = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const renderComplete = () => {
      elapsedMs = WAL_KAFKA_DURATION_MS;
      cancelFrame();
      setSnapshot(COMPLETE_WAL_KAFKA_SNAPSHOT);
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const nextSnapshot = deriveWalKafkaSnapshot(elapsedMs);
      setSnapshot(nextSnapshot);

      if (!nextSnapshot.isComplete) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      cancelFrame();

      if (reducedMotion.matches) {
        renderComplete();
        return;
      }

      if (!document.hidden && elapsedMs < WAL_KAFKA_DURATION_MS) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const handleMotionPreference = () => {
      if (reducedMotion.matches) {
        renderComplete();
      }
    };

    const handleVisibility = () => {
      cancelFrame();

      if (
        !document.hidden &&
        !reducedMotion.matches &&
        elapsedMs < WAL_KAFKA_DURATION_MS
      ) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    start();
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelFrame();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [playbackId]);

  return { replay, snapshot };
}

function useWalKafkaGeometry({
  activeIndex,
  connectorRef,
  kafkaPanelRef,
  kafkaRowRefs,
  pipelineRef,
  stageRef,
  walPanelRef,
  walRowRefs,
}: {
  activeIndex: number;
  connectorRef: React.RefObject<HTMLDivElement | null>;
  kafkaPanelRef: React.RefObject<HTMLElement | null>;
  kafkaRowRefs: React.RefObject<Array<HTMLLIElement | null>>;
  pipelineRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
  walPanelRef: React.RefObject<HTMLElement | null>;
  walRowRefs: React.RefObject<Array<HTMLLIElement | null>>;
}) {
  const [geometry, setGeometry] = useState(INITIAL_MOTION_GEOMETRY);

  useEffect(() => {
    const stage = stageRef.current;
    const pipeline = pipelineRef.current;
    const walPanel = walPanelRef.current;
    const connector = connectorRef.current;
    const kafkaPanel = kafkaPanelRef.current;
    const walRow = walRowRefs.current[activeIndex];
    const kafkaRow = kafkaRowRefs.current[activeIndex];
    if (
      !stage ||
      !pipeline ||
      !walPanel ||
      !connector ||
      !kafkaPanel ||
      !walRow ||
      !kafkaRow
    ) {
      return;
    }

    const measure = () => {
      const stageBox = stage.getBoundingClientRect();
      const pipelineBox = pipeline.getBoundingClientRect();
      const walPanelBox = walPanel.getBoundingClientRect();
      const connectorBox = connector.getBoundingClientRect();
      const kafkaPanelBox = kafkaPanel.getBoundingClientRect();
      const walRowBox = walRow.getBoundingClientRect();
      const kafkaRowBox = kafkaRow.getBoundingClientRect();
      const compact = pipelineBox.width <= MOBILE_LAYOUT_MAX_WIDTH_PX;
      const relativePoint = (x: number, y: number): Point => ({
        x: x - stageBox.left,
        y: y - stageBox.top,
      });

      if (compact) {
        const walRailX = walPanelBox.left + MOBILE_LEDGER_RAIL_INSET_PX;
        const kafkaRailX = kafkaPanelBox.left + MOBILE_LEDGER_RAIL_INSET_PX;

        setGeometry({
          inbound: [
            relativePoint(walRailX, centerY(walRowBox)),
            relativePoint(
              walRailX,
              walPanelBox.bottom + PAYLOAD_HALF_HEIGHT_PX + 6,
            ),
            relativePoint(
              centerX(connectorBox),
              connectorBox.top - PAYLOAD_HALF_HEIGHT_PX - 6,
            ),
          ],
          outbound: [
            relativePoint(
              centerX(connectorBox),
              connectorBox.bottom + PAYLOAD_HALF_HEIGHT_PX + 6,
            ),
            relativePoint(
              kafkaRailX,
              kafkaPanelBox.top - PAYLOAD_HALF_HEIGHT_PX - 6,
            ),
            relativePoint(kafkaRailX, centerY(kafkaRowBox)),
          ],
        });
        return;
      }

      setGeometry({
        inbound: [
          relativePoint(
            walRowBox.right + PAYLOAD_HALF_WIDTH_PX,
            centerY(walRowBox),
          ),
          relativePoint(
            connectorBox.left - PAYLOAD_HALF_WIDTH_PX,
            centerY(connectorBox),
          ),
        ],
        outbound: [
          relativePoint(
            connectorBox.right + PAYLOAD_HALF_WIDTH_PX,
            centerY(connectorBox),
          ),
          relativePoint(
            kafkaRowBox.left - PAYLOAD_HALF_WIDTH_PX,
            centerY(kafkaRowBox),
          ),
        ],
      });
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(stage);
    resizeObserver.observe(pipeline);
    resizeObserver.observe(walPanel);
    resizeObserver.observe(connector);
    resizeObserver.observe(kafkaPanel);
    resizeObserver.observe(walRow);
    resizeObserver.observe(kafkaRow);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [
    activeIndex,
    connectorRef,
    kafkaPanelRef,
    kafkaRowRefs,
    pipelineRef,
    stageRef,
    walPanelRef,
    walRowRefs,
  ]);

  return geometry;
}

function payloadMotionStyle(
  snapshot: WalKafkaSnapshot,
  geometry: MotionGeometry,
): CSSProperties | undefined {
  const payload = snapshot.payload;
  if (!payload) return undefined;

  const path =
    payload.leg === "wal-to-debezium" ? geometry.inbound : geometry.outbound;
  const point = pointAlongPath(path, payload.progress);

  return {
    opacity: payload.opacity,
    transform: `translate3d(${point.x - PAYLOAD_HALF_WIDTH_PX}px, ${
      point.y - PAYLOAD_HALF_HEIGHT_PX
    }px, 0)`,
  };
}

function pointAlongPath(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  const lengths = points
    .slice(1)
    .map((point, index) => distance(points[index], point));
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  let remainingDistance = clamp(progress, 0, 1) * totalLength;

  for (let index = 0; index < lengths.length; index++) {
    const segmentLength = lengths[index];
    if (remainingDistance <= segmentLength || index === lengths.length - 1) {
      const segmentProgress =
        segmentLength === 0 ? 1 : remainingDistance / segmentLength;
      return interpolatePoint(
        points[index],
        points[index + 1],
        segmentProgress,
      );
    }
    remainingDistance -= segmentLength;
  }

  return points.at(-1) ?? points[0];
}

function interpolatePoint(start: Point, end: Point, progress: number): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function distance(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function centerX(rect: DOMRect) {
  return rect.left + rect.width / 2;
}

function centerY(rect: DOMRect) {
  return rect.top + rect.height / 2;
}

function walStatusLabel(status: WalKafkaSnapshot["walRows"][number]["status"]) {
  if (status === "active") return "reading";
  if (status === "read") return "read";
  return "queued";
}

function connectorStatus(phase: WalKafkaPhase) {
  if (phase === "establishing") return "Waiting for first LSN";
  if (phase === "selecting") return "Cursor positioned";
  if (phase === "reading") return "Reading change";
  if (phase === "encoding") return "Encoding event";
  if (phase === "emitting") return "Appending event";
  if (phase === "accepting") return "Append accepted";
  if (phase === "settling") return "Advancing cursor";
  return "Cursor at final LSN";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
