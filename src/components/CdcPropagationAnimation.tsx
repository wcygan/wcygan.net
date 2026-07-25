import {
  type CSSProperties,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DemoReplayButton } from "~/components/DemoReplayButton";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";
import {
  CDC_PROPAGATION_DURATION_MS,
  type CdcPropagationSnapshot,
  deriveCdcPropagationSnapshot,
  INITIAL_CDC_PROPAGATION_SNAPSHOT,
} from "~/demos/cdc-propagation/model";

type MotionGeometry = {
  eventStartX: number;
  eventStartY: number;
  eventTravelX: number;
  eventTravelY: number;
  sqlTravelX: number;
  sqlTravelY: number;
};

const INITIAL_MOTION_GEOMETRY: MotionGeometry = {
  eventStartX: 0,
  eventStartY: 0,
  eventTravelX: 0,
  eventTravelY: 0,
  sqlTravelX: 0,
  sqlTravelY: 0,
};

const SQL_INLINE_CLEARANCE_PX = 16;

export function CdcPropagationAnimation() {
  const { replay, snapshot } = useCdcPropagationPlayback();
  const sqlOriginRef = useRef<HTMLDivElement>(null);
  const postgresActorRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef<HTMLSpanElement>(null);
  const motionGeometry = useCdcPropagationGeometry({
    eventRef,
    postgresActorRef,
    railRef,
    sqlOriginRef,
  });

  const sqlStyle = {
    opacity: snapshot.sqlOpacity,
    transform: `translate3d(${
      motionGeometry.sqlTravelX * snapshot.sqlProgress
    }px, ${motionGeometry.sqlTravelY * snapshot.sqlProgress}px, 0)`,
  } satisfies CSSProperties;
  const eventStyle = {
    opacity: snapshot.eventOpacity,
    transform: `translate3d(${
      motionGeometry.eventStartX +
      motionGeometry.eventTravelX * snapshot.eventProgress
    }px, ${
      motionGeometry.eventStartY +
      motionGeometry.eventTravelY * snapshot.eventProgress
    }px, 0)`,
  } satisfies CSSProperties;
  const sqlIsMoving =
    snapshot.phase === "writing" &&
    snapshot.sqlProgress > 0 &&
    snapshot.sqlProgress < 1;
  const eventIsMoving =
    snapshot.phase === "propagating" &&
    snapshot.eventProgress > 0 &&
    snapshot.eventProgress < 1;
  const boundaryIsActive =
    snapshot.phase === "propagating" &&
    snapshot.eventProgress >= 0.4 &&
    snapshot.eventProgress <= 0.6;

  return (
    <figure
      className="cdc-propagation"
      data-graphic-frame="workbench"
      data-graphic-key="cdc-propagation"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="cdc-propagation-title"
      aria-describedby="cdc-propagation-description"
    >
      <header className="cdc-propagation-header">
        <p className="article-graphic-title" id="cdc-propagation-title">
          A committed update reaches Redis
        </p>
        <DemoReplayButton
          ariaLabel="Replay change data propagation"
          isComplete={snapshot.isComplete}
          onReplay={replay}
        />
      </header>

      <p className="sr-only" id="cdc-propagation-description">
        Postgres commits plan pro before Redis applies the CDC record. Redis
        briefly remains on plan free, then matches Postgres.
      </p>

      <div
        className="cdc-propagation-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <div className="cdc-propagation-sql-origin" ref={sqlOriginRef}>
          <pre
            className="cdc-propagation-sql"
            data-moving={sqlIsMoving ? "true" : "false"}
            data-visible={snapshot.sqlOpacity > 0 ? "true" : "false"}
            style={sqlStyle}
          >
            <code>
              <span>
                <span data-token="keyword">UPDATE</span> users
              </span>
              <span>
                <span data-token="keyword">SET</span> plan{" "}
                <span data-token="operator">=</span>{" "}
                <span data-token="punctuation">'</span>
                <span data-token="string">pro</span>
                <span data-token="punctuation">'</span>
              </span>
              <span>
                <span data-token="keyword">WHERE</span> id{" "}
                <span data-token="operator">=</span>{" "}
                <span data-token="number">42</span>;
              </span>
            </code>
          </pre>
        </div>

        <div className="cdc-propagation-input">
          <div className="cdc-propagation-input-copy">
            <strong>User 42 upgrades to pro</strong>
          </div>
        </div>

        <div className="cdc-propagation-route">
          <DatabaseActor
            acceptanceFlash={snapshot.postgresAcceptanceFlash}
            actorRef={postgresActorRef}
            label="Postgres"
            planProgress={snapshot.postgresPlanProgress}
            system="postgres"
          />

          <div className="cdc-propagation-rail" ref={railRef}>
            <span className="cdc-propagation-rail-line" />
            <span
              className="cdc-propagation-boundary"
              data-active={boundaryIsActive ? "true" : "false"}
            >
              <span>CDC</span>
            </span>
            <span
              className="cdc-propagation-event"
              data-moving={eventIsMoving ? "true" : "false"}
              data-visible={snapshot.eventOpacity > 0 ? "true" : "false"}
              ref={eventRef}
              style={eventStyle}
            >
              plan → pro
            </span>
          </div>

          <DatabaseActor
            acceptanceFlash={snapshot.redisAcceptanceFlash}
            label="Redis"
            planProgress={snapshot.redisPlanProgress}
            system="redis"
          />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Propagation complete. Postgres and Redis both serve plan pro for user 42."
          : ""}
      </p>
    </figure>
  );
}

