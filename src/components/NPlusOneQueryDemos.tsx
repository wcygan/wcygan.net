import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  deriveQueryRaceSnapshot,
  INITIAL_QUERY_RACE_SNAPSHOT,
  ORDER_COUNT,
  QUERY_RACE_DURATION_MS,
  type QueryLaneSnapshot,
  type QueryRaceSnapshot,
} from "~/demos/n-plus-one-query/model";

export function NPlusOneQueryDemos() {
  const { replay, snapshot } = useQueryRacePlayback();

  return (
    <figure
      className="query-race"
      data-graphic-frame="workbench"
      data-graphic-key="query-race"
      data-graphic-kind="dom"
      aria-labelledby="query-race-title"
      aria-describedby="query-race-description query-race-caption"
    >
      <header className="query-race-header">
        <div>
          <p className="article-graphic-title" id="query-race-title">
            Round trips for 10 known order ids
          </p>
          <p id="query-race-description">
            The database access pattern can impact application latency
          </p>
        </div>
        <button
          className="query-race-replay"
          type="button"
          onClick={replay}
          aria-label="Replay query round trip comparison"
        >
          Replay
        </button>
      </header>

      <div className="query-race-stage" data-graphic-stage="flush">
        <div className="query-race-input" aria-hidden="true">
          <span>Order IDs:</span>
          <code className="query-race-input-value">
            [101, 102, 103, …, 110]
          </code>
        </div>

        <div className="query-race-lanes" aria-hidden="true">
          <QueryLane snapshot={snapshot.nPlusOne} />
          <QueryLane snapshot={snapshot.batch} />
        </div>

        <div
          className="query-race-summary"
          data-visible={snapshot.batch.isComplete ? "true" : "false"}
          aria-hidden="true"
        >
          <ComparisonMetric label="Rows returned" value="10" />
          <ComparisonMetric
            label="Round trips"
            value="1 (Batched) 10 (Individual)"
          />
          <ComparisonMetric label="Latency" value="35ms vs 250ms" />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Comparison complete. Both approaches returned 10 rows. The batch lookup used one round trip and 35 milliseconds; individual lookups used ten round trips and 250 milliseconds."
          : ""}
      </p>

      <figcaption id="query-race-caption">
        Individual lookups cost 25ms while a batch lookup costs 35ms; the rows
        are identical but batching avoids round-trip latency and database
        overhead
      </figcaption>
    </figure>
  );
}

function useQueryRacePlayback(): {
  replay: () => void;
  snapshot: QueryRaceSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_QUERY_RACE_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);

  const replay = useCallback(() => {
    setSnapshot(INITIAL_QUERY_RACE_SNAPSHOT);
    setPlaybackId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = 0;
    let previousFrame: number | undefined;

    const renderSettledComparison = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;
      setSnapshot(deriveQueryRaceSnapshot(1));
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const progress = Math.min(1, elapsedMs / QUERY_RACE_DURATION_MS);
      setSnapshot(deriveQueryRaceSnapshot(progress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;

      if (reducedMotion.matches) {
        renderSettledComparison();
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      setSnapshot(INITIAL_QUERY_RACE_SNAPSHOT);
      start();
    };

    const handleVisibility = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;

      if (!document.hidden && !reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    start();
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [playbackId]);

  return { replay, snapshot };
}

function QueryLane({ snapshot }: { snapshot: QueryLaneSnapshot }) {
  const railRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const [travelDistance, setTravelDistance] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    const packet = packetRef.current;
    if (!rail || !packet) return;

    const measure = () => {
      setTravelDistance(Math.max(0, rail.clientWidth - packet.offsetWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);

    return () => observer.disconnect();
  }, []);

  const packetPosition = snapshot.packet
    ? snapshot.packet.direction === "outbound"
      ? snapshot.packet.progress
      : 1 - snapshot.packet.progress
    : snapshot.isComplete
      ? 0
      : 1;
  const packetStyle = {
    opacity: snapshot.packet ? 1 : 0,
    transform: `translate3d(${packetPosition * travelDistance}px, 0, 0)`,
  } satisfies CSSProperties;

  return (
    <section
      className="query-race-lane"
      data-kind={snapshot.kind}
      data-phase={snapshot.phase}
    >
      <div className="query-race-lane-header">
        <div>
          <strong>{snapshot.title}</strong>
          <span>{snapshot.queryLabel}</span>
        </div>
        <time dateTime={`PT${(snapshot.elapsedMs / 1000).toFixed(3)}S`}>
          {snapshot.elapsedMs.toString().padStart(3, "0")}ms
        </time>
      </div>

      <div className="query-race-network">
        <QueryEndpoint kind="application" label="Application" />
        <div className="query-race-rail" ref={railRef}>
          <span className="query-race-rail-line" />
          <span
            className="query-race-packet"
            data-direction={snapshot.packet?.direction ?? "idle"}
            data-moving={snapshot.packet ? "true" : "false"}
            ref={packetRef}
            style={packetStyle}
          >
            {snapshot.packet?.label ?? "done"}
          </span>
        </div>
        <QueryEndpoint kind="database" label="Database" />
      </div>

      <div className="query-race-output">
        <div
          className="query-race-records"
          data-grouped={snapshot.kind === "batch" ? "true" : "false"}
        >
          {Array.from({ length: ORDER_COUNT }, (_, index) => (
            <span
              key={index}
              data-returned={index < snapshot.returnedOrders ? "true" : "false"}
            />
          ))}
        </div>
        <span>{snapshot.returnedOrders}/10 rows</span>
      </div>
    </section>
  );
}

function QueryEndpoint({
  kind,
  label,
}: {
  kind: "application" | "database";
  label: string;
}) {
  return (
    <div className="query-race-endpoint" data-kind={kind}>
      {kind === "application" ? <ApplicationIcon /> : <DatabaseIcon />}
      <span>{label}</span>
    </div>
  );
}

function ApplicationIcon() {
  return (
    <svg
      className="query-race-endpoint-icon"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3.75" y="5.75" width="24.5" height="18.5" rx="2.25" />
      <path d="M4 10.25h24M11.5 27.25h9M16 24.5v2.75" />
      <circle cx="7.25" cy="8" r=".75" fill="currentColor" stroke="none" />
      <circle cx="10.25" cy="8" r=".75" fill="currentColor" stroke="none" />
      <path d="m11.5 15 2.25 2-2.25 2M16 19h4.5" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg
      className="query-race-endpoint-icon"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="16" cy="7.5" rx="10.5" ry="4" />
      <path d="M5.5 7.5v8c0 2.2 4.7 4 10.5 4s10.5-1.8 10.5-4v-8" />
      <path d="M5.5 15.5v8c0 2.2 4.7 4 10.5 4s10.5-1.8 10.5-4v-8" />
    </svg>
  );
}

function ComparisonMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
