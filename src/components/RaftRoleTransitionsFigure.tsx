import { useId } from "react";

const roles = [
  { label: "Follower", y: 24 },
  { label: "Candidate", y: 164 },
  { label: "Leader", y: 304 },
];
const node = { x: 24, width: 168, height: 56 };
const centerX = node.x + node.width / 2;
const rightX = node.x + node.width;

export function RaftRoleTransitionsFigure() {
  const id = useId();
  const arrow = `${id}-arrow`;

  return (
    <figure className="raft-roles-figure" data-graphic-frame="plate">
      <header>
        <p className="article-graphic-title">Changing roles</p>
      </header>
      <div className="raft-roles-stage" data-graphic-stage="padded">
        <svg
          viewBox="0 0 320 384"
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
        >
          <title id={`${id}-title`}>Raft role transitions</title>
          <desc id={`${id}-description`}>
            A follower becomes a candidate after an election timeout. A
            candidate becomes leader after winning a majority vote. A candidate
            or leader returns to follower after learning of a higher term.
          </desc>
          <defs>
            <marker
              id={arrow}
              viewBox="0 0 8 8"
              refX="8"
              refY="4"
              markerWidth="8"
              markerHeight="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8" className="raft-roles-arrow" />
            </marker>
          </defs>
          {roles.slice(0, 2).map((role, index) => (
            <path
              key={role.label}
              className="raft-roles-wire"
              d={`M ${centerX} ${role.y + node.height} V ${roles[index + 1].y}`}
              markerEnd={`url(#${arrow})`}
            />
          ))}
          <path
            className="raft-roles-wire"
            d={`M ${rightX} ${roles[2].y + node.height / 2} H 224 V ${roles[0].y + node.height / 2} H ${rightX}`}
            markerEnd={`url(#${arrow})`}
          />
          <path
            className="raft-roles-wire"
            d={`M ${rightX} ${roles[1].y + node.height / 2} H 224`}
          />
          <circle
            cx="224"
            cy={roles[1].y + node.height / 2}
            r="3"
            className="raft-roles-arrow"
          />
          {roles.map((role) => (
            <g key={role.label}>
              <rect
                className="raft-roles-node"
                data-role={role.label}
                x={node.x}
                y={role.y}
                width={node.width}
                height={node.height}
                rx="2"
              />
              <text
                className="raft-roles-label"
                x={centerX}
                y={role.y + node.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {role.label}
              </text>
            </g>
          ))}
          <text
            className="raft-roles-condition"
            x="92"
            y="116"
            textAnchor="end"
          >
            <tspan x="92">Election</tspan>
            <tspan x="92" dy="20">
              timeout
            </tspan>
          </text>
          <text
            className="raft-roles-condition"
            x="92"
            y="256"
            textAnchor="end"
          >
            <tspan x="92">Majority</tspan>
            <tspan x="92" dy="20">
              vote
            </tspan>
          </text>
          <text
            className="raft-roles-condition"
            x="240"
            y="116"
            textAnchor="start"
          >
            <tspan x="240">Higher</tspan>
            <tspan x="240" dy="20">
              term
            </tspan>
          </text>
        </svg>
      </div>
      <figcaption>
        A candidate also returns to follower when it accepts the elected leader.
      </figcaption>
    </figure>
  );
}
