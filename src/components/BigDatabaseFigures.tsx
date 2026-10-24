import { type ReactNode, type Ref, useId } from "react";
import { defineChart, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useVisibleAnimationClock } from "~/demos/big-database/use-visible-animation-clock";
import { treeReadSnapshot, TREE_LEAF_X } from "~/demos/big-database/tree-reads";
import { trafficSamples, trafficSummary } from "~/demos/big-database/traffic";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";

import { TechnicalIcon, type IconKind } from "./BigDatabaseTechnicalIcon";

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
  children,
}: {
  figureRef?: Ref<HTMLElement>;
  title: string;
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
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          {title}
        </p>
      </header>
      <div className="big-db-stage" data-graphic-stage="padded">
        {children}
      </div>
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
  const ramGiB = (256 * 10 ** 9) / 2 ** 30;
  const freeTiB = (6.7 * 10 ** 12) / 2 ** 40;
  return (
    <Figure title="The hardware each MySQL instance runs on">
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
      </section>
      <section className="big-db-resource big-db-hardware-resource">
        <div className="big-db-row">
          <span className="big-db-label">RAM</span>
          <strong>About {Math.round(ramGiB)} GiB RAM</strong>
        </div>
        <TechnicalIcon kind="ram" />
        <Bar
          percent={(100 / ramGiB) * 100}
          label={`100 GiB buffer pool within about ${Math.round(ramGiB)} GiB of RAM, about 42 percent`}
        />
        <div className="big-db-row big-db-note">
          <span>100 GiB buffer pool</span>
          <span>Other memory uses</span>
        </div>
      </section>
      <section
        className="big-db-resource big-db-hardware-resource"
        data-tone="storage"
      >
        <div className="big-db-row">
          <span className="big-db-label">Disk</span>
          <strong>About 75% used</strong>
        </div>
        <TechnicalIcon kind="ssd" />
        <Bar
          percent={75}
          tone="storage"
          label="Disk is about 75 percent used, including the dataset and other disk usage"
        />
        <div className="big-db-row big-db-note">
          <span>14.8 TiB dataset</span>
          <span>About {freeTiB.toFixed(1)} TiB free</span>
        </div>
      </section>
    </Figure>
  );
}

export function BigDatabaseWorkingSetBudgetFigure() {
  return (
    <Figure title="The active data fits in memory">
      <section className="big-db-resource">
        <div className="big-db-row">
          <span className="big-db-label">Working set</span>
          <strong>33–56 GiB estimated</strong>
        </div>
        <Bar
          percent={56}
          label="The estimated working set occupies 33 to 56 GiB of the 100 GiB buffer pool. At the upper estimate, 44 GiB remains for other pages."
        />
        <div className="big-db-row big-db-note">
          <span>56 GiB upper estimate</span>
          <span>100 GiB pool</span>
        </div>
      </section>
      <section className="big-db-resource">
        <div className="big-db-row">
          <span className="big-db-label">Stored data</span>
          <strong>14.8 TiB</strong>
        </div>
        <Bar
          percent={(100 / (14.8 * 1024)) * 100}
          label="The entire 100 GiB buffer pool is only about 0.66 percent of the 14.8 TiB stored dataset."
        />
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
    <Figure title="Read traffic over 24 hours">
      <div className="big-db-traffic-summary">
        <div>
          <IconLabel kind="read">Reads</IconLabel>
          <strong>
            {trafficSummary.reads.average.toLocaleString("en-US")} / s total
          </strong>
        </div>
        <div>
          <IconLabel kind="write">Writes</IconLabel>
          <strong>1 per 100 reads</strong>
        </div>
      </div>
      <Chart
        className="big-db-traffic-chart"
        definition={trafficChart}
        height={260}
        ariaLabel="Total SELECT rate across three primaries over 24 hours"
        ariaDescription="An illustrative daily curve centered on the reported total of 10,000 SELECTs per second across all three primaries. The shape and 12,000 peak are illustrative, not measured."
      />
    </Figure>
  );
}

export function BigDatabaseTopologyFigure() {
  const id = useId();
  return (
    <Figure title="Three primaries, six replicas">
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
    <Figure figureRef={playback.figure} title="Reads favor recent rows">
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
