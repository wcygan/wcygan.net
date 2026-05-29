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
  "chargeCard",
  "reserveSeat",
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
  const cardGap = 16;
  const cardHeight = (height - padding * 2 - cardGap * 2) / 3;
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
  const cardHeight = (height - stackTop - padding - cardGap * 2) / 3;
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
    complete ? "complete" : `${workflow.completedCount}/3 done`,
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
  for (let index = 0; index < 3; index += 1) {
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

  ctx.save();
  ctx.globalAlpha = muted ? 0.6 : 1;

  drawText(ctx, "Activity", card.x + 14, card.y + 22, {
    color: palette.stroke,
    font: `800 ${compact ? 10 : 11}px ${UI_FONT}`,
    maxWidth: card.width - 110,
  });
  drawText(ctx, activity.label, card.x + 14, card.y + (compact ? 42 : 44), {
    color: COLORS.ink,
    font: `800 ${compact ? 15 : 17}px ${MONO_FONT}`,
    maxWidth: card.width - 28,
  });
  drawText(ctx, activity.job, card.x + 14, card.y + (compact ? 60 : 64), {
    color: COLORS.muted,
    font: `600 ${compact ? 11 : 12}px ${UI_FONT}`,
    maxWidth: card.width - 28,
  });

  ctx.restore();

  drawStatusPill(ctx, card, activity, palette);
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  activity: ActivitySnapshot,
  palette: { stroke: string; fill: string },
) {
  const label = activity.resultLabel ?? activity.statusLabel;
  const font = activity.resultLabel
    ? `800 11px ${MONO_FONT}`
    : `800 10px ${UI_FONT}`;
  ctx.font = font;
  const measured = ctx.measureText(label).width + 18;
  const maxWidth = card.width - 28;
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
  const stroke = toActivity ? COLORS.blue : COLORS.green;
  const fill = toActivity ? COLORS.blueSoft : COLORS.greenSoft;
  const font = `800 ${compact ? 9 : 10}px ${toActivity ? UI_FONT : MONO_FONT}`;

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
  if (activity.status === "working" || activity.status === "scheduled") {
    return { stroke: COLORS.gold, fill: COLORS.goldSoft };
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
