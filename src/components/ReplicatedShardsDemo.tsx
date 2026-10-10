import { useEffect, useRef, useState } from "react";
import {
  replicatedShardFrames,
  type RouteId,
} from "~/demos/two-phase-commit/replicated-shards";

type Point = readonly [number, number];
const COORDINATOR = { x: 204, y: 24, width: 272, height: 110 };
const SHARDS = {
  a: {
    leader: { x: 105, y: 270, width: 170, height: 104 },
    follower1: { x: 54, y: 444, width: 112, height: 92 },
    follower2: { x: 214, y: 444, width: 112, height: 92 },
  },
  b: {
    leader: { x: 405, y: 270, width: 170, height: 104 },
    follower1: { x: 354, y: 444, width: 112, height: 92 },
    follower2: { x: 514, y: 444, width: 112, height: 92 },
  },
} as const;
const COORDINATOR_BRANCH_Y = 196;
const REPLICA_BRANCH_Y = 410;
const centerX = (node: { x: number; width: number }) => node.x + node.width / 2;
const coordinatorPort: Point = [
  centerX(COORDINATOR),
  COORDINATOR.y + COORDINATOR.height,
];
function participantRoute(side: "a" | "b"): Point[] {
  const leader = SHARDS[side].leader;
  return [
    coordinatorPort,
    [coordinatorPort[0], COORDINATOR_BRANCH_Y],
    [centerX(leader), COORDINATOR_BRANCH_Y],
    [centerX(leader), leader.y],
  ];
}
function replicationRoute(side: "a" | "b"): Point[] {
  const { leader, follower1 } = SHARDS[side];
  return [
    [centerX(leader), leader.y + leader.height],
    [centerX(leader), REPLICA_BRANCH_Y],
    [centerX(follower1), REPLICA_BRANCH_Y],
    [centerX(follower1), follower1.y],
  ];
}
const PORTS: Record<RouteId, Point[]> = {
  "prepare-a": participantRoute("a"),
  "prepare-b": participantRoute("b"),
  "replicate-a": replicationRoute("a"),
  "replicate-b": replicationRoute("b"),
  "vote-a": participantRoute("a").reverse(),
  "vote-b": participantRoute("b").reverse(),
  "commit-a": participantRoute("a"),
  "commit-b": participantRoute("b"),
};
const routeTone = (route: RouteId) =>
  route.startsWith("vote")
    ? "yes"
    : route.startsWith("commit")
      ? "commit"
      : route.startsWith("replicate")
        ? "replication"
        : "prepare";
function pointAlong(points: Point[], progress: number): Point {
  const lengths = points
    .slice(1)
    .map((point, i) =>
      Math.hypot(point[0] - points[i][0], point[1] - points[i][1]),
    );
  let distance = lengths.reduce((sum, length) => sum + length, 0) * progress;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]) {
      const ratio = distance / lengths[i];
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * ratio,
        points[i][1] + (points[i + 1][1] - points[i][1]) * ratio,
      ];
    }
    distance -= lengths[i];
  }
  return points.at(-1)!;
}

