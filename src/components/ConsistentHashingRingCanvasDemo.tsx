import { useEffect, useMemo, useRef, useState } from "react";

type HashRingPoint = {
  x: number;
  y: number;
};

type HashRingView = {
  cssHeight: number;
  cssWidth: number;
};

type HashRingToken = {
  hash: number;
  node: number;
  replica: number;
};

type HashRingKey = {
  afterOwner: number;
  hash: number;
  index: number;
  moved: boolean;
  radiusOffset: number;
};

type HashRingState = {
  keyCount: number;
  nodeCount: number;
};

type HashRingModel = {
  activeNodeCount: number;
  center: HashRingPoint;
  currentTokens: HashRingToken[];
  keyCount: number;
  keys: HashRingKey[];
  movedCount: number;
  radius: number;
  stayedCount: number;
};

const HASH_RING_MIN_KEY_COUNT = 12;
const HASH_RING_DEFAULT_KEY_COUNT = 28;
const HASH_RING_MAX_KEY_COUNT = 60;
const HASH_RING_MIN_NODE_COUNT = 3;
const HASH_RING_DEFAULT_NODE_COUNT = HASH_RING_MIN_NODE_COUNT + 1;
const HASH_RING_MAX_NODE_COUNT = 7;
const HASH_RING_VIRTUAL_TOKEN_COUNT = 2;
const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

// Red marks changed owners, and gray marks sample keys/supporting UI.
const HASH_RING_NODE_COLORS = [
  "#005eb8",
  "#00843d",
  "#c77700",
  "#7442c8",
  "#008ea0",
  "#a23b72",
  "#6b7f00",
];

const SAMPLE_KEY_RADIUS_OFFSET = 25;
const SAMPLE_KEY_RADIUS_JITTER = 6;
const SAMPLE_KEY_RADIUS = 3;
const MOVED_KEY_RADIUS = 5;
const TOKEN_RADIUS = 5;
const TOKEN_STROKE_WIDTH = 2;

export function ConsistentHashingRingCanvasDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodeCount, setNodeCount] = useState(HASH_RING_DEFAULT_NODE_COUNT);
  const [keyCount, setKeyCount] = useState(HASH_RING_DEFAULT_KEY_COUNT);
  const state = useMemo<HashRingState>(
    () => ({ keyCount, nodeCount }),
    [keyCount, nodeCount],
  );
  const metrics = useMemo(
    () => deriveHashRingModel(state, { cssHeight: 460, cssWidth: 720 }),
    [state],
  );
  const note =
    nodeCount === HASH_RING_MIN_NODE_COUNT
      ? "Three nodes is the baseline ring. Increase the node count to add one more node."
      : `The ring now has ${nodeCount} nodes. Red keys changed owners when the latest node was added.`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const view = resizeHashRingCanvas(canvas, context);
      drawHashRingCanvas(context, state, view);
    };

    draw();

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(draw) : null;
    observer?.observe(canvas);
    window.addEventListener("resize", draw);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [state]);

  const updateNodeCount = (value: string) => {
    setNodeCount(
      clampInteger(
        Number(value),
        HASH_RING_MIN_NODE_COUNT,
        HASH_RING_MAX_NODE_COUNT,
      ),
    );
  };

  const updateKeyCount = (value: string) => {
    setKeyCount(
      clampInteger(
        Number(value),
        HASH_RING_MIN_KEY_COUNT,
        HASH_RING_MAX_KEY_COUNT,
      ),
    );
  };

  return (
    <figure className="sp-demo sp-hash-ring-canvas-demo">
      <DemoHeader
        eyebrow="Crossing shards"
        title="Consistent Hashing Ring"
        copy="Compare the current ring with the previous node count. Key positions stay fixed; red keys are the ones whose next clockwise token changed when the latest node was added."
      />

      <div
        className="sp-hash-ring-workbench"
        aria-label="Interactive consistent hashing demo"
      >
        <div className="sp-hash-ring-stage">
          <canvas
            aria-label="Consistent hashing ring diagram"
            ref={canvasRef}
            role="img"
          />
        </div>

        <div className="sp-hash-ring-controls">
          <div className="sp-hash-ring-metrics" aria-live="polite">
            <div>
              <span>Moved on add</span>
              <strong>
                {metrics.movedCount} of {metrics.keyCount}
              </strong>
            </div>
            <div>
              <span>Stayed put</span>
              <strong>{metrics.stayedCount} keys</strong>
            </div>
            <div>
              <span>Active nodes</span>
              <strong>{metrics.activeNodeCount}</strong>
            </div>
          </div>

          <HashRingRangeControl
            label="Nodes"
            max={HASH_RING_MAX_NODE_COUNT}
            min={HASH_RING_MIN_NODE_COUNT}
            onValueChange={updateNodeCount}
            step={1}
            value={nodeCount}
            valueLabel={`${metrics.activeNodeCount} nodes`}
          />

          <HashRingRangeControl
            label="Sample keys"
            max={HASH_RING_MAX_KEY_COUNT}
            min={HASH_RING_MIN_KEY_COUNT}
            onValueChange={updateKeyCount}
            step={1}
            value={keyCount}
            valueLabel={`${metrics.keyCount} dots`}
          />

          <p className="sp-hash-ring-note">{note}</p>
        </div>
      </div>
    </figure>
  );
}

