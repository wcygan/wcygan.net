import { useState } from "react";

type Particle = {
  id: number;
  label: string;
  lakeSlot: number; // 0..3
  dbSlot: number; // 0..3
  drift: boolean;
};

const INITIAL_PARTICLES: Particle[] = [
  { id: 101, label: "usr_101", lakeSlot: 0, dbSlot: 0, drift: false },
  { id: 102, label: "usr_102", lakeSlot: 1, dbSlot: 1, drift: false },
  { id: 103, label: "usr_103", lakeSlot: 2, dbSlot: 0, drift: true },
  { id: 104, label: "usr_104", lakeSlot: 3, dbSlot: 3, drift: false },
  { id: 105, label: "usr_105", lakeSlot: 1, dbSlot: 3, drift: true },
  { id: 106, label: "usr_106", lakeSlot: 2, dbSlot: 2, drift: false },
];

export function CentrifugalReconciliationRingDemo() {
  const [particles, setParticles] = useState<Particle[]>(INITIAL_PARTICLES);
  const [isReconciling, setIsReconciling] = useState(false);
  const [vaneAngle, setVaneAngle] = useState(0);

  const perturbParticle = (id: number) => {
    if (isReconciling) return;
    setParticles((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newDbSlot =
            (p.lakeSlot + 1 + Math.floor(Math.random() * 2)) % 4;
          return { ...p, dbSlot: newDbSlot, drift: true };
        }
        return p;
      }),
    );
  };

  const causeChaos = () => {
    if (isReconciling) return;
    setParticles((prev) =>
      prev.map((p) => ({
        ...p,
        dbSlot: Math.random() < 0.5 ? (p.lakeSlot + 1) % 4 : p.lakeSlot,
        drift: Math.random() < 0.5,
      })),
    );
  };

  const runReconciliationSweep = () => {
    if (isReconciling) return;
    setIsReconciling(true);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setVaneAngle((prev) => prev + 90);

      if (step >= 4) {
        clearInterval(interval);
        setParticles((prev) =>
          prev.map((p) => ({
            ...p,
            dbSlot: p.lakeSlot,
            drift: false,
          })),
        );
        setIsReconciling(false);
      }
    }, 450);
  };

  const driftingCount = particles.filter(
    (p) => p.drift || p.lakeSlot !== p.dbSlot,
  ).length;

  return (
    <figure
      className="centrifugal-ring-demo"
      data-graphic-frame="workbench"
      data-graphic-key="centrifugal-reconciliation-ring"
      data-graphic-kind="dom"
      aria-labelledby="centrifugal-ring-title"
    >
      <header className="centrifugal-ring-header">
        <div>
          <span className="centrifugal-ring-badge">Concept 4</span>
          <p className="article-graphic-title" id="centrifugal-ring-title">
            Centrifugal Partition Rebalance Ring
          </p>
          <p className="centrifugal-ring-desc">
            Centrifugal turbine sorting keys into partition quadrants. When
            records land in the wrong live shard, magnetic deflector vanes
            redirect them back to their canonical hash slot.
          </p>
        </div>
        <div className="centrifugal-ring-actions">
          <button
            type="button"
            className="ring-btn ring-btn-chaos"
            onClick={causeChaos}
            disabled={isReconciling}
          >
            🌀 Scatter Shards
          </button>
          <button
            type="button"
            className="ring-btn ring-btn-recon"
            onClick={runReconciliationSweep}
            disabled={isReconciling || driftingCount === 0}
          >
            {isReconciling
              ? "Re-aligning Vanes..."
              : `▶ Reconcile Shards (${driftingCount} displaced)`}
          </button>
        </div>
      </header>

      <div
        className="centrifugal-ring-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <div className="ring-stage-layout">
          {/* Circular SVG Stage */}
          <div className="ring-svg-wrapper">
            <svg viewBox="0 0 400 400" className="ring-svg">
              {/* Outer Housing Ring */}
              <circle cx="200" cy="200" r="170" className="housing-outer" />
              <circle cx="200" cy="200" r="130" className="housing-inner" />

              {/* 4 Partition Quadrant Dividers */}
              <line
                x1="200"
                y1="30"
                x2="200"
                y2="370"
                className="quadrant-divider"
              />
              <line
                x1="30"
                y1="200"
                x2="370"
                y2="200"
                className="quadrant-divider"
              />

              {/* Quadrant Labels */}
              <text x="280" y="80" className="quad-label">
                SHARD 0
              </text>
              <text x="280" y="330" className="quad-label">
                SHARD 1
              </text>
              <text x="70" y="330" className="quad-label">
                SHARD 2
              </text>
              <text x="70" y="80" className="quad-label">
                SHARD 3
              </text>

              {/* Central Rotor / Vane */}
              <g
                className="central-rotor"
                style={{
                  transform: `rotate(${vaneAngle}deg)`,
                  transformOrigin: "200px 200px",
                  transition:
                    "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <circle cx="200" cy="200" r="32" className="rotor-core" />
                <path d="M 200 168 L 200 120" className="rotor-blade" />
                <path d="M 200 232 L 200 280" className="rotor-blade" />
                <path d="M 168 200 L 120 200" className="rotor-blade" />
                <path d="M 232 200 L 280 200" className="rotor-blade" />
                <text
                  x="200"
                  y="204"
                  textAnchor="middle"
                  className="rotor-text"
                >
                  TRINO
                </text>
              </g>

              {/* Particles orbiting their assigned vs live slots */}
              {particles.map((p, i) => {
                const isDisplaced = p.lakeSlot !== p.dbSlot || p.drift;
                // Calculate position based on dbSlot
                // Slot 0: Top-right (0 to PI/2)
                // Slot 1: Bottom-right (PI/2 to PI)
                // Slot 2: Bottom-left (PI to 3PI/2)
                // Slot 3: Top-left (3PI/2 to 2PI)
                const baseAngles = [
                  Math.PI * 0.25,
                  Math.PI * 0.75,
                  Math.PI * 1.25,
                  Math.PI * 1.75,
                ];
                const slotAngle =
                  baseAngles[p.dbSlot] + (i % 2 === 0 ? -1 : 1) * 0.22;
                const r = 150;
                const px = 200 + r * Math.cos(slotAngle);
                const py = 200 + r * Math.sin(slotAngle);

                return (
                  <g
                    key={p.id}
                    onClick={() => perturbParticle(p.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={px}
                      cy={py}
                      r="10"
                      className={`particle-node ${isDisplaced ? "displaced" : "aligned"}`}
                    />
                    <text
                      x={px}
                      y={py + 3}
                      textAnchor="middle"
                      className="particle-id"
                    >
                      {p.id.toString().slice(-2)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Shard Placement Table */}
          <div className="ring-legend-table">
            <div className="ring-legend-header">
              <span>RECORD</span>
              <span>CANONICAL LAKE</span>
              <span>LIVE SHARD</span>
              <span>STATUS</span>
            </div>
            <div className="ring-legend-body">
              {particles.map((p) => {
                const isDisplaced = p.lakeSlot !== p.dbSlot || p.drift;
                return (
                  <div
                    key={p.id}
                    className={`ring-legend-row ${isDisplaced ? "row-displaced" : "row-aligned"}`}
                    onClick={() => perturbParticle(p.id)}
                  >
                    <code>#{p.id}</code>
                    <span className="col-lake">Slot {p.lakeSlot}</span>
                    <span className="col-db">Slot {p.dbSlot}</span>
                    <span
                      className={`pill ${isDisplaced ? "pill-alert" : "pill-ok"}`}
                    >
                      {isDisplaced ? "MISPLACED" : "ALIGNED"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <figcaption className="centrifugal-ring-caption">
        <strong>Partition Integrity:</strong> When records land on the incorrect
        storage shard due to race conditions or partial network failovers,
        reconciliation reads the partition hash mapping and dispatches deflector
        migration events.
      </figcaption>
    </figure>
  );
}
