import { useId } from "react";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";
import { FLOW_PATHS, type flowSnapshot } from "~/demos/big-database/query-flow";

export type PageNode = { key: string; y: number; title: string; sub: string };
export function BigDatabasePageDiagram({
  title,
  nodes,
  paths,
  snapshot,
  reduced,
}: {
  title: string;
  nodes: PageNode[];
  paths: (keyof typeof FLOW_PATHS)[];
  snapshot: ReturnType<typeof flowSnapshot>;
  reduced: boolean;
}) {
  const id = useId();
  return (
    <svg
      className="big-db-flow-svg"
      viewBox="0 0 320 460"
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>{title}</title>
      <defs>
        <marker
          id={`${id}-arrow`}
          viewBox="0 -4 8 8"
          refX="8"
          refY="0"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 -3L8 0L0 3" className="big-db-flow-arrow" />
        </marker>
      </defs>
      {paths.map((key) => (
        <path
          key={key}
          d={FLOW_PATHS[key]
            .map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`)
            .join(" ")}
          className="big-db-flow-wire"
          data-active={snapshot.path === key}
          data-route={key}
          markerEnd={`url(#${id}-arrow)`}
        />
      ))}
      <text
        x="290"
        y="305"
        textAnchor="middle"
        transform="rotate(90 290 305)"
        className="big-db-flow-route-label"
      >
        return order
      </text>
      {paths.includes("fill") && (
        <text
          x="18"
          y="228"
          textAnchor="middle"
          transform="rotate(-90 18 228)"
          className="big-db-flow-route-label"
        >
          load page into RAM
        </text>
      )}
      {nodes.map((node) => (
        <g
          key={node.key}
          data-node={node.key}
          data-current={snapshot.current.node === node.key}
        >
          <rect
            x="60"
            y={node.y}
            width="200"
            height={node.key === "row" ? 50 : 60}
            rx="3"
            className="big-db-flow-node"
          />
          {node.key === "ssd" ? (
            <DatabaseIcon
              x="70"
              y={node.y + 13}
              width="30"
              height="30"
              className="big-db-flow-icon"
            />
          ) : (
            <path
              d="M0 0H12L18 6V25H0ZM12 0V6H18M4 12H14M4 18H12"
              transform={`translate(76 ${node.y + 16})`}
              className="big-db-flow-icon"
            />
          )}
          <text
            x="174"
            y={node.y + 24}
            textAnchor="middle"
            className="big-db-flow-node-title"
          >
            {node.title}
          </text>
          <text
            x="174"
            y={node.y + 42}
            textAnchor="middle"
            className="big-db-flow-meta"
          >
            {node.sub}
          </text>
        </g>
      ))}
      {snapshot.packet && !reduced && (
        <g
          transform={`translate(${snapshot.packet[0]} ${snapshot.packet[1]})`}
          className="big-db-flow-packet"
          aria-hidden="true"
        >
          <circle r="6" />
        </g>
      )}
    </svg>
  );
}
