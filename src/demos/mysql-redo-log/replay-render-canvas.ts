import type {
  MemoryRecord,
  Operation,
  RecordKey,
  ReplayLogRecord,
  ReplaySnapshot,
} from "./replay-model";
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
  greenSoft: "rgb(29 139 101 / 10%)",
  gold: "#d59b24",
  goldSoft: "rgb(213 155 36 / 14%)",
  red: "#d24a44",
  redSoft: "rgb(210 74 68 / 9%)",
  graySoft: "rgb(92 102 122 / 8%)",
};

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const COMPACT_LAYOUT_MAX_WIDTH = 620;

export function drawMySqlRedoReplayDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: ReplaySnapshot,
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
  snapshot: ReplaySnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const gap = 22;
  const logPanel = rect(padding, padding, width - padding * 2, 182);
  const databasePanel = rect(
    padding,
    logPanel.y + logPanel.height + gap,
    width - padding * 2,
    height - logPanel.height - gap - padding * 2,
  );

  const logCards = drawLogPanel(ctx, logPanel, snapshot, "wide");
  const dbCards = drawDatabasePanel(ctx, databasePanel, snapshot, "wide");
  drawReplayPath(ctx, snapshot, logCards, dbCards);
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: ReplaySnapshot,
  width: number,
  height: number,
) {
  const padding = width < 380 ? 12 : 14;
  const gap = 14;
  const panelWidth = width - padding * 2;
  const logPanel = rect(padding, padding, panelWidth, 292);
  const databasePanel = rect(
    padding,
    logPanel.y + logPanel.height + gap,
    panelWidth,
    height - padding - (logPanel.y + logPanel.height + gap),
  );

  const logCards = drawLogPanel(ctx, logPanel, snapshot, "compact");
  const dbCards = drawDatabasePanel(ctx, databasePanel, snapshot, "compact");
  drawReplayPath(ctx, snapshot, logCards, dbCards);
}

function drawLogPanel(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  snapshot: ReplaySnapshot,
  layout: "wide" | "compact",
) {
  drawPanel(
    ctx,
    panel,
    "High-level durable redo records",
    "after checkpoint: LSN 101 -> 106",
  );

  const cards = new Map<number, Rect>();
  const columns = layout === "compact" ? 2 : 4;
  const gap = layout === "compact" ? 8 : 10;
  const left = panel.x + 12;
  const top = panel.y + 56;
  const availableWidth = panel.width - 24;
  const cardWidth = (availableWidth - gap * (columns - 1)) / columns;
  const cardHeight = layout === "compact" ? 46 : 48;

  snapshot.records.forEach((record, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const card = rect(
      left + column * (cardWidth + gap),
      top + row * (cardHeight + gap),
      cardWidth,
      cardHeight,
    );
    cards.set(record.sequence, card);
    drawLogRecord(ctx, card, record, layout === "compact");
  });

  return cards;
}

function drawDatabasePanel(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  snapshot: ReplaySnapshot,
  layout: "wide" | "compact",
) {
  drawPanel(
    ctx,
    panel,
    "Recovered InnoDB state",
    "checkpoint already contains Account A and Account B",
  );

  const cards = new Map<RecordKey, Rect>();
  const gap = layout === "compact" ? 9 : 12;
  const left = panel.x + 12;
  const top = panel.y + 56;
  const availableWidth = panel.width - 24;

  snapshot.database.forEach((record, index) => {
    const card =
      layout === "compact"
        ? rect(
            left,
            top + index * ((panel.height - 68 - gap * 2) / 3 + gap),
            availableWidth,
            (panel.height - 68 - gap * 2) / 3,
          )
        : rect(
            left + index * ((availableWidth - gap * 2) / 3 + gap),
            top,
            (availableWidth - gap * 2) / 3,
            panel.height - 68,
          );

    cards.set(record.key, card);
    drawMemoryRecord(ctx, card, record, layout === "compact");
  });

  return cards;
}

function drawLogRecord(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  record: ReplayLogRecord,
  compact: boolean,
) {
  const palette = logRecordPalette(record);
  roundedRect(ctx, card, 7);
  ctx.fillStyle = palette.fill;
  ctx.fill();
  ctx.lineWidth = record.status === "active" ? 2 : 1.5;
  ctx.strokeStyle = palette.stroke;
  ctx.stroke();

  const operationColor = operationTextColor(record.operation);
  drawText(
    ctx,
    `LSN ${record.sequence} ${record.operation} ${record.recordKey}`,
    card.x + 10,
    card.y + (compact ? 17 : 18),
    {
      color: operationColor,
      font: `700 ${compact ? 10 : 12}px ${MONO_FONT}`,
      maxWidth: card.width - 20,
    },
  );
  drawText(
    ctx,
    `durable ${record.detail}`,
    card.x + 10,
    card.y + (compact ? 34 : 36),
    {
      color: operationColor,
      font: `${compact ? 10 : 12}px ${UI_FONT}`,
      maxWidth: card.width - 20,
    },
  );
}

