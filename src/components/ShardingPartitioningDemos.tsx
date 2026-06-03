import { type CSSProperties, useEffect, useMemo, useState } from "react";

type ShardId = "a" | "b" | "c";

type Shard = {
  id: ShardId;
  label: string;
  range: string;
  x: number;
  y: number;
};

type TenantRequest = {
  tenant: string;
  key: string;
  shardId: ShardId;
};

type Point = {
  x: number;
  y: number;
};

type CubicPath = {
  from: Point;
  controlA: Point;
  controlB: Point;
  to: Point;
};

type RouterLayout = {
  viewBox: string;
  plane: {
    height: number;
    rx: number;
    width: number;
    x: number;
    y: number;
  };
  clientPath: CubicPath;
  clientTransform: string;
  routerTransform: string;
  routerPathStart: Point;
  routerPathControlA: Point;
  shardPathControlX: number;
  shardPathEndX: number;
  shards: readonly Shard[];
};

const SHARDS: readonly Shard[] = [
  { id: "a", label: "Shard A", range: "tenant 001-299", x: 470, y: 72 },
  { id: "b", label: "Shard B", range: "tenant 300-699", x: 470, y: 190 },
  { id: "c", label: "Shard C", range: "tenant 700-999", x: 470, y: 308 },
];

const SHARD_IDS = SHARDS.map((shard) => shard.id);

const TENANT_REQUESTS: readonly TenantRequest[] = [
  { tenant: "tenant_042", key: "042", shardId: "a" },
  { tenant: "tenant_481", key: "481", shardId: "b" },
  { tenant: "tenant_817", key: "817", shardId: "c" },
  { tenant: "tenant_225", key: "225", shardId: "a" },
];

const CLIENT_TO_ROUTER_PATH: CubicPath = {
  from: { x: 152, y: 210 },
  controlA: { x: 178, y: 210 },
  controlB: { x: 204, y: 210 },
  to: { x: 230, y: 210 },
};

const DESKTOP_ROUTER_LAYOUT: RouterLayout = {
  viewBox: "0 0 660 420",
  plane: { height: 360, rx: 16, width: 600, x: 30, y: 30 },
  clientPath: CLIENT_TO_ROUTER_PATH,
  clientTransform: "translate(56 168)",
  routerTransform: "translate(230 168)",
  routerPathStart: { x: 320, y: 210 },
  routerPathControlA: { x: 372, y: 210 },
  shardPathControlX: 398,
  shardPathEndX: 470,
  shards: SHARDS,
};

const COMPACT_ROUTER_LAYOUT: RouterLayout = {
  viewBox: "0 0 360 520",
  plane: { height: 488, rx: 14, width: 324, x: 18, y: 20 },
  clientPath: {
    from: { x: 130, y: 86 },
    controlA: { x: 154, y: 86 },
    controlB: { x: 190, y: 86 },
    to: { x: 218, y: 86 },
  },
  clientTransform: "translate(34 44)",
  routerTransform: "translate(218 44)",
  routerPathStart: { x: 263, y: 128 },
  routerPathControlA: { x: 263, y: 154 },
  shardPathControlX: 264,
  shardPathEndX: 239,
  shards: [
    { id: "a", label: "Shard A", range: "tenant 001-299", x: 121, y: 202 },
    { id: "b", label: "Shard B", range: "tenant 300-699", x: 121, y: 318 },
    { id: "c", label: "Shard C", range: "tenant 700-999", x: 121, y: 434 },
  ],
};

const HOT_TRAFFIC_THRESHOLD = 50;

const INITIAL_HOT_TENANT_TRAFFIC: Record<ShardId, number> = {
  a: 10,
  b: 80,
  c: 10,
};

const TRAFFIC_PRESETS: readonly {
  label: string;
  values: Record<ShardId, number>;
}[] = [
  { label: "Balanced", values: { a: 34, b: 33, c: 33 } },
  { label: "50 / 50", values: { a: 50, b: 50, c: 0 } },
  { label: "Hot tenant", values: INITIAL_HOT_TENANT_TRAFFIC },
];

const QUERY_SCENARIOS = [
  {
    id: "march",
    label: "March orders",
    sql: "WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01'",
  },
  {
    id: "quarter",
    label: "Last quarter",
    sql: "WHERE created_at >= '2026-03-01' AND created_at < '2026-06-01'",
  },
  { id: "all", label: "No date filter", sql: "WHERE status = 'paid'" },
] as const;

