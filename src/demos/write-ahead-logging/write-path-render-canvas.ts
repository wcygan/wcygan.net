import {
  WAL_WRITE_TIMING,
  type MemoryRowStatus,
  type WalRecordStatus,
  type WalWritePacketStage,
  type WalWritePathSnapshot,
} from "./write-path-model";
import type { CanvasViewport } from "./viewport";

type Point = {
  x: number;
  y: number;
};

type Rect = Point & {
  width: number;
  height: number;
};

type FlowPath = {
  start: Point;
  end: Point;
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
  graySoft: "rgb(92 102 122 / 8%)",
};

const IDLE_TOES = {
  background: "#323232",
  brightBlack: "#606060",
  foreground: "#eeeeec",
  blue: "#4099ff",
  green: "#7fe173",
  yellow: "#ffc66d",
};

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const COMPACT_LAYOUT_MAX_WIDTH = 620;

export function drawWalWritePathDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: WalWritePathSnapshot,
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
  snapshot: WalWritePathSnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const stage = rect(padding + 12, 78, width - padding * 2 - 24, 200);
  const sqlCardSize = { width: 190, height: 138 };
  const database = rect(
    stage.x + sqlCardSize.width + 28,
    stage.y + 28,
    156,
    162,
  );
  const sqlCard = rect(
    stage.x,
    database.y + (database.height - sqlCardSize.height) / 2,
    sqlCardSize.width,
    sqlCardSize.height,
  );
  const stackX = database.x + database.width + 30;
  const stackWidth = width - padding - 12 - stackX;
  const stackCardHeight = 94;
  const stackGap = 14;
  const walRecord = rect(stackX, stage.y + 6, stackWidth, stackCardHeight);
  const memoryRow = rect(
    stackX,
    walRecord.y + walRecord.height + stackGap,
    stackWidth,
    stackCardHeight,
  );

  drawInvariantStrip(ctx, rect(padding, 18, width - padding * 2, 38), snapshot);

  const paths: Record<WalWritePacketStage, FlowPath> = {
    "sql-to-database": {
      start: rightPort(sqlCard),
      end: leftPort(database),
    },
    "database-to-wal": {
      start: rightPortAt(database, 0.34),
      end: leftPort(walRecord),
    },
    "database-to-memory": {
      start: rightPortAt(database, 0.68),
      end: leftPort(memoryRow),
    },
  };

  drawFlowPaths(ctx, snapshot, paths);
  drawSqlCard(ctx, sqlCard, snapshot);
  drawDatabaseCylinder(ctx, database, snapshot);
  drawWalRecord(ctx, walRecord, snapshot);
  drawMemoryRow(ctx, memoryRow, snapshot);
  drawTimeline(
    ctx,
    rect(padding, height - 76, width - padding * 2, 40),
    snapshot,
  );
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: WalWritePathSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 380 ? 12 : 14;
  const panelWidth = width - padding * 2;
  const invariant = rect(padding, 14, panelWidth, 62);
  const sqlCard = rect(
    padding,
    invariant.y + invariant.height + 14,
    panelWidth,
    108,
  );
  const branchTop = sqlCard.y + sqlCard.height + 20;
  const branchGap = 10;
  const databaseWidth = Math.min(116, Math.max(96, panelWidth * 0.36));
  const stackX = padding + databaseWidth + branchGap;
  const stackWidth = panelWidth - databaseWidth - branchGap;
  const stackCardHeight = 92;
  const database = rect(padding, branchTop + 4, databaseWidth, 184);
  const walRecord = rect(stackX, branchTop, stackWidth, stackCardHeight);
  const memoryRow = rect(
    stackX,
    walRecord.y + walRecord.height + 12,
    stackWidth,
    stackCardHeight,
  );

  drawInvariantStrip(ctx, invariant, snapshot);

  const paths: Record<WalWritePacketStage, FlowPath> = {
    "sql-to-database": {
      start: bottomPort(sqlCard),
      end: topPort(database),
    },
    "database-to-wal": {
      start: rightPortAt(database, 0.36),
      end: leftPort(walRecord),
    },
    "database-to-memory": {
      start: rightPortAt(database, 0.68),
      end: leftPort(memoryRow),
    },
  };

  drawFlowPaths(ctx, snapshot, paths);
  drawSqlCard(ctx, sqlCard, snapshot);
  drawDatabaseCylinder(ctx, database, snapshot);
  drawWalRecord(ctx, walRecord, snapshot);
  drawMemoryRow(ctx, memoryRow, snapshot);
  drawTimeline(
    ctx,
    rect(
      padding,
      Math.min(database.y + database.height + 18, height - 52),
      panelWidth,
      34,
    ),
    snapshot,
  );
}

