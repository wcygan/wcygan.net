import {
  clamp,
  type ActivityTrackSnapshot,
  type CrashSnapshot,
  type TaskTrackSnapshot,
  type WorkerTone,
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
  const padding = compact ? (viewport.cssWidth < 360 ? 12 : 14) : 18;
  const gap = compact ? 12 : 16;
  const usableHeight = viewport.cssHeight - padding * 2 - gap;
  const trackHeight = usableHeight / 2;

  const topTrack = rect(
    padding,
    padding,
    viewport.cssWidth - padding * 2,
    trackHeight,
  );
  const bottomTrack = rect(
    padding,
    padding + trackHeight + gap,
    viewport.cssWidth - padding * 2,
    trackHeight,
  );

  drawTaskTrack(ctx, topTrack, snapshot, compact);
  drawActivityTrack(ctx, bottomTrack, snapshot, compact);
}

function drawTaskTrack(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: CrashSnapshot,
  compact: boolean,
) {
  const track = snapshot.task;
  drawTrackShell(ctx, box, track.title, "Workflow Task", compact);

  const body = trackBody(box, compact);
  const layout = workerLayout(body, compact);

  // History strip both Workers read from sits between the two Workers.
  drawHistoryStrip(ctx, layout.middle, track.replayProgress, compact);

  drawWorkerNode(
    ctx,
    layout.left,
    "A",
    track.workerALabel,
    track.workerATone,
    snapshot.crashFlash,
    compact,
  );
  drawWorkerNode(
    ctx,
    layout.right,
    "B",
    track.workerBLabel,
    track.workerBTone,
    0,
    compact,
  );

  drawTrackStatus(
    ctx,
    box,
    track.statusLabel,
    track.outcomeLabel,
    toneColor(statusTone(track)),
    compact,
  );
}

function drawActivityTrack(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: CrashSnapshot,
  compact: boolean,
) {
  const track = snapshot.activity;
  drawTrackShell(ctx, box, track.title, "Activity / side effect", compact);

  const body = trackBody(box, compact);
  const layout = workerLayout(body, compact);

  drawSideEffectTarget(ctx, layout.right, track, compact);
  drawTimeoutGauge(ctx, layout.middle, track, compact);

  drawWorkerNode(
    ctx,
    layout.left,
    track.attempt === 2 ? "R" : "W",
    track.attempt === 2 ? "Worker (retry)" : track.workerLabel,
    track.workerTone,
    snapshot.crashFlash,
    compact,
  );

  drawTrackStatus(
    ctx,
    box,
    track.statusLabel,
    track.outcomeLabel,
    toneColor(activityStatusTone(track)),
    compact,
  );
}

function drawTrackShell(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  title: string,
  tag: string,
  compact: boolean,
) {
  drawShadow(ctx, box, 12);
  drawRoundedRect(ctx, box, 10, COLORS.panel, COLORS.line, 1);

  drawText(ctx, title, box.x + 16, box.y + 24, {
    color: COLORS.ink,
    font: `800 ${compact ? 14 : 16}px ${UI_FONT}`,
    maxWidth: box.width - 32 - (compact ? 0 : 150),
  });
  drawBadge(
    ctx,
    box.x + box.width - tagWidth(ctx, tag, compact),
    box.y + 11,
    tag,
    {
      fill: COLORS.shell,
      stroke: COLORS.line,
      color: COLORS.muted,
    },
  );
}

function tagWidth(
  ctx: CanvasRenderingContext2D,
  tag: string,
  _compact: boolean,
) {
  ctx.font = `800 10px ${UI_FONT}`;
  return ctx.measureText(tag).width + 18 + 16;
}

function trackBody(box: Rect, compact: boolean): Rect {
  const top = box.y + (compact ? 40 : 44);
  const statusReserve = compact ? 40 : 42;
  return rect(
    box.x + 16,
    top,
    box.width - 32,
    box.y + box.height - statusReserve - top,
  );
}

function workerLayout(body: Rect, compact: boolean) {
  const nodeWidth = compact
    ? body.width * 0.27
    : clampDimension(body.width * 0.22, 120, 160);
  const cy = body.y + body.height / 2;
  const left = rect(body.x, cy - nodeWidth * 0.32, nodeWidth, nodeWidth * 0.64);
  const right = rect(
    body.x + body.width - nodeWidth,
    cy - nodeWidth * 0.32,
    nodeWidth,
    nodeWidth * 0.64,
  );
  const middleX = left.x + left.width + 12;
  const middle = rect(
    middleX,
    body.y + 4,
    right.x - 12 - middleX,
    body.height - 8,
  );
  return { left, right, middle, cy };
}

