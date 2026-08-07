import { useEffect, useId, useState } from "react";
import {
  deriveMultiplierSnapshot,
  INITIAL_MULTIPLIER_SNAPSHOT,
  type MultiplierPacket,
} from "~/demos/fanout-multipliers/model";

const VIEWBOX_WIDTH = 820;
const VIEWBOX_HEIGHT = 430;
const COMPACT_VIEWBOX_WIDTH = 500;
const SERVICE_TOP = 176;
const SERVICE_HEIGHT = 88;
const SERVICE_WIDTH = 160;
const UPSTREAM_LEFT = 100;
const UPSTREAM_RIGHT = UPSTREAM_LEFT + SERVICE_WIDTH;
const DOWNSTREAM_LEFT = 340;
const DOWNSTREAM_RIGHT = DOWNSTREAM_LEFT + SERVICE_WIDTH;
const DATABASE_LEFT = 620;
const DATABASE_CENTER_X = 690;
// The cylinder's local bounds run from y=-18 to y=76. Translate its visual
// center to the same y=220 centerline as both service cards.
const DATABASE_CENTER_Y = 191;
const SERVICE_CENTER_Y = 220;
const MULTIPLIER_VISUAL_TIME_SCALE = 0.3;

type Point = { x: number; y: number };

export function FanoutMultiplierDemo() {
  const markerSuffix = useId().replaceAll(":", "");
  const titleId = `fanout-multiplier-title-${markerSuffix}`;
  const descriptionId = `fanout-multiplier-description-${markerSuffix}`;
  const captionId = `fanout-multiplier-caption-${markerSuffix}`;
  const { motionEnabled, snapshot } = useMultiplierPlayback();
  const compact = useCompactMultiplierGraph();
  const scaleX = compact ? COMPACT_VIEWBOX_WIDTH / VIEWBOX_WIDTH : 1;

  return (
    <figure
      className="fanout-multiplier-graph"
      data-graphic-frame="plate"
      data-graphic-key="fanout-request-multiplier"
      data-graphic-kind="svg"
      data-phase={motionEnabled ? "streaming" : "steady"}
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${captionId}`}
    >
      <header className="fanout-multiplier-graph-header">
        <p className="article-graphic-title" id={titleId}>
          One request, six database reads
        </p>
        <p>Fanout multiplies work at every boundary</p>
      </header>

      <div
        className="fanout-multiplier-graph-stage"
        data-graphic-stage="padded"
        aria-hidden="true"
      >
        <svg
          className="fanout-multiplier-graph-svg"
          data-compact={compact ? "true" : "false"}
          viewBox={`0 0 ${
            compact ? COMPACT_VIEWBOX_WIDTH : VIEWBOX_WIDTH
          } ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g
            className="fanout-multiplier-graph-structure"
            transform={`scale(${scaleX} 1)`}
          >
            <text
              className="fanout-multiplier-graph-column-label"
              x="180"
              y="32"
              textAnchor="middle"
            >
              UPSTREAM SERVICE
            </text>
            <text
              className="fanout-multiplier-graph-column-label"
              x="420"
              y="32"
              textAnchor="middle"
            >
              DOWNSTREAM SERVICE
            </text>
            <text
              className="fanout-multiplier-graph-column-label"
              x={DATABASE_CENTER_X}
              y="32"
              textAnchor="middle"
            >
              DATABASE
            </text>

            <line
              className="fanout-multiplier-graph-rail"
              x1="42"
              y1={SERVICE_CENTER_Y}
              x2={UPSTREAM_LEFT}
              y2={SERVICE_CENTER_Y}
            />
            <line
              className="fanout-multiplier-graph-rail"
              x1={UPSTREAM_RIGHT}
              y1={SERVICE_CENTER_Y}
              x2={DOWNSTREAM_LEFT}
              y2={SERVICE_CENTER_Y}
            />
            <line
              className="fanout-multiplier-graph-rail"
              x1={DOWNSTREAM_RIGHT}
              y1={SERVICE_CENTER_Y}
              x2={DATABASE_LEFT}
              y2={SERVICE_CENTER_Y}
            />

            <ServiceCard
              label="Service A"
              rate="5 req/s in"
              x={UPSTREAM_LEFT}
              tone="upstream"
            />
            <ServiceCard
              label="Service B"
              rate="15 req/s in"
              x={DOWNSTREAM_LEFT}
              tone="downstream"
            />
            <DatabaseCard />

            <text
              className="fanout-multiplier-graph-flow-label"
              x="70"
              y="184"
              textAnchor="middle"
            >
              5 req/s
            </text>
            <text
              className="fanout-multiplier-graph-flow-label"
              x="300"
              y="184"
              textAnchor="middle"
            >
              15 req/s
            </text>
            <text
              className="fanout-multiplier-graph-flow-label"
              x="560"
              y="184"
              textAnchor="middle"
            >
              30 reads/s
            </text>

            <text
              className="fanout-multiplier-graph-multiplier"
              x="300"
              y="204"
              textAnchor="middle"
            >
              ×3
            </text>
            <text
              className="fanout-multiplier-graph-multiplier"
              x="560"
              y="204"
              textAnchor="middle"
            >
              ×2
            </text>

            <text
              className="fanout-multiplier-graph-summary"
              x="410"
              y="404"
              textAnchor="middle"
            >
              1 request → 3 calls → 6 reads
            </text>
          </g>

          {motionEnabled && (
            <g className="fanout-multiplier-graph-packets">
              {snapshot.packets.map((packet) => (
                <MultiplierPacketOrb
                  key={packet.id}
                  packet={packet}
                  scaleX={scaleX}
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      <p className="sr-only" id={descriptionId}>
        A continuous stream enters Service A at 5 requests per second. Each
        request produces three downstream requests, averaging 15 requests per
        second at Service B. Each downstream request produces two database
        reads, averaging 30 reads per second. The three rails stay singular;
        moving dots preserve the causal 1-to-3-to-6 bursts.
      </p>
    </figure>
  );
}

function useMultiplierPlayback() {
  const [snapshot, setSnapshot] = useState(INITIAL_MULTIPLIER_SNAPSHOT);
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let previousFrame: number | undefined;
    let elapsedMs = 0;

    const cancelFrame = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;
      setSnapshot(
        deriveMultiplierSnapshot(elapsedMs * MULTIPLIER_VISUAL_TIME_SCALE),
      );
      animationFrame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      cancelFrame();
      if (reducedMotion.matches || document.hidden) {
        setMotionEnabled(false);
        setSnapshot(
          deriveMultiplierSnapshot(elapsedMs * MULTIPLIER_VISUAL_TIME_SCALE),
        );
        return;
      }
      setMotionEnabled(true);
      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => start();
    const handleVisibility = () => {
      if (document.hidden) cancelFrame();
      else start();
    };

    start();
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelFrame();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return { motionEnabled, snapshot };
}

function useCompactMultiplierGraph() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 540px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return compact;
}

function ServiceCard({
  label,
  rate,
  x,
  tone,
}: {
  label: string;
  rate: string;
  x: number;
  tone: "upstream" | "downstream";
}) {
  return (
    <g
      className={`fanout-multiplier-graph-service fanout-multiplier-graph-service-${tone}`}
      transform={`translate(${x} ${SERVICE_TOP})`}
    >
      <rect width={SERVICE_WIDTH} height={SERVICE_HEIGHT} rx="12" />
      <text className="fanout-multiplier-graph-service-label" x="80" y="38">
        {label}
      </text>
      <text className="fanout-multiplier-graph-service-rate" x="80" y="61">
        {rate}
      </text>
    </g>
  );
}

function DatabaseCard() {
  return (
    <g
      className="fanout-multiplier-graph-database"
      transform={`translate(${DATABASE_CENTER_X} ${DATABASE_CENTER_Y})`}
    >
      <path
        className="fanout-multiplier-graph-database-body"
        d="M-70 0V58c0 10 31 18 70 18s70-8 70-18V0"
      />
      <ellipse
        className="fanout-multiplier-graph-database-top"
        cy="0"
        rx="70"
        ry="18"
      />
      <text className="fanout-multiplier-graph-database-label" y="6">
        Database
      </text>
      <text className="fanout-multiplier-graph-database-rate" y="34">
        30 reads/s
      </text>
    </g>
  );
}

function MultiplierPacketOrb({
  packet,
  scaleX,
}: {
  packet: MultiplierPacket;
  scaleX: number;
}) {
  const start = packetStart(packet);
  const end = packetEnd(packet);
  const x = (start.x + (end.x - start.x) * packet.progress) * scaleX;
  const y = start.y + (end.y - start.y) * packet.progress;
  const className = `fanout-multiplier-graph-packet fanout-multiplier-graph-packet-${packet.kind}`;

  return (
    <g
      className={className}
      transform={`translate(${x} ${y})`}
      data-kind={packet.kind}
      data-input-index={packet.inputIndex}
      data-downstream-index={packet.downstreamIndex}
      data-child-index={packet.childIndex}
      data-read-index={packet.readIndex}
    >
      <circle
        className="fanout-multiplier-graph-packet-core"
        r={
          packet.kind === "input"
            ? 4.5
            : packet.kind === "downstream"
              ? 3.8
              : 3.2
        }
      />
    </g>
  );
}

function packetStart(packet: MultiplierPacket): Point {
  if (packet.kind === "input") return { x: 42, y: SERVICE_CENTER_Y };
  if (packet.kind === "downstream") {
    return { x: UPSTREAM_RIGHT, y: SERVICE_CENTER_Y };
  }
  return { x: DOWNSTREAM_RIGHT, y: SERVICE_CENTER_Y };
}

function packetEnd(packet: MultiplierPacket): Point {
  if (packet.kind === "input") return { x: UPSTREAM_LEFT, y: SERVICE_CENTER_Y };
  if (packet.kind === "downstream") {
    return { x: DOWNSTREAM_LEFT, y: SERVICE_CENTER_Y };
  }
  return { x: DATABASE_LEFT, y: SERVICE_CENTER_Y };
}
