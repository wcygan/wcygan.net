import {
  LAG_TIMING,
  type LagPacket,
  type LagSnapshot,
  type ReplicaSnapshot,
} from "./model";
import type { CanvasViewport } from "./viewport";

type Point = {
  x: number;
  y: number;
};

type Rect = Point & {
  width: number;
  height: number;
};

type NodeKey = LagPacket["from"] | LagPacket["to"];

type NodeLayout = {
  center: Point;
  radius?: number;
  rect?: Rect;
};

const COLORS = {
  ink: "#172033",
  muted: "#5c667a",
  line: "#d9deea",
  shell: "#eef1f7",
  panel: "#ffffff",
  blue: "#2f69f0",
  blueSoft: "rgb(47 105 240 / 10%)",
  green: "#1d8b65",
  greenSoft: "rgb(29 139 101 / 10%)",
  gold: "#d59b24",
  goldSoft: "rgb(213 155 36 / 14%)",
  red: "#d24a44",
  redSoft: "rgb(210 74 68 / 10%)",
};

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const COMPACT_LAYOUT_MAX_WIDTH = 620;

export function drawReplicationLagDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: LagSnapshot,
  viewport: CanvasViewport,
) {
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.cssWidth, viewport.cssHeight);
  ctx.fillStyle = COLORS.shell;
  ctx.fillRect(0, 0, viewport.cssWidth, viewport.cssHeight);

  if (viewport.cssWidth <= COMPACT_LAYOUT_MAX_WIDTH) {
    drawCompact(ctx, snapshot, viewport.cssWidth, viewport.cssHeight);
    return;
  }

  drawWide(ctx, snapshot, viewport.cssWidth, viewport.cssHeight);
}

function drawWide(
  ctx: CanvasRenderingContext2D,
  snapshot: LagSnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const cardWidth = Math.min(178, (width - padding * 2 - 48) / 3);
  const cardHeight = 122;
  const cardY = 88;
  const virginia = rect(padding, cardY, cardWidth, cardHeight);
  const texas = rect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight);
  const oregon = rect(
    width - padding - cardWidth,
    cardY,
    cardWidth,
    cardHeight,
  );
  const timeline = rect(padding, height - 126, width - padding * 2, 96);
  const user = { center: { x: virginia.x + 34, y: 42 }, radius: 18 };
  const layout: Record<NodeKey, NodeLayout> = {
    user,
    virginia: { center: center(virginia), rect: virginia },
    texas: { center: center(texas), rect: texas },
    oregon: { center: center(oregon), rect: oregon },
  };

  drawUser(ctx, user.center, "user");
  drawRelationshipLines(ctx, layout);
  drawReplicaCard(ctx, virginia, snapshot.replicas[0]);
  drawReplicaCard(ctx, texas, snapshot.replicas[1]);
  drawReplicaCard(ctx, oregon, snapshot.replicas[2]);
  drawPackets(ctx, snapshot.packets, layout, "wide");
  drawTimeline(ctx, timeline, snapshot);
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: LagSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const cardWidth = width - padding * 2;
  const cardHeight = 112;
  const gap = 28;
  const user = { center: { x: width / 2, y: 36 }, radius: 18 };
  const virginia = rect(padding, 70, cardWidth, cardHeight);
  const texas = rect(
    padding,
    virginia.y + cardHeight + gap,
    cardWidth,
    cardHeight,
  );
  const oregon = rect(
    padding,
    texas.y + cardHeight + gap,
    cardWidth,
    cardHeight,
  );
  const timeline = rect(padding, height - 126, cardWidth, 96);
  const layout: Record<NodeKey, NodeLayout> = {
    user,
    virginia: { center: center(virginia), rect: virginia },
    texas: { center: center(texas), rect: texas },
    oregon: { center: center(oregon), rect: oregon },
  };

  drawUser(ctx, user.center, "user");
  drawRelationshipLines(ctx, layout);
  drawReplicaCard(ctx, virginia, snapshot.replicas[0], "compact");
  drawReplicaCard(ctx, texas, snapshot.replicas[1], "compact");
  drawReplicaCard(ctx, oregon, snapshot.replicas[2], "compact");
  drawPackets(ctx, snapshot.packets, layout, "compact", width);
  drawTimeline(ctx, timeline, snapshot);
}

function drawRelationshipLines(
  ctx: CanvasRenderingContext2D,
  layout: Record<NodeKey, NodeLayout>,
) {
  drawArrow(ctx, layout.user, layout.virginia, COLORS.line);
  drawArrow(ctx, layout.virginia, layout.texas, COLORS.line);
  drawArrow(ctx, layout.texas, layout.oregon, COLORS.line);
}

function drawReplicaCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  replica: ReplicaSnapshot,
  layout: "wide" | "compact" = "wide",
) {
  const palette = replicaPalette(replica.status);
  const lagY = layout === "compact" ? card.y + 62 : card.y + card.height - 52;
  const lagX = layout === "compact" ? card.x + 58 : card.x + card.width / 2;
  const lagAlign = layout === "compact" ? "left" : "center";

  drawRoundedRect(ctx, card, 10);
  ctx.fillStyle = palette.fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.stroke;
  ctx.stroke();

  drawDatabase(ctx, card.x + 30, card.y + 36, palette.stroke);
  drawText(ctx, replica.label, card.x + 58, card.y + 22, {
    color: COLORS.ink,
    font: `800 15px ${UI_FONT}`,
    maxWidth: card.width - 68,
  });
  drawText(ctx, replica.city, card.x + 58, card.y + 42, {
    color: COLORS.muted,
    font: `12px ${UI_FONT}`,
    maxWidth: card.width - 68,
  });

  drawPill(
    ctx,
    rect(card.x + 14, card.y + card.height - 38, 78, 23),
    statusLabel(replica.status),
    palette.stroke,
  );
  drawPill(
    ctx,
    rect(card.x + card.width - 76, card.y + card.height - 38, 60, 23),
    `v${replica.version}`,
    replica.version === 19 ? COLORS.green : COLORS.gold,
  );
  drawText(ctx, `lag ${replica.lagMs}ms`, lagX, lagY, {
    align: lagAlign,
    color: replica.lagMs === 0 ? COLORS.green : COLORS.red,
    font: `700 11px ${MONO_FONT}`,
    maxWidth: layout === "compact" ? card.width - 150 : card.width - 24,
  });
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: LagSnapshot,
) {
  drawRoundedRect(ctx, box, 10);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawText(ctx, "failover decision", box.x + 14, box.y + 18, {
    color: COLORS.muted,
    font: `800 11px ${UI_FONT}`,
    maxWidth: box.width * 0.52,
  });

  const decision = snapshot.safeFailoverTarget
    ? `serve from ${snapshot.safeFailoverTarget}`
    : "primary healthy";
  const timelineColor = timelineStatusColor(snapshot);

  drawDecisionPill(
    ctx,
    rect(
      box.x + box.width - Math.min(152, box.width * 0.42) - 12,
      box.y + 9,
      Math.min(152, box.width * 0.42),
      22,
    ),
    decision,
    timelineColor,
  );

  const x1 = box.x + 32;
  const x2 = box.x + box.width - 42;
  const y = box.y + 53;
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();

  const timelineProgress = clampNumber(
    snapshot.progress / LAG_TIMING.oregonApplyAt,
    0,
    1,
  );
  const activeX = x1 + (x2 - x1) * timelineProgress;
  ctx.strokeStyle = timelineColor;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(activeX, y);
  ctx.stroke();
  ctx.lineCap = "round";

  drawTick(
    ctx,
    x1 + (x2 - x1) * timelinePosition(LAG_TIMING.commitAt),
    y,
    "commit",
    "below",
  );
  drawTick(
    ctx,
    x1 + (x2 - x1) * timelinePosition(LAG_TIMING.texasApplyAt),
    y,
    "TX v19",
    "above",
  );
  drawTick(
    ctx,
    x1 + (x2 - x1) * timelinePosition(LAG_TIMING.virginiaFailAt),
    y,
    "VA fails",
    "below",
  );
  drawTick(
    ctx,
    x1 + (x2 - x1) * timelinePosition(LAG_TIMING.oregonApplyAt),
    y,
    "OR v19",
    "below",
  );
}

function timelinePosition(progress: number) {
  return clampNumber(progress / LAG_TIMING.oregonApplyAt, 0, 1);
}

function timelineStatusColor(snapshot: LagSnapshot) {
  const isInFailoverWindow =
    snapshot.progress >= LAG_TIMING.virginiaFailAt &&
    snapshot.progress < LAG_TIMING.oregonApplyAt;

  return isInFailoverWindow ? COLORS.red : COLORS.green;
}

function drawTick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  placement: "above" | "below",
) {
  ctx.save();
  ctx.strokeStyle = COLORS.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x, y + 9);
  ctx.stroke();
  drawText(ctx, label, x, placement === "above" ? y - 17 : y + 22, {
    align: "center",
    color: COLORS.muted,
    font: `700 10px ${UI_FONT}`,
    maxWidth: 72,
  });
  ctx.restore();
}

