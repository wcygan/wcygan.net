import {
  clamp,
  type DurableTaskLoopSnapshot,
  type HistoryRow,
  type PacketSnapshot,
  type QueueSnapshot,
  type ServiceSnapshot,
  type SlotSnapshot,
  type WorkerSnapshot,
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

type Lane = { from: Point; to: Point };

type Ports = {
  serviceToQueue: Lane;
  queueToWorker: Lane;
  workerToService: Lane;
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
const TAU = Math.PI * 2;

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
  const historyWidth = clampDimension(width * 0.31, 236, 300);
  const triangleWidth = width - padding * 2 - historyWidth - gap;
  const nodeWidth = clampDimension(triangleWidth * 0.46, 188, 232);
  const serviceHeight = 88;
  const ioHeight = clampDimension(height * 0.4, 150, 180);

  const serviceBox = rect(
    padding + (triangleWidth - nodeWidth) / 2,
    22,
    nodeWidth,
    serviceHeight,
  );
  const ioTop = height - 22 - ioHeight;
  const queueBox = rect(padding, ioTop, nodeWidth, ioHeight);
  const workerBox = rect(
    padding + triangleWidth - nodeWidth,
    ioTop,
    nodeWidth,
    ioHeight,
  );
  const history = rect(
    padding + triangleWidth + gap,
    18,
    historyWidth,
    height - 36,
  );

  const ports: Ports = {
    serviceToQueue: { from: bottomLeftPort(serviceBox), to: topPort(queueBox) },
    queueToWorker: { from: rightPort(queueBox), to: leftPort(workerBox) },
    workerToService: {
      from: topPort(workerBox),
      to: bottomRightPort(serviceBox),
    },
  };

  drawArrowLane(ctx, ports.serviceToQueue, "enqueues");
  drawArrowLane(ctx, ports.queueToWorker, "polls");
  drawArrowLane(ctx, ports.workerToService, "reports");

  drawServiceCard(ctx, serviceBox, snapshot.service, false);
  drawQueueCard(ctx, queueBox, snapshot.queue, false);
  drawWorkerCard(ctx, workerBox, snapshot.worker, snapshot.progress, false);
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
  const serviceHeight = 92;
  const ioHeight = 168;

  const serviceBox = rect(padding, padding, width - padding * 2, serviceHeight);
  const ioTop = padding + serviceHeight + 16;
  const queueBox = rect(padding, ioTop, nodeWidth, ioHeight);
  const workerBox = rect(padding + nodeWidth + gap, ioTop, nodeWidth, ioHeight);

  const historyY = ioTop + ioHeight + 16;
  const history = rect(
    padding,
    historyY,
    width - padding * 2,
    height - historyY - padding,
  );

  const ports: Ports = {
    serviceToQueue: {
      from: bottomPortAt(serviceBox, 0.28),
      to: topPort(queueBox),
    },
    queueToWorker: { from: rightPort(queueBox), to: leftPort(workerBox) },
    workerToService: {
      from: topPort(workerBox),
      to: bottomPortAt(serviceBox, 0.72),
    },
  };

  // The card gaps are too tight for lane labels on narrow screens; the moving
  // packets and arrowheads carry the direction instead.
  drawArrowLane(ctx, ports.serviceToQueue, "");
  drawArrowLane(ctx, ports.queueToWorker, "");
  drawArrowLane(ctx, ports.workerToService, "");

  drawServiceCard(ctx, serviceBox, snapshot.service, true);
  drawQueueCard(ctx, queueBox, snapshot.queue, true);
  drawWorkerCard(ctx, workerBox, snapshot.worker, snapshot.progress, true);
  drawHistoryPanel(ctx, history, snapshot, true);
  drawPackets(ctx, snapshot.packets, ports, true);
}

function drawServiceCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  service: ServiceSnapshot,
  compact: boolean,
) {
  const palette = servicePalette(service);
  drawShadow(ctx, card, 10);
  drawRoundedRect(
    ctx,
    card,
    9,
    COLORS.panel,
    palette.stroke,
    service.active ? 1.8 : 1.2,
  );

  drawText(ctx, "Temporal Service", card.x + 14, card.y + 26, {
    color: COLORS.ink,
    font: `800 ${compact ? 15 : 16}px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, "stores history, schedules tasks", card.x + 14, card.y + 46, {
    color: COLORS.muted,
    font: `600 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });

  drawBadge(ctx, card.x + 14, card.y + card.height - 30, service.statusLabel, {
    fill: palette.fill,
    stroke: palette.stroke,
    color: palette.stroke,
    maxWidth: card.width - 28,
  });
}

function drawQueueCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  queue: QueueSnapshot,
  compact: boolean,
) {
  const active = queue.level > 0;
  drawShadow(ctx, card, 10);
  drawRoundedRect(
    ctx,
    card,
    9,
    COLORS.panel,
    active ? COLORS.blue : COLORS.line,
    active ? 1.8 : 1.2,
  );

  drawText(ctx, "Task Queue", card.x + 14, card.y + 26, {
    color: COLORS.ink,
    font: `800 ${compact ? 15 : 16}px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, "holds pending activity tasks", card.x + 14, card.y + 46, {
    color: COLORS.muted,
    font: `600 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });

  drawQueueBuffer(ctx, card, queue, compact);

  drawText(ctx, queue.label, card.x + 14, card.y + card.height - 12, {
    color: active ? COLORS.blue : COLORS.muted,
    font: `800 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
}

// The "work queue buffer": an outer rectangle holding four slots that fill
// left to right with pending tasks and empty as the Worker takes them.
function drawQueueBuffer(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  queue: QueueSnapshot,
  compact: boolean,
) {
  const top = card.y + 56;
  const bottom = card.y + card.height - 30;
  const buffer = rect(card.x + 14, top, card.width - 28, bottom - top);
  drawRoundedRect(ctx, buffer, 8, COLORS.shell, COLORS.line, 1);

  const inset = 8;
  const slotGap = compact ? 6 : 7;
  const count = queue.capacity;
  const slotWidth = (buffer.width - inset * 2 - slotGap * (count - 1)) / count;
  const slotHeight = buffer.height - inset * 2;

  for (let index = 0; index < count; index += 1) {
    const slot = rect(
      buffer.x + inset + index * (slotWidth + slotGap),
      buffer.y + inset,
      slotWidth,
      slotHeight,
    );
    drawQueueSlot(ctx, slot, queue.slots[index]);
  }
}

function drawQueueSlot(
  ctx: CanvasRenderingContext2D,
  slot: Rect,
  state: SlotSnapshot,
) {
  if (!state.filled) {
    drawDashedRect(ctx, slot, 5);
    return;
  }

  if (state.flash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.16 + state.flash * 0.3;
    roundedPath(ctx, expand(slot, 2 + state.flash * 3), 6);
    ctx.fillStyle = COLORS.blue;
    ctx.fill();
    ctx.restore();
  }

  drawRoundedRect(ctx, slot, 5, COLORS.blueSoft, COLORS.blue, 1.4);

  // A solid token inside the slot reads as a unit of buffered work.
  const token = expand(slot, -Math.min(slot.width, slot.height) * 0.28);
  drawRoundedRect(ctx, token, 3, COLORS.blue, COLORS.blue, 1);
}

function drawWorkerCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  worker: WorkerSnapshot,
  progress: number,
  compact: boolean,
) {
  const palette = workerPalette(worker);
  const executing = worker.phase === "executing";

  if (executing) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    roundedPath(ctx, expand(card, 4), 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.restore();
  }

  drawShadow(ctx, card, 10);
  drawRoundedRect(
    ctx,
    card,
    9,
    COLORS.panel,
    palette.stroke,
    worker.phase === "polling" ? 1.2 : 1.8,
  );

  drawText(ctx, "Worker", card.x + 14, card.y + 26, {
    color: COLORS.ink,
    font: `800 ${compact ? 15 : 16}px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, "polls queue, runs activities", card.x + 14, card.y + 46, {
    color: COLORS.muted,
    font: `600 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });

  const ringRadius = compact ? 28 : 30;
  const ringCenter = {
    x: card.x + card.width / 2,
    y: card.y + 52 + (card.height - 52 - 22) / 2,
  };
  drawWorkerRing(ctx, ringCenter, ringRadius, worker, progress, palette);

  drawText(ctx, worker.statusLabel, ringCenter.x, card.y + card.height - 12, {
    align: "center",
    color: palette.stroke,
    font: `800 11px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });
}

// Circular completion meter mirroring the gold-standard activity ring: a track,
// a gold arc that fills while the Worker executes, a green check on success, a
// red cross on failure, and an orbiting dot while it polls for the next task.
function drawWorkerRing(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  worker: WorkerSnapshot,
  progress: number,
  palette: { stroke: string; fill: string },
) {
  const { x: cx, y: cy } = center;
  const thickness = 5;

  ctx.save();
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.strokeStyle = COLORS.line;
  ctx.stroke();
  ctx.restore();

  if (worker.phase === "polling" || worker.phase === "taking") {
    // A dot orbits the track to show the Worker actively polling the queue.
    const angle = -Math.PI / 2 + progress * TAU * 3;
    const dot = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
    ctx.beginPath();
    ctx.fillStyle = COLORS.gold;
    ctx.arc(dot.x, dot.y, thickness / 1.6, 0, TAU);
    ctx.fill();
    return;
  }

  if (worker.outcome === "failure") {
    ctx.save();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = COLORS.red;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
    drawCross(ctx, cx, cy, radius * 0.42, COLORS.red);
    return;
  }

  const start = -Math.PI / 2;
  const sweep = TAU * clamp(worker.ringProgress, 0, 1);
  if (sweep > 0) {
    ctx.save();
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.strokeStyle = palette.stroke;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + sweep);
    ctx.stroke();
    ctx.restore();
  }

  if (worker.outcome === "success") {
    drawCheck(ctx, cx, cy, radius * 0.5, COLORS.green);
    return;
  }

  const percent = `${Math.round(clamp(worker.ringProgress, 0, 1) * 100)}%`;
  drawText(ctx, percent, cx, cy + 4, {
    align: "center",
    color: COLORS.gold,
    font: `800 12px ${UI_FONT}`,
  });
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
  const rowGap = 7;
  const rowHeight = compact ? 30 : 34;
  const capacity = Math.max(
    1,
    Math.floor((listBottom - listTop + rowGap) / (rowHeight + rowGap)),
  );

  // The log keeps growing; show the most recent rows so the panel reads as a
  // window scrolling forward in time rather than a fixed list.
  const rows = snapshot.history.slice(-capacity);
  rows.forEach((row, index) => {
    const box = rect(
      panel.x + 14,
      listTop + index * (rowHeight + rowGap),
      panel.width - 28,
      rowHeight,
    );
    drawHistoryRow(ctx, box, row, snapshot.historyFlash, compact);
  });
}

