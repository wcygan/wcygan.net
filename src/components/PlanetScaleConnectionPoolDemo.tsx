import { useCallback, useEffect, useState } from "react";
import {
  derivePoolSimulationSnapshot,
  INITIAL_POOL_SNAPSHOT,
  POOL_SIZE,
  SIMULATION_DURATION_MS,
  type PoolSimulationSnapshot,
} from "~/demos/connection-pool/model";
const PS_COLORS = {
  accent: "#F35815",
  blue: "#0E73CC",
  green: "#27B648",
  yellow: "#F2B600",
  red: "#FF455D",
  connector: "#818181",
  fg: "var(--diagram-fg, #FAFAFA)",
  bg: "var(--diagram-bg, #111111)",
};

const VIEWBOX_W = 1000;
const VIEWBOX_H = 680;

export function PlanetScaleConnectionPoolDemo() {
  const { replay, snapshot } = usePlanetScalePoolPlayback();

  return (
    <figure
      className="ps-diagram-workbench"
      data-graphic-frame="workbench"
      data-graphic-key="ps-connection-pooling"
      data-graphic-kind="svg"
      aria-labelledby="ps-conn-pool-title"
      aria-describedby="ps-conn-pool-description ps-conn-pool-caption"
    >
      <header className="ps-diagram-header">
        <div>
          <p className="ps-diagram-title" id="ps-conn-pool-title">
            MySQL Connection Pool Architecture
          </p>
          <p className="ps-diagram-subtitle" id="ps-conn-pool-description">
            Four pre-allocated TCP sockets multiplexing concurrent transactions
          </p>
        </div>
        <button
          type="button"
          className="ps-diagram-replay-btn"
          onClick={replay}
          aria-label="Replay PlanetScale connection pool animation"
        >
          <svg
            className="ps-replay-icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          REPLAY
        </button>
      </header>

      {/* PlanetScale Stage with authentic brand diagram SVG */}
      <div className="ps-diagram-stage" data-graphic-stage="flush">
        <svg
          className="brand-diagram-svg"
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-hidden="true"
        >
          <defs>
            {/* Defs for connection progress fill clipping */}
            {snapshot.connections.map((c) => (
              <clipPath key={`clip-conn-${c.id}`} id={`ps-conn-clip-${c.id}`}>
                <rect
                  x="340"
                  y={170 + (c.id - 1) * 110}
                  width="320"
                  height="86"
                  rx="6"
                />
              </clipPath>
            ))}
          </defs>

          {/* Background Grid Lines (Engineered Blueprint Style) */}
          <line
            x1="20"
            y1="64"
            x2="980"
            y2="64"
            stroke="var(--diagram-connector, #818181)"
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.35"
          />
          <line
            x1="20"
            y1="610"
            x2="980"
            y2="610"
            stroke="var(--diagram-connector, #818181)"
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.35"
          />

          {/* TOP METRICS HUD - Pure PlanetScale JetBrains Mono Uppercase */}
          <g className="ps-hud-group">
            <text x="30" y="38" className="ps-hud-label">
              CAPACITY
            </text>
            <text x="30" y="56" className="ps-hud-val">
              {POOL_SIZE} CONNS
            </text>

            <text x="240" y="38" className="ps-hud-label">
              ACTIVE / BUSY
            </text>
            <text
              x="240"
              y="56"
              className="ps-hud-val"
              fill={
                snapshot.metrics.activeConnections > 0
                  ? PS_COLORS.green
                  : "var(--diagram-fg)"
              }
            >
              {snapshot.metrics.activeConnections} / {POOL_SIZE}
            </text>

            <text x="470" y="38" className="ps-hud-label">
              REQUEST QUEUE
            </text>
            <text
              x="470"
              y="56"
              className="ps-hud-val"
              fill={
                snapshot.metrics.waitingRequests > 0
                  ? PS_COLORS.yellow
                  : "var(--diagram-fg)"
              }
            >
              {snapshot.metrics.waitingRequests} WAITING
            </text>

            <text x="730" y="38" className="ps-hud-label">
              QUERIES COMPLETED
            </text>
            <text x="730" y="56" className="ps-hud-val">
              {snapshot.metrics.completedRequests} / 7
            </text>
          </g>

          {/* COLUMN HEADERS */}
          <text x="30" y="102" className="ps-col-title">
            APPLICATION INGRESS
          </text>
          <text x="340" y="102" className="ps-col-title">
            CONNECTION POOL (TCP SLOTS)
          </text>
          <text x="760" y="102" className="ps-col-title">
            MYSQL SERVER 8.0
          </text>

          {/* LEFT: Application Request Queue */}
          <g className="ps-requests-column">
            {/* Ingress container box */}
            <rect
              x="25"
              y="120"
              width="240"
              height="470"
              rx="8"
              fill="var(--diagram-fg)"
              fillOpacity="0.03"
              stroke="var(--diagram-connector, #818181)"
              strokeWidth="1.5"
            />
            <text x="40" y="146" className="ps-box-header">
              CONCURRENT INCOMING
            </text>

            {/* List of 7 requests */}
            {snapshot.requests.slice(0, 6).map((req, i) => {
              const yPos = 165 + i * 68;
              let statusFill = "var(--diagram-connector, #818181)";
              let statusText = "WAITING";
              let statusColor = "var(--diagram-connector, #818181)";

              if (req.status === "executing") {
                statusFill = PS_COLORS.green;
                statusText = `CONN #${req.connectionId}`;
                statusColor = PS_COLORS.green;
              } else if (req.status === "completed") {
                statusFill = PS_COLORS.blue;
                statusText = "DONE";
                statusColor = PS_COLORS.blue;
              } else if (req.status === "queued") {
                statusFill = PS_COLORS.yellow;
                statusText = "QUEUED";
                statusColor = PS_COLORS.yellow;
              }

              return (
                <g key={req.id} className="ps-req-item">
                  <rect
                    x="37"
                    y={yPos}
                    width="216"
                    height="56"
                    rx="6"
                    fill={statusFill}
                    fillOpacity={req.status === "executing" ? "0.15" : "0.06"}
                    stroke={statusFill}
                    strokeWidth={req.status === "executing" ? "2" : "1"}
                  />
                  {/* Status dot */}
                  <circle cx="52" cy={yPos + 18} r="4" fill={statusColor} />
                  <text
                    x="64"
                    y={yPos + 22}
                    className="ps-req-id"
                    fill="var(--diagram-fg)"
                  >
                    {req.label}
                  </text>
                  <text
                    x="240"
                    y={yPos + 22}
                    className="ps-req-tag"
                    textAnchor="end"
                    fill={statusColor}
                  >
                    {statusText}
                  </text>
                  <text
                    x="48"
                    y={yPos + 44}
                    className="ps-req-sql"
                    fill="var(--diagram-fg)"
                    fillOpacity="0.7"
                  >
                    {formatSqlCompact(req.query)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* MIDDLE: 4 Reusable Connection Slots */}
          <g className="ps-pool-column">
            {/* Main Pool Frame */}
            <rect
              x="320"
              y="120"
              width="360"
              height="470"
              rx="8"
              fill="var(--diagram-fg)"
              fillOpacity="0.04"
              stroke={
                snapshot.metrics.activeConnections > 0
                  ? PS_COLORS.accent
                  : "var(--diagram-connector, #818181)"
              }
              strokeWidth="2"
            />
            <text x="340" y="146" className="ps-box-header">
              REUSABLE PRE-WARMED SOCKETS
            </text>

            {snapshot.connections.map((conn) => {
              const y = 170 + (conn.id - 1) * 110;
              const isBusy =
                conn.state === "active" || conn.state === "returning";
              const strokeCol = isBusy
                ? conn.state === "returning"
                  ? PS_COLORS.blue
                  : PS_COLORS.green
                : "var(--diagram-connector, #818181)";
              const stateLabel = isBusy
                ? conn.state === "returning"
                  ? "RETURNING"
                  : "ACTIVE"
                : "IDLE";

              return (
                <g key={conn.id} className="ps-conn-slot">
                  {/* Connector elbow line from request if active */}
                  {isBusy && (
                    <path
                      d={`M 253 ${195 + ((conn.activeRequestId || 1) - 1) * 68} L 300 ${195 + ((conn.activeRequestId || 1) - 1) * 68} L 300 ${y + 43} L 340 ${y + 43}`}
                      fill="none"
                      stroke={PS_COLORS.accent}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                  )}

                  {/* Slot base rect */}
                  <rect
                    x="340"
                    y={y}
                    width="320"
                    height="86"
                    rx="6"
                    fill="var(--diagram-fg)"
                    fillOpacity="0.05"
                    stroke={strokeCol}
                    strokeWidth="1.5"
                  />

                  {/* Animated Progress Fill clipped inside slot */}
                  {isBusy && (
                    <rect
                      x="340"
                      y={y}
                      width={320 * conn.progress}
                      height="86"
                      fill={
                        conn.state === "returning"
                          ? PS_COLORS.blue
                          : PS_COLORS.green
                      }
                      fillOpacity="0.22"
                      clipPath={`url(#ps-conn-clip-${conn.id})`}
                    />
                  )}

                  {/* Slot header */}
                  <circle cx="360" cy={y + 24} r="5" fill={strokeCol} />
                  <text
                    x="376"
                    y={y + 28}
                    className="ps-slot-title"
                    fill="var(--diagram-fg)"
                  >
                    CONNECTION #{conn.id}
                  </text>
                  <text
                    x="644"
                    y={y + 28}
                    className="ps-slot-status"
                    textAnchor="end"
                    fill={strokeCol}
                  >
                    {stateLabel}
                  </text>

                  {/* Query info / progress */}
                  {isBusy && conn.query ? (
                    <>
                      <text
                        x="360"
                        y={y + 54}
                        className="ps-slot-query"
                        fill="var(--diagram-fg)"
                      >
                        {formatSqlCompact(conn.query)}
                      </text>
                      {/* Sub-bar progress indicator */}
                      <rect
                        x="360"
                        y={y + 68}
                        width="280"
                        height="4"
                        rx="2"
                        fill="var(--diagram-connector, #818181)"
                        fillOpacity="0.3"
                      />
                      <rect
                        x="360"
                        y={y + 68}
                        width={280 * conn.progress}
                        height="4"
                        rx="2"
                        fill={
                          conn.state === "returning"
                            ? PS_COLORS.blue
                            : PS_COLORS.green
                        }
                      />
                    </>
                  ) : (
                    <text
                      x="360"
                      y={y + 56}
                      className="ps-slot-idle"
                      fill="var(--diagram-connector, #818181)"
                    >
                      READY TO SERVE (0ms HANDSHAKE)
                    </text>
                  )}

                  {/* Wire right to MySQL */}
                  <line
                    x1="660"
                    y1={y + 43}
                    x2="745"
                    y2={y + 43}
                    stroke={
                      isBusy
                        ? PS_COLORS.accent
                        : "var(--diagram-connector, #818181)"
                    }
                    strokeWidth="2"
                    strokeDasharray={isBusy ? undefined : "5 5"}
                    strokeOpacity={isBusy ? 1 : 0.4}
                  />
                </g>
              );
            })}
          </g>

          {/* RIGHT: MySQL Instance Endpoint */}
          <g className="ps-mysql-column">
            <rect
              x="745"
              y="120"
              width="230"
              height="470"
              rx="8"
              fill="var(--diagram-fg)"
              fillOpacity="0.03"
              stroke="var(--diagram-connector, #818181)"
              strokeWidth="1.5"
            />
            <text x="765" y="146" className="ps-box-header">
              ENGINE & THREADS
            </text>

            {/* MySQL Server Cylinder / DB Graphic */}
            <g transform="translate(765, 175)">
              <rect
                x="0"
                y="0"
                width="190"
                height="80"
                rx="6"
                fill="var(--diagram-fg)"
                fillOpacity="0.05"
                stroke={PS_COLORS.accent}
                strokeWidth="1.5"
              />
              <text
                x="14"
                y="28"
                className="ps-db-title"
                fill="var(--diagram-fg)"
              >
                MYSQLD (PORT 3306)
              </text>
              <text x="14" y="52" className="ps-db-sub" fill={PS_COLORS.green}>
                ● 4 ESTABLISHED THREADS
              </text>
              <text
                x="14"
                y="68"
                className="ps-db-sub"
                fill="var(--diagram-connector, #818181)"
              >
                MAX POOL CONCURRENCY
              </text>
            </g>

            {/* Connection Reuse Stats Callout */}
            <g transform="translate(765, 280)">
              <rect
                x="0"
                y="0"
                width="190"
                height="130"
                rx="6"
                fill="var(--diagram-fg)"
                fillOpacity="0.04"
                stroke="var(--diagram-connector, #818181)"
                strokeWidth="1"
              />
              <text x="14" y="24" className="ps-hud-label">
                ZERO HANDSHAKE OVERHEAD
              </text>
              <text
                x="14"
                y="48"
                className="ps-stat-lead"
                fill={PS_COLORS.accent}
              >
                100% REUSED
              </text>
              <text
                x="14"
                y="70"
                className="ps-stat-desc"
                fill="var(--diagram-fg)"
              >
                No TCP 3-way syn/ack
              </text>
              <text
                x="14"
                y="88"
                className="ps-stat-desc"
                fill="var(--diagram-fg)"
              >
                No TLS cert exchange
              </text>
              <text
                x="14"
                y="106"
                className="ps-stat-desc"
                fill="var(--diagram-fg)"
              >
                No auth negotiation
              </text>
            </g>

            {/* Throughput meter */}
            <g transform="translate(765, 435)">
              <rect
                x="0"
                y="0"
                width="190"
                height="130"
                rx="6"
                fill="var(--diagram-fg)"
                fillOpacity="0.04"
                stroke="var(--diagram-connector, #818181)"
                strokeWidth="1"
              />
              <text x="14" y="24" className="ps-hud-label">
                QUERY EXECUTION TIME
              </text>
              <text
                x="14"
                y="52"
                className="ps-stat-lead"
                fill={PS_COLORS.blue}
              >
                ~ 2.5ms / QRY
              </text>
              <text
                x="14"
                y="76"
                className="ps-stat-desc"
                fill="var(--diagram-fg)"
              >
                Versus ~45ms without
              </text>
              <text
                x="14"
                y="94"
                className="ps-stat-desc"
                fill="var(--diagram-fg)"
              >
                persistent pool
              </text>
              <text
                x="14"
                y="112"
                className="ps-stat-desc"
                fill={PS_COLORS.green}
              >
                18× LATENCY REDUCTION
              </text>
            </g>
          </g>

          {/* BOTTOM BANNER: Takeaway */}
          <g transform="translate(25, 625)">
            <text
              x="0"
              y="22"
              className="ps-bottom-summary"
              fill="var(--diagram-fg)"
            >
              POOLED ARCHITECTURE: Incoming web requests borrow from 4
              pre-warmed sockets. Sockets return immediately to pool.
            </text>
          </g>
        </svg>
      </div>

      <figcaption className="ps-diagram-caption" id="ps-conn-pool-caption">
        <strong>PlanetScale Animation Design System:</strong> Clean SVG
        geometry, JetBrains Mono uppercase typography, live connection clipping
        progress bars, and high-visibility status tokens (
        <span style={{ color: PS_COLORS.accent }}>accent</span>,{" "}
        <span style={{ color: PS_COLORS.green }}>active</span>,{" "}
        <span style={{ color: PS_COLORS.yellow }}>queued</span>, and{" "}
        <span style={{ color: PS_COLORS.blue }}>returning</span>).
      </figcaption>
    </figure>
  );
}

function formatSqlCompact(sql: string): string {
  if (sql.length <= 28) return sql;
  return sql.slice(0, 26) + "…";
}

function usePlanetScalePoolPlayback() {
  const [snapshot, setSnapshot] = useState<PoolSimulationSnapshot>(
    INITIAL_POOL_SNAPSHOT,
  );
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
