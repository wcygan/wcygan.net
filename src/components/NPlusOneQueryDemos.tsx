import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  buildQueryComparison,
  DEFAULT_RECORD_COUNT,
  deriveRoundTripSnapshot,
  REDUCED_MOTION_ROUND_TRIP_PROGRESS,
  ROUND_TRIP_LOOP_MS,
  type QueryPlan,
  type RoundTripLaneSnapshot,
  type RoundTripPacket,
  type RoundTripSnapshot,
} from "~/demos/n-plus-one-query/model";

const comparison = buildQueryComparison(DEFAULT_RECORD_COUNT);
const INITIAL_ROUND_TRIP_SNAPSHOT = deriveRoundTripSnapshot({ progress: 0 });

const FLOW_VIEWBOX_WIDTH = 560;
const FLOW_VIEWBOX_HEIGHT = 220;
const FLOW_APP_X = 86;
const FLOW_DATABASE_X = 474;
const FLOW_NODE_Y = 104;
const FLOW_START_X = 154;
const FLOW_END_X = 406;
const FLOW_RAIL_Y = 104;

export function NPlusOneQueryDemos() {
  return (
    <div
      className="n1-query-demo-stack"
      aria-label="N plus one query versus batch query demos"
    >
      <RoundTripTimelineDemo />
      <QueryBudgetMeterDemo />
    </div>
  );
}

function RoundTripTimelineDemo() {
  const { reset, snapshot } = useRoundTripSnapshot();

  return (
    <figure className="n1-demo n1-round-trip-demo">
      <DemoHeader
        action={
          <button
            aria-label="Reset round trip animation"
            className="n1-reset-button"
            onClick={reset}
            type="button"
          >
            Reset
          </button>
        }
        eyebrow="Demo 1"
        title="Round trips for 10 records"
        copy="Both paths want the same 10 records with related rows; watch how many records have actually arrived at the app."
      />

      <div className="n1-round-trip-grid">
        <AnimatedQueryLane snapshot={snapshot.nPlusOne} />
        <AnimatedQueryLane snapshot={snapshot.batch} />
      </div>

      <figcaption className="n1-demo-status">
        The N+1 path receives one record per database response; the batch path
        jumps from 0 to 10 when the single batched response arrives.
      </figcaption>
    </figure>
  );
}

