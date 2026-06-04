import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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

type ShardKeyStrategy = "range" | "hash";
type RingNodeCount = 3 | 4 | 5;
type RingShardId = ShardId | "d" | "e";

type ShardKeyRow = {
  id: string;
  tenantId: number;
  label: string;
};

const SHARD_KEY_ROWS: readonly ShardKeyRow[] = [
  { id: "tenant-042", tenantId: 42, label: "042" },
  { id: "tenant-118", tenantId: 118, label: "118" },
  { id: "tenant-240", tenantId: 240, label: "240" },
  { id: "tenant-245", tenantId: 245, label: "245" },
  { id: "tenant-250", tenantId: 250, label: "250" },
  { id: "tenant-252", tenantId: 252, label: "252" },
  { id: "tenant-260", tenantId: 260, label: "260" },
  { id: "tenant-481", tenantId: 481, label: "481" },
  { id: "tenant-817", tenantId: 817, label: "817" },
  { id: "tenant-920", tenantId: 920, label: "920" },
];

const SHARD_KEY_RANGE_QUERY = {
  lowerBound: 240,
  prefix: "WHERE tenant_id",
  upperBound: 260,
};

const SHARD_KEY_STRATEGIES: readonly {
  id: ShardKeyStrategy;
  label: string;
  summary: string;
}[] = [
  {
    id: "range",
    label: "Range",
    summary: "Adjacent tenant IDs stay together, so this range query is local.",
  },
  {
    id: "hash",
    label: "Hash",
    summary: "Tenant IDs scatter evenly, so this range query fans out.",
  },
];

const SHARD_KEY_LANES: readonly {
  id: ShardId;
  label: string;
  rangeLabel: string;
}[] = [
  { id: "a", label: "Shard A", rangeLabel: "001-333" },
  { id: "b", label: "Shard B", rangeLabel: "334-666" },
  { id: "c", label: "Shard C", rangeLabel: "667-999" },
];

const REBALANCE_SCENARIOS = [
  {
    id: "modulo",
    label: "Modulo",
    movedKeys: ["042", "118", "245", "250", "481", "817", "920"],
    stableKeys: ["252", "260"],
    summary: "Adding a shard changes the divisor, so most keys remap.",
  },
  {
    id: "ring",
    label: "Consistent ring",
    movedKeys: ["245", "250", "252"],
    stableKeys: ["042", "118", "260", "481", "817", "920"],
    summary: "Only keys in the new shard's slice move.",
  },
] as const;

const VIRTUAL_NODE_SCENARIOS = [
  {
    id: "single",
    label: "One token",
    tokens: [
      { id: "a1", shard: "a", label: "A", x: 50, y: 11 },
      { id: "b1", shard: "b", label: "B", x: 86, y: 63 },
      { id: "c1", shard: "c", label: "C", x: 15, y: 65 },
    ],
    loads: { a: 47, b: 36, c: 17 },
    summary:
      "With one token per shard, each owner gets one large slice of the ring.",
  },
  {
    id: "virtual",
    label: "Virtual nodes",
    tokens: [
      { id: "a1", shard: "a", label: "A1", x: 50, y: 11 },
      { id: "b1", shard: "b", label: "B1", x: 78, y: 25 },
      { id: "c1", shard: "c", label: "C1", x: 87, y: 58 },
      { id: "a2", shard: "a", label: "A2", x: 66, y: 84 },
      { id: "b2", shard: "b", label: "B2", x: 33, y: 84 },
      { id: "c2", shard: "c", label: "C2", x: 13, y: 57 },
      { id: "a3", shard: "a", label: "A3", x: 22, y: 25 },
      { id: "b3", shard: "b", label: "B3", x: 50, y: 50 },
      { id: "c3", shard: "c", label: "C3", x: 72, y: 48 },
    ],
    loads: { a: 34, b: 32, c: 34 },
    summary:
      "Virtual nodes break ownership into smaller slices, which smooths skew.",
  },
] as const;

