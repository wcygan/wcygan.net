import { useId, type ReactNode } from "react";
import {
  BROKER,
  BROKERS,
  CONTROLLER,
  FAILOVER_HEIGHT,
  VIEW,
  INSET,
  PAYLOAD,
  PLACEMENT_HEIGHT,
  PLACEMENT_PRODUCER,
  placementRoute,
  PRODUCER,
  SLOT,
  WIDTH,
  brokerX,
  controllerRoute,
  fetchRoute,
  producerRoute,
  reversed,
  slotX,
  type BrokerId,
} from "~/demos/kafka-brokers/layout";
import {
  BOOTSTRAP,
  LEADER_OF_PARTITION,
  keyColor,
  partitionLedBy,
  placement,
  type PlacementKey,
} from "~/demos/kafka-brokers/placement";
import {
  MIN_IN_SYNC,
  replication,
  type MoveKind,
} from "~/demos/kafka-brokers/replication";
import {
  pathData,
  moveProgress,
  payloadAt,
  pointAt,
  type Point,
} from "~/demos/kafka-brokers/timeline";
import { usePlayback } from "~/demos/kafka-brokers/usePlayback";
import "~/demos/kafka-brokers/brokers.css";

// Presentation attributes cannot resolve CSS variables, so route and marker
// colors live here; brokers.css repeats them for text and fills.
const COLORS = {
  ink: "#21201c",
  success: "#187636",
  failure: "#c12e46",
  control: "#903865",
  fetch: "#076fa8",
} as const;

// Darken a key color so white payload text keeps AA contrast.
const shade = (hex: string, amount = 0.8) =>
  `#${[1, 3, 5]
    .map((i) =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

// The producer box spans the row in Partition Leaders; its right half holds
// the metadata cache.
const CACHE_X = 212;

const shortKey = (key: string) => key.replace("order-", "");

function Box({
  x,
  y,
  w,
  h,
  title,
  detail,
  state = "idle",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  detail?: ReactNode;
  state?: "idle" | "leader" | "promoted" | "candidate" | "waiting" | "offline";
}) {
  return (
    <g className="kafka-brokers-node" data-state={state}>
      <rect x={x} y={y} width={w} height={h} rx="6" />
      <text x={x + INSET} y={y + 30}>
        {title}
      </text>
      {detail}
      {state === "offline" && (
        <g
          className="kafka-brokers-crash"
          transform={`translate(${x + w - 4} ${y + 4})`}
        >
          <circle r="11" />
          <path d="M-4.5 -4.5 L4.5 4.5 M4.5 -4.5 L-4.5 4.5" />
        </g>
      )}
    </g>
  );
}

function Chip({
  at: [x, y],
  label,
  color = COLORS.ink,
  kind = "record",
  fresh = false,
  dim = false,
}: {
  at: Point;
  label: string;
  color?: string;
  kind?: MoveKind;
  fresh?: boolean;
  dim?: boolean;
}) {
  return (
    <g
      className="kafka-brokers-chip"
      data-kind={kind}
      data-fresh={fresh || undefined}
      data-dim={dim || undefined}
      transform={`translate(${x} ${y})`}
    >
      <rect
        x={-SLOT.w / 2}
        y={-SLOT.h / 2}
        width={SLOT.w}
        height={SLOT.h}
        rx="4"
        stroke={color}
      />
      <text>{label}</text>
    </g>
  );
}

// A moving payload is solid and haloed; stored records are outlined.
function Payload({
  at: [x, y],
  label,
  color,
}: {
  at: Point;
  label: string;
  color: string;
}) {
  // Widen for longer messages such as "P0 leader"; Lilex advances ~0.6em.
  const w = Math.max(PAYLOAD.w, label.length * 10.5 + 18);
  return (
    <g className="kafka-brokers-payload" transform={`translate(${x} ${y})`}>
      <rect
        x={-w / 2 - 5}
        y={-PAYLOAD.h / 2 - 5}
        width={w + 10}
        height={PAYLOAD.h + 10}
        rx="9"
        fill={color}
        opacity="0.16"
      />
      <rect
        x={-w / 2}
        y={-PAYLOAD.h / 2}
        width={w}
        height={PAYLOAD.h}
        rx="5"
        fill={color}
      />
      <text>{label}</text>
    </g>
  );
}

const freshSlots = (
  before: readonly (readonly unknown[])[],
  after: readonly (readonly unknown[])[],
) =>
  after.map((log, i) => (log.length > before[i].length ? log.length - 1 : -1));

const slotCenter = (broker: BrokerId, index: number): Point => [
  slotX(broker, index) + SLOT.w / 2,
  SLOT.y + SLOT.h / 2,
];

function Route({
  points,
  active,
  color,
  marker,
  control = false,
  broken = false,
}: {
  points: readonly Point[];
  active: boolean;
  color?: string;
  marker: string;
  control?: boolean;
  broken?: boolean;
}) {
  const [cx, cy] = pointAt(points, 0.5);
  return (
    <>
      <path
        className="kafka-brokers-route"
        data-active={active}
        data-control={control || undefined}
        data-broken={broken || undefined}
        d={pathData(points)}
        stroke={active ? color : undefined}
        markerEnd={active ? `url(#${marker})` : undefined}
      />
      {broken && (
        <g className="kafka-brokers-break" transform={`translate(${cx} ${cy})`}>
          <circle r="9" />
          <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" />
        </g>
      )}
    </>
  );
}

