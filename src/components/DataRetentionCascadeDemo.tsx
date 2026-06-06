// Animated explainer for the "Example: Data Retention" section of the CDC post.
//
// Concept: a single delete self-propagates through a tree of related entities.
// Deleting customer #91 emits a purge event; the order service deletes its
// orders; those deletes flow back through CDC as the next round of purge
// events, reaching the shipments those orders owned.
//
// Invariant: a child can only tombstone after its parent has, because the
// parent's delete is what produces the purge event that travels the edge. The
// tree is symmetric and every level advances both sides in lockstep, so the
// cascade reads as one smooth wave rather than two races.
//
// Visual form: a balanced tree (Customer -> two Orders -> two Shipments). A gold
// purge event naming the just-deleted entity (e.g. "Customer #91", then "Order
// #7012") travels each edge (blue path); on arrival the target card pulses gold,
// then settles to a tombstoned red state. After the cascade completes it holds,
// then revives and loops.
//
// Tier: interactive canvas, time-driven loop, no controls. Single file because
// every frame is derived from one phase value, like CdcPropagationAnimation.
import { useEffect, useRef } from "react";

const LOOP_MS = 11500;

// Phase milestones (fractions of the loop). Each level shares one death time so
// both siblings flip together; token travel fills the gap between two times.
const CUSTOMER_DEATH = 0.08;
const ORDER_DEATH = 0.36;
const SHIPMENT_DEATH = 0.64;
const REVIVE_START = 0.86;

const DEATH_FADE = 0.05; // phase width of the live -> tombstoned color cross-fade
const PULSE_WINDOW = 0.13; // phase width of the gold "delete received" pulse

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const COLORS = {
  ink: "#172033",
  muted: "#5c667a",
  line: "#d9deea",
  shell: "#eef1f7",
  panel: "#ffffff",
  blue: "#2f69f0",
  gold: "#d59b24",
  goldSoft: "rgba(213, 155, 36, 0.16)",
  goldGlow: "rgba(213, 155, 36, 0.3)",
  red: "#d24a44",
  shadow: "rgba(23, 32, 51, 0.1)",
};

type Rgb = readonly [number, number, number];

const LIVE_FILL: Rgb = [255, 255, 255];
const DEAD_FILL: Rgb = [250, 233, 232];
const LIVE_STROKE: Rgb = [217, 222, 234];
const DEAD_STROKE: Rgb = [210, 74, 68];
const GOLD_STROKE: Rgb = [213, 155, 36];
const LIVE_EYEBROW: Rgb = [92, 102, 122];
const DEAD_TEXT: Rgb = [183, 53, 48];
const LIVE_ID: Rgb = [23, 32, 51];

type TreeNode = {
  kind: string;
  id: string;
  level: number; // 0 root, 1 orders, 2 shipments
  col: number; // -1 left, 0 center, 1 right
  deathPhase: number;
};

// Symmetric tree: one customer, two orders, one shipment per order. Both leaves
// are the same entity type so the columns are identical in width and timing.
const NODES: readonly TreeNode[] = [
  { kind: "Customer", id: "#91", level: 0, col: 0, deathPhase: CUSTOMER_DEATH },
  { kind: "Order", id: "#7012", level: 1, col: -1, deathPhase: ORDER_DEATH },
  { kind: "Order", id: "#7013", level: 1, col: 1, deathPhase: ORDER_DEATH },
  {
    kind: "Shipment",
    id: "#5012",
    level: 2,
    col: -1,
    deathPhase: SHIPMENT_DEATH,
  },
  {
    kind: "Shipment",
    id: "#5013",
    level: 2,
    col: 1,
    deathPhase: SHIPMENT_DEATH,
  },
];