const RING_FAILURE_SCENARIOS = [
  {
    id: "healthy",
    label: "Healthy ring",
    downShard: null,
    keys: [
      { key: "118", owner: "a", current: "a" },
      { key: "245", owner: "b", current: "b" },
      { key: "481", owner: "b", current: "b" },
      { key: "817", owner: "c", current: "c" },
      { key: "920", owner: "a", current: "a" },
    ],
    summary: "Every key routes to the next live token clockwise.",
  },
  {
    id: "takeover",
    label: "Shard B down",
    downShard: "b",
    keys: [
      { key: "118", owner: "a", current: "a" },
      { key: "245", owner: "b", current: "c" },
      { key: "481", owner: "b", current: "c" },
      { key: "817", owner: "c", current: "c" },
      { key: "920", owner: "a", current: "a" },
    ],
    summary:
      "Only keys owned by the unavailable token move to the next live owner.",
  },
] as const;

const RING_RESHARD_TOKENS: readonly {
  angle: number;
  id: RingShardId;
  label: string;
}[] = [
  { angle: 35, id: "a", label: "A" },
  { angle: 145, id: "b", label: "B" },
  { angle: 230, id: "d", label: "D" },
  { angle: 275, id: "c", label: "C" },
  { angle: 330, id: "e", label: "E" },
];

const RING_RESHARD_KEYS: readonly {
  angle: number;
  key: string;
}[] = [
  { angle: 18, key: "042" },
  { angle: 78, key: "118" },
  { angle: 132, key: "245" },
  { angle: 156, key: "250" },
  { angle: 185, key: "252" },
  { angle: 224, key: "260" },
  { angle: 255, key: "481" },
  { angle: 318, key: "817" },
  { angle: 346, key: "920" },
];

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
        title="Routing Requests To Shards"
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

