import {
  clamp,
  type DurableTaskLoopSnapshot,
  type HistoryRow,
  type NodeSnapshot,
  type PacketSnapshot,
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

const COLORS = {
  ink: "#172033",
  muted: "#5c667a",
  line: "#d9deea",
  shell: "#eef1f7",
  panel: "#ffffff",
  blue: "rgb(30, 70, 140)",
  blueSoft: "rgb(30 70 140 / 10%)",
  green: "rgb(29, 139, 101)",
  greenSoft: "rgb(29 139 101 / 11%)",
  gold: "rgb(213, 155, 36)",
  goldSoft: "rgb(213 155 36 / 14%)",
  red: "rgb(190, 64, 58)",
  redSoft: "rgb(190 64 58 / 10%)",
  shadow: "rgb(23 32 51 / 9%)",
};

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const COMPACT_LAYOUT_MAX_WIDTH = 620;

export function drawDurableTaskLoopDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: DurableTaskLoopSnapshot,
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
  snapshot: DurableTaskLoopSnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const gap = 20;
  const historyWidth = clampDimension(width * 0.3, 232, 290);
  const triangleWidth = width - padding * 2 - historyWidth - gap;
  const nodeWidth = clampDimension(triangleWidth * 0.42, 184, 224);
  const nodeHeight = 96;

  const triangleLeft = padding;
  const serviceBox = rect(
    triangleLeft + (triangleWidth - nodeWidth) / 2,
    36,
    nodeWidth,
    nodeHeight,
  );
  const queueBox = rect(
    triangleLeft,
    height - 36 - nodeHeight,
    nodeWidth,
    nodeHeight,
  );
  const workerBox = rect(
    triangleLeft + triangleWidth - nodeWidth,
    height - 36 - nodeHeight,
    nodeWidth,
    nodeHeight,
  );
  const history = rect(
    padding + triangleWidth + gap,
    30,
    historyWidth,
    height - 60,
  );

  const ports = {
    serviceToQueue: { from: bottomLeftPort(serviceBox), to: topPort(queueBox) },
    queueToWorker: { from: rightPort(queueBox), to: leftPort(workerBox) },
    workerToService: {
      from: topPort(workerBox),
      to: bottomRightPort(serviceBox),
    },
  };

  drawArrowLane(
    ctx,
    ports.serviceToQueue.from,
    ports.serviceToQueue.to,
    "places task",
  );
  drawArrowLane(
    ctx,
    ports.queueToWorker.from,
    ports.queueToWorker.to,
    "polls + takes",
  );
  drawArrowLane(
    ctx,
    ports.workerToService.from,
    ports.workerToService.to,
    "reports result",
  );

  drawNodeCard(ctx, serviceBox, snapshot.nodes.service, snapshot);
  drawQueueCard(ctx, queueBox, snapshot);
  drawNodeCard(ctx, workerBox, snapshot.nodes.worker, snapshot);

  drawHistoryPanel(ctx, history, snapshot, false);
  drawPackets(ctx, snapshot.packets, ports, false);
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: DurableTaskLoopSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const gap = 12;
  const nodeWidth = (width - padding * 2 - gap) / 2;
  const nodeHeight = width < 360 ? 90 : 96;

  const serviceBox = rect(padding, padding, width - padding * 2, nodeHeight);
  const queueBox = rect(
    padding,
    padding + nodeHeight + gap,
    nodeWidth,
    nodeHeight,
  );
  const workerBox = rect(
    padding + nodeWidth + gap,
    padding + nodeHeight + gap,
    nodeWidth,
    nodeHeight,
  );

  const historyY = padding + nodeHeight * 2 + gap * 2;
  const history = rect(
    padding,
    historyY,
    width - padding * 2,
    height - historyY - padding,
  );

  const ports = {
    serviceToQueue: {
      from: bottomPortAt(serviceBox, 0.28),
      to: topPort(queueBox),
    },
    queueToWorker: { from: rightPort(queueBox), to: leftPort(workerBox) },
    workerToService: {
      from: topPort(workerBox),
      to: bottomPortAt(serviceBox, 0.74),
    },
  };

  drawArrowLane(
    ctx,
    ports.serviceToQueue.from,
    ports.serviceToQueue.to,
    "places",
  );
  drawArrowLane(ctx, ports.queueToWorker.from, ports.queueToWorker.to, "polls");
  drawArrowLane(
    ctx,
    ports.workerToService.from,
    ports.workerToService.to,
    "reports",
  );

  drawNodeCard(ctx, serviceBox, snapshot.nodes.service, snapshot);
  drawQueueCard(ctx, queueBox, snapshot);
  drawNodeCard(ctx, workerBox, snapshot.nodes.worker, snapshot);

  drawHistoryPanel(ctx, history, snapshot, true);
  drawPackets(ctx, snapshot.packets, ports, true);
}

function drawNodeCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  node: NodeSnapshot,
  snapshot: DurableTaskLoopSnapshot,
) {
  const palette = nodePalette(node, snapshot);
  drawShadow(ctx, card, 10);
  drawRoundedRect(
    ctx,
    card,
    9,
    COLORS.panel,
    palette.stroke,
    node.active ? 1.8 : 1.2,
  );

  drawText(ctx, node.label, card.x + 14, card.y + 26, {
    color: COLORS.ink,
    font: `800 16px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, node.role, card.x + 14, card.y + 46, {
    color: COLORS.muted,
    font: `600 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });

  drawBadge(ctx, card.x + 14, card.y + card.height - 30, node.statusLabel, {
    fill: palette.fill,
    stroke: palette.stroke,
    color: palette.stroke,
    maxWidth: card.width - 28,
  });
}

function drawQueueCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  snapshot: DurableTaskLoopSnapshot,
) {
  const node = snapshot.nodes.queue;
  const palette = nodePalette(node, snapshot);
  drawShadow(ctx, card, 10);
  drawRoundedRect(
    ctx,
    card,
    9,
    COLORS.panel,
    palette.stroke,
    node.active ? 1.8 : 1.2,
  );

  drawText(ctx, node.label, card.x + 14, card.y + 26, {
    color: COLORS.ink,
    font: `800 16px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, node.role, card.x + 14, card.y + 46, {
    color: COLORS.muted,
    font: `600 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });

  const slot = rect(
    card.x + 14,
    card.y + card.height - 32,
    card.width - 28,
    22,
  );
  if (snapshot.queue.hasTask) {
    drawRoundedRect(ctx, slot, 6, COLORS.blueSoft, COLORS.blue, 1.2);
    drawText(ctx, snapshot.queue.label, slot.x + 9, slot.y + 15, {
      color: COLORS.blue,
      font: `800 11px ${MONO_FONT}`,
      maxWidth: slot.width - 18,
    });
  } else {
    drawDashedRect(ctx, slot, 6);
    drawText(ctx, snapshot.queue.label, slot.x + 9, slot.y + 15, {
      color: COLORS.muted,
      font: `700 11px ${UI_FONT}`,
      maxWidth: slot.width - 18,
    });
  }
}

function drawHistoryPanel(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  snapshot: DurableTaskLoopSnapshot,
  compact: boolean,
) {
  drawShadow(ctx, panel, 12);
  drawRoundedRect(ctx, panel, 10, COLORS.panel, COLORS.line, 1);

  drawText(ctx, "Event History", panel.x + 16, panel.y + 26, {
    color: COLORS.ink,
    font: `800 ${compact ? 16 : 18}px ${UI_FONT}`,
    maxWidth: panel.width - 32,
  });
  drawText(ctx, "durable append-only log", panel.x + 16, panel.y + 46, {
    color: COLORS.muted,
    font: `700 12px ${UI_FONT}`,
    maxWidth: panel.width - 32,
  });

  const listTop = panel.y + 60;
  const listBottom = panel.y + panel.height - 14;
  const rowGap = 8;
  const maxRows = 5;
  const rowHeight = Math.min(
    52,
    (listBottom - listTop - rowGap * (maxRows - 1)) / maxRows,
  );

  for (let index = 0; index < snapshot.history.length; index += 1) {
    const row = snapshot.history[index];
    const box = rect(
      panel.x + 14,
      listTop + index * (rowHeight + rowGap),
      panel.width - 28,
      rowHeight,
    );
    drawHistoryRow(ctx, box, row, snapshot.historyFlash, compact);
  }
}