function drawHistoryRow(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  row: HistoryRow,
  flash: number,
  compact: boolean,
) {
  const accent = historyAccent(row.tone);
  const flashAlpha = row.newest ? flash * 0.18 : 0;
  const fill = historyFill(row, flashAlpha);
  const stroke =
    row.tone === "neutral" ? (row.newest ? COLORS.blue : COLORS.line) : accent;
  drawRoundedRect(ctx, box, 7, fill, stroke, row.newest ? 1.6 : 1);

  const midY = box.y + box.height / 2 + 4;
  drawText(ctx, String(row.id), box.x + 11, midY, {
    color: accent,
    font: `800 12px ${MONO_FONT}`,
  });
  drawText(ctx, row.type, box.x + 32, midY, {
    color: COLORS.ink,
    font: `700 ${compact ? 10 : 11}px ${MONO_FONT}`,
    maxWidth: box.width - 44 - (row.tone === "neutral" ? 0 : 14),
  });

  if (row.tone !== "neutral") {
    const dotX = box.x + box.width - 13;
    ctx.beginPath();
    ctx.fillStyle = accent;
    ctx.arc(dotX, box.y + box.height / 2, 4, 0, TAU);
    ctx.fill();
  }
}

function historyAccent(tone: HistoryRow["tone"]) {
  if (tone === "success") return COLORS.green;
  if (tone === "failure") return COLORS.red;
  return COLORS.muted;
}

