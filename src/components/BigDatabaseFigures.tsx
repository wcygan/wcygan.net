import { type ReactNode, type Ref, useId } from "react";
import { defineChart, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useVisibleAnimationClock } from "~/demos/big-database/use-visible-animation-clock";
import { treeReadSnapshot, TREE_LEAF_X } from "~/demos/big-database/tree-reads";
import { trafficSamples, trafficSummary } from "~/demos/big-database/traffic";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";

type IconKind = "cpu" | "ram" | "ssd" | "read" | "write" | "page" | "search";

function TechnicalIcon({ kind }: { kind: IconKind }) {
  const hardware = kind === "cpu" || kind === "ram" || kind === "ssd";
  const shapes: Record<IconKind, ReactNode> = {
    cpu: (
      <>
        {[14, 19, 24, 29, 34].map((position) => (
          <path
            key={position}
            d={`M${position} 4v4m0 32v4M4 ${position}h4m32 0h4`}
          />
        ))}
        <rect
          className="big-db-icon-case"
          x="8"
          y="8"
          width="32"
          height="32"
          rx="3"
        />
        <rect
          className="big-db-icon-inset"
          x="14"
          y="14"
          width="20"
          height="20"
          rx="2"
        />
        <path d="M19 20h10v8H19z" />
      </>
    ),
    ram: (
      <>
        <path
          className="big-db-icon-case"
          d="M4 13h40q2 0 2 2v5a3 3 0 0 0 0 6v7q0 2-2 2H30v-4h-4v4H4q-2 0-2-2v-7a3 3 0 0 0 0-6v-5q0-2 2-2Z"
        />
        {[7, 16, 25, 34].map((x) => (
          <rect
            key={x}
            className="big-db-icon-inset"
            x={x}
            y="17"
            width="7"
            height="10"
            rx="1"
          />
        ))}
        {[7, 11, 15, 19, 23, 33, 37, 41].map((x) => (
          <path key={x} d={`M${x} 31v4`} />
        ))}
      </>
    ),
    ssd: (
      <>
        <rect
          className="big-db-icon-case"
          x="8"
          y="3"
          width="32"
          height="42"
          rx="4"
        />
        <circle className="big-db-icon-inset" cx="24" cy="19" r="11" />
        <circle cx="24" cy="19" r="3" />
        <path
          className="big-db-icon-inset"
          d="M13 35l9-10-5 13a3 3 0 0 1-4-3Z"
        />
        <path d="M24 36h10v5H24zM13 8h2m18 0h2M13 41h2" />
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
      className={`big-db-icon${hardware ? " big-db-hardware-icon" : ""}`}
      viewBox={hardware ? "0 0 48 48" : "0 0 24 24"}
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
  figureRef,
  title,
  caption,
  children,
}: {
  figureRef?: Ref<HTMLElement>;
  title: string;
  caption: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <figure
      ref={figureRef}
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
      title="The hardware each MySQL instance runs on"
      caption="Each MySQL instance runs on heavyweight hardware."
    >
      <section
        className="big-db-resource big-db-hardware-resource"
        data-tone="cpu"
      >
        <div className="big-db-row">
          <span className="big-db-label">CPU</span>
          <strong>32 cores · 5% utilization</strong>
        </div>
        <TechnicalIcon kind="cpu" />
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
          Each slot represents one core of capacity.
        </p>
      </section>
      <section className="big-db-resource big-db-hardware-resource">
        <div className="big-db-row">
          <span className="big-db-label">RAM</span>
          <strong>256 GB · 39.1% buffer pool</strong>
        </div>
        <TechnicalIcon kind="ram" />
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
      <section
        className="big-db-resource big-db-hardware-resource"
        data-tone="storage"
      >
        <div className="big-db-row">
          <span className="big-db-label">Disk</span>
          <strong>24 TB · 62.5% stored data</strong>
        </div>
        <TechnicalIcon kind="ssd" />
        <Bar
          percent={(15 / 24) * 100}
          tone="storage"
          label="15 terabytes of reported stored data relative to 24 terabytes of disk capacity, 62.5 percent"
        />
        <div className="big-db-row big-db-note">
          <span>15 TB stored data</span>
          <span>9 TB outside this dataset</span>
        </div>
      </section>
    </Figure>
  );
}

const wholeRate = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const trafficChart = defineChart({
  marks: [
    lineY(trafficSamples, {
      id: "Reads",
      x: "hour",
      y: "reads",
      z: () => "Reads",
      stroke: "var(--big-db-read)",
      strokeWidth: 2.5,
    }),
    lineY(trafficSamples, {
      id: "Writes",
      x: "hour",
      y: "writes",
      z: () => "Writes",
      stroke: "var(--big-db-write)",
      strokeWidth: 2.5,
    }),
  ],
  scales: {
    x: {
      scale: scaleLinear().domain([0, 24]),
      axis: {
        label: "Hour of day",
        ticks: {
          values: [0, 6, 12, 18, 24],
          format: (hour) => String(hour).padStart(2, "0"),
        },
      },
    },
    y: {
      scale: scaleLinear().domain([0, 12000]),
      grid: true,
      axis: {
        label: "Statements / second",
        ticks: {
          values: [0, 4000, 8000, 12000],
          format: (rate) => wholeRate.format(rate),
        },
      },
    },
  },
  theme: {
    foreground: "var(--big-db-muted)",
    muted: "var(--big-db-muted)",
    grid: "var(--big-db-track)",
  },
  focus: "group-x",
  tooltip: {
    use: tooltip,
    items: [
      {
        channel: "x",
        label: "Time",
        text: (point) => {
          const minutes = Math.round(point.xValue * 60);
          return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        },
      },
      {
        channel: "y",
        text: (point) => `${wholeRate.format(point.yValue)} / s`,
      },
    ],
  },
});

export function BigDatabaseTrafficFigure() {
  return (
    <Figure
      title="Reads and writes over 24 hours"
      caption="Illustrative daily pattern; rates are means across all three regions."
    >
      <div className="big-db-traffic-summary">
        {(["reads", "writes"] as const).map((series) => (
          <div key={series}>
            <IconLabel kind={series === "reads" ? "read" : "write"}>
              {series}
            </IconLabel>
            <strong>
              {trafficSummary[series].average.toLocaleString("en-US")} / s mean
            </strong>
          </div>
        ))}
      </div>
      <Chart
        className="big-db-traffic-chart"
        definition={trafficChart}
        height={260}
        ariaLabel="Reads and writes over 24 hours on a linear scale"
        ariaDescription="Illustrative rates averaged across three regions. Reads average 10,000 per second and peak at 12,000. Writes average 100 per second and peak at 200. Both lines share a zero-based linear axis."
      />
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

export function BigDatabaseIncreasingIdsFigure() {
  const playback = useVisibleAnimationClock();
  const reads = treeReadSnapshot(playback.elapsed);
  const temperatureId = useId();
  return (
    <Figure
      figureRef={playback.figure}
      title="Increasing IDs extend the right edge"
      caption="Illustrative reads favor the hot leaves: 5%, 25%, and 70% from left to right. Green outlines mark pages found."
    >
      <svg
        className="big-db-id-tree"
        viewBox="0 -36 360 336"
        role="img"
        aria-label="A clustered B-plus-tree with cold, rarely read leaves on the left and hot, frequently read leaves on the right. The line below runs from lower IDs and older rows on the left to higher IDs and newer rows on the right: IDs increase over time. Reads follow the right subtree to hot leaves, with 5 percent reaching its left leaf, 25 percent its middle leaf, and 70 percent its far-right leaf. A green border marks a page found."
      >
        <defs>
          <linearGradient id={temperatureId}>
            {Array.from({ length: 6 }, (_, i) => (
              <stop
                key={i}
                className="big-db-id-tone"
                data-temperature={i}
                offset={`${i * 20}%`}
              />
            ))}
          </linearGradient>
        </defs>
        <text className="big-db-id-context" x="8" y="-10">
          One B+ tree in the database
        </text>
        <g className="big-db-id-branches">
          <path d="M180 42V62M84 82V62H276V82" />
          <path d="M84 110V132M28 154V132H140V154M84 132V154" />
          <path d="M276 110V132M220 154V132H332V154M276 132V154" />
        </g>
        <g className="big-db-id-routing">
          <rect x="152" y="14" width="56" height="28" rx="2" />
          <path d="M180 21V35" />
          {[84, 276].map((x) => (
            <g key={x}>
              <rect x={x - 28} y="82" width="56" height="28" rx="2" />
              <path d={`M${x - 9} 89v14m18-14v14`} />
            </g>
          ))}
        </g>
        {TREE_LEAF_X.map((x, i) => (
          <g
            key={x}
            className="big-db-id-leaf big-db-id-tone"
            data-temperature={i}
            data-found={playback.reduced ? i >= 3 : reads.found.has(i)}
          >
            <rect x={x - 20} y="154" width="40" height="36" rx="2" />
            {i < 3 ? (
              [164, 172, 180].map((y) => (
                <path key={y} d={`M${x - 11} ${y}h22`} />
              ))
            ) : (
              <text className="big-db-id-read-share" x={x} y="177">
                {[5, 25, 70][i - 3]}%
              </text>
            )}
          </g>
        ))}
        {!playback.reduced &&
          reads.packets.map((read) => (
            <circle
              key={read.id}
              data-tree-read={read.id}
              data-target-leaf={read.leaf}
              cx={read.position[0]}
              cy={read.position[1]}
              r="3"
              className="big-db-id-read"
            />
          ))}
        <text
          className="big-db-id-temperature big-db-id-tone"
          x="84"
          y="217"
          data-temperature="0"
        >
          Cold
        </text>
        <text
          className="big-db-id-temperature big-db-id-tone"
          x="276"
          y="217"
          data-temperature="5"
        >
          Hot
        </text>
        <path
          className="big-db-id-axis"
          stroke={`url(#${temperatureId})`}
          d="M8 246H352M15 239l-7 7 7 7M345 239l7 7-7 7"
        />
        <text className="big-db-id-axis-label" x="8" y="277">
          Lower IDs
          <tspan x="8" dy="20">
            Older rows
          </tspan>
        </text>
        <text className="big-db-id-axis-label" x="352" y="277" textAnchor="end">
          Higher IDs
          <tspan x="352" dy="20">
            Newer rows
          </tspan>
        </text>
      </svg>
    </Figure>
  );
}