function drawHistoryRow(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  row: HistoryRow,
  flash: number,
  compact: boolean,
) {
  const flashAlpha = row.newest ? 0.1 + flash * 0.22 : 0;
  const fill = row.newest ? `rgb(29 139 101 / ${flashAlpha})` : "#f8fafc";
  const stroke = row.newest ? COLORS.green : COLORS.line;
  drawRoundedRect(ctx, box, 7, fill, stroke, row.newest ? 1.5 : 1);

  drawText(ctx, String(row.id), box.x + 11, box.y + box.height / 2 + 4, {
    color: row.newest ? COLORS.green : COLORS.muted,
    font: `800 12px ${MONO_FONT}`,
  });
  drawText(ctx, row.type, box.x + 32, box.y + box.height / 2 + 4, {
    color: COLORS.ink,
    font: `700 ${compact ? 11 : 12}px ${MONO_FONT}`,
    maxWidth: box.width - 44 - (row.newest ? 14 : 0),
  });

  if (row.newest) {
    const dotX = box.x + box.width - 12;
    ctx.beginPath();
    ctx.fillStyle = COLORS.green;
    ctx.arc(dotX, box.y + box.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPackets(
  ctx: CanvasRenderingContext2D,
  packets: readonly PacketSnapshot[],
  ports: Record<string, { from: Point; to: Point }>,
  compact: boolean,
) {
  for (const packet of packets) {
    const lane = packetLane(packet, ports);
    const point = interpolate(lane.from, lane.to, packet.progress);
    drawPacket(ctx, packet, point, compact);
  }
}

function packetLane(
  packet: PacketSnapshot,
  ports: Record<string, { from: Point; to: Point }>,
) {
  if (packet.route === "service-to-queue") return ports.serviceToQueue;
  if (packet.route === "queue-to-worker") return ports.queueToWorker;
  return ports.workerToService;
}

function drawPacket(
  ctx: CanvasRenderingContext2D,
  packet: PacketSnapshot,
  point: Point,
  compact: boolean,
) {
  const label = compact ? compactPacketLabel(packet) : packet.label;
  ctx.font = `800 ${compact ? 9 : 10}px ${UI_FONT}`;
  const width = Math.min(compact ? 96 : 150, ctx.measureText(label).width + 22);
  const height = compact ? 22 : 26;
  const palette = packetPalette(packet);

  ctx.save();
  ctx.translate(point.x, point.y);
  drawShadow(ctx, rect(-width / 2, -height / 2, width, height), 6);
  drawRoundedRect(
    ctx,
    rect(-width / 2, -height / 2, width, height),
    999,
    palette.fill,
    palette.stroke,
    1.4,
  );
  drawText(ctx, label, 0, -height / 2 + (compact ? 15 : 17), {
    align: "center",
    color: palette.stroke,
    font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
    maxWidth: width - 14,
  });
  ctx.restore();
}

function drawArrowLane(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  label: string,
) {
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  drawArrowHead(ctx, start, end);

  const mid = interpolate(start, end, 0.5);
  drawText(ctx, label, mid.x, mid.y - 6, {
    align: "center",
    color: COLORS.muted,
    font: `700 10px ${UI_FONT}`,
  });
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = 7;
  ctx.fillStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - size * Math.cos(angle - Math.PI / 6),
    end.y - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    end.x - size * Math.cos(angle + Math.PI / 6),
    end.y - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function nodePalette(node: NodeSnapshot, snapshot: DurableTaskLoopSnapshot) {
  if (node.key === "service" && snapshot.phase === "append") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (node.key === "worker" && node.status === "running") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  if (node.active) {
    return { fill: COLORS.blueSoft, stroke: COLORS.blue };
  }
  return { fill: "#f1f4fa", stroke: COLORS.line };
}

function packetPalette(packet: PacketSnapshot) {
  if (packet.kind === "result") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (packet.kind === "poll") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  return { fill: COLORS.blueSoft, stroke: COLORS.blue };
}

function compactPacketLabel(packet: PacketSnapshot) {
  if (packet.kind === "task") return "task";
  if (packet.kind === "poll") return "take";
  return "result";
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  options: {
    fill: string;
    stroke: string;
    color: string;
    maxWidth?: number;
  },
) {
  ctx.font = `800 10px ${UI_FONT}`;
  const measured = ctx.measureText(label).width + 18;
  const width = Math.min(options.maxWidth ?? measured, measured);
  const badge = rect(x, y, width, 22);
  drawRoundedRect(ctx, badge, 999, options.fill, options.stroke, 1);
  drawText(ctx, label, x + 9, y + 15, {
    color: options.color,
    font: `800 10px ${UI_FONT}`,
    maxWidth: width - 18,
  });
}

function drawShadow(ctx: CanvasRenderingContext2D, box: Rect, blur: number) {
  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = 5;
  roundedPath(ctx, box, Math.min(10, box.height / 2));
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.restore();
}

function drawDashedRect(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  radius: number,
) {
  roundedPath(ctx, box, radius);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  radius: number,
  fill: string,
  stroke: string,
  lineWidth: number,
) {
  roundedPath(ctx, box, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function roundedPath(ctx: CanvasRenderingContext2D, box: Rect, radius: number) {
  const r = Math.min(radius, box.width / 2, box.height / 2);
  ctx.beginPath();
  ctx.moveTo(box.x + r, box.y);
  ctx.lineTo(box.x + box.width - r, box.y);
  ctx.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + r);
  ctx.lineTo(box.x + box.width, box.y + box.height - r);
  ctx.quadraticCurveTo(
    box.x + box.width,
    box.y + box.height,
    box.x + box.width - r,
    box.y + box.height,
  );
  ctx.lineTo(box.x + r, box.y + box.height);
  ctx.quadraticCurveTo(
    box.x,
    box.y + box.height,
    box.x,
    box.y + box.height - r,
  );
  ctx.lineTo(box.x, box.y + r);
  ctx.quadraticCurveTo(box.x, box.y, box.x + r, box.y);
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
  ctx.fillStyle = options.color;
  ctx.font = options.font;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "alphabetic";
  if (options.maxWidth === undefined) {
    ctx.fillText(text, x, y);
  } else {
    ctx.fillText(text, x, y, Math.max(4, options.maxWidth));
  }
  ctx.textAlign = "left";
}

function interpolate(start: Point, end: Point, progress: number): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

function leftPort(box: Rect): Point {
  return { x: box.x, y: box.y + box.height / 2 };
}

function rightPort(box: Rect): Point {
  return { x: box.x + box.width, y: box.y + box.height / 2 };
}

function topPort(box: Rect): Point {
  return { x: box.x + box.width / 2, y: box.y };
}

function bottomLeftPort(box: Rect): Point {
  return { x: box.x + box.width * 0.32, y: box.y + box.height };
}

function bottomRightPort(box: Rect): Point {
  return { x: box.x + box.width * 0.68, y: box.y + box.height };
}

function bottomPortAt(box: Rect, fraction: number): Point {
  return { x: box.x + box.width * fraction, y: box.y + box.height };
}

function clampDimension(value: number, min: number, max: number) {
  return clamp(value, min, max);
}
