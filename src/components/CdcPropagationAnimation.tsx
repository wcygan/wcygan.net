import { useEffect, useRef } from "react";

const LOOP_MS = 5200;

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

function drawNode(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  radius: number,
  active: boolean,
  stale: boolean,
) {
  const fill = active ? "#466eaa" : "#f1f1f1";
  const stroke = stale ? "#ae5c00" : active ? "#1e468c" : "#d0d0d0";

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = stale ? 4 : 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  if (stale) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(174, 92, 0, 0.22)";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  ctx.fillStyle = active ? "#ffffff" : "#333333";
  ctx.font =
    '700 13px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(active ? "pro" : "free", x, y);

  ctx.fillStyle = "#666666";
  ctx.font =
    '700 12px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(label, x, y + radius + 22);
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
  const postgresActive = phase >= 0.14 && phase < 0.92;
  const redisActive = phase >= 0.62 && phase < 0.92;
  const staleWindow = postgresActive && !redisActive;
  const eventProgress = easeInOut(clamp((phase - 0.2) / 0.38, 0, 1));
  const eventVisible = phase >= 0.2 && phase < 0.62;
  const catchupPulse = clamp(1 - Math.abs(phase - 0.62) / 0.08, 0, 1);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fafaf9";
  ctx.fillRect(0, 0, width, height);

  const centerY = height * 0.48;
  const radius = clamp(width * 0.075, 24, 44);
  const leftX = width * 0.18;
  const middleX = width * 0.5;
  const rightX = width * 0.82;

  drawPipe(
    ctx,
    leftX + radius + 10,
    centerY,
    middleX - radius - 10,
    eventProgress,
  );
  drawPipe(
    ctx,
    middleX + radius + 10,
    centerY,
    rightX - radius - 10,
    clamp((eventProgress - 0.46) / 0.54, 0, 1),
  );

  drawNode(ctx, "Postgres", leftX, centerY, radius, postgresActive, false);
  drawNode(ctx, "CDC", middleX, centerY, radius * 0.86, eventVisible, false);
  drawNode(ctx, "Redis", rightX, centerY, radius, redisActive, staleWindow);

  if (eventVisible) {
    const eventX =
      eventProgress < 0.5
        ? mix(leftX + radius + 10, middleX, eventProgress / 0.5)
        : mix(middleX, rightX - radius - 10, (eventProgress - 0.5) / 0.5);

    ctx.beginPath();
    ctx.arc(eventX, centerY, radius * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#1e468c";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eventX, centerY, radius * 0.36, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(30, 70, 140, 0.24)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  if (catchupPulse > 0) {
    ctx.beginPath();
    ctx.arc(rightX, centerY, radius + catchupPulse * 18, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 128, 96, ${0.28 * catchupPulse})`;
    ctx.lineWidth = 5;
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
