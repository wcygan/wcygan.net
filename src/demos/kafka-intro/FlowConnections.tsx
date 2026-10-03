import { type RefObject, useId, useEffect, useState } from "react";

type Edge = readonly [string, string];
export function FlowConnections({
  container,
  edges,
}: {
  container: RefObject<HTMLDivElement | null>;
  edges: readonly Edge[];
}) {
  const marker = useId().replace(/:/g, "");
  const [geometry, setGeometry] = useState({
    width: 1,
    height: 1,
    paths: [] as string[],
  });
  useEffect(() => {
    const frame = container.current;
    if (!frame) return;
    const measure = () => {
      const bounds = frame.getBoundingClientRect();
      const paths = edges.flatMap(([from, to]) => {
        const a = frame
          .querySelector(`[data-flow-node="${from}"]`)
          ?.getBoundingClientRect();
        const b = frame
          .querySelector(`[data-flow-node="${to}"]`)
          ?.getBoundingClientRect();
        if (!a || !b) return [];
        const ax = (a.left + a.right) / 2 - bounds.left;
        const ay = (a.top + a.bottom) / 2 - bounds.top;
        const bx = (b.left + b.right) / 2 - bounds.left;
        const by = (b.top + b.bottom) / 2 - bounds.top;
        if (Math.abs(bx - ax) > Math.abs(by - ay)) {
          const x1 = (bx > ax ? a.right : a.left) - bounds.left;
          const x2 = (bx > ax ? b.left : b.right) - bounds.left;
          return [`M ${x1} ${ay} H ${(x1 + x2) / 2} V ${by} H ${x2}`];
        }
        const y1 = (by > ay ? a.bottom : a.top) - bounds.top;
        const y2 = (by > ay ? b.top : b.bottom) - bounds.top;
        return [`M ${ax} ${y1} V ${(y1 + y2) / 2} H ${bx} V ${y2}`];
      });
      setGeometry({
        width: bounds.width || 1,
        height: bounds.height || 1,
        paths,
      });
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(frame);
    frame
      .querySelectorAll("[data-flow-node]")
      .forEach((node) => observer?.observe(node));
    return () => observer?.disconnect();
  }, [container, edges]);
  return (
    <svg
      className="kafka-intro-flow-wires"
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={marker}
          viewBox="0 0 8 8"
          refX="8"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" />
        </marker>
      </defs>
      {geometry.paths.map((path, i) => (
        <path key={i} d={path} markerEnd={`url(#${marker})`} />
      ))}
    </svg>
  );
}