function drawInvariantStrip(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  snapshot: WalWritePathSnapshot,
) {
  roundedRect(ctx, target, 8);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.line;
  ctx.stroke();

  const compact = target.width < 360;

  drawText(ctx, "WAL before memory", target.x + 13, target.y + 15, {
    color: COLORS.ink,
    font: `700 ${compact ? 12 : 13}px ${UI_FONT}`,
    maxWidth: target.width - 26,
  });

  if (compact) {
    drawWrappedText(ctx, snapshot.phaseLabel, target.x + 13, target.y + 34, {
      color: COLORS.muted,
      font: `700 10px ${UI_FONT}`,
      lineHeight: 12,
      maxLines: 2,
      maxWidth: target.width - 26,
    });
    return;
  }

  drawText(ctx, snapshot.phaseLabel, target.x + 13, target.y + 26, {
    color: COLORS.muted,
    font: `700 11px ${UI_FONT}`,
    maxWidth: target.width - 26,
  });
}

function drawSqlCard(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  snapshot: WalWritePathSnapshot,
) {
  ctx.save();
  ctx.shadowColor = "rgb(23 32 51 / 12%)";
  ctx.shadowBlur = snapshot.sql.status === "active" ? 16 : 10;
  ctx.shadowOffsetY = 6;
  roundedRect(ctx, target, 8);
  ctx.fillStyle = IDLE_TOES.background;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = snapshot.sql.status === "active" ? 2 : 1.5;
  ctx.strokeStyle =
    snapshot.sql.status === "active" ? COLORS.gold : IDLE_TOES.brightBlack;
  ctx.stroke();
  ctx.restore();

  drawText(ctx, "Application SQL", target.x + 13, target.y + 17, {
    color: IDLE_TOES.foreground,
    font: `700 13px ${UI_FONT}`,
    maxWidth: target.width - 26,
  });

  drawSqlCodeLine(
    ctx,
    [
      { text: "UPDATE", color: IDLE_TOES.blue },
      { text: " users", color: IDLE_TOES.foreground },
    ],
    target.x + 13,
    target.y + 48,
    target.width - 26,
  );
  drawSqlCodeLine(
    ctx,
    [
      { text: "SET", color: IDLE_TOES.blue },
      { text: " plan = ", color: IDLE_TOES.foreground },
      { text: "'pro'", color: IDLE_TOES.green },
    ],
    target.x + 13,
    target.y + 72,
    target.width - 26,
  );
  drawSqlCodeLine(
    ctx,
    [
      { text: "WHERE", color: IDLE_TOES.blue },
      { text: " id = ", color: IDLE_TOES.foreground },
      { text: "42", color: IDLE_TOES.yellow },
      { text: ";", color: IDLE_TOES.foreground },
    ],
    target.x + 13,
    target.y + 96,
    target.width - 26,
  );
}

