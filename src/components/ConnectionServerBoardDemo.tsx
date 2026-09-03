import { useMemo, useState } from "react";

/**
 * Idea 2: the server board drowns while the pool stays healthy.
 *
 * Left: the application's connection pool — always green, always "healthy",
 * no matter how large. Right: what the MySQL server actually feels as the
 * pool grows — thread chips flip from RUNNING (green) to CONTEXT SWITCH
 * (yellow), lock-wait chips appear (red), and the memory bar climbs toward
 * the OOM line.
 *
 * Throughput shares the USL model from ConnectionScalingCurveDemo.
 */

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
const VIEWBOX_H = 620;

const CPU_CORES = 4;
const N_MIN = 1;
const N_MAX = 500;
const BAND_LO = CPU_CORES * 2; // 8
const BAND_HI = CPU_CORES * 10; // 40
const CHIP_DISPLAY_MAX = 56; // chips drawn; beyond this show "+N more"
const MEM_BUDGET_MB = 4096;
const MEM_PER_CONN_MB = 8; // worst-case sort/join/read buffers per connection

type Regime = "underutilized" | "sweet-spot" | "contended" | "collapse";

const REGIME_LABEL: Record<Regime, string> = {
  underutilized: "IDLE CORES",
  "sweet-spot": "KEEPING UP",
  contended: "CONTEXT-SWITCH STORM",
  collapse: "DROWNING",
};

function regimeFor(connections: number): Regime {
  if (connections < BAND_LO) return "underutilized";
  if (connections <= BAND_HI) return "sweet-spot";
  if (connections <= 150) return "contended";
  return "collapse";
}

function regimeColor(regime: Regime): string {
  switch (regime) {
    case "sweet-spot":
      return PS_COLORS.green;
    case "contended":
      return PS_COLORS.yellow;
    case "collapse":
      return PS_COLORS.red;
    default:
      return PS_COLORS.blue;
  }
}

function throughputQps(connections: number): number {
  const n = Math.max(1, connections);
  const x1 = 1000 / 25; // 25 ms uncontended service time
  const alpha = 0.08;
  const beta = 0.0016;
  return (x1 * n) / (1 + alpha * (n - 1) + beta * n * (n - 1));
}

type ChipState = "running" | "switching" | "lockwait";

function chipState(index: number, regime: Regime): ChipState {
  if (index < CPU_CORES && regime !== "collapse") return "running";
  if (regime === "collapse" && index % 6 === 5) return "lockwait";
  return "switching";
}

const CHIP_COLOR: Record<ChipState, string> = {
  running: PS_COLORS.green,
  switching: PS_COLORS.yellow,
  lockwait: PS_COLORS.red,
};

const CHIP_LABEL: Record<ChipState, string> = {
  running: "RUN",
  switching: "CTX",
  lockwait: "LCK",
};

// Thread chip grid geometry
const GRID_X = 610;
const GRID_Y = 210;
const CHIP_W = 42;
const CHIP_H = 22;
const CHIP_GAP_X = 8;
const CHIP_GAP_Y = 8;
const GRID_COLS = 7;

// Geometry: left (pool) column and right (server) column
const POOL_X = 40;
const SERVER_X = 580;
const COL_W = 380;
const PANEL_Y = 90;

