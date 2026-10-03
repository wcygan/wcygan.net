import { useId } from "react";
import { VERSIONS, visibleVersion, type LessonId } from "./model";

type Tone = "orange" | "blue" | "green" | "yellow" | "red" | "neutral";
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
function Node({
  box,
  title,
  note,
  tone = "neutral",
}: {
  box: Box;
  title: string;
  note?: string;
  tone?: Tone;
}) {
  return (
    <g className="tidb-learn-node" data-tone={tone}>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="4" />
      <path
        d={`M${box.x + 12} ${box.y + 8}H${box.x + box.w - 12}`}
        className="tidb-learn-node-band"
      />
      <text
        x={box.x + box.w / 2}
        y={box.y + box.h / 2 + (note ? -3 : 5)}
        textAnchor="middle"
      >
        {title}
      </text>
      {note && (
        <text
          className="tidb-learn-muted"
          x={box.x + box.w / 2}
          y={box.y + box.h / 2 + 20}
          textAnchor="middle"
        >
          {note}
        </text>
      )}
    </g>
  );
}
type Point = readonly [number, number];
function port(box: Box, face: "top" | "bottom" | "left" | "right"): Point {
  return face === "top"
    ? [box.x + box.w / 2, box.y]
    : face === "bottom"
      ? [box.x + box.w / 2, box.y + box.h]
      : face === "left"
        ? [box.x, box.y + box.h / 2]
        : [box.x + box.w, box.y + box.h / 2];
}
function Wire({
  points,
  tone,
  dashed = false,
}: {
  points: Point[];
  tone: Tone;
  dashed?: boolean;
}) {
  const markerId = useId().replaceAll(":", "");
  return (
    <g className="tidb-learn-wire" data-tone={tone}>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 8 8"
          refX="8"
          refY="4"
          markerWidth="8"
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M0 0L8 4L0 8" />
        </marker>
      </defs>
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        fill="none"
        strokeDasharray={dashed ? "5 5" : undefined}
        markerEnd={`url(#${markerId})`}
      />
    </g>
  );
}
function Label({
  x,
  y,
  children,
  tone,
}: {
  x: number;
  y: number;
  children: string;
  tone?: Tone;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className={tone ? "tidb-learn-colored" : "tidb-learn-muted"}
      data-tone={tone}
    >
      {children}
    </text>
  );
}

function Capacity({ width, phase }: { width: number; phase: number }) {
  const app = { x: width / 2 - 72, y: 24, w: 144, h: 58 };
  const database = { x: width / 2 - 92, y: 180, w: 184, h: 96 };
  const count = phase === 0 ? 3 : 8;
  if (phase < 2)
    return (
      <>
        <Wire
          points={[port(app, "bottom"), port(database, "top")]}
          tone={phase === 1 ? "yellow" : "orange"}
        />
        <Node box={app} title="APPLICATION" tone="orange" />
        <Label x={width / 2 + 84} y={108}>
          work + data grow
        </Label>
        {Array.from({ length: count }, (_, i) => (
          <rect
            key={i}
            className="tidb-learn-unit"
            data-tone={phase === 1 ? "yellow" : "blue"}
            x={width / 2 - count * 12 + i * 24}
            y={128}
            width="18"
            height="18"
            rx="2"
          />
        ))}
        <Node
          box={database}
          title="ONE DATABASE"
          note="SQL + storage"
          tone={phase === 1 ? "yellow" : "blue"}
        />
        <Label x={width / 2} y={320}>
          {phase === 1
            ? "A host can become the limit"
            : "One machine, one resource budget"}
        </Label>
      </>
    );
  const gap = 14,
    nodeWidth = (width - 60) / 3;
  const sql = Array.from({ length: 3 }, (_, i) => ({
    x: 16 + i * (nodeWidth + gap),
    y: 164,
    w: nodeWidth,
    h: 58,
  }));
  const stores = sql.map((n) => ({ ...n, y: 296 }));
  return (
    <>
      {sql.map((node, i) => (
        <Wire
          key={`app-${i}`}
          points={[
            port(app, "bottom"),
            [width / 2, 126],
            [node.x + node.w / 2, 126],
            port(node, "top"),
          ]}
          tone="orange"
        />
      ))}
      <g className="tidb-learn-wire" data-tone="blue">
        {sql.map((node, i) => (
          <line
            key={i}
            x1={node.x + node.w / 2}
            y1={node.y + node.h}
            x2={node.x + node.w / 2}
            y2={254}
          />
        ))}
        <line
          x1={sql[0].x + sql[0].w / 2}
          y1={254}
          x2={sql[2].x + sql[2].w / 2}
          y2={254}
        />
      </g>
      {stores.map((node, i) => (
        <Wire
          key={`store-${i}`}
          points={[[node.x + node.w / 2, 254], port(node, "top")]}
          tone="blue"
        />
      ))}
      <Node box={app} title="SAME SQL" tone="orange" />
      {sql.map((node, i) => (
        <Node
          key={`sql-${i}`}
          box={node}
          title={`TiDB ${i + 1}`}
          tone="orange"
        />
      ))}
      {stores.map((node, i) => (
        <Node key={`kv-${i}`} box={node} title={`TiKV ${i + 1}`} tone="blue" />
      ))}
      <Label x={width / 2} y={382}>
        any TiDB → any Region
      </Label>
    </>
  );
}

