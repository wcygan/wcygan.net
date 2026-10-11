import { useId } from "react";
import { TechnicalIconGlyph } from "./BigDatabaseTechnicalIcon";
import { pointOnPath, type Point } from "~/demos/big-database/query-flow";
import { CACHE_LANE_COUNT } from "~/demos/big-database/working-set";
import { useWorkingSetPlayback } from "~/demos/big-database/use-working-set-playback";

const LANES = Array.from({ length: CACHE_LANE_COUNT }, (_, lane) => {
  const x = 48 + lane * 36;
  return {
    request: [
      [x, 60],
      [x, 158],
    ] as Point[],
    response: [
      [x, 158],
      [x, 60],
    ] as Point[],
  };
});
const DISK: Point[] = [
  [180, 242],
  [180, 318],
];
const path = (points: readonly Point[]) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

export function BigDatabaseWorkingSetFigure() {
  const id = useId();
  const playback = useWorkingSetPlayback();
  const state = playback.snapshot;
  return (
    <figure
      ref={playback.figure}
      className="big-db-figure big-db-flow"
      data-graphic-frame="plate"
      data-graphic-kind="svg"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          Most reads stay in memory
        </p>
      </header>
      <div className="big-db-stage" data-graphic-stage="padded">
        <svg
          viewBox="-48 0 456 460"
          className="big-db-reuse-svg"
          role="img"
          aria-labelledby={`${id}-svg-title ${id}-desc`}
        >
          <title id={`${id}-svg-title`}>
            Frequent memory reads and occasional slow disk reads
          </title>
          <desc id={`${id}-desc`}>
            The application sends concurrent page-read requests along eight
            parallel lanes to the database. Its 100 GB buffer pool serves 99
            percent from memory. One percent miss and wait on the 15 TB disk,
            then load the page into the buffer pool before returning. Blue
            requests return quickly; orange requests take longer. This
            illustrative sample rounds the reported 98.7 percent hit rate.
          </desc>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 -5 10 10"
              refX="10"
              refY="0"
              markerUnits="userSpaceOnUse"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 -5L10 0L0 5Z" fill="context-stroke" />
            </marker>
          </defs>
          <rect
            x="8"
            y="112"
            width="344"
            height="336"
            rx="3"
            className="big-db-reuse-database"
          />
          <text x="28" y="438" className="big-db-reuse-muted">
            DATABASE
          </text>
          {LANES.map((lane, i) => (
            <path
              key={i}
              d={path(lane.request)}
              className="big-db-reuse-track"
              markerEnd={`url(#${id}-arrow)`}
            />
          ))}
          <path
            d={path(DISK)}
            className="big-db-reuse-wire"
            data-miss="true"
            markerEnd={`url(#${id}-arrow)`}
          />
          <rect
            x="28"
            y="12"
            width="304"
            height="48"
            rx="2"
            className="big-db-reuse-node"
          />
          <text x="180" y="42" textAnchor="middle">
            APPLICATION
          </text>
          <rect
            x="28"
            y="158"
            width="304"
            height="84"
            rx="2"
            className="big-db-reuse-pool"
          />
          <text x="48" y="189">
            Buffer pool
          </text>
          <text x="48" y="220" className="big-db-reuse-hit-label">
            100 GB · 99% hits
          </text>
          <text
            x="312"
            y="189"
            textAnchor="end"
            className="big-db-reuse-latency big-db-reuse-hit-label"
          >
            ~100 ns
          </text>
          <text x="312" y="220" textAnchor="end" className="big-db-reuse-muted">
            RAM access
          </text>
          <rect
            x="28"
            y="318"
            width="304"
            height="84"
            rx="2"
            className="big-db-reuse-disk"
          />
          <text x="48" y="349">
            Disk (SSD)
          </text>
          <text x="48" y="380" className="big-db-reuse-miss-label">
            15 TB · 1% misses
          </text>
          <text
            x="312"
            y="349"
            textAnchor="end"
            className="big-db-reuse-latency big-db-reuse-miss-label"
          >
            ~50 µs
          </text>
          <text x="312" y="380" textAnchor="end" className="big-db-reuse-muted">
            SSD access
          </text>
          <g
            className="big-db-reuse-hardware"
            data-hardware="ram"
            transform="translate(364 172)"
          >
            <g
              className="big-db-icon big-db-hardware-icon"
              transform="scale(0.833333)"
            >
              <TechnicalIconGlyph kind="ram" />
            </g>
            <text x="20" y="62" textAnchor="middle">
              RAM
            </text>
          </g>
          <g
            className="big-db-reuse-hardware"
            data-hardware="disk"
            transform="translate(364 332)"
          >
            <g
              className="big-db-icon big-db-hardware-icon"
              transform="scale(0.833333)"
            >
              <TechnicalIconGlyph kind="ssd" />
            </g>
            <text x="20" y="62" textAnchor="middle">
              Disk
            </text>
          </g>
          <text x="200" y="284" className="big-db-reuse-muted">
            cache miss
          </text>
          {!playback.reduced &&
            state.packets.map((read) => {
              const lane = LANES[read.lane];
              let position: Point;
              switch (read.phase) {
                case "lookup":
                  position = pointOnPath(lane.request, read.progress);
                  break;
                case "memory":
                  position = lane.request[1];
                  break;
                case "disk":
                  position = pointOnPath(DISK, read.progress);
                  break;
                case "wait":
                  position = [180, 318];
                  break;
                case "fill":
                  position = pointOnPath([...DISK].reverse(), read.progress);
                  break;
                case "return":
                  position = pointOnPath(lane.response, read.progress);
                  break;
              }
              const waiting = read.phase === "wait";
              return (
                <g
                  key={read.id}
                  data-request={read.id}
                  data-lane={read.lane}
                  data-phase={read.phase}
                  data-waiting={waiting}
                >
                  {read.phase === "fill" ? (
                    <rect
                      x={position[0] - 6}
                      y={position[1] - 7}
                      width="12"
                      height="14"
                      rx="1"
                      className="big-db-reuse-packet"
                      data-miss="true"
                    />
                  ) : read.phase === "return" ? (
                    <path
                      d={`M${position[0]} ${position[1] - 4}l-3.5 7h7Z`}
                      className="big-db-reuse-packet"
                      data-miss={read.miss}
                    />
                  ) : (
                    <circle
                      cx={position[0]}
                      cy={position[1]}
                      r={read.miss ? 6 : 3}
                      className="big-db-reuse-packet"
                      data-miss={read.miss}
                    />
                  )}
                  {waiting && (
                    <circle
                      cx={position[0]}
                      cy={position[1]}
                      r="11"
                      className="big-db-reuse-wait"
                    />
                  )}
                </g>
              );
            })}
        </svg>
      </div>
      <figcaption id={`${id}-caption`}>
        <p className="big-db-flow-status" role="status">
          Illustrative page reads: 99% memory · 1% disk.
        </p>
      </figcaption>
    </figure>
  );
}