function drawWorkerNode(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  glyph: string,
  label: string,
  tone: WorkerTone,
  crashFlash: number,
  compact: boolean,
) {
  const color = toneColor(tone);
  const fill = toneFill(tone);

  // Crash beat draws a red halo behind a crashing node.
  if (tone === "red" && crashFlash > 0.01) {
    ctx.save();
    ctx.fillStyle = `rgb(190 64 58 / ${0.06 + crashFlash * 0.22})`;
    roundedPath(ctx, expand(box, 6 + crashFlash * 6), 12);
    ctx.fill();
    ctx.restore();
  }

  drawRoundedRect(ctx, box, 10, fill, color, 1.5);

  const dotR = compact ? 13 : 15;
  ctx.fillStyle = color;
  roundedPath(
    ctx,
    rect(box.x + 10, box.y + box.height / 2 - dotR, dotR * 2, dotR * 2),
    dotR,
  );
  ctx.fill();
  drawText(ctx, glyph, box.x + 10 + dotR, box.y + box.height / 2 + 5, {
    align: "center",
    color: COLORS.panel,
    font: `800 ${compact ? 12 : 14}px ${UI_FONT}`,
  });

  const textX = box.x + 10 + dotR * 2 + 8;
  drawText(ctx, label, textX, box.y + box.height / 2 - 3, {
    color: COLORS.ink,
    font: `800 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: box.x + box.width - textX - 6,
  });
  drawText(ctx, toneWord(tone), textX, box.y + box.height / 2 + 14, {
    color,
    font: `700 ${compact ? 9 : 10}px ${UI_FONT}`,
    maxWidth: box.x + box.width - textX - 6,
  });
}

function drawHistoryStrip(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  replayProgress: number,
  compact: boolean,
) {
  const stripHeight = compact ? 30 : 34;
  const strip = rect(
    box.x,
    box.y + box.height / 2 - stripHeight / 2,
    box.width,
    stripHeight,
  );
  // Faint durable Event History strip both Workers read from.
  drawRoundedRect(ctx, strip, 8, COLORS.shell, COLORS.line, 1);

  const events = 6;
  const inset = 8;
  const cellGap = 5;
  const cellWidth = (strip.width - inset * 2 - cellGap * (events - 1)) / events;
  const filled = Math.round(replayProgress * events);
  for (let i = 0; i < events; i += 1) {
    const cell = rect(
      strip.x + inset + i * (cellWidth + cellGap),
      strip.y + 7,
      cellWidth,
      strip.height - 14,
    );
    const scanned = i < filled;
    drawRoundedRect(
      ctx,
      cell,
      3,
      scanned ? COLORS.greenSoft : COLORS.panel,
      scanned ? COLORS.green : COLORS.line,
      1,
    );
  }

  drawText(ctx, "Event History", box.x, strip.y - 8, {
    color: COLORS.muted,
    font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
    maxWidth: box.width,
  });
  drawText(
    ctx,
    replayProgress > 0 ? "replay" : "durable",
    box.x + box.width,
    strip.y - 8,
    {
      align: "right",
      color: replayProgress > 0 ? toneColor("green") : COLORS.muted,
      font: `800 ${compact ? 9 : 10}px ${MONO_FONT}`,
      maxWidth: box.width,
    },
  );
}

function drawTimeoutGauge(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  track: ActivityTrackSnapshot,
  compact: boolean,
) {
  const barHeight = compact ? 14 : 16;
  const bar = rect(
    box.x,
    box.y + box.height / 2 - barHeight / 2,
    box.width,
    barHeight,
  );

  drawText(ctx, "start-to-close timeout", box.x, bar.y - 8, {
    color: COLORS.muted,
    font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
    maxWidth: box.width,
  });

  drawRoundedRect(ctx, bar, 999, COLORS.shell, COLORS.line, 1);

  if (track.timeoutActive) {
    // Draining countdown bar in gold.
    const fillWidth = Math.max(0, bar.width * track.timeoutRemaining);
    if (fillWidth > 4) {
      drawRoundedRect(
        ctx,
        rect(bar.x, bar.y, fillWidth, bar.height),
        999,
        COLORS.goldSoft,
        COLORS.gold,
        1.4,
      );
    }
    drawText(
      ctx,
      `${Math.round(track.timeoutRemaining * 100)}%`,
      box.x + box.width,
      bar.y - 8,
      {
        align: "right",
        color: toneColor("gold"),
        font: `800 ${compact ? 9 : 10}px ${MONO_FONT}`,
        maxWidth: box.width,
      },
    );
    drawText(
      ctx,
      "waiting it out",
      box.x + box.width / 2,
      bar.y + bar.height + 16,
      {
        align: "center",
        color: toneColor("gold"),
        font: `700 ${compact ? 9 : 10}px ${UI_FONT}`,
        maxWidth: box.width,
      },
    );
    return;
  }

  if (track.attempt === 2) {
    drawText(ctx, "elapsed", box.x + box.width, bar.y - 8, {
      align: "right",
      color: toneColor("blue"),
      font: `800 ${compact ? 9 : 10}px ${MONO_FONT}`,
      maxWidth: box.width,
    });
    // Arrow back: retry re-dispatches toward the Worker.
    drawArrow(ctx, rightOf(bar), leftOf(bar), toneColor("blue"));
    drawText(
      ctx,
      "retry dispatch",
      box.x + box.width / 2,
      bar.y + bar.height + 16,
      {
        align: "center",
        color: toneColor("blue"),
        font: `700 ${compact ? 9 : 10}px ${UI_FONT}`,
        maxWidth: box.width,
      },
    );
    return;
  }

  // Running / crashed: a forward call arrow toward the side effect.
  drawArrow(ctx, leftOf(bar), rightOf(bar), COLORS.muted);
  drawText(
    ctx,
    track.status === "crashed" ? "call lost?" : "invoke",
    box.x + box.width / 2,
    bar.y + bar.height + 16,
    {
      align: "center",
      color: track.status === "crashed" ? toneColor("red") : COLORS.muted,
      font: `700 ${compact ? 9 : 10}px ${UI_FONT}`,
      maxWidth: box.width,
    },
  );
}

function drawSideEffectTarget(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  track: ActivityTrackSnapshot,
  compact: boolean,
) {
  const hit =
    track.status === "running" || track.status === "retrying"
      ? toneColor("blue")
      : track.status === "timing-out"
        ? toneColor("gold")
        : toneColor("red");
  const fill =
    track.status === "running" || track.status === "retrying"
      ? COLORS.blueSoft
      : track.status === "timing-out"
        ? COLORS.goldSoft
        : COLORS.redSoft;

  drawRoundedRect(ctx, box, 10, fill, hit, 1.5);
  drawText(ctx, "External system", box.x + 12, box.y + box.height / 2 - 3, {
    color: COLORS.ink,
    font: `800 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: box.width - 24,
  });
  drawText(
    ctx,
    track.status === "crashed" ? "effect unknown" : "side effect",
    box.x + 12,
    box.y + box.height / 2 + 14,
    {
      color: hit,
      font: `700 ${compact ? 9 : 10}px ${MONO_FONT}`,
      maxWidth: box.width - 24,
    },
  );
}