export function ConsistentHashingRebalanceDemo() {
  const [scenarioId, setScenarioId] =
    useState<(typeof REBALANCE_SCENARIOS)[number]["id"]>("modulo");
  const scenario =
    REBALANCE_SCENARIOS.find((item) => item.id === scenarioId) ??
    REBALANCE_SCENARIOS[0];

  return (
    <figure className="sp-demo sp-rebalance-demo">
      <DemoHeader
        eyebrow="Prototype 08 - Crossing shards"
        title="Consistent Hashing Ring Rebalance"
        copy="The rebalancing strategy determines how much data moves when a shard is added."
      />

      <div className="sp-query-controls">
        <div
          className="sp-query-tabs"
          role="tablist"
          aria-label="Rebalance strategy"
        >
          {REBALANCE_SCENARIOS.map((item) => (
            <button
              aria-selected={item.id === scenario.id}
              className="sp-query-tab"
              key={item.id}
              onClick={() => setScenarioId(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-rebalance-layout">
        <div className="sp-ring-sketch" aria-hidden="true">
          <span data-shard="a">A</span>
          <span data-shard="b">B</span>
          <span data-shard="c">C</span>
          <span data-shard="d">D</span>
        </div>
        <div className="sp-rebalance-keys">
          <div>
            <strong>Moved keys</strong>
            <span>{scenario.movedKeys.length} of 9</span>
            <div>
              {scenario.movedKeys.map((key, index) => (
                <code
                  data-state="moved"
                  key={key}
                  style={{ "--sp-item-index": index } as CSSProperties}
                >
                  {key}
                </code>
              ))}
            </div>
          </div>
          <div>
            <strong>Stable keys</strong>
            <span>{scenario.stableKeys.length} of 9</span>
            <div>
              {scenario.stableKeys.map((key, index) => (
                <code
                  data-state="stable"
                  key={key}
                  style={{ "--sp-item-index": index } as CSSProperties}
                >
                  {key}
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p key={scenario.id} className="sp-demo-status sp-swap-line">
        {scenario.summary}
      </p>
    </figure>
  );
}

export function VirtualNodeBalanceDemo() {
  const [scenarioId, setScenarioId] =
    useState<(typeof VIRTUAL_NODE_SCENARIOS)[number]["id"]>("single");
  const scenario =
    VIRTUAL_NODE_SCENARIOS.find((item) => item.id === scenarioId) ??
    VIRTUAL_NODE_SCENARIOS[0];

  return (
    <figure className="sp-demo sp-token-ring-demo">
      <DemoHeader
        eyebrow="Prototype 10 - Crossing shards"
        title="Virtual Nodes Smooth Load"
        copy="A consistent-hashing ring gets less lumpy when each physical shard owns several smaller positions."
      />

      <div className="sp-query-controls">
        <div
          className="sp-query-tabs"
          role="tablist"
          aria-label="Virtual node layout"
        >
          {VIRTUAL_NODE_SCENARIOS.map((item) => (
            <button
              aria-selected={item.id === scenario.id}
              className="sp-query-tab"
              key={item.id}
              onClick={() => setScenarioId(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-token-ring-layout">
        <div className="sp-token-ring" aria-label={`${scenario.label} ring`}>
          {scenario.tokens.map((token, index) => (
            <span
              data-shard={token.shard}
              key={token.id}
              style={
                {
                  "--sp-item-index": index,
                  "--sp-token-x": `${token.x}%`,
                  "--sp-token-y": `${token.y}%`,
                } as CSSProperties
              }
            >
              {token.label}
            </span>
          ))}
        </div>

        <div className="sp-load-bars" aria-label="Ring ownership load">
          {SHARD_KEY_LANES.map((lane) => {
            const load = scenario.loads[lane.id];
            return (
              <div className="sp-load-row" data-hot={load >= 45} key={lane.id}>
                <span>{lane.label}</span>
                <div className="sp-skew-track">
                  <span style={{ inlineSize: `${load}%` }} />
                </div>
                <strong>{load}%</strong>
              </div>
            );
          })}
        </div>
      </div>

      <p key={scenario.id} className="sp-demo-status sp-swap-line">
        {scenario.summary}
      </p>
    </figure>
  );
}

export function RingFailureTakeoverDemo() {
  const [scenarioId, setScenarioId] =
    useState<(typeof RING_FAILURE_SCENARIOS)[number]["id"]>("healthy");
  const scenario =
    RING_FAILURE_SCENARIOS.find((item) => item.id === scenarioId) ??
    RING_FAILURE_SCENARIOS[0];

  return (
    <figure className="sp-demo sp-ring-failure-demo">
      <DemoHeader
        eyebrow="Prototype 11 - Crossing shards"
        title="Ring Failure Takeover"
        copy="When a shard disappears from the ring, only the keys it owned need a new live owner."
      />

      <div className="sp-query-controls">
        <div
          className="sp-query-tabs"
          role="tablist"
          aria-label="Ring availability"
        >
          {RING_FAILURE_SCENARIOS.map((item) => (
            <button
              aria-selected={item.id === scenario.id}
              className="sp-query-tab"
              key={item.id}
              onClick={() => setScenarioId(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-ring-failure-layout">
        <div
          className="sp-ring-sketch"
          aria-label={`${scenario.label} ownership ring`}
        >
          {["a", "b", "c"].map((shardId) => (
            <span
              data-down={scenario.downShard === shardId}
              data-shard={shardId}
              key={shardId}
            >
              {shardId.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="sp-ring-key-grid">
          {scenario.keys.map((key, index) => {
            const moved = key.owner !== key.current;
            return (
              <div
                data-moved={moved}
                key={key.key}
                style={{ "--sp-item-index": index } as CSSProperties}
              >
                <code>{key.key}</code>
                <span>
                  {moved
                    ? `${key.owner.toUpperCase()} -> ${key.current.toUpperCase()}`
                    : key.current.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p key={scenario.id} className="sp-demo-status sp-swap-line">
        {scenario.summary}
      </p>
    </figure>
  );
}

export function ConsistentHashingAddNodeDemo() {
  const [nodeCount, setNodeCount] = useState<RingNodeCount>(3);
  const handleNodeCountInput = (value: string) => {
    setNodeCount(clampRingNodeCount(Number(value)));
  };
  const activeShardIds = activeRingShardIds(nodeCount);
  const activeTokenIds = new Set<RingShardId>(activeShardIds);
  const keyPlacements = RING_RESHARD_KEYS.map((key) => {
    const beforeOwner = ownerForRingAngle(key.angle, ["a", "b", "c"]);
    const currentOwner = ownerForRingAngle(key.angle, activeShardIds);

    return {
      ...key,
      beforeOwner,
      currentOwner,
      moved: beforeOwner !== currentOwner,
    };
  });
  const movedKeys = keyPlacements.filter((key) => key.moved);
  const stableKeyCount = RING_RESHARD_KEYS.length - movedKeys.length;

  return (
    <figure className="sp-demo sp-ring-add-node-demo">
      <DemoHeader
        eyebrow="Prototype 09 - Crossing shards"
        title="Add Node Ring Reshard"
        copy="Adding nodes to a consistent-hashing ring creates new ownership intervals; only keys inside those intervals move."
      />

      <div className="sp-ring-add-control">
        <label>
          <span>Cluster size</span>
          <strong>{nodeCount} nodes</strong>
        </label>
        <input
          aria-label="Cluster size"
          max="5"
          min="3"
          onChange={(event) => handleNodeCountInput(event.currentTarget.value)}
          onInput={(event) => handleNodeCountInput(event.currentTarget.value)}
          step="1"
          type="range"
          value={nodeCount}
        />
        <div aria-hidden="true">
          <span>3</span>
          <span>4</span>
          <span>5</span>
        </div>
      </div>

      <div className="sp-ring-add-layout">
        <div
          className="sp-ring-add-stage"
          data-node-count={nodeCount}
          aria-label={`${nodeCount} node consistent hashing ring`}
        >
          <div className="sp-ring-add-ring" aria-hidden="true" />
          {RING_RESHARD_TOKENS.map((token, index) => (
            <span
              className="sp-ring-add-token"
              data-active={activeTokenIds.has(token.id)}
              data-shard={token.id}
              key={token.id}
              style={
                {
                  ...ringPercentStyle(token.angle, 40),
                  "--sp-item-index": index,
                } as CSSProperties
              }
            >
              {token.label}
            </span>
          ))}
          {keyPlacements.map((key, index) => (
            <span
              className="sp-ring-add-key"
              data-moved={key.moved && nodeCount > 3}
              data-owner={key.currentOwner}
              key={key.key}
              style={
                {
                  ...ringPercentStyle(key.angle, 28),
                  "--sp-item-index": index,
                } as CSSProperties
              }
              title={`${key.key}: ${key.beforeOwner.toUpperCase()} -> ${key.currentOwner.toUpperCase()}`}
            >
              {key.key}
            </span>
          ))}
        </div>

        <div className="sp-ring-add-table" aria-label="Key movement">
          <div className="sp-ring-add-metric">
            <strong>
              {nodeCount === 3 ? "before add" : `${movedKeys.length} moved`}
            </strong>
            <span>
              {nodeCount === 3
                ? "keys route to A, B, or C"
                : `${stableKeyCount} keys stay put`}
            </span>
          </div>
          {keyPlacements.map((key, index) => (
            <div
              data-moved={key.moved && nodeCount > 3}
              key={key.key}
              style={{ "--sp-item-index": index } as CSSProperties}
            >
              <code>{key.key}</code>
              <span>
                {nodeCount === 3
                  ? key.beforeOwner.toUpperCase()
                  : `${key.beforeOwner.toUpperCase()} -> ${key.currentOwner.toUpperCase()}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p key={nodeCount} className="sp-demo-status sp-swap-line">
        {nodeCount === 3
          ? "With three nodes, each key is owned by the next A, B, or C token clockwise."
          : `${movedKeys.length} of ${RING_RESHARD_KEYS.length} keys move when the ring grows to ${nodeCount} nodes; ${stableKeyCount} keys keep their original owner.`}
      </p>
    </figure>
  );
}

export function ShardKeyRangeHashDemo() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [strategy, setStrategy] = useState<ShardKeyStrategy>("range");
  const placedRows = SHARD_KEY_ROWS.map((row) => ({
    ...row,
    highlighted: rowIsInShardKeyRange(row),
    shardId: shardForTenant(row.tenantId, strategy),
  }));
  const touchedShardIds = new Set(
    placedRows.filter((row) => row.highlighted).map((row) => row.shardId),
  );
  const touchedShardLabels = SHARD_KEY_LANES.filter((lane) =>
    touchedShardIds.has(lane.id),
  ).map((lane) => lane.label);
  const activeStrategy =
    SHARD_KEY_STRATEGIES.find((item) => item.id === strategy) ??
    SHARD_KEY_STRATEGIES[0];
  const laneGroups = SHARD_KEY_LANES.map((lane) => {
    const rows = placedRows.filter((row) => row.shardId === lane.id);

    return { lane, rows };
  });

  useBrowserLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const positionedChips = Array.from(
      board.querySelectorAll<HTMLElement>(".sp-shard-key-dot"),
    ).map((chip) => ({
      chip,
      rect: chip.getBoundingClientRect(),
    }));

    positionedChips
      .sort((left, right) => {
        const topDelta = left.rect.top - right.rect.top;
        if (Math.abs(topDelta) > 1) return topDelta;

        return left.rect.left - right.rect.left;
      })
      .forEach(({ chip }, fillIndex) => {
        chip.style.setProperty("--sp-fill-index", `${fillIndex}`);
      });
  }, [strategy]);

  return (
    <figure className="sp-demo sp-shard-key-demo">
      <DemoHeader
        eyebrow="Choosing a shard key"
        title="Range vs Hash Splitter"
        copy="The same tenant IDs can preserve range locality or scatter more evenly depending on the shard key strategy."
      />

      <div className="sp-query-controls">
        <div
          className="sp-query-tabs"
          role="tablist"
          aria-label="Shard key strategy"
        >
          {SHARD_KEY_STRATEGIES.map((item) => (
            <button
              aria-selected={item.id === strategy}
              className="sp-query-tab"
              key={item.id}
              onClick={() => setStrategy(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-query-panel">
        <code>
          {SHARD_KEY_RANGE_QUERY.prefix}{" "}
          <span className="sp-query-range-highlight">
            BETWEEN {SHARD_KEY_RANGE_QUERY.lowerBound} AND{" "}
            {SHARD_KEY_RANGE_QUERY.upperBound}
          </span>
        </code>
        <span>
          touches {touchedShardIds.size} of {SHARD_KEY_LANES.length} shards:{" "}
          {touchedShardLabels.join(", ")}
        </span>
      </div>

      <div
        className="sp-shard-key-board"
        aria-label="Tenant IDs assigned to shards"
        ref={boardRef}
      >
        {laneGroups.map(({ lane, rows }) => (
          <section
            className="sp-shard-key-lane"
            data-touched={touchedShardIds.has(lane.id)}
            key={lane.id}
          >
            <header>
              <strong>{lane.label}</strong>
              <span>
                {strategy === "range" ? lane.rangeLabel : "hash bucket"}
              </span>
            </header>
            <div className="sp-shard-key-dots">
              {rows.map((row, index) => (
                <span
                  className="sp-shard-key-dot"
                  data-highlighted={row.highlighted}
                  key={`${strategy}-${row.id}`}
                  style={{ "--sp-fill-index": index } as CSSProperties}
                  title={`tenant_${row.label}`}
                >
                  {row.label}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="sp-demo-status sp-swap-line" key={strategy}>
        {activeStrategy.summary}
      </p>
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
                  onInput={(event) => {
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

function shardForTenant(tenantId: number, strategy: ShardKeyStrategy): ShardId {
  if (strategy === "hash") {
    return SHARD_IDS[tenantId % SHARD_IDS.length] ?? "a";
  }

  if (tenantId <= 333) return "a";
  if (tenantId <= 666) return "b";
  return "c";
}

function rowIsInShardKeyRange(row: ShardKeyRow) {
  return (
    row.tenantId >= SHARD_KEY_RANGE_QUERY.lowerBound &&
    row.tenantId <= SHARD_KEY_RANGE_QUERY.upperBound
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

function activeRingShardIds(nodeCount: RingNodeCount): readonly RingShardId[] {
  if (nodeCount === 5) return ["a", "b", "c", "d", "e"];
  if (nodeCount === 4) return ["a", "b", "c", "d"];
  return ["a", "b", "c"];
}

function clampRingNodeCount(value: number): RingNodeCount {
  if (value >= 5) return 5;
  if (value >= 4) return 4;
  return 3;
}

function ownerForRingAngle(
  angle: number,
  activeShardIds: readonly RingShardId[],
) {
  const sortedTokens = RING_RESHARD_TOKENS.filter((token) =>
    activeShardIds.includes(token.id),
  ).sort((left, right) => left.angle - right.angle);
  const owningToken =
    sortedTokens.find((token) => angle <= token.angle) ?? sortedTokens[0];

  return owningToken.id;
}

function ringPercentStyle(angle: number, radius: number): CSSProperties {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    "--sp-ring-x": `${50 + Math.cos(radians) * radius}%`,
    "--sp-ring-y": `${50 + Math.sin(radians) * radius}%`,
  } as CSSProperties;
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
