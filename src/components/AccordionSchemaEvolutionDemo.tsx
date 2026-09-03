import { useState } from "react";

type Column = {
  id: string;
  name: string;
  lakeType: string;
  dbType: string;
  drift: boolean;
};

const INITIAL_COLUMNS: Column[] = [
  {
    id: "c1",
    name: "user_id",
    lakeType: "BIGINT NOT NULL",
    dbType: "BIGINT NOT NULL",
    drift: false,
  },
  {
    id: "c2",
    name: "subscription_tier",
    lakeType: "VARCHAR(32)",
    dbType: "VARCHAR(16)",
    drift: true,
  },
  {
    id: "c3",
    name: "billing_status",
    lakeType: "ENUM('active','delinquent')",
    dbType: "ENUM('active','delinquent')",
    drift: false,
  },
  {
    id: "c4",
    name: "metadata_v2",
    lakeType: "JSON",
    dbType: "TEXT",
    drift: true,
  },
  {
    id: "c5",
    name: "updated_at",
    lakeType: "TIMESTAMP(6)",
    dbType: "TIMESTAMP(6)",
    drift: false,
  },
];

export function AccordionSchemaEvolutionDemo() {
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS);
  const [activeColId, setActiveColId] = useState("c2");
  const [isPatching, setIsPatching] = useState(false);
  const [patchLog, setPatchLog] = useState<string>(
    "Ready. Select or corrupt schema columns.",
  );

  const toggleDrift = (id: string) => {
    if (isPatching) return;
    setColumns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextDrift = !c.drift;
          return {
            ...c,
            dbType: nextDrift
              ? c.lakeType === "JSON"
                ? "TEXT"
                : "VARCHAR(16)"
              : c.lakeType,
            drift: nextDrift,
          };
        }
        return c;
      }),
    );
  };

  const applyDdlMigration = () => {
    if (isPatching) return;
    setIsPatching(true);
    setPatchLog(
      "Executing scheduled DDL repair: ALTER TABLE users MODIFY COLUMN...",
    );

    setTimeout(() => {
      setColumns((prev) =>
        prev.map((c) => ({
          ...c,
          dbType: c.lakeType,
          drift: false,
        })),
      );
      setIsPatching(false);
      setPatchLog(
        "Migration complete. MySQL table definition reconciled to Iceberg catalog specification.",
      );
    }, 850);
  };

  const activeCol = columns.find((c) => c.id === activeColId) || columns[0];
  const driftCount = columns.filter((c) => c.drift).length;

  return (
    <figure
      className="schema-evolution-demo"
      data-graphic-frame="workbench"
      data-graphic-key="schema-evolution-accordion"
      data-graphic-kind="dom"
      aria-labelledby="schema-evolution-title"
    >
      <header className="schema-evolution-header">
        <div>
          <span className="schema-evolution-badge">Concept 5</span>
          <p className="article-graphic-title" id="schema-evolution-title">
            Schema Evolution Bellows &amp; Column Diff
          </p>
          <p className="schema-evolution-desc">
            Reconciling schema drift: When downstream tables lag behind Iceberg
            catalog type promotions, reconciliation issues idempotent ALTER
            TABLE migrations.
          </p>
        </div>
        <div className="schema-evolution-actions">
          <button
            type="button"
            className="schema-btn schema-btn-chaos"
            onClick={() => toggleDrift(activeColId)}
            disabled={isPatching}
          >
            ⚡ Flip Column Drift
          </button>
          <button
            type="button"
            className="schema-btn schema-btn-repair"
            onClick={applyDdlMigration}
            disabled={isPatching || driftCount === 0}
          >
            {isPatching
              ? "Running DDL Migration..."
              : `▶ Apply DDL Migration (${driftCount} drifted)`}
          </button>
        </div>
      </header>

      <div
        className="schema-evolution-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        {/* Accordion Column Ribbon */}
        <div className="accordion-columns-rail">
          {columns.map((c) => (
            <div
              key={c.id}
              className={`accordion-column-slice ${c.id === activeColId ? "active" : ""} ${
                c.drift ? "has-drift" : "synced"
              }`}
              onClick={() => setActiveColId(c.id)}
            >
              <div className="slice-header">
                <span className="slice-dot" />
                <code>{c.name}</code>
              </div>
              <div className="slice-preview">
                {c.drift ? "⚠️ TYPE DRIFT" : "✓ COMPATIBLE"}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Column Comparison Panel */}
        <div className="schema-detail-panel">
          <div className="schema-spec-card lake-spec">
            <span className="spec-label">
              ❄️ Canonical Lake (Iceberg Catalog)
            </span>
            <div className="spec-content">
              <strong>{activeCol.name}</strong>
              <code className="code-badge lake-badge">
                {activeCol.lakeType}
              </code>
            </div>
          </div>

          <div className="schema-comparator-arrow">
            <span>{activeCol.drift ? "≠" : "≡"}</span>
          </div>

          <div className="schema-spec-card db-spec">
            <span className="spec-label">
              🐬 Operational Table (MySQL live)
            </span>
            <div className="spec-content">
              <strong>{activeCol.name}</strong>
              <code
                className={`code-badge ${activeCol.drift ? "db-badge-err" : "db-badge-ok"}`}
              >
                {activeCol.dbType}
              </code>
            </div>
          </div>
        </div>

        {/* Terminal / DDL Migration Log */}
        <div className="schema-terminal-bar">
          <span className="term-prompt">&gt;</span>
          <span className="term-text">{patchLog}</span>
        </div>
      </div>

      <figcaption className="schema-evolution-caption">
        <strong>Structural Reconciliation:</strong> Schema drift silently breaks
        CDC pipelines. An automated schema crawler detects metadata divergence
        and applies non-breaking idempotent DDL migrations.
      </figcaption>
    </figure>
  );
}
