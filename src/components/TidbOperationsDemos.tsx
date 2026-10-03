import { useId, useState } from "react";
import { DemoWorkbench } from "./DemoWorkbench";
import {
  quorumState,
  scalingState,
  type ScalingScenario,
  type UnavailableReplicas,
} from "~/demos/tidb-operations/model";
import "~/demos/tidb-operations/styles.css";

const QUORUM_OPTIONS = [
  { id: "0", label: "All reachable" },
  { id: "1", label: "1 unavailable" },
  { id: "2", label: "2 unavailable" },
] as const;
const SCALING_OPTIONS = [
  { id: "baseline", label: "Before" },
  { id: "sql", label: "Add SQL compute" },
  { id: "storage", label: "Add TiKV storage" },
] as const;

// Bounds are the rectangle outline extrema. Routes end at the top face ports.
const REPLICA_BOUNDS = [
  { x: 110, y: 20, w: 100, h: 72 },
  { x: 15, y: 165, w: 120, h: 72 },
  { x: 185, y: 165, w: 120, h: 72 },
] as const;
const leader = REPLICA_BOUNDS[0];
const leaderPort = { x: leader.x + leader.w / 2, y: leader.y + leader.h };

export function TidbQuorumDemo() {
  const [unavailable, setUnavailable] = useState<UnavailableReplicas>(0);
  const state = quorumState(unavailable);
  const id = useId();
  return (
    <DemoWorkbench.Root
      title="A Region needs a majority"
      className="tidb-ops-demo"
      data-graphic-key="tidb-quorum"
      data-graphic-kind="svg"
    >
      <DemoWorkbench.Header>
        <p className="demo-workbench-description">
          One Region, three voting replicas, two required for a new log commit.
        </p>
      </DemoWorkbench.Header>
      <DemoWorkbench.Options
        options={QUORUM_OPTIONS}
        value={String(unavailable)}
        onChange={(value) =>
          setUnavailable(Number(value) as UnavailableReplicas)
        }
      />
      <div className="tidb-ops-stage" data-graphic-stage="padded">
        <p className="tidb-ops-label">Region A · same key range on each node</p>
        <svg
          className="tidb-ops-svg"
          viewBox="0 0 320 253"
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
        >
          <title id={`${id}-title`}>Region A replication quorum</title>
          <desc id={`${id}-desc`}>
            The leader remains reachable. {state.reachable} of three replicas
            are reachable.{" "}
            {state.canCommit
              ? "A majority can commit a new log entry."
              : "No majority remains; new log entries cannot commit."}
          </desc>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 -4 8 8"
              refX="8"
              refY="0"
              markerWidth="8"
              markerHeight="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0 -3 L8 0 L0 3" className="tidb-ops-arrow" />
            </marker>
          </defs>
          <path
            className="tidb-ops-wire"
            d={`M${leaderPort.x} ${leaderPort.y} V137`}
          />
          {REPLICA_BOUNDS.slice(1).map((bounds, index) => (
            <path
              key={bounds.x}
              className="tidb-ops-wire"
              data-offline={!state.replicas[index + 1]}
              d={`M${leaderPort.x} 137 H${bounds.x + bounds.w / 2} V${bounds.y}`}
              markerEnd={`url(#${id}-arrow)`}
            />
          ))}
          {REPLICA_BOUNDS.map((bounds, index) => (
            <g key={bounds.x} data-offline={!state.replicas[index]}>
              <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.w}
                height={bounds.h}
                rx="4"
                className="tidb-ops-node"
              />
              <text
                className="tidb-ops-svg-label"
                x={bounds.x + bounds.w / 2}
                y={bounds.y + 29}
              >
                TiKV {index + 1}
              </text>
              <text
                className="tidb-ops-svg-meta"
                x={bounds.x + bounds.w / 2}
                y={bounds.y + 54}
              >
                {!state.replicas[index]
                  ? "Offline"
                  : index === 0
                    ? "Leader"
                    : "Follower"}
              </text>
            </g>
          ))}
        </svg>
        <p className="tidb-ops-count">
          {state.reachable} / 3 reachable · 2 / 3 required
        </p>
      </div>
      <DemoWorkbench.Step live="polite">
        <p className="tidb-ops-takeaway">
          <strong>
            {state.canCommit
              ? "Write quorum remains."
              : "Write quorum is lost."}
          </strong>{" "}
          {state.canCommit
            ? "The connected majority can commit new entries."
            : "One replica cannot commit new entries alone."}
        </p>
      </DemoWorkbench.Step>
      <figcaption>
        Illustrative separate failure domains; the leader stays reachable here.
        Leader election and recovery take time. This diagram makes no guarantee
        about read availability.
      </figcaption>
    </DemoWorkbench.Root>
  );
}