function drawDatabaseCylinder(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  snapshot: WalWritePathSnapshot,
) {
  const active = snapshot.database.status === "accepting";
  const complete = snapshot.database.status === "applied";
  const fill = active
    ? COLORS.goldSoft
    : complete
      ? COLORS.greenSoft
      : COLORS.blueSoft;
  const stroke = active ? COLORS.gold : complete ? COLORS.green : COLORS.blue;
  const ellipseHeight = Math.min(28, target.height * 0.22);
  const centerX = target.x + target.width / 2;
  const radiusX = target.width / 2;
  const radiusY = ellipseHeight / 2;
  const bodyTop = target.y + ellipseHeight / 2;
  const bodyBottom = target.y + target.height - ellipseHeight / 2;
  const compact = target.width < 124;

  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = active ? 2.5 : 2;

  ctx.beginPath();
  ctx.ellipse(centerX, bodyBottom, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(target.x, bodyTop, target.width, bodyBottom - bodyTop);

  ctx.beginPath();
  ctx.moveTo(target.x, bodyTop);
  ctx.lineTo(target.x, bodyBottom);
  ctx.moveTo(target.x + target.width, bodyTop);
  ctx.lineTo(target.x + target.width, bodyBottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(centerX, bodyTop, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(centerX, bodyBottom, radiusX, radiusY, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  drawText(
    ctx,
    snapshot.database.label,
    target.x + target.width / 2,
    target.y + target.height / 2 - 8,
    {
      align: "center",
      color: COLORS.ink,
      font: `700 13px ${UI_FONT}`,
      maxWidth: target.width - 18,
    },
  );
  drawText(
    ctx,
    snapshot.database.detail,
    target.x + target.width / 2,
    target.y + target.height / 2 + 15,
    {
      align: "center",
      color: COLORS.muted,
      font: `700 ${compact ? 10 : 11}px ${UI_FONT}`,
      maxWidth: target.width - (compact ? 12 : 18),
    },
  );
}

function drawWalRecord(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  snapshot: WalWritePathSnapshot,
) {
  const palette = walRecordPalette(snapshot.walRecord.status);
  drawCard(ctx, target, palette.fill, palette.stroke);

  drawText(ctx, "WAL on disk", target.x + 13, target.y + 17, {
    color: COLORS.ink,
    font: `700 13px ${UI_FONT}`,
    maxWidth: target.width - 26,
  });

  const pending = snapshot.walRecord.status === "pending";
  drawText(
    ctx,
    pending ? "waiting for log record" : `LSN ${snapshot.walRecord.lsn}`,
    target.x + 13,
    target.y + 46,
    {
      color: pending ? COLORS.muted : COLORS.green,
      font: `700 12px ${MONO_FONT}`,
      maxWidth: target.width - 26,
    },
  );
  drawText(ctx, snapshot.walRecord.summary, target.x + 13, target.y + 70, {
    color: pending ? COLORS.muted : COLORS.blue,
    font: `700 12px ${MONO_FONT}`,
    maxWidth: target.width - 26,
  });
  drawText(
    ctx,
    snapshot.walRecord.detail,
    target.x + 13,
    target.y + target.height - 14,
    {
      color: pending ? COLORS.muted : COLORS.ink,
      font: `700 11px ${UI_FONT}`,
      maxWidth: target.width - 26,
    },
  );
}

function drawMemoryRow(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  snapshot: WalWritePathSnapshot,
) {
  const palette = memoryRowPalette(snapshot.memoryRow.status);
  const compact = target.width < 180;
  drawCard(ctx, target, palette.fill, palette.stroke);

  drawText(ctx, "In-memory state", target.x + 13, target.y + 17, {
    color: COLORS.ink,
    font: `700 13px ${UI_FONT}`,
    maxWidth: target.width - 26,
  });
  drawText(
    ctx,
    memoryStatusLabel(snapshot.memoryRow.status, compact),
    target.x + 13,
    target.y + 39,
    {
      color: palette.text,
      font: `700 ${compact ? 10 : 11}px ${UI_FONT}`,
      maxWidth: target.width - 26,
    },
  );

  const table = rect(
    target.x + 12,
    target.y + 58,
    target.width - 24,
    target.height - 72,
  );
  roundedRect(ctx, table, 6);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  drawText(
    ctx,
    `user ${snapshot.memoryRow.id}  plan: ${snapshot.memoryRow.plan}`,
    table.x + 10,
    table.y + table.height / 2,
    {
      color: snapshot.memoryRow.plan === "pro" ? COLORS.green : COLORS.muted,
      font: `700 11px ${MONO_FONT}`,
      maxWidth: table.width - 20,
    },
  );
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  snapshot: WalWritePathSnapshot,
) {
  const milestones = [
    {
      key: "accept-sql",
      label: "accept SQL",
      compactLabel: "accept",
      progress:
        WAL_WRITE_TIMING.sqlAcceptedAt / WAL_WRITE_TIMING.memoryAppliedAt,
    },
    {
      key: "append-wal",
      label: "append WAL",
      compactLabel: "WAL",
      progress:
        WAL_WRITE_TIMING.walDurableAt / WAL_WRITE_TIMING.memoryAppliedAt,
    },
    {
      key: "apply-memory",
      label: "apply memory",
      compactLabel: "memory",
      progress: 1,
    },
  ] as const;
  const compact = target.width < 360;
  const margin = target.width < 360 ? 34 : 42;
  const y = target.y + target.height / 2;

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(target.x + margin, y);
  ctx.lineTo(target.x + target.width - margin, y);
  ctx.stroke();

  ctx.strokeStyle = COLORS.green;
  ctx.beginPath();
  ctx.moveTo(target.x + margin, y);
  ctx.lineTo(
    target.x + margin + (target.width - margin * 2) * snapshot.timelineProgress,
    y,
  );
  ctx.stroke();
  ctx.restore();

  milestones.forEach((milestone) => {
    const x =
      target.x + margin + (target.width - margin * 2) * milestone.progress;
    const active =
      (milestone.key === "accept-sql" && snapshot.phase === "accepting-sql") ||
      (milestone.key === "append-wal" && snapshot.phase === "writing-wal") ||
      (milestone.key === "apply-memory" &&
        snapshot.phase === "applying-memory");
    const complete =
      (milestone.key === "accept-sql" &&
        snapshot.progress >= WAL_WRITE_TIMING.sqlAcceptedAt) ||
      (milestone.key === "append-wal" &&
        snapshot.walRecord.status === "durable") ||
      (milestone.key === "apply-memory" &&
        snapshot.memoryRow.status === "current");

    ctx.beginPath();
    ctx.arc(x, y, active ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = active
      ? COLORS.gold
      : complete
        ? COLORS.green
        : COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = complete || active ? ctx.fillStyle : COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawText(
      ctx,
      compact ? milestone.compactLabel : milestone.label,
      x,
      y + 18,
      {
        align: "center",
        color: active ? COLORS.gold : complete ? COLORS.green : COLORS.muted,
        font: `700 10px ${UI_FONT}`,
        maxWidth: target.width / 3 - 8,
      },
    );
  });
}

function drawFlowPaths(
  ctx: CanvasRenderingContext2D,
  snapshot: WalWritePathSnapshot,
  paths: Record<WalWritePacketStage, FlowPath>,
) {
  Object.values(paths).forEach((path) => {
    drawLine(ctx, path.start, path.end, COLORS.line, 2);
  });

  if (snapshot.sql.status === "complete") {
    drawArrow(
      ctx,
      paths["sql-to-database"].start,
      paths["sql-to-database"].end,
      COLORS.green,
      2.5,
    );
  }

  if (snapshot.walRecord.status === "durable") {
    drawArrow(
      ctx,
      paths["database-to-wal"].start,
      paths["database-to-wal"].end,
      COLORS.green,
      2.5,
    );
  }

  if (snapshot.memoryRow.status === "current") {
    drawArrow(
      ctx,
      paths["database-to-memory"].start,
      paths["database-to-memory"].end,
      COLORS.green,
      2.5,
    );
  }

  if (!snapshot.packet) return;

  const path = paths[snapshot.packet.stage];
  const point = interpolate(path.start, path.end, snapshot.packet.progress);
  drawArrow(ctx, path.start, point, COLORS.gold, 3);
  drawPacketDot(ctx, point);
}

function walRecordPalette(status: WalRecordStatus) {
  if (status === "writing") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }

  if (status === "durable") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }

  return { fill: COLORS.panel, stroke: COLORS.line };
}

function memoryRowPalette(status: MemoryRowStatus) {
  if (status === "current") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green, text: COLORS.green };
  }

  if (status === "applying") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold, text: COLORS.gold };
  }

  return { fill: COLORS.graySoft, stroke: COLORS.line, text: COLORS.muted };
}

