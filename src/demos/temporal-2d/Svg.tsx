import { type ReactNode, useEffect, useId, useRef } from "react";
import { type Bounds, type Point, pathData, pointOnRoute } from "./geometry";
import type { TemporalPlayback } from "./playback";

export type Tone =
  | "muted"
  | "active"
  | "durable"
  | "success"
  | "waiting"
  | "failure";
export function SvgScene({
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
  const title = useId();
  return (
    <svg
      className="temporal-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={title}
    >
      <title id={title}>{label}</title>
      {children}
    </svg>
  );
}
export function Label({
  x,
  y,
  children,
  tone = "muted",
  align = "start",
  size = "meta",
}: {
  x: number;
  y: number;
  children: ReactNode;
  tone?: Tone;
  align?: "start" | "middle" | "end";
  size?: "title" | "meta" | "small";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={align}
      className={`temporal-svg-${size} temporal-tone-${tone}`}
    >
      {children}
    </text>
  );
}
export function Node({
  bounds,
  title,
  lines = [],
  tone = "muted",
  dashed = false,
  children,
}: {
  bounds: Bounds;
  title: string;
  lines?: readonly string[];
  tone?: Tone;
  dashed?: boolean;
  children?: ReactNode;
}) {
  return (
    <g className={`temporal-node temporal-tone-${tone}`}>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        rx={4}
        strokeDasharray={dashed ? "5 5" : undefined}
      />
      <Label x={bounds.x + 12} y={bounds.y + 25} tone={tone} size="title">
        {title}
      </Label>
      {lines.map((line, index) => (
        <Label
          key={`${index}:${line}`}
          x={bounds.x + 12}
          y={bounds.y + 48 + index * 21}
        >
          {line}
        </Label>
      ))}
      {children}
    </g>
  );
}
export function History({
  bounds,
  entries,
  title = "EVENT HISTORY",
  highlight = false,
}: {
  bounds: Bounds;
  entries: readonly string[];
  title?: string;
  highlight?: boolean;
}) {
  return (
    <g className="temporal-history temporal-tone-durable">
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        rx={4}
      />
      <Label x={bounds.x + 12} y={bounds.y + 24} tone="durable" size="small">
        {title}
      </Label>
      <line
        x1={bounds.x}
        y1={bounds.y + 36}
        x2={bounds.x + bounds.width}
        y2={bounds.y + 36}
        className="temporal-history-divider"
      />
      {entries.map((entry, index) => (
        <g key={`${index}:${entry}`}>
          <rect
            x={bounds.x + 12}
            y={bounds.y + 48 + index * 28}
            width={4}
            height={15}
            className={`temporal-fill-${highlight && index === entries.length - 1 ? "success" : "durable"}`}
          />
          <Label
            x={bounds.x + 26}
            y={bounds.y + 61 + index * 28}
            tone={
              highlight && index === entries.length - 1 ? "success" : "durable"
            }
          >
            {entry}
          </Label>
        </g>
      ))}
    </g>
  );
}
export function Wire({
  points,
  tone = "muted",
  label,
  labelAt,
  dashed = true,
  packet = false,
  playback,
}: {
  points: readonly Point[];
  tone?: Tone;
  label?: string;
  labelAt?: Point;
  dashed?: boolean;
  packet?: boolean;
  playback?: TemporalPlayback;
}) {
  const arrow = useId().replace(/:/g, "");
  const ref = useRef<SVGCircleElement>(null);
  const pointsKey = JSON.stringify(points);
  useEffect(() => {
    if (!packet || !playback) return;
    const exactPoints = JSON.parse(pointsKey) as Point[];
    return playback.subscribe((progress) => {
      const point = pointOnRoute(exactPoints, progress);
      ref.current?.setAttribute(
        "transform",
        `translate(${point[0]} ${point[1]})`,
      );
      ref.current?.setAttribute(
        "opacity",
        progress > 0 && !playback.reduced ? "1" : "0",
      );
    });
  }, [packet, playback?.subscribe, playback?.reduced, pointsKey]);
  return (
    <g className={`temporal-wire temporal-tone-${tone}`}>
      <defs>
        <marker
          id={arrow}
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
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </marker>
      </defs>
      <path
        d={pathData(points)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray={dashed ? "5 5" : undefined}
        markerEnd={`url(#${arrow})`}
      />
      {packet && playback && (
        <circle
          ref={ref}
          r={4}
          className="temporal-packet"
          fill="currentColor"
          opacity={0}
        />
      )}
      {label && labelAt && (
        <g>
          <rect
            x={labelAt[0] - (label.length * 8 + 16) / 2}
            y={labelAt[1] - 14}
            width={label.length * 8 + 16}
            height={20}
            rx={2}
            className="temporal-wire-label-backing"
          />
          <Label
            x={labelAt[0]}
            y={labelAt[1]}
            tone={tone}
            align="middle"
            size="small"
          >
            {label}
          </Label>
        </g>
      )}
    </g>
  );
}
