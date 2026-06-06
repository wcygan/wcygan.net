import {
  clamp,
  type PacketSnapshot,
  type RaceSnapshot,
  type WorkerKey,
  type WorkerSnapshot,
} from "./model";
import type { CanvasViewport } from "../shared/viewport";

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
  blue: "#2f69f0",
  blueSoft: "rgb(47 105 240 / 10%)",
  green: "#1d8b65",
  greenSoft: "rgb(29 139 101 / 11%)",
  gold: "#d59b24",
  goldSoft: "rgb(213 155 36 / 14%)",
  red: "#d24a44",
  redSoft: "rgb(210 74 68 / 10%)",
  shadow: "rgb(23 32 51 / 9%)",
};

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const COMPACT_LAYOUT_MAX_WIDTH = 620;

export function drawOptimisticLockingRaceDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: RaceSnapshot,
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
  snapshot: RaceSnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const gap = clampDimension(width * 0.035, 20, 32);
  const clientWidth = clampDimension(width * 0.23, 158, 190);
  const databaseWidth = clampDimension(width * 0.42, 292, 350);
  const laneWidth = width - padding * 2 - clientWidth - databaseWidth - gap * 2;
  const workerACard = rect(padding, 46, clientWidth, 116);
  const workerBCard = rect(padding, height - 46 - 116, clientWidth, 116);
  const database = rect(
    padding + clientWidth + gap + laneWidth + gap,
    30,
    databaseWidth,
    height - 60,
  );
  const ports = widePorts(workerACard, workerBCard, database);

  drawLane(ctx, rightPort(workerACard), ports.workerA.db);
  drawLane(ctx, rightPort(workerBCard), ports.workerB.db);
  drawWorkerCard(ctx, workerACard, snapshot.workers.workerA);
  drawWorkerCard(ctx, workerBCard, snapshot.workers.workerB);
  drawLaneLabels(ctx, ports.workerA, ports.workerB);
  drawDatabasePanel(ctx, database, snapshot, false);
  drawPackets(ctx, snapshot.packets, ports, false);
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: RaceSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const gap = 10;
  const cardWidth = (width - padding * 2 - gap) / 2;
  const cardHeight = width < 360 ? 116 : 124;
  const workerACard = rect(padding, padding, cardWidth, cardHeight);
  const workerBCard = rect(
    padding + cardWidth + gap,
    padding,
    cardWidth,
    cardHeight,
  );
  const databaseY = Math.max(cardHeight + padding + 108, height * 0.39);
  const database = rect(
    padding,
    databaseY,
    width - padding * 2,
    height - databaseY - padding,
  );
  const ports = compactPorts(workerACard, workerBCard, database);

  drawWorkerCard(ctx, workerACard, snapshot.workers.workerA);
  drawWorkerCard(ctx, workerBCard, snapshot.workers.workerB);
  drawLane(ctx, bottomPort(workerACard), ports.workerA.db);
  drawLane(ctx, bottomPort(workerBCard), ports.workerB.db);
  drawCompactLaneLabel(
    ctx,
    width,
    workerACard.y + workerACard.height,
    database.y,
  );
  drawDatabasePanel(ctx, database, snapshot, true);
  drawPackets(ctx, snapshot.packets, ports, true);
}

function drawWorkerCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  worker: WorkerSnapshot,
) {
  const palette = workerPalette(worker);
  drawShadow(ctx, card, 10);
  drawRoundedRect(ctx, card, 8, COLORS.panel, palette.stroke, 1.5);

  ctx.fillStyle = palette.fill;
  roundedPath(ctx, rect(card.x + 10, card.y + 12, 28, 28), 14);
  ctx.fill();

  drawText(
    ctx,
    worker.key === "workerA" ? "A" : "B",
    card.x + 24,
    card.y + 31,
    {
      align: "center",
      color: palette.stroke,
      font: `800 14px ${UI_FONT}`,
    },
  );

  drawText(ctx, worker.label, card.x + 46, card.y + 23, {
    color: COLORS.ink,
    font: `800 15px ${UI_FONT}`,
    maxWidth: card.width - 58,
  });
  drawText(ctx, worker.statusLabel, card.x + 46, card.y + 42, {
    color: COLORS.muted,
    font: `600 11px ${UI_FONT}`,
    maxWidth: card.width - 58,
  });

  const sqlY = card.y + 68;
  drawText(ctx, worker.mutationLabel, card.x + 12, sqlY, {
    color: COLORS.ink,
    font: `700 12px ${MONO_FONT}`,
    maxWidth: card.width - 24,
  });
  if (!worker.resultLabel) {
    drawBadge(
      ctx,
      card.x + 12,
      sqlY + 11,
      `expects v${worker.expectedVersion}`,
      {
        fill: COLORS.blueSoft,
        stroke: COLORS.blue,
        color: COLORS.blue,
      },
    );
  }

  if (worker.resultLabel) {
    drawBadge(ctx, card.x + 12, card.y + card.height - 28, worker.resultLabel, {
      fill: worker.status === "conflict" ? COLORS.redSoft : COLORS.greenSoft,
      stroke: worker.status === "conflict" ? COLORS.red : COLORS.green,
      color: worker.status === "conflict" ? COLORS.red : COLORS.green,
      maxWidth: card.width - 24,
    });
  }
}

