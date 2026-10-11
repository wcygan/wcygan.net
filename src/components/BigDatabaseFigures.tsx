import { type ReactNode, useId } from "react";
import { trafficSamples, trafficSummary } from "~/demos/big-database/traffic";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";

type IconKind = "cpu" | "ram" | "ssd" | "read" | "write" | "page" | "search";

function TechnicalIcon({ kind }: { kind: IconKind }) {
  const shapes: Record<IconKind, ReactNode> = {
    cpu: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="1" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M8 3v3m4-3v3m4-3v3M8 18v3m4-3v3m4-3v3M3 8h3m-3 4h3m-3 4h3m12-8h3m-3 4h3m-3 4h3" />
      </>
    ),
    ram: (
      <>
        <rect x="3" y="6" width="18" height="11" rx="1" />
        <path d="M6 9h3v4H6zm5 0h3v4h-3zm5 0h2v4h-2zM6 17v3m4-3v3m4-3v3m4-3v3" />
      </>
    ),
    ssd: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <rect x="8" y="6" width="8" height="7" rx="1" />
        <path d="M8 17h5m3 0h1" />
      </>
    ),
    read: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
        <path d="M4 4v16" />
      </>
    ),
    write: (
      <>
        <path d="m5 15 10-10 4 4L9 19H5zM13 7l4 4M5 22h14" />
      </>
    ),
    page: (
      <>
        <path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h6" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
  };
  return (
    <svg
      className="big-db-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {shapes[kind]}
    </svg>
  );
}

function IconLabel({
  kind,
  children,
}: {
  kind: IconKind;
  children: ReactNode;
}) {
  return (
    <span className="big-db-label big-db-icon-label" data-icon={kind}>
      <TechnicalIcon kind={kind} />
      {children}
    </span>
  );
}

function Figure({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <figure
      className="big-db-figure"
      data-graphic-frame="plate"
      data-graphic-kind="dom"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          {title}
        </p>
      </header>
      <div className="big-db-stage" data-graphic-stage="padded">
        {children}
      </div>
      <figcaption id={`${id}-caption`}>{caption}</figcaption>
    </figure>
  );
}

function Bar({
  percent,
  label,
  variant = "solid",
  tone = "read",
}: {
  percent: number;
  label: string;
  variant?: "solid" | "striped";
  tone?: "read" | "write" | "storage";
}) {
  const id = useId();
  return (
    <svg
      className="big-db-bar"
      data-tone={tone}
      viewBox="0 0 1000 24"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" className="big-db-hatch" />
        </pattern>
      </defs>
      <rect width="1000" height="24" className="big-db-track" />
      <rect width={percent * 10} height="24" className="big-db-fill" />
      {variant === "striped" && (
        <rect width={percent * 10} height="24" fill={`url(#${id})`} />
      )}
    </svg>
  );
}

export function BigDatabaseHardwareFigure() {
  return (
    <Figure
      title="The hardware"
      caption="Reported machine profile; per-server scope still needs confirmation. Bars show aggregate CPU utilization, RAM allocation, and stored data relative to SSD capacity. Remaining capacity is not a measurement of free resources."
    >
      <section className="big-db-resource" data-tone="cpu">
        <div className="big-db-row">
          <IconLabel kind="cpu">CPU</IconLabel>
          <strong>32 cores · 5% utilization</strong>
        </div>
        <svg
          className="big-db-cores"
          viewBox="0 0 636 28"
          preserveAspectRatio="none"
          role="img"
          aria-label="32 cores of aggregate capacity, averaging 5 percent utilization; not a per-core activity map"
        >
          {Array.from({ length: 32 }, (_, i) => (
            <g key={i}>
              <rect
                x={i * 20}
                y="0"
                width="16"
                height="28"
                className="big-db-track"
              />
              <rect
                x={i * 20}
                y="0"
                width={16 * Math.max(0, Math.min(1, 1.6 - i))}
                height="28"
                className="big-db-fill"
              />
            </g>
          ))}
        </svg>
        <p className="big-db-note">
          Each slot represents one core of capacity, not its measured activity.
        </p>
      </section>
      <section className="big-db-resource">
        <div className="big-db-row">
          <IconLabel kind="ram">RAM</IconLabel>
          <strong>256 GB · 39.1% buffer pool</strong>
        </div>
        <Bar
          percent={(100 / 256) * 100}
          label="100 of 256 gigabytes allocated to the buffer pool, about 39.1 percent"
        />
        <div className="big-db-row big-db-note">
          <span>100 GB buffer pool</span>
          <span>156 GB outside the pool</span>
        </div>
        <p className="big-db-note">8 × 32 GB RAM modules</p>
      </section>
      <section className="big-db-resource">
        <div className="big-db-row">
          <IconLabel kind="ssd">SSD</IconLabel>
          <strong>24 TB · 62.5% stored data</strong>
        </div>
        <Bar
          percent={(15 / 24) * 100}
          tone="storage"
          label="15 terabytes of reported stored data relative to 24 terabytes of SSD capacity, 62.5 percent"
        />
        <div className="big-db-row big-db-note">
          <span>15 TB stored data</span>
          <span>9 TB outside this dataset</span>
        </div>
      </section>
    </Figure>
  );
}

