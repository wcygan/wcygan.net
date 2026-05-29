import {
  clamp,
  type ActSnapshot,
  type CrashSnapshot,
  type EventRow,
  type FooterProgress,
  type ProgressTone,
  type WorkerMarker,
  type WorkerState,
} from "./model";
import type { CanvasViewport } from "./viewport";

type Point = { x: number; y: number };
type Rect = Point & { width: number; height: number };

const COLORS = {
  ink: "#172033",
  muted: "#5c667a",
  line: "#d9deea",
  shell: "#eef1f7",
  panel: "#ffffff",
  rowRest: "#f8fafc",
  blue: "rgb(30, 70, 140)",
  blueSoft: "rgb(30 70 140 / 9%)",
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

export function drawWorkerCrashModesDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: CrashSnapshot,
  viewport: CanvasViewport,
) {
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.cssWidth, viewport.cssHeight);
  ctx.fillStyle = COLORS.shell;
  ctx.fillRect(0, 0, viewport.cssWidth, viewport.cssHeight);

  const compact = viewport.cssWidth <= COMPACT_LAYOUT_MAX_WIDTH;
  if (compact) {
    drawCompact(ctx, snapshot, viewport.cssWidth, viewport.cssHeight);
  } else {
    drawWide(ctx, snapshot, viewport.cssWidth, viewport.cssHeight);
  }
}

function drawWide(
  ctx: CanvasRenderingContext2D,
  snapshot: CrashSnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const gap = 16;
  const captionBand = 48;
  const colWidth = (width - padding * 2 - gap) / 2;
  const colHeight = height - padding * 2 - captionBand;

  drawActPanel(
    ctx,
    rect(padding, padding, colWidth, colHeight),
    snapshot.workflowTask,
    snapshot.activeAct === "workflow-task",
    false,
  );
  drawActPanel(
    ctx,
    rect(padding + colWidth + gap, padding, colWidth, colHeight),
    snapshot.activity,
    snapshot.activeAct === "activity",
    false,
  );

  drawCaption(
    ctx,
    rect(
      padding,
      padding + colHeight + 10,
      width - padding * 2,
      captionBand - 10,
    ),
    snapshot,
    false,
  );
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: CrashSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const gap = 12;
  const captionBand = 64;
  const panelArea = height - padding * 2 - captionBand - gap;
  const panelHeight = panelArea / 2;

  drawActPanel(
    ctx,
    rect(padding, padding, width - padding * 2, panelHeight),
    snapshot.workflowTask,
    snapshot.activeAct === "workflow-task",
    true,
  );
  drawActPanel(
    ctx,
    rect(
      padding,
      padding + panelHeight + gap,
      width - padding * 2,
      panelHeight,
    ),
    snapshot.activity,
    snapshot.activeAct === "activity",
    true,
  );

  drawCaption(
    ctx,
    rect(
      padding,
      padding + panelHeight * 2 + gap + 8,
      width - padding * 2,
      captionBand - 8,
    ),
    snapshot,
    true,
  );
}

function drawActPanel(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  act: ActSnapshot,
  active: boolean,
  compact: boolean,
) {
  const idle = act.phase === "idle";
  const accent = actAccent(act);

  ctx.save();
  if (idle) ctx.globalAlpha = 0.5;

  drawShadow(ctx, box, 12);
  drawRoundedRect(
    ctx,
    box,
    10,
    COLORS.panel,
    accent,
    active && !idle ? 1.8 : 1.1,
  );

  // A thin colored cap on the left edge reinforces the act's current phase.
  drawPhaseCap(ctx, box, accent);

  drawText(ctx, act.title, box.x + 16, box.y + 25, {
    color: COLORS.ink,
    font: `800 ${compact ? 14 : 15}px ${UI_FONT}`,
    maxWidth: box.width - 32 - tagWidth(ctx, act.tag),
  });
  drawBadge(
    ctx,
    box.x + box.width - tagWidth(ctx, act.tag) - 12,
    box.y + 11,
    act.tag,
    {
      fill: COLORS.shell,
      stroke: COLORS.line,
      color: COLORS.muted,
    },
  );

  if (idle) {
    drawText(ctx, "plays next", box.x + 16, box.y + box.height / 2 + 4, {
      color: COLORS.muted,
      font: `700 12px ${UI_FONT}`,
      maxWidth: box.width - 32,
    });
    ctx.restore();
    return;
  }

  const rowsTop = box.y + 38;
  const footerTop = box.y + box.height - (compact ? 30 : 32);
  const rowsBottom = footerTop - 8;
  drawEventLog(ctx, box, rowsTop, rowsBottom, act, compact);
  drawFooter(
    ctx,
    rect(
      box.x + 14,
      footerTop,
      box.width - 28,
      box.y + box.height - footerTop - 8,
    ),
    act,
    compact,
  );

  ctx.restore();
}