function drawDatabasePanel(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  snapshot: RaceSnapshot,
  compact: boolean,
) {
  const layout = databasePanelLayout(panel, compact);

  drawShadow(ctx, panel, 12);
  drawRoundedRect(ctx, panel, 10, COLORS.panel, COLORS.line, 1);

  drawText(ctx, "Inventory DB", panel.x + 16, panel.y + 26, {
    color: COLORS.ink,
    font: `800 ${compact ? 16 : 18}px ${UI_FONT}`,
    maxWidth: panel.width - 32,
  });
  drawText(ctx, "live inventory_items row", panel.x + 16, panel.y + 46, {
    color: COLORS.muted,
    font: `700 12px ${UI_FONT}`,
    maxWidth: panel.width - 32,
  });

  drawLiveTable(ctx, layout.table, snapshot, compact);

  if (snapshot.mismatch) {
    drawMismatch(ctx, layout.detail, snapshot, compact);
  } else {
    drawPredicateHint(ctx, layout.detail, snapshot, compact);
  }

  drawOutcomeStrip(ctx, layout.outcome, snapshot, compact);
}

function drawLiveTable(
  ctx: CanvasRenderingContext2D,
  table: Rect,
  snapshot: RaceSnapshot,
  compact: boolean,
) {
  drawRoundedRect(ctx, table, 8, "#f8fafc", COLORS.line, 1);
  const headerHeight = 34;
  const rowHeight = table.height - headerHeight;
  const row = snapshot.row;
  const flashFill = `rgb(29 139 101 / ${0.09 + snapshot.tableFlash * 0.2})`;
  const columns = compact ? [0.32, 0.22, 0.25, 0.21] : [0.34, 0.2, 0.25, 0.21];
  const labels = ["sku", "available", "version", "writer"];
  const values = [
    row.sku,
    String(row.available),
    String(row.version),
    row.lastWriter,
  ];

  ctx.fillStyle = "#edf1f8";
  roundedTopPath(ctx, rect(table.x, table.y, table.width, headerHeight), 8);
  ctx.fill();

  let x = table.x;
  for (let index = 0; index < columns.length; index += 1) {
    const columnWidth = table.width * columns[index];
    drawText(ctx, labels[index], x + 10, table.y + 22, {
      color: COLORS.muted,
      font: `800 ${compact ? 10 : 11}px ${UI_FONT}`,
      maxWidth: columnWidth - 16,
    });

    if (index > 0 && snapshot.row.version !== 7) {
      ctx.fillStyle = flashFill;
      ctx.fillRect(x, table.y + headerHeight, columnWidth, rowHeight);
    }

    drawText(ctx, values[index], x + 10, table.y + headerHeight + 39, {
      color: index === 0 ? COLORS.muted : COLORS.ink,
      font: `${index === 0 ? 700 : 800} ${compact ? 13 : 15}px ${
        index === 0 || index === 1 || index === 2 ? MONO_FONT : UI_FONT
      }`,
      maxWidth: columnWidth - 16,
    });

    if (index < columns.length - 1) {
      ctx.strokeStyle = COLORS.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + columnWidth, table.y);
      ctx.lineTo(x + columnWidth, table.y + table.height);
      ctx.stroke();
    }

    x += columnWidth;
  }

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(table.x, table.y + headerHeight);
  ctx.lineTo(table.x + table.width, table.y + headerHeight);
  ctx.stroke();
}

function drawMismatch(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: RaceSnapshot,
  compact: boolean,
) {
  const mismatch = snapshot.mismatch;
  if (!mismatch) return;

  const alpha = clamp(0.08 + mismatch.intensity * 0.16, 0.08, 0.24);
  drawRoundedRect(ctx, box, 8, `rgb(210 74 68 / ${alpha})`, COLORS.red, 1.4);
  drawText(ctx, "version mismatch", box.x + 12, box.y + 20, {
    color: COLORS.red,
    font: `800 ${compact ? 12 : 13}px ${UI_FONT}`,
    maxWidth: box.width - 24,
  });
  drawText(
    ctx,
    `expected ${mismatch.expected}  /  current ${mismatch.current}`,
    box.x + 12,
    box.y + (compact ? 41 : 42),
    {
      color: COLORS.ink,
      font: `800 ${compact ? 12 : 14}px ${MONO_FONT}`,
      maxWidth: box.width - 24,
    },
  );
  drawText(
    ctx,
    "Worker B's stale UPDATE touches zero rows.",
    box.x + 12,
    box.y + box.height - 12,
    {
      color: COLORS.muted,
      font: `600 ${compact ? 10 : 12}px ${UI_FONT}`,
      maxWidth: box.width - 24,
    },
  );
}