function Controls({ playback }: { playback: ReturnType<typeof usePlayback> }) {
  return (
    <div className="kafka-brokers-controls">
      <button
        type="button"
        disabled={playback.reduced || playback.done}
        onClick={playback.toggle}
      >
        {playback.playing ? "Pause" : "Play"}
      </button>
      <button type="button" disabled={playback.done} onClick={playback.step}>
        Step
      </button>
      <button type="button" onClick={playback.replay}>
        Replay
      </button>
    </div>
  );
}

function Arrowhead({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto"
    >
      <path d="M1 1 L9 5 L1 9" fill="none" stroke={color} strokeWidth="1.5" />
    </marker>
  );
}

export function KafkaPlacementDemo() {
  const playback = usePlayback<HTMLElement>(placement);
  const marker = useId();
  const { beat, progress, scene, moves } = placement.snapshot(
    playback.elapsed,
    playback.reduced,
  );
  const { logs, current } = scene;
  const move = moves[0];
  const height = PLACEMENT_HEIGHT;
  const fresh = freshSlots(beat.scene.logs, logs);
  const { cached } = scene;
  const cacheFilled = cached && !beat.scene.cached;
  const routeBroker = current?.broker ?? BOOTSTRAP;
  const routeColor = current ? keyColor(current.key) : COLORS.ink;

  return (
    <figure
      ref={playback.ref}
      className="kafka-brokers-demo"
      data-graphic-frame="workbench"
      data-graphic-key="kafka-partition-leaders"
      data-graphic-kind="svg"
      data-graphic-label="Partition Leaders"
    >
      <div className="kafka-brokers-stage" data-graphic-stage="padded">
        <p className="article-graphic-title">Partition Leaders</p>
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-label="The producer asks bootstrap Broker 0 for cluster metadata and caches each partition's leader: P0 on Broker 1, P1 on Broker 2, P2 on Broker 0. It then maps each key to a partition and sends the record directly to that partition's leader."
        >
          <defs>
            <Arrowhead id={marker} color={routeColor} />
          </defs>
          {BROKERS.map((broker) => (
            <Route
              key={broker}
              points={placementRoute(broker)}
              active={Boolean(move) && routeBroker === broker}
              color={routeColor}
              marker={marker}
            />
          ))}
          <g
            className="kafka-brokers-node"
            data-state={cacheFilled ? "promoted-cache" : "idle"}
          >
            <rect
              x={PLACEMENT_PRODUCER.x}
              y={PLACEMENT_PRODUCER.y}
              width={WIDTH - 2 * PLACEMENT_PRODUCER.x}
              height={PLACEMENT_PRODUCER.h}
              rx="6"
            />
            <text
              x={PLACEMENT_PRODUCER.x + INSET}
              y={PLACEMENT_PRODUCER.y + 48}
            >
              Producer
            </text>
            <text
              x={PLACEMENT_PRODUCER.x + INSET}
              y={PLACEMENT_PRODUCER.y + 80}
              className="kafka-brokers-muted"
            >
              {current ? (
                <>
                  <tspan fill={keyColor(current.key)}>
                    {shortKey(current.key)}
                  </tspan>
                  {` → P${current.partition}`}
                </>
              ) : (
                "hash(key)"
              )}
            </text>
            <path
              className="kafka-brokers-divider"
              d={`M${CACHE_X - 14} ${PLACEMENT_PRODUCER.y + 14} V${PLACEMENT_PRODUCER.y + PLACEMENT_PRODUCER.h - 14}`}
            />
            <text
              x={CACHE_X + 120}
              y={PLACEMENT_PRODUCER.y + 16}
              textAnchor="middle"
              className="kafka-brokers-muted"
            >
              Leader cache
            </text>
            {cached ? (
              <g
                role="table"
                aria-label="Partition to leader broker mapping"
                aria-rowcount={4}
                aria-colcount={2}
              >
                <path
                  className="kafka-brokers-divider"
                  d={`M${CACHE_X + 120} ${PLACEMENT_PRODUCER.y + 34} V${PLACEMENT_PRODUCER.y + 118}`}
                />
                <g role="row" className="kafka-brokers-muted">
                  <text
                    role="columnheader"
                    x={CACHE_X + 60}
                    y={PLACEMENT_PRODUCER.y + 44}
                    textAnchor="middle"
                    fontSize="16"
                  >
                    Partition
                  </text>
                  <text
                    role="columnheader"
                    x={CACHE_X + 180}
                    y={PLACEMENT_PRODUCER.y + 44}
                    textAnchor="middle"
                    fontSize="16"
                  >
                    Broker
                  </text>
                </g>
                {LEADER_OF_PARTITION.map((broker, partition) => {
                  const y = PLACEMENT_PRODUCER.y + 68 + partition * 20;
                  const selected = current?.partition === partition;
                  return (
                    <g key={partition} role="row">
                      {
                        <path
                          className="kafka-brokers-divider"
                          d={`M${CACHE_X} ${y - 10} H${WIDTH - PLACEMENT_PRODUCER.x - INSET}`}
                        />
                      }
                      <text
                        role="cell"
                        aria-label={`Partition ${partition}`}
                        x={CACHE_X + 60}
                        y={y}
                        textAnchor="middle"
                        className={
                          selected ? "kafka-brokers-cache-hit" : undefined
                        }
                        fill={selected ? keyColor(current.key) : undefined}
                      >
                        P{partition}
                      </text>
                      <text
                        role="cell"
                        aria-label={`Broker ${broker}`}
                        x={CACHE_X + 180}
                        y={y}
                        textAnchor="middle"
                        className={
                          selected ? "kafka-brokers-cache-hit" : undefined
                        }
                        fill={selected ? keyColor(current.key) : undefined}
                      >
                        B{broker}
                      </text>
                    </g>
                  );
                })}
              </g>
            ) : (
              <text
                x={CACHE_X + 120}
                y={PLACEMENT_PRODUCER.y + 76}
                textAnchor="middle"
                className="kafka-brokers-muted"
              >
                empty
              </text>
            )}
          </g>
          {BROKERS.map((broker) => (
            <g key={broker}>
              <Box
                x={brokerX(broker)}
                y={BROKER.y}
                w={BROKER.w}
                h={BROKER.h}
                title={`Broker ${broker}`}
                detail={
                  <text
                    x={brokerX(broker) + INSET}
                    y={BROKER.y + 58}
                    className="kafka-brokers-muted"
                  >
                    P{partitionLedBy(broker)} leader
                  </text>
                }
              />
              {logs[broker].map((key, i) => (
                <Chip
                  key={i}
                  at={slotCenter(broker, i)}
                  label={shortKey(key)}
                  color={keyColor(key as PlacementKey)}
                  fresh={fresh[broker] === i}
                />
              ))}
            </g>
          ))}
          {move && (
            <Payload
              at={payloadAt(move.points, progress, PAYLOAD.h / 2 + 6)}
              label={current ? shortKey(current.key) : move.label}
              color={current ? shade(keyColor(current.key)) : COLORS.ink}
            />
          )}
        </svg>
        <p className="kafka-brokers-readout" aria-live="polite">
          <span>{beat.caption}</span>
        </p>
      </div>
      <Controls playback={playback} />
    </figure>
  );
}

