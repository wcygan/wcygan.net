import { useId } from "react";
import type { Page, TreeVisual } from "./visual";
export function TreeDiagram({
  visual,
  width = 640,
}: {
  visual: TreeVisual;
  width?: number;
}) {
  const id = useId();
  const scale = width / 640;
  const x = (v: number) => v * scale;
  const all = visual.groups.flatMap((g) => g.pages);
  const find = (id: string) => all.find((p) => p.id === id)!;
  function route(a: Page, b: Page, kind: string) {
    if (kind === "leaf")
      return `M${x(a.x + a.width / 2)} ${a.y} H${x(b.x - b.width / 2)}`;
    const sy = a.y + a.height / 2,
      dy = b.y - b.height / 2;
    const middle = (sy + dy) / 2;
    return `M${x(a.x)} ${sy} V${middle} H${x(b.x)} V${dy}`;
  }
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
            const a = find(link.from),
              b = find(link.to);
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
                data-kind={link.kind}
                d={route(a, b, link.kind)}
                markerEnd={`url(#${id}-${role})`}
              />
            );
          })}
          {g.pages.map((p) => {
            const w = p.width * scale,
              px = x(p.x) - w / 2,
              py = p.y - p.height / 2;
            const header = 26,
              cellH = (p.height - header) / Math.max(1, p.entries.length);
            return (
              <g
                key={p.id}
                className="ip-tree-page"
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
                <text className="ip-svg-page-title" x={px + 8} y={py + 17}>
                  {p.title}
                </text>
                <path
                  className="ip-page-divider"
                  d={`M${px} ${py + header} H${px + w}`}
                />
                {p.entries.map((entry, i) => {
                  const branch = p.kind === "branch";
                  const cx = branch ? px + (i * w) / p.entries.length : px + 4;
                  const cy = branch
                    ? py + header + 3
                    : py + header + i * cellH + 3;
                  const cw = branch ? w / p.entries.length : w - 8;
                  const ch = branch ? p.height - header - 6 : cellH - 6;
                  return (
                    <g
                      key={entry.key + i}
                      className="ip-svg-entry"
                      data-state={entry.state}
                    >
                      <rect x={cx} y={cy} width={cw} height={ch} rx="2" />
                      <text
                        className="ip-svg-key"
                        x={branch ? cx + cw / 2 : cx + 6}
                        y={cy + ch / 2 + 5}
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
                          x={cx + cw - 6}
                          y={cy + ch / 2 + 5}
                          textAnchor="end"
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
    </svg>
  );
}