const EDGES: readonly { from: number; to: number }[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 4 },
];

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function easeInOut(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function mixColor(from: Rgb, to: Rgb, amount: number) {
  const t = clamp(amount, 0, 1);
  const r = Math.round(mix(from[0], to[0], t));
  const g = Math.round(mix(from[1], to[1], t));
  const b = Math.round(mix(from[2], to[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

// --- derived model -------------------------------------------------------
// Everything visible in a frame is a pure function of the loop phase.

type NodeState = { dead: number; pulse: number };
type EdgeState = { fill: number; tokenProgress: number; tokenVisible: boolean };

function deriveNode(node: TreeNode, phase: number, revive: number): NodeState {
  if (revive > 0) return { dead: 1 - revive, pulse: 0 };
  const dead = easeInOut(clamp((phase - node.deathPhase) / DEATH_FADE, 0, 1));
  const since = (phase - node.deathPhase) / PULSE_WINDOW;
  const pulse = since < 0 || since > 1 ? 0 : Math.sin(since * Math.PI);
  return { dead, pulse };
}

function deriveEdge(
  parent: TreeNode,
  child: TreeNode,
  phase: number,
  revive: number,
): EdgeState {
  const span = child.deathPhase - parent.deathPhase;
  const progress = easeInOut(clamp((phase - parent.deathPhase) / span, 0, 1));
  const live = revive > 0 ? 0 : progress;
  const tokenVisible =
    revive === 0 && phase > parent.deathPhase && phase < child.deathPhase;
  return { fill: live, tokenProgress: progress, tokenVisible };
}

// --- layout --------------------------------------------------------------

type Layout = {
  nodeW: number;
  nodeH: number;
  positions: Point[];
};

function computeLayout(width: number, height: number): Layout {
  const nodeW = clamp(width * 0.2, 96, 132);
  const nodeH = clamp(width * 0.08, 52, 62);
  const spread = clamp(width * 0.23, 80, 150);
  const levelGap = clamp(height * 0.31, 104, 150);

  const centerX = width / 2;
  const blockHeight = levelGap * 2 + nodeH;
  const top = (height - blockHeight) / 2;
  const rowY = [
    top + nodeH / 2,
    top + levelGap + nodeH / 2,
    top + levelGap * 2 + nodeH / 2,
  ];

  const positions = NODES.map((node) => ({
    x: centerX + node.col * spread,
    y: rowY[node.level],
  }));

  return { nodeW, nodeH, positions };
}

// --- canvas helpers ------------------------------------------------------

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { align?: CanvasTextAlign; color: string; font: string },
) {
  ctx.fillStyle = options.color;
  ctx.font = options.font;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  fill: number,
) {
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  if (fill <= 0) return;
  const t = clamp(fill, 0, 1);
  ctx.strokeStyle = COLORS.blue;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(mix(start.x, end.x, t), mix(start.y, end.y, t));
  ctx.stroke();
}

// Purge event in flight: a gold pill naming the entity whose deletion produced
// it (the source node), with a "PURGE" eyebrow over the entity, a soft halo, and
// a shadow so it reads as the active event (matching the gold event in the
// sibling CDC animation). The deletion of Customer #91 emits a "Customer #91"
// purge event; each order's deletion then emits its own "Order #7012" event.
function drawToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  entity: string,
) {
  ctx.font = `800 10px ${MONO_FONT}`;
  const width = Math.max(ctx.measureText(entity).width + 22, 78);
  const height = 30;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = COLORS.goldGlow;
  roundedPath(ctx, -width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 12);
  ctx.fill();

  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  roundedPath(ctx, -width / 2, -height / 2, width, height, 9);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.shadowColor = "transparent";

  drawText(ctx, "PURGE", 0, -height / 2 + 9, {
    align: "center",
    color: "rgba(255, 255, 255, 0.85)",
    font: `800 8px ${UI_FONT}`,
  });
  drawText(ctx, entity, 0, height / 2 - 9, {
    align: "center",
    color: COLORS.panel,
    font: `800 11px ${MONO_FONT}`,
  });
  ctx.restore();
}

function drawCross(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size);
  ctx.lineTo(cx + size, cy + size);
  ctx.moveTo(cx + size, cy - size);
  ctx.lineTo(cx - size, cy + size);
  ctx.stroke();
  ctx.restore();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: TreeNode,
  center: Point,
  width: number,
  height: number,
  state: NodeState,
) {
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const { dead, pulse } = state;

  // Gold "delete received" glow blooms outward as the purge event lands.
  if (pulse > 0) {
    ctx.save();
    ctx.globalAlpha = pulse * 0.5;
    const grow = 4 + pulse * 7;
    roundedPath(
      ctx,
      left - grow,
      top - grow,
      width + grow * 2,
      height + grow * 2,
      14,
    );
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.restore();
  }

  const fill = mixColor(LIVE_FILL, DEAD_FILL, dead);
  const baseStroke = mixColor(LIVE_STROKE, DEAD_STROKE, dead);
  const stroke =
    pulse > 0 ? mixColor(DEAD_STROKE, GOLD_STROKE, pulse) : baseStroke;

  // Card with drop shadow; the shadow eases off as the node dies so tombstones
  // read as flat, settled remnants.
  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = mix(14, 0, dead);
  ctx.shadowOffsetY = mix(5, 0, dead);
  roundedPath(ctx, left, top, width, height, 10);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 1.6 + pulse * 0.6;
  ctx.strokeStyle = stroke;
  if (dead > 0.5) ctx.setLineDash([5, 4]);
  roundedPath(ctx, left, top, width, height, 10);
  ctx.stroke();
  ctx.setLineDash([]);

  drawText(ctx, node.kind.toUpperCase(), center.x, top + height * 0.32, {
    align: "center",
    color: mixColor(LIVE_EYEBROW, DEAD_TEXT, dead),
    font: `800 10px ${UI_FONT}`,
  });

  const idColor = mixColor(LIVE_ID, DEAD_TEXT, dead);
  const idY = top + height * 0.64;
  drawText(ctx, node.id, center.x, idY, {
    align: "center",
    color: idColor,
    font: `800 17px ${MONO_FONT}`,
  });

  if (dead > 0.02) {
    ctx.font = `800 17px ${MONO_FONT}`;
    const idWidth = ctx.measureText(node.id).width;
    ctx.save();
    ctx.globalAlpha = dead;
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(center.x - idWidth / 2 - 3, idY);
    ctx.lineTo(center.x + idWidth / 2 + 3, idY);
    ctx.stroke();
    ctx.restore();

    drawCross(ctx, left + width - 13, top + height - 13, 4.5, COLORS.red, dead);
  }
}

function topPort(center: Point, height: number): Point {
  return { x: center.x, y: center.y - height / 2 };
}

function bottomPort(center: Point, height: number): Point {
  return { x: center.x, y: center.y + height / 2 };
}

function drawFrame(canvas: HTMLCanvasElement, now: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const phase = (now % LOOP_MS) / LOOP_MS;
  const revive =
    phase >= REVIVE_START
      ? easeInOut(clamp((phase - REVIVE_START) / (1 - REVIVE_START), 0, 1))
      : 0;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.shell;
  ctx.fillRect(0, 0, width, height);

  const layout = computeLayout(width, height);

  for (const edge of EDGES) {
    const state = deriveEdge(NODES[edge.from], NODES[edge.to], phase, revive);
    const start = bottomPort(layout.positions[edge.from], layout.nodeH);
    const end = topPort(layout.positions[edge.to], layout.nodeH);
    drawEdge(ctx, start, end, state.fill);
  }

  for (const edge of EDGES) {
    const source = NODES[edge.from];
    const state = deriveEdge(source, NODES[edge.to], phase, revive);
    if (!state.tokenVisible) continue;
    const start = bottomPort(layout.positions[edge.from], layout.nodeH);
    const end = topPort(layout.positions[edge.to], layout.nodeH);
    drawToken(
      ctx,
      mix(start.x, end.x, state.tokenProgress),
      mix(start.y, end.y, state.tokenProgress),
      `${source.kind} ${source.id}`,
    );
  }

  NODES.forEach((node, index) => {
    drawNode(
      ctx,
      node,
      layout.positions[index],
      layout.nodeW,
      layout.nodeH,
      deriveNode(node, phase, revive),
    );
  });
}

export function DataRetentionCascadeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      // Hold a frame where the whole cascade has fired.
      drawFrame(canvas, LOOP_MS * 0.78);
      return;
    }

    const draw = (now: number) => {
      drawFrame(canvas, now);
      frameRef.current = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(() =>
      drawFrame(canvas, performance.now()),
    );
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <figure className="data-retention-demo">
      <div className="data-retention-header">
        <h2>Event-Based Delete Cascade</h2>
        <p>
          Deleting customer #91 emits a purge event. The order service deletes
          its orders, and those deletes flow back through CDC as the next round
          of purge events, reaching the shipments those orders owned.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="data-retention-canvas"
        role="img"
        aria-label="Animated tree of related entities. Deleting customer #91 at the top emits a gold purge event labelled Customer #91 that travels down both edges in lockstep to order #7012 and order #7013, which pulse gold and then turn red and tombstoned. Each order delete emits its own purge event labelled Order #7012 or Order #7013 that travels down to shipment #5012 and shipment #5013, tombstoning them in turn. The cascade fans down level by level on both sides together, then resets and loops."
      />

      <figcaption
        className="data-retention-legend"
        aria-label="Data retention cascade legend"
      >
        <span>
          <i data-tone="path" />
          purge path
        </span>
        <span>
          <i data-tone="event" />
          purge event
        </span>
        <span>
          <i data-tone="tombstoned" />
          deleted entity
        </span>
      </figcaption>
    </figure>
  );
}