function Roles({ width, phase }: { width: number; phase: number }) {
  const x = width < 480 ? 16 : 70,
    w = width < 480 ? 148 : 190,
    right = width < 480 ? 196 : width - 230,
    rw = width < 480 ? 130 : 160;
  const app = { x, y: 28, w, h: 58 },
    sql = { x, y: 158, w, h: 70 },
    kv = { x, y: 306, w, h: 70 },
    pd = { x: right, y: 158, w: rw, h: 70 },
    flash = { x: right, y: 306, w: rw, h: 70 };
  return (
    <>
      <Wire points={[port(app, "bottom"), port(sql, "top")]} tone="orange" />
      <Wire
        points={[port(sql, "bottom"), port(kv, "top")]}
        tone={phase >= 1 ? "blue" : "neutral"}
      />
      <Wire
        points={[port(pd, "left"), port(sql, "right")]}
        tone={phase >= 2 ? "yellow" : "neutral"}
        dashed
      />
      <Wire
        points={[port(kv, "right"), port(flash, "left")]}
        tone={phase >= 3 ? "green" : "neutral"}
        dashed
      />
      <Node box={app} title="APPLICATION" tone="orange" />
      <Node box={sql} title="TiDB" note="plans SQL" tone="orange" />
      <Node
        box={kv}
        title="TiKV"
        note="rows + indexes"
        tone={phase >= 1 ? "blue" : "neutral"}
      />
      <Node
        box={pd}
        title="PD"
        note="time + map"
        tone={phase >= 2 ? "yellow" : "neutral"}
      />
      <Node
        box={flash}
        title="TiFlash"
        note="columns"
        tone={phase >= 3 ? "green" : "neutral"}
      />
      <Label x={sql.x + sql.w / 2 + 84} y={124}>
        MySQL protocol
      </Label>
      <Label x={sql.x + sql.w / 2 + 84} y={272}>
        row requests
      </Label>
    </>
  );
}

function Routing({ width, phase }: { width: number; phase: number }) {
  const compact = width < 480;
  const left = compact ? 24 : 80,
    w = compact ? 140 : 180,
    right = compact ? 196 : width - 230;
  const app = { x: left, y: 24, w, h: 70 },
    sql = { x: left, y: 168, w, h: 70 },
    kv = { x: left, y: 320, w, h: 70 },
    pd = { x: right, y: 168, w: compact ? 130 : 160, h: 70 };
  return (
    <>
      <Wire
        points={[port(app, "bottom"), port(sql, "top")]}
        tone={phase === 0 ? "orange" : "neutral"}
      />
      <Wire
        points={[port(pd, "left"), port(sql, "right")]}
        tone={phase === 1 ? "yellow" : "neutral"}
        dashed
      />
      <Wire
        points={[port(sql, "bottom"), port(kv, "top")]}
        tone={phase >= 2 ? "blue" : "neutral"}
      />
      {phase >= 3 && (
        <Wire
          points={[
            port(kv, "left"),
            [10, kv.y + kv.h / 2],
            [10, app.y + app.h / 2],
            port(app, "left"),
          ]}
          tone="green"
        />
      )}
      <Node
        box={app}
        title={phase >= 4 ? "RESULT: Will" : "APPLICATION"}
        note="user id = 427"
        tone={phase >= 4 ? "green" : "orange"}
      />
      <Node box={sql} title="TiDB" note="SQL → key" tone="orange" />
      <Node box={kv} title="TiKV 2" note="Region B" tone="blue" />
      <Node
        box={pd}
        title="PD"
        note="snapshot 120"
        tone={phase === 1 ? "yellow" : "neutral"}
      />
      <Label x={left + w / 2 + (compact ? 116 : 130)} y={282}>
        {phase >= 3 ? "row at snapshot 120" : "encoded key → Region B"}
      </Label>
      <Label x={left + w / 2 + 84} y={130}>
        SQL request
      </Label>
    </>
  );
}