function drawTrackStatus(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  statusLabel: string,
  outcomeLabel: string,
  accent: string,
  compact: boolean,
) {
  const y = box.y + box.height - (compact ? 14 : 15);
  ctx.fillStyle = accent;
  roundedPath(ctx, rect(box.x + 16, y - 7, 7, 7), 3);
  ctx.fill();
  drawText(ctx, statusLabel, box.x + 30, y, {
    color: COLORS.ink,
    font: `700 ${compact ? 10 : 12}px ${UI_FONT}`,
    maxWidth: box.width - 30 - 120,
  });
  drawText(ctx, outcomeLabel, box.x + box.width - 16, y, {
    align: "right",
    color: accent,
    font: `800 ${compact ? 9 : 11}px ${MONO_FONT}`,
    maxWidth: 150,
  });
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const dir = to.x >= from.x ? 1 : -1;
  const head = 6;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - dir * head, to.y - head * 0.7);
  ctx.lineTo(to.x - dir * head, to.y + head * 0.7);
  ctx.closePath();
  ctx.fill();
}

function statusTone(track: TaskTrackSnapshot): WorkerTone {
  if (track.status === "crashed") return "red";
  if (track.status === "processing") return "blue";
  return "green";
}

function activityStatusTone(track: ActivityTrackSnapshot): WorkerTone {
  if (track.status === "crashed") return "red";
  if (track.status === "timing-out") return "gold";
  if (track.status === "retrying") return "blue";
  return "blue";
}

function toneColor(tone: WorkerTone) {
  if (tone === "red") return COLORS.red;
  if (tone === "gold") return COLORS.gold;
  if (tone === "green") return COLORS.green;
  if (tone === "idle") return COLORS.muted;
  return COLORS.blue;
}

function toneFill(tone: WorkerTone) {
  if (tone === "red") return COLORS.redSoft;
  if (tone === "gold") return COLORS.goldSoft;
  if (tone === "green") return COLORS.greenSoft;
  if (tone === "idle") return COLORS.shell;
  return COLORS.blueSoft;
}

function toneWord(tone: WorkerTone) {
  if (tone === "red") return "crashed";
  if (tone === "gold") return "waiting";
  if (tone === "green") return "recovering";
  if (tone === "idle") return "standby";
  return "healthy";
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

function expand(box: Rect, amount: number): Rect {
  return rect(
    box.x - amount,
    box.y - amount,
    box.width + amount * 2,
    box.height + amount * 2,
  );
}

function leftOf(box: Rect): Point {
  return { x: box.x, y: box.y + box.height / 2 };
}

function rightOf(box: Rect): Point {
  return { x: box.x + box.width, y: box.y + box.height / 2 };
}

function clampDimension(value: number, min: number, max: number) {
  return clamp(value, min, max);
}
