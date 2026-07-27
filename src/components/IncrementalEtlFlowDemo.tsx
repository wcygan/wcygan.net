import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";
import { KafkaIcon } from "~/components/icons/KafkaIcon";
import {
  COMPLETE_INCREMENTAL_ETL_SNAPSHOT,
  deriveIncrementalEtlSnapshot,
  INCREMENTAL_ETL_DURATION_MS,
  type IncrementalEtlActor,
  type IncrementalEtlActorStatus,
  type IncrementalEtlSnapshot,
  INITIAL_INCREMENTAL_ETL_SNAPSHOT,
} from "~/demos/incremental-etl-flow/model";

const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
const MAX_INCREMENTAL_ETL_FRAME_DELTA_MS = 100;

type EtlEventStyle = CSSProperties & {
  "--etl-handoff-index": number;
  "--etl-hop-progress": number;
};

type EtlSqlStyle = CSSProperties & {
  "--etl-sql-progress": number;
};

const ACTORS: readonly {
  id: IncrementalEtlActor;
  name: string;
  role: string;
}[] = [
  { id: "mysql", name: "MySQL", role: "Online database" },
  { id: "brooklin", name: "Brooklin", role: "Capture & publish" },
  { id: "kafka", name: "Kafka", role: "Accept & record" },
  { id: "gobblin", name: "Gobblin", role: "Read & write" },
  { id: "opal", name: "Opal", role: "Offline · HDFS" },
];

export function IncrementalEtlFlowDemo() {
  const { replay, snapshot } = useIncrementalEtlPlayback();
  const eventStyle: EtlEventStyle = {
    "--etl-handoff-index": snapshot.event.handoffIndex,
    "--etl-hop-progress": snapshot.event.hopProgress,
    opacity: snapshot.event.visible ? 1 : 0,
  };
  const sqlStyle: EtlSqlStyle = {
    "--etl-sql-progress": snapshot.sqlProgress,
  };

  return (
    <figure
      className="etl-flow-demo"
      data-graphic-frame="workbench"
      data-graphic-key="online-offline-data-flow"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      data-mysql-plan={snapshot.mysqlPlan}
      data-opal-plan={snapshot.opalPlan}
      aria-labelledby="etl-flow-title"
      aria-describedby="etl-flow-description"
    >
      <header className="etl-flow-header">
        <div>
          <p className="article-graphic-title" id="etl-flow-title">
            Online → Offline Data Flow
          </p>
          <p>
            Follow one <code>users</code> row from the online commit to its
            offline HDFS copy.
          </p>
          <p className="sr-only" id="etl-flow-description">
            The MySQL users record with id 42 and the Opal row on HDFS both
            start with plan free. The application submits an update, MySQL
            commits plan pro, and Brooklin captures the committed MySQL change
            and publishes a CDC event to Kafka. Kafka accepts the event and
            records it in the app.public.users topic. Gobblin reads that topic
            and writes the record into HDFS. Opal applies plan pro to the
            offline row. The final state has one online update synchronized to
            one offline row.
          </p>
        </div>
        <button
          className="etl-flow-replay"
          type="button"
          onClick={replay}
          aria-label="Replay online to offline data flow"
        >
          Replay
        </button>
      </header>

      <div
        className="etl-flow-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <div
          className="etl-flow-sql"
          data-active={snapshot.phase === "submitting" ? "true" : "false"}
        >
          <span>Application submits</span>
          <code>UPDATE users SET plan = &apos;pro&apos; WHERE id = 42</code>
          <i style={sqlStyle} />
        </div>

        <div className="etl-flow-route">
          <div className="etl-flow-handoffs">
            {[0, 1, 2, 3].map((index) => {
              const status =
                snapshot.isComplete || index < snapshot.event.handoffIndex
                  ? "complete"
                  : snapshot.event.visible &&
                      index === snapshot.event.handoffIndex
                    ? "active"
                    : "waiting";

              return (
                <svg
                  className="etl-flow-handoff"
                  viewBox="0 0 104 88"
                  preserveAspectRatio="none"
                  data-status={status}
                  key={index}
                >
                  <path
                    d="M 104 0 H 88 C 36 0 36 88 88 88 H 104"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              );
            })}
          </div>
          {ACTORS.map((actor) => (
            <EtlActor
              actor={actor.id}
              key={actor.id}
              name={actor.name}
              role={actor.role}
              snapshot={snapshot}
              status={snapshot.actors[actor.id]}
            />
          ))}

          <span
            className="etl-flow-event-leg"
            data-from={snapshot.event.from}
            data-to={snapshot.event.to}
            data-hop-state={snapshot.event.state}
            data-moving={
              snapshot.event.state === "traveling" ? "true" : "false"
            }
            data-visible={snapshot.event.visible ? "true" : "false"}
            style={eventStyle}
          >
            <code className="etl-flow-event-payload">
              <span>id 42</span>
              <span>{snapshot.event.payload}</span>
            </code>
          </span>
        </div>

        <div
          className="etl-flow-result"
          data-complete={snapshot.isComplete ? "true" : "false"}
        >
          <span>{snapshot.isComplete ? "Synchronized" : "Current step"}</span>
          <strong>{snapshot.status}</strong>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Complete. One online update produced one synchronized offline row. MySQL and Opal on HDFS both store plan pro for users id 42."
          : ""}
      </p>
    </figure>
  );
}

