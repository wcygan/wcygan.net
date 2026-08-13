import {
  type CSSProperties,
  Fragment,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";
import { KafkaIcon } from "~/components/icons/KafkaIcon";
import {
  type ActorStatus,
  COMPLETE_INGESTION_SNAPSHOT,
  COMPLETE_REPAIR_SNAPSHOT,
  deriveIngestionSnapshot,
  deriveRepairSnapshot,
  type FlowEvent,
  INGESTION_DURATION_MS,
  type IngestionActor,
  type IngestionSnapshot,
  INITIAL_INGESTION_SNAPSHOT,
  INITIAL_REPAIR_SNAPSHOT,
  REPAIR_DURATION_MS,
  type RepairActor,
  type RepairSnapshot,
} from "~/demos/reconciliation/model";

const MAX_FRAME_DELTA_MS = 100;
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type PacketStyle = CSSProperties & {
  "--reconciliation-hop-progress": number;
};

type ActorDefinition<Actor extends string> = {
  id: Actor;
  name: string;
  role: string;
  icon: ActorIconKind;
};

type ActorIconKind =
  | "airflow"
  | "database"
  | "debezium"
  | "flink"
  | "kafka"
  | "lake"
  | "trino";

const INGESTION_ACTORS: readonly ActorDefinition<IngestionActor>[] = [
  {
    id: "mysql",
    name: "MySQL",
    role: "Orders database",
    icon: "database",
  },
  {
    id: "debezium",
    name: "Debezium",
    role: "Read DB changes",
    icon: "debezium",
  },
  {
    id: "kafka",
    name: "Kafka",
    role: "CDC topic",
    icon: "kafka",
  },
  {
    id: "flink",
    name: "Flink ingestion",
    role: "Write cold data",
    icon: "flink",
  },
  {
    id: "lake",
    name: "Data lake",
    role: "Hadoop / HDFS",
    icon: "lake",
  },
] as const;

const REPAIR_ACTORS: readonly ActorDefinition<
  Exclude<RepairActor, "airflow" | "lake">
>[] = [
  {
    id: "trino",
    name: "Trino",
    role: "Compare versions",
    icon: "trino",
  },
  {
    id: "kafka",
    name: "Kafka",
    role: "Repair topic",
    icon: "kafka",
  },
  {
    id: "flink",
    name: "Flink repair",
    role: "Apply idempotently",
    icon: "flink",
  },
  {
    id: "mysql",
    name: "MySQL",
    role: "Orders database",
    icon: "database",
  },
] as const;

export function ReconciliationIngestionDemo() {
  const { figureRef, replay, snapshot } = useFinitePlayback({
    completeSnapshot: COMPLETE_INGESTION_SNAPSHOT,
    deriveSnapshot: deriveIngestionSnapshot,
    durationMs: INGESTION_DURATION_MS,
    initialSnapshot: INITIAL_INGESTION_SNAPSHOT,
  });

  return (
    <figure
      className="reconciliation-demo reconciliation-demo--ingestion"
      ref={figureRef}
      data-graphic-frame="workbench"
      data-graphic-key="reconciliation-ingestion"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="reconciliation-ingestion-title"
      aria-describedby="reconciliation-ingestion-description reconciliation-ingestion-caption"
    >
      <DiagramHeader
        description="One committed order moves from MySQL into retained Hadoop data."
        onReplay={replay}
        replayLabel="Replay continuous ingestion flow"
        title="Continuous ingestion keeps a trusted history"
        titleId="reconciliation-ingestion-title"
      />

      <div
        className="reconciliation-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <ContextBand label="Input" value="order 42 · source version 7" />

        <div className="reconciliation-pipeline">
          {INGESTION_ACTORS.map((actor, index) => (
            <Fragment key={actor.id}>
              <ActorCard
                actor={actor}
                state={ingestionActorState(actor.id, snapshot)}
                status={snapshot.actors[actor.id]}
              />
              {index < INGESTION_ACTORS.length - 1 ? (
                <Handoff
                  event={snapshot.event}
                  index={index}
                  isComplete={index < snapshot.completedHandoffs}
                />
              ) : null}
            </Fragment>
          ))}
        </div>

        <StatusBand
          isComplete={snapshot.isComplete}
          label={snapshot.isComplete ? "Retained state" : "Current step"}
          status={snapshot.status}
        />
      </div>

      <p className="sr-only" id="reconciliation-ingestion-description">
        MySQL stores order 42 at source version 7. Debezium reads the committed
        database change and publishes a CDC event to Kafka. A Flink ingestion
        job consumes the event and stores source version 7 in the Hadoop data
        lake.
      </p>
      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Ingestion complete. The data lake retains order 42 at source version 7."
          : ""}
      </p>
      <figcaption id="reconciliation-ingestion-caption">
        The continuous path creates the retained view that reconciliation can
        inspect later.
      </figcaption>
    </figure>
  );
}