export function KafkaFailoverDemo() {
  const playback = usePlayback<HTMLElement>(replication);
  const marker = useId();
  const fetchMarker = useId();
  const { beat, linear, scene, moves } = replication.snapshot(
    playback.elapsed,
    playback.reduced,
  );
  const { leader, target, undetected, offline, isr, logs, fetched, results } =
    scene;
  const electing = moves.find((move) => move.kind === "elect");
  const down = (broker: BrokerId) => offline.includes(broker);
  const waiting = down(target);
  // Fetch links run from the leader to every replica it still tracks; a
  // crashed replica's link shows as broken until the leader drops it.
  const followers = BROKERS.filter(
    (broker) => broker !== leader && (!down(broker) || isr.includes(broker)),
  );
  const controllerTarget = electing ? 1 : (undetected ?? leader);
  const producerPath = pathData(producerRoute(target, -20));
  // Matches sends, acks, and rejections so the arrow follows the payload.
  const producerMove = moves.find(
    (m) =>
      m.kind !== "metadata" &&
      (pathData(m.points) === producerPath ||
        pathData(reversed(m.points)) === producerPath),
  );
  // A follower's fetch offset is everything the leader knows it has stored:
  // asking for offset N proves the follower holds the records before N.
  const known = leader === null ? logs[1] : logs[leader];
  const has = (count: number) =>
    count ? `has ${known.slice(0, count).join(" ")}` : "has none";
  const learned = fetched.map((value, i) => value !== beat.scene.fetched[i]);
  const moveColor = (kind: MoveKind) =>
    kind === "ack"
      ? COLORS.success
      : kind === "reject"
        ? COLORS.failure
        : kind === "elect"
          ? COLORS.control
          : kind === "fetch"
            ? COLORS.fetch
            : COLORS.ink;
  const brokerState = (broker: BrokerId, promoted: boolean) =>
    down(broker)
      ? "offline"
      : promoted
        ? "promoted"
        : electing && isr.includes(broker)
          ? "candidate"
          : leader === broker
            ? "leader"
            : "idle";
  const roleLabel = (broker: BrokerId) =>
    down(broker)
      ? "Crashed"
      : leader === broker
        ? "Leader"
        : electing && isr.includes(broker)
          ? "Candidate"
          : leader === null
            ? "Replica"
            : "Follower";
  const activeKind = moves[0]?.kind ?? "record";
  const height = FAILOVER_HEIGHT;
  const fresh = freshSlots(beat.scene.logs, logs);

  return (
    <figure
      ref={playback.ref}
      className="kafka-brokers-demo"
      data-graphic-frame="workbench"
      data-graphic-key="kafka-replication-failover"
      data-graphic-kind="svg"
      data-graphic-label="Replication and Failover"
    >
      <div className="kafka-brokers-stage" data-graphic-stage="padded">
        <p className="article-graphic-title">Replication and Failover</p>
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-label="Partition P0 has replicas on three brokers. The producer uses acks=all with min.insync.replicas=2. Broker 0, the leader, crashes and writes pause. The controller marks it out of sync, promotes in-sync Broker 1, and the producer refreshes its metadata. Write B succeeds with two in-sync replicas. After Broker 2 crashes and is marked out of sync, write C is rejected."
        >
          <defs>
            <Arrowhead id={marker} color={moveColor(activeKind)} />
            <Arrowhead id={fetchMarker} color={COLORS.fetch} />
          </defs>
          <Route
            points={producerMove?.points ?? producerRoute(target, -20)}
            active={Boolean(producerMove)}
            color={producerMove && moveColor(producerMove.kind)}
            marker={marker}
            broken={waiting}
          />
          {moves
            .filter((move) => move.kind === "metadata")
            .map((move) => (
              <Route
                key="refresh"
                points={move.points}
                active
                color={COLORS.ink}
                marker={marker}
              />
            ))}
          {controllerTarget !== null && (
            <Route
              points={controllerRoute(controllerTarget)}
              active={Boolean(electing)}
              color={moveColor("elect")}
              marker={marker}
              control
              broken={controllerTarget === undetected}
            />
          )}
          {leader !== null &&
            followers.map((broker) => {
              const path = fetchRoute(leader, broker);
              const move = moves.find(
                (m) =>
                  pathData(m.points) === pathData(path) ||
                  pathData(m.points) === pathData(reversed(path)),
              );
              // Draw along the payload's direction so the arrowhead shows
              // whether this is a fetch request or the leader's answer.
              return (
                <Route
                  key={broker}
                  points={move?.points ?? path}
                  active={Boolean(move)}
                  color={move && moveColor(move.kind)}
                  marker={move?.kind === "fetch" ? fetchMarker : marker}
                  broken={down(broker)}
                />
              );
            })}
          <Box
            {...PRODUCER}
            title="Producer"
            state={waiting ? "waiting" : "idle"}
            detail={
              <text
                x={PRODUCER.x + INSET}
                y={PRODUCER.y + 62}
                className="kafka-brokers-muted"
              >
                {results.length === 0 && "acks=all"}
              </text>
            }
          />
          {results.map((result, i) => (
            <Chip
              key={result.label}
              at={[
                PRODUCER.x + INSET + SLOT.w / 2 + i * (SLOT.w + SLOT.gap),
                PRODUCER.y + 62,
              ]}
              label={result.label}
              kind={result.ok ? "ack" : "reject"}
              color={result.ok ? COLORS.success : COLORS.failure}
            />
          ))}
          <Box
            {...CONTROLLER}
            title="Controller"
            detail={
              <text
                x={CONTROLLER.x + INSET}
                y={CONTROLLER.y + 62}
                className="kafka-brokers-muted"
              >
                KRaft
              </text>
            }
          />
          {BROKERS.map((broker) => {
            const promoted = leader === broker && beat.scene.leader !== leader;
            return (
              <g key={broker}>
                <Box
                  x={brokerX(broker)}
                  y={BROKER.y}
                  w={BROKER.w}
                  h={BROKER.h}
                  title={`Broker ${broker}`}
                  state={brokerState(broker, promoted)}
                  detail={
                    <text
                      x={brokerX(broker) + INSET}
                      y={BROKER.y + 58}
                      className={`kafka-brokers-role-${brokerState(broker, promoted)}`}
                    >
                      {roleLabel(broker)}
                    </text>
                  }
                />
                {logs[broker].map((label, i) => (
                  <Chip
                    key={i}
                    at={slotCenter(broker, i)}
                    label={label}
                    fresh={fresh[broker] === i}
                    dim={down(broker)}
                  />
                ))}
              </g>
            );
          })}
          <g className="kafka-brokers-view">
            <rect
              x={brokerX(0)}
              y={VIEW.y}
              width={brokerX(2) + BROKER.w - brokerX(0)}
              height={VIEW.h}
              rx="6"
            />
            <text
              x={brokerX(0) + INSET}
              y={VIEW.y + 24}
              className={
                leader === null
                  ? "kafka-brokers-warning"
                  : "kafka-brokers-muted"
              }
            >
              {leader === null
                ? "No leader: writes pause"
                : `Leader: Broker ${leader}`}
            </text>
            {leader !== null && (
              <text
                x={brokerX(2) + BROKER.w - INSET}
                y={VIEW.y + 24}
                textAnchor="end"
                className="kafka-brokers-muted"
              >
                {isr.length} in sync · need {MIN_IN_SYNC}
              </text>
            )}
            {BROKERS.map((broker) => {
              const inSync = isr.includes(broker);
              // Still listed, but silent: the ISR has not caught up yet.
              const suspect = inSync && down(broker);
              const x = brokerX(broker) + INSET;
              return (
                <g key={broker}>
                  <text
                    x={x}
                    y={VIEW.y + 56}
                    className={
                      learned[broker] ? "kafka-brokers-learned" : undefined
                    }
                  >
                    {down(broker)
                      ? "no fetches"
                      : has(
                          broker === leader || leader === null
                            ? logs[broker].length
                            : fetched[broker],
                        )}
                  </text>
                  <text
                    x={x}
                    y={VIEW.y + 82}
                    className={
                      suspect
                        ? "kafka-brokers-warning"
                        : inSync
                          ? "kafka-brokers-success"
                          : "kafka-brokers-failure"
                    }
                  >
                    {suspect ? "in sync?" : inSync ? "in sync" : "out of sync"}
                  </text>
                </g>
              );
            })}
          </g>
          {moves.map((move, i) => (
            <Payload
              key={i}
              at={payloadAt(
                move.points,
                moveProgress(move, linear),
                PAYLOAD.h / 2 + 6,
              )}
              label={move.label}
              color={moveColor(move.kind)}
            />
          ))}
        </svg>
        <p className="kafka-brokers-readout" aria-live="polite">
          <span>{beat.caption}</span>
        </p>
      </div>
      <Controls playback={playback} />
    </figure>
  );
}
