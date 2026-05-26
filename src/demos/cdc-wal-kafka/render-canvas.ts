import type {
  DerivedWalUpdate,
  WalKafkaSnapshot,
  WalUpdateStatus,
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
  blue: "#2f69f0",
  blueSoft: "rgb(47 105 240 / 10%)",
  green: "#1d8b65",
  greenSoft: "rgb(29 139 101 / 10%)",
  gold: "#d59b24",
  goldSoft: "rgb(213 155 36 / 14%)",
  red: "#d24a44",
  redSoft: "rgb(210 74 68 / 9%)",
};

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const COMPACT_LAYOUT_MAX_WIDTH = 600;

export function drawWalKafkaDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: WalKafkaSnapshot,
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
  snapshot: WalKafkaSnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const pipelineGap = clampDimension(width * 0.06, 36, 54);
  const centerWidth = width < 700 ? 142 : 154;
  const availablePanelWidth =
    width - padding * 2 - pipelineGap * 2 - centerWidth;
  const walWidth = Math.min(260, Math.max(176, availablePanelWidth * 0.48));
  const kafkaWidth = availablePanelWidth - walWidth;
  const panelHeight = height - padding * 2;
  const walPanel = rect(padding, padding, walWidth, panelHeight);
  const debezium = rect(
    walPanel.x + walPanel.width + pipelineGap,
    height / 2 - 50,
    centerWidth,
    100,
  );
  const kafkaPanel = rect(
    debezium.x + debezium.width + pipelineGap,
    padding,
    kafkaWidth,
    panelHeight,
  );

  const walRows = drawWalPanel(ctx, walPanel, snapshot.updates);
  const kafkaRows = drawKafkaPanel(ctx, kafkaPanel, snapshot.updates);
  const activeWalRow = walRows[snapshot.activeIndex];
  const activeKafkaRow = kafkaRows[snapshot.activeIndex];
  const showPacketLabel = pipelineGap >= 52;

  drawPassiveArrow(ctx, rightPort(activeWalRow), leftPort(debezium));
  drawPassiveArrow(ctx, rightPort(debezium), leftPort(activeKafkaRow));
  drawDebeziumNode(ctx, debezium, snapshot);
  drawPacket(
    ctx,
    snapshot,
    "wal-to-debezium",
    rightPort(activeWalRow),
    leftPort(debezium),
    showPacketLabel,
  );
  drawPacket(
    ctx,
    snapshot,
    "debezium-to-kafka",
    rightPort(debezium),
    leftPort(activeKafkaRow),
    showPacketLabel,
  );
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: WalKafkaSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const pipelineGap = width < 360 ? 34 : 40;
  const panelWidth = width - padding * 2;
  const debeziumHeight = width < 360 ? 84 : 88;
  const availableHeight =
    height - padding * 2 - pipelineGap * 2 - debeziumHeight;
  const minimumKafkaHeight = 214;
  const walHeight = Math.max(
    206,
    Math.min(availableHeight * 0.48, availableHeight - minimumKafkaHeight),
  );
  const kafkaHeight = availableHeight - walHeight;
  const walPanel = rect(padding, padding, panelWidth, walHeight);
  const debezium = rect(
    padding + panelWidth * 0.1,
    walPanel.y + walPanel.height + pipelineGap,
    panelWidth * 0.8,
    debeziumHeight,
  );
  const kafkaPanel = rect(
    padding,
    debezium.y + debezium.height + pipelineGap,
    panelWidth,
    kafkaHeight,
  );

  drawWalPanel(ctx, walPanel, snapshot.updates);
  drawKafkaPanel(ctx, kafkaPanel, snapshot.updates);

  drawPassiveArrow(ctx, bottomPort(walPanel), topPort(debezium));
  drawPassiveArrow(ctx, bottomPort(debezium), topPort(kafkaPanel));
  drawDebeziumNode(ctx, debezium, snapshot);
  drawPacket(
    ctx,
    snapshot,
    "wal-to-debezium",
    bottomPort(walPanel),
    topPort(debezium),
    false,
  );
  drawPacket(
    ctx,
    snapshot,
    "debezium-to-kafka",
    bottomPort(debezium),
    topPort(kafkaPanel),
    false,
  );
}