function HashRingRangeControl({
  label,
  max,
  min,
  onValueChange,
  step = 1,
  value,
  valueLabel,
}: {
  label: string;
  max: number;
  min: number;
  onValueChange: (value: string) => void;
  step?: number;
  value: number;
  valueLabel: string;
}) {
  return (
    <label className="sp-hash-ring-control">
      <span>
        {label}
        <strong>{valueLabel}</strong>
      </span>
      <input
        max={max}
        min={min}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        onInput={(event) => onValueChange(event.currentTarget.value)}
        step={step}
        type="range"
        value={value}
      />
      <i aria-hidden="true">
        <span>{min}</span>
        <span>{max}</span>
      </i>
    </label>
  );
}

function DemoHeader({
  copy,
  eyebrow,
  title,
}: {
  copy: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <figcaption className="sp-demo-header">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </figcaption>
  );
}

function resizeHashRingCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): HashRingView {
  const rect = canvas.getBoundingClientRect();
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * devicePixelRatio));
  const height = Math.max(1, Math.round(rect.height * devicePixelRatio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  return {
    cssHeight: rect.height,
    cssWidth: rect.width,
  };
}

function drawHashRingCanvas(
  context: CanvasRenderingContext2D,
  state: HashRingState,
  view: HashRingView,
) {
  const model = deriveHashRingModel(state, view);

  clearHashRingCanvas(context, view);
  drawHashRingBase(context, model);
  drawHashRingOwnershipArcs(context, model);
  drawHashRingTokens(context, model);
  drawHashRingKeys(context, model);
  drawHashRingCenterLabel(context, state, model);
}

function clearHashRingCanvas(
  context: CanvasRenderingContext2D,
  view: HashRingView,
) {
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, view.cssWidth, view.cssHeight);
}

function deriveHashRingModel(
  state: HashRingState,
  view: HashRingView,
): HashRingModel {
  const center = {
    x: view.cssWidth * 0.5,
    y: view.cssHeight * 0.43,
  };
  const radius = Math.min(view.cssWidth * 0.31, view.cssHeight * 0.3, 172);
  const previousNodeCount = Math.max(
    HASH_RING_MIN_NODE_COUNT,
    state.nodeCount - 1,
  );
  const previousTokens = buildHashRingTokens(
    previousNodeCount,
    HASH_RING_VIRTUAL_TOKEN_COUNT,
  );
  const currentTokens = buildHashRingTokens(
    state.nodeCount,
    HASH_RING_VIRTUAL_TOKEN_COUNT,
  );
  const keys = Array.from({ length: state.keyCount }, (_, index) => {
    const hash = sampleKeyHash(index);
    const beforeOwner = ownerForHash(previousTokens, hash).node;
    const afterOwner = ownerForHash(currentTokens, hash).node;

    return {
      afterOwner,
      hash,
      index,
      moved: beforeOwner !== afterOwner,
      radiusOffset: sampleKeyRadiusOffset(index),
    };
  });
  const movedCount = keys.filter((key) => key.moved).length;

  return {
    activeNodeCount: state.nodeCount,
    center,
    currentTokens,
    keyCount: state.keyCount,
    keys,
    movedCount,
    radius,
    stayedCount: state.keyCount - movedCount,
  };
}

function buildHashRingTokens(nodeCount: number, virtualTokenCount: number) {
  const tokens: HashRingToken[] = [];

  for (let node = 0; node < nodeCount; node += 1) {
    for (let replica = 0; replica < virtualTokenCount; replica += 1) {
      tokens.push({
        hash: hashUnit(`node-${node}-token-${replica}`),
        node,
        replica,
      });
    }
  }

  return tokens.sort((left, right) => left.hash - right.hash);
}

function ownerForHash(tokens: HashRingToken[], hash: number): HashRingToken {
  const owner = tokens.find((token) => token.hash >= hash) ?? tokens[0];
  if (!owner) {
    throw new Error("consistent hashing ring requires at least one token");
  }

  return owner;
}