function DatabaseShape({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const radius = 8;
  return (
    <g className="replicated-shards-database">
      <path
        className="replicated-shards-node-surface"
        d={`M${x} ${y + radius} V${y + height - radius} A${width / 2} ${radius} 0 0 0 ${x + width} ${y + height - radius} V${y + radius} Z`}
      />
      <ellipse
        className="replicated-shards-node-surface"
        cx={x + width / 2}
        cy={y + radius}
        rx={width / 2}
        ry={radius}
      />
    </g>
  );
}

export function ReplicatedShardsDemo() {
  const [step, setStep] = useState(0);
  const [moving, setMoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [intent, setIntent] = useState<"auto" | "step" | "paused">("auto");
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const elapsed = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const frame = replicatedShardFrames[step];
  const next =
    replicatedShardFrames[Math.min(step + 1, replicatedShardFrames.length - 1)];
  const done = step === replicatedShardFrames.length - 1;
  const visibleRoutes = moving ? next.routes : [];
  const visualRoutes = visibleRoutes;
  const yesOutcome = frame.yesVotesReceived === 2;
  const tally = `${frame.votesReceived}/2 participant votes${yesOutcome ? " · COMMIT" : ""}`;
  const active =
    intent !== "paused" && !reduced && !done && visible && documentVisible;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) {
        setIntent("paused");
        setMoving(false);
        setProgress(0);
        elapsed.current = 0;
      }
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) =>
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2),
      { threshold: [0, 0.2] },
    );
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    let request = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) elapsed.current += now - previous;
      previous = now;
      const duration = moving ? 1100 : 950;
      if (elapsed.current >= duration) {
        elapsed.current = 0;
        if (moving) {
          setMoving(false);
          setProgress(0);
          setStep((value) => value + 1);
          if (intent === "step") setIntent("paused");
        } else {
          setMoving(true);
          setProgress(0);
        }
        return;
      }
      if (moving) setProgress(elapsed.current / duration);
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [active, intent, moving, step]);

  function reset() {
    setStep(0);
    setMoving(false);
    setProgress(0);
    elapsed.current = 0;
    setIntent(reduced ? "paused" : "auto");
  }
  function advance() {
    if (done) return;
    setIntent("step");
    if (reduced) {
      setStep((value) => Math.min(value + 1, replicatedShardFrames.length - 1));
      return;
    }
    elapsed.current = 0;
    if (!moving) setMoving(true);
    else {
      setStep((value) => value + 1);
      setMoving(false);
      setProgress(0);
    }
  }
  const routes = visualRoutes;

  return (
    <figure
      className="replicated-shards-demo"
      data-graphic-frame="workbench"
      data-graphic-key="replicated-shards-2pc"
      data-graphic-kind="svg"
      aria-labelledby="replicated-shards-title"
      aria-describedby="replicated-shards-caption"
    >
      <p className="article-graphic-title" id="replicated-shards-title">
        One transaction, two replicated shards
      </p>
      <p className="replicated-shards-description">
        A shard vote follows its own replication quorum
      </p>
      <div
        ref={stage}
        className="replicated-shards-stage"
        data-graphic-stage="flush"
      >
        <svg
          viewBox="0 0 680 580"
          role="img"
          aria-labelledby="replicated-shards-svg-title replicated-shards-svg-desc"
        >
          <title id="replicated-shards-svg-title">
            One transaction across two replicated shards
          </title>
          <desc id="replicated-shards-svg-desc">
            A transaction coordinator asks two shard leaders to prepare. Each
            leader replicates PREPARE to one of two follower replicas in a
            branching replication group, making a two-of-three quorum. Each
            leader then votes YES. The coordinator counts votes only when they
            arrive, records COMMIT, and sends it to both groups for replication.
          </desc>
          <path
            className="replicated-shards-link"
            d={`M${coordinatorPort[0]} ${coordinatorPort[1]} V${COORDINATOR_BRANCH_Y} M${centerX(SHARDS.a.leader)} ${SHARDS.a.leader.y} V${COORDINATOR_BRANCH_Y} H${centerX(SHARDS.b.leader)} V${SHARDS.b.leader.y}`}
          />
          {(["a", "b"] as const).map((side) => {
            const shard = SHARDS[side];
            const records = frame.records[side === "a" ? 0 : 1];
            const copies = records[0]
              ? records.filter((record) => record === records[0]).length
              : 0;
            const hasQuorum = copies >= 2;

            return (
              <g
                key={side}
                className="replicated-shards-group"
                data-shard={side}
              >
                <text
                  className="replicated-shards-group-label"
                  x={side === "a" ? 54 : 626}
                  y="258"
                  textAnchor={side === "a" ? "start" : "end"}
                >
                  SHARD {side.toUpperCase()}
                </text>
                <path
                  className="replicated-shards-replica-tree"
                  d={`M${shard.leader.x + shard.leader.width / 2} ${shard.leader.y + shard.leader.height} V${REPLICA_BRANCH_Y} M${shard.follower1.x + shard.follower1.width / 2} ${REPLICA_BRANCH_Y} H${shard.follower2.x + shard.follower2.width / 2} M${shard.follower1.x + shard.follower1.width / 2} ${REPLICA_BRANCH_Y} V${shard.follower1.y} M${shard.follower2.x + shard.follower2.width / 2} ${REPLICA_BRANCH_Y} V${shard.follower2.y}`}
                />
                {[shard.follower1, shard.follower2].map((node, i) => {
                  const record = records[i + 1];
                  return (
                    <g
                      key={`replica-${i}`}
                      className="replicated-shards-node"
                      data-record={record ?? "empty"}
                    >
                      <DatabaseShape {...node} />
                      <text
                        className="replicated-shards-node-role"
                        x={node.x + node.width / 2}
                        y={node.y + 36}
                        textAnchor="middle"
                      >
                        REPLICA {i + 1}
                      </text>
                      <text
                        className="replicated-shards-node-state"
                        x={node.x + node.width / 2}
                        y={node.y + 62}
                        textAnchor="middle"
                      >
                        {record ?? "—"}
                      </text>
                    </g>
                  );
                })}
                <g
                  className="replicated-shards-node replicated-shards-leader"
                  data-record={records[0] ?? "empty"}
                >
                  <DatabaseShape {...shard.leader} />
                  <text
                    className="replicated-shards-node-role"
                    x={shard.leader.x + shard.leader.width / 2}
                    y={shard.leader.y + 36}
                    textAnchor="middle"
                  >
                    LEADER
                  </text>
                  <text
                    className="replicated-shards-node-state"
                    x={shard.leader.x + shard.leader.width / 2}
                    y={shard.leader.y + 62}
                    textAnchor="middle"
                  >
                    {records[0] ?? "READY"}
                  </text>
                  <g
                    className="replicated-shards-quorum"
                    data-quorum={hasQuorum}
                  >
                    {hasQuorum && (
                      <rect
                        className="replicated-shards-quorum-outline"
                        x={shard.leader.x + 14}
                        y={shard.leader.y + 76}
                        width={shard.leader.width - 28}
                        height="18"
                        rx="2"
                      />
                    )}
                    <text
                      x={shard.leader.x + shard.leader.width / 2}
                      y={shard.leader.y + 88}
                      textAnchor="middle"
                    >
                      {copies}/3 copies · {hasQuorum ? "quorum" : "need 2"}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
          {routes.map((route, index) => {
            const points = PORTS[route];
            const [x, y] = pointAlong(points, moving ? progress : 1);
            const [labelX, labelY] = pointAlong(points, 0.5);
            const tone = routeTone(route);
            return (
              <g
                key={`${route}-${index}`}
                className="replicated-shards-packet"
                data-tone={tone}
              >
                {moving && (
                  <rect x={x - 5} y={y - 5} width="10" height="10" rx="2" />
                )}
                <text x={labelX + 8} y={labelY - 8}>
                  {route.startsWith("prepare")
                    ? "PREPARE"
                    : route.startsWith("replicate")
                      ? "replicate"
                      : route.startsWith("vote")
                        ? "YES"
                        : "COMMIT"}
                </text>
              </g>
            );
          })}
          <g
            className="replicated-shards-coordinator"
            data-record={frame.coordinatorRecord ?? "none"}
            data-votes={frame.votesReceived}
          >
            <rect
              x={COORDINATOR.x}
              y={COORDINATOR.y}
              width={COORDINATOR.width}
              height={COORDINATOR.height}
              rx="4"
            />
            <text
              className="replicated-shards-coordinator-role"
              x="340"
              y="53"
              textAnchor="middle"
            >
              TRANSACTION COORDINATOR
            </text>
            <path
              d={`M${COORDINATOR.x} 68 H${COORDINATOR.x + COORDINATOR.width}`}
            />
            <text
              className="replicated-shards-coordinator-state"
              x="340"
              y="92"
              textAnchor="middle"
            >
              {frame.coordinator}
            </text>
            <text
              className="replicated-shards-tally"
              x="340"
              y="120"
              textAnchor="middle"
            >
              {tally}
            </text>
          </g>
          <text
            className="replicated-shards-quorum-note"
            x="340"
            y="568"
            textAnchor="middle"
          >
            Each shard: leader + one replica = quorum (2/3)
          </text>
        </svg>
      </div>
      <div className="replicated-shards-controls">
        <button
          type="button"
          disabled={reduced || done}
          onClick={() =>
            setIntent((value) => (value === "paused" ? "auto" : "paused"))
          }
        >
          {intent !== "paused" ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={done || (moving && intent !== "paused")}
          onClick={advance}
        >
          Step
        </button>
        <button type="button" onClick={reset}>
          Replay
        </button>
        <span>
          {step + 1} / {replicatedShardFrames.length}
        </span>
      </div>
      <div
        className="replicated-shards-status"
        aria-live={intent !== "paused" ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>{frame.status}</p>
      </div>
      {reduced && (
        <p className="replicated-shards-motion-note">
          Reduced motion: use Step to advance without animation.
        </p>
      )}
      <figcaption id="replicated-shards-caption">
        This is a simplified pattern, not one protocol shared by every database:
        consensus replicates each shard’s log; transaction coordination collects
        one vote per shard. Real systems differ in their transaction protocols
        and optimizations.
      </figcaption>
    </figure>
  );
}
