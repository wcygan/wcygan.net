import type { RetrySnapshot, TrackSnapshot } from "./model";
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

// The four shared timeline beats both tracks pass through, drawn as a spine.
const STAGES = ["send", "crash before ack", "retry", "resolve"] as const;

export function drawRetryIdempotencyDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: RetrySnapshot,
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
  snapshot: RetrySnapshot,
  width: number,
  height: number,
) {
  const padding = 18;
  const spineHeight = 34;
  const trackGap = 16;
  const top = 30;
  const usableHeight = height - top - padding - spineHeight - trackGap;
  const trackHeight = (usableHeight - trackGap) / 2;
  const trackWidth = width - padding * 2;

  const naiveTrack = rect(padding, top, trackWidth, trackHeight);
  const guardedTrack = rect(
    padding,
    top + trackHeight + trackGap,
    trackWidth,
    trackHeight,
  );
  const spine = rect(
    padding,
    guardedTrack.y + guardedTrack.height + trackGap,
    trackWidth,
    spineHeight,
  );

  drawTrack(ctx, naiveTrack, snapshot.tracks.naive, false);
  drawTrack(ctx, guardedTrack, snapshot.tracks.guarded, false);
  drawTimelineSpine(ctx, spine, snapshot, false);
}

function drawCompact(
  ctx: CanvasRenderingContext2D,
  snapshot: RetrySnapshot,
  width: number,
  height: number,
) {
  const padding = width < 360 ? 12 : 14;
  const spineHeight = 30;
  const trackGap = 12;
  const top = 14;
  const usableHeight = height - top - padding - spineHeight - trackGap;
  const trackHeight = (usableHeight - trackGap) / 2;
  const trackWidth = width - padding * 2;

  const naiveTrack = rect(padding, top, trackWidth, trackHeight);
  const guardedTrack = rect(
    padding,
    top + trackHeight + trackGap,
    trackWidth,
    trackHeight,
  );
  const spine = rect(
    padding,
    guardedTrack.y + guardedTrack.height + trackGap,
    trackWidth,
    spineHeight,
  );

  drawTrack(ctx, naiveTrack, snapshot.tracks.naive, true);
  drawTrack(ctx, guardedTrack, snapshot.tracks.guarded, true);
  drawTimelineSpine(ctx, spine, snapshot, true);
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  track: TrackSnapshot,
  compact: boolean,
) {
  const palette = trackPalette(track);
  drawShadow(ctx, card, 12);
  drawRoundedRect(ctx, card, 10, COLORS.panel, COLORS.line, 1);

  const inset = compact ? 12 : 16;
  const titleY = card.y + (compact ? 22 : 24);

  drawText(ctx, track.title, card.x + inset, titleY, {
    color: COLORS.ink,
    font: `800 ${compact ? 13 : 15}px ${UI_FONT}`,
    maxWidth: card.width - inset * 2,
  });

  // The guarded code path renders in mono because it is literal code.
  drawText(
    ctx,
    track.guardLabel,
    card.x + inset,
    titleY + (compact ? 18 : 20),
    {
      color: COLORS.muted,
      font: `700 ${compact ? 10 : 12}px ${MONO_FONT}`,
      maxWidth: card.width - inset * 2,
    },
  );

  const bodyY = titleY + (compact ? 36 : 40);
  const bodyHeight = card.y + card.height - inset - bodyY;
  const counterWidth = compact ? 96 : 132;
  const counter = rect(card.x + inset, bodyY, counterWidth, bodyHeight);
  const worker = rect(
    counter.x + counter.width + (compact ? 10 : 16),
    bodyY,
    card.width - inset * 2 - counter.width - (compact ? 10 : 16),
    bodyHeight,
  );

  drawCounter(ctx, counter, track, palette, compact);
  drawWorkerState(ctx, worker, track, palette, compact);
}

function drawCounter(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  track: TrackSnapshot,
  palette: { fill: string; stroke: string },
  compact: boolean,
) {
  // A second email (counter -> 2) flashes red; the safe first send flashes blue.
  const flashHue = track.emailsSent >= 2 ? "190 64 58" : "30 70 140";
  const flashAlpha = (0.08 + track.counterFlash * 0.22).toFixed(2);
  drawRoundedRect(ctx, box, 8, "#f8fafc", COLORS.line, 1);
  if (track.counterFlash > 0.02) {
    drawRoundedRect(
      ctx,
      box,
      8,
      `rgb(${flashHue} / ${flashAlpha})`,
      palette.stroke,
      1.2,
    );
  }

  drawText(ctx, "emails sent", box.x + 10, box.y + (compact ? 17 : 19), {
    color: COLORS.muted,
    font: `800 ${compact ? 9 : 11}px ${UI_FONT}`,
    maxWidth: box.width - 20,
  });

  const numberColor =
    track.emailsSent >= 2
      ? COLORS.red
      : track.outcome === "exactly-once"
        ? COLORS.green
        : COLORS.ink;
  drawText(
    ctx,
    String(track.emailsSent),
    box.x + box.width / 2,
    box.y + box.height - (compact ? 12 : 14),
    {
      align: "center",
      color: numberColor,
      font: `800 ${compact ? 30 : 40}px ${MONO_FONT}`,
      maxWidth: box.width - 16,
    },
  );
}

