import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";
import {
  aggregateBlocks,
  applyInsertedBatch,
  combineBlockTotals,
  derivePipelineSnapshot,
  EVENTS,
  INSERT_BATCHES,
  pruneGranules,
} from "~/demos/clickhouse-2d/model";
import { useClickHousePlayback } from "~/demos/clickhouse-playback";
import "~/styles/clickhouse-theme.css";
import "~/styles/clickhouse-2d.css";

type Playback = ReturnType<typeof useClickHousePlayback>;
type Point = readonly [number, number];
type Bounds = { x: number; y: number; w: number; h: number };
type Tone = "orange" | "blue" | "green" | "yellow" | "red" | "purple";
const toneColor = (tone: Tone) => `var(--ch-${tone})`;

function useCompactDiagram() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return compact;
}

/** Bounds describe the visible outline; routes enter its exact face centers. */
function port(
  bounds: Bounds,
  face: "left" | "right" | "top" | "bottom",
): Point {
  switch (face) {
    case "left":
      return [bounds.x, bounds.y + bounds.h / 2];
    case "right":
      return [bounds.x + bounds.w, bounds.y + bounds.h / 2];
    case "top":
      return [bounds.x + bounds.w / 2, bounds.y];
    case "bottom":
      return [bounds.x + bounds.w / 2, bounds.y + bounds.h];
  }
}

function pointOnRoute(points: readonly Point[], fraction: number): Point {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - points[index][0], point[1] - points[index][1]),
    );
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * fraction;
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index]) {
      const ratio = lengths[index] ? remaining / lengths[index] : 0;
      return [
        points[index][0] + (points[index + 1][0] - points[index][0]) * ratio,
        points[index][1] + (points[index + 1][1] - points[index][1]) * ratio,
      ];
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
}

