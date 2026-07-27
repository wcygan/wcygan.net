import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DemoReplayButton } from "~/components/DemoReplayButton";
import { CustomerIcon } from "~/components/icons/CustomerIcon";
import { OrderIcon } from "~/components/icons/OrderIcon";
import { ShipmentIcon } from "~/components/icons/ShipmentIcon";
import {
  CASCADE_PURGE_EVENTS,
  COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT,
  DATA_RETENTION_CASCADE_DURATION_MS,
  type CascadeEntityKey,
  type CascadeEntityKind,
  type CascadeEntitySnapshot,
  type CascadePurgeEventKey,
  type CascadePurgeEventSnapshot,
  type DataRetentionCascadePhase,
  type DataRetentionCascadeSnapshot,
  deriveDataRetentionCascadeSnapshot,
  INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT,
} from "~/demos/data-retention-cascade/model";

type Point = {
  x: number;
  y: number;
};

type CascadePath = {
  key: CascadePurgeEventKey;
  start: Point;
  end: Point;
  tokenStart: Point;
  tokenEnd: Point;
};

type CascadeGeometry = {
  width: number;
  height: number;
  paths: CascadePath[];
};

type CascadeTokenStyle = CSSProperties & {
  "--retention-event-opacity": number;
};

const INITIAL_CASCADE_GEOMETRY: CascadeGeometry = {
  width: 0,
  height: 0,
  paths: CASCADE_PURGE_EVENTS.map(({ key }) => ({
    key,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    tokenStart: { x: 0, y: 0 },
    tokenEnd: { x: 0, y: 0 },
  })),
};

const PURGE_TOKEN_SOURCE_CLEARANCE_PX = 22;
const PURGE_TOKEN_TARGET_CLEARANCE_PX = 44;

