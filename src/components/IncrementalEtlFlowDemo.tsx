// Animated explainer for the "Incremental ETL" section of the CDC post.
//
// Concept: one row update in the upstream MySQL database propagates end-to-end
// through LinkedIn's incremental-ETL path. Brooklin captures the change, emits a
// CDC event to Kafka, Gobblin consumes it, and the change lands in an Opal table
// on HDFS, keeping the offline copy in sync with the source.
//
// Invariant: a stage can only light up after the previous stage hands the event
// off. The record travels strictly in order along one axis. Endpoints (MySQL,
// Opal) turn green when their stored value changes; transport stages glow blue
// while carrying the event; a gold pulse marks each arrival.
//
// Visual form: a vertical pipeline. A MySQL cylinder, three transport cards
// (Brooklin, Kafka, Gobblin), and an Opal table stack top to bottom connected
// by pipes. An UPDATE card kicks things off; a gold "id 42 · free -> pro" CDC
// event pill travels the pipes; MySQL and the Opal row both flip free -> pro.
//
// Tier: interactive canvas, time-driven loop, no controls. Single file because
// every frame is a pure function of the loop phase, like its sibling demos. The
// column is always vertical so it reads the same on phones and desktop; the
// canvas is a fixed-height portrait centered in the figure.
import { useEffect, useRef } from "react";

const LOOP_MS = 14000;

// Phase milestones (fractions of the loop).
const WRITE_IN_START = 0.03; // UPDATE card drifts toward MySQL
const COMMIT_PHASE = 0.17; // MySQL commits the update (free -> pro)
const COMMIT_FADE = 0.06;
const WRITE_SETTLE = 0.07; // UPDATE card fades after the commit

// Phase at which the event reaches each stage. The event is emitted from MySQL
// at ARRIVALS[0] and travels the connecting pipe to each subsequent stage.
const ARRIVALS = [0.25, 0.41, 0.55, 0.69, 0.85] as const;
const LAND_FADE = 0.06; // Opal row flips free -> pro on arrival
const ACTIVATE_FADE = 0.05; // transport stage glow ramp
const HOLD_END = 0.94; // whole pipeline lit, then reset
const PULSE_WINDOW = 0.12; // gold "event received" pulse width
const TOKEN_FADE = 0.03; // event pill fades in on emit and out as it lands

// MySQL pulses when it commits the change; every other stage pulses the moment
// the event arrives at it.
const PULSE_AT = [
  COMMIT_PHASE,
  ARRIVALS[1],
  ARRIVALS[2],
  ARRIVALS[3],
  ARRIVALS[4],
] as const;

const UI_FONT =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO_FONT =
  '"Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const COLORS = {
  ink: "#172033",
  muted: "#5c667a",
  line: "#d9deea",
  shell: "#eef1f7",
  panel: "#ffffff",
  blue: "#2f69f0",
  blueSoft: "rgba(47, 105, 240, 0.1)",
  gold: "#d59b24",
  goldGlow: "rgba(213, 155, 36, 0.3)",
  green: "#1d8b65",
  shadow: "rgba(23, 32, 51, 0.12)",
};

const IDLE_TOES = {
  background: "#323232",
  brightBlack: "#606060",
  foreground: "#eeeeec",
  blue: "#4099ff",
  green: "#7fe173",
  yellow: "#ffc66d",
};

type Rgb = readonly [number, number, number];

const FREE_FILL: Rgb = [255, 255, 255];
const PRO_FILL: Rgb = [29, 139, 101];
const FREE_STROKE: Rgb = [217, 222, 234];
const PRO_STROKE: Rgb = [15, 95, 68];
const CARD_STROKE: Rgb = [217, 222, 234];
const BLUE_STROKE: Rgb = [47, 105, 240];
const MUTED_RGB: Rgb = [92, 102, 122];
const BLUE_RGB: Rgb = [47, 105, 240];

type StageKind = "db" | "card" | "table";

type Stage = {
  id: string;
  name: string;
  role: string;
  kind: StageKind;
};