export function ConnectionServerBoardDemo() {
  const [connections, setConnections] = useState(24);

  const regime = regimeFor(connections);
  const color = regimeColor(regime);
  const qps = useMemo(() => throughputQps(connections), [connections]);

  const chipsDrawn = Math.min(connections, CHIP_DISPLAY_MAX);
  const extra = connections - chipsDrawn;

  const memUsed = connections * MEM_PER_CONN_MB;
  const memPct = Math.min(1, memUsed / MEM_BUDGET_MB);
  const memColor =
    memPct < 0.4
      ? PS_COLORS.green
      : memPct < 0.75
        ? PS_COLORS.yellow
        : PS_COLORS.red;

  const barX = SERVER_X + 30;
  const barW = COL_W - 60;
  const barY = 520;

  return (
    <div className="ps-diagram-workbench ps-server-board">
      <div className="ps-diagram-header">
        <div>
          <p className="ps-diagram-title">What the server feels</p>
          <p className="ps-diagram-subtitle">
            The pool always looks healthy — drag past the sweet spot and watch
            the MySQL board drown
          </p>
        </div>
      </div>

      <div className="ps-diagram-stage">
        <svg
          className="brand-diagram-svg"
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          role="img"
          aria-label={`Server board at ${connections} pooled connections: thread chips switch from running to context switching, memory use rises, and throughput ${regime === "collapse" ? "collapses" : "holds"}.`}
        >
          {/* ---- Left column: application + pool (always healthy) ---- */}
          <text
            x={POOL_X}
            y={64}
            fill={PS_COLORS.fg}
            fontSize={13}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            APPLICATION · CONNECTION POOL
          </text>
          <rect
            x={POOL_X}
            y={PANEL_Y}
            width={COL_W}
            height={470}
            rx={8}
            fill="none"
            stroke={PS_COLORS.green}
            strokeOpacity={0.6}
          />
          <text
            x={POOL_X + 20}
            y={PANEL_Y + 34}
            fill={PS_COLORS.green}
            fontSize={12}
            fontWeight={700}
            letterSpacing="0.1em"
          >
            POOL HEALTHY · {connections} SOCKETS
          </text>

          {Array.from({ length: Math.min(6, connections) }, (_, i) => (
            <g key={i}>
              <rect
                x={POOL_X + 20}
                y={PANEL_Y + 56 + i * 44}
                width={COL_W - 40}
                height={34}
                rx={5}
                fill={PS_COLORS.green}
                fillOpacity={0.12}
                stroke={PS_COLORS.green}
                strokeOpacity={0.5}
              />
              <text
                x={POOL_X + 34}
                y={PANEL_Y + 78 + i * 44}
                fill={PS_COLORS.fg}
                fontSize={11}
                fontFamily="'JetBrains Mono', monospace"
              >
                CONN #{i + 1}
              </text>
              <text
                x={POOL_X + COL_W - 34}
                y={PANEL_Y + 78 + i * 44}
                textAnchor="end"
                fill={PS_COLORS.green}
                fontSize={10}
                fontWeight={700}
                letterSpacing="0.08em"
              >
                ACTIVE
              </text>
            </g>
          ))}
          {connections > 6 ? (
            <text
              x={POOL_X + COL_W / 2}
              y={PANEL_Y + 56 + 6 * 44 + 22}
              textAnchor="middle"
              fill={PS_COLORS.connector}
              fontSize={11}
              fontFamily="'JetBrains Mono', monospace"
            >
              +{connections - 6} more sockets — all warm, all reusable
            </text>
          ) : null}

          {/* ---- Right column: MySQL server board ---- */}
          <text
            x={SERVER_X}
            y={64}
            fill={PS_COLORS.fg}
            fontSize={13}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            MYSQL SERVER · 4 CORES
          </text>
          <rect
            x={SERVER_X}
            y={PANEL_Y}
            width={COL_W}
            height={470}
            rx={8}
            fill="none"
            stroke={color}
            strokeOpacity={0.8}
          />

          {/* CPU cores */}
          {Array.from({ length: CPU_CORES }, (_, i) => {
            const busy = connections > i;
            const coreColor =
              regime === "collapse"
                ? PS_COLORS.red
                : busy
                  ? PS_COLORS.green
                  : PS_COLORS.connector;
            return (
              <g key={i}>
                <rect
                  x={SERVER_X + 20 + i * 90}
                  y={PANEL_Y + 18}
                  width={80}
                  height={44}
                  rx={5}
                  fill="none"
                  stroke={coreColor}
                />
                <text
                  x={SERVER_X + 60 + i * 90}
                  y={PANEL_Y + 38}
                  textAnchor="middle"
                  fill={PS_COLORS.connector}
                  fontSize={10}
                >
                  CORE {i}
                </text>
                <text
                  x={SERVER_X + 60 + i * 90}
                  y={PANEL_Y + 52}
                  textAnchor="middle"
                  fill={coreColor}
                  fontSize={9}
                  fontWeight={700}
                  letterSpacing="0.06em"
                >
                  {busy ? "RUNNING" : "IDLE"}
                </text>
              </g>
            );
          })}

          {/* Thread chips */}
          <text
            x={SERVER_X + 20}
            y={GRID_Y - 12}
            fill={PS_COLORS.connector}
            fontSize={11}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            CONNECTION THREADS ({connections})
          </text>
          {Array.from({ length: chipsDrawn }, (_, i) => {
            const state = chipState(i, regime);
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            return (
              <g key={i}>
                <rect
                  x={GRID_X + col * (CHIP_W + CHIP_GAP_X)}
                  y={GRID_Y + row * (CHIP_H + CHIP_GAP_Y)}
                  width={CHIP_W}
                  height={CHIP_H}
                  rx={3}
                  fill={CHIP_COLOR[state]}
                  fillOpacity={state === "running" ? 0.28 : 0.16}
                  stroke={CHIP_COLOR[state]}
                  strokeOpacity={0.8}
                />
                <text
                  x={GRID_X + col * (CHIP_W + CHIP_GAP_X) + CHIP_W / 2}
                  y={GRID_Y + row * (CHIP_H + CHIP_GAP_Y) + 15}
                  textAnchor="middle"
                  fill={CHIP_COLOR[state]}
                  fontSize={9}
                  fontWeight={700}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {CHIP_LABEL[state]}
                </text>
              </g>
            );
          })}
          {extra > 0 ? (
            <text
              x={GRID_X + 6 * (CHIP_W + CHIP_GAP_X) + CHIP_W}
              y={
                GRID_Y +
                (Math.min(chipsDrawn, 56) / GRID_COLS) * (CHIP_H + CHIP_GAP_Y) +
                16
              }
              textAnchor="end"
              fill={PS_COLORS.connector}
              fontSize={10}
              fontFamily="'JetBrains Mono', monospace"
            >
              +{extra} more
            </text>
          ) : null}

          {/* Legend */}
          <g
            fontSize={9}
            fontWeight={700}
            fontFamily="'JetBrains Mono', monospace"
          >
            <rect
              x={SERVER_X + 20}
              y={478}
              width={10}
              height={10}
              fill={PS_COLORS.green}
              fillOpacity={0.3}
              stroke={PS_COLORS.green}
            />
            <text x={SERVER_X + 38} y={487} fill={PS_COLORS.connector}>
              RUN
            </text>
            <rect
              x={SERVER_X + 110}
              y={478}
              width={10}
              height={10}
              fill={PS_COLORS.yellow}
              fillOpacity={0.3}
              stroke={PS_COLORS.yellow}
            />
            <text x={SERVER_X + 128} y={487} fill={PS_COLORS.connector}>
              CTX SWITCH
            </text>
            <rect
              x={SERVER_X + 240}
              y={478}
              width={10}
              height={10}
              fill={PS_COLORS.red}
              fillOpacity={0.3}
              stroke={PS_COLORS.red}
            />
            <text x={SERVER_X + 258} y={487} fill={PS_COLORS.connector}>
              LOCK WAIT
            </text>
          </g>

          {/* Memory bar */}
          <text
            x={SERVER_X + 20}
            y={barY - 10}
            fill={PS_COLORS.connector}
            fontSize={11}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            SERVER MEMORY · {memUsed.toLocaleString()} /{" "}
            {MEM_BUDGET_MB.toLocaleString()} MB
          </text>
          <rect
            x={barX}
            y={barY}
            width={barW}
            height={16}
            rx={4}
            fill="none"
            stroke={PS_COLORS.connector}
          />
          <rect
            x={barX}
            y={barY}
            width={Math.max(2, barW * memPct)}
            height={16}
            rx={4}
            fill={memColor}
            fillOpacity={0.55}
          />
          <text
            x={barX + barW}
            y={barY + 30}
            textAnchor="end"
            fill={PS_COLORS.connector}
            fontSize={9}
            fontFamily="'JetBrains Mono', monospace"
          >
            OOM DANGER →
          </text>

          {/* Throughput readout */}
          <text
            x={POOL_X + 20}
            y={600}
            fill={PS_COLORS.connector}
            fontSize={11}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            THROUGHPUT
          </text>
          <text
            x={POOL_X + 130}
            y={600}
            fill={color}
            fontSize={18}
            fontWeight={700}
            fontFamily="'JetBrains Mono', monospace"
          >
            {Math.round(qps)} qps
          </text>
          <rect
            x={SERVER_X + 20}
            y={578}
            width={220}
            height={32}
            rx={6}
            fill="none"
            stroke={color}
          />
          <text
            x={SERVER_X + 130}
            y={599}
            textAnchor="middle"
            fill={color}
            fontSize={12}
            fontWeight={700}
            letterSpacing="0.1em"
          >
            {REGIME_LABEL[regime]}
          </text>
        </svg>
      </div>

      <label className="ps-scaling-control">
        <span>
          Pool size <strong>{connections}</strong>
        </span>
        <input
          type="range"
          min={N_MIN}
          max={N_MAX}
          step={1}
          value={connections}
          onChange={(e) => setConnections(Number(e.target.value))}
          aria-label="Number of pooled connections"
        />
        <i>
          <span>1</span>
          <span>500</span>
        </i>
      </label>
    </div>
  );
}
