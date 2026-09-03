import { useCallback, useEffect, useState } from "react";
import { DemoReplayButton } from "~/components/DemoReplayButton";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";
import {
  derivePoolSimulationSnapshot,
  INITIAL_POOL_SNAPSHOT,
  POOL_SIZE,
  SIMULATION_DURATION_MS,
  type ConnectionSnapshot,
  type PoolSimulationSnapshot,
} from "~/demos/connection-pool/model";

export function ConnectionPoolVisualization() {
  const { replay, snapshot } = usePoolSimulationPlayback();

  return (
    <figure
      className="conn-pool-workbench"
      data-graphic-frame="workbench"
      data-graphic-key="connection-pooling-demo"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="conn-pool-title"
      aria-describedby="conn-pool-description conn-pool-caption"
    >
      <header className="conn-pool-header">
        <div>
          <p className="article-graphic-title" id="conn-pool-title">
            MySQL Connection Pool Lifecycle
          </p>
          <p id="conn-pool-description">
            Four pre-warmed TCP connections service concurrent queries without
            handshake overhead
          </p>
        </div>
        <DemoReplayButton
          ariaLabel="Replay connection pool simulation"
          isComplete={snapshot.isComplete}
          onReplay={replay}
        />
      </header>

      <div className="conn-pool-stage" data-graphic-stage="flush">
        {/* Top Control & Telemetry Bar */}
        <div className="conn-pool-telemetry-bar" aria-hidden="true">
          <div className="conn-pool-kpi">
            <span className="conn-pool-kpi-label">POOL CAPACITY</span>
            <span className="conn-pool-kpi-val">{POOL_SIZE} CONNECTIONS</span>
          </div>
          <div className="conn-pool-kpi">
            <span className="conn-pool-kpi-label">ACTIVE / BUSY</span>
            <span
              className="conn-pool-kpi-val conn-pool-val-active"
              data-active={
                snapshot.metrics.activeConnections > 0 ? "true" : "false"
              }
            >
              {snapshot.metrics.activeConnections} / {POOL_SIZE}
            </span>
          </div>
          <div className="conn-pool-kpi">
            <span className="conn-pool-kpi-label">QUEUE WAITING</span>
            <span
              className="conn-pool-kpi-val conn-pool-val-queued"
              data-queued={
                snapshot.metrics.waitingRequests > 0 ? "true" : "false"
              }
            >
              {snapshot.metrics.waitingRequests}
            </span>
          </div>
          <div className="conn-pool-kpi">
            <span className="conn-pool-kpi-label">QUERIES SERVED</span>
            <span className="conn-pool-kpi-val">
              {snapshot.metrics.completedRequests} / 7
            </span>
          </div>
        </div>

        {/* Main Stage Grid: Client Ingress -> Pool (4 Slots) -> MySQL Wire -> MySQL Database */}
        <div className="conn-pool-main-layout" aria-hidden="true">
          {/* Section 1: Application Client & Request Queue */}
          <section className="conn-pool-col conn-pool-client-col">
            <div className="conn-pool-actor-header">
              <ApplicationWindowIcon />
              <div>
                <strong>App Server</strong>
                <span>Incoming query requests</span>
              </div>
            </div>

            <div className="conn-pool-request-queue">
              <span className="conn-pool-section-tag">
                REQUEST QUEUE ({snapshot.metrics.waitingRequests} WAITING)
              </span>
              <div className="conn-pool-queue-slots">
                {snapshot.requests.map((req) => (
                  <div
                    key={req.id}
                    className="conn-pool-queue-item"
                    data-status={req.status}
                  >
                    <div className="conn-pool-item-top">
                      <span className="conn-pool-req-badge">{req.label}</span>
                      <span className="conn-pool-req-status-label">
                        {req.status === "queued" && "WAITING FOR CONN"}
                        {req.status === "executing" &&
                          `BORROWED CONN #${req.connectionId}`}
                        {req.status === "completed" && "RELEASED / OK"}
                      </span>
                    </div>
                    <code className="conn-pool-query-code">{req.query}</code>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: Connection Pool Container (4 Connections) */}
          <section className="conn-pool-col conn-pool-slots-col">
            <div className="conn-pool-actor-header">
              <ConnectionPoolIcon />
              <div>
                <strong>Connection Pool</strong>
                <span>4 Reusable TCP sockets</span>
              </div>
            </div>

            <div className="conn-pool-slots-container">
              <span className="conn-pool-section-tag">
                PRE-ESTABLISHED POOL
              </span>
              <div className="conn-pool-slots-grid">
                {snapshot.connections.map((conn) => (
                  <ConnectionSlotCard key={conn.id} conn={conn} />
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: MySQL Database */}
          <section className="conn-pool-col conn-pool-db-col">
            <div className="conn-pool-actor-header">
              <DatabaseIcon className="conn-pool-db-icon" aria-hidden="true" />
              <div>
                <strong>MySQL 8.0</strong>
                <span>Single socket endpoint</span>
              </div>
            </div>

            <div className="conn-pool-db-status-box">
              <div className="conn-pool-db-meta">
                <span className="conn-pool-section-tag">SERVER THREADS</span>
                <div className="conn-pool-threads-indicator">
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const isBusy = idx < snapshot.metrics.activeConnections;
                    return (
                      <div
                        key={idx}
                        className="conn-pool-thread-pill"
                        data-busy={isBusy ? "true" : "false"}
                      >
                        <span className="conn-pool-thread-dot" />
                        <span>Thread #{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="conn-pool-db-savings">
                <span className="conn-pool-section-tag">AVOIDED OVERHEAD</span>
                <p className="conn-pool-savings-summary">
                  <strong>Zero TLS/TCP Handshakes</strong> incurred for
                  subsequent queries. Connections remain alive across request
                  lifecycles.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Quantified Summary Bar */}
        <div
          className="conn-pool-summary-banner"
          data-visible={snapshot.isComplete ? "true" : "false"}
          aria-hidden="true"
        >
          <div className="conn-pool-summary-metric">
            <span>Handshakes Saved</span>
            <strong>{snapshot.metrics.completedRequests} / 7 (100%)</strong>
          </div>
          <div className="conn-pool-summary-metric">
            <span>Peak Concurrent Sockets</span>
            <strong>4 (Capped by pool size)</strong>
          </div>
          <div className="conn-pool-summary-metric">
            <span>Mean Borrow Latency</span>
            <strong>&lt; 0.5ms (Pre-warmed)</strong>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Simulation complete. The application connection pool reused 4 established connections to execute 7 queries sequentially and concurrently without tearing down TCP sockets."
          : `Connection pool running. ${snapshot.metrics.activeConnections} active connections, ${snapshot.metrics.waitingRequests} requests queued.`}
      </p>

      <figcaption id="conn-pool-caption">
        A fixed pool of four persistent connections services concurrent client
        queries: when all four slots are busy, subsequent requests queue briefly
        rather than overwhelming MySQL with socket churn.
      </figcaption>
    </figure>
  );
}

function ConnectionSlotCard({ conn }: { conn: ConnectionSnapshot }) {
  const isBusy = conn.state === "active" || conn.state === "returning";
  return (
    <div className="conn-pool-slot-card" data-state={conn.state}>
      <div className="conn-pool-slot-top">
        <div className="conn-pool-slot-id">
          <span className="conn-pool-slot-light" />
          <span>CONN #{conn.id}</span>
        </div>
        <span className="conn-pool-slot-badge">{conn.state.toUpperCase()}</span>
      </div>

      {isBusy && conn.query ? (
        <div className="conn-pool-slot-body">
          <div className="conn-pool-slot-query">
            <span className="conn-pool-slot-req-id">
              Req #{conn.activeRequestId}
            </span>
            <code className="conn-pool-slot-query-text">{conn.query}</code>
          </div>
          <div className="conn-pool-slot-progress-rail">
            <div
              className="conn-pool-slot-progress-fill"
              style={{ inlineSize: `${Math.round(conn.progress * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="conn-pool-slot-body conn-pool-slot-idle">
          <span>Awaiting query borrow...</span>
        </div>
      )}
    </div>
  );
}

function usePoolSimulationPlayback(): {
  replay: () => void;
  snapshot: PoolSimulationSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_POOL_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);

  const replay = useCallback(() => {
    setSnapshot(INITIAL_POOL_SNAPSHOT);
    setPlaybackId((c) => c + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = 0;
    let previousFrame: number | undefined;

    const renderSettled = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;
      setSnapshot(derivePoolSimulationSnapshot(1));
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const progress = Math.min(1, elapsedMs / SIMULATION_DURATION_MS);
      setSnapshot(derivePoolSimulationSnapshot(progress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;

      if (reducedMotion.matches) {
        renderSettled();
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      setSnapshot(INITIAL_POOL_SNAPSHOT);
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

function ApplicationWindowIcon() {
  return (
    <svg
      className="conn-pool-icon"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="5.5" width="25" height="21" rx="2.5" />
      <path d="M3.5 11h25M9 8h.01M13 8h.01M17 8h.01" />
    </svg>
  );
}

function ConnectionPoolIcon() {
  return (
    <svg
      className="conn-pool-icon"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="24" height="24" rx="4" />
      <rect x="8" y="8" width="6" height="6" rx="1.5" />
      <rect x="18" y="8" width="6" height="6" rx="1.5" />
      <rect x="8" y="18" width="6" height="6" rx="1.5" />
      <rect x="18" y="18" width="6" height="6" rx="1.5" />
    </svg>
  );
}
