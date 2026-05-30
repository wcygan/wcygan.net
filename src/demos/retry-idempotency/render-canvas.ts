import type {
  LedgerEntry,
  ProviderAction,
  RequestPacket,
  RetrySnapshot,
  TrackSnapshot,
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

export function drawRetryIdempotencyDemo(
  ctx: CanvasRenderingContext2D,
  snapshot: RetrySnapshot,
  viewport: CanvasViewport,
) {
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.cssWidth, viewport.cssHeight);
  ctx.fillStyle = COLORS.shell;
  ctx.fillRect(0, 0, viewport.cssWidth, viewport.cssHeight);

  const compact = viewport.cssWidth <= COMPACT_LAYOUT_MAX_WIDTH;
  const padding = compact ? (viewport.cssWidth < 360 ? 12 : 14) : 18;
  const top = compact ? 14 : 18;
  const trackGap = compact ? 14 : 18;
  const trackWidth = viewport.cssWidth - padding * 2;
  const usableHeight = viewport.cssHeight - top - padding - trackGap;
  const trackHeight = usableHeight / 2;

  const stableTrack = rect(padding, top, trackWidth, trackHeight);
  const freshTrack = rect(
    padding,
    top + trackHeight + trackGap,
    trackWidth,
    trackHeight,
  );

  drawTrack(ctx, stableTrack, snapshot.tracks.stable, compact);
  drawTrack(ctx, freshTrack, snapshot.tracks.fresh, compact);
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  track: TrackSnapshot,
  compact: boolean,
) {
  const accent = trackAccent(track);
  drawShadow(ctx, card, 12);
  drawRoundedRect(ctx, card, 10, COLORS.panel, COLORS.line, 1);

  const inset = compact ? 12 : 16;
  const titleY = card.y + (compact ? 20 : 23);

  drawText(ctx, track.title, card.x + inset, titleY, {
    color: COLORS.ink,
    font: `800 ${compact ? 13 : 15}px ${UI_FONT}`,
    maxWidth: card.width * 0.55,
  });
  // The key strategy renders in mono because it is literally how the key is
  // computed — the whole lesson rides on stable vs regenerated.
  drawText(
    ctx,
    `key = ${track.strategyLabel}`,
    card.x + inset,
    titleY + (compact ? 16 : 18),
    {
      color: COLORS.muted,
      font: `700 ${compact ? 10 : 12}px ${MONO_FONT}`,
      maxWidth: card.width - inset * 2,
    },
  );

  const outcomeTone = trackTone(track.outcome);
  drawBadge(ctx, card, track.outcomeLabel, outcomeTone, compact);

  const bodyTop = titleY + (compact ? 30 : 34);
  const bodyBottom = card.y + card.height - inset;
  const bodyHeight = bodyBottom - bodyTop;

  // worker | lane | provider, left to right. The provider holds the ledger, so
  // it gets the wider share, more so on compact where space is scarce.
  const workerWidth = compact ? card.width * 0.32 : card.width * 0.3;
  const providerWidth = compact ? card.width * 0.5 : card.width * 0.44;
  const worker = rect(card.x + inset, bodyTop, workerWidth, bodyHeight);
  const provider = rect(
    card.x + card.width - inset - providerWidth,
    bodyTop,
    providerWidth,
    bodyHeight,
  );

  const workerPort = {
    x: worker.x + worker.width,
    y: worker.y + worker.height / 2,
  };
  const providerPort = { x: provider.x, y: provider.y + provider.height / 2 };
  drawLane(ctx, workerPort, providerPort);

  drawWorker(ctx, worker, track, accent, compact);
  drawProvider(ctx, provider, track, compact);
  if (track.packet) {
    drawPacket(ctx, track.packet, workerPort, providerPort, compact);
  }
}