function drawHashRingBase(
  context: CanvasRenderingContext2D,
  model: HashRingModel,
) {
  context.save();
  context.strokeStyle = "#d9deea";
  context.lineWidth = 18;
  context.beginPath();
  context.arc(model.center.x, model.center.y, model.radius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "rgba(23, 32, 51, 0.25)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(model.center.x, model.center.y, model.radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawHashRingOwnershipArcs(
  context: CanvasRenderingContext2D,
  model: HashRingModel,
) {
  drawHashRingOwnershipArcSet(context, model, model.currentTokens, 0.36);
}

function drawHashRingOwnershipArcSet(
  context: CanvasRenderingContext2D,
  model: HashRingModel,
  tokens: HashRingToken[],
  alpha: number,
) {
  if (alpha <= 0.01) return;

  context.save();
  context.lineWidth = 12;
  context.lineCap = "round";

  tokens.forEach((token, index) => {
    const previous = tokens[(index - 1 + tokens.length) % tokens.length];
    let start = angleForHash(previous.hash);
    let end = angleForHash(token.hash);
    if (end <= start) end += Math.PI * 2;

    context.strokeStyle = nodeColor(token.node);
    context.globalAlpha = alpha;
    context.beginPath();
    context.arc(model.center.x, model.center.y, model.radius, start, end);
    context.stroke();
  });

  context.restore();
}

function drawHashRingTokens(
  context: CanvasRenderingContext2D,
  model: HashRingModel,
) {
  model.currentTokens.forEach((token) => {
    const point = pointOnHashRing(model.center, model.radius, token.hash);

    context.save();
    context.fillStyle = "#ffffff";
    context.strokeStyle = nodeColor(token.node);
    context.lineWidth = TOKEN_STROKE_WIDTH;
    context.beginPath();
    context.arc(point.x, point.y, TOKEN_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  });
}

function drawHashRingKeys(
  context: CanvasRenderingContext2D,
  model: HashRingModel,
) {
  model.keys.forEach((key) => {
    const point = pointOnHashRing(
      model.center,
      model.radius + SAMPLE_KEY_RADIUS_OFFSET + key.radiusOffset,
      key.hash,
    );

    context.save();
    context.fillStyle = key.moved ? "#d24a44" : nodeColor(key.afterOwner);
    context.globalAlpha = key.moved ? 0.9 : 0.42;
    context.beginPath();
    context.arc(
      point.x,
      point.y,
      key.moved ? MOVED_KEY_RADIUS : SAMPLE_KEY_RADIUS,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  });
}

function drawHashRingCenterLabel(
  context: CanvasRenderingContext2D,
  state: HashRingState,
  model: HashRingModel,
) {
  const title = `${state.nodeCount} nodes`;
  const detail =
    state.nodeCount === HASH_RING_MIN_NODE_COUNT
      ? "baseline ring"
      : "red keys moved";

  const titleFontSize = clampNumber(model.radius * 0.08, 12, 14);
  const detailFontSize = clampNumber(model.radius * 0.074, 11, 13);
  const maxLineWidth = model.radius * 1.34;
  const detailLines = wrapHashRingLabelText(
    context,
    detail,
    maxLineWidth,
    detailFontSize,
  );
  const lineHeight = Math.max(16, detailFontSize + 5);
  const lines = [
    {
      color: "#172033",
      fontSize: titleFontSize,
      text: title,
    },
    ...detailLines.map((text) => ({
      color: "#5c667a",
      fontSize: detailFontSize,
      text,
    })),
  ];
  const totalHeight = titleFontSize + detailLines.length * lineHeight;
  let y = model.center.y - totalHeight / 2 + titleFontSize / 2;

  lines.forEach((line, index) => {
    drawHashRingLabel(
      context,
      line.text,
      model.center.x,
      y,
      line.color,
      line.fontSize,
    );
    y += index === 0 ? lineHeight + 2 : lineHeight;
  });
}

function wrapHashRingLabelText(
  context: CanvasRenderingContext2D,
  text: string,
  maxLineWidth: number,
  fontSize: number,
) {
  context.save();
  context.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (currentLine && context.measureText(candidate).width > maxLineWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  });

  if (currentLine) lines.push(currentLine);
  context.restore();

  return lines;
}

function drawHashRingLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  fontSize: number,
) {
  context.save();
  context.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
  context.restore();
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sampleKeyHash(index: number) {
  const naturalBase = wrapUnit((index + 1) * GOLDEN_RATIO_CONJUGATE);
  const jitter = (hashUnit(`sample-key-angle-${index}`) - 0.5) * 0.026;

  return wrapUnit(naturalBase + jitter);
}

function sampleKeyRadiusOffset(index: number) {
  return (
    (hashUnit(`sample-key-radius-${index}`) - 0.5) *
    SAMPLE_KEY_RADIUS_JITTER *
    2
  );
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function wrapUnit(value: number) {
  return ((value % 1) + 1) % 1;
}

function hashUnit(text: string) {
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)) / 9007199254740992;
}

function angleForHash(value: number) {
  return value * Math.PI * 2 - Math.PI / 2;
}

function pointOnHashRing(center: HashRingPoint, radius: number, value: number) {
  return pointAtHashRingAngle(center, radius, angleForHash(value));
}

function pointAtHashRingAngle(
  center: HashRingPoint,
  radius: number,
  angle: number,
) {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function nodeColor(node: number) {
  return HASH_RING_NODE_COLORS[node % HASH_RING_NODE_COLORS.length];
}