function EtlActor({
  actor,
  name,
  role,
  snapshot,
  status,
}: {
  actor: IncrementalEtlActor;
  name: string;
  role: string;
  snapshot: IncrementalEtlSnapshot;
  status: IncrementalEtlActorStatus;
}) {
  const detail = detailForActor(actor, snapshot, status);
  const plan =
    actor === "mysql"
      ? snapshot.mysqlPlan
      : actor === "opal"
        ? snapshot.opalPlan
        : null;

  return (
    <section
      className="etl-flow-actor"
      data-actor={actor}
      data-plan={plan ?? undefined}
      data-status={status}
    >
      <span
        className="etl-flow-actor-logo"
        data-logo={actor === "opal" ? "hdfs" : actor}
        aria-hidden="true"
      >
        <EtlActorLogo actor={actor} />
      </span>
      <header>
        <strong>{name}</strong>
        <span>{role}</span>
      </header>
      <div className="etl-flow-actor-state">
        <code>
          {plan ? (
            <>
              <span className="etl-flow-record-key">users.id=42 ·</span>
              <span className="etl-flow-plan-value">
                <span aria-hidden={plan !== "free"} data-plan-option="free">
                  free
                </span>
                <span aria-hidden={plan !== "pro"} data-plan-option="pro">
                  pro
                </span>
              </span>
            </>
          ) : (
            detail.value
          )}
        </code>
        <span>{detail.action}</span>
      </div>
    </section>
  );
}

function EtlActorLogo({ actor }: { actor: IncrementalEtlActor }) {
  switch (actor) {
    case "mysql":
      return <DatabaseIcon />;
    case "brooklin":
      return (
        <img
          src="/change-data-capture/brooklin.png"
          alt=""
          width="170"
          height="170"
          draggable="false"
        />
      );
    case "kafka":
      return <KafkaIcon />;
    case "gobblin":
      return (
        <img
          src="/change-data-capture/gobblin.png"
          alt=""
          width="400"
          height="400"
          draggable="false"
        />
      );
    case "opal":
      return (
        <img
          src="/change-data-capture/hdfs.png"
          alt=""
          width="575"
          height="270"
          draggable="false"
        />
      );
  }
}

function detailForActor(
  actor: IncrementalEtlActor,
  snapshot: IncrementalEtlSnapshot,
  status: IncrementalEtlActorStatus,
) {
  switch (actor) {
    case "mysql":
      return {
        value: `users.id=42 · ${snapshot.mysqlPlan}`,
        action:
          status === "waiting"
            ? "Source row"
            : status === "active"
              ? "Committing update"
              : "Committed update",
      };
    case "brooklin":
      return {
        value: "MySQL change → Kafka",
        action:
          status === "waiting"
            ? "Awaiting MySQL commit"
            : status === "active"
              ? "Capturing MySQL change"
              : snapshot.phase === "publishing"
                ? "Publishing CDC event to Kafka"
                : "Published CDC event to Kafka",
      };
    case "kafka":
      return {
        value: "topic app.public.users",
        action:
          status === "waiting"
            ? "Awaiting Brooklin event"
            : status === "active"
              ? "Accepting and recording event"
              : "Recorded in app.public.users",
      };
    case "gobblin":
      return {
        value: "app.public.users → HDFS",
        action:
          status === "waiting"
            ? "Awaiting users record"
            : status === "active"
              ? "Reading topic and writing record"
              : "Wrote record into HDFS",
      };
    case "opal":
      return {
        value: `users.id=42 · ${snapshot.opalPlan}`,
        action:
          status === "waiting"
            ? "Offline row"
            : status === "active"
              ? "Applying update"
              : "Applied update",
      };
  }
}

function useIncrementalEtlPlayback(): {
  replay: () => void;
  snapshot: IncrementalEtlSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_INCREMENTAL_ETL_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);

  useClientLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSnapshot(COMPLETE_INCREMENTAL_ETL_SNAPSHOT);
    }
  }, []);

  const replay = useCallback(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSnapshot(
      reducedMotion
        ? COMPLETE_INCREMENTAL_ETL_SNAPSHOT
        : INITIAL_INCREMENTAL_ETL_SNAPSHOT,
    );
    setPlaybackId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = reducedMotion.matches ? INCREMENTAL_ETL_DURATION_MS : 0;
    let previousFrame: number | undefined;

    const cancelFrame = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const renderSettledState = () => {
      cancelFrame();
      setSnapshot(COMPLETE_INCREMENTAL_ETL_SNAPSHOT);
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += Math.min(
          now - previousFrame,
          MAX_INCREMENTAL_ETL_FRAME_DELTA_MS,
        );
      }
      previousFrame = now;

      const progress = Math.min(1, elapsedMs / INCREMENTAL_ETL_DURATION_MS);
      setSnapshot(deriveIncrementalEtlSnapshot(progress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      cancelFrame();

      if (reducedMotion.matches) {
        renderSettledState();
        return;
      }
      if (!document.hidden && elapsedMs < INCREMENTAL_ETL_DURATION_MS) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const handleMotionPreference = () => {
      elapsedMs = reducedMotion.matches ? INCREMENTAL_ETL_DURATION_MS : 0;
      setSnapshot(
        reducedMotion.matches
          ? COMPLETE_INCREMENTAL_ETL_SNAPSHOT
          : INITIAL_INCREMENTAL_ETL_SNAPSHOT,
      );
      start();
    };

    const handleVisibility = () => {
      cancelFrame();

      if (!document.hidden) {
        start();
      }
    };

    start();
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelFrame();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [playbackId]);

  return { replay, snapshot };
}
