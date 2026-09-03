import { useEffect, useRef, useState } from "react";

type SatelliteNode = {
  id: number;
  label: string;
  lakeAngle: number; // Angle on lake ring in radians
  dbAngle: number; // Angle on db ring in radians
  drift: number; // Angular offset / misalignment
  status: "locked" | "drifting" | "reconciling";
};

const INITIAL_NODES: SatelliteNode[] = [
  {
    id: 1,
    label: "user_101",
    lakeAngle: 0.2,
    dbAngle: 0.2,
    drift: 0,
    status: "locked",
  },
  {
    id: 2,
    label: "user_102",
    lakeAngle: 1.1,
    dbAngle: 1.1,
    drift: 0,
    status: "locked",
  },
  {
    id: 3,
    label: "user_103",
    lakeAngle: 2.1,
    dbAngle: 2.7,
    drift: 0.6,
    status: "drifting",
  },
  {
    id: 4,
    label: "user_104",
    lakeAngle: 3.4,
    dbAngle: 3.4,
    drift: 0,
    status: "locked",
  },
  {
    id: 5,
    label: "user_105",
    lakeAngle: 4.5,
    dbAngle: 5.1,
    drift: 0.6,
    status: "drifting",
  },
  {
    id: 6,
    label: "user_106",
    lakeAngle: 5.4,
    dbAngle: 5.4,
    drift: 0,
    status: "locked",
  },
];