function drawWalPanel(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  updates: readonly DerivedWalUpdate[],
) {
  drawPanel(ctx, panel, "Postgres WAL", "commit order");

  return drawRows(ctx, panel, updates, (row, update, index) => {
    const compactRow = row.height < 62;
    const lsnY = compactRow ? row.y + row.height * 0.32 : row.y + 15;
    const summaryY = compactRow ? row.y + row.height * 0.68 : row.y + 34;
    const palette = statusPalette(update.status);
    drawRowShell(ctx, row, palette.fill, palette.stroke);
    drawText(ctx, `LSN ${update.lsn}`, row.x + 12, lsnY, {
      color: COLORS.muted,
      font: `700 11px ${MONO_FONT}`,
      maxWidth: row.width - 24,
    });
    drawText(ctx, update.walSummary, row.x + 12, summaryY, {
      color: COLORS.ink,
      font: `700 13px ${UI_FONT}`,
      maxWidth: row.width - 24,
    });
    if (!compactRow) {
      drawText(ctx, update.walDetail, row.x + 12, row.y + 52, {
        color: COLORS.muted,
        font: `12px ${UI_FONT}`,
        maxWidth: row.width - 24,
      });
    }

    if (index === updates.length - 1) return;
  });
}

function drawKafkaPanel(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  updates: readonly DerivedWalUpdate[],
) {
  drawPanel(ctx, panel, "Kafka topic", "app.public.users");

  return drawRows(ctx, panel, updates, (row, update) => {
    const compactRow = row.height < 62;
    const labelY = compactRow ? row.y + row.height * 0.32 : row.y + 15;
    const summaryY = compactRow ? row.y + row.height * 0.68 : row.y + 34;
    const produced = update.status === "produced";
    const active = update.status === "emitting";
    const fill = produced
      ? COLORS.greenSoft
      : active
        ? COLORS.goldSoft
        : COLORS.panel;
    const stroke = produced ? COLORS.green : active ? COLORS.gold : COLORS.line;

    drawRowShell(ctx, row, fill, stroke);

    if (!produced) {
      drawText(ctx, "waiting for event", row.x + 12, labelY, {
        color: COLORS.muted,
        font: `700 12px ${UI_FONT}`,
        maxWidth: row.width - 24,
      });
      drawText(ctx, `source LSN ${update.lsn}`, row.x + 12, summaryY, {
        color: COLORS.muted,
        font: `12px ${MONO_FONT}`,
        maxWidth: row.width - 24,
      });
      return;
    }

    drawText(ctx, `offset ${update.offset}`, row.x + 12, labelY, {
      color: COLORS.green,
      font: `700 11px ${MONO_FONT}`,
      maxWidth: row.width - 24,
    });
    drawText(ctx, update.kafkaSummary, row.x + 12, summaryY, {
      color: COLORS.ink,
      font: `700 13px ${UI_FONT}`,
      maxWidth: row.width - 24,
    });
    if (!compactRow) {
      drawText(ctx, `source.lsn ${update.lsn}`, row.x + 12, row.y + 52, {
        color: COLORS.muted,
        font: `12px ${MONO_FONT}`,
        maxWidth: row.width - 24,
      });
    }
  });
}

