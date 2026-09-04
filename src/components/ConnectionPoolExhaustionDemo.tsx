import { useCallback, useEffect, useState } from "react";
import {
  deriveExhaustionSnapshot,
  POOL_SIZE,
  type PoolSimulationSnapshot,
  ROUND_TRIP,
  SIMULATION_DURATION_MS,
  SLOW_QUERY,
} from "~/demos/connection-pool-exhaustion/model";

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

// Request column geometry
const REQ_EDGE_X = 253; // right edge of the request boxes
const REQ_ROW_TOP = 158;
const REQ_ROW_PITCH = 43;
const REQ_ROW_H = 38;
const REQ_ROW_CY = (i: number) =>
  REQ_ROW_TOP + i * REQ_ROW_PITCH + REQ_ROW_H / 2;
const POOL_X = 340;
const POOL_W = 320;
const POOL_EDGE_X = POOL_X + POOL_W; // 660
const MYSQL_X = 745;
const SLOT_TOP = 160;
const SLOT_BOTTOM = 570;

function slotMetrics(poolSize: number) {
  const slotH = Math.round(
    (SLOT_BOTTOM - SLOT_TOP - (poolSize - 1) * 10) / poolSize,
  );
  const pitch = (SLOT_BOTTOM - SLOT_TOP - slotH) / Math.max(1, poolSize - 1);
  return { slotH, slotY: (index: number) => SLOT_TOP + index * pitch };
}

// PlanetScale multi-point elbow routing (drawConnector pattern, midPoint 0.62)
const ELBOW_MID = REQ_EDGE_X + (POOL_X - REQ_EDGE_X) * 0.62;

/** Point at fraction t (0..1) along the 3-segment elbow path. */
function elbowPoint(t: number, startY: number, endY: number, endX: number) {
  const seg1 = Math.abs(ELBOW_MID - REQ_EDGE_X);
  const seg2 = Math.abs(endY - startY);
  const seg3 = Math.abs(endX - ELBOW_MID);
  const total = seg1 + seg2 + seg3;
  let d = Math.max(0, Math.min(1, t)) * total;
  if (d <= seg1) return { x: REQ_EDGE_X + d, y: startY };
  d -= seg1;
  if (d <= seg2) {
    return { x: ELBOW_MID, y: startY + Math.sign(endY - startY || 1) * d };
  }
  d -= seg2;
  return { x: ELBOW_MID + d, y: endY };
}