function drawMemoryRecord(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  record: MemoryRecord,
  compact: boolean,
) {
  const palette = memoryRecordPalette(record);
  roundedRect(ctx, card, 8);
  ctx.fillStyle = palette.fill;
  ctx.fill();
  ctx.lineWidth = record.status === "missing" ? 1.5 : 2;
  ctx.strokeStyle = palette.stroke;
  ctx.stroke();

  const titleY = card.y + (compact ? 19 : 24);
  const stateY = card.y + (compact ? 40 : 52);
  const balanceY = card.y + (compact ? 62 : 82);

  drawText(ctx, record.label, card.x + 13, titleY, {
    color: COLORS.ink,
    font: `700 ${compact ? 13 : 15}px ${UI_FONT}`,
    maxWidth: card.width - 26,
  });

  drawText(ctx, recordStatusLabel(record), card.x + 13, stateY, {
    color: palette.text,
    font: `700 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: card.width - 26,
  });

  if (record.status === "present") {
    drawText(ctx, `balance ${record.balance}`, card.x + 13, balanceY, {
      color: COLORS.green,
      font: `700 ${compact ? 13 : 16}px ${MONO_FONT}`,
      maxWidth: card.width - 26,
    });
  }
}

function drawReplayPath(
  ctx: CanvasRenderingContext2D,
  snapshot: ReplaySnapshot,
  logCards: Map<number, Rect>,
  dbCards: Map<RecordKey, Rect>,
) {
  const activeRecord = snapshot.activeRecord;
  if (!activeRecord) return;

  const source = logCards.get(activeRecord.sequence);
  const target = dbCards.get(activeRecord.recordKey);
  if (!source || !target) return;

  const start = bottomPort(source);
  const end = topPort(target);
  const point = interpolate(start, end, snapshot.stepProgress);
  drawArrow(ctx, start, point, COLORS.gold, 3);
  drawPacketDot(ctx, point);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  title: string,
  subtitle: string,
) {
  roundedRect(ctx, panel, 8);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.line;
  ctx.stroke();

  drawText(ctx, title, panel.x + 13, panel.y + 18, {
    color: COLORS.ink,
    font: `700 14px ${UI_FONT}`,
    maxWidth: panel.width - 26,
  });
  drawText(ctx, subtitle, panel.x + 13, panel.y + 38, {
    color: COLORS.muted,
    font: `700 11px ${UI_FONT}`,
    maxWidth: panel.width - 26,
  });
}

function logRecordPalette(record: ReplayLogRecord) {
  if (record.status === "active") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  if (record.status === "applied") {
    return { fill: COLORS.blueSoft, stroke: COLORS.blue };
  }
  return { fill: COLORS.panel, stroke: COLORS.line };
}

function memoryRecordPalette(record: MemoryRecord) {
  if (record.status === "deleted") {
    return { fill: COLORS.redSoft, stroke: COLORS.red, text: COLORS.red };
  }
  if (record.status === "present") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green, text: COLORS.green };
  }
  return { fill: COLORS.graySoft, stroke: COLORS.line, text: COLORS.muted };
}

function operationTextColor(operation: Operation) {
  if (operation === "DELETE") return COLORS.red;
  if (operation === "INSERT") return COLORS.green;
  return COLORS.blue;
}

function recordStatusLabel(record: MemoryRecord) {
  if (record.status === "missing") return "not in checkpoint";
  if (record.status === "deleted") return "replayed delete";
  if (!record.lastOperation) return "from checkpoint";
  return `replayed ${record.lastOperation.toLowerCase()}`;
}

function drawPacketDot(ctx: CanvasRenderingContext2D, point: Point) {
  ctx.save();
  ctx.shadowColor = "rgb(23 32 51 / 18%)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  color: string,
  width: number,
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = 8;
  const headAngle = Math.PI / 7;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - Math.cos(angle - headAngle) * headLength,
    end.y - Math.sin(angle - headAngle) * headLength,
  );
  ctx.lineTo(
    end.x - Math.cos(angle + headAngle) * headLength,
    end.y - Math.sin(angle + headAngle) * headLength,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
    maxWidth: number;
  },
) {
  ctx.fillStyle = options.color;
  ctx.font = options.font;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.fillText(fitText(ctx, text, options.maxWidth), x, y);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let fitted = text;
  while (
    fitted.length > 3 &&
    ctx.measureText(`${fitted}...`).width > maxWidth
  ) {
    fitted = fitted.slice(0, -1);
  }
  return `${fitted}...`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  radius: number,
) {
  const right = target.x + target.width;
  const bottom = target.y + target.height;

  ctx.beginPath();
  ctx.moveTo(target.x + radius, target.y);
  ctx.arcTo(right, target.y, right, bottom, radius);
  ctx.arcTo(right, bottom, target.x, bottom, radius);
  ctx.arcTo(target.x, bottom, target.x, target.y, radius);
  ctx.arcTo(target.x, target.y, right, target.y, radius);
  ctx.closePath();
}

function interpolate(start: Point, end: Point, progress: number): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function topPort(target: Rect): Point {
  return { x: target.x + target.width / 2, y: target.y };
}

function bottomPort(target: Rect): Point {
  return { x: target.x + target.width / 2, y: target.y + target.height };
}

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}