function memoryStatusLabel(status: MemoryRowStatus, compact: boolean) {
  if (status === "current")
    return compact ? "updated after WAL" : "updated after durable WAL";
  if (status === "applying")
    return compact ? "from durable WAL" : "applying from durable WAL";
  return compact ? "waits for WAL" : "free until WAL durable";
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  target: Rect,
  fill: string,
  stroke: string,
) {
  roundedRect(ctx, target, 8);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawSqlCodeLine(
  ctx: CanvasRenderingContext2D,
  segments: readonly { text: string; color: string }[],
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.font = `700 12px ${MONO_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let cursorX = x;
  const right = x + maxWidth;

  for (const segment of segments) {
    if (cursorX >= right) return;

    const fitted = fitText(ctx, segment.text, right - cursorX);
    ctx.fillStyle = segment.color;
    ctx.fillText(fitted, cursorX, y);
    cursorX += ctx.measureText(fitted).width;
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  color: string,
  width: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
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

  drawLine(ctx, start, end, color, width);

  ctx.save();
  ctx.fillStyle = color;
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

function drawPacketDot(ctx: CanvasRenderingContext2D, point: Point) {
  ctx.save();
  ctx.shadowColor = "rgb(23 32 51 / 18%)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
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

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    color: string;
    font: string;
    lineHeight: number;
    maxLines: number;
    maxWidth: number;
  },
) {
  ctx.fillStyle = options.color;
  ctx.font = options.font;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= options.maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (lines.length === options.maxLines - 1) {
      lines.push(
        [currentLine, ...words.slice(index)].filter(Boolean).join(" "),
      );
      currentLine = "";
      break;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(word);
      currentLine = "";
    }
  }

  if (currentLine && lines.length < options.maxLines) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    const isLastLine = index === options.maxLines - 1;
    ctx.fillText(
      isLastLine ? fitText(ctx, line, options.maxWidth) : line,
      x,
      y + index * options.lineHeight,
    );
  });
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

function rightPort(target: Rect): Point {
  return { x: target.x + target.width, y: target.y + target.height / 2 };
}

function rightPortAt(target: Rect, progress: number): Point {
  return { x: target.x + target.width, y: target.y + target.height * progress };
}

function bottomPort(target: Rect): Point {
  return { x: target.x + target.width / 2, y: target.y + target.height };
}

function leftPort(target: Rect): Point {
  return { x: target.x, y: target.y + target.height / 2 };
}

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}