// MySQL and Opal are the endpoints whose stored value changes; the three middle
// stages are transports that carry the event.
const STAGES: readonly Stage[] = [
  { id: "mysql", name: "MySQL", role: "Upstream", kind: "db" },
  { id: "brooklin", name: "Brooklin", role: "Capture", kind: "card" },
  { id: "kafka", name: "Kafka", role: "Stream", kind: "card" },
  { id: "gobblin", name: "Gobblin", role: "Ingest", kind: "card" },
  { id: "opal", name: "Opal", role: "Data lake", kind: "table" },
];

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOut(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function mixColor(from: Rgb, to: Rgb, amount: number) {
  const t = clamp(amount, 0, 1);
  const r = Math.round(mix(from[0], to[0], t));
  const g = Math.round(mix(from[1], to[1], t));
  const b = Math.round(mix(from[2], to[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

// --- derived model -------------------------------------------------------
// Everything visible in a frame is a pure function of the loop phase.

type Frame = {
  reset: number; // 1 while the loop fades back to its initial state
  commit: number; // MySQL free -> pro
  land: number; // Opal row free -> pro
  // transport stages keyed by index (1..3): how lit each is, 0..1
  transport: (i: number) => number;
  pulse: (i: number) => number; // gold arrival pulse for stage i
  token: {
    visible: boolean;
    segment: number;
    progress: number;
    opacity: number;
  };
  operation: {
    visible: boolean;
    label: "Produce" | "Consume";
    opacity: number;
    progress: number;
  } | null;
  write: { visible: boolean; opacity: number; travel: number };
};

function pulseAt(at: number, phase: number) {
  const since = (phase - at) / PULSE_WINDOW;
  return since < 0 || since > 1 ? 0 : Math.sin(since * Math.PI);
}

function operationForPhase(phase: number, reset: number): Frame["operation"] {
  if (reset > 0) return null;

  const operations = [
    { label: "Produce" as const, start: ARRIVALS[1], end: ARRIVALS[2] },
    { label: "Consume" as const, start: ARRIVALS[2], end: ARRIVALS[3] },
  ];

  const active = operations.find(
    (operation) => phase >= operation.start && phase <= operation.end,
  );
  if (!active) return null;

  const progress = clamp(
    (phase - active.start) / (active.end - active.start),
    0,
    1,
  );
  const fadeIn = easeOut(clamp(progress / 0.18, 0, 1));
  const fadeOut = easeOut(clamp((1 - progress) / 0.18, 0, 1));

  return {
    visible: true,
    label: active.label,
    opacity: Math.min(fadeIn, fadeOut),
    progress,
  };
}

function deriveFrame(phase: number): Frame {
  const reset =
    phase >= HOLD_END
      ? easeInOut(clamp((phase - HOLD_END) / (1 - HOLD_END), 0, 1))
      : 0;

  const committedNow = easeInOut(
    clamp((phase - COMMIT_PHASE) / COMMIT_FADE, 0, 1),
  );
  const landedNow = easeInOut(clamp((phase - ARRIVALS[4]) / LAND_FADE, 0, 1));

  // During the reset window the lit state fades from 1 back to 0.
  const commit = reset > 0 ? 1 - reset : committedNow;
  const land = reset > 0 ? 1 - reset : landedNow;

  const transport = (i: number) => {
    if (reset > 0) return 1 - reset;
    return easeInOut(clamp((phase - ARRIVALS[i]) / ACTIVATE_FADE, 0, 1));
  };

  const pulse = (i: number) => (reset > 0 ? 0 : pulseAt(PULSE_AT[i], phase));

  // Locate the event token on its current pipe segment.
  let segment = 0;
  for (let i = 0; i < ARRIVALS.length - 1; i++) {
    if (phase >= ARRIVALS[i]) segment = i;
  }
  const segSpan = ARRIVALS[segment + 1] - ARRIVALS[segment];
  const tokenVisible =
    reset === 0 && phase >= ARRIVALS[0] && phase <= ARRIVALS[4];
  const fadeIn = clamp((phase - ARRIVALS[0]) / TOKEN_FADE, 0, 1);
  const fadeOut =
    1 - clamp((phase - (ARRIVALS[4] - TOKEN_FADE)) / TOKEN_FADE, 0, 1);
  const token = {
    visible: tokenVisible,
    segment,
    progress: easeInOut(clamp((phase - ARRIVALS[segment]) / segSpan, 0, 1)),
    opacity: Math.min(fadeIn, fadeOut),
  };
  const operation = operationForPhase(phase, reset);

  const writeVisible =
    phase >= WRITE_IN_START && phase < COMMIT_PHASE + WRITE_SETTLE;
  const writeFade = easeOut(clamp((phase - COMMIT_PHASE) / WRITE_SETTLE, 0, 1));
  const write = {
    visible: writeVisible && reset === 0,
    opacity: phase < COMMIT_PHASE ? 1 : 1 - writeFade,
    travel: easeInOut(
      clamp((phase - WRITE_IN_START) / (COMMIT_PHASE - WRITE_IN_START), 0, 1),
    ),
  };

  return { reset, commit, land, transport, pulse, token, operation, write };
}

// --- layout --------------------------------------------------------------

type Layout = {
  nodeW: number;
  nodeH: number;
  positions: Point[];
};

// The pipeline is always a vertical column, so it reads the same on phones and
// desktop; the canvas is a fixed-height portrait centered in the figure. Stages
// are evenly spaced down the column with room reserved up top for the UPDATE
// card that kicks things off.
function computeLayout(width: number, height: number): Layout {
  const count = STAGES.length;
  const nodeW = clamp(width * 0.72, 200, 300);
  const nodeH = clamp((height - 96) / count - 18, 60, 92);
  const topPad = 78;
  const firstY = topPad + nodeH / 2;
  const lastY = height - 18 - nodeH / 2;
  const step = (lastY - firstY) / (count - 1);
  const positions = STAGES.map((_, i) => ({
    x: width / 2,
    y: firstY + step * i,
  }));
  return { nodeW, nodeH, positions };
}

function portOut(p: Point, layout: Layout): Point {
  return { x: p.x, y: p.y + layout.nodeH / 2 };
}

function portIn(p: Point, layout: Layout): Point {
  return { x: p.x, y: p.y - layout.nodeH / 2 };
}

// --- canvas helpers ------------------------------------------------------

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { align?: CanvasTextAlign; color: string; font: string },
) {
  ctx.fillStyle = options.color;
  ctx.font = options.font;
  ctx.textAlign = options.align ?? "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

// One continuous vertical spine runs through every stage (behind the cards).
// The gray track is drawn full length; the blue portion grows downward to the
// event's current position, so the connector reads as a single solid line that
// turns blue as the change flows through.
function drawSpine(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
  color: string,
) {
  if (bottom <= top) return;
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
}

// Small green/white pill showing the row's plan value, cross-fading free -> pro.
function drawPlanBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  committed: number,
) {
  const width = 50;
  const height = 18;
  roundedRect(ctx, cx - width / 2, cy - height / 2, width, height, height / 2);
  ctx.fillStyle = mixColor(FREE_FILL, PRO_FILL, committed);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = mixColor(FREE_STROKE, PRO_STROKE, committed);
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 1 - committed;
  drawText(ctx, "free", cx, cy + 0.5, {
    color: COLORS.ink,
    font: `700 11px ${MONO_FONT}`,
  });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = committed;
  drawText(ctx, "pro", cx, cy + 0.5, {
    color: COLORS.panel,
    font: `700 11px ${MONO_FONT}`,
  });
  ctx.restore();
}

// Gold halo that blooms as the CDC event lands on a stage.
function drawArrivalPulse(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  pulse: number,
) {
  if (pulse <= 0) return;
  ctx.save();
  ctx.globalAlpha = pulse * 0.5;
  const grow = 4 + pulse * 8;
  roundedRect(
    ctx,
    left - grow,
    top - grow,
    width + grow * 2,
    height + grow * 2,
    14,
  );
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.restore();
}

function drawCylinder(
  ctx: CanvasRenderingContext2D,
  center: Point,
  width: number,
  height: number,
  committed: number,
  pulse: number,
) {
  const bodyW = clamp(width * 0.34, 92, 118);
  const bodyH = clamp(height * 0.78, 52, 74);
  const left = center.x - bodyW / 2;
  const ellipseH = clamp(bodyH * 0.28, 14, 20);
  const topY = center.y - bodyH / 2 + ellipseH / 2;
  const bottomY = center.y + bodyH / 2 - ellipseH / 2;

  drawArrivalPulse(ctx, left, center.y - bodyH / 2, bodyW, bodyH, pulse);

  const fill = mixColor(FREE_FILL, PRO_FILL, committed);
  const stroke = mixColor(FREE_STROKE, PRO_STROKE, committed);

  ctx.fillStyle = fill;
  ctx.fillRect(left, topY, bodyW, bottomY - topY);
  ctx.beginPath();
  ctx.ellipse(center.x, topY, bodyW / 2, ellipseH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(center.x, bottomY, bodyW / 2, ellipseH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.ellipse(center.x, topY, bodyW / 2, ellipseH / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left, topY);
  ctx.lineTo(left, bottomY);
  ctx.moveTo(left + bodyW, topY);
  ctx.lineTo(left + bodyW, bottomY);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(center.x, bottomY, bodyW / 2, ellipseH / 2, 0, 0, Math.PI);
  ctx.stroke();

  drawPlanBadge(ctx, center.x, center.y + 1, committed);
  drawText(ctx, "MySQL", center.x, center.y + bodyH / 2 + 16, {
    color: COLORS.ink,
    font: `800 13px ${UI_FONT}`,
  });
  drawText(ctx, "users", center.x, center.y + bodyH / 2 + 31, {
    color: COLORS.muted,
    font: `600 11px ${MONO_FONT}`,
  });
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  center: Point,
  width: number,
  height: number,
  active: number,
  pulse: number,
) {
  const cardW = clamp(width, 200, 300);
  const cardH = clamp(height * 0.64, 54, 66);
  const left = center.x - cardW / 2;
  const top = center.y - cardH / 2;

  drawArrivalPulse(ctx, left, top, cardW, cardH, pulse);

  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = mix(8, 16, active);
  ctx.shadowOffsetY = 4;
  roundedRect(ctx, left, top, cardW, cardH, 10);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.restore();

  // Soft blue wash while the stage is carrying the event.
  if (active > 0.02) {
    ctx.save();
    ctx.globalAlpha = active;
    roundedRect(ctx, left, top, cardW, cardH, 10);
    ctx.fillStyle = COLORS.blueSoft;
    ctx.fill();
    ctx.restore();
  }

  ctx.lineWidth = 1.6 + active * 0.6;
  ctx.strokeStyle = mixColor(CARD_STROKE, BLUE_STROKE, active);
  roundedRect(ctx, left, top, cardW, cardH, 10);
  ctx.stroke();

  drawText(ctx, stage.role.toUpperCase(), center.x, top + cardH * 0.32, {
    color: mixColor(MUTED_RGB, BLUE_RGB, active),
    font: `800 9px ${UI_FONT}`,
  });
  drawText(ctx, stage.name, center.x, top + cardH * 0.64, {
    color: COLORS.ink,
    font: `800 15px ${UI_FONT}`,
  });
}

// Opal renders as a one-row table on HDFS; its plan cell flips free -> pro when
// the event lands, mirroring the source row in MySQL.
function drawTable(
  ctx: CanvasRenderingContext2D,
  center: Point,
  width: number,
  height: number,
  landed: number,
  pulse: number,
) {
  const cardW = clamp(width * 0.82, 200, 250);
  const cardH = clamp(height * 0.7, 58, 72);
  const left = center.x - cardW / 2;
  const top = center.y - cardH / 2;

  drawArrivalPulse(ctx, left, top, cardW, cardH, pulse);

  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  roundedRect(ctx, left, top, cardW, cardH, 10);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = COLORS.line;
  roundedRect(ctx, left, top, cardW, cardH, 10);
  ctx.stroke();

  const padX = 14;
  const headerY = top + 14;
  const rowY = top + cardH - 16;
  // Two centered columns so the single row reads as a balanced little table
  // rather than hugging the left edge of a wide card.
  const idX = left + cardW * 0.3;
  const planX = left + cardW * 0.66;

  drawText(ctx, "id", idX, headerY, {
    color: COLORS.muted,
    font: `800 9px ${UI_FONT}`,
  });
  drawText(ctx, "plan", planX, headerY, {
    color: COLORS.muted,
    font: `800 9px ${UI_FONT}`,
  });

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left + padX, top + cardH * 0.42);
  ctx.lineTo(left + cardW - padX, top + cardH * 0.42);
  ctx.stroke();

  drawText(ctx, "42", idX, rowY, {
    color: COLORS.ink,
    font: `700 13px ${MONO_FONT}`,
  });
  drawPlanBadge(ctx, planX, rowY, landed);

  drawText(ctx, "Opal · HDFS", center.x, center.y + cardH / 2 + 16, {
    color: COLORS.ink,
    font: `800 13px ${UI_FONT}`,
  });
}

// The before -> after value the event carries, centered with the new value
// emphasized so the change itself is legible, not just the row id.
function drawBeforeAfter(ctx: CanvasRenderingContext2D, y: number) {
  const before = "free";
  const arrow = " → ";
  const after = "pro";
  const beforeFont = `700 12px ${MONO_FONT}`;
  const afterFont = `800 12px ${MONO_FONT}`;

  ctx.font = beforeFont;
  const wBefore = ctx.measureText(before).width;
  const wArrow = ctx.measureText(arrow).width;
  ctx.font = afterFont;
  const wAfter = ctx.measureText(after).width;

  let cursor = -(wBefore + wArrow + wAfter) / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.font = beforeFont;
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.fillText(before, cursor, y);
  cursor += wBefore;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillText(arrow, cursor, y);
  cursor += wArrow;
  ctx.font = afterFont;
  ctx.fillStyle = COLORS.panel;
  ctx.fillText(after, cursor, y);
}

// The CDC event in flight: a gold pill naming the changed row and the value it
// carries (free -> pro), with a soft halo and shadow so it reads as the active
// event (matching the sibling CDC demos). It fades in on emit and out as it
// lands.
function drawToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opacity: number,
) {
  const width = 110;
  const height = 38;

  ctx.save();
  ctx.globalAlpha = clamp(opacity, 0, 1);
  ctx.translate(x, y);

  ctx.fillStyle = COLORS.goldGlow;
  roundedRect(ctx, -width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 13);
  ctx.fill();

  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  roundedRect(ctx, -width / 2, -height / 2, width, height, 10);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.shadowColor = "transparent";

  drawText(ctx, "users · id 42", 0, -height / 2 + 11, {
    color: "rgba(255, 255, 255, 0.85)",
    font: `800 8px ${UI_FONT}`,
  });
  drawBeforeAfter(ctx, height / 2 - 12);
  ctx.restore();
}

function drawOperationCallout(
  ctx: CanvasRenderingContext2D,
  label: "Produce" | "Consume",
  x: number,
  y: number,
  opacity: number,
  progress: number,
) {
  if (opacity <= 0.01) return;

  const width = label === "Produce" ? 74 : 78;
  const height = 24;
  const slide = mix(5, 0, easeOut(clamp(progress / 0.22, 0, 1)));

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y - slide);

  ctx.shadowColor = "rgba(23, 32, 51, 0.12)";
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 3;
  roundedRect(ctx, -width / 2, -height / 2, width, height, height / 2);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = COLORS.blue;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-width / 2 + 12, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();

  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 10px ${UI_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, -width / 2 + 22, 0.5);

  ctx.restore();
}

// Compact UPDATE statement that triggers the whole flow, styled with the Idle
// Toes code palette like the sibling propagation demo.
function drawWriteCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opacity: number,
) {
  const width = 138;
  const height = 56;
  const left = x - width / 2;
  const top = y - height / 2;

  ctx.save();
  ctx.globalAlpha = clamp(opacity, 0, 1);
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  roundedRect(ctx, left, top, width, height, 8);
  ctx.fillStyle = IDLE_TOES.background;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1;
  ctx.strokeStyle = IDLE_TOES.brightBlack;
  ctx.stroke();

  // Draw the statement one clause per line so it always fits the card. Each
  // line is a sequence of colored tokens advanced by measured width.
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 9px ${MONO_FONT}`;
  const startX = left + 12;
  const lineY = [top + 15, top + 29, top + 43];

  const drawClause = (
    row: number,
    tokens: readonly { text: string; color: string }[],
  ) => {
    let cursor = startX;
    for (const token of tokens) {
      ctx.fillStyle = token.color;
      ctx.fillText(token.text, cursor, lineY[row]);
      cursor += ctx.measureText(token.text).width;
    }
  };

  drawClause(0, [
    { text: "UPDATE", color: IDLE_TOES.blue },
    { text: " users", color: IDLE_TOES.foreground },
  ]);
  drawClause(1, [
    { text: "SET plan = ", color: IDLE_TOES.foreground },
    { text: "'pro'", color: IDLE_TOES.green },
  ]);
  drawClause(2, [
    { text: "WHERE id = ", color: IDLE_TOES.foreground },
    { text: "42", color: IDLE_TOES.yellow },
  ]);
  ctx.restore();
}

function drawStage(
  ctx: CanvasRenderingContext2D,
  index: number,
  layout: Layout,
  frame: Frame,
) {
  const stage = STAGES[index];
  const center = layout.positions[index];
  const pulse = frame.pulse(index);

  // A small scale pop on arrival gives each stage a tactile "thunk" as the
  // event lands, on top of the gold halo.
  const pop = 1 + pulse * 0.045;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(pop, pop);
  ctx.translate(-center.x, -center.y);

  if (stage.kind === "db") {
    drawCylinder(ctx, center, layout.nodeW, layout.nodeH, frame.commit, pulse);
  } else if (stage.kind === "table") {
    drawTable(ctx, center, layout.nodeW, layout.nodeH, frame.land, pulse);
  } else {
    drawCard(
      ctx,
      stage,
      center,
      layout.nodeW,
      layout.nodeH,
      frame.transport(index),
      pulse,
    );
  }

  ctx.restore();
}

function drawFrame(canvas: HTMLCanvasElement, now: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.shell;
  ctx.fillRect(0, 0, width, height);

  const phase = (now % LOOP_MS) / LOOP_MS;
  const frame = deriveFrame(phase);
  const layout = computeLayout(width, height);
  const positions = layout.positions;
  const lastIndex = positions.length - 1;

  // The event's current position on the spine. It follows the token while in
  // flight, sits at the source before emit, and rests at the lake once landed.
  const segment = positions[frame.token.segment];
  const next = positions[frame.token.segment + 1];
  const eventY = mix(
    portOut(segment, layout).y,
    portIn(next, layout).y,
    frame.token.progress,
  );

  // Continuous spine through every stage: full gray track, blue up to the event.
  const spineX = width / 2;
  const spineTop = positions[0].y;
  const spineBottom = positions[lastIndex].y;
  drawSpine(ctx, spineX, spineTop, spineBottom, COLORS.line);

  if (frame.reset === 0 && phase >= ARRIVALS[0]) {
    const frontY = phase >= ARRIVALS[4] ? spineBottom : eventY;
    drawSpine(ctx, spineX, spineTop, frontY, COLORS.blue);
  }

  STAGES.forEach((_, i) => drawStage(ctx, i, layout, frame));

  if (frame.token.visible) {
    drawToken(ctx, spineX, eventY, frame.token.opacity);
  }

  if (frame.operation?.visible) {
    const calloutX = clamp(spineX + 94, 58, width - 58);
    drawOperationCallout(
      ctx,
      frame.operation.label,
      calloutX,
      eventY,
      frame.operation.opacity * frame.token.opacity,
      frame.operation.progress,
    );
  }

  if (frame.write.visible) {
    const mysql = layout.positions[0];
    const restX = clamp(mysql.x, 80, width - 80);
    const restY = mysql.y - layout.nodeH / 2 - 34;
    const fromY = restY - 16;
    drawWriteCard(
      ctx,
      restX,
      mix(fromY, restY, frame.write.travel),
      frame.write.opacity,
    );
  }
}

export function IncrementalEtlFlowDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      // Hold a frame where the change has landed across the whole pipeline.
      drawFrame(canvas, LOOP_MS * 0.9);
      return;
    }

    const draw = (now: number) => {
      drawFrame(canvas, now);
      frameRef.current = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(() =>
      drawFrame(canvas, performance.now()),
    );
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <figure className="etl-flow-demo">
      <div className="etl-flow-header">
        <h2>Online → Offline Data Flow</h2>
        <p>
          An <code>UPDATE</code> to the MySQL <code>users</code> table is
          captured by Brooklin, emitted to Kafka, consumed by Gobblin, and lands
          in the Opal table on HDFS, keeping the offline copy in sync with the
          source.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="etl-flow-canvas"
        role="img"
        aria-label="Animated incremental ETL pipeline arranged as a vertical column. An UPDATE statement sets plan to pro for id 42 in the MySQL users table, which commits and turns green. A gold CDC event labelled id 42, free to pro, travels top to bottom along connecting pipes: Brooklin captures the change, a temporary Produce callout appears as Brooklin emits it to Kafka, a temporary Consume callout appears as Gobblin consumes it from Kafka, and each stage glows blue as the event arrives. The event finally lands in the Opal table on HDFS, whose plan cell for row 42 flips from free to pro to match the source. The pipeline then resets and loops."
      />

      <figcaption className="etl-flow-legend" aria-label="Pipeline legend">
        <span>
          <i data-tone="path" />
          data flow
        </span>
        <span>
          <i data-tone="event" />
          CDC event
        </span>
        <span>
          <i data-tone="updated" />
          updated record
        </span>
      </figcaption>
    </figure>
  );
}
