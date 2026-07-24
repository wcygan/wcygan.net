import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  deriveReplayTimelineSnapshot,
  INITIAL_REPLAY_SNAPSHOT,
  type LogRecord,
  type MemoryRecord,
  REPLAY_DURATION_MS,
  type ReplaySnapshot,
} from "~/demos/mysql-redo-log/replay-model";

export function MySqlRedoReplayDemo() {
  const { replay, snapshot } = useRedoReplayPlayback();
  const latestSequence = snapshot.lastAppliedRecord?.sequence ?? 100;
  const servedRowCount = presentRecords(snapshot.database).length;

  return (
    <figure
      className="redo-recovery"
      data-graphic-frame="workbench"
      data-graphic-key="redo-recovery"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="redo-recovery-title"
      aria-describedby="redo-recovery-description redo-recovery-caption"
    >
      <header className="redo-recovery-header">
        <div>
          <p className="article-graphic-title" id="redo-recovery-title">
            Commit log rebuilds the served state
          </p>
          <p id="redo-recovery-description">
            Each durable record is applied in order. The JSON shows what the
            database would serve after that step.
          </p>
        </div>
        <button
          className="redo-recovery-replay"
          type="button"
          onClick={replay}
          aria-label="Replay ordered redo recovery"
        >
          Replay
        </button>
      </header>

      <div className="redo-recovery-stage" data-graphic-stage="flush">
        <div className="redo-recovery-checkpoint" aria-hidden="true">
          <div>
            <span>Checkpoint loaded</span>
            <strong>Data files through LSN 100</strong>
          </div>
        </div>

        <div className="redo-recovery-flow" aria-hidden="true">
          <section className="redo-recovery-log">
            <header className="redo-recovery-log-header">
              <div>
                <span>Commit log</span>
                <strong>LSN 101 → 106</strong>
              </div>
              <code>{snapshot.databaseAppliedCount}/6 reflected</code>
            </header>

            <CommitLogTape snapshot={snapshot} />
          </section>

          <section
            className="redo-recovery-database"
            data-writing={snapshot.phase === "write" ? "true" : "false"}
            data-operation={snapshot.highlightedOperation ?? "NONE"}
          >
            <div className="redo-recovery-database-actor">
              <DatabaseIcon />
              <strong>Database</strong>
              <span>Serving LSN {latestSequence}</span>
              <code>
                {servedRowCount} {servedRowCount === 1 ? "row" : "rows"}
              </code>
            </div>
            <div className="redo-recovery-read-arrow">
              <span />
            </div>
            <JsonReadModel
              highlightedOperation={snapshot.highlightedOperation}
              highlightedRecordKey={snapshot.highlightedRecordKey}
              records={snapshot.database}
            />
          </section>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.phase === "complete"
          ? "Recovery complete. Six durable redo records were applied in increasing log sequence number order. The database now serves JSON containing Account A with balance 725 and Account B with balance 180. Account C is absent after its delete record."
          : ""}
      </p>

      <figcaption id="redo-recovery-caption">
        Conceptual row-level view: real InnoDB redo describes lower-level page
        changes, but the same ordered replay advances the data applications can
        read.
      </figcaption>
    </figure>
  );
}

