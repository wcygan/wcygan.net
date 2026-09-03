import { useState } from "react";

type Canister = {
  id: string;
  table: string;
  rowId: number;
  patch: string;
  status: "queued" | "in-transit" | "consumed" | "verified";
};

const INITIAL_CANISTERS: Canister[] = [
  {
    id: "pkt-01",
    table: "users",
    rowId: 42,
    patch: "plan='pro'",
    status: "queued",
  },
  {
    id: "pkt-02",
    table: "accounts",
    rowId: 108,
    patch: "balance=450.00",
    status: "queued",
  },
  {
    id: "pkt-03",
    table: "orders",
    rowId: 902,
    patch: "status='COMPLETED'",
    status: "queued",
  },
];

export function PneumaticRepairTubeDemo() {
  const [canisters, setCanisters] = useState<Canister[]>(INITIAL_CANISTERS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isFiring, setIsFiring] = useState(false);
  const [transitX, setTransitX] = useState(40); // 40px = Kafka outbox, 520px = Flink inbox

  const fireNextCanister = () => {
    if (isFiring || activeIdx >= canisters.length) return;
    setIsFiring(true);

    // Animate canister through pneumatic tube
    setTransitX(520);

    setTimeout(() => {
      setCanisters((prev) =>
        prev.map((c, i) =>
          i === activeIdx ? { ...c, status: "consumed" } : c,
        ),
      );

      // Return canister launcher to origin
      setTimeout(() => {
        setTransitX(40);
        setIsFiring(false);
        setActiveIdx((prev) => prev + 1);
      }, 400);
    }, 750);
  };

  const resetAll = () => {
    setCanisters(INITIAL_CANISTERS);
    setActiveIdx(0);
    setTransitX(40);
    setIsFiring(false);
  };

  const currentCanister = canisters[activeIdx];

  return (
    <figure
      className="pneumatic-tube-demo"
      data-graphic-frame="workbench"
      data-graphic-key="pneumatic-repair-tube"
      data-graphic-kind="dom"
      aria-labelledby="pneumatic-tube-title"
    >
      <header className="pneumatic-tube-header">
        <div>
          <span className="pneumatic-tube-badge">Concept 6</span>
          <p className="article-graphic-title" id="pneumatic-tube-title">
            Pneumatic Tube Event Dispatcher
          </p>
          <p className="pneumatic-tube-desc">
            Physical vacuum tube firing self-contained repair event capsules
            from Kafka outbox directly into Flink stream processors for
            idempotent delivery.
          </p>
        </div>
        <div className="pneumatic-tube-actions">
          <button
            type="button"
            className="tube-btn tube-btn-fire"
            onClick={fireNextCanister}
            disabled={isFiring || activeIdx >= canisters.length}
          >
            {isFiring
              ? "🚀 Capsule In Flight..."
              : activeIdx >= canisters.length
                ? "All Capsules Delivered"
                : `🚀 Fire Capsule #${activeIdx + 1}`}
          </button>
          <button
            type="button"
            className="tube-btn tube-btn-reset"
            onClick={resetAll}
            disabled={isFiring}
          >
            🔄 Reload Tube
          </button>
        </div>
      </header>

      <div
        className="pneumatic-tube-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        {/* Transparent Vacuum Tube Chamber */}
        <div className="tube-chamber">
          <div className="tube-station station-left">
            <span className="station-icon">📡</span>
            <strong>Kafka Outbox</strong>
            <span className="station-topic">topic: repair.events</span>
          </div>

          <div className="glass-tube-cylinder">
            <div className="pressure-stream-effect" />
            {/* Flying Capsule */}
            {activeIdx < canisters.length && (
              <div
                className={`canister-capsule ${isFiring ? "flying" : ""}`}
                style={{
                  left: `${transitX}px`,
                  transition: isFiring
                    ? "left 0.75s cubic-bezier(0.25, 1, 0.5, 1), transform 0.75s ease"
                    : "none",
                }}
              >
                <div className="capsule-body">
                  <span className="capsule-id">{currentCanister?.id}</span>
                  <code className="capsule-payload">
                    {currentCanister?.patch}
                  </code>
                </div>
              </div>
            )}
          </div>

          <div className="tube-station station-right">
            <span className="station-icon">⚡</span>
            <strong>Flink Consumer</strong>
            <span className="station-topic">Idempotent Upsert</span>
          </div>
        </div>

        {/* Canister Queue Ledger */}
        <div className="canister-ledger">
          <div className="ledger-header">
            <span>EVENT ID</span>
            <span>TARGET TABLE</span>
            <span>ROW ID</span>
            <span>PATCH PAYLOAD</span>
            <span>STATUS</span>
          </div>
          <div className="ledger-body">
            {canisters.map((c, i) => {
              const isCurrent = i === activeIdx;
              return (
                <div
                  key={c.id}
                  className={`ledger-row ${isCurrent ? "current" : ""} ${
                    c.status === "consumed" ? "consumed" : ""
                  }`}
                >
                  <code>{c.id}</code>
                  <span>{c.table}</span>
                  <span>#{c.rowId}</span>
                  <code className="payload-code">{c.patch}</code>
                  <span
                    className={`pill ${c.status === "consumed" ? "pill-ok" : "pill-pending"}`}
                  >
                    {c.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <figcaption className="pneumatic-tube-caption">
        <strong>Asynchronous Decoupling:</strong> The reconciliation job
        delegates repairs to durable message canisters. Even if downstream MySQL
        nodes temporarily fail, Kafka buffers the canisters for reliable replay.
      </figcaption>
    </figure>
  );
}