// The log pins every event to its sequence position so rows append in place
// (row 3 stays put as later rows arrive) and the Worker chip slides down it.
function drawEventLog(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  top: number,
  bottom: number,
  act: ActSnapshot,
  compact: boolean,
) {
  const slots = 7;
  const rowGap = 6;
  const rowHeight = clamp(
    (bottom - top - rowGap * (slots - 1)) / slots,
    20,
    compact ? 30 : 32,
  );
  const workerSeq = act.worker?.rowSeq ?? -1;

  for (const row of act.rows) {
    const rowBox = rect(
      box.x + 14,
      top + (row.seq - 1) * (rowHeight + rowGap),
      box.width - 28,
      rowHeight,
    );
    drawEventRow(ctx, rowBox, row, row.seq === workerSeq, compact);
  }

  if (act.worker) {
    const rowBox = rect(
      box.x + 14,
      top + (act.worker.rowSeq - 1) * (rowHeight + rowGap),
      box.width - 28,
      rowHeight,
    );
    drawWorkerChip(ctx, rowBox, act.worker, compact);
  }
}

function drawEventRow(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  row: EventRow,
  hostsWorker: boolean,
  compact: boolean,
) {
  const palette = rowPalette(row);

  // Orphaned (Act 1 gap, gold) and pending (Act 2 awaiting terminal, blue) rows
  // are dashed to read as "not settled yet".
  if (row.orphaned || row.pending) {
    drawDashedRoundedRect(ctx, box, 7, palette.fill, palette.stroke);
  } else {
    drawRoundedRect(
      ctx,
      box,
      7,
      palette.fill,
      palette.stroke,
      row.newest ? 1.6 : 1,
    );
  }

  const midY = box.y + box.height / 2 + 4;
  drawText(ctx, String(row.seq), box.x + 11, midY, {
    color: palette.accent,
    font: `800 ${compact ? 11 : 12}px ${MONO_FONT}`,
  });
  drawText(ctx, row.type, box.x + 30, midY, {
    color: COLORS.ink,
    font: `700 ${compact ? 10 : 11}px ${MONO_FONT}`,
    maxWidth: box.width - 44 - (hostsWorker ? 0 : 96),
  });

  // The Worker chip restates this row's detail, so hide the detail beneath it.
  if (!hostsWorker && row.detail) {
    drawText(ctx, row.detail, box.x + box.width - 12, midY, {
      align: "right",
      color: row.tone === "neutral" ? COLORS.muted : palette.accent,
      font: `700 ${compact ? 9 : 10}px ${MONO_FONT}`,
      maxWidth: 92,
    });
  }
}

