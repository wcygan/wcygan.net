import { type CSSProperties, useCallback, useEffect, useState } from "react";
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
  const phase = replayPhase(snapshot);

  return (
    <figure
      className="redo-recovery"
      data-graphic-frame="workbench"
      data-graphic-key="redo-recovery"
      data-phase={phase}
      aria-labelledby="redo-recovery-title"
      aria-describedby="redo-recovery-description redo-recovery-caption"
    >
      <header className="redo-recovery-header">
        <div>
          <p className="article-graphic-title" id="redo-recovery-title">
            Crash recovery follows the durable log
          </p>
          <p id="redo-recovery-description">
            InnoDB starts from the checkpoint and applies each later record
            once, in increasing log sequence number order.
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
            <span>Start point</span>
            <strong>Checkpoint on disk</strong>
          </div>
          <code>A 900 · B 250 · C —</code>
        </div>

        <div className="redo-recovery-body" aria-hidden="true">
          <section className="redo-recovery-ledger">
            <div className="redo-recovery-section-header">
              <div>
                <span>Durable redo</span>
                <strong>LSN 101 → 106</strong>
              </div>
              <code>{snapshot.appliedCount}/6 applied</code>
            </div>

            <ol className="redo-recovery-log">
              {snapshot.records.map((record) => (
                <RedoLogRow
                  key={record.sequence}
                  record={record}
                  progress={
                    record.status === "applied"
                      ? 1
                      : record.status === "active"
                        ? snapshot.stepProgress
                        : 0
                  }
                />
              ))}
            </ol>
          </section>

          <section className="redo-recovery-state">
            <div className="redo-recovery-section-header">
              <div>
                <span>Recovered state</span>
                <strong>Checkpoint + applied redo</strong>
              </div>
              <code>+{snapshot.appliedCount}</code>
            </div>

            <div className="redo-recovery-records">
              {snapshot.database.map((record) => (
                <RecoveredRecord
                  key={record.key}
                  record={record}
                  isTarget={
                    snapshot.stepProgress > 0 &&
                    snapshot.activeRecord?.recordKey === record.key
                  }
                />
              ))}
            </div>
          </section>
        </div>

        <div className="redo-recovery-status" aria-hidden="true">
          <div>
            <span>
              {phase === "complete" ? "Recovered result" : "Replay cursor"}
            </span>
            <p key={snapshot.phaseLabel}>{snapshot.phaseLabel}</p>
          </div>
          <code data-visible={phase === "complete" ? "true" : "false"}>
            A 725 · B 180 · C deleted
          </code>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === "complete"
          ? "Recovery complete. Six durable redo records were applied in increasing log sequence number order. Account A has balance 725, Account B has balance 180, and Account C is deleted."
          : ""}
      </p>

      <figcaption id="redo-recovery-caption">
        Conceptual model: the account rows make ordered replay visible; real
        InnoDB redo describes lower-level page changes.
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

function RedoLogRow({
  progress,
  record,
}: {
  progress: number;
  record: ReplaySnapshot["records"][number];
}) {
  const progressStyle = {
    transform: `scaleX(${progress})`,
  } satisfies CSSProperties;

  return (
    <li className="redo-recovery-log-row" data-status={record.status}>
      <span className="redo-recovery-log-progress" style={progressStyle} />
      <code>{record.sequence}</code>
      <span>
        <strong>{record.operation}</strong> {record.recordLabel}
      </span>
      <code>{recordEffect(record)}</code>
    </li>
  );
}

function RecoveredRecord({
  isTarget,
  record,
}: {
  isTarget: boolean;
  record: MemoryRecord;
}) {
  return (
    <div
      className="redo-recovery-record"
      data-status={record.status}
      data-target={isTarget ? "true" : "false"}
    >
      <div>
        <code>{record.key}</code>
        <span>{record.label}</span>
      </div>
      <div>
        <span>{recordStateLabel(record)}</span>
        <strong>{recordValue(record)}</strong>
      </div>
    </div>
  );
}

function recordEffect(record: LogRecord) {
  if (record.operation === "DELETE") return "remove";
  if (record.operation === "INSERT") return `+${record.balance}`;
  return `→ ${record.balance}`;
}

function recordStateLabel(record: MemoryRecord) {
  if (record.lastOperation) return record.lastOperation.toLowerCase();
  if (record.status === "missing") return "not on disk";
  return "checkpoint";
}

function recordValue(record: MemoryRecord) {
  if (record.status === "missing") return "—";
  if (record.status === "deleted") return "deleted";
  return record.balance;
}

function replayPhase(snapshot: ReplaySnapshot) {
  if (snapshot.appliedCount >= snapshot.records.length) return "complete";
  if (snapshot.appliedCount === 0 && snapshot.stepProgress === 0) {
    return "checkpoint";
  }
  return "replay";
}
