import { useEffect, useId, useState } from "react";
import {
  deriveGeoDnsSnapshot,
  REDUCED_MOTION_STEP_INDEX,
  type GeoDnsSnapshot,
  type RegionCode,
  type UserCode,
} from "~/demos/geodns-routing/model";

const STEP_INTERVAL_MS = 2600;

type Point = {
  x: number;
  y: number;
};

type RegionNode = Point & {
  code: RegionCode;
  label: string;
  color: string;
};

type UserNode = Point & {
  code: UserCode;
  label: string;
};

const RESOLVER_POINT: Point = { x: 320, y: 192 };
const USER_ROUTE_COLOR = "#d24a44";

const REGION_NODES: Record<RegionCode, RegionNode> = {
  OR: {
    code: "OR",
    label: "Oregon",
    x: 108,
    y: 184,
    color: "#d59b24",
  },
  TX: {
    code: "TX",
    label: "Texas",
    x: 320,
    y: 306,
    color: "#1d8b65",
  },
  VA: {
    code: "VA",
    label: "Virginia",
    x: 532,
    y: 184,
    color: "#2f69f0",
  },
};

const USER_NODES: Record<UserCode, UserNode> = {
  SEA: { code: "SEA", label: "Seattle", x: 108, y: 76 },
  DAL: { code: "DAL", label: "Dallas", x: 230, y: 260 },
  NYC: { code: "NYC", label: "New York", x: 532, y: 76 },
};

const RESOLVER_CARD_HALF_WIDTH = 72;
const RESOLVER_CARD_HALF_HEIGHT = 34;
const REGION_CARD_HALF_WIDTH = 48;
const REGION_CARD_HALF_HEIGHT = 37;
const USER_RING_RADIUS = 20;