function drawDecisionPill(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  label: string,
  color: string,
) {
  roundedRectPath(ctx, box.x, box.y, box.width, box.height, 999);
  ctx.fillStyle = `${color}14`;
  ctx.fill();
  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = 1;
  ctx.stroke();
  drawText(ctx, label, box.x + box.width / 2, box.y + 14, {
    align: "center",
    color,
    font: `800 10px ${UI_FONT}`,
    maxWidth: box.width - 10,
  });
}

function drawPackets(
  ctx: CanvasRenderingContext2D,
  packets: readonly LagPacket[],
  layout: Record<NodeKey, NodeLayout>,
  labelMode: "wide" | "compact",
  boundsWidth?: number,
) {
  for (const packet of packets) {
    const fromNode = layout[packet.from];
    const toNode = layout[packet.to];
    const { from: start, to: end } = connectorSegment(fromNode, toNode);
    const pathPoint = pointBetween(start, end, packet.progress);
    const color = packetColor(packet.tone);

    if (labelMode === "compact") {
      const tokenPoint = compactPacketPoint(
        pathPoint,
        packet.progress,
        fromNode,
        toNode,
      );
      drawPacketToken(
        ctx,
        tokenPoint,
        compactPacketLabel(packet),
        color,
        boundsWidth,
      );
      continue;
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      pathPoint.x,
      pathPoint.y,
      packet.tone === "stale-read" ? 9 : 8,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();

    drawText(ctx, packet.label, pathPoint.x + 12, pathPoint.y - 5, {
      color,
      font: `800 11px ${UI_FONT}`,
      maxWidth: 126,
    });
    ctx.restore();
  }
}

function drawPacketToken(
  ctx: CanvasRenderingContext2D,
  point: Point,
  label: string,
  color: string,
  boundsWidth = Number.POSITIVE_INFINITY,
) {
  ctx.save();
  ctx.font = `800 10px ${UI_FONT}`;

  const tokenWidth = Math.min(
    Math.max(ctx.measureText(label).width + 28, 58),
    98,
  );
  const tokenHeight = 22;
  const tokenX = clampNumber(
    point.x - tokenWidth / 2,
    8,
    boundsWidth - tokenWidth - 8,
  );
  const tokenY = point.y - tokenHeight / 2;

  roundedRectPath(ctx, tokenX, tokenY, tokenWidth, tokenHeight, 999);
  ctx.fillStyle = "rgb(255 255 255 / 94%)";
  ctx.fill();
  ctx.strokeStyle = `${color}77`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(tokenX + 11, tokenY + tokenHeight / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  drawText(ctx, label, tokenX + 21, tokenY + tokenHeight / 2 + 0.5, {
    color: COLORS.ink,
    font: `800 10px ${UI_FONT}`,
    maxWidth: tokenWidth - 26,
  });
  ctx.restore();
}

function compactPacketPoint(
  pathPoint: Point,
  progress: number,
  fromNode: NodeLayout,
  toNode: NodeLayout,
) {
  if (toNode.radius) return pathPoint;

  const landingPoint = insideNodePoint(toNode, fromNode.center, 24);
  const landingBias = easeOut(clampNumber((progress - 0.66) / 0.34, 0, 1));
  return pointBetween(pathPoint, landingPoint, landingBias);
}

function insideNodePoint(node: NodeLayout, from: Point, inset: number): Point {
  const edge = boundaryPoint(node, from);
  const dx = node.center.x - edge.x;
  const dy = node.center.y - edge.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return edge;

  return {
    x: edge.x + (dx / length) * inset,
    y: edge.y + (dy / length) * inset,
  };
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - clampNumber(value, 0, 1), 3);
}

function compactPacketLabel(packet: LagPacket) {
  switch (packet.label) {
    case "write v19":
      return "write";
    case "async copy v19":
      return "copy";
    case "read Oregon":
      return "read OR";
    case "returns v18":
      return "v18 back";
    case "repair v19":
      return "repair";
    default:
      return packet.label;
  }
}

function drawUser(ctx: CanvasRenderingContext2D, point: Point, label: string) {
  ctx.save();
  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = COLORS.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.blue;
  ctx.beginPath();
  ctx.arc(point.x, point.y - 5, 4, 0, Math.PI * 2);
  ctx.fill();
  roundedRectPath(ctx, point.x - 8, point.y + 3, 16, 8, 4);
  ctx.fill();
  drawText(ctx, label, point.x + 24, point.y + 4, {
    color: COLORS.ink,
    font: `800 12px ${UI_FONT}`,
    maxWidth: 116,
  });
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  startNode: NodeLayout,
  endNode: NodeLayout,
  color: string,
) {
  const { from, to } = connectorSegment(startNode, endNode);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - Math.cos(angle - 0.48) * 10,
    to.y - Math.sin(angle - 0.48) * 10,
  );
  ctx.lineTo(
    to.x - Math.cos(angle + 0.48) * 10,
    to.y - Math.sin(angle + 0.48) * 10,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDatabase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = "rgb(255 255 255 / 78%)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(x, y - 10, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 10);
  ctx.lineTo(x - 16, y + 14);
  ctx.moveTo(x + 16, y - 10);
  ctx.lineTo(x + 16, y + 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 16, 7, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  label: string,
  color: string,
) {
  roundedRectPath(ctx, box.x, box.y, box.width, box.height, 999);
  ctx.fillStyle = `${color}18`;
  ctx.fill();
  ctx.strokeStyle = `${color}66`;
  ctx.lineWidth = 1;
  ctx.stroke();
  drawText(ctx, label, box.x + box.width / 2, box.y + 14, {
    align: "center",
    color,
    font: `800 10px ${UI_FONT}`,
    maxWidth: box.width - 10,
  });
}

function replicaPalette(status: ReplicaSnapshot["status"]) {
  switch (status) {
    case "primary":
      return { fill: COLORS.blueSoft, stroke: COLORS.blue };
    case "new-primary":
      return { fill: COLORS.greenSoft, stroke: COLORS.green };
    case "caught-up":
      return { fill: COLORS.greenSoft, stroke: COLORS.green };
    case "lagging":
      return { fill: COLORS.goldSoft, stroke: COLORS.gold };
    case "failed":
      return { fill: COLORS.redSoft, stroke: COLORS.red };
    case "replica":
      return { fill: COLORS.panel, stroke: COLORS.line };
  }
}

function statusLabel(status: ReplicaSnapshot["status"]) {
  switch (status) {
    case "primary":
      return "primary";
    case "new-primary":
      return "serve here";
    case "caught-up":
      return "current";
    case "lagging":
      return "lagging";
    case "failed":
      return "failed";
    case "replica":
      return "replica";
  }
}

function packetColor(tone: LagPacket["tone"]) {
  switch (tone) {
    case "write":
      return COLORS.blue;
    case "replication":
      return COLORS.green;
    case "repair":
      return COLORS.green;
    case "stale-read":
      return COLORS.red;
  }
}

function center(box: Rect): Point {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

function pointBetween(start: Point, end: Point, amount: number): Point {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  };
}

function clampNumber(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function connectorSegment(
  fromNode: NodeLayout,
  toNode: NodeLayout,
): { from: Point; to: Point } {
  return {
    from: boundaryPoint(fromNode, toNode.center),
    to: boundaryPoint(toNode, fromNode.center),
  };
}

function boundaryPoint(node: NodeLayout, toward: Point): Point {
  if (node.rect) return rectBoundaryPoint(node.rect, toward);
  if (node.radius) return circleBoundaryPoint(node.center, node.radius, toward);
  return node.center;
}

function rectBoundaryPoint(box: Rect, toward: Point): Point {
  const origin = center(box);
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;

  if (dx === 0 && dy === 0) return origin;

  const scale =
    1 /
    Math.max(Math.abs(dx) / (box.width / 2), Math.abs(dy) / (box.height / 2));

  return {
    x: origin.x + dx * scale,
    y: origin.y + dy * scale,
  };
}

function circleBoundaryPoint(
  centerPoint: Point,
  radius: number,
  toward: Point,
): Point {
  const dx = toward.x - centerPoint.x;
  const dy = toward.y - centerPoint.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return centerPoint;

  return {
    x: centerPoint.x + (dx / length) * radius,
    y: centerPoint.y + (dy / length) * radius,
  };
}

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  radius: number,
) {
  roundedRectPath(ctx, box.x, box.y, box.width, box.height, radius);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const size = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + size, y);
  ctx.arcTo(x + width, y, x + width, y + height, size);
  ctx.arcTo(x + width, y + height, x, y + height, size);
  ctx.arcTo(x, y + height, x, y, size);
  ctx.arcTo(x, y, x + width, y, size);
  ctx.closePath();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    align?: CanvasTextAlign;
    color: string;
    font: string;
    maxWidth?: number;
  },
) {
  ctx.save();
  ctx.fillStyle = options.color;
  ctx.font = options.font;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    options.maxWidth ? ellipsize(ctx, text, options.maxWidth) : text,
    x,
    y,
  );
  ctx.restore();
}

function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let clipped = text;
  while (
    clipped.length > 1 &&
    ctx.measureText(`${clipped}...`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1);
  }

  return `${clipped}...`;
}