function DatabaseActor({
  acceptanceFlash,
  actorRef,
  label,
  planProgress,
  system,
}: {
  acceptanceFlash: number;
  actorRef?: Ref<HTMLDivElement>;
  label: string;
  planProgress: number;
  system: "postgres" | "redis";
}) {
  const state = planState(planProgress);

  return (
    <div className="cdc-propagation-actor" data-system={system} ref={actorRef}>
      <DatabaseIcon
        className="cdc-propagation-database-icon"
        aria-hidden="true"
      />
      <strong className="cdc-propagation-actor-label">{label}</strong>
      <div
        className="cdc-propagation-plan"
        data-state={state}
        style={
          {
            "--cdc-acceptance-flash": acceptanceFlash,
          } as CSSProperties
        }
      >
        <span
          className="cdc-propagation-plan-value"
          data-active={planProgress < 0.5 ? "true" : "false"}
          data-value="free"
          style={{ opacity: 1 - planProgress }}
        >
          plan = free
        </span>
        <span
          className="cdc-propagation-plan-value"
          data-active={planProgress >= 0.5 ? "true" : "false"}
          data-value="pro"
          style={{ opacity: planProgress }}
        >
          plan = pro
        </span>
      </div>
    </div>
  );
}

function useCdcPropagationPlayback(): {
  replay: () => void;
  snapshot: CdcPropagationSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_CDC_PROPAGATION_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);

  const replay = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSnapshot(
      prefersReducedMotion
        ? deriveCdcPropagationSnapshot(1)
        : INITIAL_CDC_PROPAGATION_SNAPSHOT,
    );
    setPlaybackId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = 0;
    let previousFrame: number | undefined;

    const cancelFrame = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const renderSettledState = () => {
      cancelFrame();
      setSnapshot(deriveCdcPropagationSnapshot(1));
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const progress = Math.min(1, elapsedMs / CDC_PROPAGATION_DURATION_MS);
      setSnapshot(deriveCdcPropagationSnapshot(progress));

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
      if (!document.hidden && elapsedMs < CDC_PROPAGATION_DURATION_MS) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      cancelFrame();

      if (reducedMotion.matches) {
        renderSettledState();
      } else {
        setSnapshot(INITIAL_CDC_PROPAGATION_SNAPSHOT);
        start();
      }
    };

    const handleVisibility = () => {
      cancelFrame();

      if (!document.hidden && !reducedMotion.matches) {
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

function useCdcPropagationGeometry({
  eventRef,
  postgresActorRef,
  railRef,
  sqlOriginRef,
}: {
  eventRef: React.RefObject<HTMLSpanElement | null>;
  postgresActorRef: React.RefObject<HTMLDivElement | null>;
  railRef: React.RefObject<HTMLDivElement | null>;
  sqlOriginRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [geometry, setGeometry] = useState(INITIAL_MOTION_GEOMETRY);

  useEffect(() => {
    const event = eventRef.current;
    const postgresActor = postgresActorRef.current;
    const rail = railRef.current;
    const sqlOrigin = sqlOriginRef.current;
    if (!event || !postgresActor || !rail || !sqlOrigin) return;
    const postgresIcon = postgresActor.querySelector<SVGElement>(
      ".cdc-propagation-database-icon",
    );
    const route = postgresActor.parentElement;
    if (!postgresIcon || !route) return;

    let measurementFrame = 0;

    const measure = () => {
      const originBounds = sqlOrigin.getBoundingClientRect();
      const postgresBounds = postgresIcon.getBoundingClientRect();
      const railBounds = rail.getBoundingClientRect();
      const routeBounds = route.getBoundingClientRect();
      const eventWidth = event.offsetWidth;
      const eventHeight = event.offsetHeight;
      const usesHorizontalRail = railBounds.width >= railBounds.height;
      const desiredSqlLeft =
        postgresBounds.left + postgresBounds.width / 2 - originBounds.width / 2;
      const minimumSqlLeft = routeBounds.left + SQL_INLINE_CLEARANCE_PX;
      const maximumSqlLeft =
        routeBounds.right - SQL_INLINE_CLEARANCE_PX - originBounds.width;
      const sqlLandingLeft = Math.min(
        Math.max(desiredSqlLeft, minimumSqlLeft),
        maximumSqlLeft,
      );
      const sqlLandingTop =
        postgresBounds.top +
        postgresBounds.height / 2 -
        originBounds.height / 2;
      const nextGeometry = {
        sqlTravelX: sqlLandingLeft - originBounds.left,
        sqlTravelY: sqlLandingTop - originBounds.top,
        eventStartX: usesHorizontalRail
          ? 0
          : (railBounds.width - eventWidth) / 2,
        eventStartY: usesHorizontalRail
          ? Math.max(0, (railBounds.height - eventHeight) / 2)
          : 0,
        eventTravelX: usesHorizontalRail
          ? Math.max(0, railBounds.width - eventWidth)
          : 0,
        eventTravelY: usesHorizontalRail
          ? 0
          : Math.max(0, railBounds.height - eventHeight),
      };

      setGeometry((currentGeometry) =>
        geometryEquals(currentGeometry, nextGeometry)
          ? currentGeometry
          : nextGeometry,
      );
    };

    const scheduleMeasurement = () => {
      window.cancelAnimationFrame(measurementFrame);
      measurementFrame = window.requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(scheduleMeasurement);
    observer.observe(event);
    observer.observe(postgresActor);
    observer.observe(postgresIcon);
    observer.observe(rail);
    observer.observe(sqlOrigin);

    return () => {
      window.cancelAnimationFrame(measurementFrame);
      observer.disconnect();
    };
  }, [eventRef, postgresActorRef, railRef, sqlOriginRef]);

  return geometry;
}

function planState(progress: number) {
  if (progress <= 0) return "free";
  if (progress >= 1) return "pro";
  return "changing";
}

function geometryEquals(
  currentGeometry: MotionGeometry,
  nextGeometry: MotionGeometry,
) {
  return Object.keys(currentGeometry).every((key) => {
    const geometryKey = key as keyof MotionGeometry;
    return (
      Math.abs(currentGeometry[geometryKey] - nextGeometry[geometryKey]) < 0.5
    );
  });
}