export function ConnectionPoolExhaustionDemo() {
  const { replay, snapshot } = useExhaustionPlayback();

  const { slotH, slotY } = slotMetrics(POOL_SIZE);

  return (
    <figure
      className="ps-diagram-workbench"
      data-graphic-frame="workbench"
      data-graphic-key="ps-connection-pool-exhaustion"
      data-graphic-kind="svg"
      aria-labelledby="ps-exhaustion-title"
      aria-describedby="ps-exhaustion-description ps-exhaustion-caption"
    >
      <header className="ps-diagram-header">
        <div>
          <p className="ps-diagram-title" id="ps-exhaustion-title">
            Connection Pool Exhaustion
          </p>
          <p className="ps-diagram-subtitle" id="ps-exhaustion-description">
            Every socket ends up running the same 30s full table scan
          </p>
        </div>
        <button
          type="button"
          className="ps-diagram-replay-btn"
          onClick={replay}
          aria-label="Replay connection pool exhaustion animation"
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

      <div className="ps-diagram-stage" data-graphic-stage="flush">
        <svg
          className="brand-diagram-svg"
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-hidden="true"
        >
          <defs>
            {snapshot.connections.map((c, index) => (
              <clipPath key={`clip-conn-${c.id}`} id={`ps-exh-clip-${c.id}`}>
                <rect
                  x={POOL_X}
                  y={slotY(index)}
                  width={POOL_W}
                  height={slotH}
                  rx="6"
                />
              </clipPath>
            ))}
          </defs>

          {/* Background Grid Lines */}
          <line
            x1="20"
            y1="76"
            x2="980"
            y2="76"
            stroke={PS_COLORS.connector}
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.35"
          />
          <line
            x1="20"
            y1="610"
            x2="980"
            y2="610"
            stroke={PS_COLORS.connector}
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.35"
          />

          {/* TOP METRICS HUD */}
          <g className="ps-hud-group">
            <text x="30" y="38" className="ps-hud-label">
              CAPACITY
            </text>
            <text x="30" y="56" className="ps-hud-val">
              {POOL_SIZE} CONNS
            </text>

            <text x="200" y="38" className="ps-hud-label">
              BUSY
            </text>
            <text
              x="200"
              y="56"
              className="ps-hud-val"
              fill={
                snapshot.metrics.idleConnections === 0
                  ? PS_COLORS.red
                  : PS_COLORS.green
              }
            >
              {snapshot.metrics.activeConnections} / {POOL_SIZE}
            </text>

            <text x="360" y="38" className="ps-hud-label">
              QUEUE DEPTH
            </text>
            <text
              x="360"
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

            <text x="545" y="38" className="ps-hud-label">
              DROPPED
            </text>
            <text
              x="545"
              y="56"
              className="ps-hud-val"
              fill={
                snapshot.metrics.droppedRequests > 0
                  ? PS_COLORS.red
                  : "var(--diagram-fg)"
              }
            >
              {snapshot.metrics.droppedRequests} TIMEOUT
            </text>

            <text x="760" y="38" className="ps-hud-label">
              COMPLETED
            </text>
            <text x="760" y="56" className="ps-hud-val">
              {snapshot.metrics.completedRequests}
            </text>
          </g>

          {/* COLUMN HEADERS */}
          <text x="30" y="102" className="ps-col-title">
            APPLICATION INGRESS
          </text>
          <text x={POOL_X} y="102" className="ps-col-title">
            CONNECTION POOL (TCP SLOTS)
          </text>
          <text x="760" y="102" className="ps-col-title">
            MYSQL SERVER 8.0
          </text>

          {/* LEFT: Application Request Queue */}
          <g className="ps-requests-column">
            <rect
              x="25"
              y="120"
              width="240"
              height="470"
              rx="8"
              fill="var(--diagram-fg)"
              fillOpacity="0.03"
              stroke={PS_COLORS.connector}
              strokeWidth="1.5"
            />
            <text x="40" y="146" className="ps-box-header">
              CONCURRENT INCOMING
            </text>

            {snapshot.requests.map((req, i) => {
              const yPos = REQ_ROW_TOP + i * REQ_ROW_PITCH;
              const cy = yPos + REQ_ROW_H / 2;
              let statusFill = PS_COLORS.connector;
              let statusText = "WAITING";
              let statusColor = PS_COLORS.connector;

              if (req.status === "executing") {
                statusFill = PS_COLORS.green;
                statusText = `CONN #${req.connectionId}`;
                statusColor = PS_COLORS.green;
              } else if (req.status === "completed") {
                statusFill = PS_COLORS.blue;
                statusText = "DONE";
                statusColor = PS_COLORS.blue;
              } else if (req.status === "dropped") {
                statusFill = PS_COLORS.red;
                statusText = "DROPPED";
                statusColor = PS_COLORS.red;
              } else {
                // Queued: live wait counter against the acquisition timeout.
                statusFill = PS_COLORS.yellow;
                statusColor = PS_COLORS.yellow;
                statusText = `WAITING ${(req.waitMs / 1000).toFixed(1)}s`;
              }

              return (
                <g key={req.id} className="ps-req-item">
                  <rect
                    x="37"
                    y={yPos}
                    width="216"
                    height={REQ_ROW_H}
                    rx="6"
                    fill={statusFill}
                    fillOpacity={req.status === "executing" ? "0.15" : "0.06"}
                    stroke={statusFill}
                    strokeWidth={
                      req.status === "dropped" || req.status === "executing"
                        ? "2"
                        : "1"
                    }
                    strokeDasharray={
                      req.status === "dropped" ? "5 4" : undefined
                    }
                  />
                  <circle cx="52" cy={yPos + 13} r="4" fill={statusColor} />
                  <text
                    x="64"
                    y={yPos + 16}
                    className="ps-req-id"
                    fill="var(--diagram-fg)"
                    fillOpacity={req.status === "dropped" ? 0.5 : 1}
                  >
                    {req.label}
                  </text>
                  <text
                    x="240"
                    y={yPos + 16}
                    className="ps-req-tag"
                    textAnchor="end"
                    fill={statusColor}
                  >
                    {statusText}
                  </text>
                  <text
                    x="48"
                    y={yPos + 31}
                    className="ps-req-sql"
                    fill="var(--diagram-fg)"
                    fillOpacity={req.status === "dropped" ? 0.35 : 0.7}
                  >
                    {formatSqlCompact(req.query)}
                  </text>

                  {/* Pulsing yellow dot while queued at the pool door */}
                  {req.status === "queued" && (
                    <circle
                      className="ps-queued-dot"
                      cx={REQ_EDGE_X + 8}
                      cy={cy}
                      r="4"
                      fill={PS_COLORS.yellow}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* MULTIPLEXING BUS: all in-flight requests share one trunk line */}
          {(() => {
            const links = snapshot.connections
              .map((conn, index) => ({
                conn,
                startCy: REQ_ROW_CY((conn.activeRequestId || 1) - 1),
                endY: slotY(index) + slotH / 2,
              }))
              .filter(
                (l) =>
                  l.conn.state === "active" || l.conn.state === "returning",
              );
            if (links.length === 0) return null;

            const ys = links.flatMap((l) => [l.startCy, l.endY]);
            const top = Math.min(...ys);
            const bottom = Math.max(...ys);
            const trunkColor = links.every((l) => l.conn.state === "returning")
              ? PS_COLORS.blue
              : PS_COLORS.green;

            return (
              <g className="ps-mux-bus">
                {bottom > top && (
                  <line
                    x1={ELBOW_MID}
                    y1={top}
                    x2={ELBOW_MID}
                    y2={bottom}
                    stroke={trunkColor}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                )}
                {links.map((l) => {
                  const color =
                    l.conn.state === "returning"
                      ? PS_COLORS.blue
                      : PS_COLORS.green;
                  return (
                    <g key={`mux-${l.conn.id}`}>
                      <path
                        d={`M ${REQ_EDGE_X} ${l.startCy} L ${ELBOW_MID} ${l.startCy}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                      <path
                        d={`M ${ELBOW_MID} ${l.endY} L ${POOL_X} ${l.endY}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })()}
          <g className="ps-pool-column">
            <rect
              x={POOL_X - 20}
              y="120"
              width="360"
              height="470"
              rx="8"
              fill="var(--diagram-fg)"
              fillOpacity="0.04"
              stroke={
                snapshot.metrics.idleConnections === 0
                  ? PS_COLORS.red
                  : PS_COLORS.connector
              }
              strokeWidth="2"
            />
            <text x={POOL_X + 20} y="146" className="ps-box-header">
              REUSABLE PRE-WARMED SOCKETS
            </text>

            {snapshot.connections.map((conn, index) => {
              const y = slotY(index);
              const isBusy =
                conn.state === "active" || conn.state === "returning";
              const strokeCol = isBusy
                ? conn.state === "returning"
                  ? PS_COLORS.blue
                  : PS_COLORS.green
                : PS_COLORS.connector;
              const stateLabel = isBusy
                ? conn.state === "returning"
                  ? "RETURNING"
                  : "ACTIVE"
                : "IDLE";
              const reqIndex = conn.activeRequestId
                ? conn.activeRequestId - 1
                : -1;
              const cy = y + slotH / 2;
              const startCy = reqIndex >= 0 ? REQ_ROW_CY(reqIndex) : cy;
              const p = conn.progress;
              let dot: { x: number; y: number; fill: string } | null = null;
              if (isBusy) {
                if (p <= ROUND_TRIP.acquireEnd) {
                  const pt = elbowPoint(
                    p / ROUND_TRIP.acquireEnd,
                    startCy,
                    cy,
                    POOL_X,
                  );
                  dot = { ...pt, fill: PS_COLORS.green };
                } else if (p <= ROUND_TRIP.sendEnd) {
                  const t =
                    (p - ROUND_TRIP.acquireEnd) /
                    (ROUND_TRIP.sendEnd - ROUND_TRIP.acquireEnd);
                  dot = {
                    x: POOL_EDGE_X + (MYSQL_X - POOL_EDGE_X) * t,
                    y: cy,
                    fill: PS_COLORS.green,
                  };
                } else if (p <= ROUND_TRIP.execEnd) {
                  dot = { x: MYSQL_X, y: cy, fill: PS_COLORS.green };
                } else if (p <= ROUND_TRIP.mysqlReturnEnd) {
                  const t =
                    (p - ROUND_TRIP.execEnd) /
                    (ROUND_TRIP.mysqlReturnEnd - ROUND_TRIP.execEnd);
                  dot = {
                    x: MYSQL_X - (MYSQL_X - POOL_EDGE_X) * t,
                    y: cy,
                    fill: PS_COLORS.blue,
                  };
                } else {
                  const pt = elbowPoint(
                    1 -
                      (p - ROUND_TRIP.mysqlReturnEnd) /
                        (1 - ROUND_TRIP.mysqlReturnEnd),
                    startCy,
                    cy,
                    POOL_X,
                  );
                  dot = { ...pt, fill: PS_COLORS.blue };
                }
              }

              // Scan holders: the slot's query matches the full table scan.
              const isSlowScan = isBusy && conn.query === SLOW_QUERY;

              return (
                <g key={conn.id} className="ps-conn-slot">
                  <rect
                    x={POOL_X}
                    y={y}
                    width={POOL_W}
                    height={slotH}
                    rx="6"
                    fill="var(--diagram-fg)"
                    fillOpacity="0.05"
                    stroke={isSlowScan ? PS_COLORS.red : strokeCol}
                    strokeWidth={isSlowScan ? "2.5" : "1.5"}
                  />

                  {isBusy && (
                    <rect
                      x={POOL_X}
                      y={y}
                      width={POOL_W * conn.progress}
                      height={slotH}
                      fill={
                        isSlowScan
                          ? PS_COLORS.red
                          : conn.state === "returning"
                            ? PS_COLORS.blue
                            : PS_COLORS.green
                      }
                      fillOpacity="0.22"
                      clipPath={`url(#ps-exh-clip-${conn.id})`}
                    />
                  )}

                  <circle
                    cx={POOL_X + 20}
                    cy={y + 24}
                    r="5"
                    fill={isSlowScan ? PS_COLORS.red : strokeCol}
                  />
                  <text
                    x={POOL_X + 36}
                    y={y + 28}
                    className="ps-slot-title"
                    fill="var(--diagram-fg)"
                  >
                    CONNECTION #{conn.id}
                  </text>
                  <text
                    x={POOL_X + POOL_W - 16}
                    y={y + 24}
                    className="ps-slot-status"
                    textAnchor="end"
                    fill={isSlowScan ? PS_COLORS.red : strokeCol}
                  >
                    {isSlowScan ? "HELD (FULL SCAN)" : stateLabel}
                  </text>

                  {isBusy && conn.query ? (
                    <text
                      x={POOL_X + 20}
                      y={y + slotH - 18}
                      className="ps-slot-query"
                      fill="var(--diagram-fg)"
                    >
                      {formatSqlCompact(conn.query)}
                    </text>
                  ) : (
                    slotH >= 60 && (
                      <text
                        x={POOL_X + 20}
                        y={y + 52}
                        className="ps-slot-idle"
                        fill={PS_COLORS.connector}
                      >
                        READY TO SERVE (0ms HANDSHAKE)
                      </text>
                    )
                  )}

                  <line
                    x1={POOL_EDGE_X}
                    y1={cy}
                    x2={MYSQL_X}
                    y2={cy}
                    stroke={isBusy ? PS_COLORS.accent : PS_COLORS.connector}
                    strokeWidth="2"
                    strokeDasharray={isBusy ? undefined : "5 5"}
                    strokeOpacity={isBusy ? 1 : 0.4}
                  />

                  {dot && (
                    <circle cx={dot.x} cy={dot.y} r="5" fill={dot.fill} />
                  )}
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
              stroke={PS_COLORS.connector}
              strokeWidth="1.5"
            />
            <text x="765" y="146" className="ps-box-header">
              ENGINE &amp; THREADS
            </text>

            <g transform="translate(765, 175)">
              <rect
                x="0"
                y="0"
                width="190"
                height="96"
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
              <text x="14" y="54" className="ps-db-sub" fill={PS_COLORS.green}>
                ● {POOL_SIZE} ESTABLISHED THREADS
              </text>
              <text x="14" y="76" className="ps-db-sub" fill={PS_COLORS.accent}>
                FULL SCAN: 30s+ QUERY TIME
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
              EXHAUSTION: All four sockets run the same unindexed scan for 30s+.
              Waiters time out and are dropped.
            </text>
          </g>
        </svg>
      </div>
    </figure>
  );
}

function formatSqlCompact(sql: string): string {
  if (sql.length <= 28) return sql;
  return sql.slice(0, 26) + "…";
}

function useExhaustionPlayback() {
  const [snapshot, setSnapshot] = useState<PoolSimulationSnapshot>(() =>
    deriveExhaustionSnapshot(0),
  );
  const [playbackId, setPlaybackId] = useState(0);

  const replay = useCallback(() => {
    setSnapshot(deriveExhaustionSnapshot(0));
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
      setSnapshot(deriveExhaustionSnapshot(1));
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const progress = Math.min(1, elapsedMs / SIMULATION_DURATION_MS);
      setSnapshot(deriveExhaustionSnapshot(progress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;
      setSnapshot(deriveExhaustionSnapshot(0));

      if (reducedMotion.matches) {
        renderSettled();
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      setSnapshot(deriveExhaustionSnapshot(0));
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
