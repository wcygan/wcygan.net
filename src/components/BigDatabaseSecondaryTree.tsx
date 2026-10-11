import { useId } from "react";
import { FLOW_PATHS, type Point } from "~/demos/big-database/query-flow";

const secondaryLeaves = [
  [
    ["ada", "9001"],
    ["bea", "9006"],
  ],
  [
    ["cy", "9000"],
    ["dan", "9004"],
  ],
  [
    ["mia", "9002"],
    ["sam", "9007"],
  ],
  [
    ["tom", "9005"],
    ["zoe", "9003"],
  ],
];
const primaryLeaves = [
  [
    ["9000", "shipped"],
    ["9001", "paid"],
  ],
  [
    ["9002", "pending"],
    ["9003", "paid"],
  ],
  [
    ["9004", "shipped"],
    ["9005", "pending"],
  ],
  [
    ["9006", "pending"],
    ["9007", "paid"],
  ],
];
const selectedPaths = [
  "secondaryRoot",
  "secondaryLeaf",
  "primaryKey",
  "clusteredRoot",
  "clusteredLeaf",
] as const;

function TreeNode({
  x,
  y,
  width = 170,
  label,
  value,
  active = false,
}: {
  x: number;
  y: number;
  width?: number;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <g data-tree-current={active}>
      <rect
        x={x}
        y={y}
        width={width}
        height="50"
        rx="3"
        className="big-db-real-tree-node"
      />
      <text
        x={x + width / 2}
        y={y + 17}
        textAnchor="middle"
        className="big-db-real-tree-small"
      >
        {label}
      </text>
      <text x={x + width / 2} y={y + 38} textAnchor="middle">
        {value}
      </text>
    </g>
  );
}

function LeafPages({
  y,
  data,
  step,
  leafStep,
  found,
  primary,
}: {
  y: number;
  data: string[][][];
  step: number;
  leafStep: number;
  found: string;
  primary: boolean;
}) {
  return (
    <>
      {data.map((records, index) => {
        const x = 10 + index * 150;
        const active = index === 0 && step >= leafStep;
        return (
          <g key={`${y}-${index}`} data-tree-current={active}>
            <rect
              x={x}
              y={y}
              width="130"
              height="90"
              rx="3"
              className="big-db-real-tree-node"
            />
            <text
              x={x + 65}
              y={y + 17}
              textAnchor="middle"
              className="big-db-real-tree-small"
            >
              leaf · {primary ? "PK / row" : "email / PK"}
            </text>
            {records.map(([key, value], recordIndex) => {
              const selected = key === found && step >= leafStep;
              return (
                <g key={key}>
                  {selected && (
                    <rect
                      x={x + 4}
                      y={y + 28 + recordIndex * 27}
                      width="122"
                      height="25"
                      className="big-db-real-tree-found"
                    />
                  )}
                  <text x={x + 10} y={y + 46 + recordIndex * 27}>
                    {key}
                  </text>
                  <text
                    x={x + (primary ? 72 : 91)}
                    y={y + 46 + recordIndex * 27}
                    className="big-db-real-tree-small"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </>
  );
}

export function BigDatabaseSecondaryTree({
  step,
  packet,
  path,
}: {
  step: number;
  packet?: Point;
  path?: string;
}) {
  const id = useId();
  const paths = selectedPaths.map((key, index) => ({
    key,
    visited: step >= [0, 1, 3, 4, 5][index],
  }));
  return (
    <div
      className="big-db-real-tree-scroll"
      tabIndex={0}
      role="region"
      aria-label="Two B+trees; scroll horizontally on narrow screens"
    >
      <svg
        className="big-db-real-tree"
        viewBox="0 0 600 730"
        role="img"
        aria-labelledby={id}
      >
        <title id={id}>
          Find ada@example.com in a secondary B+tree, carry primary key 9001 to
          the clustered B+tree, then read the row with status paid. Both trees
          have routing keys in internal pages, ordered entries in leaf pages,
          and linked leaves.
        </title>
        <defs>
          <marker
            id={`${id}-arrow`}
            viewBox="0 -4 8 8"
            refX="8"
            refY="0"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M0 -3L8 0L0 3" className="big-db-flow-arrow" />
          </marker>
        </defs>

        {/* Child pointers and leaf links share the tree's coordinate system. */}
        <g className="big-db-real-tree-links" aria-hidden="true">
          <path d="M300 90V105H150V120M300 105H450V120" />
          <path d="M150 170V190H75V210M150 190H225V210" />
          <path d="M450 170V190H375V210M450 190H525V210" />
          <path
            d="M140 255H160M290 255H310M440 255H460"
            className="leaf-link"
          />
          <path d="M300 490V505H150V520M300 505H450V520" />
          <path d="M150 570V590H75V610M150 590H225V610" />
          <path d="M450 570V590H375V610M450 590H525V610" />
          <path
            d="M140 655H160M290 655H310M440 655H460"
            className="leaf-link"
          />
        </g>

        {paths.map(({ key, visited }) => (
          <path
            key={key}
            d={FLOW_PATHS[key]
              .map(
                (point, index) => `${index ? "L" : "M"}${point[0]} ${point[1]}`,
              )
              .join(" ")}
            className="big-db-real-tree-route"
            data-active={path === key}
            data-visited={visited}
            data-handoff={key === "primaryKey"}
            markerEnd={`url(#${id}-arrow)`}
          />
        ))}

        <text
          x="300"
          y="20"
          textAnchor="middle"
          className="big-db-real-tree-heading"
        >
          SECONDARY INDEX · EMAIL → PRIMARY KEY
        </text>
        <TreeNode
          x={215}
          y={40}
          label="root · separator"
          value="m@…"
          active={step === 0}
        />
        <TreeNode
          x={65}
          y={120}
          label="branch · separator"
          value="c@…"
          active={step === 1}
        />
        <TreeNode x={365} y={120} label="branch · separator" value="t@…" />
        <LeafPages
          y={210}
          data={secondaryLeaves}
          step={step}
          leafStep={2}
          found="ada"
          primary={false}
        />
        <text
          x="300"
          y="337"
          textAnchor="middle"
          className="big-db-real-tree-small"
        >
          Leaf entries are ordered by email; each carries its row's primary key.
        </text>
        <text
          x="300"
          y="385"
          textAnchor="middle"
          className="big-db-real-tree-handoff"
        >
          email → primary key 9001 → clustered index
        </text>

        <text
          x="300"
          y="420"
          textAnchor="middle"
          className="big-db-real-tree-heading"
        >
          CLUSTERED INDEX · PRIMARY KEY → ROW DATA
        </text>
        <TreeNode
          x={215}
          y={440}
          label="root · separator"
          value="9004"
          active={step === 4}
        />
        <TreeNode
          x={65}
          y={520}
          label="branch · separator"
          value="9002"
          active={step === 5}
        />
        <TreeNode x={365} y={520} label="branch · separator" value="9006" />
        <LeafPages
          y={610}
          data={primaryLeaves}
          step={step}
          leafStep={6}
          found="9001"
          primary
        />
        <text
          x="300"
          y="719"
          textAnchor="middle"
          className="big-db-real-tree-small"
        >
          Ordered leaf entries hold the full clustered rows.
        </text>

        {packet && (
          <g
            transform={`translate(${packet[0]} ${packet[1]})`}
            className="big-db-flow-packet"
            aria-hidden="true"
          >
            <circle r="6" />
            {path === "primaryKey" && (
              <text x="12" y="4" className="big-db-flow-key">
                PK 9001
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
