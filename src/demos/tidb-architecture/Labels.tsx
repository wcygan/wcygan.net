import { useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { GROUPS, NODES, type GroupId, type Point } from "./model";
import { placeLabels, type Rect } from "./label-layout";
import type { SceneLabel } from "./presentation";

function corners(position: Point, size: Point): Point[] {
  return [-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) =>
      [-1, 1].map(
        (z): Point => [
          position[0] + (x * size[0]) / 2,
          position[1] + (y * size[1]) / 2,
          position[2] + (z * size[2]) / 2,
        ],
      ),
    ),
  );
}
// Bounds follow the existing procedural models, including their platform silhouettes.
const NODE_CORNERS = Object.fromEntries(
  NODES.map((n) => [
    n.id,
    corners(
      [n.position[0], n.group === "tikv" ? 0.87 : 0.6, n.position[2]],
      n.group === "tikv" ? [1.44, 1.62, 1.44] : [1.65, 1.2, 1.65],
    ),
  ]),
);
const GROUP_CORNERS = Object.fromEntries(
  (Object.entries(GROUPS) as [GroupId, (typeof GROUPS)[GroupId]][]).map(
    ([id, group]) => [
      id,
      [
        ...corners(group.position, group.size),
        ...NODES.filter((n) => n.group === id).flatMap(
          (n) => NODE_CORNERS[n.id],
        ),
      ],
    ],
  ),
);
const ORIGIN = () => [0, 0];
const hasConnector = (label: SceneLabel) =>
  Boolean(label.explanation || label.followerStatus);

/** One overlay lays out all labels together, only when the camera or label set changes. */
export function Labels({ labels }: { labels: SceneLabel[] }) {
  const { camera, size, invalidate } = useThree();
  const elements = useRef(new Map<string, HTMLSpanElement>());
  const leaders = useRef(new Map<string, SVGLineElement>());
  const previous = useRef("");
  useEffect(() => {
    previous.current = "";
    invalidate();
  }, [labels, size.width, size.height, invalidate]);
  useFrame(() => {
    camera.updateMatrixWorld();
    const signature = [
      ...camera.matrixWorld.elements,
      ...camera.projectionMatrix.elements,
      size.width,
      size.height,
    ].join(",");
    if (signature === previous.current) return;
    previous.current = signature;
    const project = (points: Point[]): Rect => {
      const screen = points.map((p) => new Vector3(...p).project(camera));
      const xs = screen.map((p) => ((p.x + 1) * size.width) / 2);
      const ys = screen.map((p) => ((1 - p.y) * size.height) / 2);
      const x = Math.min(...xs),
        y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    };
    const nodes = Object.fromEntries(
      Object.entries(NODE_CORNERS).map(([id, points]) => [id, project(points)]),
    );
    const groups = Object.fromEntries(
      Object.entries(GROUP_CORNERS).map(([id, points]) => [
        id,
        project(points),
      ]),
    );
    const positions = placeLabels(
      labels.flatMap((label) => {
        const element = elements.current.get(label.id);
        if (!element) return [];
        const group = label.anchor.kind === "group";
        const connected = hasConnector(label);
        return [
          {
            id: label.id,
            priority: label.priority,
            width: element.offsetWidth,
            height: element.offsetHeight,
            anchor: (group ? groups : nodes)[label.anchor.id],
            avoid: Object.entries(group ? groups : nodes)
              .filter(([id]) => group || connected || id !== label.anchor.id)
              .map(([, rect]) => rect),
            allowInside: !group && !connected,
            callout: connected,
            fallbackAvoid: connected
              ? labels
                  .filter((other) => other.anchor.kind === "node")
                  .map((other) => nodes[other.anchor.id])
              : undefined,
          },
        ];
      }),
      size,
    );
    for (const [id, element] of elements.current) {
      const position = positions.get(id);
      element.style.visibility = position ? "visible" : "hidden";
      if (position)
        element.style.transform = `translate3d(${position.x}px,${position.y}px,0)`;
    }
    for (const label of labels) {
      const line = leaders.current.get(label.id);
      if (!line) continue;
      const position = positions.get(label.id);
      line.style.visibility = position ? "visible" : "hidden";
      if (!position) continue;
      const anchor = nodes[label.anchor.id];
      const x = anchor.x + anchor.width / 2;
      const y = anchor.y + anchor.height / 2;
      line.setAttribute(
        "x1",
        String(Math.max(position.x, Math.min(x, position.x + position.width))),
      );
      line.setAttribute(
        "y1",
        String(Math.max(position.y, Math.min(y, position.y + position.height))),
      );
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(y));
    }
  });
  return (
    <Html
      calculatePosition={ORIGIN}
      zIndexRange={[2, 2]}
      className="tidb-label-layer"
    >
      <svg
        className="tidb-callout-lines"
        width={size.width}
        height={size.height}
        aria-hidden="true"
      >
        {labels.filter(hasConnector).map((label) => (
          <line
            key={label.id}
            ref={(line) => {
              if (line) leaders.current.set(label.id, line);
              else leaders.current.delete(label.id);
            }}
          />
        ))}
      </svg>
      {labels.map((label) => (
        <span
          key={label.id}
          ref={(element) => {
            if (element) elements.current.set(label.id, element);
            else elements.current.delete(label.id);
            previous.current = "";
            invalidate();
          }}
          className={`tidb-scene-label ${label.anchor.kind === "group" ? "tidb-group-label" : "tidb-operation-label"}${label.explanation ? " tidb-quorum-callout" : ""}`}
          data-label-id={label.id}
          data-follower-status={label.followerStatus}
          data-read-state={label.readState}
        >
          {label.title}
          {label.detail && (
            <span>
              {label.explanation ? " · " : ""}
              {label.detail}
            </span>
          )}
          {label.explanation && (
            <span className="tidb-quorum-rule">{label.explanation}</span>
          )}
        </span>
      ))}
    </Html>
  );
}
