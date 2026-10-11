import { useEffect, useId, useState } from "react";
import { pointOnPath, type Point } from "~/demos/big-database/query-flow";
import { useWorkingSetPlayback } from "~/demos/big-database/use-working-set-playback";

export function BigDatabaseWorkingSetFigure() {
  const id = useId();
  const playback = useWorkingSetPlayback();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const state = playback.snapshot;
  const width = compact ? 320 : 600;
  const center = width / 2;
  const pool = { x: 16, y: 120, w: width - 32, h: compact ? 242 : 168 };
  const disk = { x: 16, y: pool.y + pool.h + 90, w: width - 32, h: 110 };
  const source: Point = [center, 74];
  const tileWidth = compact ? 112 : 118;
  const tiles = ["P1", "P2", "P3", "P4"].map((page, i) => ({
    page,
    x: pool.x + 16 + (i % (compact ? 2 : 4)) * (tileWidth + 12),
    y: pool.y + 90 + (compact ? Math.floor(i / 2) * 62 : 0),
  }));
  const target = tiles.find((tile) => tile.page === state.page)!;
  const targetPort: Point = [target.x + tileWidth / 2, target.y];
  const diskPort: Point = [center, disk.y];
  const lookup: Point[] = [
    source,
    [center, 100],
    [8, 100],
    [8, target.y - 8],
    [targetPort[0], target.y - 8],
    targetPort,
  ];
  const missing = tiles[3];
  const diskPath: Point[] = [
    [missing.x + tileWidth / 2, missing.y + 48],
    [missing.x + tileWidth / 2, pool.y + pool.h + 36],
    [center, pool.y + pool.h + 36],
    diskPort,
  ];
  const fill: Point[] = [
    diskPort,
    [width - 8, disk.y],
    [width - 8, missing.y + 24],
    [missing.x + tileWidth, missing.y + 24],
  ];
  const route =
    state.phase === "disk"
      ? diskPath
      : state.phase === "fill"
        ? fill
        : state.phase === "return"
          ? [...lookup].reverse()
          : lookup;
  const packet = pointOnPath(route, state.progress);
  const orange = state.read === 6 && state.phase !== "return";
  const path = (points: readonly Point[]) =>
    points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const status = state.complete
    ? "Read once from SSD. Reuse from RAM."
    : state.phase === "disk"
      ? "Miss · read P4 from SSD"
      : state.phase === "fill"
        ? "Copy P4 into RAM"
        : state.phase === "return"
          ? state.read === 6
            ? "Return · P4 now cached"
            : `Hit · return from ${state.page}`
          : `Read ${state.read + 1} → ${state.page}`;
  return (
    <figure
      ref={playback.figure}
      className="big-db-figure big-db-flow"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      aria-labelledby={`${id}-title`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          Recent pages, repeated reads
        </p>
      </header>
      <div className="big-db-flow-controls" aria-label="Working-set playback">
        <button type="button" onClick={playback.run}>
          {playback.reduced
            ? "Show result"
            : playback.playing
              ? "Pause"
              : "Play"}
        </button>
        <button type="button" onClick={playback.step} disabled={state.complete}>
          Step
        </button>
        <button type="button" onClick={playback.replay}>
          Replay
        </button>
      </div>
      <div
        className="big-db-stage big-db-reuse-stage"
        data-graphic-stage="padded"
      >
        <div className="big-db-reuse-metrics">
          <span>
            <strong>98.7%</strong> RAM page reads
          </span>
          <span>
            <strong>1.3%</strong> misses
          </span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${disk.y + disk.h + 16}`}
          className="big-db-reuse-svg"
          role="img"
          aria-labelledby={`${id}-svg-title ${id}-desc`}
        >
          <title id={`${id}-svg-title`}>
            Repeated reads reuse recent pages in the buffer pool
          </title>
          <desc id={`${id}-desc`}>
            Six reads hit cached pages. A seventh read misses, copies page P4
            from SSD to RAM, then returns. Two more reads hit RAM, including the
            new copy. SSD keeps its persistent copies.
          </desc>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 -4 8 8"
              refX="8"
              refY="0"
              markerUnits="userSpaceOnUse"
              markerWidth="8"
              markerHeight="8"
              orient="auto"
            >
              <path d="M0 -3L8 0L0 3" fill="none" stroke="context-stroke" />
            </marker>
          </defs>
          <rect
            x={center - 70}
            y="26"
            width="140"
            height="48"
            className="big-db-reuse-node"
          />
          <text x={center} y="55" textAnchor="middle">
            READ {state.complete ? "9 / 9" : `${state.read + 1} / 9`}
          </text>
          <rect
            x={pool.x}
            y={pool.y}
            width={pool.w}
            height={pool.h}
            className="big-db-reuse-pool"
          />
          <text x={pool.x + 16} y={pool.y + 26}>
            100 GB BUFFER POOL
          </text>
          <text x={pool.x + 16} y={pool.y + 52} className="big-db-reuse-muted">
            Index pages · cached
          </text>
          <text x={pool.x + 16} y={pool.y + 78} className="big-db-reuse-muted">
            Recent orders · last ~2 weeks
          </text>
          {tiles.map((tile) => {
            const cached = tile.page !== "P4" || state.cached;
            return (
              <g key={tile.page} data-page={tile.page} data-cached={cached}>
                <rect
                  x={tile.x}
                  y={tile.y}
                  width={tileWidth}
                  height="48"
                  className="big-db-reuse-page"
                  data-empty={!cached}
                  data-active={state.page === tile.page && !state.complete}
                />
                <text
                  x={tile.x + tileWidth / 2}
                  y={tile.y + 29}
                  textAnchor="middle"
                >
                  {cached ? tile.page : "P4 · absent"}
                </text>
              </g>
            );
          })}
          <rect
            x={disk.x}
            y={disk.y}
            width={disk.w}
            height={disk.h}
            className="big-db-reuse-node"
          />
          <text x={disk.x + 16} y={disk.y + 26}>
            15 TB SSD
          </text>
          <text x={disk.x + 16} y={disk.y + 52} className="big-db-reuse-muted">
            P1 · P2 · P3 · P4 · persistent copies
          </text>
          <text x={disk.x + 16} y={disk.y + 80} className="big-db-reuse-muted">
            Older history · rarely read
          </text>
          <path d={path(diskPath)} className="big-db-reuse-wire" />
          <path d={path(fill)} className="big-db-reuse-wire" />
          {!state.complete && (
            <path
              d={path(route)}
              className="big-db-reuse-route"
              data-miss={orange}
              markerEnd={`url(#${id}-arrow)`}
            />
          )}
          {!state.complete && !playback.reduced && (
            <g>
              <rect
                x={packet[0] - (state.phase === "fill" ? 14 : 5)}
                y={packet[1] - (state.phase === "fill" ? 12 : 5)}
                width={state.phase === "fill" ? 28 : 10}
                height={state.phase === "fill" ? 24 : 10}
                className="big-db-reuse-packet"
                data-miss={orange}
              />
              {state.phase === "fill" && (
                <text
                  x={packet[0]}
                  y={packet[1] + 4}
                  textAnchor="middle"
                  className="big-db-reuse-transfer-label"
                >
                  P4
                </text>
              )}
            </g>
          )}
          <text
            x={center}
            y={disk.y - 16}
            textAnchor="middle"
            className="big-db-reuse-muted"
          >
            {state.ssdReads} SSD page read{state.ssdReads === 1 ? "" : "s"}
          </text>
        </svg>
      </div>
      <p className="big-db-flow-status" role="status">
        {status}
      </p>
      <figcaption>
        Illustrative sequence and working-set fit, slowed for teaching. The
        reported 98.7% measures page reads served from RAM, not the fraction of
        recent data cached. SSD retains all persistent pages.
      </figcaption>
    </figure>
  );
}