function historyFill(row: HistoryRow, flashAlpha: number): string {
  if (row.tone === "success") {
    return `rgb(29 139 101 / ${0.08 + flashAlpha})`;
  }
  if (row.tone === "failure") {
    return `rgb(190 64 58 / ${0.08 + flashAlpha})`;
  }
  if (row.newest) {
    return `rgb(30 70 140 / ${0.05 + flashAlpha})`;
  }
  return "#f8fafc";
}

function drawPackets(
  ctx: CanvasRenderingContext2D,
  packets: readonly PacketSnapshot[],
  ports: Ports,
  compact: boolean,
) {
  for (const packet of packets) {
    const lane = packetLane(packet, ports);
    const point = interpolate(lane.from, lane.to, packet.progress);
    drawPacket(ctx, packet, point, compact);
  }
}

function packetLane(packet: PacketSnapshot, ports: Ports): Lane {
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
  const palette = packetPalette(packet);
  const label = compact ? compactPacketLabel(packet) : packet.label;
  const useMono = packet.kind === "result" && packet.tone !== "error";
  const font = `800 ${compact ? 9 : 10}px ${useMono ? MONO_FONT : UI_FONT}`;

  ctx.font = font;
  const width = Math.min(compact ? 92 : 132, ctx.measureText(label).width + 22);
  const height = compact ? 22 : 26;

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
    font,
    maxWidth: width - 14,
  });
  ctx.restore();
}

function drawArrowLane(
  ctx: CanvasRenderingContext2D,
  lane: Lane,
  label: string,
) {
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(lane.from.x, lane.from.y);
  ctx.lineTo(lane.to.x, lane.to.y);
  ctx.stroke();
  ctx.setLineDash([]);

  drawArrowHead(ctx, lane.from, lane.to);

  if (!label) return;

  const mid = interpolate(lane.from, lane.to, 0.5);
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

function servicePalette(service: ServiceSnapshot) {
  if (service.status === "storing") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (service.status === "scheduling") {
    return { fill: COLORS.blueSoft, stroke: COLORS.blue };
  }
  return { fill: "#f1f4fa", stroke: COLORS.line };
}

function workerPalette(worker: WorkerSnapshot) {
  if (worker.outcome === "success") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (worker.outcome === "failure") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (worker.phase === "executing") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  if (worker.phase === "taking") {
    return { fill: COLORS.blueSoft, stroke: COLORS.blue };
  }
  return { fill: "#f1f4fa", stroke: COLORS.muted };
}

function packetPalette(packet: PacketSnapshot) {
  if (packet.kind === "result") {
    return packet.tone === "error"
      ? { fill: COLORS.redSoft, stroke: COLORS.red }
      : { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (packet.kind === "poll") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  return { fill: COLORS.blueSoft, stroke: COLORS.blue };
}

function compactPacketLabel(packet: PacketSnapshot) {
  if (packet.kind === "enqueue") return "task";
  if (packet.kind === "poll") return "take";
  return packet.tone === "error" ? "fail" : "ok";
}

function drawCross(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size);
  ctx.lineTo(cx + size, cy + size);
  ctx.moveTo(cx + size, cy - size);
  ctx.lineTo(cx - size, cy + size);
  ctx.stroke();
  ctx.restore();
}

function drawCheck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.55, cy + size * 0.05);
  ctx.lineTo(cx - size * 0.1, cy + size * 0.5);
  ctx.lineTo(cx + size * 0.62, cy - size * 0.45);
  ctx.stroke();
  ctx.restore();
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

function expand(box: Rect, amount: number): Rect {
  return {
    x: box.x - amount,
    y: box.y - amount,
    width: box.width + amount * 2,
    height: box.height + amount * 2,
  };
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
