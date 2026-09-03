import { useCallback, useEffect, useState } from "react";
import { DemoReplayButton } from "~/components/DemoReplayButton";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";
import { KafkaIcon } from "~/components/icons/KafkaIcon";
import {
  COMPLETE_RECONCILIATION_SNAPSHOT,
  deriveReconciliationSnapshot,
  INITIAL_RECONCILIATION_SNAPSHOT,
  RECONCILIATION_DURATION_MS,
  type ReconciliationSnapshot,
} from "~/demos/reconciliation-loop/model";

const STEPS = [
  {
    num: 1,
    title: "1. Query lake",
    desc: "Airflow triggers Trino to scan Iceberg & find drift",
  },
  {
    num: 2,
    title: "2. Publish event",
    desc: "Trino emits repair message to Kafka log",
  },
  {
    num: 3,
    title: "3. Apply idempotently",
    desc: "Flink consumes event & upserts MySQL row",
  },
  {
    num: 4,
    title: "4. Close loop",
    desc: "Debezium streams change back into Iceberg",
  },
] as const;

export function ReconciliationLoopDemo() {
  const { replay, snapshot } = useReconciliationPlayback();

  return (
    <figure
      className="reconciliation-demo"
      data-graphic-frame="workbench"
      data-graphic-key="reconciliation-loop"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="reconciliation-title"
      aria-describedby="reconciliation-description reconciliation-caption"
    >
      <header className="reconciliation-header">
        <div>
          <p className="article-graphic-title" id="reconciliation-title">
            Scheduled reconciliation repairs data drift
          </p>
          <p id="reconciliation-description">
            A scheduled query identifies stale records in the database,
            publishes idempotent repair events, and streams the fixed state back
            to the lake.
          </p>
        </div>
        <DemoReplayButton
          ariaLabel="Replay reconciliation lifecycle"
          isComplete={snapshot.isComplete}
          onReplay={replay}
        />
      </header>

      <div
        className="reconciliation-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        {/* Step tracker ribbon */}
        <ol className="reconciliation-steps">
          {STEPS.map((s) => {
            const isActive = snapshot.activeStep === s.num;
            const isDone =
              snapshot.isComplete ||
              (snapshot.activeStep !== null && snapshot.activeStep > s.num);
            return (
              <li
                key={s.num}
                className="reconciliation-step-item"
                data-active={isActive ? "true" : "false"}
                data-done={isDone ? "true" : "false"}
              >
                <div className="reconciliation-step-dot">
                  <span>{isDone ? "✓" : s.num}</span>
                </div>
                <div className="reconciliation-step-text">
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Live System State Grid */}
        <div className="reconciliation-system-grid">
          {/* Data Lake (Iceberg) */}
          <div
            className="reconciliation-card"
            data-active={
              snapshot.activeStep === 1 || snapshot.activeStep === 4
                ? "true"
                : "false"
            }
          >
            <div className="reconciliation-card-header">
              <span className="reconciliation-badge">Data Lake</span>
              <strong>Apache Iceberg</strong>
            </div>
            <div className="reconciliation-card-body">
              <div className="reconciliation-field-row">
                <span className="reconciliation-field-label">
                  User 42 (Audit):
                </span>
                <code className="reconciliation-code">
                  plan: &apos;{snapshot.lakeRowState.plan}&apos;
                </code>
              </div>
              <div
                className="reconciliation-state-tag"
                data-state={snapshot.lakeRowState.status}
              >
                {snapshot.lakeRowState.status === "stale" &&
                snapshot.phase !== "idle"
                  ? "Drift Detected"
                  : snapshot.lakeRowState.status === "indexed"
                    ? "Synced Clean"
                    : "Scanning Lake"}
              </div>
            </div>
          </div>

          {/* Stream Log (Kafka) */}
          <div
            className="reconciliation-card"
            data-active={snapshot.activeStep === 2 ? "true" : "false"}
          >
            <div className="reconciliation-card-header">
              <span className="reconciliation-badge">Event Log</span>
              <div className="reconciliation-card-title-group">
                <KafkaIcon className="reconciliation-icon" />
                <strong>Kafka</strong>
              </div>
            </div>
            <div className="reconciliation-card-body">
              <div className="reconciliation-field-row">
                <span className="reconciliation-field-label">
                  Repair Topic:
                </span>
                <code className="reconciliation-code">
                  {snapshot.kafkaRepairCount > 0 ? "1 event" : "0 events"}
                </code>
              </div>
              <div
                className="reconciliation-state-tag"
                data-state={snapshot.kafkaRepairCount > 0 ? "repaired" : "idle"}
              >
                {snapshot.kafkaRepairCount > 0
                  ? "repair.users {id:42, plan:'pro'}"
                  : "Awaiting Repair Event"}
              </div>
            </div>
          </div>

          {/* Operational Datastore (MySQL) */}
          <div
            className="reconciliation-card"
            data-active={snapshot.activeStep === 3 ? "true" : "false"}
          >
            <div className="reconciliation-card-header">
              <span className="reconciliation-badge">Datastore</span>
              <div className="reconciliation-card-title-group">
                <DatabaseIcon className="reconciliation-icon" />
                <strong>MySQL</strong>
              </div>
            </div>
            <div className="reconciliation-card-body">
              <div className="reconciliation-field-row">
                <span className="reconciliation-field-label">
                  User 42 (Live):
                </span>
                <code
                  className="reconciliation-code"
                  data-highlight={
                    snapshot.dbRowState.status === "repaired"
                      ? "success"
                      : "none"
                  }
                >
                  plan: &apos;{snapshot.dbRowState.plan}&apos;
                </code>
              </div>
              <div
                className="reconciliation-state-tag"
                data-state={snapshot.dbRowState.status}
              >
                {snapshot.dbRowState.status === "stale"
                  ? "Stale ('free')"
                  : snapshot.dbRowState.status === "updating"
                    ? "Flink Upserting..."
                    : "Idempotently Repaired ('pro')"}
              </div>
            </div>
          </div>
        </div>

        {/* Live Narrative Status Bar */}
        <div
          className="reconciliation-status-bar"
          data-complete={snapshot.isComplete ? "true" : "false"}
        >
          <div className="reconciliation-status-pulse" />
          <span className="reconciliation-status-text">
            {snapshot.phaseLabel}
          </span>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Reconciliation complete. Airflow identified drift via Trino, emitted repair event to Kafka, Flink idempotently updated MySQL user 42 to pro, and Debezium change data capture indexed the clean record into Iceberg."
          : ""}
      </p>

      <figcaption id="reconciliation-caption">
        Because repair events are applied idempotently by Flink, running the
        scheduled reconciliation repeatedly is safe and guarantees convergence.
      </figcaption>
    </figure>
  );
}

function useReconciliationPlayback(): {
  replay: () => void;
  snapshot: ReconciliationSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_RECONCILIATION_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);

  const replay = useCallback(() => {
    setSnapshot(INITIAL_RECONCILIATION_SNAPSHOT);
    setPlaybackId((id) => id + 1);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let previousFrame: number | undefined;
    let elapsedMs = 0;
    let completed = false;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stopFrame = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const renderComplete = () => {
      stopFrame();
      completed = true;
      setSnapshot(COMPLETE_RECONCILIATION_SNAPSHOT);
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const progress = elapsedMs / RECONCILIATION_DURATION_MS;
      const next = deriveReconciliationSnapshot(progress);
      setSnapshot(next);

      if (next.isComplete) {
        completed = true;
        stopFrame();
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      stopFrame();
      if (motionQuery.matches) {
        renderComplete();
        return;
      }
      if (completed || document.hidden) return;

      animationFrame = window.requestAnimationFrame((now) => {
        previousFrame = now;
        animationFrame = window.requestAnimationFrame(tick);
      });
    };

    const handleMotionPreference = () => {
      if (motionQuery.matches) {
        renderComplete();
      } else {
        completed = true;
        setSnapshot(COMPLETE_RECONCILIATION_SNAPSHOT);
      }
    };

    const handleVisibility = () => {
      stopFrame();
      if (!document.hidden && !motionQuery.matches && !completed) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    start();
    motionQuery.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopFrame();
      motionQuery.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [playbackId]);

  return { replay, snapshot };
}
