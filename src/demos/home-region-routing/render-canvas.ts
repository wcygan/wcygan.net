import type { RegionSnapshot, RoutingPacket, RoutingSnapshot } from "./model";
import type { CanvasViewport } from "./viewport";

type Point = {
  x: number;
  y: number;
};

type Rect = Point & {
  width: number;
  height: number;
};

type NodeKey = RoutingPacket["from"] | RoutingPacket["to"];

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
};

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const COMPACT_LAYOUT_MAX_WIDTH = 620;

export function drawHomeRegionRoutingDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: RoutingSnapshot,
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
  snapshot: RoutingSnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const cardWidth = Math.min(176, (width - padding * 2 - 44) / 3);
  const cardHeight = 116;
  const cardY = 110;
  const oregon = rect(padding, cardY, cardWidth, cardHeight);
  const virginia = rect(
    width / 2 - cardWidth / 2,
    cardY,
    cardWidth,
    cardHeight,
  );
  const texas = rect(width - padding - cardWidth, cardY, cardWidth, cardHeight);
  const directory = rect(
    Math.max(padding, width / 2 - 160),
    height - 106,
    Math.min(320, width - padding * 2),
    74,
  );
  const user = { center: { x: oregon.x + 34, y: 42 }, radius: 18 };
  const layout: Record<NodeKey, NodeLayout> = {
    user,
    oregon: { center: center(oregon), rect: oregon },
    directory: { center: center(directory), rect: directory },
    virginia: { center: center(virginia), rect: virginia },
    texas: { center: center(texas), rect: texas },
  };

  drawUser(ctx, user.center, "Seattle user");
  drawRelationshipLines(ctx, layout);
  drawDirectory(ctx, directory, snapshot);
  drawRegionCard(ctx, oregon, snapshot.regions[0]);
  drawRegionCard(ctx, virginia, snapshot.regions[1]);
  drawRegionCard(ctx, texas, snapshot.regions[2]);
  drawPackets(ctx, snapshot.packets, layout, true);
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: RoutingSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const cardWidth = width - padding * 2;
  const cardHeight = 92;
  const gap = 22;
  const user = { center: { x: width / 2, y: 38 }, radius: 18 };
  const oregon = rect(padding, 72, cardWidth, cardHeight);
  const directory = rect(padding, oregon.y + cardHeight + gap, cardWidth, 68);
  const virginia = rect(
    padding,
    directory.y + directory.height + gap,
    cardWidth,
    cardHeight,
  );
  const texas = rect(
    padding,
    virginia.y + cardHeight + gap,
    cardWidth,
    cardHeight,
  );
  const layout: Record<NodeKey, NodeLayout> = {
    user,
    oregon: { center: center(oregon), rect: oregon },
    directory: { center: center(directory), rect: directory },
    virginia: { center: center(virginia), rect: virginia },
    texas: { center: center(texas), rect: texas },
  };

  drawUser(ctx, user.center, "user request");
  drawRelationshipLines(ctx, layout);
  drawDirectory(ctx, directory, snapshot);
  drawRegionCard(ctx, oregon, snapshot.regions[0]);
  drawRegionCard(ctx, virginia, snapshot.regions[1]);
  drawRegionCard(ctx, texas, snapshot.regions[2]);
  drawPackets(ctx, snapshot.packets, layout, false);

  const footer = rect(padding, height - 52, cardWidth, 34);
  drawMiniStatus(
    ctx,
    footer,
    `account 42: home VA, version ${snapshot.accountVersion}`,
  );
}

function drawRelationshipLines(
  ctx: CanvasRenderingContext2D,
  layout: Record<NodeKey, NodeLayout>,
) {
  drawArrow(ctx, layout.user, layout.oregon, COLORS.line);
  drawArrow(ctx, layout.oregon, layout.directory, COLORS.line);
  drawArrow(ctx, layout.oregon, layout.virginia, COLORS.line);
  drawArrow(ctx, layout.virginia, layout.texas, COLORS.line);
  drawArrow(ctx, layout.virginia, layout.oregon, COLORS.line);
}

function drawRegionCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  region: RegionSnapshot,
) {
  const isCurrent = region.version === 19;
  const isHome = region.role === "home";
  const stroke = isHome ? COLORS.blue : isCurrent ? COLORS.green : COLORS.line;
  const fill = isHome
    ? COLORS.blueSoft
    : isCurrent
      ? COLORS.greenSoft
      : COLORS.panel;

  drawRoundedRect(ctx, card, 10);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  drawDatabase(
    ctx,
    card.x + 30,
    card.y + 34,
    isCurrent ? COLORS.green : COLORS.blue,
  );
  drawText(ctx, region.label, card.x + 58, card.y + 22, {
    color: COLORS.ink,
    font: `800 15px ${UI_FONT}`,
    maxWidth: card.width - 68,
  });
  drawText(ctx, region.city, card.x + 58, card.y + 42, {
    color: COLORS.muted,
    font: `12px ${UI_FONT}`,
    maxWidth: card.width - 68,
  });

  drawPill(
    ctx,
    rect(card.x + 14, card.y + card.height - 35, 64, 22),
    roleLabel(region.role),
    isHome ? COLORS.blue : COLORS.muted,
  );
  drawPill(
    ctx,
    rect(card.x + card.width - 76, card.y + card.height - 35, 60, 22),
    `v${region.version}`,
    isCurrent ? COLORS.green : COLORS.gold,
  );
}

function drawDirectory(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  snapshot: RoutingSnapshot,
) {
  drawRoundedRect(ctx, card, 10);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = snapshot.homeRegion === "VA" ? COLORS.blue : COLORS.line;
  ctx.stroke();

  drawText(ctx, "account directory", card.x + 14, card.y + 18, {
    color: COLORS.muted,
    font: `700 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, "account 42 -> home Virginia", card.x + 14, card.y + 40, {
    color: COLORS.ink,
    font: `800 14px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, snapshot.directoryStatus, card.x + 14, card.y + 59, {
    color: COLORS.blue,
    font: `700 11px ${MONO_FONT}`,
    maxWidth: card.width - 28,
  });
}

function drawPackets(
  ctx: CanvasRenderingContext2D,
  packets: readonly RoutingPacket[],
  layout: Record<NodeKey, NodeLayout>,
  showLabels: boolean,
) {
  for (const packet of packets) {
    const { from: start, to: end } = connectorSegment(
      layout[packet.from],
      layout[packet.to],
    );
    const point = pointBetween(start, end, packet.progress);
    const color = packetColor(packet.tone);

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (showLabels) {
      drawText(ctx, packet.label, point.x + 12, point.y - 5, {
        color,
        font: `800 11px ${UI_FONT}`,
        maxWidth: 132,
      });
    }
    ctx.restore();
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
    maxWidth: 120,
  });
  ctx.restore();
}

function drawMiniStatus(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  text: string,
) {
  drawRoundedRect(ctx, card, 8);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  drawText(ctx, text, card.x + 12, card.y + 22, {
    color: COLORS.ink,
    font: `800 12px ${UI_FONT}`,
    maxWidth: card.width - 24,
  });
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
  ctx.fillStyle =
    color === COLORS.muted ? "rgb(255 255 255 / 82%)" : `${color}18`;
  ctx.fill();
  ctx.strokeStyle = color === COLORS.muted ? COLORS.line : `${color}66`;
  ctx.lineWidth = 1;
  ctx.stroke();
  drawText(ctx, label, box.x + box.width / 2, box.y + 14, {
    align: "center",
    color,
    font: `800 10px ${UI_FONT}`,
    maxWidth: box.width - 10,
  });
}

function packetColor(tone: RoutingPacket["tone"]) {
  switch (tone) {
    case "request":
      return COLORS.blue;
    case "lookup":
      return COLORS.gold;
    case "write":
      return COLORS.blue;
    case "replication":
      return COLORS.green;
  }
}

function roleLabel(role: RegionSnapshot["role"]) {
  switch (role) {
    case "entry":
      return "entry";
    case "home":
      return "home";
    case "replica":
      return "replica";
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
