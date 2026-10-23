import type { Point } from "~/demos/raft-election-overview/layout";

/** Foreground packet: the shared lane leaves room for its full bounding box. */
export function RaftLogPayload({
  position,
  compact,
  lines,
  label,
  kind,
}: {
  position: Point;
  compact: boolean;
  lines: readonly string[];
  label: string;
  kind?: string;
}) {
  const width = compact ? 112 : 128;
  const height = lines.length === 2 ? 48 : lines.length * 18 + 10;
  return (
    <g
      className="log-replication-payload leader-recovery-packet"
      data-kind={kind}
      transform={`translate(${position.join(" ")})`}
      aria-hidden="true"
    >
      <title>{label}</title>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx="3"
      />
      {lines.map((line, index) => (
        <text
          key={index}
          y={(index - (lines.length - 1) / 2) * 18}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {line}
        </text>
      ))}
    </g>
  );
}