function drawPredicateHint(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: RaceSnapshot,
  compact: boolean,
) {
  const expectedVersion =
    snapshot.phase === "worker-b-reread" || snapshot.phase === "worker-b-retry"
      ? 8
      : 7;
  drawRoundedRect(ctx, box, 8, "#f8fafc", COLORS.line, 1);
  drawText(ctx, "guard predicate", box.x + 12, box.y + 20, {
    color: COLORS.muted,
    font: `800 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: box.width - 24,
  });
  drawText(ctx, "WHERE sku = 'SKU-42'", box.x + 12, box.y + 44, {
    color: COLORS.ink,
    font: `800 ${compact ? 10 : 12}px ${MONO_FONT}`,
    maxWidth: box.width - 24,
  });
  drawText(
    ctx,
    `AND available > 0 AND version = ${expectedVersion}`,
    box.x + 12,
    box.y + (compact ? 62 : 63),
    {
      color: COLORS.ink,
      font: `800 ${compact ? 10 : 12}px ${MONO_FONT}`,
      maxWidth: box.width - 24,
    },
  );
}

function drawOutcomeStrip(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: RaceSnapshot,
  compact: boolean,
) {
  const gap = compact ? 8 : 10;
  const itemWidth = (box.width - gap) / 2;
  const workerABox = rect(box.x, box.y, itemWidth, box.height);
  const workerBBox = rect(
    box.x + itemWidth + gap,
    box.y,
    itemWidth,
    box.height,
  );
  const workerACommitted = snapshot.workers.workerA.status === "committed";
  const workerBStatus = snapshot.workers.workerB.status;
  const workerBConflicted = workerBStatus === "conflict";
  const workerBCommitted = workerBStatus === "committed";
  const workerBValue = workerBCommitted
    ? "retry committed"
    : workerBConflicted
      ? "reread latest row"
      : workerBStatus === "rereading" || workerBStatus === "retrying"
        ? "expects v8"
        : "expects v7";
  const workerBColor = workerBCommitted
    ? COLORS.green
    : workerBConflicted
      ? COLORS.red
      : COLORS.gold;
  const workerBFill = workerBCommitted
    ? COLORS.greenSoft
    : workerBConflicted
      ? COLORS.redSoft
      : COLORS.goldSoft;

  drawOutcome(
    ctx,
    workerABox,
    "Worker A",
    workerACommitted ? "decremented" : "expects v7",
    workerACommitted ? COLORS.green : COLORS.blue,
    workerACommitted ? COLORS.greenSoft : COLORS.blueSoft,
    compact,
  );
  drawOutcome(
    ctx,
    workerBBox,
    "Worker B",
    workerBValue,
    workerBColor,
    workerBFill,
    compact,
  );
}

function drawOutcome(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  label: string,
  value: string,
  color: string,
  fill: string,
  compact: boolean,
) {
  drawRoundedRect(ctx, box, 8, fill, color, 1);
  drawText(ctx, label, box.x + 10, box.y + 20, {
    color,
    font: `800 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: box.width - 20,
  });
  drawText(ctx, value, box.x + 10, box.y + (compact ? 39 : 42), {
    color: COLORS.ink,
    font: `700 ${compact ? 10 : 12}px ${UI_FONT}`,
    maxWidth: box.width - 20,
  });
}

function drawPackets(
  ctx: CanvasRenderingContext2D,
  packets: readonly PacketSnapshot[],
  ports: Record<WorkerKey, { client: Point; db: Point }>,
  compact: boolean,
) {
  for (const packet of packets) {
    const port = ports[packet.writer];
    const start = packet.direction === "to-db" ? port.client : port.db;
    const end = packet.direction === "to-db" ? port.db : port.client;
    const point = interpolate(start, end, packet.progress);
    drawPacket(ctx, packet, point, compact);
  }
}

function drawPacket(
  ctx: CanvasRenderingContext2D,
  packet: PacketSnapshot,
  point: Point,
  compact: boolean,
) {
  const label = compact ? compactPacketLabel(packet) : packet.label;
  const width = compact ? 82 : packet.kind === "write" ? 126 : 96;
  const height = compact ? 24 : 26;
  const palette = packetTone(packet);

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
  drawText(ctx, label, 0, -height / 2 + (compact ? 16 : 17), {
    align: "center",
    color: palette.stroke,
    font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
    maxWidth: width - 14,
  });
  ctx.restore();
}