export function OrbitalDriftRadarDemo() {
  const [nodes, setNodes] = useState<SatelliteNode[]>(INITIAL_NODES);
  const [radarSweepAngle, setRadarSweepAngle] = useState(0);
  const [autoReconcile, setAutoReconcile] = useState(false);
  const animRef = useRef<number>(0);

  // Radar sweep animation
  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      setRadarSweepAngle((prev) => (prev + delta * 1.2) % (Math.PI * 2));
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Check sweep alignment for auto-reconcile
  useEffect(() => {
    if (!autoReconcile) return;

    setNodes((prev) =>
      prev.map((node) => {
        if (node.status === "drifting") {
          const diff = Math.abs(radarSweepAngle - node.lakeAngle);
          if (diff < 0.15 || diff > Math.PI * 2 - 0.15) {
            return {
              ...node,
              dbAngle: node.lakeAngle,
              drift: 0,
              status: "locked",
            };
          }
        }
        return node;
      }),
    );
  }, [radarSweepAngle, autoReconcile]);

  const triggerDrift = (id: number) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              dbAngle:
                (n.lakeAngle + 0.5 + Math.random() * 0.4) % (Math.PI * 2),
              drift: 0.6,
              status: "drifting",
            }
          : n,
      ),
    );
  };

  const perturbAll = () => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        dbAngle: (n.lakeAngle + 0.4 + Math.random() * 0.5) % (Math.PI * 2),
        drift: 0.6,
        status: "drifting",
      })),
    );
  };

  const triggerReconciliationPulse = () => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        status: n.drift > 0 ? "reconciling" : "locked",
      })),
    );

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          dbAngle: n.lakeAngle,
          drift: 0,
          status: "locked",
        })),
      );
    }, 750);
  };

  const driftedCount = nodes.filter((n) => n.status === "drifting").length;

  // Radar geometry
  const CX = 220;
  const CY = 220;
  const R_LAKE = 160;
  const R_DB = 100;
  const R_CORE = 42;

  return (
    <figure
      className="orbital-radar-demo"
      data-graphic-frame="workbench"
      data-graphic-key="orbital-drift-radar"
      data-graphic-kind="dom"
      aria-labelledby="orbital-radar-title"
    >
      <header className="orbital-radar-header">
        <div>
          <span className="orbital-radar-badge">Concept 2</span>
          <p className="article-graphic-title" id="orbital-radar-title">
            Orbital Drift &amp; Convergence Radar
          </p>
          <p className="orbital-radar-desc">
            Visualizing data integrity as gravitational resonance: the outer
            ring (Lake source of truth) vs inner ring (Live Datastore).
          </p>
        </div>
        <div className="orbital-radar-controls">
          <button
            type="button"
            className="orbital-btn orbital-btn-perturb"
            onClick={perturbAll}
          >
            ☄️ Cause System Drift
          </button>
          <button
            type="button"
            className="orbital-btn orbital-btn-pulse"
            onClick={triggerReconciliationPulse}
          >
            📡 Fire Recon Wave ({driftedCount} drifted)
          </button>
          <button
            type="button"
            className={`orbital-btn orbital-btn-toggle ${autoReconcile ? "active" : ""}`}
            onClick={() => setAutoReconcile(!autoReconcile)}
          >
            {autoReconcile
              ? "🟢 Continuous Sweep: ON"
              : "⚪ Scheduled Interval: OFF"}
          </button>
        </div>
      </header>

      <div
        className="orbital-radar-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <div className="radar-layout">
          {/* Radar Canvas / SVG Viewport */}
          <div className="radar-svg-container">
            <svg
              className="radar-svg"
              viewBox="0 0 440 440"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#0f1b2c" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#080e18" stopOpacity="0" />
                </radialGradient>
                <linearGradient
                  id="sweepGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Background ambient circular field */}
              <circle cx={CX} cy={CY} r={180} fill="url(#radarGlow)" />
              <circle
                cx={CX}
                cy={CY}
                r={180}
                className="radar-grid-ring outer"
              />
              <circle
                cx={CX}
                cy={CY}
                r={R_LAKE}
                className="radar-grid-ring lake"
              />
              <circle cx={CX} cy={CY} r={R_DB} className="radar-grid-ring db" />
              <circle
                cx={CX}
                cy={CY}
                r={R_CORE}
                className="radar-grid-ring core"
              />

              {/* Axis Crosshairs */}
              <line
                x1={CX}
                y1={20}
                x2={CX}
                y2={420}
                className="radar-crosshair"
              />
              <line
                x1={20}
                y1={CY}
                x2={420}
                y2={CY}
                className="radar-crosshair"
              />

              {/* Center Core: Flink / Airflow Orchestrator */}
              <circle cx={CX} cy={CY} r={28} className="radar-center-core" />
              <text
                x={CX}
                y={CY + 4}
                textAnchor="middle"
                className="radar-core-text"
              >
                RECON
              </text>

              {/* Rotating Radar Sweep Cone */}
              <g
                transform={`rotate(${(radarSweepAngle * 180) / Math.PI}, ${CX}, ${CY})`}
                className="radar-sweep-beam"
              >
                <line
                  x1={CX}
                  y1={CY}
                  x2={CX + 180}
                  y2={CY}
                  className="radar-sweep-line"
                />
                <path
                  d={`M ${CX} ${CY} L ${CX + 170} ${CY} A 170 170 0 0 1 ${
                    CX + 170 * Math.cos(0.5)
                  } ${CY + 170 * Math.sin(0.5)} Z`}
                  fill="url(#sweepGrad)"
                  opacity="0.25"
                />
              </g>

              {/* Node Tethers and Satellites */}
              {nodes.map((n) => {
                const lakeX = CX + R_LAKE * Math.cos(n.lakeAngle);
                const lakeY = CY + R_LAKE * Math.sin(n.lakeAngle);
                const dbX = CX + R_DB * Math.cos(n.dbAngle);
                const dbY = CY + R_DB * Math.sin(n.dbAngle);
                const isDrifting = n.status === "drifting";
                const isReconciling = n.status === "reconciling";

                return (
                  <g key={n.id} className="radar-node-group">
                    {/* Filament connecting Lake Node to Live DB Node */}
                    <line
                      x1={lakeX}
                      y1={lakeY}
                      x2={dbX}
                      y2={dbY}
                      className={`radar-tether ${
                        isDrifting
                          ? "tether-drift"
                          : isReconciling
                            ? "tether-snap"
                            : "tether-locked"
                      }`}
                    />

                    {/* Outer Node: Canonical Lake Truth */}
                    <circle
                      cx={lakeX}
                      cy={lakeY}
                      r={7}
                      className="radar-satellite lake-satellite"
                    />
                    <text
                      x={lakeX + 10 * Math.cos(n.lakeAngle)}
                      y={lakeY + 12 * Math.sin(n.lakeAngle)}
                      className="radar-sat-label"
                      textAnchor="middle"
                    >
                      {n.label}
                    </text>

                    {/* Inner Node: Operational Datastore */}
                    <circle
                      cx={dbX}
                      cy={dbY}
                      r={6}
                      className={`radar-satellite db-satellite ${
                        isDrifting
                          ? "sat-drift"
                          : isReconciling
                            ? "sat-snap"
                            : "sat-locked"
                      }`}
                      onClick={() => triggerDrift(n.id)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Telemetry / Node Drift Telemetry Board */}
          <div className="radar-telemetry">
            <div className="telemetry-header">
              <span className="telemetry-pulse-dot" />
              <strong>SATELLITE HARMONICS AUDIT</strong>
            </div>
            <div className="telemetry-list">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  className="telemetry-row"
                  data-status={n.status}
                  onClick={() => triggerDrift(n.id)}
                >
                  <span className="telemetry-name">{n.label}</span>
                  <span className="telemetry-phase">
                    Δ {(n.drift * 57.3).toFixed(1)}°
                  </span>
                  <span className={`telemetry-status-pill ${n.status}`}>
                    {n.status === "locked"
                      ? "RESONANT"
                      : n.status === "reconciling"
                        ? "PULLING"
                        : "DRIFTING"}
                  </span>
                </div>
              ))}
            </div>
            <div className="telemetry-footer">
              <div className="telemetry-stat">
                <span>Synchronized:</span>
                <strong>
                  {nodes.length - driftedCount} / {nodes.length}
                </strong>
              </div>
              <div className="telemetry-stat">
                <span>Phase Tension:</span>
                <strong
                  className={driftedCount > 0 ? "text-amber" : "text-green"}
                >
                  {driftedCount > 0
                    ? `${(driftedCount * 16.6).toFixed(0)}%`
                    : "0.0%"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="orbital-radar-caption">
        <strong>Geometrical alignment:</strong> When live data drifts out of
        phase with canonical lake storage, the tension filament stretches. A
        scheduled sweep detects misalignment and applies a centripetal
        correction via event bus.
      </figcaption>
    </figure>
  );
}