type QueryScenarioId = (typeof QUERY_SCENARIOS)[number]["id"];

type DatePartition = {
  label: string;
  range: string;
  matches: readonly QueryScenarioId[];
};

const DATE_PARTITIONS: readonly DatePartition[] = [
  { label: "orders_2026_01", range: "Jan", matches: ["all"] },
  { label: "orders_2026_02", range: "Feb", matches: ["all"] },
  {
    label: "orders_2026_03",
    range: "Mar",
    matches: ["march", "quarter", "all"],
  },
  { label: "orders_2026_04", range: "Apr", matches: ["quarter", "all"] },
  { label: "orders_2026_05", range: "May", matches: ["quarter", "all"] },
];

const PARTITION_KEY_SCENARIOS = [
  {
    id: "created_at",
    label: "created_at",
    verdict: "Balanced ranges; common date queries prune cleanly.",
    partitions: [
      { label: "Jan", percent: 21 },
      { label: "Feb", percent: 19 },
      { label: "Mar", percent: 20 },
      { label: "Apr", percent: 20 },
      { label: "May", percent: 20 },
    ],
  },
  {
    id: "status",
    label: "status",
    verdict: "One hot value dominates, so most reads still hit one partition.",
    partitions: [
      { label: "paid", percent: 82 },
      { label: "pending", percent: 8 },
      { label: "failed", percent: 6 },
      { label: "refunded", percent: 4 },
      { label: "other", percent: 0 },
    ],
  },
  {
    id: "tenant_id",
    label: "tenant_id",
    verdict: "Works only if tenants are evenly sized.",
    partitions: [
      { label: "001-199", percent: 14 },
      { label: "200-399", percent: 15 },
      { label: "400-599", percent: 47 },
      { label: "600-799", percent: 12 },
      { label: "800-999", percent: 12 },
    ],
  },
] as const;

type PartitionKeyScenario = (typeof PARTITION_KEY_SCENARIOS)[number];

export function ShardRequestRouterDemo() {
  const compactLayout = useMediaQuery("(max-width: 560px)");
  const layout = compactLayout ? COMPACT_ROUTER_LAYOUT : DESKTOP_ROUTER_LAYOUT;
  const { stepIndex, progress } = useAutoplayTimeline(
    TENANT_REQUESTS.length,
    3200,
  );
  const activeRequest =
    TENANT_REQUESTS[normalizeIndex(stepIndex, TENANT_REQUESTS.length)] ??
    TENANT_REQUESTS[0];
  const selectedShard = layoutShardById(layout, activeRequest.shardId);
  const routerToShardPath = pathToShard(layout, selectedShard);
  const lookupProgress = easeInOutCubic(clamp(progress / 0.34));
  const shardProgress = easeInOutCubic(clamp((progress - 0.38) / 0.48));
  const lookupPacket = pointOnCubic(layout.clientPath, lookupProgress);
  const shardPacket = pointOnCubic(routerToShardPath, shardProgress);
  const lookupOpacity = progress < 0.5 ? 1 : 0;
  const shardOpacity = progress < 0.34 ? 0 : 1;

  return (
    <figure className="sp-demo sp-router-demo">
      <DemoHeader
        eyebrow="Sharding"
        title="Request Router To Shards"
        copy="A request uses a shard key to find the database instance that owns the row."
      />

      <svg className="sp-router-map" viewBox={layout.viewBox} role="img">
        <title>Request router to shards</title>
        <desc>
          A tenant request moves from the application through a router to the
          shard that owns the tenant range.
        </desc>

        <NetworkPlane layout={layout} />
        <path className="sp-passive-path" d={pathData(layout.clientPath)} />
        <path
          className="sp-active-path"
          d={pathData(routerToShardPath)}
          pathLength="1"
        />

        <circle
          className="sp-router-packet-dot sp-router-packet-lookup"
          cx={lookupPacket.x}
          cy={lookupPacket.y}
          r="8"
          style={{ opacity: lookupOpacity }}
        />
        <circle
          className="sp-router-packet-dot sp-router-packet-query"
          cx={shardPacket.x}
          cy={shardPacket.y}
          r="8"
          style={{ opacity: shardOpacity }}
        />

        <ClientNode layout={layout} request={activeRequest} />
        <RouterNode layout={layout} request={activeRequest} />
        {layout.shards.map((shard) => (
          <ShardNode
            key={shard.id}
            active={shard.id === activeRequest.shardId}
            shard={shard}
          />
        ))}
      </svg>

      <StepList
        items={TENANT_REQUESTS.map((request) => ({
          key: request.tenant,
          label: `${request.tenant} -> ${shardById(request.shardId).label}`,
        }))}
        activeIndex={stepIndex}
      />
    </figure>
  );
}

