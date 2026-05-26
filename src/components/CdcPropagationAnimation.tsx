import { useEffect, useRef } from "react";

const LOOP_MS = 5200;
const EVENT_START_PHASE = 0.2;
const EVENT_TRAVEL_PHASE = 0.38;
const RESET_PHASE = 0.92;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function drawPipe(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  endX: number,
  activeAmount: number,
) {
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#dedede";
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();

  if (activeAmount <= 0) return;

  ctx.strokeStyle = "#466eaa";
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
  active: boolean,
  stale: boolean,
) {
  const fill = active ? "#466eaa" : "#f1f1f1";
  const stroke = stale ? "#ae5c00" : active ? "#1e468c" : "#d0d0d0";
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

  ctx.lineWidth = stale ? 4 : 2;
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

  ctx.fillStyle = active ? "#ffffff" : "#333333";
  ctx.font =
    '700 13px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(active ? "pro" : "free", x, y);

  ctx.fillStyle = "#666666";
  ctx.font =
    '700 12px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(label, x, y + height / 2 + 18);
}

function drawCdcPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
) {
  const fill = active ? "#466eaa" : "#f1f1f1";
  const stroke = active ? "#1e468c" : "#d0d0d0";
  const left = x - width / 2;
  const top = y - height / 2;

  roundedRect(ctx, left, top, width, height, height / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  ctx.fillStyle = active ? "#ffffff" : "#333333";
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
  const postgresActive = phase >= 0.14 && !hasReset;
  const eventProgress = easeInOut(
    hasReset
      ? 0
      : clamp((phase - EVENT_START_PHASE) / EVENT_TRAVEL_PHASE, 0, 1),
  );
  const eventVisible = phase >= EVENT_START_PHASE && phase < 0.62 && !hasReset;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fafaf9";
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
  const staleWindow = postgresActive && !redisActive;

  drawPipe(ctx, leftPipeStart, centerY, leftPipeEnd, firstPipeProgress);
  drawPipe(ctx, rightPipeStart, centerY, rightPipeEnd, secondPipeProgress);

  drawDatabaseNode(
    ctx,
    "Postgres",
    leftX,
    centerY,
    databaseWidth,
    databaseHeight,
    postgresActive,
    false,
  );
  drawCdcPipe(ctx, middleX, centerY, cdcPipeWidth, cdcPipeHeight, cdcActive);
  drawDatabaseNode(
    ctx,
    "Redis",
    rightX,
    centerY,
    databaseWidth,
    databaseHeight,
    redisActive,
    staleWindow,
  );

  if (eventVisible) {
    ctx.beginPath();
    ctx.arc(eventX, centerY, eventRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#1e468c";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eventX, centerY, radius * 0.36, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(30, 70, 140, 0.24)";
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
    </figure>
  );
}