function drawRows(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  updates: readonly DerivedWalUpdate[],
  drawRow: (row: Rect, update: DerivedWalUpdate, index: number) => void,
) {
  const compactPanel = panel.height < 190;
  const titleHeight = compactPanel ? 40 : 46;
  const gap = compactPanel ? 9 : 10;
  const rowHeight = (panel.height - titleHeight - gap * 4) / updates.length;

  return updates.map((update, index) => {
    const row = rect(
      panel.x + 12,
      panel.y + titleHeight + gap + index * (rowHeight + gap),
      panel.width - 24,
      rowHeight,
    );
    drawRow(row, update, index);
    return row;
  });
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
  drawText(ctx, subtitle, panel.x + 13, panel.y + 36, {
    color: COLORS.muted,
    font: `700 11px ${UI_FONT}`,
    maxWidth: panel.width - 26,
  });
}

function drawDebeziumNode(
  ctx: CanvasRenderingContext2D,
  node: Rect,
  snapshot: WalKafkaSnapshot,
) {
  const compactNode = node.height < 96;
  const titleY = node.y + (compactNode ? 24 : 25);
  const cursorY = node.y + (compactNode ? 47 : 48);
  const phaseY = node.y + (compactNode ? node.height - 21 : 70);

  roundedRect(ctx, node, 8);
  ctx.fillStyle =
    snapshot.packet?.stage === "debezium-to-kafka"
      ? COLORS.blueSoft
      : COLORS.panel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = snapshot.packet ? COLORS.blue : COLORS.line;
  ctx.stroke();

  drawText(ctx, "Debezium", node.x + node.width / 2, titleY, {
    align: "center",
    color: COLORS.ink,
    font: `700 15px ${UI_FONT}`,
    maxWidth: node.width - 20,
  });
  drawText(
    ctx,
    `cursor ${snapshot.activeUpdate.lsn}`,
    node.x + node.width / 2,
    cursorY,
    {
      align: "center",
      color: COLORS.blue,
      font: `700 12px ${MONO_FONT}`,
      maxWidth: node.width - 20,
    },
  );
  drawText(ctx, snapshot.phaseLabel, node.x + node.width / 2, phaseY, {
    align: "center",
    color: COLORS.muted,
    font: `12px ${UI_FONT}`,
    maxWidth: node.width - 18,
  });
}

function drawRowShell(
  ctx: CanvasRenderingContext2D,
  row: Rect,
  fill: string,
  stroke: string,
) {
  roundedRect(ctx, row, 6);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawPassiveArrow(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  drawArrow(ctx, start, end, COLORS.line, 2);
}

function drawPacket(
  ctx: CanvasRenderingContext2D,
  snapshot: WalKafkaSnapshot,
  stage: "wal-to-debezium" | "debezium-to-kafka",
  start: Point,
  end: Point,
  showLabel = true,
) {
  const packet = snapshot.packet;
  if (!packet || packet.stage !== stage) return;

  const point = interpolate(start, end, packet.progress);
  drawArrow(ctx, start, point, COLORS.gold, 3);
  drawPacketDot(ctx, point, packet.update.lsn, showLabel);
}

function drawPacketDot(
  ctx: CanvasRenderingContext2D,
  point: Point,
  label: string,
  showLabel: boolean,
) {
  ctx.save();
  ctx.shadowColor = "rgb(23 32 51 / 18%)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.restore();

  if (showLabel) {
    drawText(ctx, label, point.x, point.y - 16, {
      align: "center",
      color: COLORS.ink,
      font: `700 10px ${MONO_FONT}`,
      maxWidth: 70,
    });
  }
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

function statusPalette(status: WalUpdateStatus) {
  if (status === "produced") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (status === "reading" || status === "emitting") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  return { fill: COLORS.panel, stroke: COLORS.line };
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

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

function clampDimension(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function interpolate(start: Point, end: Point, progress: number): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function leftPort(target: Rect): Point {
  return { x: target.x, y: target.y + target.height / 2 };
}

function rightPort(target: Rect): Point {
  return { x: target.x + target.width, y: target.y + target.height / 2 };
}

function topPort(target: Rect): Point {
  return { x: target.x + target.width / 2, y: target.y };
}

function bottomPort(target: Rect): Point {
  return { x: target.x + target.width / 2, y: target.y + target.height };
}
