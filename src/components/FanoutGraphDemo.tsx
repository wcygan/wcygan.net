import { type CSSProperties, useEffect, useId, useState } from "react";
import {
  deriveFanoutSnapshot,
  FANOUT_DURATION_MS,
  FANOUT_EDGES,
  FANOUT_NODES,
  INITIAL_FANOUT_SNAPSHOT,
  type FanoutEdge,
  type FanoutNode,
  type FanoutSnapshot,
} from "~/demos/fanout/model";

const VIEWBOX_WIDTH = 860;
const VIEWBOX_HEIGHT = 420;
const COMPACT_VIEWBOX_WIDTH = 500;
const NODE_RADIUS = 30;
const BROWSER_HALF_WIDTH = 36;
const BROWSER_HALF_HEIGHT = 27;

export function FanoutGraphDemo() {
  const markerSuffix = useId().replaceAll(":", "");
  const markerId = `fanout-arrow-${markerSuffix}`;
  const titleId = `fanout-title-${markerSuffix}`;
  const descriptionId = `fanout-description-${markerSuffix}`;
  const captionId = `fanout-caption-${markerSuffix}`;
  const snapshot = useFanoutPlayback();
  const compact = useCompactGraph();
  const nodes = compact ? compactNodes() : FANOUT_NODES;

  return (
    <figure
      className="fanout-graph"
      data-graphic-frame="workbench"
      data-graphic-key="fanout-service-graph"
      data-graphic-kind="svg"
      data-phase={snapshot.isComplete ? "complete" : "playing"}
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${captionId}`}
    >
      <header className="fanout-graph-header">
        <div>
          <p className="article-graphic-title" id={titleId}>
            Fanout across a service graph
          </p>
          <p>One browser request multiplies across the service layers</p>
        </div>
      </header>

      <div
        className="fanout-graph-stage"
        data-graphic-stage="padded"
        aria-hidden="true"
      >
        <svg
          className="fanout-graph-svg"
          viewBox={`0 0 ${compact ? COMPACT_VIEWBOX_WIDTH : VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id={markerId}
              markerHeight="6"
              markerUnits="userSpaceOnUse"
              markerWidth="7"
              orient="auto-start-reverse"
              refX="6"
              refY="3"
              viewBox="0 0 7 6"
            >
              <path className="fanout-graph-arrowhead" d="M0 0 L7 3 L0 6 Z" />
            </marker>
          </defs>

          <g className="fanout-graph-edges">
            {FANOUT_EDGES.map((edge) => (
              <Edge
                key={edge.id}
                edge={edge}
                markerId={markerId}
                nodes={nodes}
              />
            ))}
          </g>

          <g className="fanout-graph-column-labels">
            <text x={nodes[1].x} y="24" textAnchor="middle">
              FRONT END
            </text>
            <text x={nodes[2].x} y="24" textAnchor="middle">
              MID-TIER
            </text>
            <text x={nodes[4].x} y="24" textAnchor="middle">
              BACK END
            </text>
          </g>

          <g className="fanout-graph-request-orbs">
            {snapshot.packets.map((packet) => (
              <RequestOrb key={packet.id} packet={packet} nodes={nodes} />
            ))}
          </g>

          <g className="fanout-graph-nodes">
            {nodes.map((node) => (
              <Node key={node.id} node={node} />
            ))}
          </g>
        </svg>
      </div>

      <p className="sr-only" id={descriptionId}>
        A browser sends a low-rate stream to the front end. The front end fans
        requests out to two mid-tier services, and each mid-tier service calls
        two back-end services. The third back-end service receives an
        intentionally high rate of 2.5 requests per second, five times the 0.5
        requests per second on another normalized path. Bright orbs represent
        requests only; responses are not shown.
      </p>
    </figure>
  );
}

function useFanoutPlayback(): FanoutSnapshot {
  const [snapshot, setSnapshot] = useState(INITIAL_FANOUT_SNAPSHOT);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let elapsedMs = 0;
    let previousFrame: number | undefined;

    const cancelFrame = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const settle = () => {
      cancelFrame();
      setSnapshot(deriveFanoutSnapshot(FANOUT_DURATION_MS));
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const nextElapsed = elapsedMs % FANOUT_DURATION_MS;
      elapsedMs = nextElapsed;
      setSnapshot(deriveFanoutSnapshot(nextElapsed));
      animationFrame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      cancelFrame();
      if (reducedMotion.matches) {
        settle();
        return;
      }
      if (document.hidden) {
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      elapsedMs = 0;
      setSnapshot(INITIAL_FANOUT_SNAPSHOT);
      start();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelFrame();
      } else {
        start();
      }
    };

    start();
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelFrame();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return snapshot;
}

function useCompactGraph() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 540px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return compact;
}

function compactNodes() {
  return FANOUT_NODES.map((node) => ({
    ...node,
    x: node.x * (COMPACT_VIEWBOX_WIDTH / VIEWBOX_WIDTH),
  }));
}

