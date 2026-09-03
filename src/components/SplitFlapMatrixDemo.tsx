import { useState } from "react";

type MatrixCell = {
  id: number;
  valLake: string;
  valDb: string;
  status:
    | "clean"
    | "scanned-drift"
    | "emitting-event"
    | "flipping"
    | "reconciled";
};

const GRID_SIZE = 24; // 24 cell partition

function generateInitialCells(): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (let i = 1; i <= GRID_SIZE; i++) {
    const isDrifting = i === 4 || i === 11 || i === 18;
    cells.push({
      id: 1000 + i,
      valLake: "OK_PRO",
      valDb: isDrifting ? "ERR_FREE" : "OK_PRO",
      status: isDrifting ? "scanned-drift" : "clean",
    });
  }
  return cells;
}

export function SplitFlapMatrixDemo() {
  const [cells, setCells] = useState<MatrixCell[]>(generateInitialCells());
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<
    "idle" | "diffing" | "emitting" | "flipping" | "done"
  >("idle");
  const [activeEvents, setActiveEvents] = useState<string[]>([]);

  const toggleCellCorrupt = (id: number) => {
    if (isScanning) return;
    setCells((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const isErr = c.valDb === "ERR_FREE";
          return {
            ...c,
            valDb: isErr ? "OK_PRO" : "ERR_FREE",
            status: isErr ? "clean" : "scanned-drift",
          };
        }
        return c;
      }),
    );
  };

  const corruptRandomCells = () => {
    if (isScanning) return;
    setCells((prev) =>
      prev.map((c) => {
        const flip = Math.random() < 0.25;
        return {
          ...c,
          valDb: flip ? "ERR_FREE" : "OK_PRO",
          status: flip ? "scanned-drift" : "clean",
        };
      }),
    );
  };

  const runReconciliationSequence = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanStep("diffing");

    // Phase 1: Diff Scan line sweeping across
    setTimeout(() => {
      const driftingIds = cells
        .filter((c) => c.valLake !== c.valDb)
        .map((c) => c.id);

      setScanStep("emitting");
      setActiveEvents(
        driftingIds.map((id) => `PATCH /records/${id} { plan: 'pro' }`),
      );

      // Phase 2: Emitting repair events to Kafka
      setCells((prev) =>
        prev.map((c) =>
          c.valLake !== c.valDb ? { ...c, status: "emitting-event" } : c,
        ),
      );

      // Phase 3: Flink consumes events, 3D split-flap mechanical flip
      setTimeout(() => {
        setScanStep("flipping");
        setCells((prev) =>
          prev.map((c) =>
            c.valLake !== c.valDb ? { ...c, status: "flipping" } : c,
          ),
        );

        // Phase 4: Final settled state
        setTimeout(() => {
          setCells((prev) =>
            prev.map((c) => ({
              ...c,
              valDb: c.valLake,
              status: "reconciled",
            })),
          );
          setScanStep("done");
          setIsScanning(false);
        }, 800);
      }, 1000);
    }, 1200);
  };

  const driftingCount = cells.filter((c) => c.valLake !== c.valDb).length;

  return (
    <figure
      className="split-flap-demo"
      data-graphic-frame="workbench"
      data-graphic-key="split-flap-matrix"
      data-graphic-kind="dom"
      aria-labelledby="split-flap-title"
    >
      <header className="split-flap-header">
        <div>
          <span className="split-flap-badge">Concept 3</span>
          <p className="article-graphic-title" id="split-flap-title">
            The Split-Flap Matrix Differential
          </p>
          <p className="split-flap-desc">
            Macro-scale partition scanner: laser diff sweep identifies corrupted
            rows, dispatches repair events, and flips records into alignment.
          </p>
        </div>
        <div className="split-flap-actions">
          <button
            type="button"
            className="split-btn split-btn-chaos"
            onClick={corruptRandomCells}
            disabled={isScanning}
          >
            🎲 Corrupt Random Cells
          </button>
          <button
            type="button"
            className="split-btn split-btn-reconcile"
            onClick={runReconciliationSequence}
            disabled={isScanning || driftingCount === 0}
          >
            {isScanning
              ? `Reconciling [${scanStep.toUpperCase()}]...`
              : `▶ Run Job (${driftingCount} drift)`}
          </button>
        </div>
      </header>

      <div
        className="split-flap-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        {/* Status ribbon banner */}
        <div className="split-flap-banner">
          <div className="banner-segment">
            <span className="banner-label">TARGET PARTITION:</span>
            <code className="banner-code">iceberg.users_p042</code>
          </div>
          <div className="banner-segment">
            <span className="banner-label">DRIFT COUNT:</span>
            <span
              className={`banner-stat ${driftingCount > 0 ? "stat-alert" : "stat-ok"}`}
            >
              {driftingCount} / {cells.length}
            </span>
          </div>
          <div className="banner-segment">
            <span className="banner-label">STAGE:</span>
            <span className="banner-stage-pill">{scanStep.toUpperCase()}</span>
          </div>
        </div>

        {/* 3D Mechanical Split-Flap Matrix */}
        <div className="split-matrix-chassis">
          {isScanning && scanStep === "diffing" && (
            <div className="matrix-scan-beam" />
          )}

          <div className="matrix-grid">
            {cells.map((c) => {
              const isMismatch = c.valLake !== c.valDb;
              return (
                <div
                  key={c.id}
                  className={`split-cell ${
                    c.status === "flipping"
                      ? "flipping"
                      : isMismatch
                        ? "cell-drift"
                        : "cell-synced"
                  }`}
                  onClick={() => toggleCellCorrupt(c.id)}
                  title={`Record #${c.id}: Lake=${c.valLake}, DB=${c.valDb} (Click to toggle)`}
                >
                  <div className="cell-face cell-top">
                    <span className="cell-id">#{c.id}</span>
                    <strong className="cell-val">
                      {c.status === "flipping" ? c.valLake : c.valDb}
                    </strong>
                  </div>
                  <div className="cell-face cell-bottom">
                    <span className="cell-status-dot" />
                    <span className="cell-indicator">
                      {isMismatch ? "DRIFT" : "LOCKED"}
                    </span>
                  </div>
                  <div className="cell-split-line" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Repair Log Event Dispatcher */}
        {activeEvents.length > 0 && (
          <div className="split-events-tray">
            <div className="events-tray-header">
              <span className="events-pulse" />
              <strong>KAFKA REPAIR TOPIC EVENT PIPELINE</strong>
            </div>
            <div className="events-pill-stream">
              {activeEvents.map((ev, i) => (
                <div key={i} className="event-pill">
                  <span className="event-pill-icon">⚡</span>
                  <code>{ev}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <figcaption className="split-flap-caption">
        <strong>Macro-to-micro batch diffing:</strong> Airflow schedules a query
        against the partition. Every mismatched cell generates a targeted repair
        event payload for Flink to apply idempotently via mechanical flip.
      </figcaption>
    </figure>
  );
}