function Route({
  points,
  tone = "blue",
  active = true,
  moving = false,
  fraction = 0,
  packet = "",
}: {
  points: readonly Point[];
  tone?: Tone;
  active?: boolean;
  moving?: boolean;
  fraction?: number;
  packet?: string;
}) {
  const id = useId();
  const color = active ? toneColor(tone) : "var(--ch-track)";
  const point = pointOnRoute(points, Math.max(0, Math.min(1, fraction)));
  return (
    <g>
      <defs>
        <marker
          id={id}
          viewBox="0 -4 8 8"
          refX="8"
          refY="0"
          markerWidth="8"
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path
            d="M0 -3 L8 0 L0 3"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
        </marker>
      </defs>
      <path
        d={points
          .map((point, index) => `${index ? "L" : "M"}${point[0]} ${point[1]}`)
          .join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="5 5"
        markerEnd={`url(#${id})`}
      />
      {moving && fraction > 0 && (
        <g transform={`translate(${point[0]} ${point[1]})`}>
          <rect
            x="-11"
            y="-11"
            width="22"
            height="22"
            rx="3"
            fill={toneColor(tone)}
          />
          {packet && (
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fontSize="14"
              fill="var(--ch-bg)"
            >
              {packet}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

function Text({
  x,
  y,
  children,
  size = 14,
  tone,
  muted = false,
  anchor = "start",
  ...props
}: Omit<ComponentPropsWithoutRef<"text">, "fontSize" | "textAnchor"> & {
  x: number;
  y: number;
  size?: number;
  tone?: Tone;
  muted?: boolean;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      {...props}
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      data-tone={tone}
      fill={muted ? "var(--ch-muted)" : "var(--ch-text)"}
    >
      {children}
    </text>
  );
}

function Panel({
  bounds,
  tone,
  children,
}: {
  bounds: Bounds;
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.w}
        height={bounds.h}
        rx="4"
        fill="var(--ch-panel)"
        stroke={toneColor(tone)}
        strokeWidth="1.5"
      />
      <path
        d={`M${bounds.x} ${bounds.y + 28} H${bounds.x + bounds.w}`}
        stroke="var(--ch-node-border)"
      />
      {children}
    </g>
  );
}

function Database({
  bounds,
  tone,
  children,
}: {
  bounds: Bounds;
  tone: Tone;
  children: ReactNode;
}) {
  const { x, y, w, h } = bounds;
  return (
    <g>
      <path
        d={`M${x} ${y + 16} V${y + h - 16} A${w / 2} 16 0 0 0 ${x + w} ${y + h - 16} V${y + 16} Z`}
        fill="var(--ch-panel)"
        stroke={toneColor(tone)}
        strokeWidth="1.5"
      />
      <ellipse
        cx={x + w / 2}
        cy={y + 16}
        rx={w / 2}
        ry="16"
        fill="var(--ch-panel)"
        stroke={toneColor(tone)}
        strokeWidth="1.5"
      />
      {children}
    </g>
  );
}

function Figure({
  name,
  title,
  playback,
  query,
  options,
  children,
  status,
}: {
  name: string;
  title: string;

  playback: Playback;
  query?: string;
  options?: ReactNode;
  children: ReactNode;
  status: ReactNode;
}) {
  const id = useId();
  return (
    <figure
      className="clickhouse-demo ch-2d"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      data-graphic-key={`clickhouse-${name}`}
      data-step={playback.step}
      data-playing={playback.playing}
      data-running={playback.running}
      aria-labelledby={`${id}-title`}
    >
      <header className="ch-header">
        <p className="ch-title article-graphic-title" id={`${id}-title`}>
          {title}
        </p>
      </header>
      {options && <div className="ch-options">{options}</div>}
      <div className="ch-controls">
        <button
          type="button"
          disabled={playback.reducedMotion}
          onClick={playback.togglePlayback}
        >
          {playback.playing
            ? "Pause"
            : playback.step === playback.totalSteps - 1
              ? "Replay"
              : "Play"}
        </button>
        <button
          type="button"
          onClick={playback.next}
          disabled={playback.step === playback.totalSteps - 1}
        >
          Next step
        </button>
        <button type="button" onClick={playback.reset}>
          Reset
        </button>
      </div>
      <div
        className="ch-stage"
        data-graphic-stage="padded"
        ref={playback.stageRef}
      >
        {query && <code className="ch-query">{query}</code>}
        {children}
      </div>
      <div
        className="ch-status"
        role="status"
        aria-live={playback.playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <p className="ch-step-count">
          STEP {playback.step + 1} / {playback.totalSteps}
        </p>
        {status}
      </div>
    </figure>
  );
}

function Diagram({
  width,
  height,
  label,
  children,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <svg
      className="ch-diagram"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

export function ClickHouseWorkloadDemo() {
  const compact = useCompactDiagram();
  const [analytical, setAnalytical] = useState(true);
  const playback = useClickHousePlayback(3);
  const { step, fraction } = playback;
  const query: Bounds = compact
    ? { x: 20, y: 20, w: 280, h: 88 }
    : { x: 20, y: 25, w: 180, h: 100 };
  const data: Bounds = compact
    ? { x: 20, y: 185, w: 280, h: 220 }
    : { x: 260, y: 10, w: 340, h: 220 };
  const result: Bounds = compact
    ? { x: 20, y: 485, w: 280, h: 125 }
    : { x: 20, y: 310, w: 580, h: 110 };
  const incoming: readonly Point[] = compact
    ? [port(query, "bottom"), port(data, "top")]
    : [port(query, "right"), [230, 75], [230, 120], port(data, "left")];
  const outgoing: readonly Point[] = compact
    ? [port(data, "bottom"), port(result, "top")]
    : [port(data, "bottom"), [430, 270], [310, 270], port(result, "top")];
  const totals = applyInsertedBatch({}, EVENTS);
  return (
    <Figure
      name="workload"
      title="One record or many-row analytics"
      playback={playback}
      query={
        analytical
          ? "SELECT day, sum(revenue_cents) FROM events WHERE event = 'buy' GROUP BY day"
          : "SELECT event_id, day, event, revenue_cents FROM events WHERE event_id = 6"
      }
      options={
        <div role="group" aria-label="Choose a workload">
          <button
            type="button"
            aria-pressed={!analytical}
            onClick={() => {
              playback.pause();
              setAnalytical(false);
              playback.reset();
            }}
          >
            One record
          </button>
          <button
            type="button"
            aria-pressed={analytical}
            onClick={() => {
              playback.pause();
              setAnalytical(true);
              playback.reset();
            }}
          >
            Daily revenue
          </button>
        </div>
      }
      status={
        step === 2 && (
          <p>
            {analytical
              ? Object.entries(totals)
                  .map(([day, amount]) => `Day ${day}: ${amount}¢`)
                  .join(" · ")
              : "#6 · Day 2 · buy · 70¢"}
          </p>
        )
      }
    >
      <Diagram
        width={compact ? 320 : 620}
        height={compact ? 635 : 450}
        label="Query travels to 12 events; a point lookup returns one record while analytics returns four daily totals."
      >
        <Route
          points={incoming}
          tone="orange"
          moving={step === 0}
          fraction={fraction}
          packet="Q"
        />
        <Route
          points={outgoing}
          tone="green"
          active={step >= 1}
          moving={step === 1}
          fraction={fraction}
          packet={analytical ? "4" : "1"}
        />
        <Panel bounds={query} tone="orange">
          <Text x={query.x + 14} y={query.y + 19} tone="orange">
            QUESTION
          </Text>
          <Text x={query.x + 14} y={query.y + 54} size={compact ? 18 : 16}>
            {analytical ? "Daily revenue?" : "Event 6?"}
          </Text>
          <Text x={query.x + 14} y={query.y + 77} muted>
            {analytical ? "GROUP BY day" : "event_id = 6"}
          </Text>
        </Panel>
        <Database bounds={data} tone="blue">
          <Text
            x={data.x + data.w / 2}
            y={data.y + 55}
            tone="blue"
            anchor="middle"
          >
            12 SOURCE EVENTS
          </Text>
          {EVENTS.map((row, index) => {
            const x = data.x + 18 + (index % 4) * ((data.w - 36) / 4);
            const y = data.y + 76 + Math.floor(index / 4) * 41;
            const selected =
              step >= 1 && (analytical ? row.event === "buy" : row.id === 6);
            return (
              <g key={row.id}>
                <rect
                  x={x}
                  y={y}
                  width={(data.w - 48) / 4}
                  height="32"
                  rx="2"
                  fill={
                    selected
                      ? toneColor(analytical ? "yellow" : "orange")
                      : "var(--ch-bg)"
                  }
                  stroke={
                    selected
                      ? toneColor(analytical ? "yellow" : "orange")
                      : "var(--ch-node-border)"
                  }
                />
                <text
                  x={x + (data.w - 48) / 8}
                  y={y + 21}
                  textAnchor="middle"
                  fontSize="15"
                  fill={selected ? "var(--ch-bg)" : "var(--ch-muted)"}
                >
                  #{row.id}
                </text>
              </g>
            );
          })}
        </Database>
        <Panel bounds={result} tone="green">
          <Text x={result.x + 14} y={result.y + 19} tone="green">
            {step === 2
              ? analytical
                ? "4 GROUPED TOTALS"
                : "1 RECORD"
              : "RESULT · WAITING"}
          </Text>
          {step === 2 ? (
            analytical ? (
              Object.entries(totals).map(([day, total], index) => {
                const x = compact
                  ? result.x + 16 + (index % 2) * 130
                  : result.x + 24 + index * 140;
                const y = compact
                  ? result.y + 57 + Math.floor(index / 2) * 45
                  : result.y + 65;
                return (
                  <g key={day}>
                    <Text x={x} y={y} muted>
                      DAY {day}
                    </Text>
                    <Text
                      x={x + (compact ? 75 : 0)}
                      y={compact ? y : y + 25}
                      size={compact ? 18 : 22}
                      tone="green"
                    >
                      {total}¢
                    </Text>
                  </g>
                );
              })
            ) : (
              <>
                <Text x={result.x + 16} y={result.y + 61} size={18}>
                  #6 · DAY 2 · BUY
                </Text>
                <Text
                  x={result.x + 16}
                  y={result.y + 94}
                  tone="green"
                  size={24}
                >
                  70¢
                </Text>
              </>
            )
          ) : null}
        </Panel>
        {compact && (
          <Text x={178} y={151} tone="orange">
            request
          </Text>
        )}
        <Text x={compact ? 178 : 445} y={compact ? 455 : 259} tone="green">
          {analytical ? "summarize" : "return row"}
        </Text>
      </Diagram>
    </Figure>
  );
}

export function ClickHousePipelineDemo() {
  const compact = useCompactDiagram();
  const playback = useClickHousePlayback(4);
  const { step, fraction } = playback;
  const model = derivePipelineSnapshot(step);
  const nodes: Bounds[] = compact
    ? [
        { x: 20, y: 20, w: 280, h: 110 },
        { x: 20, y: 205, w: 280, h: 110 },
        { x: 20, y: 390, w: 280, h: 140 },
        { x: 20, y: 605, w: 280, h: 110 },
      ]
    : [
        { x: 20, y: 20, w: 240, h: 110 },
        { x: 360, y: 20, w: 240, h: 110 },
        { x: 360, y: 245, w: 240, h: 150 },
        { x: 20, y: 265, w: 240, h: 110 },
      ];
  const routes: readonly (readonly Point[])[] = compact
    ? nodes
        .slice(1)
        .map((node, index) => [port(nodes[index], "bottom"), port(node, "top")])
    : [
        [port(nodes[0], "right"), port(nodes[1], "left")],
        [port(nodes[1], "bottom"), port(nodes[2], "top")],
        [port(nodes[2], "left"), port(nodes[3], "right")],
      ];
  const tones: Tone[] = ["orange", "yellow", "blue", "green"];
  return (
    <Figure
      name="pipeline"
      title="From a source event to a fresh answer"
      playback={playback}
      status={
        <>
          <p className="ch-readable-metrics">
            Source: {model.sourceRows} rows · Ingested: {model.ingestedRows} ·
            Pending: {model.pendingRows} · Dashboard: {model.dashboardRevenue}¢
          </p>
        </>
      }
    >
      <Diagram
        width={compact ? 320 : 620}
        height={compact ? 740 : 430}
        label="An event source commits three rows; a configured feed inserts them into ClickHouse before a new dashboard query sees the updated revenue."
      >
        {routes.map((route, index) => (
          <Route
            key={index}
            points={route}
            tone={tones[index + 1]}
            active={step >= index}
            moving={step === index}
            fraction={fraction}
            packet={index === 2 ? "R" : "3"}
          />
        ))}
        {nodes.map((bounds, index) => {
          const content = (
            <>
              <Text
                x={bounds.x + bounds.w / 2}
                y={bounds.y + (index === 2 ? 51 : 20)}
                tone={tones[index]}
                anchor="middle"
              >
                {
                  [
                    "EVENT SOURCE",
                    "CONFIGURED FEED",
                    "CLICKHOUSE",
                    "DASHBOARD",
                  ][index]
                }
              </Text>
              {index === 0 && (
                <>
                  <Text x={bounds.x + 16} y={bounds.y + 62} size={28}>
                    {model.sourceRevenue}¢
                  </Text>
                  <Text x={bounds.x + 16} y={bounds.y + 89} muted>
                    {model.sourceRows} events · append only
                  </Text>
                </>
              )}
              {index === 1 && (
                <>
                  <Text
                    x={bounds.x + 16}
                    y={bounds.y + 61}
                    size={25}
                    tone="yellow"
                  >
                    {model.pendingRows} pending
                  </Text>
                </>
              )}
              {index === 2 && (
                <>
                  <Text
                    x={bounds.x + 16}
                    y={bounds.y + 86}
                    size={28}
                    tone="blue"
                  >
                    {model.storedRevenue}¢
                  </Text>
                  <Text x={bounds.x + 16} y={bounds.y + 112} muted>
                    {model.ingestedRows} queryable events
                  </Text>
                </>
              )}
              {index === 3 && (
                <>
                  <Text
                    x={bounds.x + 16}
                    y={bounds.y + 63}
                    size={28}
                    tone="green"
                  >
                    {model.dashboardRevenue}¢
                  </Text>
                  <Text x={bounds.x + 16} y={bounds.y + 89} muted>
                    {step === 3
                      ? "new query · refreshed"
                      : "previous query snapshot"}
                  </Text>
                </>
              )}
            </>
          );
          return index === 2 ? (
            <Database key={index} bounds={bounds} tone={tones[index]}>
              {content}
            </Database>
          ) : (
            <Panel key={index} bounds={bounds} tone={tones[index]}>
              {content}
            </Panel>
          );
        })}
        <Text
          x={compact ? 178 : 310}
          y={compact ? 169 : 61}
          tone="yellow"
          anchor={compact ? "start" : "middle"}
        >
          {compact ? "capture 3 events" : "capture"}
        </Text>
        <Text x={compact ? 178 : 500} y={compact ? 354 : 193} tone="blue">
          INSERT
        </Text>
        <Text
          x={compact ? 178 : 310}
          y={compact ? 570 : 307}
          tone="green"
          anchor={compact ? "start" : "middle"}
        >
          query result
        </Text>
      </Diagram>
    </Figure>
  );
}

export function ClickHouseAggregationDemo() {
  const compact = useCompactDiagram();
  const playback = useClickHousePlayback(4);
  const { step, fraction } = playback;
  const blocks = aggregateBlocks(EVENTS, 3);
  const input: Bounds = compact
    ? { x: 20, y: 20, w: 280, h: 76 }
    : { x: 200, y: 20, w: 220, h: 76 };
  const output: Bounds = compact
    ? { x: 40, y: 710, w: 240, h: 82 }
    : { x: 200, y: 465, w: 220, h: 82 };
  const blockBounds = blocks.map(
    (_, index): Bounds =>
      compact
        ? {
            x: 20 + (index % 2) * 150,
            y: 185 + Math.floor(index / 2) * 240,
            w: 130,
            h: 180,
          }
        : { x: 20 + index * 150, y: 185, w: 130, h: 180 },
  );
  return (
    <Figure
      name="aggregation"
      title="Filter, aggregate, combine"
      playback={playback}
      query="SELECT sum(revenue_cents) FROM events WHERE event = 'buy'"
      status={
        <p>
          {step === 0
            ? `${EVENTS.length} rows · ${blocks.length} blocks`
            : step === 1
              ? `${blocks.reduce((count, block) => count + block.matchingRows.length, 0)} matching rows`
              : step === 2
                ? blocks.map((block) => `${block.subtotal}¢`).join(" + ")
                : `${combineBlockTotals(blocks)}¢`}
        </p>
      }
    >
      <Diagram
        width={compact ? 320 : 620}
        height={compact ? 815 : 570}
        label="Four blocks filter buy events, calculate partial sums 65,70,95,75 cents, and combine into 305 cents."
      >
        {blockBounds.map((bounds, index) => {
          const start = port(input, "bottom");
          const end = port(bounds, "top");
          const y = compact && index >= 2 ? 395 : 140;
          const inputRoute: readonly Point[] = [
            start,
            [start[0], y],
            [end[0], y],
            end,
          ];
          const outputRoute: readonly Point[] = compact
            ? [
                port(bounds, "bottom"),
                [bounds.x + bounds.w / 2, bounds.y + bounds.h + 28],
                [index % 2 ? 312 : 8, bounds.y + bounds.h + 28],
                [index % 2 ? 312 : 8, 672],
                [160, 672],
                port(output, "top"),
              ]
            : [
                port(bounds, "bottom"),
                [bounds.x + bounds.w / 2, 420],
                [310, 420],
                port(output, "top"),
              ];
          return (
            <g key={index}>
              <Route
                points={inputRoute}
                tone={step >= 1 ? "yellow" : "blue"}
                moving={step === 0}
                fraction={fraction}
                packet="3"
              />
              <Route
                points={outputRoute}
                tone="purple"
                active={step >= 2}
                moving={step === 2}
                fraction={fraction}
              />
            </g>
          );
        })}
        <Panel bounds={input} tone={step >= 1 ? "yellow" : "blue"}>
          <Text
            x={input.x + input.w / 2}
            y={input.y + 20}
            tone={step >= 1 ? "yellow" : "blue"}
            anchor="middle"
          >
            INPUT · 12 EVENTS
          </Text>
          <Text x={input.x + input.w / 2} y={input.y + 57} anchor="middle">
            WHERE event = &apos;buy&apos;
          </Text>
        </Panel>
        {blocks.map((block, index) => {
          const bounds = blockBounds[index];
          return (
            <Panel
              key={block.id}
              bounds={bounds}
              tone={step >= 2 ? "purple" : "blue"}
            >
              <Text
                x={bounds.x + 12}
                y={bounds.y + 20}
                tone={step >= 2 ? "purple" : "blue"}
              >
                BLOCK {index + 1}
              </Text>
              {block.inputRows.map((row, rowIndex) => {
                const discarded = step >= 1 && row.event !== "buy";
                const y = bounds.y + 57 + rowIndex * 24;
                return (
                  <g key={row.id}>
                    <Text
                      x={bounds.x + 12}
                      y={y}
                      tone={
                        step >= 1 ? (discarded ? "red" : "yellow") : undefined
                      }
                    >
                      {row.event}
                    </Text>
                    <Text
                      x={bounds.x + bounds.w - 12}
                      y={y}
                      anchor="end"
                      tone={
                        step >= 1 ? (discarded ? "red" : "yellow") : undefined
                      }
                    >
                      {row.amount}¢
                    </Text>
                    {discarded && (
                      <path
                        d={`M${bounds.x + 8} ${y - 5} H${bounds.x + bounds.w - 8}`}
                        stroke="var(--ch-red)"
                      />
                    )}
                  </g>
                );
              })}
              <path
                d={`M${bounds.x + 12} ${bounds.y + 120} H${bounds.x + bounds.w - 12}`}
                stroke="var(--ch-node-border)"
                strokeDasharray="3 4"
              />
              <Text x={bounds.x + 12} y={bounds.y + 142} size={13} muted>
                PARTIAL SUM
              </Text>
              <Text
                x={bounds.x + 12}
                y={bounds.y + 168}
                size={24}
                tone="purple"
              >
                {step >= 2 ? `${block.subtotal}¢` : "—"}
              </Text>
            </Panel>
          );
        })}
        <Panel bounds={output} tone="green">
          <Text
            x={output.x + output.w / 2}
            y={output.y + 20}
            tone="green"
            anchor="middle"
          >
            COMBINED RESULT
          </Text>
          <Text
            x={output.x + output.w / 2}
            y={output.y + 62}
            size={32}
            tone="green"
            anchor="middle"
          >
            {step === 3 ? `${combineBlockTotals(blocks)}¢` : "—"}
          </Text>
        </Panel>
      </Diagram>
    </Figure>
  );
}

const PRUNING_RANGES = [
  { label: "Day 2", from: 2, to: 2 },
  { label: "Days 2–3", from: 2, to: 3 },
  { label: "Day 4", from: 4, to: 4 },
] as const;

export function ClickHousePruningDemo() {
  const compact = useCompactDiagram();
  const [rangeIndex, setRangeIndex] = useState(0);
  const playback = useClickHousePlayback(3);
  const { step, fraction } = playback;
  const range = PRUNING_RANGES[rangeIndex];
  const model = pruneGranules(EVENTS, range.from, range.to, 2);
  const output: Bounds = compact
    ? { x: 40, y: 635, w: 240, h: 85 }
    : { x: 160, y: 330, w: 300, h: 80 };
  return (
    <Figure
      name="pruning"
      title="Sparse marks narrow the scan"
      playback={playback}
      query={`WHERE day BETWEEN ${range.from} AND ${range.to} · toy ORDER BY day`}
      options={
        <div role="group" aria-label="Select a day range">
          {PRUNING_RANGES.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={index === rangeIndex}
              onClick={() => {
                playback.pause();
                setRangeIndex(index);
                playback.reset();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      }
      status={
        <p>
          {step === 0
            ? `${model.candidateGranules} / ${model.totalGranules} candidate granules`
            : step === 1
              ? `${model.candidateRows} candidate rows`
              : `${model.matchingRows} / ${model.candidateRows} matching rows`}
        </p>
      }
    >
      <Diagram
        width={compact ? 320 : 620}
        height={compact ? 745 : 435}
        label={`${model.candidateGranules} sparse-index candidate granules contain ${model.candidateRows} rows, of which ${model.matchingRows} match the day range.`}
      >
        {model.granules.map((granule, index) => {
          const x = compact ? 20 + (index % 2) * 150 : 20 + index * 98;
          const y = compact ? 20 + Math.floor(index / 2) * 185 : 20;
          const w = compact ? 130 : 80;
          const mark: Bounds = { x, y, w, h: 42 };
          const rows: Bounds = {
            x,
            y: y + (compact ? 66 : 120),
            w,
            h: compact ? 104 : 120,
          };
          const route: readonly Point[] = [
            port(mark, "bottom"),
            port(rows, "top"),
          ];
          const outgoing: readonly Point[] = compact
            ? [
                port(rows, "bottom"),
                [x + w / 2, rows.y + rows.h + 8],
                [index % 2 ? 312 : 8, rows.y + rows.h + 8],
                [index % 2 ? 312 : 8, 598],
                [160, 598],
                port(output, "top"),
              ]
            : [
                port(rows, "bottom"),
                [x + w / 2, 305],
                [310, 305],
                port(output, "top"),
              ];
          return (
            <g key={granule.id}>
              <Route
                points={route}
                tone="yellow"
                active={granule.candidate}
                moving={granule.candidate && step === 0}
                fraction={fraction}
              />
              {granule.candidate && (
                <Route
                  points={outgoing}
                  tone="blue"
                  active={step >= 1}
                  moving={step === 1}
                  fraction={fraction}
                />
              )}
              <rect
                x={mark.x}
                y={mark.y}
                width={mark.w}
                height={mark.h}
                rx="3"
                fill="var(--ch-panel)"
                stroke={
                  granule.candidate
                    ? "var(--ch-yellow)"
                    : "var(--ch-node-border)"
                }
                strokeWidth="1.5"
              />
              <Text x={x + w / 2} y={y + 17} size={13} muted anchor="middle">
                G{index + 1} MARK
              </Text>
              <Text
                x={x + w / 2}
                y={y + 34}
                tone={granule.candidate ? "yellow" : undefined}
                anchor="middle"
              >
                day {granule.mark}
              </Text>
              <rect
                x={rows.x}
                y={rows.y}
                width={rows.w}
                height={rows.h}
                rx="3"
                fill="var(--ch-panel)"
                stroke={
                  granule.candidate && step >= 1
                    ? "var(--ch-blue)"
                    : "var(--ch-node-border)"
                }
                strokeWidth="1.5"
                strokeDasharray={!granule.candidate ? "4 4" : undefined}
              />
              <Text
                x={x + w / 2}
                y={rows.y + 23}
                size={13}
                muted
                anchor="middle"
              >
                2 ROWS
              </Text>
              {granule.rows.map((row, rowIndex) => {
                const matches = granule.matchingRows.some(
                  (match) => match.id === row.id,
                );
                const tone =
                  step === 2 && granule.candidate
                    ? matches
                      ? "green"
                      : "red"
                    : step >= 1 && granule.candidate
                      ? "blue"
                      : undefined;
                const rowY = rows.y + 50 + rowIndex * 28;
                return (
                  <g key={row.id}>
                    {step === 2 && granule.candidate && matches && (
                      <circle
                        cx={x + 7}
                        cy={rowY - 5}
                        r="3"
                        fill="var(--ch-green)"
                      />
                    )}
                    <Text
                      x={x + w / 2}
                      y={rowY}
                      size={compact ? 15 : 14}
                      tone={tone}
                      muted={!granule.candidate}
                      anchor="middle"
                    >
                      d{row.day} / #{row.id}
                    </Text>
                    {step === 2 && granule.candidate && !matches && (
                      <path
                        d={`M${x + 8} ${rowY - 5} H${x + w - 8}`}
                        stroke="var(--ch-red)"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        <Panel bounds={output} tone="green">
          <Text
            x={output.x + output.w / 2}
            y={output.y + 20}
            tone="green"
            anchor="middle"
          >
            WHERE · ROW FILTER
          </Text>
          <Text
            x={output.x + output.w / 2}
            y={output.y + 62}
            size={25}
            tone="green"
            anchor="middle"
          >
            {step === 2 ? `${model.matchingRows} matches` : "awaiting rows"}
          </Text>
        </Panel>
      </Diagram>
    </Figure>
  );
}

export function ClickHouseMaterializedViewDemo() {
  const compact = useCompactDiagram();
  const playback = useClickHousePlayback(7);
  const { step, fraction } = playback;
  const batchIndex = step >= 4 ? 1 : 0;
  const batch = INSERT_BATCHES[batchIndex];
  const phase = step === 0 ? 0 : ((step - 1) % 3) + 1;
  const appliedCount = step >= 6 ? 2 : step >= 3 ? 1 : 0;
  const totals = INSERT_BATCHES.slice(0, appliedCount).reduce(
    (current, rows) => applyInsertedBatch(current, rows),
    applyInsertedBatch({}, EVENTS),
  );
  const deltas = applyInsertedBatch({}, batch);
  const oldRows = 12 + batchIndex * 3;
  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const source: Bounds = compact
    ? { x: 20, y: 20, w: 280, h: 200 }
    : { x: 20, y: 45, w: 180, h: 170 };
  const transform: Bounds = compact
    ? { x: 20, y: 290, w: 280, h: 125 }
    : { x: 240, y: 45, w: 140, h: 170 };
  const target: Bounds = compact
    ? { x: 20, y: 485, w: 280, h: 300 }
    : { x: 440, y: 25, w: 160, h: 330 };
  const incoming: readonly Point[] = compact
    ? [port(source, "bottom"), port(transform, "top")]
    : [port(source, "right"), port(transform, "left")];
  const outgoing: readonly Point[] = compact
    ? [port(transform, "bottom"), port(target, "top")]
    : [port(transform, "right"), [410, 130], [410, 190], port(target, "left")];
  return (
    <Figure
      name="materialized-view"
      title="An inserted block updates daily totals"
      playback={playback}
      query="INSERT block → WHERE event = 'buy' → GROUP BY day → aggregate target"
      status={
        <p>
          {phase === 2
            ? Object.entries(deltas)
                .map(([day, amount]) => `Day ${day}: +${amount}¢`)
                .join(" · ")
            : `Target: ${total}¢`}
        </p>
      }
    >
      <Diagram
        width={compact ? 320 : 620}
        height={compact ? 810 : 390}
        label={`Inserted batch ${batchIndex + 1} is filtered and grouped into deltas, added to a daily target currently totaling ${total} cents. Earlier rows are not rescanned.`}
      >
        <Route
          points={incoming}
          tone="blue"
          active={phase >= 1}
          moving={step === 1 || step === 4}
          fraction={fraction}
          packet="3"
        />
        <Route
          points={outgoing}
          tone="purple"
          active={phase >= 2}
          moving={step === 2 || step === 5}
          fraction={fraction}
        />
        <Panel bounds={source} tone="blue">
          <Text x={source.x + 14} y={source.y + 20} tone="blue">
            INSERT BLOCK {batchIndex + 1}
          </Text>
          {batch.map((row, index) => (
            <g key={row.id}>
              <Text
                x={source.x + 12}
                y={source.y + 57 + index * 27}
                size={14}
                muted
              >
                DAY {row.day}
              </Text>
              <Text
                x={source.x + (compact ? 115 : 70)}
                y={source.y + 57 + index * 27}
                size={14}
                tone={
                  phase >= 2
                    ? row.event === "buy"
                      ? "yellow"
                      : "red"
                    : undefined
                }
              >
                {row.event}
              </Text>
              <Text
                x={source.x + source.w - 12}
                y={source.y + 57 + index * 27}
                anchor="end"
                size={14}
                tone={
                  phase >= 2
                    ? row.event === "buy"
                      ? "yellow"
                      : "red"
                    : undefined
                }
              >
                {row.amount}¢
              </Text>
              {phase >= 2 && row.event !== "buy" && (
                <path
                  d={`M${source.x + 10} ${source.y + 52 + index * 27} H${source.x + source.w - 10}`}
                  stroke="var(--ch-red)"
                />
              )}
            </g>
          ))}
          {compact && (
            <>
              <path
                d={`M${source.x + 12} ${source.y + 139} H${source.x + source.w - 12}`}
                stroke="var(--ch-node-border)"
                strokeDasharray="4 4"
              />
              <Text x={source.x + 12} y={source.y + 165} muted>
                {oldRows} earlier rows
              </Text>
            </>
          )}
        </Panel>
        {!compact && (
          <>
            <rect
              x="20"
              y="270"
              width="180"
              height="85"
              rx="3"
              fill="var(--ch-panel)"
              stroke="var(--ch-node-border)"
              strokeDasharray="4 5"
            />
            <Text x={32} y={295} muted>
              {oldRows} EARLIER ROWS
            </Text>
            <Text x={32} y={320} muted>
              remain in source
            </Text>
            <Text x={32} y={342} muted>
              not rescanned
            </Text>
          </>
        )}
        <Panel bounds={transform} tone="purple">
          <Text
            x={transform.x + transform.w / 2}
            y={transform.y + 20}
            tone="purple"
            size={14}
            anchor="middle"
          >
            VIEW TRANSFORM
          </Text>
          <Text
            x={transform.x + 12}
            y={transform.y + 56}
            size={compact ? 15 : 13}
            tone="yellow"
          >
            FILTER + GROUP
          </Text>
          {Object.entries(deltas).map(([day, amount], index) => (
            <g key={day}>
              <Text
                x={transform.x + 12}
                y={transform.y + 88 + index * 26}
                muted
              >
                day {day}
              </Text>
              <Text
                x={transform.x + transform.w - 12}
                y={transform.y + 88 + index * 26}
                tone="purple"
                anchor="end"
              >
                {phase >= 2 ? `+${amount}¢` : "—"}
              </Text>
            </g>
          ))}
        </Panel>
        <Database bounds={target} tone="green">
          <Text
            x={target.x + target.w / 2}
            y={target.y + 52}
            tone="green"
            anchor="middle"
          >
            DAILY TARGET
          </Text>
          {[1, 2, 3, 4, 5, 6].map((day, index) => {
            const changed = phase === 3 && Object.hasOwn(deltas, day);
            return (
              <g key={day}>
                <Text x={target.x + 14} y={target.y + 86 + index * 26} muted>
                  day {day}
                </Text>
                <Text
                  x={target.x + target.w - 14}
                  y={target.y + 86 + index * 26}
                  anchor="end"
                  tone={changed ? "green" : undefined}
                >
                  {totals[day] === undefined ? "—" : `${totals[day]}¢`}
                </Text>
                {changed && (
                  <circle
                    cx={target.x + 5}
                    cy={target.y + 81 + index * 26}
                    r="3"
                    fill="var(--ch-green)"
                  />
                )}
              </g>
            );
          })}
          <path
            d={`M${target.x + 14} ${target.y + 235} H${target.x + target.w - 14}`}
            stroke="var(--ch-node-border)"
          />
          <Text x={target.x + 14} y={target.y + 260} muted>
            ALL DAYS
          </Text>
          <Text
            x={target.x + target.w - 14}
            y={target.y + 287}
            anchor="end"
            size={30}
            tone="green"
          >
            {total}¢
          </Text>
        </Database>
        <Text
          x={compact ? 178 : 221}
          y={compact ? 258 : 113}
          size={compact ? 14 : 13}
          tone="blue"
          anchor={compact ? "start" : "middle"}
        >
          {compact ? "inserted block" : "block"}
        </Text>
        <Text
          x={compact ? 178 : 408}
          y={compact ? 453 : 225}
          size={compact ? 14 : 13}
          tone="purple"
          anchor={compact ? "start" : "middle"}
        >
          {compact ? "partial totals" : "delta"}
        </Text>
      </Diagram>
    </Figure>
  );
}