function Edge({
  edge,
  markerId,
  nodes,
}: {
  edge: FanoutEdge;
  markerId: string;
  nodes: readonly FanoutNode[];
}) {
  const from = nodes.find((node) => node.id === edge.from)!;
  const to = nodes.find((node) => node.id === edge.to)!;
  const endpoints = edgeEndpoints(from, to);

  return (
    <line
      className="fanout-graph-edge"
      x1={endpoints.x1}
      y1={endpoints.y1}
      x2={endpoints.x2}
      y2={endpoints.y2}
      markerEnd={`url(#${markerId})`}
    />
  );
}

function edgeEndpoints(from: FanoutNode, to: FanoutNode) {
  const fromPoint = nodeBoundaryPoint(from, to);
  const toPoint = nodeBoundaryPoint(to, from);

  return {
    x1: fromPoint.x,
    y1: fromPoint.y,
    x2: toPoint.x,
    y2: toPoint.y,
  };
}

function nodeBoundaryPoint(node: FanoutNode, toward: FanoutNode) {
  const xDelta = toward.x - node.x;
  const yDelta = toward.y - node.y;
  const length = Math.hypot(xDelta, yDelta);
  const unitX = xDelta / length;
  const unitY = yDelta / length;

  if (node.shape === "browser") {
    const scale = Math.min(
      BROWSER_HALF_WIDTH / Math.abs(unitX || Number.EPSILON),
      BROWSER_HALF_HEIGHT / Math.abs(unitY || Number.EPSILON),
    );

    return {
      x: node.x + unitX * scale,
      y: node.y + unitY * scale,
    };
  }

  return {
    x: node.x + unitX * NODE_RADIUS,
    y: node.y + unitY * NODE_RADIUS,
  };
}

function RequestOrb({
  packet,
  nodes,
}: {
  packet: FanoutSnapshot["packets"][number];
  nodes: readonly FanoutNode[];
}) {
  const edge = FANOUT_EDGES.find(
    (candidate) => candidate.id === packet.edgeId,
  )!;
  const from = nodes.find((node) => node.id === edge.from)!;
  const to = nodes.find((node) => node.id === edge.to)!;
  const endpoints = edgeEndpoints(from, to);
  const x = endpoints.x1 + (endpoints.x2 - endpoints.x1) * packet.progress;
  const y = endpoints.y1 + (endpoints.y2 - endpoints.y1) * packet.progress;

  return (
    <g
      className="fanout-graph-request-orb"
      transform={`translate(${x} ${y})`}
      data-request={packet.request}
      data-edge={packet.edgeId}
    >
      <circle className="fanout-graph-request-orb-glow" r="10" />
      <circle className="fanout-graph-request-orb-core" r="4.5" />
    </g>
  );
}

function Node({ node }: { node: FanoutNode }) {
  const style = {
    "--fanout-node-color": node.color,
  } as CSSProperties;

  return (
    <g
      className="fanout-graph-node"
      data-column={node.column}
      data-node={node.id}
      style={style}
      transform={`translate(${node.x} ${node.y})`}
    >
      {node.shape === "browser" ? (
        <>
          <rect
            className="fanout-graph-browser-window"
            x="-36"
            y="-27"
            width="72"
            height="54"
            rx="8"
          />
          <line
            className="fanout-graph-browser-toolbar"
            x1="-36"
            y1="-14"
            x2="36"
            y2="-14"
          />
          <circle
            className="fanout-graph-browser-dot fanout-graph-browser-dot-red"
            cx="-26"
            cy="-21"
            r="2"
          />
          <circle
            className="fanout-graph-browser-dot fanout-graph-browser-dot-yellow"
            cx="-18"
            cy="-21"
            r="2"
          />
          <circle
            className="fanout-graph-browser-dot fanout-graph-browser-dot-green"
            cx="-10"
            cy="-21"
            r="2"
          />
          <rect
            className="fanout-graph-browser-address-bar"
            x="-2"
            y="-24"
            width="28"
            height="7"
            rx="3.5"
          />
          <path className="fanout-graph-browser-address-mark" d="M7 -20.5h5" />
          <circle
            className="fanout-graph-safari-compass"
            cx="0"
            cy="4"
            r="15"
          />
          <path
            className="fanout-graph-safari-compass-red"
            d="M0 -8 L4 0 L0 -2 Z"
          />
          <path
            className="fanout-graph-safari-compass-blue"
            d="M0 16 L-4 4 L0 6 Z"
          />
          <circle
            className="fanout-graph-safari-compass-center"
            cx="0"
            cy="4"
            r="2"
          />
        </>
      ) : (
        <circle className="fanout-graph-node-circle" r={NODE_RADIUS} />
      )}
      <text
        className="fanout-graph-node-label"
        textAnchor="middle"
        y={node.shape === "browser" ? 48 : 4}
      >
        {node.label}
      </text>
      <text
        className="fanout-graph-node-rate"
        textAnchor="middle"
        y={node.shape === "browser" ? 64 : 48}
      >
        {node.rateLabel}
      </text>
    </g>
  );
}
