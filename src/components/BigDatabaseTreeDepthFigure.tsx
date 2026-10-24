import { useId } from "react";
import {
  DEPTH_DURATION_MS,
  DEPTH_LEVELS,
  DEPTH_PATHS,
  treeDepthSnapshot,
} from "~/demos/big-database/tree-depth";
import { useVisibleAnimationClock } from "~/demos/big-database/use-visible-animation-clock";

export function BigDatabaseTreeDepthFigure() {
  const id = useId();
  const playback = useVisibleAnimationClock(DEPTH_DURATION_MS);
  const state = treeDepthSnapshot(
    playback.reduced ? DEPTH_DURATION_MS : playback.elapsed,
  );
  return (
    <figure
      ref={playback.figure}
      className="big-db-figure big-db-depth"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      aria-labelledby={`${id}-title`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          Four levels to a row
        </p>
        <div className="big-db-flow-controls">
          <button
            type="button"
            onClick={playback.replay}
            disabled={playback.reduced}
            aria-label="Replay tree depth"
          >
            Replay
          </button>
        </div>
      </header>
      <div className="big-db-stage" data-graphic-stage="padded">
        <svg
          className="big-db-depth-svg"
          viewBox="0 0 360 370"
          role="img"
          aria-labelledby={`${id}-svg-title ${id}-desc`}
        >
          <title id={`${id}-svg-title`}>A four-level primary-key lookup</title>
          <desc id={`${id}-desc`}>
            The root and two routing levels lead to a leaf containing the row.
            Blue upper pages are cached. A blue request follows one branch to an
            orange hot leaf; green outlines mark visited pages. In this example
            all four visited pages are in memory. Other leaves remain gray. Only
            a few branches are drawn, not the actual fan-out.
          </desc>
          {DEPTH_LEVELS.slice(1).flatMap((level, i) =>
            level.pages.map((x, j) => {
              const parent = DEPTH_LEVELS[i];
              const parentX = parent.pages[Math.floor(j / 2)];
              const middle = (parent.y + level.y) / 2;
              return (
                <path
                  key={`${i}-${x}`}
                  d={`M${parentX} ${parent.y + 14}V${middle}H${x}V${level.y - (i === 2 ? 18 : 14)}`}
                  className="big-db-depth-branch"
                />
              );
            }),
          )}
          {DEPTH_PATHS.map((points, i) => (
            <path
              key={i}
              d={points
                .map(([x, y], j) => `${j ? "L" : "M"}${x} ${y}`)
                .join(" ")}
              className="big-db-depth-route"
              data-visited={state.level > i}
            />
          ))}
          {DEPTH_LEVELS.map((level, i) => (
            <g key={level.label}>
              <text x="8" y={level.y + 5} className="big-db-depth-level">
                {level.label}
              </text>
              {level.pages.map((x) => {
                const leaf = i === 3;
                const width = leaf ? 20 : 40;
                const height = leaf ? 36 : 28;
                const hot = leaf && x === level.selected;
                return (
                  <g
                    key={x}
                    className="big-db-depth-page"
                    data-level={i + 1}
                    data-cached={!leaf || hot}
                    data-hot={hot}
                    data-visited={x === level.selected && state.level >= i}
                  >
                    <rect
                      x={x - width / 2}
                      y={level.y - height / 2}
                      width={width}
                      height={height}
                      rx="2"
                    />
                    {leaf ? (
                      [-8, 0, 8].map((offset) => (
                        <path
                          key={offset}
                          d={`M${x - 5} ${level.y + offset}h10`}
                        />
                      ))
                    ) : (
                      <path d={`M${x - 7} ${level.y - 7}v14m14-14v14`} />
                    )}
                  </g>
                );
              })}
            </g>
          ))}
          <text
            x="200"
            y="12"
            textAnchor="middle"
            className="big-db-depth-note"
          >
            Upper levels cached
          </text>
          <text
            x="152"
            y="352"
            textAnchor="middle"
            className="big-db-depth-note"
          >
            Other leaves
          </text>
          <text x="328" y="352" textAnchor="end" className="big-db-depth-note">
            Hot leaf
          </text>
          {state.packet && !playback.reduced && (
            <circle
              data-depth-request
              cx={state.packet[0]}
              cy={state.packet[1]}
              r="4"
              className="big-db-id-read"
            />
          )}
        </svg>
      </div>
      <figcaption>
        <p className="big-db-depth-status" role="status" aria-live="polite">
          {state.status}
        </p>
      </figcaption>
    </figure>
  );
}