function drawWorkerChip(
  ctx: CanvasRenderingContext2D,
  rowBox: Rect,
  worker: WorkerMarker,
  compact: boolean,
) {
  const color = workerColor(worker.state);
  const word = workerWord(worker.state);
  const dotR = compact ? 8 : 9;

  ctx.font = `800 ${compact ? 9 : 10}px ${UI_FONT}`;
  const wordWidth = ctx.measureText(word).width;
  const chipWidth = dotR * 2 + 10 + wordWidth + 14;
  const chip = rect(
    rowBox.x + rowBox.width - chipWidth - 4,
    rowBox.y + rowBox.height / 2 - (compact ? 11 : 12),
    chipWidth,
    compact ? 22 : 24,
  );

  drawShadow(ctx, chip, 6);
  drawRoundedRect(ctx, chip, 999, tintFor(worker.state), color, 1.4);

  const dotCx = chip.x + 8 + dotR;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(dotCx, chip.y + chip.height / 2, dotR, 0, TAU);
  ctx.fill();
  drawText(
    ctx,
    worker.glyph,
    dotCx,
    chip.y + chip.height / 2 + (compact ? 3 : 4),
    {
      align: "center",
      color: COLORS.panel,
      font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
    },
  );
  drawText(ctx, word, dotCx + dotR + 6, chip.y + chip.height / 2 + 4, {
    color,
    font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
  });
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  act: ActSnapshot,
  compact: boolean,
) {
  if (act.timeout.active) {
    drawTimeoutMeter(ctx, box, act, compact);
    return;
  }

  if (act.footerProgress) {
    drawFooterProgress(ctx, box, act.footerProgress, compact);
    return;
  }

  if (act.showFootnote) {
    const accent = act.kind === "workflow-task" ? COLORS.green : COLORS.gold;
    ctx.beginPath();
    ctx.fillStyle = accent;
    ctx.arc(box.x + 4, box.y + box.height / 2, 3.5, 0, TAU);
    ctx.fill();
    drawText(ctx, act.footnote, box.x + 14, box.y + box.height / 2 + 4, {
      color: COLORS.muted,
      font: `700 ${compact ? 10 : 11}px ${UI_FONT}`,
      maxWidth: box.width - 16,
    });
  }
}

function drawFooterProgress(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  progress: FooterProgress,
  compact: boolean,
) {
  const accent = progressColor(progress.tone);
  const textY = box.y + 11;

  ctx.beginPath();
  ctx.fillStyle = accent;
  ctx.arc(box.x + 4, textY - 4, 3.5, 0, TAU);
  ctx.fill();
  drawText(ctx, progress.label, box.x + 14, textY, {
    color: accent,
    font: `800 ${compact ? 10 : 11}px ${UI_FONT}`,
    maxWidth: box.width - 16,
  });

  const track = rect(box.x + 14, box.y + box.height - 6, box.width - 14, 4);
  drawRoundedRect(ctx, track, 999, COLORS.shell, COLORS.line, 1);
  drawRoundedRect(
    ctx,
    rect(track.x, track.y, track.width * progress.value, track.height),
    999,
    progressTint(progress.tone),
    accent,
    1,
  );
}

function drawTimeoutMeter(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  act: ActSnapshot,
  compact: boolean,
) {
  const label = act.attempt
    ? `${act.timeout.label} · attempt ${act.attempt}`
    : act.timeout.label;
  drawText(ctx, label, box.x, box.y + 2, {
    color: COLORS.gold,
    font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
    maxWidth: box.width - 44,
  });
  drawText(
    ctx,
    `${Math.round(act.timeout.remaining * 100)}%`,
    box.x + box.width,
    box.y + 2,
    {
      align: "right",
      color: COLORS.gold,
      font: `800 ${compact ? 9 : 10}px ${MONO_FONT}`,
    },
  );

  const barHeight = 8;
  const bar = rect(
    box.x,
    box.y + box.height - barHeight - 2,
    box.width,
    barHeight,
  );
  drawRoundedRect(ctx, bar, 999, COLORS.shell, COLORS.line, 1);
  const fillWidth = Math.max(0, bar.width * act.timeout.remaining);
  if (fillWidth > 3) {
    drawRoundedRect(
      ctx,
      rect(bar.x, bar.y, fillWidth, bar.height),
      999,
      COLORS.goldSoft,
      COLORS.gold,
      1.2,
    );
  }
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: CrashSnapshot,
  compact: boolean,
) {
  drawRoundedRect(ctx, box, 8, "rgb(255 255 255 / 78%)", COLORS.line, 1);

  const activeAct =
    snapshot.activeAct === "workflow-task"
      ? snapshot.workflowTask
      : snapshot.activity;
  const dot = captionColor(activeAct.kind, activeAct.phase);

  ctx.beginPath();
  ctx.fillStyle = dot;
  ctx.arc(box.x + 16, box.y + box.height / 2, 4.5, 0, TAU);
  ctx.fill();

  const textX = box.x + 30;
  const maxWidth = box.x + box.width - 14 - textX;
  const lines = wrapText(
    ctx,
    snapshot.caption,
    `700 ${compact ? 12 : 13}px ${UI_FONT}`,
    maxWidth,
    compact ? 3 : 2,
  );
  const lineHeight = compact ? 16 : 18;
  const startY =
    box.y + box.height / 2 - ((lines.length - 1) * lineHeight) / 2 + 4;
  lines.forEach((line, index) => {
    drawText(ctx, line, textX, startY + index * lineHeight, {
      color: COLORS.ink,
      font: `700 ${compact ? 12 : 13}px ${UI_FONT}`,
    });
  });
}

