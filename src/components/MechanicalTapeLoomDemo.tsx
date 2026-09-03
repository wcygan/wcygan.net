import { useCallback, useState } from "react";

type SlotRecord = {
  id: number;
  lakePlan: "pro" | "free" | "enterprise";
  dbPlan: "pro" | "free" | "enterprise";
  status: "synced" | "drifting" | "stamping" | "verifying";
};

const INITIAL_RECORDS: SlotRecord[] = [
  { id: 101, lakePlan: "pro", dbPlan: "pro", status: "synced" },
  { id: 102, lakePlan: "free", dbPlan: "free", status: "synced" },
  { id: 103, lakePlan: "pro", dbPlan: "free", status: "drifting" },
  { id: 104, lakePlan: "enterprise", dbPlan: "enterprise", status: "synced" },
  { id: 105, lakePlan: "free", dbPlan: "free", status: "synced" },
  { id: 106, lakePlan: "pro", dbPlan: "free", status: "drifting" },
  { id: 107, lakePlan: "free", dbPlan: "free", status: "synced" },
];

export function MechanicalTapeLoomDemo() {
  const [records, setRecords] = useState<SlotRecord[]>(INITIAL_RECORDS);
  const [activeSlotIdx, setActiveSlotIdx] = useState(2);
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);
  const [stamperActive, setStamperActive] = useState(false);
  const [cdcScanActive, setCdcScanActive] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([
    "Loom online. Slotted tape reader initialized.",
    "Optical comparator armed at slot 103.",
  ]);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const currentRecord = records[activeSlotIdx] || records[0];
  const hasDrift = currentRecord.lakePlan !== currentRecord.dbPlan;

  const corruptActiveSlot = () => {
    if (isAutoReconciling) return;
    setRecords((prev) =>
      prev.map((rec, i) =>
        i === activeSlotIdx
          ? {
              ...rec,
              dbPlan: rec.lakePlan === "pro" ? "free" : "pro",
              status: "drifting",
            }
          : rec,
      ),
    );
    addLog(
      `[CHAOS] Corrupted slot #${currentRecord.id}: DB plan flipped to '${currentRecord.lakePlan === "pro" ? "free" : "pro"}'`,
    );
  };

  const repairCurrentSlot = useCallback(() => {
    if (!hasDrift || stamperActive) return;

    setStamperActive(true);
    addLog(
      `[REPAIR] Actuator engaged. Stamping '${currentRecord.lakePlan}' onto slot #${currentRecord.id}...`,
    );

    setTimeout(() => {
      setRecords((prev) =>
        prev.map((rec, i) =>
          i === activeSlotIdx
            ? { ...rec, dbPlan: rec.lakePlan, status: "stamping" }
            : rec,
        ),
      );
      setStamperActive(false);
      setCdcScanActive(true);
      addLog(`[IDEMPOTENT WRITE] Slot #${currentRecord.id} patched in MySQL.`);

      setTimeout(() => {
        setRecords((prev) =>
          prev.map((rec, i) =>
            i === activeSlotIdx ? { ...rec, status: "synced" } : rec,
          ),
        );
        setCdcScanActive(false);
        addLog(
          `[CDC SENSOR] Debezium verified slot #${currentRecord.id} matches lake.`,
        );
      }, 700);
    }, 600);
  }, [hasDrift, stamperActive, activeSlotIdx, currentRecord]);

  const runFullReconciliation = () => {
    if (isAutoReconciling) return;
    setIsAutoReconciling(true);
    addLog(
      "[RUN] Scheduled batch reconciliation triggered across all slots...",
    );

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= records.length) {
        clearInterval(interval);
        setIsAutoReconciling(false);
        addLog("[DONE] All tape slots inspected and reconciled.");
        return;
      }
      setActiveSlotIdx(idx);

      // Check drift on this slot
      setRecords((curr) => {
        const item = curr[idx];
        if (item && item.lakePlan !== item.dbPlan) {
          addLog(
            `[DIFF] Slot #${item.id} drift found ('${item.lakePlan}' vs '${item.dbPlan}'). Stamping fix...`,
          );
          return curr.map((r, i) =>
            i === idx ? { ...r, dbPlan: r.lakePlan, status: "synced" } : r,
          );
        }
        return curr;
      });

      idx++;
    }, 800);
  };

  return (
    <figure
      className="tape-loom-demo"
      data-graphic-frame="workbench"
      data-graphic-key="mechanical-tape-loom"
      data-graphic-kind="dom"
      aria-labelledby="tape-loom-title"
    >
      <header className="tape-loom-header">
        <div>
          <span className="tape-loom-badge">Concept 1</span>
          <p className="article-graphic-title" id="tape-loom-title">
            The Dual Tape &amp; Repair Loom
          </p>
          <p className="tape-loom-desc">
            Physical comparison between the Canonical Lake Tape and Operational
            Datastore Tape with mechanical stamping and CDC optical
            verification.
          </p>
        </div>
        <div className="tape-loom-actions">
          <button
            type="button"
            className="tape-btn tape-btn-chaos"
            onClick={corruptActiveSlot}
            disabled={isAutoReconciling}
          >
            ⚡ Corrupt Slot
          </button>
          <button
            type="button"
            className="tape-btn tape-btn-repair"
            onClick={repairCurrentSlot}
            disabled={!hasDrift || stamperActive || isAutoReconciling}
          >
            🔨 Stamp Repair
          </button>
          <button
            type="button"
            className="tape-btn tape-btn-auto"
            onClick={runFullReconciliation}
            disabled={isAutoReconciling}
          >
            {isAutoReconciling ? "Reconciling..." : "▶ Run Scheduled Job"}
          </button>
        </div>
      </header>

      <div
        className="tape-loom-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        {/* Scrubber / Slot Selector */}
        <div className="tape-slot-nav">
          <span className="tape-nav-label">Tape Head Index:</span>
          <div className="tape-slot-pills">
            {records.map((r, i) => {
              const isMismatch = r.lakePlan !== r.dbPlan;
              return (
                <button
                  key={r.id}
                  type="button"
                  className="tape-slot-pill"
                  data-selected={i === activeSlotIdx}
                  data-drift={isMismatch}
                  onClick={() => !isAutoReconciling && setActiveSlotIdx(i)}
                >
                  #{r.id} {isMismatch ? "⚠️" : "✓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dual Tapes Container */}
        <div className="tape-chassis">
          {/* Laser Comparator Line */}
          <div
            className={`tape-laser-gauge ${hasDrift ? "drift-alert" : "synced"}`}
          >
            <span className="tape-laser-line" />
            <span className="tape-laser-tag">
              {hasDrift ? "MISMATCH DETECTED" : "CANONICAL MATCH"}
            </span>
          </div>

          <div className="tape-tracks-wrapper">
            {/* Left Track: Lake Log */}
            <div className="tape-track tape-track-lake">
              <div className="tape-track-header">
                <span className="track-icon">❄️</span>
                <strong>Lake Log (Apache Iceberg)</strong>
                <span className="track-sub">Canonical Record of Truth</span>
              </div>
              <div className="tape-slots-view">
                {records.map((r, i) => (
                  <div
                    key={r.id}
                    className="tape-punch-card"
                    data-active={i === activeSlotIdx}
                  >
                    <div className="card-sprocket left" />
                    <div className="card-data">
                      <span className="card-id">ID:{r.id}</span>
                      <strong className="card-val val-lake">
                        {r.lakePlan.toUpperCase()}
                      </strong>
                    </div>
                    <div className="card-sprocket right" />
                  </div>
                ))}
              </div>
            </div>

            {/* Middle: Actuator Bridge */}
            <div className="tape-actuator-bridge">
              <div
                className={`repair-stamper ${stamperActive ? "stamping" : ""} ${
                  cdcScanActive ? "cdc-scanning" : ""
                }`}
              >
                <div className="stamper-head">
                  <span className="stamper-piston" />
                  <span className="stamper-die">
                    {stamperActive
                      ? "STAMPING"
                      : cdcScanActive
                        ? "CDC VERIFY"
                        : "FLINK"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Track: Operational DB */}
            <div className="tape-track tape-track-db">
              <div className="tape-track-header">
                <span className="track-icon">🐬</span>
                <strong>Datastore (MySQL Live)</strong>
                <span className="track-sub">Operational State</span>
              </div>
              <div className="tape-slots-view">
                {records.map((r, i) => {
                  const mismatch = r.lakePlan !== r.dbPlan;
                  return (
                    <div
                      key={r.id}
                      className="tape-punch-card db-card"
                      data-active={i === activeSlotIdx}
                      data-mismatch={mismatch}
                    >
                      <div className="card-sprocket left" />
                      <div className="card-data">
                        <span className="card-id">ID:{r.id}</span>
                        <strong
                          className={`card-val ${
                            mismatch ? "val-drift" : "val-synced"
                          }`}
                        >
                          {r.dbPlan.toUpperCase()}
                        </strong>
                      </div>
                      <div className="card-sprocket right" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tactile Terminal Log */}
        <div className="tape-terminal">
          <div className="tape-terminal-header">
            <span className="term-dot green" />
            <span className="term-dot yellow" />
            <span className="term-dot red" />
            <span className="term-title">
              RECONCILER_TTY :: REPAIR EVENT BUS
            </span>
          </div>
          <div className="tape-terminal-body">
            {logMessages.map((m, idx) => (
              <div key={idx} className="term-row">
                <span className="term-prompt">&gt;</span>
                <span className="term-text">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="tape-loom-caption">
        <strong>Pattern in action:</strong> The comparator detects when slot #
        {currentRecord.id}&apos;s live database state differs from the lake.
        Flink applies an idempotent write to bring MySQL in line, and Debezium
        streams confirmation back.
      </figcaption>
    </figure>
  );
}