const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function DataRetentionCascadeDemo() {
  const { replay, snapshot } = useDataRetentionCascadePlayback();
  const mapRef = useRef<HTMLDivElement>(null);
  const entityRefs = useRef<
    Partial<Record<CascadeEntityKey, HTMLDivElement | null>>
  >({});
  const geometry = useDataRetentionCascadeGeometry({ entityRefs, mapRef });
  const entitiesByKey = new Map(
    snapshot.entities.map((entity) => [entity.key, entity]),
  );

  return (
    <figure
      className="data-retention-demo"
      data-graphic-frame="workbench"
      data-graphic-key="data-retention-cascade"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      aria-labelledby="data-retention-title"
      aria-describedby="data-retention-description"
    >
      <header className="data-retention-header">
        <p className="article-graphic-title" id="data-retention-title">
          Event-Based Delete Cascade
        </p>
        <DemoReplayButton
          ariaLabel="Replay event-based delete cascade"
          isComplete={snapshot.isComplete}
          onReplay={replay}
        />
      </header>

      <p className="sr-only" id="data-retention-description">
        Customer #91 is deleted first. That deletion creates separate purge
        events for Order #7012 and Order #7013. Each order is deleted only after
        its event reaches the Order service, and each order deletion creates a
        distinct purge event for its matching shipment. Shipment #5012 and
        Shipment #5013 are then deleted. The complete cascade deletes one
        customer, two orders, and two shipments.
      </p>

      <div
        className="data-retention-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <div className="data-retention-map" ref={mapRef}>
          <svg
            className="data-retention-routes"
            viewBox={`0 0 ${Math.max(1, geometry.width)} ${Math.max(
              1,
              geometry.height,
            )}`}
            preserveAspectRatio="none"
          >
            {snapshot.events.map((event) => {
              const path = pathForEvent(geometry, event.key);

              return (
                <line
                  key={event.key}
                  x1={path.start.x}
                  y1={path.start.y}
                  x2={path.end.x}
                  y2={path.end.y}
                  data-status={event.status}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          <CascadeTier
            className="data-retention-tier--customer"
            label="Customer service"
            meta="owns the parent"
          >
            <CascadeEntity
              entity={requireEntity(entitiesByKey, "customer-91")}
              setRef={(element) => {
                entityRefs.current["customer-91"] = element;
              }}
            />
          </CascadeTier>

          <CascadeTier
            className="data-retention-tier--orders"
            label="Order service"
            meta="owns two child records"
          >
            <CascadeEntity
              entity={requireEntity(entitiesByKey, "order-7012")}
              setRef={(element) => {
                entityRefs.current["order-7012"] = element;
              }}
            />
            <CascadeEntity
              entity={requireEntity(entitiesByKey, "order-7013")}
              setRef={(element) => {
                entityRefs.current["order-7013"] = element;
              }}
            />
          </CascadeTier>

          <CascadeTier
            className="data-retention-tier--shipments"
            label="Shipment service"
            meta="owns each order's shipment"
          >
            <CascadeEntity
              entity={requireEntity(entitiesByKey, "shipment-5012")}
              setRef={(element) => {
                entityRefs.current["shipment-5012"] = element;
              }}
            />
            <CascadeEntity
              entity={requireEntity(entitiesByKey, "shipment-5013")}
              setRef={(element) => {
                entityRefs.current["shipment-5013"] = element;
              }}
            />
          </CascadeTier>

          {snapshot.events.map((event) => (
            <CascadePurgeEvent
              event={event}
              key={event.key}
              path={pathForEvent(geometry, event.key)}
            />
          ))}
        </div>

        <div
          className="data-retention-result"
          data-complete={snapshot.isSettled ? "true" : "false"}
        >
          <span className="data-retention-result-status">
            {phaseStatus(snapshot.phase)}
          </span>
          <strong>{snapshot.summary ?? deletionCount(snapshot)}</strong>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Cascade complete. One customer, two orders, and two shipments are deleted."
          : ""}
      </p>
    </figure>
  );
}

function CascadeTier({
  children,
  className,
  label,
  meta,
}: {
  children: ReactNode;
  className: string;
  label: string;
  meta: string;
}) {
  return (
    <section className={`data-retention-tier ${className}`}>
      <header className="data-retention-tier-header">
        <strong>{label}</strong>
        <span>{meta}</span>
      </header>
      <div className="data-retention-tier-entities">{children}</div>
    </section>
  );
}

function CascadeEntity({
  entity,
  setRef,
}: {
  entity: CascadeEntitySnapshot;
  setRef: (element: HTMLDivElement | null) => void;
}) {
  const style = {
    "--retention-delete-progress": entity.deletionProgress,
  } as CSSProperties;

  return (
    <div
      className="data-retention-entity"
      data-highlighted={entity.isHighlighted ? "true" : "false"}
      data-kind={entity.kind}
      data-state={entity.state}
      ref={setRef}
      style={style}
    >
      <span className="data-retention-entity-icon">
        <EntityIcon kind={entity.kind} />
      </span>
      <span className="data-retention-entity-copy">
        <span>{entityKindLabel(entity.kind)}</span>
        <strong>{entity.id}</strong>
        <i aria-hidden="true" />
      </span>
      <span className="data-retention-entity-status">
        {entityStatus(entity)}
      </span>
    </div>
  );
}

function EntityIcon({ kind }: { kind: CascadeEntityKind }) {
  if (kind === "customer") {
    return <CustomerIcon aria-hidden="true" />;
  }
  if (kind === "order") {
    return <OrderIcon aria-hidden="true" />;
  }
  return <ShipmentIcon aria-hidden="true" />;
}

function CascadePurgeEvent({
  event,
  path,
}: {
  event: CascadePurgeEventSnapshot;
  path: CascadePath;
}) {
  const point = interpolatePoint(
    path.tokenStart,
    path.tokenEnd,
    event.travelProgress,
  );
  const style = {
    "--retention-event-opacity": eventOpacity(event),
    transform: `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`,
  } satisfies CascadeTokenStyle;

  return (
    <span
      className="data-retention-event"
      data-moving={event.status === "traveling" ? "true" : "false"}
      data-status={event.status}
      style={style}
    >
      <span>Purge event</span>
      <strong>{event.label.replace(" deleted", "")}</strong>
    </span>
  );
}

function useDataRetentionCascadePlayback(): {
  replay: () => void;
  snapshot: DataRetentionCascadeSnapshot;
} {
  const [snapshot, setSnapshot] = useState(
    INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT,
  );
  const [playbackId, setPlaybackId] = useState(0);

  const replay = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSnapshot(
      prefersReducedMotion
        ? COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT
        : INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT,
    );
    setPlaybackId((current) => current + 1);
  }, []);

  useClientLayoutEffect(() => {
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

    const renderCompleteState = () => {
      cancelFrame();
      setSnapshot(COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT);
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const nextElapsedMs = Math.min(
        DATA_RETENTION_CASCADE_DURATION_MS,
        elapsedMs,
      );
      setSnapshot(deriveDataRetentionCascadeSnapshot(nextElapsedMs));

      if (nextElapsedMs < DATA_RETENTION_CASCADE_DURATION_MS) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      cancelFrame();

      if (reducedMotion.matches) {
        renderCompleteState();
        return;
      }
      if (!document.hidden && elapsedMs < DATA_RETENTION_CASCADE_DURATION_MS) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      cancelFrame();

      if (reducedMotion.matches) {
        renderCompleteState();
      } else {
        setSnapshot(INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT);
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

function useDataRetentionCascadeGeometry({
  entityRefs,
  mapRef,
}: {
  entityRefs: React.RefObject<
    Partial<Record<CascadeEntityKey, HTMLDivElement | null>>
  >;
  mapRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [geometry, setGeometry] = useState(INITIAL_CASCADE_GEOMETRY);

  useClientLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let measurementFrame = 0;

    const measure = () => {
      const mapBox = map.getBoundingClientRect();
      const paths = CASCADE_PURGE_EVENTS.map((event) => {
        const source = entityRefs.current[event.sourceKey];
        const target = entityRefs.current[event.targetKey];
        if (!source || !target) {
          return {
            key: event.key,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
            tokenStart: { x: 0, y: 0 },
            tokenEnd: { x: 0, y: 0 },
          };
        }

        const sourceBox = source.getBoundingClientRect();
        const targetBox = target.getBoundingClientRect();
        const start = {
          x: sourceBox.left + sourceBox.width / 2 - mapBox.left,
          y: sourceBox.bottom - mapBox.top,
        };
        const end = {
          x: targetBox.left + targetBox.width / 2 - mapBox.left,
          y: targetBox.top - mapBox.top,
        };

        return {
          key: event.key,
          start,
          end,
          tokenStart: {
            x: start.x,
            y: start.y + PURGE_TOKEN_SOURCE_CLEARANCE_PX,
          },
          tokenEnd: {
            x: end.x,
            y: end.y - PURGE_TOKEN_TARGET_CLEARANCE_PX,
          },
        };
      });
      const nextGeometry = {
        width: mapBox.width,
        height: mapBox.height,
        paths,
      };

      setGeometry((current) =>
        geometryEquals(current, nextGeometry) ? current : nextGeometry,
      );
    };

    const scheduleMeasurement = () => {
      window.cancelAnimationFrame(measurementFrame);
      measurementFrame = window.requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(scheduleMeasurement);
    observer.observe(map);
    for (const entity of Object.values(entityRefs.current)) {
      if (entity) observer.observe(entity);
    }

    return () => {
      window.cancelAnimationFrame(measurementFrame);
      observer.disconnect();
    };
  }, [entityRefs, mapRef]);

  return geometry;
}

function phaseStatus(phase: DataRetentionCascadePhase) {
  if (phase === "establishing") {
    return "All five records are live in their owning services";
  }
  if (phase === "deleting-customer") {
    return "Customer #91 deletion creates the first purge event";
  }
  if (phase === "purging-orders") {
    return "Separate customer events travel to both orders";
  }
  if (phase === "deleting-orders") {
    return "Each order tombstones only after its event arrives";
  }
  if (phase === "purging-shipments") {
    return "Each order deletion creates a matching shipment event";
  }
  if (phase === "deleting-shipments") {
    return "Both shipment owners receive their matching event";
  }
  return "Cascade complete";
}

function deletionCount(snapshot: DataRetentionCascadeSnapshot) {
  const total =
    snapshot.deletedCounts.customers +
    snapshot.deletedCounts.orders +
    snapshot.deletedCounts.shipments;
  return `${total} of 5 records deleted`;
}

function entityStatus(entity: CascadeEntitySnapshot) {
  if (entity.state === "deleting") return "Delete recorded";
  if (entity.state === "receiving") return "Purge received";
  if (entity.state === "deleted") return "Deleted";
  return "Live";
}

function entityKindLabel(kind: CascadeEntityKind) {
  if (kind === "customer") return "Customer";
  if (kind === "order") return "Order";
  return "Shipment";
}

function eventOpacity(event: CascadePurgeEventSnapshot) {
  if (!event.isVisible) return 0;
  if (event.status !== "arrived") return 1;
  const fadeProgress = clamp((event.arrivalProgress - 0.7) / 0.3, 0, 1);
  return 1 - fadeProgress;
}

function pathForEvent(
  geometry: CascadeGeometry,
  key: CascadePurgeEventKey,
): CascadePath {
  return (
    geometry.paths.find((path) => path.key === key) ?? {
      key,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      tokenStart: { x: 0, y: 0 },
      tokenEnd: { x: 0, y: 0 },
    }
  );
}

function requireEntity(
  entities: Map<CascadeEntityKey, CascadeEntitySnapshot>,
  key: CascadeEntityKey,
) {
  const entity = entities.get(key);
  if (!entity) {
    throw new Error(`Missing cascade entity: ${key}`);
  }
  return entity;
}

function interpolatePoint(start: Point, end: Point, progress: number): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function geometryEquals(current: CascadeGeometry, next: CascadeGeometry) {
  if (
    Math.abs(current.width - next.width) > 0.25 ||
    Math.abs(current.height - next.height) > 0.25 ||
    current.paths.length !== next.paths.length
  ) {
    return false;
  }

  return current.paths.every((path, index) => {
    const nextPath = next.paths[index];
    return (
      path.key === nextPath.key &&
      pointsEqual(path.start, nextPath.start) &&
      pointsEqual(path.end, nextPath.end) &&
      pointsEqual(path.tokenStart, nextPath.tokenStart) &&
      pointsEqual(path.tokenEnd, nextPath.tokenEnd)
    );
  });
}

function pointsEqual(current: Point, next: Point) {
  return (
    Math.abs(current.x - next.x) <= 0.25 && Math.abs(current.y - next.y) <= 0.25
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
