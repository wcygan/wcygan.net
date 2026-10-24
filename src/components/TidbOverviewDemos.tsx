import { useId, useState } from "react";
import { DemoWorkbench } from "./DemoWorkbench";
import {
  EXAMPLE_ORDERS,
  QUERY_EXAMPLES,
  REGION_LAYOUTS,
  rangeLabel,
  type QueryKind,
} from "~/demos/tidb-overview/model";
import "~/demos/tidb-overview/styles.css";

function DownArrow() {
  return (
    <svg className="tidb-overview-down" viewBox="0 0 24 36" aria-hidden="true">
      <path d="M12 0V34M7 29l5 5 5-5" />
    </svg>
  );
}

function CoordinationLink() {
  return (
    <svg className="tidb-overview-side" viewBox="0 0 28 20" aria-hidden="true">
      <path d="M0 10H28" />
    </svg>
  );
}

export function TidbLayersDiagram() {
  const titleId = useId();
  return (
    <figure
      className="tidb-overview"
      data-graphic-frame="plate"
      data-graphic-key="tidb-layers"
      aria-labelledby={titleId}
    >
      <p id={titleId} className="article-graphic-title">
        TiDB Layers
      </p>
      <div className="tidb-overview-stage" data-graphic-stage="padded">
        <div className="tidb-overview-layers">
          <div className="tidb-overview-node tidb-overview-application">
            <strong>Application</strong>
            <span>MySQL protocol</span>
          </div>
          <div className="tidb-overview-sql-arrow">
            <DownArrow />
          </div>
          <div className="tidb-overview-node tidb-overview-sql">
            <strong>TiDB</strong>
            <span>SQL parsing + planning</span>
            <span>Stateless compute</span>
          </div>
          <div className="tidb-overview-timestamp-link">
            <CoordinationLink />
          </div>
          <div className="tidb-overview-storage-arrow">
            <DownArrow />
          </div>
          <div className="tidb-overview-node tidb-overview-storage">
            <strong>TiKV</strong>
            <span>Transactional storage</span>
            <span>Replicated Regions</span>
          </div>
          <div className="tidb-overview-placement-link">
            <CoordinationLink />
          </div>
          <aside
            className="tidb-overview-pd"
            aria-label="Placement Driver coordination"
          >
            <div>
              <strong>PD</strong>
              <span>Timestamps</span>
              <span>Topology metadata</span>
            </div>
            <div>
              <span>Replica placement</span>
              <span>Load balancing</span>
            </div>
          </aside>
        </div>
      </div>
    </figure>
  );
}

export function TidbRegionsDemo() {
  const [layoutId, setLayoutId] = useState(REGION_LAYOUTS[0].id);
  const layout = REGION_LAYOUTS.find((item) => item.id === layoutId)!;
  return (
    <DemoWorkbench.Root
      title="Regions and Replicas"
      className="tidb-overview"
      data-graphic-key="tidb-regions"
    >
      <DemoWorkbench.Header />
      <DemoWorkbench.Options
        options={REGION_LAYOUTS}
        value={layoutId}
        onChange={setLayoutId}
      />
      <div className="tidb-overview-stage" data-graphic-stage="padded">
        <p className="tidb-overview-label">Ordered key space</p>
        <div
          className="tidb-overview-ranges"
          role="group"
          aria-label="Logical key ranges"
        >
          {layout.regions.map((region) => (
            <div key={region.id} className="tidb-overview-range">
              <strong>Region {region.id}</strong>
              <span>{rangeLabel(region)}</span>
            </div>
          ))}
        </div>
        <dl
          className="tidb-overview-stores"
          aria-label="Physical replica placement"
        >
          {layout.stores.map((store) => (
            <div key={store} className="tidb-overview-store">
              <dt>TiKV {store}</dt>
              <dd>
                {layout.regions
                  .filter((region) => region.stores.includes(store))
                  .map((region) => (
                    <span
                      key={region.id}
                      className="tidb-overview-peer"
                      data-leader={region.leader === store}
                    >
                      <strong>{region.id}</strong>
                      <span>
                        {region.leader === store ? "leader" : "follower"}
                      </span>
                    </span>
                  ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <DemoWorkbench.Step live="polite">
        <p className="tidb-overview-status-title">{layout.title}</p>
      </DemoWorkbench.Step>
    </DemoWorkbench.Root>
  );
}

export function TidbQueryEnginesDemo() {
  const [kind, setKind] = useState<QueryKind>("lookup");
  const example = QUERY_EXAMPLES[kind];
  const total = EXAMPLE_ORDERS.reduce((sum, order) => sum + order.amount, 0);
  const choose = (id: string) => setKind(id as QueryKind);
  return (
    <DemoWorkbench.Root
      title="Rows and Columns"
      className="tidb-overview"
      data-graphic-key="tidb-query-engines"
    >
      <DemoWorkbench.Header />
      <DemoWorkbench.Options
        options={Object.entries(QUERY_EXAMPLES).map(([id, item]) => ({
          id,
          label: item.label,
        }))}
        value={kind}
        onChange={choose}
      />
      <div className="tidb-overview-stage" data-graphic-stage="padded">
        <p className="tidb-overview-query">{example.sql}</p>
        <DownArrow />
        <div className="tidb-overview-optimizer">TiDB optimizer</div>
        <div className="tidb-overview-engines">
          <div
            className="tidb-overview-engine"
            data-selected={example.engine === "tikv"}
          >
            <p className="tidb-overview-engine-title">TiKV · rows</p>
            <div
              className="tidb-overview-row-store"
              role="group"
              aria-label="Rows stored together"
            >
              <div className="tidb-overview-record tidb-overview-field-names">
                <span>id</span>
                <span>buyer</span>
                <span>amount</span>
              </div>
              {EXAMPLE_ORDERS.map((order) => (
                <div
                  key={order.id}
                  className="tidb-overview-record"
                  data-read={kind === "lookup" && order.id === 3}
                >
                  <span>{order.id}</span>
                  <span>{order.buyer}</span>
                  <span>{order.amount}</span>
                </div>
              ))}
            </div>
            <p className="tidb-overview-read-detail">
              {kind === "lookup" ? "Read row 3" : "Read rows to sum amount"}
            </p>
          </div>
          <div
            className="tidb-overview-engine"
            data-selected={example.engine === "tiflash"}
          >
            <p className="tidb-overview-engine-title">TiFlash · columns</p>
            <div
              className="tidb-overview-column-store"
              role="group"
              aria-label="Values grouped by column"
            >
              {(["id", "buyer", "amount"] as const).map((column) => (
                <div
                  key={column}
                  className="tidb-overview-column"
                  data-read={kind === "aggregate" && column === "amount"}
                >
                  <span className="tidb-overview-field-names">{column}</span>
                  {EXAMPLE_ORDERS.map((order) => (
                    <span key={order.id}>{order[column]}</span>
                  ))}
                </div>
              ))}
            </div>
            {kind === "aggregate" && (
              <p className="tidb-overview-read-detail">
                Scan amount → total {total}
              </p>
            )}
          </div>
        </div>
      </div>
      <DemoWorkbench.Step live="polite">
        <p className="tidb-overview-status-title">{example.title}</p>
      </DemoWorkbench.Step>
    </DemoWorkbench.Root>
  );
}
