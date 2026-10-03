import { type FormEvent, useEffect, useId, useRef, useState } from "react";

const EXISTING_NAMES = [
  "Liam",
  "Ava",
  "Noah",
  "Emma",
  "Oliver",
  "Mia",
  "Leo",
  "Isla",
];
const EXISTING_ROWS = EXISTING_NAMES.map((name, i) => ({ id: i + 1, name }));
type Phase = "ready" | "inserted" | "searching" | "done";

export function FullTableScanDemo() {
  return <IntroDemo indexed={false} />;
}
export function IndexedLookupIntroDemo() {
  return <IntroDemo indexed />;
}

function IntroDemo({ indexed }: { indexed: boolean }) {
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const [name, setName] = useState("Zoe");
  const [insertedName, setInsertedName] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("ready");
  const [checked, setChecked] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [searchStep, setSearchStep] = useState(0);
  const rows = insertedName
    ? [...EXISTING_ROWS, { id: 9, name: insertedName }]
    : EXISTING_ROWS;
  const index = [...rows].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
  const title = indexed
    ? "Finding Data With an Index"
    : "Finding Data Without an Index";

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (stageRef.current) observer.observe(stageRef.current);
    const visibility = () => setHidden(document.hidden);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    visibility();
    motion();
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", motion);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", motion);
    };
  }, []);

  useEffect(() => {
    if (phase !== "searching") return;
    if (reduced) {
      setChecked(indexed ? 1 : 9);
      setPhase("done");
      return;
    }
    if (!visible || hidden) return;
    const timer = setTimeout(
      () => {
        if (indexed) {
          const next = searchStep + 1;
          setSearchStep(next);
          if (next === 3) {
            setChecked(1);
            setPhase("done");
          }
        } else {
          const next = checked + 1;
          setChecked(next);
          if (next === 9) setPhase("done");
        }
      },
      indexed ? 900 : 600,
    );
    return () => clearTimeout(timer);
  }, [phase, reduced, visible, hidden, indexed, checked, searchStep]);

  function insert(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (
      !value ||
      EXISTING_NAMES.some((n) => n.toLowerCase() === value.toLowerCase())
    ) {
      setError("Enter a new name that is not already in the table.");
      return;
    }
    setError("");
    setInsertedName(value);
    setPhase("inserted");
    setChecked(0);
    setSearchStep(0);
  }
  function reset() {
    setInsertedName("");
    setChecked(0);
    setSearchStep(0);
    setPhase("ready");
    setError("");
  }
  const found = phase === "done";
  const searching = phase === "searching";

  return (
    <figure
      className="indexing-demo intro-index-demo"
      data-graphic-frame="workbench"
      aria-labelledby={titleId}
    >
      <header>
        <p className="article-graphic-title" id={titleId}>
          {title}
        </p>
      </header>
      <div
        ref={stageRef}
        className="intro-index-stage"
        data-graphic-stage="padded"
        data-indexed={indexed}
        data-phase={phase}
      >
        <div className="intro-index-query">
          <span>
            {phase === "ready"
              ? "INSERT NEXT"
              : searching || found
                ? "SEARCH"
                : "INSERTED"}
          </span>
          <code>
            {phase === "ready"
              ? "8 records in the table"
              : searching || found
                ? `WHERE name = '${insertedName.replaceAll("'", "''")}'`
                : `9 · ${insertedName}`}
          </code>
        </div>
        {indexed && (
          <>
            <IndexTree
              rows={index}
              secondary
              phase={phase}
              checked={checked}
              searchStep={searchStep}
            />
            <div
              className="intro-tree-handoff"
              data-active={(searching && searchStep >= 2) || found}
            >
              <span>
                {insertedName ? `${insertedName} → ID 9` : "Name → primary key"}
              </span>
              <span aria-hidden="true">↓</span>
              <span>Use the ID in the primary-key tree</span>
            </div>
          </>
        )}
        <IndexTree
          rows={rows}
          secondary={false}
          phase={phase}
          checked={checked}
          searchStep={searchStep}
          scanning={!indexed}
        />
        <div className="intro-index-takeaway">
          <strong>{checked}</strong>
          <span>
            table {checked === 1 ? "row" : "rows"} checked
            {found ? " · found ✓" : ""}
          </span>
        </div>
      </div>
      <form className="intro-index-form" onSubmit={insert}>
        <label htmlFor={inputId}>New name</label>
        <input
          id={inputId}
          value={name}
          maxLength={12}
          disabled={phase !== "ready"}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" disabled={phase !== "ready"}>
          Insert record
        </button>
        <button
          type="button"
          disabled={phase !== "inserted"}
          onClick={() => {
            setChecked(0);
            setSearchStep(0);
            setPhase("searching");
          }}
        >
          Find {insertedName || "record"}
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
        {error && (
          <p id={errorId} role="alert">
            {error}
          </p>
        )}
      </form>
      <figcaption className="sr-only" aria-live="polite">
        {phase === "ready"
          ? indexed
            ? "Insert record 9 to add it to both trees."
            : "No name index. Insert record 9, then search for it."
          : phase === "inserted"
            ? indexed
              ? `Inserted ${insertedName} into the table and added ${insertedName} → 9 to the sorted name index.`
              : `${insertedName} is the ninth record. Now search for that name.`
            : searching
              ? indexed
                ? searchStep === 0
                  ? `Search the name tree for ${insertedName}.`
                  : searchStep === 1
                    ? `The name-index leaf stores ${insertedName} → ID 9.`
                    : "Now search the primary-key tree for ID 9."
                : `Check row ${checked + 1}: does its name match ${insertedName}?`
              : indexed
                ? `Found ${insertedName}: 1 table row fetched; 8 skipped.`
                : `Found ${insertedName} after checking all nine rows.`}
      </figcaption>
    </figure>
  );
}