export function ReconciliationRepairDemo() {
  const { figureRef, replay, snapshot } = useFinitePlayback({
    completeSnapshot: COMPLETE_REPAIR_SNAPSHOT,
    deriveSnapshot: deriveRepairSnapshot,
    durationMs: REPAIR_DURATION_MS,
    initialSnapshot: INITIAL_REPAIR_SNAPSHOT,
  });
  const isRepaired = snapshot.mysqlVersion === 7;

  return (
    <figure
      className="reconciliation-demo reconciliation-demo--repair"
      ref={figureRef}
      data-graphic-frame="workbench"
      data-graphic-key="reconciliation-repair"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="reconciliation-repair-title"
      aria-describedby="reconciliation-repair-description reconciliation-repair-caption"
    >
      <DiagramHeader
        description="A scheduled comparison turns one version mismatch into repair intent."
        onReplay={replay}
        replayLabel="Replay scheduled repair flow"
        title="Scheduled repair closes the drift"
        titleId="reconciliation-repair-title"
      />

      <div
        className="reconciliation-stage reconciliation-repair-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <ContextBand
          label="Comparison"
          value={isRepaired ? "MySQL v7 = trusted v7" : "MySQL v6 ≠ trusted v7"}
          tone={isRepaired ? "settled" : "drift"}
        />

        <div className="reconciliation-repair-pipeline">
          <div className="reconciliation-repair-inputs">
            <ActorCard
              actor={{
                id: "airflow",
                name: "Airflow",
                role: "Schedule the run",
                icon: "airflow",
              }}
              state="daily run"
              status={snapshot.actors.airflow}
            />
            <ActorCard
              actor={{
                id: "lake",
                name: "Data lake",
                role: "Hadoop / HDFS",
                icon: "lake",
              }}
              state="trusted v7"
              status={snapshot.actors.lake}
            />
          </div>

          <RepairMerge snapshot={snapshot} />

          {REPAIR_ACTORS.map((actor, index) => (
            <Fragment key={actor.id}>
              <ActorCard
                actor={actor}
                isDrifted={actor.id === "mysql" && !isRepaired}
                state={repairActorState(actor.id, snapshot)}
                status={snapshot.actors[actor.id]}
              />
              {index < REPAIR_ACTORS.length - 1 ? (
                <Handoff
                  event={snapshot.event}
                  index={index}
                  isComplete={index < snapshot.completedHandoffs}
                />
              ) : null}
            </Fragment>
          ))}
        </div>

        <StatusBand
          isComplete={snapshot.isComplete}
          label={snapshot.isComplete ? "Invariant restored" : "Current step"}
          status={snapshot.status}
        />
      </div>

      <p className="sr-only" id="reconciliation-repair-description">
        MySQL has regressed to source version 6 while the Hadoop data lake
        retains source version 7. Airflow schedules a Trino comparison. Trino
        finds the mismatch and publishes a versioned repair event to Kafka. A
        separate Flink repair job consumes the event and applies source version
        7 to MySQL without moving newer state backward.
      </p>
      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Repair complete. MySQL source version 7 now matches the trusted data lake."
          : ""}
      </p>
      <figcaption id="reconciliation-repair-caption">
        Batch detects the mismatch. Kafka carries repair intent. The online
        processor applies the source version idempotently.
      </figcaption>
    </figure>
  );
}

function DiagramHeader({
  description,
  onReplay,
  replayLabel,
  title,
  titleId,
}: {
  description: string;
  onReplay: () => void;
  replayLabel: string;
  title: string;
  titleId: string;
}) {
  return (
    <header className="reconciliation-header">
      <div>
        <p className="article-graphic-title" id={titleId}>
          {title}
        </p>
        <p>{description}</p>
      </div>
      <button
        className="reconciliation-replay"
        type="button"
        onClick={onReplay}
        aria-label={replayLabel}
      >
        Replay
      </button>
    </header>
  );
}

