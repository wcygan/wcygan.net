import { useId } from "react";
import {
  WAR_STORY_DEPLOY_HOUR,
  WAR_STORY_POINTS,
  WAR_STORY_POST_FIX_QPS,
  type WarStoryPoint,
} from "~/demos/fanout-war-story/model";

const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 430;
const CHART_LEFT = 76;
const CHART_RIGHT = 714;
const CHART_TOP = 62;
const CHART_BOTTOM = 326;
const QPS_MAX = 8_000;

export function FanoutWarStoryDemo() {
  const markerSuffix = useId().replaceAll(":", "");
  const titleId = `fanout-war-story-title-${markerSuffix}`;
  const descriptionId = `fanout-war-story-description-${markerSuffix}`;
  const captionId = `fanout-war-story-caption-${markerSuffix}`;
  const deployPoint = WAR_STORY_POINTS.find(
    (point) => point.hour === WAR_STORY_DEPLOY_HOUR,
  );

  if (!deployPoint) return null;

  const preFixPoints = WAR_STORY_POINTS.filter(
    (point) => point.hour <= WAR_STORY_DEPLOY_HOUR,
  );
  const postFixPoints = WAR_STORY_POINTS.filter(
    (point) => point.hour >= WAR_STORY_DEPLOY_HOUR,
  );
  const deployX = xForHour(WAR_STORY_DEPLOY_HOUR);

  return (
    <figure
      className="fanout-war-story"
      data-graphic-frame="plate"
      data-graphic-key="fanout-war-story"
      data-graphic-kind="svg"
      data-phase="settled"
      data-complete="true"
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${captionId}`}
    >
      <header className="fanout-war-story-header">
        <div>
          <p className="article-graphic-title" id={titleId}>
            Traffic over time
          </p>
          <p>The hot path normalizes after the bug is fixed</p>
        </div>
      </header>

      <div
        className="fanout-war-story-stage"
        data-graphic-stage="padded"
        aria-hidden="true"
      >
        <svg
          className="fanout-war-story-svg"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <text className="fanout-war-story-axis-title" x="18" y="50">
            QPS
          </text>

          {[0, 2_000, 4_000, 6_000, 8_000].map((qps) => (
            <g key={qps}>
              <line
                className="fanout-war-story-grid-line"
                x1={CHART_LEFT}
                y1={yForQps(qps)}
                x2={CHART_RIGHT}
                y2={yForQps(qps)}
              />
              <text
                className="fanout-war-story-axis-label"
                x={CHART_LEFT - 12}
                y={yForQps(qps) + 4}
                textAnchor="end"
              >
                {qps === 0 ? "0" : `${qps / 1_000}k`}
              </text>
            </g>
          ))}

          <line
            className="fanout-war-story-axis-line"
            x1={CHART_LEFT}
            y1={CHART_BOTTOM}
            x2={CHART_RIGHT}
            y2={CHART_BOTTOM}
          />

          {[0, 12, 24, 36, 48].map((hour) => (
            <text
              className="fanout-war-story-time-label"
              key={hour}
              x={xForHour(hour)}
              y={CHART_BOTTOM + 26}
              textAnchor="middle"
            >
              {hour === 0
                ? "Day 1 · 00:00"
                : hour === 24
                  ? "Day 2 · 00:00"
                  : `${hour}h`}
            </text>
          ))}

          <path
            className="fanout-war-story-series fanout-war-story-series-input"
            data-series="input"
            d={pathFor(WAR_STORY_POINTS, (point) => point.inputQps)}
          />
          <path
            className="fanout-war-story-series fanout-war-story-series-hot"
            data-series="downstream-before-fix"
            d={pathFor(preFixPoints, (point) => point.downstreamQps)}
          />
          <line
            className="fanout-war-story-deploy-drop"
            x1={deployX}
            y1={yForQps(deployPoint.downstreamQps)}
            x2={deployX}
            y2={yForQps(WAR_STORY_POST_FIX_QPS)}
          />
          <path
            className="fanout-war-story-series fanout-war-story-series-fixed"
            data-series="downstream-after-fix"
            d={pathFor(postFixPoints, (point) => point.postFixQps)}
          />

          <line
            className="fanout-war-story-deploy-marker"
            x1={deployX}
            y1={CHART_TOP}
            x2={deployX}
            y2={CHART_BOTTOM}
          />
          <text
            className="fanout-war-story-deploy-label"
            x={deployX}
            y="42"
            textAnchor="middle"
          >
            fix merged + deployed
          </text>

          <g className="fanout-war-story-legend" transform="translate(76 18)">
            <line
              className="fanout-war-story-legend-line fanout-war-story-legend-input"
              x1="0"
              y1="0"
              x2="28"
              y2="0"
            />
            <text x="36" y="4">
              input · 1k–4k QPS
            </text>
            <line
              className="fanout-war-story-legend-line fanout-war-story-legend-hot"
              x1="190"
              y1="0"
              x2="218"
              y2="0"
            />
            <text x="226" y="4">
              downstream · 2×
            </text>
          </g>

          <g className="fanout-war-story-outcome">
            <line
              x1={deployX + 8}
              y1={yForQps(WAR_STORY_POST_FIX_QPS)}
              x2={deployX + 24}
              y2="174"
            />
            <text
              className="fanout-war-story-outcome-label"
              x={deployX + 30}
              y="168"
            >
              ~10 QPS after fix
            </text>
            <text
              className="fanout-war-story-outcome-detail"
              x={deployX + 30}
              y="186"
            >
              99% avoided
            </text>
          </g>
        </svg>
      </div>

      <p className="sr-only" id={descriptionId}>
        A two-day traffic timeline shows Service A oscillating between 1,000 and
        4,000 queries per second. Before the fix, two downstream calls per query
        pushed 2,000 to 8,000 queries per second downstream. After the fix was
        merged and deployed at hour 36, only about 10 downstream queries per
        second remained because 99 percent of the fanout was redundant.
      </p>

      <p className="sr-only">
        Fix deployed. Downstream traffic settled near 10 queries per second,
        avoiding 99 percent of the redundant fanout.
      </p>
    </figure>
  );
}

function pathFor(
  points: WarStoryPoint[],
  valueFor: (point: WarStoryPoint) => number,
) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${xForHour(point.hour)} ${yForQps(valueFor(point))}`;
    })
    .join(" ");
}

function xForHour(hour: number) {
  return CHART_LEFT + (hour / 48) * (CHART_RIGHT - CHART_LEFT);
}

function yForQps(qps: number) {
  return CHART_BOTTOM - (qps / QPS_MAX) * (CHART_BOTTOM - CHART_TOP);
}