function useRedoReplayPlayback(): {
  replay: () => void;
  snapshot: ReplaySnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_REPLAY_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);

  const replay = useCallback(() => {
    setSnapshot(INITIAL_REPLAY_SNAPSHOT);
    setPlaybackId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = 0;
    let previousFrame: number | undefined;

    const renderSettledRecovery = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;
      setSnapshot(deriveReplayTimelineSnapshot(1));
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const progress = Math.min(1, elapsedMs / REPLAY_DURATION_MS);
      setSnapshot(deriveReplayTimelineSnapshot(progress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;

      if (reducedMotion.matches) {
        renderSettledRecovery();
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      setSnapshot(INITIAL_REPLAY_SNAPSHOT);
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

function CommitLogTape({ snapshot }: { snapshot: ReplaySnapshot }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeSequence = snapshot.activeRecord?.sequence;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const activeRecord = viewport.querySelector<HTMLElement>(
      '[data-status="active"]',
    );
    const viewportBounds = viewport.getBoundingClientRect();
    const activeBounds = activeRecord?.getBoundingClientRect();
    const activeLeft = activeBounds
      ? activeBounds.left - viewportBounds.left + viewport.scrollLeft
      : 0;
    const left = activeBounds
      ? activeLeft - (viewport.clientWidth - activeBounds.width) / 2
      : viewport.scrollWidth - viewport.clientWidth;

    viewport.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      left: Math.max(0, left),
    });
  }, [activeSequence]);

  return (
    <div className="redo-recovery-tape-viewport" ref={viewportRef}>
      <ol className="redo-recovery-tape">
        {snapshot.records.map((record, index) => (
          <CommitLogTapeRecord
            key={record.sequence}
            record={record}
            isReflected={index < snapshot.databaseAppliedCount}
            progress={record.status === "active" ? snapshot.stepProgress : 1}
          />
        ))}
      </ol>
    </div>
  );
}

function CommitLogTapeRecord({
  isReflected,
  progress,
  record,
}: {
  isReflected: boolean;
  progress: number;
  record: ReplaySnapshot["records"][number];
}) {
  const progressStyle = {
    transform: `scaleX(${progress})`,
  } satisfies CSSProperties;

  return (
    <li
      className="redo-recovery-tape-record"
      data-operation={record.operation}
      data-reflected={isReflected ? "true" : "false"}
      data-status={record.status}
    >
      <code className="redo-recovery-tape-lsn">LSN {record.sequence}</code>
      <strong>{record.operation}</strong>
      <code className="redo-recovery-tape-effect">{tapeEffect(record)}</code>
      <span className="redo-recovery-tape-progress" style={progressStyle} />
    </li>
  );
}

function JsonReadModel({
  highlightedOperation,
  highlightedRecordKey,
  records,
}: {
  highlightedOperation?: ReplaySnapshot["highlightedOperation"];
  highlightedRecordKey?: MemoryRecord["key"];
  records: MemoryRecord[];
}) {
  const present = presentRecords(records);

  return (
    <div
      className="redo-recovery-json"
      data-operation={highlightedOperation ?? "NONE"}
    >
      <header>
        <span>Current query result</span>
        <code>{present.length} rows</code>
      </header>
      <code className="redo-recovery-json-blob">
        <span>{"{"}</span>
        <span className="redo-recovery-json-indent">{'"accounts": {'}</span>
        {present.map((record, index) => (
          <span
            className="redo-recovery-json-row"
            data-highlighted={
              record.key === highlightedRecordKey ? "true" : "false"
            }
            data-operation={
              record.key === highlightedRecordKey
                ? highlightedOperation
                : "NONE"
            }
            key={record.key}
          >
            {`"${record.key}": { "balance": ${record.balance} }${
              index === present.length - 1 ? "" : ","
            }`}
          </span>
        ))}
        <span className="redo-recovery-json-indent">{"}"}</span>
        <span>{"}"}</span>
      </code>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg
      className="redo-recovery-database-icon"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="24" cy="11" rx="15.5" ry="6" />
      <path d="M8.5 11v13c0 3.3 6.9 6 15.5 6s15.5-2.7 15.5-6V11" />
      <path d="M8.5 24v13c0 3.3 6.9 6 15.5 6s15.5-2.7 15.5-6V24" />
    </svg>
  );
}

function tapeEffect(record: LogRecord) {
  if (record.operation === "INSERT") {
    return `${record.recordKey}.balance = ${record.balance}`;
  }
  if (record.operation === "DELETE") {
    return `${record.recordKey} removed`;
  }
  return `${record.recordKey}.balance → ${record.balance}`;
}

function presentRecords(records: MemoryRecord[]) {
  return records.filter((record) => record.status === "present");
}