export function TidbAgreementDiagram() {
  const id = useId();
  return (
    <figure
      className="tidb-ops-demo tidb-ops-agreement"
      data-graphic-frame="plate"
      data-graphic-kind="svg"
      data-graphic-key="tidb-agreement"
      aria-labelledby={`${id}-heading`}
    >
      <header className="tidb-ops-header">
        <p className="article-graphic-title" id={`${id}-heading`}>
          Two layers of agreement
        </p>
        <p>
          Transaction atomicity across Regions; replicated durability within
          each.
        </p>
      </header>
      <div className="tidb-ops-stage" data-graphic-stage="padded">
        <ol className="tidb-ops-commit-steps">
          <li>Prewrite keys in both Regions</li>
          <li>Commit the primary transaction key</li>
          <li>Finalize the other keys</li>
        </ol>
        <svg
          className="tidb-ops-svg"
          viewBox="0 0 320 294"
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
        >
          <title id={`${id}-title`}>
            Transaction coordination over two Raft groups
          </title>
          <desc id={`${id}-desc`}>
            TiDB coordinates one transaction touching Regions A and B. The
            primary transaction key is in A, another key is in B. Each Region
            separately replicates its changes with its own three-replica Raft
            group. These are two different kinds of agreement.
          </desc>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 -4 8 8"
              refX="8"
              refY="0"
              markerWidth="8"
              markerHeight="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0 -3 L8 0 L0 3" className="tidb-ops-arrow" />
            </marker>
          </defs>
          <path className="tidb-ops-wire" d="M160 76 V111" />
          {[85, 235].map((x) => (
            <path
              key={x}
              className="tidb-ops-wire"
              d={`M160 111 H${x} V145`}
              markerEnd={`url(#${id}-arrow)`}
            />
          ))}
          <rect
            x="65"
            y="14"
            width="190"
            height="62"
            rx="4"
            className="tidb-ops-node"
          />
          <text x="160" y="40" className="tidb-ops-svg-label">
            TiDB transaction
          </text>
          <text x="160" y="63" className="tidb-ops-svg-meta">
            coordinates both
          </text>
          {[
            { name: "A", x: 20, key: "primary txn" },
            { name: "B", x: 170, key: "other key" },
          ].map((region) => (
            <g key={region.name}>
              <rect
                x={region.x}
                y="145"
                width="130"
                height="134"
                rx="4"
                className="tidb-ops-region"
              />
              <text x={region.x + 65} y="174" className="tidb-ops-svg-label">
                Region {region.name}
              </text>
              <text x={region.x + 65} y="199" className="tidb-ops-svg-meta">
                {region.key}
              </text>
              {["L", "F", "F"].map((role, index) => (
                <g key={index}>
                  <rect
                    x={region.x + 15 + index * 35}
                    y="215"
                    width="30"
                    height="30"
                    rx="2"
                    className="tidb-ops-node"
                  />
                  <text
                    x={region.x + 30 + index * 35}
                    y="236"
                    className="tidb-ops-svg-label"
                  >
                    {role}
                  </text>
                </g>
              ))}
              <text x={region.x + 65} y="266" className="tidb-ops-svg-meta">
                Raft group
              </text>
            </g>
          ))}
        </svg>
        <p className="tidb-ops-label">L = leader · F = follower</p>
      </div>
      <figcaption>
        Simplified classic two-phase commit. The primary transaction key is a
        protocol role, not a table’s primary key. Each Region uses Raft for its
        own replicated log; Raft alone does not make the whole transaction
        atomic. Optimized commit protocols can differ.
      </figcaption>
    </figure>
  );
}