export function HotTenantShardDemo() {
  const [trafficByShard, setTrafficByShard] = useState(
    INITIAL_HOT_TENANT_TRAFFIC,
  );
  const trafficMix = SHARDS.map((shard) => `${trafficByShard[shard.id]}%`).join(
    " / ",
  );
  const trafficTotal = totalTraffic(trafficByShard);

  return (
    <figure className="sp-demo sp-hot-tenant-demo">
      <DemoHeader
        eyebrow="Sharding"
        title="Hot Tenant Problem"
        copy="If one tenant sends most of the traffic, the shard that owns it gets hot while the other shards stay cool."
      />

      <div className="sp-traffic-budget">
        <div>
          <strong>Traffic budget</strong>
          <span>{trafficTotal}% total</span>
        </div>
        <div className="sp-traffic-presets" aria-label="Traffic presets">
          {TRAFFIC_PRESETS.map((preset) => (
            <button
              aria-pressed={trafficMatchesPreset(trafficByShard, preset.values)}
              className="sp-traffic-preset"
              key={preset.label}
              onClick={() => setTrafficByShard(preset.values)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="sp-hot-layout"
        aria-label="Three shards with traffic heat"
      >
        {SHARDS.map((shard) => {
          const traffic = trafficByShard[shard.id];
          const hot = traffic >= HOT_TRAFFIC_THRESHOLD;

          return (
            <div
              className="sp-hot-shard"
              data-hot={hot}
              key={shard.label}
              style={heatStyle(heatForTraffic(traffic))}
            >
              <div className="sp-hot-flames" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <strong>{shard.label}</strong>
              <div className="sp-hot-meta">
                <span>{traffic}% traffic</span>
                <span
                  className="sp-hot-badge"
                  data-state={hot ? "hot" : "cool"}
                >
                  {hot ? "hot" : "cool"}
                </span>
              </div>
              <label className="sp-hot-control">
                <span>Traffic share</span>
                <input
                  aria-label={`${shard.label} traffic percentage`}
                  className="sp-traffic-slider"
                  max="100"
                  min="0"
                  onChange={(event) => {
                    const nextTraffic = Number(event.currentTarget.value);
                    setTrafficByShard((currentTraffic) =>
                      redistributeTraffic(
                        currentTraffic,
                        shard.id,
                        nextTraffic,
                      ),
                    );
                  }}
                  step="1"
                  type="range"
                  value={traffic}
                />
              </label>
            </div>
          );
        })}
      </div>

      <p className="sp-demo-status">
        Traffic mix: {trafficMix}. The total stays at 100%; any shard at{" "}
        {HOT_TRAFFIC_THRESHOLD}% or higher is hot.
      </p>
    </figure>
  );
}

export function QueryPlannerPruningDemo() {
  const { playing, selectStep, stepIndex, togglePlaying } = usePausableAutoplay(
    QUERY_SCENARIOS.length,
    2600,
  );
  const scenario =
    QUERY_SCENARIOS[normalizeIndex(stepIndex, QUERY_SCENARIOS.length)] ??
    QUERY_SCENARIOS[0];
  const activePartitionCount = DATE_PARTITIONS.filter((partition) =>
    partition.matches.includes(scenario.id),
  ).length;

  return (
    <figure className="sp-demo sp-pruning-demo">
      <DemoHeader
        eyebrow="Partitioning"
        title="Query Planner Pruning"
        copy="A partition-aware query planner skips partitions that cannot contain matching rows."
      />

      <div className="sp-query-controls">
        <div className="sp-query-tabs" role="tablist" aria-label="Query shape">
          {QUERY_SCENARIOS.map((item, index) => (
            <button
              aria-selected={item.id === scenario.id}
              className="sp-query-tab"
              key={item.id}
              onClick={() => selectStep(index)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          aria-pressed={playing}
          className="sp-playback-button"
          onClick={togglePlaying}
          type="button"
        >
          {playing ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="sp-query-panel">
        <code key={`${scenario.id}-sql`} className="sp-swap-line">
          {scenario.sql}
        </code>
        <span key={`${scenario.id}-count`} className="sp-swap-line">
          scans {activePartitionCount} of {DATE_PARTITIONS.length} partitions
        </span>
      </div>

      <div className="sp-partition-row" aria-label="Date partitions">
        {DATE_PARTITIONS.map((partition, index) => {
          const active = partition.matches.includes(scenario.id);
          return (
            <div
              className="sp-partition-card"
              data-state={active ? "scanned" : "pruned"}
              key={partition.label}
              style={{ "--sp-card-index": index } as CSSProperties}
            >
              <strong>{partition.range}</strong>
              <span>{partition.label}</span>
              <small>{active ? "scan" : "skip"}</small>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export function BadPartitionKeyDemo() {
  const { playing, selectStep, stepIndex, togglePlaying } = usePausableAutoplay(
    PARTITION_KEY_SCENARIOS.length,
    3000,
  );
  const scenario =
    PARTITION_KEY_SCENARIOS[
      normalizeIndex(stepIndex, PARTITION_KEY_SCENARIOS.length)
    ] ?? PARTITION_KEY_SCENARIOS[0];
  const maxPartition = useMemo(
    () =>
      scenario.partitions.reduce((largest, partition) =>
        partition.percent > largest.percent ? partition : largest,
      ),
    [scenario],
  );

  return (
    <figure className="sp-demo sp-bad-key-demo">
      <DemoHeader
        eyebrow="Partitioning"
        title="Bad Partition Key"
        copy="A partition key should match common queries and distribute rows. A low-cardinality or skewed key can create one giant partition."
      />

      <div className="sp-query-controls">
        <div
          className="sp-query-tabs"
          role="tablist"
          aria-label="Partition key"
        >
          {PARTITION_KEY_SCENARIOS.map((item, index) => (
            <button
              aria-selected={item.id === scenario.id}
              className="sp-query-tab"
              key={item.id}
              onClick={() => selectStep(index)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          aria-pressed={playing}
          className="sp-playback-button"
          onClick={togglePlaying}
          type="button"
        >
          {playing ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="sp-skew-bars" aria-label={`${scenario.label} partitions`}>
        {scenario.partitions.map((partition, index) => (
          <div
            className="sp-skew-row"
            key={index}
            style={{ "--sp-row-index": index } as CSSProperties}
          >
            <span>{partition.label}</span>
            <div className="sp-skew-track">
              <span
                data-largest={partition.label === maxPartition.label}
                style={{ inlineSize: `${partition.percent}%` }}
              />
            </div>
            <strong>{partition.percent}%</strong>
          </div>
        ))}
      </div>

      <p key={scenario.id} className="sp-demo-status sp-swap-line">
        {scenario.verdict}
      </p>
    </figure>
  );
}

function DemoHeader({
  copy,
  eyebrow,
  title,
}: {
  copy: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="sp-demo-header">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

function NetworkPlane({ layout }: { layout: RouterLayout }) {
  const { plane } = layout;

  return (
    <>
      <rect
        className="sp-network-plane"
        height={plane.height}
        rx={plane.rx}
        width={plane.width}
        x={plane.x}
        y={plane.y}
      />
      {layout.shards.map((shard) => (
        <path
          className="sp-passive-path sp-shard-route-path"
          d={pathData(pathToShard(layout, shard))}
          key={shard.id}
        />
      ))}
    </>
  );
}

function ClientNode({
  layout,
  request,
}: {
  layout: RouterLayout;
  request: TenantRequest;
}) {
  return (
    <g className="sp-router-card" transform={layout.clientTransform}>
      <rect height="84" rx="12" width="96" />
      <text x="48" y="28">
        App
      </text>
      <text className="sp-router-detail" x="48" y="52">
        {request.tenant}
      </text>
    </g>
  );
}

function RouterNode({
  layout,
  request,
}: {
  layout: RouterLayout;
  request: TenantRequest;
}) {
  return (
    <g
      className="sp-router-card sp-router-card-selected"
      transform={layout.routerTransform}
    >
      <rect height="84" rx="12" width="90" />
      <text x="45" y="30">
        Router
      </text>
      <text className="sp-router-detail" x="45" y="56">
        range map
      </text>
      <text className="sp-router-detail" x="45" y="72">
        {"-> "}
        {request.shardId.toUpperCase()}
      </text>
    </g>
  );
}

function ShardNode({ active, shard }: { active: boolean; shard: Shard }) {
  return (
    <g
      className="sp-router-card sp-db-card"
      data-state={active ? "active" : "idle"}
      transform={`translate(${shard.x} ${shard.y - 42})`}
    >
      <path
        className="sp-db-body"
        d="M 6 21 V 61 C 6 72 30 81 59 81 C 88 81 112 72 112 61 V 21"
      />
      <ellipse className="sp-db-top" cx="59" cy="21" rx="53" ry="19" />
      <path
        className="sp-db-rim"
        d="M 6 61 C 6 72 30 81 59 81 C 88 81 112 72 112 61"
      />
      <text className="sp-db-title" dominantBaseline="middle" x="59" y="21">
        {shard.label}
      </text>
      <text className="sp-router-detail sp-db-range" x="59" y="64">
        {shard.range}
      </text>
    </g>
  );
}

function StepList({
  activeIndex,
  items,
}: {
  activeIndex: number;
  items: readonly { key: string; label: string }[];
}) {
  return (
    <ol className="sp-step-list">
      {items.map((item, index) => (
        <li
          data-state={index === activeIndex ? "active" : "idle"}
          key={item.key}
        >
          {item.label}
        </li>
      ))}
    </ol>
  );
}

function usePausableAutoplay(count: number, intervalMs: number) {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setStepIndex(count - 1);
      setPlaying(false);
      return;
    }

    if (!playing) return;

    const intervalId = window.setInterval(() => {
      setStepIndex((currentIndex) => normalizeIndex(currentIndex + 1, count));
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [count, intervalMs, playing]);

  return {
    playing,
    selectStep: (index: number) => {
      setStepIndex(normalizeIndex(index, count));
      setPlaying(false);
    },
    stepIndex,
    togglePlaying: () => setPlaying((currentPlaying) => !currentPlaying),
  };
}

function useAutoplayTimeline(count: number, durationMs: number) {
  const [timeline, setTimeline] = useState({ stepIndex: 0, progress: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setTimeline({ stepIndex: count - 1, progress: 1 });
      return;
    }

    let frameId = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const cycle = elapsed % durationMs;
      const stepIndex = normalizeIndex(Math.floor(elapsed / durationMs), count);
      setTimeline({ stepIndex, progress: cycle / durationMs });
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [count, durationMs]);

  return timeline;
}

function shardById(shardId: ShardId) {
  return SHARDS.find((shard) => shard.id === shardId) ?? SHARDS[0];
}

function layoutShardById(layout: RouterLayout, shardId: ShardId) {
  return (
    layout.shards.find((shard) => shard.id === shardId) ?? layout.shards[0]
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);
    updateMatches();
    mediaQuery.addEventListener("change", updateMatches);
    return () => mediaQuery.removeEventListener("change", updateMatches);
  }, [query]);

  return matches;
}

function heatStyle(intensity: number): CSSProperties {
  const clampedIntensity = clamp(intensity);
  const cool = { red: 111, green: 185, blue: 226 };
  const hot = { red: 210, green: 74, blue: 68 };
  const red = interpolateChannel(cool.red, hot.red, clampedIntensity);
  const green = interpolateChannel(cool.green, hot.green, clampedIntensity);
  const blue = interpolateChannel(cool.blue, hot.blue, clampedIntensity);

  return {
    "--sp-heat": clampedIntensity,
    backgroundColor: `rgb(${red} ${green} ${blue})`,
  } as CSSProperties;
}

function heatForTraffic(traffic: number) {
  if (traffic < HOT_TRAFFIC_THRESHOLD) return 0;

  const hotProgress =
    (traffic - HOT_TRAFFIC_THRESHOLD) / (100 - HOT_TRAFFIC_THRESHOLD);
  return 0.72 + hotProgress * 0.28;
}

function redistributeTraffic(
  currentTraffic: Record<ShardId, number>,
  changedShardId: ShardId,
  requestedTraffic: number,
): Record<ShardId, number> {
  const nextTraffic = clampTraffic(requestedTraffic);
  const previousTraffic = currentTraffic[changedShardId];
  const delta = nextTraffic - previousTraffic;
  if (delta === 0) return currentTraffic;

  const otherShardIds = SHARD_IDS.filter(
    (shardId) => shardId !== changedShardId,
  );
  const redistributedTraffic = {
    ...currentTraffic,
    [changedShardId]: nextTraffic,
  };

  if (delta > 0) {
    const reductions = distributeIntegerAmount(
      delta,
      otherShardIds.map((shardId) => ({
        id: shardId,
        weight: currentTraffic[shardId],
      })),
    );

    for (const shardId of otherShardIds) {
      redistributedTraffic[shardId] =
        currentTraffic[shardId] - reductions[shardId];
    }
  } else {
    const additions = distributeIntegerAmount(
      Math.abs(delta),
      otherShardIds.map((shardId) => ({
        id: shardId,
        weight: 100 - currentTraffic[shardId],
      })),
    );

    for (const shardId of otherShardIds) {
      redistributedTraffic[shardId] =
        currentTraffic[shardId] + additions[shardId];
    }
  }

  return normalizeTrafficTotal(redistributedTraffic, changedShardId);
}

function distributeIntegerAmount(
  total: number,
  weightedShardIds: readonly { id: ShardId; weight: number }[],
) {
  const amount = clampTraffic(total);
  const distributed = zeroTraffic();
  if (amount === 0 || weightedShardIds.length === 0) return distributed;

  const totalWeight = weightedShardIds.reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const weightedShares = weightedShardIds.map((item) => {
    const rawShare =
      totalWeight === 0
        ? amount / weightedShardIds.length
        : amount * (item.weight / totalWeight);

    return {
      ...item,
      floor: Math.floor(rawShare),
      remainder: rawShare - Math.floor(rawShare),
    };
  });

  let assignedAmount = 0;
  for (const item of weightedShares) {
    distributed[item.id] = item.floor;
    assignedAmount += item.floor;
  }

  const sortedByRemainder = [...weightedShares].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return SHARD_IDS.indexOf(left.id) - SHARD_IDS.indexOf(right.id);
  });

  let remainingAmount = amount - assignedAmount;
  for (const item of sortedByRemainder) {
    if (remainingAmount <= 0) break;
    distributed[item.id] += 1;
    remainingAmount -= 1;
  }

  return distributed;
}

function normalizeTrafficTotal(
  trafficByShard: Record<ShardId, number>,
  protectedShardId: ShardId,
) {
  const normalizedTraffic = { ...trafficByShard };
  const totalDifference = 100 - totalTraffic(normalizedTraffic);
  if (totalDifference === 0) return normalizedTraffic;

  const targetShardId = SHARD_IDS.find(
    (shardId) => shardId !== protectedShardId,
  );
  if (!targetShardId) return normalizedTraffic;

  normalizedTraffic[targetShardId] = clampTraffic(
    normalizedTraffic[targetShardId] + totalDifference,
  );
  return normalizedTraffic;
}

function zeroTraffic(): Record<ShardId, number> {
  return { a: 0, b: 0, c: 0 };
}

function totalTraffic(trafficByShard: Record<ShardId, number>) {
  return SHARD_IDS.reduce((sum, shardId) => sum + trafficByShard[shardId], 0);
}

function trafficMatchesPreset(
  trafficByShard: Record<ShardId, number>,
  preset: Record<ShardId, number>,
) {
  return SHARD_IDS.every(
    (shardId) => trafficByShard[shardId] === preset[shardId],
  );
}

function clampTraffic(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function interpolateChannel(start: number, end: number, progress: number) {
  return Math.round(start + (end - start) * progress);
}

function pathToShard(layout: RouterLayout, shard: Shard): CubicPath {
  return {
    from: layout.routerPathStart,
    controlA: layout.routerPathControlA,
    controlB: { x: layout.shardPathControlX, y: shard.y },
    to: { x: layout.shardPathEndX, y: shard.y },
  };
}

function pathData(path: CubicPath) {
  return `M ${path.from.x} ${path.from.y} C ${path.controlA.x} ${path.controlA.y}, ${path.controlB.x} ${path.controlB.y}, ${path.to.x} ${path.to.y}`;
}

function pointOnCubic(path: CubicPath, t: number): Point {
  const oneMinusT = 1 - t;
  const a = oneMinusT ** 3;
  const b = 3 * oneMinusT ** 2 * t;
  const c = 3 * oneMinusT * t ** 2;
  const d = t ** 3;

  return {
    x:
      a * path.from.x +
      b * path.controlA.x +
      c * path.controlB.x +
      d * path.to.x,
    y:
      a * path.from.y +
      b * path.controlA.y +
      c * path.controlB.y +
      d * path.to.y,
  };
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function normalizeIndex(index: number, count: number) {
  if (count <= 0) return 0;

  const normalized = Math.trunc(index) % count;
  return normalized < 0 ? normalized + count : normalized;
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}
