import {
  type ActivityKey,
  type ActivitySnapshot,
  type ActivitiesSnapshot,
  clamp,
  type PacketSnapshot,
  type WorkflowSnapshot,
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
      index + 1,
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
      index + 1,
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

  drawWorkflowProgress(
    ctx,
    card.x + 16,
    card.y + card.height - (compact ? 28 : 32),
    card.width - 32,
    workflow.completedCount,
    complete,
    compact,
  );
}

// Numbered progress track: four nodes on a connector line, each transitioning
// from gray (not yet done) to green (done) so the workflow's advance is legible
// without a separate counter.
function drawWorkflowProgress(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  completed: number,
  complete: boolean,
  compact: boolean,
) {
  const count = ACTIVITY_ORDER.length;
  const radius = compact ? 12 : 13;
  const first = x + radius;
  const last = x + width - radius;
  const span = (last - first) / (count - 1);
  const doneCount = complete ? count : completed;

  // Connector segments live only in the gaps between nodes so the line never
  // crosses a numbered circle. A gap is green once both nodes it joins are done.
  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const gapPad = radius + 3;
  for (let index = 0; index < count - 1; index += 1) {
    const segStart = first + span * index + gapPad;
    const segEnd = first + span * (index + 1) - gapPad;
    ctx.strokeStyle = index + 1 < doneCount ? COLORS.green : COLORS.line;
    ctx.beginPath();
    ctx.moveTo(segStart, y);
    ctx.lineTo(segEnd, y);
    ctx.stroke();
  }
  ctx.restore();

  for (let index = 0; index < count; index += 1) {
    const done = index < doneCount;
    const cx = first + span * index;
    ctx.beginPath();
    ctx.arc(cx, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = done ? COLORS.greenSoft : COLORS.shell;
    ctx.fill();
    ctx.strokeStyle = done ? COLORS.green : COLORS.line;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    drawText(ctx, String(index + 1), cx, y + 4, {
      align: "center",
      color: done ? COLORS.green : COLORS.muted,
      font: `800 ${compact ? 12 : 13}px ${UI_FONT}`,
    });
  }
}

function drawActivityCard(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  activity: ActivitySnapshot,
  step: number,
  compact: boolean,
) {
  const palette = activityPalette(activity);
  const ring = ringMetrics(card, compact);
  const midY = card.y + card.height / 2;

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

  const stepRadius = compact ? 14 : 16;
  const stepCx = card.x + 16 + stepRadius;
  drawStepNumber(ctx, stepCx, midY, stepRadius, step, muted);

  const textLeft = stepCx + stepRadius + (compact ? 14 : 16);

  // Two layouts. Wide cards are short, so identity sits centered between the
  // marker and ring with the status pill on the right rail. Narrow cards are
  // tall, so identity stacks from the top with the pill on its own row below —
  // this gives the label the full width and stops it from being squished into
  // the gap between the pill and the ring.
  if (compact) {
    drawActivityIdentity(ctx, activity, palette, muted, {
      left: textLeft,
      maxWidth: ring.left - textLeft - 14,
      eyebrowY: card.y + 26,
      labelY: card.y + 48,
      jobY: card.y + 68,
      labelSize: 16,
    });
    const pill = statusPillRectLeft(
      ctx,
      activity,
      textLeft,
      card.y + card.height - 32,
      ring.left - textLeft - 14,
    );
    drawStatusPill(ctx, pill, activity, palette);
  } else {
    const pill = statusPillRect(ctx, activity, ring.left, midY);
    drawActivityIdentity(ctx, activity, palette, muted, {
      left: textLeft,
      maxWidth: pill.x - textLeft - 12,
      eyebrowY: midY - 18,
      labelY: midY + 5,
      jobY: midY + 24,
      labelSize: 17,
    });
    drawStatusPill(ctx, pill, activity, palette);
  }

  drawWorkRing(ctx, ring, activity, palette);
}

// Eyebrow, label, and job lines for an activity card. Callers supply the
// baselines so the same identity block serves both the centered wide layout and
// the top-stacked compact layout.
function drawActivityIdentity(
  ctx: CanvasRenderingContext2D,
  activity: ActivitySnapshot,
  palette: { stroke: string; fill: string },
  muted: boolean,
  layout: {
    left: number;
    maxWidth: number;
    eyebrowY: number;
    labelY: number;
    jobY: number;
    labelSize: number;
  },
) {
  ctx.save();
  ctx.globalAlpha = muted ? 0.6 : 1;

  drawText(ctx, "Activity", layout.left, layout.eyebrowY, {
    color: palette.stroke,
    font: `800 ${layout.labelSize >= 17 ? 11 : 10}px ${UI_FONT}`,
    maxWidth: layout.maxWidth,
  });
  drawText(ctx, activity.label, layout.left, layout.labelY, {
    color: COLORS.ink,
    font: `800 ${layout.labelSize}px ${MONO_FONT}`,
    maxWidth: layout.maxWidth,
  });
  drawText(ctx, activity.job, layout.left, layout.jobY, {
    color: COLORS.muted,
    font: `600 12px ${UI_FONT}`,
    maxWidth: layout.maxWidth,
  });

  ctx.restore();
}

// Sequence marker (1..4) showing the order activities run. It stays neutral so
// it reads as ordinal identity; the ring on the right carries live status.
function drawStepNumber(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  step: number,
  muted: boolean,
) {
  ctx.save();
  ctx.globalAlpha = muted ? 0.6 : 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.shell;
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  drawText(ctx, String(step), cx, cy + (radius > 14 ? 5 : 4), {
    align: "center",
    color: COLORS.muted,
    font: `800 ${radius > 14 ? 15 : 13}px ${UI_FONT}`,
  });
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

function statusPillLabel(activity: ActivitySnapshot): {
  label: string;
  font: string;
} {
  const label = activity.resultLabel ?? activity.statusLabel;
  const font = activity.resultLabel
    ? `800 11px ${MONO_FONT}`
    : `800 10px ${UI_FONT}`;
  return { label, font };
}

// Wide layout: the pill hugs the ring's left edge, vertically centered, so
// result text sits in the gap between the activity label and the meter.
function statusPillRect(
  ctx: CanvasRenderingContext2D,
  activity: ActivitySnapshot,
  ringLeft: number,
  midY: number,
): Rect {
  const { label, font } = statusPillLabel(activity);
  ctx.font = font;
  const measured = ctx.measureText(label).width + 18;
  const width = Math.min(measured, 170);
  return rect(ringLeft - 16 - width, midY - 11, width, 22);
}

// Compact layout: the pill anchors to the left under the stacked identity text.
function statusPillRectLeft(
  ctx: CanvasRenderingContext2D,
  activity: ActivitySnapshot,
  x: number,
  y: number,
  maxWidth: number,
): Rect {
  const { label, font } = statusPillLabel(activity);
  ctx.font = font;
  const measured = ctx.measureText(label).width + 18;
  const width = Math.min(measured, maxWidth);
  return rect(x, y, width, 22);
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  pill: Rect,
  activity: ActivitySnapshot,
  palette: { stroke: string; fill: string },
) {
  const { label, font } = statusPillLabel(activity);
  drawRoundedRect(ctx, pill, 999, palette.fill, palette.stroke, 1);
  drawText(ctx, label, pill.x + 9, pill.y + 15, {
    color: palette.stroke,
    font,
    maxWidth: pill.width - 18,
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