function drawWorker(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  track: TrackSnapshot,
  accent: { fill: string; stroke: string },
  compact: boolean,
) {
  drawRoundedRect(ctx, box, 8, accent.fill, accent.stroke, 1.4);

  // The crash beat pulses the Worker red — the side effect already happened,
  // but completion was never recorded.
  if (track.crashFlash > 0.02) {
    drawRoundedRect(
      ctx,
      box,
      8,
      `rgb(190 64 58 / ${(0.06 + track.crashFlash * 0.18).toFixed(2)})`,
      COLORS.red,
      1.4,
    );
  }

  const pad = compact ? 9 : 11;
  const titleY = box.y + (compact ? 16 : 18);
  drawText(ctx, "Worker", box.x + pad, titleY, {
    color: accent.stroke,
    font: `800 ${compact ? 9 : 11}px ${UI_FONT}`,
    maxWidth: box.width - pad * 2,
  });
  drawText(
    ctx,
    `attempt ${track.attempt}`,
    compact ? box.x + pad : box.x + box.width - pad,
    compact ? box.y + 31 : titleY,
    {
      align: compact ? "left" : "right",
      color: COLORS.muted,
      font: `800 ${compact ? 9 : 10}px ${UI_FONT}`,
      maxWidth: compact ? box.width - pad * 2 : box.width * 0.5,
    },
  );

  // The Idempotency-Key the attempt carries. On the stable track this string is
  // identical across attempts; on the fresh track it changes.
  drawText(ctx, "Idempotency-Key", box.x + pad, box.y + (compact ? 51 : 40), {
    color: COLORS.muted,
    font: `700 ${compact ? 8 : 9}px ${UI_FONT}`,
    maxWidth: box.width - pad * 2,
  });
  drawText(ctx, track.attemptKey, box.x + pad, box.y + (compact ? 70 : 58), {
    color: COLORS.ink,
    font: `800 ${compact ? 13 : 16}px ${MONO_FONT}`,
    maxWidth: box.width - pad * 2,
  });

  drawText(
    ctx,
    track.workerStatus,
    box.x + pad,
    box.y + box.height - (compact ? 9 : 11),
    {
      color: COLORS.muted,
      font: `700 ${compact ? 9 : 11}px ${UI_FONT}`,
      maxWidth: box.width - pad * 2,
    },
  );
}

function drawProvider(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  track: TrackSnapshot,
  compact: boolean,
) {
  const stroke =
    track.outcome === "duplicate"
      ? COLORS.red
      : track.outcome === "exactly-once"
        ? COLORS.green
        : COLORS.blue;
  drawRoundedRect(ctx, box, 8, COLORS.panel, stroke, 1.4);

  const pad = compact ? 9 : 11;
  drawText(
    ctx,
    compact ? "Provider" : "Email Provider",
    box.x + pad,
    box.y + (compact ? 16 : 18),
    {
      color: stroke,
      font: `800 ${compact ? 9 : 11}px ${UI_FONT}`,
      maxWidth: box.width * 0.5,
    },
  );

  drawDelivered(ctx, box, track, pad, compact);

  drawText(ctx, "keys seen", box.x + pad, box.y + (compact ? 34 : 40), {
    color: COLORS.muted,
    font: `700 ${compact ? 8 : 9}px ${UI_FONT}`,
    maxWidth: box.width - pad * 2,
  });

  drawLedger(ctx, box, track.ledger, pad, compact);
  // A second ledger row already fills the panel and tells the duplicate story
  // (with the delivered count and the badge), so the action note is dropped
  // there to avoid colliding with the row.
  if (track.ledger.length < 2) {
    drawProviderAction(ctx, box, track.providerAction, pad, compact);
  }
}