function drawWorkerState(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  track: TrackSnapshot,
  palette: { fill: string; stroke: string },
  compact: boolean,
) {
  drawRoundedRect(ctx, box, 8, palette.fill, palette.stroke, 1.4);

  // Crash overlay pulses the panel red around the crash beat.
  if (track.crashFlash > 0.02) {
    drawRoundedRect(
      ctx,
      box,
      8,
      `rgb(190 64 58 / ${0.06 + track.crashFlash * 0.18})`,
      COLORS.red,
      1.4,
    );
  }

  drawText(ctx, "Worker", box.x + 12, box.y + (compact ? 17 : 19), {
    color: palette.stroke,
    font: `800 ${compact ? 9 : 11}px ${UI_FONT}`,
    maxWidth: box.width - 24,
  });

  drawText(ctx, track.statusLabel, box.x + 12, box.y + (compact ? 36 : 41), {
    color: COLORS.ink,
    font: `800 ${compact ? 12 : 14}px ${UI_FONT}`,
    maxWidth: box.width - 24,
  });

  drawBadge(ctx, box.x + 12, box.y + box.height - (compact ? 28 : 30), track, {
    compact,
    maxWidth: box.width - 24,
  });
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  track: TrackSnapshot,
  options: { compact: boolean; maxWidth: number },
) {
  const tone = outcomeTone(track);
  const height = options.compact ? 22 : 24;
  ctx.font = `800 ${options.compact ? 10 : 11}px ${UI_FONT}`;
  const measured = ctx.measureText(track.outcomeLabel).width + 20;
  const width = Math.min(options.maxWidth, measured);
  const badge = rect(x, y, width, height);
  drawRoundedRect(ctx, badge, 999, tone.fill, tone.stroke, 1);
  drawText(ctx, track.outcomeLabel, x + 10, y + (options.compact ? 15 : 16), {
    color: tone.stroke,
    font: `800 ${options.compact ? 10 : 11}px ${UI_FONT}`,
    maxWidth: width - 20,
  });
}

function drawTimelineSpine(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  snapshot: RetrySnapshot,
  compact: boolean,
) {
  const activeIndex = STAGES.indexOf(
    snapshot.phase === "crash" ? "crash before ack" : snapshot.phase,
  );
  const segmentWidth = box.width / STAGES.length;
  const lineY = box.y + box.height / 2;

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(box.x + segmentWidth / 2, lineY);
  ctx.lineTo(box.x + box.width - segmentWidth / 2, lineY);
  ctx.stroke();

  for (let index = 0; index < STAGES.length; index += 1) {
    const centerX = box.x + segmentWidth * index + segmentWidth / 2;
    const isActive = index === activeIndex;
    const isDone = index < activeIndex;
    const isCrash = STAGES[index] === "crash before ack";
    const color =
      isCrash && (isActive || isDone)
        ? COLORS.red
        : isDone
          ? COLORS.green
          : isActive
            ? COLORS.blue
            : COLORS.muted;

    ctx.beginPath();
    ctx.arc(centerX, lineY, isActive ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isActive || isDone ? color : "#c7cee0";
    ctx.fill();

    drawText(ctx, STAGES[index], centerX, lineY - (compact ? 11 : 13), {
      align: "center",
      color: isActive ? color : COLORS.muted,
      font: `800 ${compact ? 9 : 11}px ${UI_FONT}`,
      maxWidth: segmentWidth - 6,
    });
  }
}

function trackPalette(track: TrackSnapshot) {
  if (track.status === "crashed") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (track.outcome === "duplicate") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (track.outcome === "exactly-once" || track.status === "skipped") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (track.status === "retrying") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  return { fill: COLORS.blueSoft, stroke: COLORS.blue };
}

function outcomeTone(track: TrackSnapshot) {
  if (track.outcome === "duplicate") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (track.outcome === "exactly-once") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  if (track.status === "crashed") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (track.status === "retrying") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  return { fill: COLORS.blueSoft, stroke: COLORS.blue };
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