export function GeoDnsRoutingDemo() {
  const markerSuffix = useId().replaceAll(":", "");
  const queryPathId = `geo-dns-query-${markerSuffix}`;
  const answerPathId = `geo-dns-answer-${markerSuffix}`;
  const connectPathId = `geo-dns-connect-${markerSuffix}`;
  const titleId = `geo-dns-title-${markerSuffix}`;
  const descriptionId = `geo-dns-description-${markerSuffix}`;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (prefersReducedMotion.matches) {
      setStepIndex(REDUCED_MOTION_STEP_INDEX);
      return;
    }

    const intervalId = window.setInterval(() => {
      setStepIndex((currentStep) => currentStep + 1);
    }, STEP_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const snapshot = deriveGeoDnsSnapshot({ stepIndex });

  return (
    <figure className="geo-dns-routing-demo" data-phase={snapshot.phase}>
      <div className="geo-dns-routing-header">
        <h3>GeoDNS Routing</h3>
        <p>
          DNS answers the same hostname with the closest regional entry point
          for the user making the query.
        </p>
      </div>

      <div className="geo-dns-routing-board">
        <svg
          className="geo-dns-routing-map"
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
          viewBox="0 0 640 390"
        >
          <title id={titleId}>GeoDNS routing demo</title>
          <desc id={descriptionId}>
            Three users query DNS for the same hostname. Seattle receives
            Oregon, Dallas receives Texas, and New York receives Virginia.
          </desc>
          <defs>
            <pattern
              height="32"
              id={`geo-dns-grid-${markerSuffix}`}
              patternUnits="userSpaceOnUse"
              width="32"
            >
              <path d="M 32 0 H 0 V 32" />
            </pattern>
          </defs>

          <rect
            className="geo-dns-network-plane"
            height="330"
            rx="14"
            width="580"
            x="30"
            y="30"
          />
          <rect
            className="geo-dns-network-grid"
            fill={`url(#geo-dns-grid-${markerSuffix})`}
            height="330"
            rx="14"
            width="580"
            x="30"
            y="30"
          />

          <PassiveLinks />
          <ActiveRoutes
            answerPathId={answerPathId}
            connectPathId={connectPathId}
            queryPathId={queryPathId}
            snapshot={snapshot}
          />
          <ResolverCard />
          <RegionMarkers snapshot={snapshot} />
          <UserMarkers activeUser={snapshot.activeUser.code} />
        </svg>
      </div>
    </figure>
  );
}

function PassiveLinks() {
  return (
    <g className="geo-dns-passive-links" aria-hidden="true">
      {Object.values(USER_NODES).map((user) => (
        <path
          key={`${user.code}-resolver`}
          d={linePath(user, RESOLVER_POINT)}
        />
      ))}
      {Object.values(REGION_NODES).map((region) => (
        <path
          key={`${region.code}-resolver`}
          d={linePath(RESOLVER_POINT, region)}
        />
      ))}
    </g>
  );
}

function ActiveRoutes({
  answerPathId,
  connectPathId,
  queryPathId,
  snapshot,
}: {
  answerPathId: string;
  connectPathId: string;
  queryPathId: string;
  snapshot: GeoDnsSnapshot;
}) {
  const activeUserPoint = USER_NODES[snapshot.activeUser.code];
  const selectedRegion = REGION_NODES[snapshot.selectedRegion];

  return (
    <g
      key={snapshot.phase}
      className="geo-dns-active-routes"
      aria-hidden="true"
    >
      <path
        id={queryPathId}
        className="geo-dns-route-line geo-dns-query-line"
        d={linePathFromUserToResolver(activeUserPoint)}
        pathLength="1"
      />
      <path
        id={answerPathId}
        className="geo-dns-route-line geo-dns-answer-line"
        d={linePathFromResolverToRegion(selectedRegion)}
        pathLength="1"
        style={{ stroke: selectedRegion.color }}
      />
      <path
        id={connectPathId}
        className="geo-dns-route-line geo-dns-connect-line"
        d={linePathFromUserToRegion(activeUserPoint, selectedRegion)}
        pathLength="1"
        style={{ stroke: USER_ROUTE_COLOR }}
      />
      <RoutePacket
        begin="0s"
        className="geo-dns-query-packet"
        dur="0.36s"
        pathId={queryPathId}
        tone={USER_ROUTE_COLOR}
      />
      <RoutePacket
        begin="0.26s"
        className="geo-dns-answer-packet"
        dur="0.42s"
        pathId={answerPathId}
        tone={selectedRegion.color}
      />
      <RoutePacket
        begin="0.62s"
        className="geo-dns-connect-packet"
        dur="0.48s"
        pathId={connectPathId}
        radius={6.5}
        tone={USER_ROUTE_COLOR}
      />
    </g>
  );
}

function RoutePacket({
  begin,
  className,
  dur,
  pathId,
  radius = 5,
  tone,
}: {
  begin: string;
  className: string;
  dur: string;
  pathId: string;
  radius?: number;
  tone: string;
}) {
  return (
    <circle
      className={`geo-dns-route-packet ${className}`}
      r={radius}
      fill={tone}
    >
      <animateMotion begin={begin} dur={dur} fill="freeze">
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </circle>
  );
}

function ResolverCard() {
  return (
    <g className="geo-dns-resolver-card" transform="translate(248 158)">
      <rect height="68" rx="10" width="144" />
      <text className="geo-dns-resolver-title" x="72" y="27">
        DNS
      </text>
      <text className="geo-dns-resolver-subtitle" x="72" y="47">
        resolver
      </text>
    </g>
  );
}

function RegionMarkers({ snapshot }: { snapshot: GeoDnsSnapshot }) {
  return (
    <g>
      {snapshot.regions.map((region) => {
        const point = REGION_NODES[region.code];

        return (
          <g
            key={region.code}
            className="geo-dns-region-marker"
            data-region={region.code.toLowerCase()}
            data-state={region.status}
            transform={`translate(${point.x} ${point.y})`}
          >
            <rect
              className="geo-dns-server-card"
              height="74"
              rx="10"
              width="96"
              x="-48"
              y="-37"
            />
            <circle
              className="geo-dns-marker-core"
              r="18"
              style={{ fill: point.color }}
            />
            <text className="geo-dns-marker-code" y="5">
              {region.code}
            </text>
            <text className="geo-dns-node-label" y="58">
              {region.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function UserMarkers({ activeUser }: { activeUser: UserCode }) {
  return (
    <g>
      {Object.values(USER_NODES).map((user) => (
        <g
          key={user.code}
          className="geo-dns-user-marker"
          data-state={activeUser === user.code ? "active" : "idle"}
          transform={`translate(${user.x} ${user.y})`}
        >
          <circle className="geo-dns-user-ring" r="20" />
          <circle className="geo-dns-user-core" r="10" />
          <text className="geo-dns-user-label" y="-27">
            {user.label}
          </text>
        </g>
      ))}
    </g>
  );
}

function linePath(from: Point, to: Point) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function linePathFromUserToResolver(user: UserNode) {
  return linePath(
    circleEdgePoint(user, RESOLVER_POINT, USER_RING_RADIUS),
    rectEdgePoint(user, RESOLVER_POINT, {
      halfWidth: RESOLVER_CARD_HALF_WIDTH,
      halfHeight: RESOLVER_CARD_HALF_HEIGHT,
    }),
  );
}

function linePathFromResolverToRegion(region: RegionNode) {
  return linePath(
    rectEdgePoint(region, RESOLVER_POINT, {
      halfWidth: RESOLVER_CARD_HALF_WIDTH,
      halfHeight: RESOLVER_CARD_HALF_HEIGHT,
    }),
    rectEdgePoint(RESOLVER_POINT, region, {
      halfWidth: REGION_CARD_HALF_WIDTH,
      halfHeight: REGION_CARD_HALF_HEIGHT,
    }),
  );
}

function linePathFromUserToRegion(user: UserNode, region: RegionNode) {
  return linePath(
    circleEdgePoint(user, region, USER_RING_RADIUS),
    rectEdgePoint(user, region, {
      halfWidth: REGION_CARD_HALF_WIDTH,
      halfHeight: REGION_CARD_HALF_HEIGHT,
    }),
  );
}

function circleEdgePoint(center: Point, toward: Point, radius: number): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return center;
  }

  return {
    x: center.x + (dx / distance) * radius,
    y: center.y + (dy / distance) * radius,
  };
}

function rectEdgePoint(
  from: Point,
  rectCenter: Point,
  size: { halfWidth: number; halfHeight: number },
): Point {
  const dx = from.x - rectCenter.x;
  const dy = from.y - rectCenter.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return rectCenter;
  }

  const unitX = dx / distance;
  const unitY = dy / distance;
  const xScale =
    unitX === 0 ? Number.POSITIVE_INFINITY : size.halfWidth / Math.abs(unitX);
  const yScale =
    unitY === 0 ? Number.POSITIVE_INFINITY : size.halfHeight / Math.abs(unitY);
  const edgeDistance = Math.min(xScale, yScale);

  return {
    x: rectCenter.x + unitX * edgeDistance,
    y: rectCenter.y + unitY * edgeDistance,
  };
}