// Top-right "delivered N" with an envelope glyph: the count is the invariant.
function drawDelivered(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  track: TrackSnapshot,
  pad: number,
  compact: boolean,
) {
  const duplicate = track.delivered >= 2;
  const color = duplicate
    ? COLORS.red
    : track.outcome === "exactly-once"
      ? COLORS.green
      : COLORS.ink;

  // Compact panels are too narrow for the word, so the envelope + count carries
  // the meaning on its own.
  const numberText = compact
    ? String(track.delivered)
    : `delivered ${track.delivered}`;
  const font = `800 ${compact ? 10 : 11}px ${UI_FONT}`;
  ctx.font = font;

  const glyphSize = compact ? 9 : 10;
  const glyphWidth = glyphSize * 1.4;
  const gap = compact ? 4 : 6;
  const inlinePadding = compact ? 7 : 8;
  const measuredTextWidth = ctx.measureText(numberText).width;
  const idealWidth = inlinePadding * 2 + measuredTextWidth + gap + glyphWidth;
  const maxWidth = box.width * (compact ? 0.42 : 0.46);
  const pillWidth = Math.min(idealWidth, maxWidth);
  const pill = rect(
    box.x + box.width - pad - pillWidth,
    box.y + (compact ? 6 : 7),
    pillWidth,
    compact ? 19 : 21,
  );
  const fill = duplicate
    ? COLORS.redSoft
    : track.outcome === "exactly-once"
      ? COLORS.greenSoft
      : COLORS.shell;
  const stroke =
    duplicate || track.outcome === "exactly-once" ? color : COLORS.line;

  if (track.deliveredFlash > 0.02) {
    ctx.save();
    ctx.globalAlpha = 0.08 + track.deliveredFlash * 0.14;
    drawRoundedRect(ctx, pill, 999, color, color, 1);
    ctx.restore();
  }

  drawRoundedRect(ctx, pill, 999, fill, stroke, 1);

  const glyphCenterX = pill.x + pill.width - inlinePadding - glyphWidth / 2;
  const glyphCenterY = pill.y + pill.height / 2;
  const textRight = glyphCenterX - glyphWidth / 2 - gap;
  const textMaxWidth = Math.max(12, textRight - pill.x - inlinePadding);

  drawText(ctx, numberText, textRight, pill.y + (compact ? 13 : 14), {
    align: "right",
    color,
    font,
    maxWidth: textMaxWidth,
  });
  drawEnvelope(ctx, glyphCenterX, glyphCenterY, glyphSize, color);
}

function drawLedger(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  ledger: LedgerEntry[],
  pad: number,
  compact: boolean,
) {
  const rowHeight = compact ? 20 : 24;
  const rowGap = compact ? 5 : 6;
  const rowsTop = box.y + (compact ? 40 : 47);
  const rowWidth = box.width - pad * 2;

  if (ledger.length === 0) {
    const empty = rect(box.x + pad, rowsTop, rowWidth, rowHeight);
    drawRoundedRect(ctx, empty, 6, COLORS.shell, COLORS.line, 1);
    drawText(ctx, "(empty)", empty.x + 8, empty.y + (compact ? 14 : 16), {
      color: COLORS.muted,
      font: `700 ${compact ? 9 : 10}px ${UI_FONT}`,
      maxWidth: rowWidth - 16,
    });
    return;
  }

  ledger.forEach((entry, index) => {
    const row = rect(
      box.x + pad,
      rowsTop + index * (rowHeight + rowGap),
      rowWidth,
      rowHeight,
    );
    const fill = entry.hit ? COLORS.greenSoft : COLORS.shell;
    const stroke = entry.hit ? COLORS.green : COLORS.line;
    drawRoundedRect(ctx, row, 6, fill, stroke, entry.hit ? 1.4 : 1);
    if (entry.flash > 0.02) {
      drawRoundedRect(
        ctx,
        row,
        6,
        `rgb(${entry.hit ? "29 139 101" : "30 70 140"} / ${(
          entry.flash * 0.16
        ).toFixed(2)})`,
        stroke,
        1.4,
      );
    }

    drawText(ctx, entry.key, row.x + 8, row.y + (compact ? 14 : 16), {
      color: entry.hit ? COLORS.green : COLORS.ink,
      font: `800 ${compact ? 10 : 12}px ${MONO_FONT}`,
      maxWidth: rowWidth * 0.56,
    });
    drawText(
      ctx,
      entry.hit ? "✓ cached" : entry.messageId,
      row.x + rowWidth - 8,
      row.y + (compact ? 14 : 16),
      {
        align: "right",
        color: entry.hit ? COLORS.green : COLORS.muted,
        font: `700 ${compact ? 9 : 11}px ${MONO_FONT}`,
        maxWidth: rowWidth * 0.4,
      },
    );
  });
}