function Transaction({ width, phase }: { width: number; phase: number }) {
  const compact = width < 480;
  const sql = { x: width / 2 - 80, y: 22, w: 160, h: 60 };
  const groupWidth = compact ? width - 48 : (width - 72) / 2;
  const groups = [
    { x: 24, y: 160, w: groupWidth, h: 170 },
    {
      x: compact ? 24 : width - groupWidth - 24,
      y: compact ? 400 : 160,
      w: groupWidth,
      h: 170,
    },
  ];
  return (
    <>
      {groups.map((box, i) => (
        <Wire
          key={i}
          points={
            compact && i === 1
              ? [
                  port(sql, "left"),
                  [10, sql.y + 30],
                  [10, box.y + 85],
                  port(box, "left"),
                ]
              : [
                  port(sql, "bottom"),
                  [width / 2, 118],
                  [box.x + box.w / 2, 118],
                  port(box, "top"),
                ]
          }
          tone={phase >= 1 ? "yellow" : "neutral"}
          dashed
        />
      ))}
      <Node box={sql} title="TiDB TRANSACTION" tone="orange" />
      {groups.map((box, i) => {
        const committed = phase >= (i === 0 ? 2 : 3),
          prepared = phase >= 1;
        const tone = committed ? "green" : prepared ? "yellow" : "blue";
        return (
          <g key={i} className="tidb-learn-region-group" data-tone={tone}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="4" />
            <Label
              x={box.x + box.w / 2}
              y={box.y + 28}
              tone="blue"
            >{`REGION ${i === 0 ? "A" : "B"}`}</Label>
            <text x={box.x + box.w / 2} y={box.y + 57} textAnchor="middle">
              {i === 0 ? "order · primary txn key" : "inventory · other key"}
            </text>
            <Label x={box.x + box.w / 2} y={box.y + 85} tone={tone}>
              {committed
                ? i === 0
                  ? "commit decision"
                  : "finalized"
                : prepared
                  ? "prewritten + locked"
                  : "waiting to prepare"}
            </Label>
            {["L", "F", "F"].map((label, j) => {
              const x = box.x + box.w / 2 + (j - 1) * 60;
              return (
                <g key={j}>
                  <rect
                    className="tidb-learn-unit"
                    data-tone={committed ? "green" : "blue"}
                    x={x - 21}
                    y={box.y + 106}
                    width="42"
                    height="30"
                    rx="3"
                  />
                  <text x={x} y={box.y + 126} textAnchor="middle">
                    {label}
                  </text>
                </g>
              );
            })}
            <Label x={box.x + box.w / 2} y={box.y + 156}>
              one replicated Raft group
            </Label>
          </g>
        );
      })}
    </>
  );
}

function Snapshot({
  width,
  phase,
  snapshot,
}: {
  width: number;
  phase: number;
  snapshot: number;
}) {
  const selected = visibleVersion(snapshot);
  const tick = (commit: number) => 24 + ((commit - 40) / 130) * (width - 48);
  return (
    <>
      <Label x={width / 2} y={32}>
        {phase >= 1 ? `read snapshot = ${snapshot}` : "committed row versions"}
      </Label>
      {VERSIONS.map((version, i) => {
        const visible = version.commit <= snapshot;
        const chosen = phase >= 2 && selected?.commit === version.commit;
        const tone = chosen ? "green" : phase >= 1 && !visible ? "red" : "blue";
        const y = 66 + i * 86;
        return (
          <g
            key={version.commit}
            className="tidb-learn-version"
            data-tone={tone}
          >
            <rect
              x={24}
              y={y}
              width={width - 48}
              height={66}
              rx="4"
              strokeDasharray={phase >= 1 && !visible ? "5 4" : undefined}
            />
            <text x={40} y={y + 27}>
              {version.name}
            </text>
            <text
              x={width - 40}
              y={y + 27}
              textAnchor="end"
            >{`commit ${version.commit}`}</text>
            <text x={40} y={y + 51} className="tidb-learn-muted">
              {chosen
                ? "← latest visible"
                : phase >= 1
                  ? visible
                    ? "visible, older version"
                    : "too new for this read"
                  : "committed"}
            </text>
          </g>
        );
      })}
      <Wire
        points={[
          [24, 372],
          [width - 24, 372],
        ]}
        tone="neutral"
      />
      {VERSIONS.map((version) => (
        <g key={version.commit}>
          <line
            x1={tick(version.commit)}
            y1="366"
            x2={tick(version.commit)}
            y2="378"
            className="tidb-learn-tick"
          />
          <text x={tick(version.commit)} y={399} textAnchor="middle">
            {version.commit}
          </text>
        </g>
      ))}
      {phase >= 1 && (
        <g className="tidb-learn-snapshot-pin">
          <line x1={tick(snapshot)} y1="332" x2={tick(snapshot)} y2="382" />
          <circle cx={tick(snapshot)} cy="372" r="5" />
          <text x={tick(snapshot)} y={325} textAnchor="middle">
            {snapshot}
          </text>
        </g>
      )}
    </>
  );
}

export function Diagrams2D({
  id,
  phase,
  option,
  width,
}: {
  id: LessonId;
  phase: number;
  option: number;
  width: number;
}) {
  const compact = width < 480;
  const height =
    id === "transaction"
      ? compact
        ? 602
        : 370
      : id === "roles"
        ? 408
        : id === "routing"
          ? 426
          : id === "snapshot"
            ? 424
            : 396;
  return (
    <svg
      className="tidb-learn-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${id} diagram, step ${phase + 1}`}
    >
      {id === "capacity" ? (
        <Capacity width={width} phase={phase} />
      ) : id === "roles" ? (
        <Roles width={width} phase={phase} />
      ) : id === "routing" ? (
        <Routing width={width} phase={phase} />
      ) : id === "transaction" ? (
        <Transaction width={width} phase={phase} />
      ) : (
        <Snapshot width={width} phase={phase} snapshot={option} />
      )}
    </svg>
  );
}
