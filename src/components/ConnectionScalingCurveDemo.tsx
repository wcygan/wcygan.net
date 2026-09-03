/**
 * Idea 1: throughput-vs-connections curve that rises, plateaus, then inverts.
 *
 * Model: Universal Scalability Law (Gunther), the same math behind the
 * vendored #universal-scalability-law demo:
 *   X(n) = X1 * n / (1 + alpha*(n-1) + beta*n*(n-1))
 * Latency via Little's law with zero think time: L(n) = n / X(n).
 * alpha = contention (lock queues), beta = coherency/context-switch overhead.
 */

import { useMemo, useRef, useState } from "react";

import { TourCountdownBar } from "~/components/TourCountdownBar";
import {
  useDemoTour,
  usePlayOnceOnVisible,
  type TourBeat,
} from "~/lib/use-demo-tour";

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
const VIEWBOX_H = 460;

const CPU_CORES = 4;
const SERVICE_MS = 25; // uncontended server-side time per query at n=1
const ALPHA = 0.08;
const BETA = 0.0016;

const N_MIN = 1;
const N_MAX = 500;
const BAND_LO = CPU_CORES * 2; // 8
const BAND_HI = CPU_CORES * 10; // 40

// Curve geometry (inside the SVG)
const PLOT_X = 70;
const PLOT_Y = 56;
const PLOT_W = 560;
const PLOT_H = 320;
const PLOT_BOTTOM = PLOT_Y + PLOT_H;

type Regime = "underutilized" | "sweet-spot" | "contended" | "collapse";

const REGIME_LABEL: Record<Regime, string> = {
  underutilized: "UNDERUTILIZED",
  "sweet-spot": "SWEET SPOT",
  contended: "CONTENDED",
  collapse: "COLLAPSE",
};

function throughputQps(connections: number): number {
  const n = Math.max(1, connections);
  const x1 = 1000 / SERVICE_MS;
  return (x1 * n) / (1 + ALPHA * (n - 1) + BETA * n * (n - 1));
}

function latencyMs(connections: number): number {
  return (connections / throughputQps(connections)) * 1000;
}

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

// X scale: sqrt so the 1..500 domain spreads the low end where the action is.
const X_MAX_SQRT = Math.sqrt(N_MAX);
function xFor(n: number): number {
  return PLOT_X + (Math.sqrt(Math.max(1, n)) / X_MAX_SQRT) * PLOT_W;
}

function yFor(qps: number): number {
  const peak = throughputQps(peakN());
  return PLOT_BOTTOM - (qps / (peak * 1.05)) * PLOT_H;
}

function peakN(): number {
  // USL peak: n* = sqrt((1 - alpha) / beta)
  return Math.sqrt((1 - ALPHA) / BETA);
}

function curvePoints(): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 220; i += 1) {
    const n = N_MIN * Math.pow(N_MAX / N_MIN, i / 220);
    pts.push([xFor(n), yFor(throughputQps(n))]);
  }
  return pts;
}

const CURVE_PATH = curvePoints()
  .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
  .join(" ");

const PEAK_N = peakN();

const TOUR_BEATS: TourBeat[] = [
  {
    value: 1,
    holdMs: 3000,
    caption: "One connection — the baseline: 40 qps, 25 ms per query",
  },
  {
    value: 24,
    holdMs: 3000,
    caption: "24 connections on 4 cores — peak throughput, all queries running",
  },
  {
    value: 64,
    holdMs: 3000,
    caption:
      "64 connections — past cores × 10, context switching bends the curve",
  },
  {
    value: 150,
    holdMs: 3000,
    caption: "150 connections — lock queues form and latency triples",
  },
  {
    value: 300,
    holdMs: 3200,
    caption: "300 connections — half the peak throughput, 4 seconds per query",
  },
];