function drawPhaseCap(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  accent: string,
) {
  ctx.save();
  roundedPath(ctx, box, 10);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(box.x, box.y, 4, box.height);
  ctx.restore();
}

function actAccent(act: ActSnapshot): string {
  if (act.phase === "idle") return COLORS.line;
  if (act.phase === "waiting") return COLORS.gold;
  if (act.phase === "publishing" || act.phase === "complete")
    return COLORS.green;
  return COLORS.blue;
}

function rowPalette(row: EventRow): {
  fill: string;
  stroke: string;
  accent: string;
} {
  if (row.orphaned) {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold, accent: COLORS.gold };
  }
  if (row.pending) {
    return { fill: COLORS.blueSoft, stroke: COLORS.blue, accent: COLORS.blue };
  }
  if (row.tone === "success") {
    return {
      fill: COLORS.greenSoft,
      stroke: COLORS.green,
      accent: COLORS.green,
    };
  }
  if (row.tone === "timeout") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold, accent: COLORS.gold };
  }
  if (row.newest) {
    return { fill: COLORS.blueSoft, stroke: COLORS.blue, accent: COLORS.blue };
  }
  return { fill: COLORS.rowRest, stroke: COLORS.line, accent: COLORS.muted };
}

function workerColor(state: WorkerState): string {
  if (state === "crashed") return COLORS.red;
  if (state === "running" || state === "retrying") return COLORS.blue;
  return COLORS.green;
}

function tintFor(state: WorkerState): string {
  if (state === "crashed") return COLORS.redSoft;
  if (state === "running" || state === "retrying") return COLORS.blueSoft;
  return COLORS.greenSoft;
}

function progressColor(tone: ProgressTone): string {
  if (tone === "gold") return COLORS.gold;
  if (tone === "green") return COLORS.green;
  return COLORS.blue;
}

function progressTint(tone: ProgressTone): string {
  if (tone === "gold") return COLORS.goldSoft;
  if (tone === "green") return COLORS.greenSoft;
  return COLORS.blueSoft;
}

function workerWord(state: WorkerState): string {
  if (state === "crashed") return "crashed";
  if (state === "running") return "running";
  if (state === "replaying") return "replaying";
  if (state === "retrying") return "retrying";
  if (state === "completing") return "completing";
  if (state === "resumed") return "resumed";
  return "done";
}

function captionColor(
  kind: ActSnapshot["kind"],
  phase: ActSnapshot["phase"],
): string {
  if (phase === "waiting") return COLORS.gold;
  if (phase === "publishing") return COLORS.green;
  if (phase === "complete")
    return kind === "workflow-task" ? COLORS.green : COLORS.gold;
  return COLORS.blue;
}

function tagWidth(ctx: CanvasRenderingContext2D, tag: string): number {
  ctx.font = `800 10px ${UI_FONT}`;
  return ctx.measureText(tag).width + 18;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  ctx.font = font;
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  // Whatever is left lands on the final line, ellipsized by the caller's width.
  const consumed = lines.join(" ");
  const remainder = text.slice(consumed.length).trim();
  lines.push(remainder || current);
  return lines.slice(0, maxLines);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  options: { fill: string; stroke: string; color: string },
) {
  ctx.font = `800 10px ${UI_FONT}`;
  const width = ctx.measureText(label).width + 18;
  const badge = rect(x, y, width, 22);
  drawRoundedRect(ctx, badge, 999, options.fill, options.stroke, 1);
  drawText(ctx, label, x + 9, y + 15, {
    color: options.color,
    font: `800 10px ${UI_FONT}`,
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

function drawDashedRoundedRect(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  radius: number,
  fill: string,
  stroke: string,
) {
  roundedPath(ctx, box, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 4]);
  roundedPath(ctx, box, radius);
  ctx.stroke();
  ctx.restore();
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

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}