function drawLane(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLaneLabels(
  ctx: CanvasRenderingContext2D,
  workerA: { client: Point; db: Point },
  workerB: { client: Point; db: Point },
) {
  const centerX = (workerA.client.x + workerA.db.x) / 2;
  drawText(ctx, "request lane", centerX, workerA.client.y - 26, {
    align: "center",
    color: COLORS.muted,
    font: `800 11px ${UI_FONT}`,
  });
  drawText(
    ctx,
    "same SKU, stale version rejected",
    centerX,
    workerB.client.y + 36,
    {
      align: "center",
      color: COLORS.muted,
      font: `700 11px ${UI_FONT}`,
    },
  );
}

function drawCompactLaneLabel(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  bottom: number,
) {
  drawText(
    ctx,
    "stale write fails, retry uses the fresh version",
    width / 2,
    (top + bottom) / 2 + 4,
    {
      align: "center",
      color: COLORS.muted,
      font: `800 11px ${UI_FONT}`,
      maxWidth: width - 32,
    },
  );
}

function widePorts(workerACard: Rect, workerBCard: Rect, database: Rect) {
  return {
    workerA: {
      client: rightPort(workerACard),
      db: { x: database.x, y: database.y + database.height * 0.34 },
    },
    workerB: {
      client: rightPort(workerBCard),
      db: { x: database.x, y: database.y + database.height * 0.64 },
    },
  };
}

function compactPorts(workerACard: Rect, workerBCard: Rect, database: Rect) {
  return {
    workerA: {
      client: bottomPort(workerACard),
      db: { x: database.x + database.width * 0.36, y: database.y },
    },
    workerB: {
      client: bottomPort(workerBCard),
      db: { x: database.x + database.width * 0.64, y: database.y },
    },
  };
}

function workerPalette(worker: WorkerSnapshot) {
  if (worker.status === "committed") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }

  if (worker.status === "conflict" || worker.status === "conflicting") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }

  if (worker.status === "waiting" || worker.status === "rereading") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }

  return {
    fill: worker.key === "workerA" ? COLORS.blueSoft : COLORS.goldSoft,
    stroke: worker.key === "workerA" ? COLORS.blue : COLORS.gold,
  };
}

function packetTone(packet: PacketSnapshot) {
  if (packet.tone === "success") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }

  if (packet.tone === "conflict") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }

  return {
    fill: packet.writer === "workerA" ? COLORS.blueSoft : COLORS.goldSoft,
    stroke: packet.writer === "workerA" ? COLORS.blue : COLORS.gold,
  };
}

function compactPacketLabel(packet: PacketSnapshot) {
  if (packet.kind === "select") return "SELECT";
  if (packet.label === "2 left, v7") return "2 left";
  if (packet.label === "1 left, v8") return "1 left";
  if (packet.label.includes("expect v8")) return "-1, v8";
  if (packet.label.includes("expect v7")) return "-1, v7";
  return packet.label;
}

function databasePanelLayout(panel: Rect, compact: boolean) {
  const inset = 14;
  const table = rect(
    panel.x + inset,
    panel.y + (compact ? 62 : 70),
    panel.width - inset * 2,
    compact ? 122 : 126,
  );
  const outcomeHeight = compact ? 56 : 58;
  const outcome = rect(
    panel.x + inset,
    panel.y + panel.height - outcomeHeight - inset,
    panel.width - inset * 2,
    outcomeHeight,
  );
  const detailGap = compact ? 10 : 10;
  const outcomeGap = compact ? 10 : 12;
  const detailY = table.y + table.height + detailGap;
  const availableDetailHeight = outcome.y - outcomeGap - detailY;
  const desiredDetailHeight = compact ? 78 : 76;
  const detailHeight = clampDimension(
    availableDetailHeight,
    compact ? 68 : 70,
    desiredDetailHeight,
  );

  return {
    table,
    detail: rect(table.x, detailY, table.width, detailHeight),
    outcome,
  };
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

function roundedTopPath(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  radius: number,
) {
  const r = Math.min(radius, box.width / 2, box.height / 2);
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + box.height);
  ctx.lineTo(box.x, box.y + r);
  ctx.quadraticCurveTo(box.x, box.y, box.x + r, box.y);
  ctx.lineTo(box.x + box.width - r, box.y);
  ctx.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + r);
  ctx.lineTo(box.x + box.width, box.y + box.height);
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

function rightPort(box: Rect): Point {
  return { x: box.x + box.width, y: box.y + box.height / 2 };
}

function bottomPort(box: Rect): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height };
}

function clampDimension(value: number, min: number, max: number) {
  return clamp(value, min, max);
}