function ContextBand({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "drift" | "neutral" | "settled";
  value: string;
}) {
  return (
    <div className="reconciliation-context" data-tone={tone}>
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function ActorCard<Actor extends string>({
  actor,
  isDrifted = false,
  state,
  status,
}: {
  actor: ActorDefinition<Actor>;
  isDrifted?: boolean;
  state: string;
  status: ActorStatus;
}) {
  return (
    <section
      className="reconciliation-actor"
      data-actor={actor.id}
      data-drifted={isDrifted ? "true" : "false"}
      data-status={status}
    >
      <span className="reconciliation-actor-icon" aria-hidden="true">
        <ActorIcon kind={actor.icon} />
      </span>
      <header>
        <strong>{actor.name}</strong>
        <span>{actor.role}</span>
      </header>
      <code>{state}</code>
    </section>
  );
}

function Handoff({
  event,
  index,
  isComplete,
}: {
  event: FlowEvent;
  index: number;
  isComplete: boolean;
}) {
  const isActive = event.visible && event.handoffIndex === index;
  const style: PacketStyle = {
    "--reconciliation-hop-progress": isActive ? event.hopProgress : 0,
  };

  return (
    <div
      className="reconciliation-handoff"
      data-status={isComplete ? "complete" : isActive ? "active" : "waiting"}
    >
      <span className="reconciliation-handoff-line" />
      {isActive ? (
        <span
          className="reconciliation-packet"
          data-moving={event.state === "traveling" ? "true" : "false"}
          data-payload={event.payload}
          style={style}
        />
      ) : null}
    </div>
  );
}

function RepairMerge({ snapshot }: { snapshot: RepairSnapshot }) {
  const scheduleActive = snapshot.phase === "scheduling";
  const lakeActive = snapshot.phase === "scanning";

  return (
    <div
      className="reconciliation-repair-merge"
      data-lake-active={lakeActive ? "true" : "false"}
      data-schedule-active={scheduleActive ? "true" : "false"}
    >
      <svg
        className="reconciliation-repair-merge-desktop"
        viewBox="0 0 32 144"
        preserveAspectRatio="none"
      >
        <path
          className="reconciliation-merge-schedule"
          d="M0 34 C16 34 16 72 32 72"
        />
        <path
          className="reconciliation-merge-lake"
          d="M0 110 C16 110 16 72 32 72"
        />
      </svg>
      <svg
        className="reconciliation-repair-merge-mobile"
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
      >
        <path
          className="reconciliation-merge-schedule"
          d="M25 0 C25 14 50 14 50 28"
        />
        <path
          className="reconciliation-merge-lake"
          d="M75 0 C75 14 50 14 50 28"
        />
      </svg>
    </div>
  );
}

function StatusBand({
  isComplete,
  label,
  status,
}: {
  isComplete: boolean;
  label: string;
  status: string;
}) {
  return (
    <div
      className="reconciliation-status"
      data-complete={isComplete ? "true" : "false"}
    >
      <span>{label}</span>
      <strong>{status}</strong>
    </div>
  );
}

function ingestionActorState(
  actor: IngestionActor,
  snapshot: IngestionSnapshot,
) {
  switch (actor) {
    case "mysql":
      return "order 42 · v7 · paid";
    case "debezium":
      return snapshot.actors.debezium === "waiting"
        ? "binlog cursor"
        : "captured v7";
    case "kafka":
      return snapshot.actors.kafka === "waiting"
        ? "orders.cdc"
        : "offset 81 · v7";
    case "flink":
      return snapshot.actors.flink === "waiting"
        ? "await CDC event"
        : "append order 42";
    case "lake":
      return snapshot.lakeVersion === null
        ? "await source version"
        : "order 42 · trusted v7";
  }
}

function repairActorState(
  actor: Exclude<RepairActor, "airflow" | "lake">,
  snapshot: RepairSnapshot,
) {
  switch (actor) {
    case "trino":
      return snapshot.mismatchFound
        ? "found v6 ≠ trusted v7"
        : "compare versions";
    case "kafka":
      return snapshot.repairPublished
        ? "order 42 · repair v7"
        : "await repair event";
    case "flink":
      return snapshot.completedHandoffs >= 2
        ? "source_version = 7"
        : "await repair event";
    case "mysql":
      return `order 42 · v${snapshot.mysqlVersion} · ${snapshot.mysqlState}`;
  }
}

function ActorIcon({ kind }: { kind: ActorIconKind }) {
  if (kind === "database") return <DatabaseIcon />;
  if (kind === "kafka") return <KafkaIcon />;

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {actorIconPaths(kind)}
    </svg>
  );
}

function actorIconPaths(kind: Exclude<ActorIconKind, "database" | "kafka">) {
  switch (kind) {
    case "airflow":
      return (
        <>
          <circle cx="16" cy="16" r="9" />
          <path d="M16 10v6l4 3M16 4v3M16 25v3M4 16h3M25 16h3" />
        </>
      );
    case "debezium":
      return (
        <>
          <path d="M7 8h11M7 13h7M7 18h9" />
          <path d="M19 14l6 4-6 4v-3h-5v-2h5z" />
          <rect x="5" y="5" width="16" height="20" rx="2" />
        </>
      );
    case "flink":
      return (
        <>
          <path d="M5 10h13l-3-3M18 10l-3 3M27 22H14l3-3M14 22l3 3" />
          <circle cx="24" cy="10" r="2" />
          <circle cx="8" cy="22" r="2" />
        </>
      );
    case "lake":
      return (
        <>
          <path d="M5 10c3 2 6 2 9 0s6-2 13 0M5 16c3 2 6 2 9 0s6-2 13 0M5 22c3 2 6 2 9 0s6-2 13 0" />
        </>
      );
    case "trino":
      return (
        <>
          <circle cx="14" cy="14" r="7" />
          <path d="m19 19 7 7M10 14h8M14 10v8" />
        </>
      );
  }
}

function useFinitePlayback<Snapshot>({
  completeSnapshot,
  deriveSnapshot,
  durationMs,
  initialSnapshot,
}: {
  completeSnapshot: Snapshot;
  deriveSnapshot: (progress: number) => Snapshot;
  durationMs: number;
  initialSnapshot: Snapshot;
}): {
  figureRef: RefObject<HTMLElement | null>;
  replay: () => void;
  snapshot: Snapshot;
} {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [playbackId, setPlaybackId] = useState(0);
  const figureRef = useRef<HTMLElement>(null);

  useClientLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSnapshot(completeSnapshot);
    }
  }, [completeSnapshot]);

  const replay = useCallback(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSnapshot(reducedMotion ? completeSnapshot : initialSnapshot);
    setPlaybackId((current) => current + 1);
  }, [completeSnapshot, initialSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = reducedMotion.matches ? durationMs : 0;
    let isInViewport = typeof IntersectionObserver === "undefined";
    let previousFrame: number | undefined;

    const cancelFrame = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const renderComplete = () => {
      elapsedMs = durationMs;
      cancelFrame();
      setSnapshot(completeSnapshot);
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += Math.min(now - previousFrame, MAX_FRAME_DELTA_MS);
      }
      previousFrame = now;

      const progress = Math.min(1, elapsedMs / durationMs);
      setSnapshot(deriveSnapshot(progress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      cancelFrame();

      if (reducedMotion.matches) {
        renderComplete();
        return;
      }
      if (!document.hidden && isInViewport && elapsedMs < durationMs) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const handleMotionPreference = () => {
      elapsedMs = reducedMotion.matches ? durationMs : 0;
      setSnapshot(reducedMotion.matches ? completeSnapshot : initialSnapshot);
      start();
    };

    const handleVisibility = () => {
      cancelFrame();
      if (!document.hidden) start();
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              isInViewport = entry.isIntersecting;
              cancelFrame();
              if (isInViewport) start();
            },
            { rootMargin: "80px 0px" },
          );

    const figure = figureRef.current;
    if (observer && figure) {
      observer.observe(figure);
    } else {
      start();
    }
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelFrame();
      observer?.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    completeSnapshot,
    deriveSnapshot,
    durationMs,
    initialSnapshot,
    playbackId,
  ]);

  return { figureRef, replay, snapshot };
}
