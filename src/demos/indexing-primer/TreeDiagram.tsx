import { useId } from "react";
import type { TreeVisual } from "./visual";
import type { Travel } from "./transition";
import { linkPoints, routePath, routePrefix } from "./geometry";
export function TreeDiagram({
  visual,
  width = 640,
  travel,
}: {
  visual: TreeVisual;
  width?: number;
  travel?: Travel;
}) {
  const id = useId();
  const scale = width / 640;
  const x = (v: number) => v * scale;
  const traveled = travel
    ? routePrefix(
        travel.reverse
          ? linkPoints(visual, travel, width).reverse()
          : linkPoints(visual, travel, width),
        travel.progress,
      )
    : undefined;
  const packet = traveled?.at(-1);
  return (
    <svg
      className="ip-tree-svg"
      viewBox={`0 0 ${width} ${visual.height}`}
      role="img"
      aria-label={visual.groups.map((g) => g.title).join("; ")}
    >
      <defs>
        {["plain", "active", "handoff"].map((role) => (
          <marker
            key={role}
            id={`${id}-${role}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 Z" className={`ip-arrow-${role}`} />
          </marker>
        ))}
      </defs>
      {visual.groups.map((g) => (
        <g key={g.id}>
          <text
            className="ip-tree-heading"
            x={x(Math.min(...g.pages.map((p) => p.x - p.width / 2)))}
            y={Math.min(...g.pages.map((p) => p.y - p.height / 2)) - 16}
          >
            {g.title}
          </text>
          {g.links.map((link, i) => {
            const traveling =
              travel?.from === link.from && travel?.to === link.to;
            const role =
              link.kind === "handoff" && link.active
                ? "handoff"
                : link.active
                  ? "active"
                  : "plain";
            return (
              <path
                key={i}
                className="ip-tree-link"
                data-active={link.active}
                data-traveling={traveling}
                data-kind={link.kind}
                d={routePath(linkPoints(visual, link, width))}
                markerEnd={
                  traveling && travel?.reverse
                    ? undefined
                    : `url(#${id}-${role})`
                }
              />
            );
          })}
          {g.pages.map((p) => {
            const w = p.width * scale,
              px = x(p.x) - w / 2,
              py = p.y - p.height / 2;
            const header = 26,
              cellH = (p.height - header) / Math.max(3, p.entries.length);
            return (
              <g
                key={p.id}
                className="ip-tree-page"
                data-page-id={p.id}
                data-kind={p.kind}
                data-state={p.state}
              >
                <rect
                  className="ip-page-outline"
                  x={px}
                  y={py}
                  width={w}
                  height={p.height}
                  rx="4"
                />
                <rect
                  className="ip-page-header"
                  x={px + 0.75}
                  y={py + 0.75}
                  width={w - 1.5}
                  height={header - 0.75}
                  rx="3"
                />
                <text className="ip-svg-page-title" x={px + 8} y={py + 17}>
                  {p.title}
                </text>
                <path
                  className="ip-page-divider"
                  d={`M${px} ${py + header} H${px + w}`}
                />
                {p.entries.map((entry, i) => {
                  const branch = p.kind === "branch";
                  const cellX = branch
                    ? px + (i * w) / p.entries.length
                    : px + 4;
                  const cx = cellX + (branch ? 3 : 0);
                  const padding = width < 480 && !branch ? 1 : 3;
                  const cy = branch
                    ? py + header + padding
                    : py + header + i * cellH + padding;
                  const cw = branch ? w / p.entries.length - 6 : w - 8;
                  const ch = branch
                    ? p.height - header - padding * 2
                    : cellH - padding * 2;
                  const stacked = !branch && entry.value && cw < 84;
                  const keyY = cy + ch / 2 - (stacked ? 8 : 0);
                  return (
                    <g
                      key={entry.key + i}
                      className="ip-svg-entry"
                      data-state={entry.state}
                    >
                      <rect x={cx} y={cy} width={cw} height={ch} rx="2" />
                      {branch && i > 0 && (
                        <path
                          className="ip-page-divider"
                          d={`M${cellX} ${py + header} V${py + p.height}`}
                        />
                      )}
                      <text
                        className="ip-svg-key"
                        x={branch ? cx + cw / 2 : cx + 6}
                        y={keyY}
                        dominantBaseline="central"
                        textAnchor={branch ? "middle" : "start"}
                      >
                        {entry.key.includes(" / ")
                          ? entry.key.split(" / ").map((part, j) => (
                              <tspan x={cx + 6} key={j} dy={j === 0 ? -7 : 14}>
                                {part}
                              </tspan>
                            ))
                          : entry.key}
                      </text>
                      {entry.value && (
                        <text
                          className="ip-svg-value"
                          x={stacked ? cx + 6 : cx + cw - 6}
                          y={cy + ch / 2 + (stacked ? 8 : 0)}
                          dominantBaseline="central"
                          textAnchor={stacked ? "start" : "end"}
                        >
                          {entry.value}
                        </text>
                      )}
                      {entry.state === "found" && (
                        <path
                          className="ip-found-mark"
                          d={`M${cx + 2} ${cy + 3} v${ch - 6}`}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      ))}
      {traveled && packet && (
        <g aria-hidden="true">
          <path className="ip-travel-trace" d={routePath(traveled)} />
          <circle
            className="ip-travel-packet"
            data-route-from={travel?.from}
            data-route-to={travel?.to}
            data-route-progress={travel?.progress.toFixed(3)}
            cx={packet.x}
            cy={packet.y}
            r="5"
          />
        </g>
      )}
    </svg>
  );
}
