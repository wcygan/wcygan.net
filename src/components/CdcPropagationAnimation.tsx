import { useEffect, useRef } from "react";

const LOOP_MS = 10000;
const WRITE_START_PHASE = 0.04;
const WRITE_COMMIT_PHASE = 0.265;
const WRITE_SETTLE_PHASE = 0.14;
const EVENT_START_PHASE = 0.455;
const EVENT_TRAVEL_PHASE = 0.38;
const RESET_PHASE = 0.92;

type Rgb = readonly [number, number, number];

const COLORS = {
  ink: "#172033",
  muted: "#5c667a",
  line: "#d9deea",
  canvas: "#ffffff",
  blue: "#2f69f0",
  gold: "#d59b24",
  green: "#1d8b65",
  goldSoft: "rgba(213, 155, 36, 0.24)",
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

const DATABASE_FREE_FILL: Rgb = [255, 255, 255];
const DATABASE_PRO_FILL: Rgb = [29, 139, 101];
const DATABASE_FREE_STROKE: Rgb = [217, 222, 234];
const DATABASE_PRO_STROKE: Rgb = [15, 95, 68];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOut(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function mixColor(from: Rgb, to: Rgb, amount: number) {
  const progress = clamp(amount, 0, 1);
  const red = Math.round(mix(from[0], to[0], progress));
  const green = Math.round(mix(from[1], to[1], progress));
  const blue = Math.round(mix(from[2], to[2], progress));
  return `rgb(${red}, ${green}, ${blue})`;
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  endX: number,
  activeAmount: number,
) {
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();

  if (activeAmount <= 0) return;

  ctx.strokeStyle = COLORS.blue;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(mix(startX, endX, clamp(activeAmount, 0, 1)), y);
  ctx.stroke();
}

function drawDatabaseNode(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  activeAmount: number,
) {
  const active = clamp(activeAmount, 0, 1);
  const fill = mixColor(DATABASE_FREE_FILL, DATABASE_PRO_FILL, active);
  const stroke = mixColor(DATABASE_FREE_STROKE, DATABASE_PRO_STROKE, active);
  const ellipseHeight = clamp(height * 0.24, 14, 20);
  const left = x - width / 2;
  const right = x + width / 2;
  const topY = y - height / 2 + ellipseHeight / 2;
  const bottomY = y + height / 2 - ellipseHeight / 2;

  ctx.fillStyle = fill;
  ctx.fillRect(left, topY, width, bottomY - topY);
  ctx.beginPath();
  ctx.ellipse(x, topY, width / 2, ellipseHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, bottomY, width / 2, ellipseHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.ellipse(x, topY, width / 2, ellipseHeight / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left, topY);
  ctx.lineTo(left, bottomY);
  ctx.moveTo(right, topY);
  ctx.lineTo(right, bottomY);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, bottomY, width / 2, ellipseHeight / 2, 0, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = active ? COLORS.canvas : COLORS.ink;
  ctx.font =
    '700 13px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.globalAlpha = 1 - active;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText("free", x, y);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = active;
  ctx.fillStyle = COLORS.canvas;
  ctx.fillText("pro", x, y);
  ctx.restore();

  ctx.fillStyle = COLORS.muted;
  ctx.font =
    '700 12px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(label, x, y + height / 2 + 18);
}

function drawWriteCommand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity: number,
) {
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

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = '700 9px "Lilex", ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = IDLE_TOES.blue;
  ctx.fillText("UPDATE", left + 10, top + 8);
  ctx.fillStyle = IDLE_TOES.foreground;
  ctx.fillText("plan =", left + 10, top + 20);
  ctx.fillStyle = IDLE_TOES.green;
  ctx.fillText("'pro'", left + 48, top + 20);
  ctx.fillStyle = IDLE_TOES.yellow;
  ctx.fillText("id = 42", left + 10, top + 32);

  ctx.restore();
}

function drawCdcPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
) {
  const fill = active ? COLORS.blue : COLORS.canvas;
  const stroke = active ? COLORS.blue : COLORS.line;
  const left = x - width / 2;
  const top = y - height / 2;

  roundedRect(ctx, left, top, width, height, height / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  ctx.fillStyle = active ? COLORS.canvas : COLORS.ink;
  ctx.font =
    '700 12px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CDC Pipeline", x, y);
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

  const phase = (now % LOOP_MS) / LOOP_MS;
  const hasReset = phase >= RESET_PHASE;
  const writeTravelProgress = easeInOut(
    clamp(
      (phase - WRITE_START_PHASE) / (WRITE_COMMIT_PHASE - WRITE_START_PHASE),
      0,
      1,
    ),
  );
  const writeFadeProgress = easeOut(
    clamp((phase - WRITE_COMMIT_PHASE) / WRITE_SETTLE_PHASE, 0, 1),
  );
  const writeVisible =
    phase >= WRITE_START_PHASE && phase < EVENT_START_PHASE && !hasReset;
  const postgresActivation = hasReset
    ? 0
    : easeInOut(clamp((phase - WRITE_COMMIT_PHASE) / WRITE_SETTLE_PHASE, 0, 1));
  const postgresActive = postgresActivation > 0;
  const eventProgress = easeInOut(
    hasReset
      ? 0
      : clamp((phase - EVENT_START_PHASE) / EVENT_TRAVEL_PHASE, 0, 1),
  );
  const eventVisible =
    phase >= EVENT_START_PHASE &&
    phase < EVENT_START_PHASE + EVENT_TRAVEL_PHASE + 0.04 &&
    !hasReset;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.canvas;
  ctx.fillRect(0, 0, width, height);

  const centerY = height * 0.48;
  const radius = clamp(width * 0.075, 24, 44);
  const leftX = width * 0.18;
  const middleX = width * 0.5;
  const rightX = width * 0.82;
  const databaseWidth = clamp(radius * 1.7, 58, 82);
  const databaseHeight = clamp(radius * 1.8, 60, 86);
  const cdcPipeWidth = clamp(radius * 2.75, 92, 132);
  const cdcPipeHeight = clamp(radius * 0.78, 28, 34);
  const writeCardWidth = clamp(width * 0.27, 88, 116);
  const writeCardHeight = 46;
  const writeStartX = Math.max(
    writeCardWidth / 2 + 8,
    leftX - databaseWidth * 0.55,
  );
  const writeEndX = leftX;
  const writeStartY = Math.max(
    writeCardHeight / 2 + 8,
    centerY - databaseHeight * 1.18,
  );
  const writeEndY = centerY - databaseHeight * 0.52;
  const writeX = mix(writeStartX, writeEndX, writeTravelProgress);
  const writeY = mix(writeStartY, writeEndY, writeTravelProgress);
  const writeOpacity = phase < WRITE_COMMIT_PHASE ? 1 : 1 - writeFadeProgress;
  const cdcLeftEdge = middleX - cdcPipeWidth / 2;
  const cdcRightEdge = middleX + cdcPipeWidth / 2;
  const leftPipeStart = leftX + databaseWidth / 2;
  const leftPipeEnd = cdcLeftEdge;
  const rightPipeStart = cdcRightEdge;
  const rightPipeEnd = rightX - databaseWidth / 2;
  const leftPipeDistance = leftPipeEnd - leftPipeStart;
  const rightPipeDistance = rightPipeEnd - rightPipeStart;
  const totalEventDistance = rightPipeEnd - leftPipeStart;
  const eventDistance = eventProgress * totalEventDistance;
  const eventX = leftPipeStart + eventDistance;
  const eventRadius = radius * 0.22;
  const firstPipeProgress = clamp(eventDistance / leftPipeDistance, 0, 1);
  const secondPipeProgress = clamp(
    (eventX - rightPipeStart) / rightPipeDistance,
    0,
    1,
  );
  const cdcActive = postgresActive && eventX + eventRadius >= cdcLeftEdge;
  const redisActive = postgresActive && eventX + eventRadius >= rightPipeEnd;

  drawPipe(ctx, leftPipeStart, centerY, leftPipeEnd, firstPipeProgress);
  drawPipe(ctx, rightPipeStart, centerY, rightPipeEnd, secondPipeProgress);

  drawDatabaseNode(
    ctx,
    "Postgres",
    leftX,
    centerY,
    databaseWidth,
    databaseHeight,
    postgresActivation,
  );
  drawCdcPipe(ctx, middleX, centerY, cdcPipeWidth, cdcPipeHeight, cdcActive);
  drawDatabaseNode(
    ctx,
    "Redis",
    rightX,
    centerY,
    databaseWidth,
    databaseHeight,
    redisActive ? 1 : 0,
  );

  if (writeVisible) {
    drawWriteCommand(
      ctx,
      writeX,
      writeY,
      writeCardWidth,
      writeCardHeight,
      writeOpacity,
    );
  }

  if (eventVisible) {
    ctx.beginPath();
    ctx.arc(eventX, centerY, eventRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eventX, centerY, radius * 0.36, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.goldSoft;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

export function CdcPropagationAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      drawFrame(canvas, LOOP_MS * 0.62);
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
    <figure className="cdc-animation-demo">
      <canvas
        ref={canvasRef}
        className="cdc-animation-canvas"
        aria-label="Looping animation of a Postgres update flowing through CDC into Redis"
      />
      <figcaption
        className="cdc-animation-caption"
        aria-label="CDC propagation color legend"
      >
        <span>
          <i data-tone="path" />
          propagation path
        </span>
        <span>
          <i data-tone="event" />
          active event
        </span>
        <span>
          <i data-tone="success" />
          updated state
        </span>
      </figcaption>
    </figure>
  );
}