function useRoundTripSnapshot(): {
  reset: () => void;
  snapshot: RoundTripSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_ROUND_TRIP_SNAPSHOT);
  const [restartIndex, setRestartIndex] = useState(0);

  const reset = useCallback(() => {
    setSnapshot(INITIAL_ROUND_TRIP_SNAPSHOT);
    setRestartIndex((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setSnapshot(
        deriveRoundTripSnapshot({
          progress: REDUCED_MOTION_ROUND_TRIP_PROGRESS,
        }),
      );
      return;
    }

    let frameId = 0;
    let startedAt = performance.now();

    const tick = (now: number) => {
      const progress =
        ((now - startedAt) % ROUND_TRIP_LOOP_MS) / ROUND_TRIP_LOOP_MS;
      setSnapshot(deriveRoundTripSnapshot({ progress }));
      frameId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      frameId = window.requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      window.cancelAnimationFrame(frameId);
      if (document.hidden) return;

      startedAt = performance.now();
      start();
    };

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [restartIndex]);

  return { reset, snapshot };
}

function QueryBudgetMeterDemo() {
  return (
    <figure className="n1-demo n1-budget-demo">
      <DemoHeader
        eyebrow="Demo 2"
        title="Query budget meter"
        copy="The output stays fixed at 10 records, while query count and estimated wait time change with the query shape."
      />

      <div className="n1-budget-input">
        <span>Records wanted</span>
        <strong>{comparison.recordCount}</strong>
      </div>

      <div className="n1-budget-grid">
        <BudgetCard plan={comparison.nPlusOne} />
        <BudgetCard plan={comparison.batch} />
      </div>

      <figcaption className="n1-demo-status">
        Batching keeps the child lookup set-oriented: one query can return rows
        for all 10 parent ids.
      </figcaption>
    </figure>
  );
}

function DemoHeader({
  action,
  copy,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  copy: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="n1-demo-header">
      <div className="n1-demo-header-top">
        <span>{eyebrow}</span>
        {action}
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

function AnimatedQueryLane({ snapshot }: { snapshot: RoundTripLaneSnapshot }) {
  const packetPoint = snapshot.packet
    ? pointForPacket(snapshot.packet)
    : undefined;
  const fetchedPercent = `${(snapshot.fetchedRecords / snapshot.recordCount) * 100}%`;

  return (
    <section
      className="n1-query-lane n1-animation-lane"
      data-kind={snapshot.kind}
      data-phase={snapshot.phase}
    >
      <div className="n1-query-lane-summary">
        <div>
          <h4>{snapshot.title}</h4>
        </div>
        <strong>{snapshot.queryCount} queries</strong>
      </div>

      <div className="n1-fetched-counter" aria-label="Fetched records">
        <strong>
          {snapshot.fetchedRecords}/{snapshot.recordCount}
        </strong>
        <span>records fetched</span>
      </div>

      <div
        className="n1-record-progress"
        style={{ "--n1-fetched-width": fetchedPercent } as CSSProperties}
        aria-hidden="true"
      >
        {Array.from({ length: snapshot.recordCount }, (_, index) => {
          const recordNumber = index + 1;
          const state =
            recordNumber <= snapshot.fetchedRecords
              ? "fetched"
              : recordNumber === snapshot.activeRecord
                ? "active"
                : "pending";

          return (
            <span key={recordNumber} data-state={state} aria-hidden="true" />
          );
        })}
      </div>

      <svg
        className="n1-flow-map"
        viewBox={`0 0 ${FLOW_VIEWBOX_WIDTH} ${FLOW_VIEWBOX_HEIGHT}`}
        role="img"
      >
        <title>{snapshot.title} data-fetch animation</title>
        <desc>
          The application sends query requests to the database, and database
          response packets increase the fetched record counter.
        </desc>

        <line
          className="n1-flow-line n1-flow-line-request"
          x1={FLOW_START_X}
          y1={FLOW_RAIL_Y}
          x2={FLOW_END_X}
          y2={FLOW_RAIL_Y}
        />
        <line
          className="n1-flow-line n1-flow-line-response"
          x1={FLOW_END_X}
          y1={FLOW_RAIL_Y}
          x2={FLOW_START_X}
          y2={FLOW_RAIL_Y}
        />

        <EndpointNode kind="app" />
        <EndpointNode kind="database" />

        {packetPoint && snapshot.packet ? (
          <g className="n1-flow-packet" data-tone={snapshot.packet.tone}>
            <circle cx={packetPoint.x} cy={packetPoint.y} r="10" />
            <text x={packetPoint.x} y={packetPoint.y + 4}>
              {snapshot.packet.label}
            </text>
          </g>
        ) : null}
      </svg>

      <p className="n1-lane-status">{snapshot.statusLabel}</p>
    </section>
  );
}

function EndpointNode({ kind }: { kind: "app" | "database" }) {
  if (kind === "app") {
    return (
      <g
        className="n1-flow-node n1-flow-node-app"
        transform={`translate(${FLOW_APP_X} ${FLOW_NODE_Y})`}
      >
        <rect x="-38" y="-31" width="76" height="62" rx="10" />
        <circle cx="-21" cy="-16" r="3" />
        <circle cx="-10" cy="-16" r="3" />
        <line x1="-27" y1="-3" x2="27" y2="-3" />
        <line x1="-27" y1="13" x2="18" y2="13" />
        <text y="58">App</text>
      </g>
    );
  }

  return (
    <g
      className="n1-flow-node n1-flow-node-db"
      transform={`translate(${FLOW_DATABASE_X} ${FLOW_NODE_Y})`}
    >
      <path d="M -38 -18 C -38 -31 38 -31 38 -18 L 38 25 C 38 38 -38 38 -38 25 Z" />
      <path d="M -38 -18 C -38 -5 38 -5 38 -18" />
      <path d="M -38 4 C -38 17 38 17 38 4" />
      <text y="58">Database</text>
    </g>
  );
}

function pointForPacket(packet: RoundTripPacket) {
  if (packet.direction === "to-db") {
    return {
      x: FLOW_START_X + (FLOW_END_X - FLOW_START_X) * packet.progress,
      y: FLOW_RAIL_Y,
    };
  }

  return {
    x: FLOW_END_X - (FLOW_END_X - FLOW_START_X) * packet.progress,
    y: FLOW_RAIL_Y,
  };
}

function BudgetCard({ plan }: { plan: QueryPlan }) {
  return (
    <section className="n1-budget-card" data-kind={plan.kind}>
      <div className="n1-budget-card-header">
        <h4>{plan.title}</h4>
        <strong>{plan.queryCount} queries</strong>
      </div>

      <MeterRow
        label="Database trips"
        value={plan.queryCount}
        max={comparison.maxQueryCount}
        suffix=""
      />
      <MeterRow
        label="Estimated wait"
        value={plan.estimatedMs}
        max={comparison.maxEstimatedMs}
        suffix="ms"
      />
      <MeterRow
        label="Records wanted"
        value={plan.recordsWanted}
        max={comparison.recordCount}
        suffix=""
      />
    </section>
  );
}

function MeterRow({
  label,
  max,
  suffix,
  value,
}: {
  label: string;
  max: number;
  suffix: string;
  value: number;
}) {
  const width = `${Math.max(6, Math.min(100, (value / max) * 100))}%`;

  return (
    <div className="n1-meter-row">
      <span>{label}</span>
      <div
        className="n1-meter-track"
        role="meter"
        aria-label={`${label}: ${value}${suffix}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <span style={{ "--n1-meter-width": width } as CSSProperties} />
      </div>
      <strong>
        {value}
        {suffix}
      </strong>
    </div>
  );
}