/** Tiny B+ tree: separator keys route to ordered, linked leaf pages. */
function IndexTree({
  rows,
  secondary,
  phase,
  checked,
  searchStep,
  scanning = false,
}: {
  rows: { id: number; name: string }[];
  secondary: boolean;
  phase: Phase;
  checked: number;
  searchStep: number;
  scanning?: boolean;
}) {
  const arrowId = useId();
  const pages = [rows.slice(0, 3), rows.slice(3, 6), rows.slice(6)];
  const targetPage = pages.findIndex((page) =>
    page.some((row) => row.id === 9),
  );
  const searching = phase === "searching";
  const found = phase === "done";
  const routing = secondary
    ? searching || found
    : !scanning && ((searching && searchStep >= 2) || found);
  const leafSelected = secondary && ((searching && searchStep >= 1) || found);
  const separators = pages
    .slice(1)
    .map((page) => (secondary ? page[0].name : String(page[0].id)));
  return (
    <section
      className="intro-tree"
      role="img"
      aria-label={
        secondary
          ? "Name-index B+ tree: sorted names in leaf pages point to primary-key IDs."
          : `Primary-key B+ tree: ID separators route to leaf pages containing ${rows.length} full records. ${scanning ? "The name search scans the linked leaves." : "ID 9 selects the rightmost leaf."}`
      }
    >
      <p className="intro-index-heading">
        {secondary
          ? "NAME INDEX · ORDERED BY NAME"
          : "PRIMARY KEY · ORDERED BY ID"}
      </p>
      <div
        className="intro-tree-root"
        data-active={routing || (scanning && searching)}
      >
        <span className="intro-tree-root-label">
          {secondary ? "Name separators" : "ID separators"}
        </span>
        <div>
          {separators.map((key, i) => (
            <span key={i}>{key}</span>
          ))}
        </div>
      </div>
      <svg
        className="intro-tree-branches"
        viewBox="0 0 600 64"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 8 8"
            refX="8"
            refY="4"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0 1 L8 4 L0 7" />
          </marker>
        </defs>
        {pages.map((_, i) => (
          <path
            key={i}
            d={`M300 0 V18 H${100 + i * 200} V64`}
            data-active={
              (routing && i === targetPage) ||
              (scanning && (searching || found) && i === 0)
            }
            markerEnd={`url(#${arrowId})`}
          />
        ))}
      </svg>
      <div className="intro-tree-leaves">
        {pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="intro-tree-page"
            data-active={
              (routing && pageIndex === targetPage) ||
              (scanning &&
                (searching || found) &&
                Math.min(2, Math.floor(checked / 3)) === pageIndex)
            }
          >
            <p className="intro-tree-page-label">LEAF {pageIndex + 1}</p>
            {page.map((row, i) => (
              <div
                key={row.id}
                className={secondary ? "intro-index-entry" : "intro-index-row"}
                data-new={row.id === 9}
                data-selected={secondary && row.id === 9 && leafSelected}
                data-current={
                  scanning && searching && pageIndex * 3 + i === checked
                }
                data-checked={scanning && pageIndex * 3 + i < checked}
                data-found={!secondary && row.id === 9 && found}
              >
                {secondary ? (
                  <>
                    <span>{row.name}</span>
                    <span>→ {row.id}</span>
                  </>
                ) : (
                  <>
                    <span>{String(row.id).padStart(2, "0")}</span>
                    <span>{row.name}</span>
                  </>
                )}
              </div>
            ))}
            {pageIndex === 2 && phase === "ready" && !secondary && (
              <div className="intro-tree-vacancy">9 · empty</div>
            )}
            {pageIndex < 2 && (
              <span
                className="intro-tree-leaf-link"
                data-active={scanning && checked >= (pageIndex + 1) * 3}
                aria-hidden="true"
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="intro-tree-caption">
        {secondary
          ? "Leaf entries: name → ID"
          : "Leaf entries: ID + full record"}
      </p>
    </section>
  );
}
