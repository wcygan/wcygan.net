import {
  type ActivityKey,
  type ActivitySnapshot,
  type ActivitiesSnapshot,
  clamp,
  type PacketSnapshot,
  type WorkflowSnapshot,
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

const ACTIVITY_ORDER: ActivityKey[] = [
  "reserveSeat",
  "chargeCard",
  "confirmSeat",
  "sendItinerary",
];

export function drawWorkflowActivitiesDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: ActivitiesSnapshot,
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
  snapshot: ActivitiesSnapshot,
  width: number,
  height: number,
) {
  const padding = 20;
  const gap = clampDimension(width * 0.06, 40, 96);
  const workflowWidth = clampDimension(width * 0.3, 220, 290);
  const activityWidth = width - padding * 2 - workflowWidth - gap;
  const workflowCard = rect(
    padding,
    Math.max(40, height * 0.5 - 78),
    workflowWidth,
    156,
  );

  const columnX = padding + workflowWidth + gap;
  const cardGap = 14;
  const cardCount = ACTIVITY_ORDER.length;
  const cardHeight =
    (height - padding * 2 - cardGap * (cardCount - 1)) / cardCount;
  const cards = ACTIVITY_ORDER.map((key, index) =>
    rect(
      columnX,
      padding + index * (cardHeight + cardGap),
      activityWidth,
      cardHeight,
    ),
  );

  const workflowPort = rightPort(workflowCard);
  cards.forEach((card) => {
    drawLane(ctx, workflowPort, leftPort(card));
  });

  drawWorkflowCard(ctx, workflowCard, snapshot.workflow, false);
  cards.forEach((card, index) => {
    drawActivityCard(
      ctx,
      card,
      snapshot.activities[ACTIVITY_ORDER[index]],
      false,
    );
  });

  drawPackets(
    ctx,
    snapshot.packets,
    workflowPort,
    cards.map((card) => leftPort(card)),
    false,
  );
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: ActivitiesSnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const workflowHeight = 116;
  const workflowCard = rect(
    padding,
    padding,
    width - padding * 2,
    workflowHeight,
  );

  const stackTop = workflowCard.y + workflowCard.height + 44;
  const cardGap = 12;
  const cardCount = ACTIVITY_ORDER.length;
  const cardHeight =
    (height - stackTop - padding - cardGap * (cardCount - 1)) / cardCount;
  const cards = ACTIVITY_ORDER.map((key, index) =>
    rect(
      padding,
      stackTop + index * (cardHeight + cardGap),
      width - padding * 2,
      cardHeight,
    ),
  );

  const workflowPort = bottomPort(workflowCard);
  cards.forEach((card) => {
    drawLane(ctx, workflowPort, topPort(card));
  });

  drawWorkflowCard(ctx, workflowCard, snapshot.workflow, true);
  cards.forEach((card, index) => {
    drawActivityCard(
      ctx,
      card,
      snapshot.activities[ACTIVITY_ORDER[index]],
      true,
    );
  });

  drawPackets(
    ctx,
    snapshot.packets,
    workflowPort,
    cards.map((card) => topPort(card)),
    true,
  );
}

function drawWorkflowCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  workflow: WorkflowSnapshot,
  compact: boolean,
) {
  const complete = workflow.status === "complete";
  const stroke = complete ? COLORS.green : COLORS.blue;
  const fill = complete ? COLORS.greenSoft : COLORS.blueSoft;

  drawShadow(ctx, card, 12);
  drawRoundedRect(ctx, card, 10, COLORS.panel, stroke, 1.6);

  drawText(ctx, "Workflow", card.x + 16, card.y + 24, {
    color: stroke,
    font: `800 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: card.width - 32,
  });
  drawText(ctx, workflow.fn, card.x + 16, card.y + (compact ? 48 : 50), {
    color: COLORS.ink,
    font: `800 ${compact ? 18 : 20}px ${MONO_FONT}`,
    maxWidth: card.width - 32,
  });
  drawText(ctx, workflow.note, card.x + 16, card.y + (compact ? 68 : 72), {
    color: COLORS.muted,
    font: `600 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: card.width - 32,
  });

  drawProgressDots(
    ctx,
    card.x + 16,
    card.y + card.height - (compact ? 30 : 38),
    workflow.completedCount,
    stroke,
    fill,
  );

  drawBadge(
    ctx,
    card.x + 16,
    card.y + card.height - (compact ? 26 : 24),
    complete
      ? "complete"
      : `${workflow.completedCount}/${ACTIVITY_ORDER.length} done`,
    {
      fill,
      stroke,
      color: stroke,
      maxWidth: card.width - 32,
    },
  );
}

function drawProgressDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  completed: number,
  activeColor: string,
  activeFill: string,
) {
  for (let index = 0; index < ACTIVITY_ORDER.length; index += 1) {
    const filled = index < completed;
    ctx.beginPath();
    ctx.arc(x + 7 + index * 20, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = filled ? activeFill : COLORS.shell;
    ctx.fill();
    ctx.strokeStyle = filled ? activeColor : COLORS.line;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function drawActivityCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  activity: ActivitySnapshot,
  compact: boolean,
) {
  const palette = activityPalette(activity);
  const ring = ringMetrics(card, compact);

  if (activity.status === "working" && activity.pulse > 0) {
    const glow = 0.5 + activity.pulse * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.16 + activity.pulse * 0.22;
    roundedPath(ctx, expand(card, 4 + glow * 4), 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.restore();
  }

  drawShadow(ctx, card, 10);
  drawRoundedRect(ctx, card, 9, COLORS.panel, palette.stroke, 1.5);

  const muted = activity.status === "pending";
  // Leave the ring its own column so text never runs underneath it.
  const textMaxWidth = ring.left - card.x - 28;

  ctx.save();
  ctx.globalAlpha = muted ? 0.6 : 1;

  drawText(ctx, "Activity", card.x + 14, card.y + 22, {
    color: palette.stroke,
    font: `800 ${compact ? 10 : 11}px ${UI_FONT}`,
    maxWidth: textMaxWidth,
  });
  drawText(ctx, activity.label, card.x + 14, card.y + (compact ? 42 : 44), {
    color: COLORS.ink,
    font: `800 ${compact ? 15 : 17}px ${MONO_FONT}`,
    maxWidth: textMaxWidth,
  });
  drawText(ctx, activity.job, card.x + 14, card.y + (compact ? 60 : 64), {
    color: COLORS.muted,
    font: `600 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: textMaxWidth,
  });

  ctx.restore();

  drawWorkRing(ctx, ring, activity, palette);
  drawStatusPill(ctx, card, activity, palette, ring.left);
}

type RingMetrics = { cx: number; cy: number; radius: number; left: number };

function ringMetrics(card: Rect, compact: boolean): RingMetrics {
  const radius = compact ? 19 : 18;
  const cx = card.x + card.width - radius - 16;
  const cy = card.y + card.height / 2;
  return { cx, cy, radius, left: cx - radius };
}

// Circular completion meter: a track plus a gold arc that fills 0..100% while
// the activity works, then settles to a full green ring with a check when done.
function drawWorkRing(
  ctx: CanvasRenderingContext2D,
  ring: RingMetrics,
  activity: ActivitySnapshot,
  palette: { stroke: string; fill: string },
) {
  if (activity.status === "pending") return;

  const { cx, cy, radius } = ring;
  const thickness = 4;

  // A failed attempt reads as a solid red circle with a cross, not a meter.
  if (activity.status === "failed") {
    ctx.save();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = palette.stroke;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawCross(ctx, cx, cy, radius * 0.42, palette.stroke);
    return;
  }

  ctx.save();
  ctx.lineWidth = thickness;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.line;
  ctx.stroke();

  const start = -Math.PI / 2;
  const sweep = Math.PI * 2 * clamp(activity.progress, 0, 1);
  if (sweep > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + sweep);
    ctx.strokeStyle = palette.stroke;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.restore();

  if (activity.status === "done") {
    drawCheck(ctx, cx, cy, radius * 0.5, palette.stroke);
    return;
  }

  const percent = `${Math.round(clamp(activity.progress, 0, 1) * 100)}%`;
  drawText(ctx, percent, cx, cy + 4, {
    align: "center",
    color: palette.stroke,
    font: `800 11px ${UI_FONT}`,
  });
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
  ctx.lineWidth = 2.4;
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
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.55, cy + size * 0.05);
  ctx.lineTo(cx - size * 0.1, cy + size * 0.5);
  ctx.lineTo(cx + size * 0.62, cy - size * 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  activity: ActivitySnapshot,
  palette: { stroke: string; fill: string },
  ringLeft: number,
) {
  const label = activity.resultLabel ?? activity.statusLabel;
  const font = activity.resultLabel
    ? `800 11px ${MONO_FONT}`
    : `800 10px ${UI_FONT}`;
  ctx.font = font;
  const measured = ctx.measureText(label).width + 18;
  // Stop short of the ring column so the pill never tucks under the meter.
  const maxWidth = ringLeft - card.x - 26;
  const width = Math.min(measured, maxWidth);
  const pill = rect(card.x + 14, card.y + card.height - 32, width, 22);

  drawRoundedRect(ctx, pill, 999, palette.fill, palette.stroke, 1);
  drawText(ctx, label, pill.x + 9, pill.y + 15, {
    color: palette.stroke,
    font,
    maxWidth: width - 18,
  });
}

function drawPackets(
  ctx: CanvasRenderingContext2D,
  packets: readonly PacketSnapshot[],
  workflowPort: Point,
  activityPorts: Point[],
  compact: boolean,
) {
  for (const packet of packets) {
    const activityIndex = ACTIVITY_ORDER.indexOf(packet.activity);
    const activityPort = activityPorts[activityIndex];
    const start =
      packet.direction === "to-activity" ? workflowPort : activityPort;
    const end =
      packet.direction === "to-activity" ? activityPort : workflowPort;
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
  const toActivity = packet.direction === "to-activity";
  const isError = packet.tone === "error";
  const stroke = isError ? COLORS.red : toActivity ? COLORS.blue : COLORS.green;
  const fill = isError
    ? COLORS.redSoft
    : toActivity
      ? COLORS.blueSoft
      : COLORS.greenSoft;
  const useMono = !isError && !toActivity;
  const font = `800 ${compact ? 9 : 10}px ${useMono ? MONO_FONT : UI_FONT}`;

  ctx.font = font;
  const width = Math.min(ctx.measureText(packet.label).width + 22, 132);
  const height = compact ? 24 : 26;

  ctx.save();
  ctx.translate(point.x, point.y);
  drawShadow(ctx, rect(-width / 2, -height / 2, width, height), 6);
  drawRoundedRect(
    ctx,
    rect(-width / 2, -height / 2, width, height),
    999,
    fill,
    stroke,
    1.4,
  );
  drawText(ctx, packet.label, 0, -height / 2 + (compact ? 16 : 17), {
    align: "center",
    color: stroke,
    font,
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

function activityPalette(activity: ActivitySnapshot): {
  stroke: string;
  fill: string;
} {
  if (activity.status === "done") {
    return { stroke: COLORS.green, fill: COLORS.greenSoft };
  }
  if (activity.status === "failed") {
    return { stroke: COLORS.red, fill: COLORS.redSoft };
  }
  if (activity.status === "working") {
    return { stroke: COLORS.gold, fill: COLORS.goldSoft };
  }
  // Scheduled: the request is still in flight, so the card reads as "incoming"
  // (blue, matching the schedule packet) rather than already working (gold).
  if (activity.status === "scheduled") {
    return { stroke: COLORS.blue, fill: COLORS.blueSoft };
  }
  return { stroke: COLORS.line, fill: COLORS.shell };
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

function rightPort(box: Rect): Point {
  return { x: box.x + box.width, y: box.y + box.height / 2 };
}

function leftPort(box: Rect): Point {
  return { x: box.x, y: box.y + box.height / 2 };
}

function bottomPort(box: Rect): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height };
}

function topPort(box: Rect): Point {
  return { x: box.x + box.width / 2, y: box.y };
}

function clampDimension(value: number, min: number, max: number) {
  return clamp(value, min, max);
}