export function BigDatabaseTrafficFigure() {
  const id = useId();
  // Equal vertical distances represent tenfold changes in statement rate.
  const x = (hour: number) => 72 + (hour / 24) * 496;
  const y = (rate: number) =>
    276 - ((Math.log10(rate) - 1) / (Math.log10(20000) - 1)) * 248;
  const path = (series: "reads" | "writes") =>
    trafficSamples
      .map(
        (sample, i) =>
          `${i ? "L" : "M"}${x(sample.hour).toFixed(2)},${y(sample[series]).toFixed(2)}`,
      )
      .join(" ");

  return (
    <Figure
      title="Reads and writes over 24 hours"
      caption="Illustrative daily pattern, not a measured trace. Each rate is the arithmetic mean across all three regions, not their combined total. Dashed lines show arithmetic averages over the full 24 hours. The vertical scale is logarithmic: each major step is 10×. Rates count statements, not rows or disk operations."
    >
      <p className="big-db-note">Statements / second · mean across 3 regions</p>
      <div className="big-db-traffic-summary">
        {(["reads", "writes"] as const).map((series) => (
          <div key={series} data-tone={series === "reads" ? "read" : "write"}>
            <IconLabel kind={series === "reads" ? "read" : "write"}>
              {series}
            </IconLabel>
            <strong>
              {trafficSummary[series].average.toLocaleString("en-US")} / s
              average
            </strong>
            <span>
              {trafficSummary[series].peak.toLocaleString("en-US")} / s peak
            </span>
          </div>
        ))}
      </div>
      <svg
        className="big-db-traffic-chart"
        viewBox="0 0 600 324"
        role="img"
        aria-labelledby={`${id}-chart-title ${id}-chart-desc`}
      >
        <title id={`${id}-chart-title`}>
          24-hour read and write rates on a logarithmic scale
        </title>
        <desc id={`${id}-chart-desc`}>
          An illustrative regional mean peaks at 14:00, reaching 12,000 reads
          and 200 writes per second. The daily arithmetic averages are 10,000
          reads and 100 writes per second. Solid curves show rates; dashed
          horizontal lines show daily averages.
        </desc>
        {[10, 100, 1000, 10000].map((rate) => (
          <g key={rate}>
            <line
              className="big-db-traffic-grid"
              x1={x(0)}
              x2={x(24)}
              y1={y(rate)}
              y2={y(rate)}
            />
            <text x="60" y={y(rate)} dy="0.35em" textAnchor="end">
              {rate.toLocaleString("en-US")}
            </text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((hour) => (
          <g key={hour}>
            <line
              className="big-db-traffic-grid"
              x1={x(hour)}
              x2={x(hour)}
              y1="28"
              y2="276"
            />
            <text x={x(hour)} y="308" textAnchor="middle">
              {String(hour).padStart(2, "0")}
            </text>
          </g>
        ))}
        {(["reads", "writes"] as const).map((series) => (
          <g key={series} data-tone={series === "reads" ? "read" : "write"}>
            <line
              className="big-db-traffic-average"
              x1={x(0)}
              x2={x(24)}
              y1={y(trafficSummary[series].average)}
              y2={y(trafficSummary[series].average)}
            />
            <path className="big-db-traffic-line" d={path(series)} />
            <circle
              className="big-db-traffic-peak"
              cx={x(14)}
              cy={y(trafficSummary[series].peak)}
              r="4"
            />
          </g>
        ))}
      </svg>
      <p className="big-db-note">
        Hour of day · solid = rate · dashed = 24-hour average
      </p>
      <p className="big-db-takeaway">0.48 ms reported average query time</p>
    </Figure>
  );
}

export function BigDatabaseTopologyFigure() {
  const id = useId();
  return (
    <Figure
      title="Three primaries, six replicas"
      caption="Each primary sends changes to two replicas in its region. These arrows show replication only. Data ownership, application routing, and relationships between primaries are not specified by the notes."
    >
      <p className="big-db-label">9 servers · 2 local replicas per primary</p>
      <div className="big-db-topology">
        {[1, 2, 3].map((n) => (
          <div className="big-db-replication-group" key={n}>
            <div className="big-db-node big-db-primary">
              <DatabaseIcon className="big-db-database-icon" />
              <span>Primary {n}</span>
            </div>
            <svg
              className="big-db-trunk"
              viewBox="0 0 50 164"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={`${id}-${n}`}
                  viewBox="0 -4 8 8"
                  refX="8"
                  refY="0"
                  markerWidth="8"
                  markerHeight="8"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path d="M0 -3L8 0L0 3" className="big-db-arrow" />
                </marker>
              </defs>
              <path d="M0 82H25M25 38V126" className="big-db-wire" />
              <path
                d="M25 38H50M25 126H50"
                className="big-db-wire"
                markerEnd={`url(#${id}-${n})`}
              />
            </svg>
            <div className="big-db-replicas">
              <div className="big-db-node">
                <DatabaseIcon className="big-db-database-icon" />
                <span>Replica {n}A</span>
              </div>
              <div className="big-db-node">
                <DatabaseIcon className="big-db-database-icon" />
                <span>Replica {n}B</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="big-db-row big-db-note">
        <span>16 applier workers / replica</span>
        <span>Observed lag ≤ 3 s</span>
      </div>
    </Figure>
  );
}

export function BigDatabaseCacheFigure() {
  return (
    <Figure
      title="Small cache, frequent reuse"
      caption="The capacity ratio and hit rate have different denominators. 100 GB / 15 TB is about 0.67% in comparable units. 98.7% describes logical page reads served by the buffer pool, not complete queries. Hot and cold describe access frequency, not separate storage tiers."
    >
      <div className="big-db-resource">
        <div className="big-db-row">
          <IconLabel kind="ram">Cache / stored data</IconLabel>
          <strong>≈ 0.67%</strong>
        </div>
        <Bar
          percent={(100 / 15000) * 100}
          label="Buffer pool capacity is about 0.67 percent of stored data"
        />
        <div className="big-db-row big-db-note">
          <span>100 GB cache</span>
          <span>15 TB dataset</span>
        </div>
      </div>
      <div className="big-db-resource">
        <div className="big-db-row">
          <IconLabel kind="read">Page reads from RAM</IconLabel>
          <strong>98.7%</strong>
        </div>
        <Bar
          percent={98.7}
          label="98.7 percent of logical page reads served from memory, 1.3 percent require disk reads"
        />
        <div className="big-db-row big-db-note">
          <span>98.7% buffer-pool hits</span>
          <span>1.3% misses</span>
        </div>
      </div>
      <div
        className="big-db-age-timeline"
        role="img"
        aria-label="Read activity concentrates on orders from roughly the last two weeks. Older history is almost never accessed. The timeline is illustrative, not a measured age or access distribution."
      >
        <p className="big-db-label">Orders by age · older → newer</p>
        <div className="big-db-age-regions">
          <section className="big-db-age-cold">
            <IconLabel kind="ssd">Cold history</IconLabel>
            <p>Older than ~2 weeks</p>
            <div className="big-db-age-band" aria-hidden="true">
              <TechnicalIcon kind="page" />
            </div>
            <p className="big-db-age-activity">Almost never accessed</p>
            <div className="big-db-read-marks" aria-hidden="true">
              <span />
            </div>
          </section>
          <section className="big-db-age-hot">
            <IconLabel kind="ram">Hot orders</IconLabel>
            <p>Last ~2 weeks</p>
            <div className="big-db-age-band" aria-hidden="true">
              <TechnicalIcon kind="page" />
            </div>
            <p className="big-db-age-activity">Read repeatedly</p>
            <div className="big-db-read-marks" aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} />
              ))}
            </div>
          </section>
        </div>
        <p className="big-db-note">
          Dots illustrate reads: many return to recent orders; very few reach
          older history. Widths and dot counts are schematic, not measured
          proportions.
        </p>
      </div>
      <p className="big-db-note">
        Index routing pages are also hot because lookups reuse them. Cached
        pages remain stored on SSD; an uncached page is loaded into RAM when
        needed.
      </p>
    </Figure>
  );
}

export function BigDatabaseIncreasingIdsFigure() {
  return (
    <Figure
      title="Increasing IDs extend the right edge"
      caption="Illustrative access pattern: older orders are rarely requested, while recent orders repeatedly reuse neighboring leaf pages. Increasing IDs place new rows near the right edge; pages fill and split, so recent data spans nearby pages rather than one page. Hot describes access frequency, not age alone."
    >
      <div
        className="big-db-id-tree"
        role="img"
        aria-label="A clustered B-plus-tree with three ordered leaf pages. Leaf 01 holds older, cold orders and is rarely read. Leaves 02 and 03 hold nearby recent orders and are repeatedly read, making them hot. New increasing IDs extend the right edge; cached copies of both recent pages are reused in the buffer pool."
      >
        <div className="big-db-id-root-row">
          <div className="big-db-id-root">
            <span>ROOT · routing keys</span>
            <strong>1005&nbsp; | &nbsp;1009</strong>
          </div>
        </div>
        <svg
          className="big-db-id-branches"
          viewBox="0 0 600 52"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M300 0V18M100 52V35H500V52M300 18V35" />
        </svg>
        <div className="big-db-id-leaves">
          <section className="big-db-id-page">
            <span className="big-db-id-page-label">LEAF 01 · cold</span>
            <div className="big-db-id-keys">
              <span>1001</span>
              <span>1002</span>
              <span>1003</span>
              <span>1004</span>
            </div>
          </section>
          <section className="big-db-id-page" data-recent="true">
            <span className="big-db-id-page-label">LEAF 02 · hot</span>
            <div className="big-db-id-keys">
              <span>1005</span>
              <span>1006</span>
              <span>1007</span>
              <span>1008</span>
            </div>
          </section>
          <section className="big-db-id-page" data-recent="true">
            <span className="big-db-id-page-label">LEAF 03 · hot</span>
            <div className="big-db-id-keys">
              <span>1009</span>
              <span>1010</span>
              <span>1011</span>
              <span>1012</span>
            </div>
          </section>
        </div>
        <div className="big-db-id-access">
          <div className="big-db-id-cold">
            <strong>Older history</strong>
            <span>Rarely retrieved</span>
            <span className="big-db-id-idle" aria-hidden="true">
              —
            </span>
          </div>
          <div className="big-db-id-hot">
            <strong>Recent orders · nearby pages</strong>
            <span>Repeated reads → hot pages</span>
            <div className="big-db-id-read-dots" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
        </div>
        <div className="big-db-id-growth">
          <span>NEW ROWS · RIGHT EDGE</span>
          <strong>1013 →</strong>
        </div>
        <div className="big-db-id-cache">
          <span className="big-db-id-page-label">
            BUFFER POOL · REUSED PAGES
          </span>
          <div>
            <span data-recent="true">LEAF 02</span>
            <span data-recent="true">LEAF 03</span>
          </div>
          <p>Nearby recent rows → reused pages → hot cached copies.</p>
        </div>
      </div>
    </Figure>
  );
}