export function ConnectionScalingCurveDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { value, caption, phase, playing, start, onManualChange } = useDemoTour(
    TOUR_BEATS,
    1,
  );
  usePlayOnceOnVisible(rootRef, start);
  const connections = Math.round(value);
  const qps = useMemo(() => throughputQps(connections), [connections]);
  const lat = useMemo(() => latencyMs(connections), [connections]);
  const regime = regimeFor(connections);
  const color = regimeColor(regime);

  const cx = xFor(connections);
  const cy = yFor(qps);

  const latencyColor =
    lat <= 150
      ? PS_COLORS.green
      : lat <= 1000
        ? PS_COLORS.yellow
        : PS_COLORS.red;

  return (
    <div className="ps-diagram-workbench ps-scaling-curve" ref={rootRef}>
      <div className="ps-diagram-header">
        <div>
          <p className="ps-diagram-title">Connections vs throughput</p>
          <p className="ps-diagram-subtitle">
            4-core MySQL · drag the slider — throughput peaks near cores × 6,
            then falls
          </p>
        </div>
        <button type="button" className="ps-diagram-replay-btn" onClick={start}>
          REPLAY TOUR
        </button>
      </div>

      <div className="ps-diagram-stage">
        <svg
          className="brand-diagram-svg"
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          role="img"
          aria-label="Chart of database throughput against connection count. Throughput rises, peaks near 24 connections, then falls as contention and context switching dominate."
        >
          {/* Optimal band + collapse zone */}
          <rect
            x={xFor(BAND_LO)}
            y={PLOT_Y}
            width={xFor(BAND_HI) - xFor(BAND_LO)}
            height={PLOT_H}
            fill={PS_COLORS.green}
            opacity={0.08}
          />
          <rect
            x={xFor(150)}
            y={PLOT_Y}
            width={PLOT_X + PLOT_W - xFor(150)}
            height={PLOT_H}
            fill={PS_COLORS.red}
            opacity={0.07}
          />
          <text
            x={(xFor(BAND_LO) + xFor(BAND_HI)) / 2}
            y={PLOT_Y + 16}
            textAnchor="middle"
            fill={PS_COLORS.green}
            fontSize={11}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            SWEET SPOT
          </text>
          <text
            x={(xFor(150) + PLOT_X + PLOT_W) / 2}
            y={PLOT_Y + 16}
            textAnchor="middle"
            fill={PS_COLORS.red}
            fontSize={11}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            COLLAPSE ZONE
          </text>

          {/* Axes */}
          <line
            x1={PLOT_X}
            y1={PLOT_BOTTOM}
            x2={PLOT_X + PLOT_W}
            y2={PLOT_BOTTOM}
            stroke={PS_COLORS.connector}
          />
          <line
            x1={PLOT_X}
            y1={PLOT_Y}
            x2={PLOT_X}
            y2={PLOT_BOTTOM}
            stroke={PS_COLORS.connector}
          />
          {[1, 10, 100, 500].map((n) => (
            <g key={n}>
              <line
                x1={xFor(n)}
                y1={PLOT_BOTTOM}
                x2={xFor(n)}
                y2={PLOT_BOTTOM + 6}
                stroke={PS_COLORS.connector}
              />
              <text
                x={xFor(n)}
                y={PLOT_BOTTOM + 22}
                textAnchor="middle"
                fill={PS_COLORS.connector}
                fontSize={11}
              >
                {n}
              </text>
            </g>
          ))}
          <text
            x={PLOT_X + PLOT_W / 2}
            y={VIEWBOX_H - 10}
            textAnchor="middle"
            fill={PS_COLORS.fg}
            fontSize={12}
            fontWeight={700}
            letterSpacing="0.08em"
          >
            CONNECTIONS
          </text>
          <text
            x={18}
            y={PLOT_Y + PLOT_H / 2}
            textAnchor="middle"
            fill={PS_COLORS.fg}
            fontSize={12}
            fontWeight={700}
            letterSpacing="0.08em"
            transform={`rotate(-90 18 ${PLOT_Y + PLOT_H / 2})`}
          >
            THROUGHPUT (QPS)
          </text>

          {/* Peak marker */}
          <line
            x1={xFor(PEAK_N)}
            y1={PLOT_Y + 28}
            x2={xFor(PEAK_N)}
            y2={PLOT_BOTTOM}
            stroke={PS_COLORS.accent}
            strokeDasharray="4 4"
          />
          <text
            x={xFor(PEAK_N)}
            y={PLOT_Y + 42}
            textAnchor="middle"
            fill={PS_COLORS.accent}
            fontSize={10}
            fontWeight={700}
            letterSpacing="0.06em"
          >
            PEAK ≈ {Math.round(PEAK_N)}
          </text>

          {/* The curve */}
          <path
            d={CURVE_PATH}
            fill="none"
            stroke={PS_COLORS.blue}
            strokeWidth={2.5}
          />

          {/* Current position */}
          <line x1={cx} y1={cy} x2={cx} y2={PLOT_BOTTOM} stroke={color} />

          {/* Gauges */}
          <g fontFamily="inherit">
            <text
              x={PLOT_X + PLOT_W + 50}
              y={PLOT_Y + 40}
              fill={PS_COLORS.connector}
              fontSize={11}
              fontWeight={700}
              letterSpacing="0.08em"
            >
              THROUGHPUT
            </text>
            <text
              x={PLOT_X + PLOT_W + 50}
              y={PLOT_Y + 78}
              fill={color}
              fontSize={40}
              fontFamily="'JetBrains Mono', ui-monospace, monospace"
            >
              {Math.round(qps)}
            </text>
            <text
              x={PLOT_X + PLOT_W + 50}
              y={PLOT_Y + 100}
              fill={PS_COLORS.connector}
              fontSize={12}
            >
              queries / sec
            </text>

            <text
              x={PLOT_X + PLOT_W + 50}
              y={PLOT_Y + 170}
              fill={PS_COLORS.connector}
              fontSize={11}
              fontWeight={700}
              letterSpacing="0.08em"
            >
              LATENCY / QUERY
            </text>
            <text
              x={PLOT_X + PLOT_W + 50}
              y={PLOT_Y + 208}
              fill={latencyColor}
              fontSize={40}
              fontWeight={700}
              fontFamily="'JetBrains Mono', ui-monospace, monospace"
            >
              {lat >= 1000
                ? `${(lat / 1000).toFixed(1)} s`
                : `${Math.round(lat)} ms`}
            </text>

            <rect
              x={PLOT_X + PLOT_W + 50}
              y={PLOT_Y + 240}
              width={190}
              height={34}
              rx={6}
              fill="none"
              stroke={color}
            />
            <text
              x={PLOT_X + PLOT_W + 145}
              y={PLOT_Y + 262}
              textAnchor="middle"
              fill={color}
              fontSize={13}
              fontWeight={700}
              letterSpacing="0.1em"
            >
              {REGIME_LABEL[regime]}
            </text>

            <text
              x={PLOT_X + PLOT_W + 50}
              y={PLOT_Y + 306}
              fill={PS_COLORS.connector}
              fontSize={11}
              fontFamily="'JetBrains Mono', ui-monospace, monospace"
            >
              connections: {connections}
            </text>
          </g>
        </svg>
      </div>

      <p className="ps-tour-caption" aria-live="polite">
        {caption ?? (playing ? "" : "Drag the slider — or replay the tour")}
      </p>

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
          onChange={(e) => onManualChange(Number(e.target.value))}
          aria-label="Number of pooled connections"
        />
        <i>
          <span>1</span>
          <span>500</span>
        </i>
      </label>

      <TourCountdownBar phase={phase} />
    </div>
  );
}