export function TidbScalingDemo() {
  const [scenario, setScenario] = useState<ScalingScenario>("baseline");
  const [redistributed, setRedistributed] = useState(false);
  const state = scalingState(scenario, redistributed);
  return (
    <DemoWorkbench.Root
      title="Scale the resource you need"
      className="tidb-ops-demo"
      data-graphic-key="tidb-scaling"
      data-graphic-kind="diagram"
    >
      <DemoWorkbench.Header>
        <p className="demo-workbench-description">
          Compare SQL capacity with storage capacity in an illustrative cluster.
        </p>
      </DemoWorkbench.Header>
      <DemoWorkbench.Options
        options={SCALING_OPTIONS}
        value={scenario}
        onChange={(value) => {
          setScenario(value as ScalingScenario);
          setRedistributed(false);
        }}
      />
      <div
        className="tidb-ops-stage tidb-ops-scaling-stage"
        data-graphic-stage="padded"
      >
        <div className="tidb-ops-resource">
          <p className="tidb-ops-resource-heading">
            <strong>SQL compute</strong>
            <span>2 → {state.sqlServers} servers</span>
          </p>
          <ul className="tidb-ops-node-list" aria-label="SQL servers">
            {Array.from({ length: state.sqlServers }, (_, index) => (
              <li key={index} data-added={index === 2}>
                <strong>TiDB {index + 1}</strong>
                <span>{index === 2 ? "Added compute" : "SQL execution"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="tidb-ops-resource">
          <p className="tidb-ops-resource-heading">
            <strong>TiKV storage</strong>
            <span>3 → {state.storage.length} nodes</span>
          </p>
          <ul
            className="tidb-ops-node-list"
            aria-label="TiKV nodes and their Region replicas"
          >
            {state.storage.map((node, index) => (
              <li key={node.id} data-added={index === 3}>
                <strong>{node.id}</strong>
                <span>
                  {node.regions.length ? (
                    <>
                      Regions
                      <br />
                      {node.regions.join(" · ")}
                    </>
                  ) : (
                    "No Regions yet"
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="tidb-ops-label">
          A–D are key ranges. Each retains three replicas.
        </p>
      </div>
      {scenario === "storage" && (
        <div className="tidb-ops-controls">
          <button
            type="button"
            aria-pressed={state.redistributed}
            onClick={() => setRedistributed((value) => !value)}
          >
            {state.redistributed
              ? "Show newly added node"
              : "Show redistribution"}
          </button>
        </div>
      )}
      <DemoWorkbench.Step live="polite">
        <p className="tidb-ops-takeaway">
          {scenario === "baseline" ? (
            <>
              Choose a resource to add. The SQL and storage layers scale
              independently.
            </>
          ) : scenario === "sql" ? (
            <>More SQL compute; the storage placement stays the same.</>
          ) : state.redistributed ? (
            <>
              Replicas now span four storage nodes. Each Region still has three
              copies.
            </>
          ) : (
            <>
              The new storage node starts empty. Moving Region replicas takes
              time.
            </>
          )}
        </p>
      </DemoWorkbench.Step>
      <figcaption>
        Illustrative placement, not a timing or throughput prediction. Regions
        can split as data grows, and rebalancing takes time. More nodes do not
        guarantee linear throughput; one hot key cannot split into parallel
        writes.
      </figcaption>
    </DemoWorkbench.Root>
  );
}