function drawProviderAction(
  ctx: CanvasRenderingContext2D,
  box: Rect,
  action: ProviderAction,
  pad: number,
  compact: boolean,
) {
  const note = providerActionNote(action);
  if (!note) return;
  const color =
    action === "duplicate-send"
      ? COLORS.red
      : action === "dedupe-hit"
        ? COLORS.green
        : COLORS.muted;
  drawText(ctx, note, box.x + pad, box.y + box.height - (compact ? 9 : 11), {
    color,
    font: `800 ${compact ? 9 : 11}px ${UI_FONT}`,
    maxWidth: box.width - pad * 2,
  });
}

function providerActionNote(action: ProviderAction): string {
  switch (action) {
    case "idle":
      return "waiting for first request";
    case "recorded":
      return "key recorded, email sent";
    case "checking":
      return "looking the key up…";
    case "dedupe-hit":
      return "key seen → cached, no resend";
    case "duplicate-send":
      return "new key → second email sent";
  }
}

function drawPacket(
  ctx: CanvasRenderingContext2D,
  packet: RequestPacket,
  workerPort: Point,
  providerPort: Point,
  compact: boolean,
) {
  const start = packet.direction === "request" ? workerPort : providerPort;
  const end = packet.direction === "request" ? providerPort : workerPort;
  const point = interpolate(start, end, packet.progress);

  const stroke = packetStroke(packet.tone);
  const fill = packetFill(packet.tone);
  const useMono = packet.direction === "request" || packet.tone !== "send";
  const font = `800 ${compact ? 9 : 10}px ${useMono ? MONO_FONT : UI_FONT}`;

  ctx.font = font;
  const width = Math.min(ctx.measureText(packet.label).width + 20, 150);
  const height = compact ? 22 : 24;

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
  drawText(ctx, packet.label, 0, -height / 2 + (compact ? 15 : 16), {
    align: "center",
    color: stroke,
    font,
    maxWidth: width - 14,
  });
  ctx.restore();
}

// Simple envelope: a rounded rect with a triangular flap.
function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const w = size * 1.4;
  const h = size;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = "round";
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y + h * 0.6);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

function trackAccent(track: TrackSnapshot): { fill: string; stroke: string } {
  if (track.workerStatus === "crashed before ack") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (track.attempt === 2 && track.outcome === "pending") {
    return { fill: COLORS.goldSoft, stroke: COLORS.gold };
  }
  if (track.outcome === "duplicate") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (track.outcome === "exactly-once") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  return { fill: COLORS.blueSoft, stroke: COLORS.blue };
}

function trackTone(outcome: TrackSnapshot["outcome"]): {
  fill: string;
  stroke: string;
} {
  if (outcome === "duplicate") {
    return { fill: COLORS.redSoft, stroke: COLORS.red };
  }
  if (outcome === "exactly-once") {
    return { fill: COLORS.greenSoft, stroke: COLORS.green };
  }
  return { fill: COLORS.blueSoft, stroke: COLORS.blue };
}

function packetStroke(tone: RequestPacket["tone"]): string {
  if (tone === "retry") return COLORS.gold;
  if (tone === "deduped") return COLORS.green;
  if (tone === "duplicate") return COLORS.red;
  return COLORS.blue;
}

function packetFill(tone: RequestPacket["tone"]): string {
  if (tone === "retry") return COLORS.goldSoft;
  if (tone === "deduped") return COLORS.greenSoft;
  if (tone === "duplicate") return COLORS.redSoft;
  return COLORS.blueSoft;
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  label: string,
  tone: { fill: string; stroke: string },
  compact: boolean,
) {
  const height = compact ? 20 : 22;
  const inset = compact ? 12 : 16;
  ctx.font = `800 ${compact ? 9 : 11}px ${UI_FONT}`;
  const width = Math.min(card.width * 0.42, ctx.measureText(label).width + 18);
  const x = card.x + card.width - inset - width;
  const y = card.y + (compact ? 12 : 14);
  const badge = rect(x, y, width, height);
  drawRoundedRect(ctx, badge, 999, tone.fill, tone.stroke, 1);
  drawText(ctx, label, x + width / 2, y + (compact ? 14 : 15), {
    align: "center",
    color: tone.stroke,
    font: `800 ${compact ? 9 : 11}px ${UI_FONT}`,
    maxWidth: width - 16,
  });
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
