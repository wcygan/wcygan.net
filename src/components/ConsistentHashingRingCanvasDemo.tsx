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
  hash: number;
  index: number;
  moved: boolean;
  owner: number;
  selected: boolean;
};

type HashRingState = {
  keyCount: number;
  nodeCount: number;
  selectedKeyIndex: number;
  showAllKeys: boolean;
  showLoad: boolean;
  showMovement: boolean;
  virtualTokenCount: number;
};

type HashRingModel = {
  center: HashRingPoint;
  keys: HashRingKey[];
  loads: number[];
  movedCount: number;
  radius: number;
  selected: HashRingKey | undefined;
  selectedOwner: number;
  skew: number;
  tokens: HashRingToken[];
};

const HASH_RING_DEFAULT_STATE: HashRingState = {
  keyCount: 20,
  nodeCount: 4,
  selectedKeyIndex: 7,
  showAllKeys: false,
  showLoad: false,
  showMovement: false,
  virtualTokenCount: 2,
};

const HASH_RING_NODE_COLORS = [
  "#2f69f0",
  "#d24a44",
  "#1d8b65",
  "#d59b24",
  "#7c5cff",
  "#00a3a3",
  "#c44f93",
  "#6b7280",
];

const HASH_RING_AUTO_ADVANCE_MS = 1350;
const SAMPLE_KEY_RADIUS_OFFSET = 22;
const SELECTED_KEY_RADIUS_OFFSET = 36;
const SAMPLE_KEY_RADIUS = 2.5;
const MOVED_KEY_RADIUS = 4;
const SELECTED_KEY_RADIUS = 7;
const TOKEN_RADIUS = 5;
const TOKEN_STROKE_WIDTH = 2;
const SELECTED_ROUTE_LINE_WIDTH = 3;
const SELECTED_ROUTE_ARROW_SIZE = 7;

export function ConsistentHashingRingCanvasDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [nodeCount, setNodeCount] = useState(HASH_RING_DEFAULT_STATE.nodeCount);
  const [virtualTokenCount, setVirtualTokenCount] = useState(
    HASH_RING_DEFAULT_STATE.virtualTokenCount,
  );
  const [keyCount, setKeyCount] = useState(HASH_RING_DEFAULT_STATE.keyCount);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState(
    HASH_RING_DEFAULT_STATE.selectedKeyIndex,
  );
  const [showAllKeys, setShowAllKeys] = useState(
    HASH_RING_DEFAULT_STATE.showAllKeys,
  );
  const [showMovement, setShowMovement] = useState(
    HASH_RING_DEFAULT_STATE.showMovement,
  );
  const [showLoad, setShowLoad] = useState(HASH_RING_DEFAULT_STATE.showLoad);
  const state = useMemo<HashRingState>(
    () => ({
      keyCount,
      nodeCount,
      selectedKeyIndex,
      showAllKeys,
      showLoad,
      showMovement,
      virtualTokenCount,
    }),
    [
      keyCount,
      nodeCount,
      selectedKeyIndex,
      showAllKeys,
      showLoad,
      showMovement,
      virtualTokenCount,
    ],
  );
  const metrics = useMemo(
    () => deriveHashRingModel(state, { cssHeight: 460, cssWidth: 720 }),
    [state],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) setPlaying(false);
  }, []);

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

  useEffect(() => {
    if (!playing || typeof window === "undefined") return;

    let frameId = 0;
    let lastTimestamp = 0;
    let advanceElapsed = 0;

    const tick = (timestamp: number) => {
      const deltaMs =
        lastTimestamp === 0 ? 0 : Math.min(timestamp - lastTimestamp, 50);
      lastTimestamp = timestamp;
      advanceElapsed += deltaMs;

      if (advanceElapsed >= HASH_RING_AUTO_ADVANCE_MS) {
        const steps = Math.floor(advanceElapsed / HASH_RING_AUTO_ADVANCE_MS);
        advanceElapsed %= HASH_RING_AUTO_ADVANCE_MS;
        setSelectedKeyIndex((currentIndex) =>
          normalizeHashRingIndex(currentIndex + steps, keyCount),
        );
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [keyCount, playing]);

  const ownerLabel = formatNodeLabel(metrics.selectedOwner);

  const updateNodeCount = (value: string) => {
    setPlaying(false);
    setNodeCount(clampInteger(Number(value), 3, 8));
  };

  const updateVirtualTokenCount = (value: string) => {
    setPlaying(false);
    setVirtualTokenCount(clampInteger(Number(value), 1, 8));
  };

  const updateKeyCount = (value: string) => {
    const nextKeyCount = clampInteger(Number(value), 12, 72);
    setPlaying(false);
    setKeyCount(nextKeyCount);
    setSelectedKeyIndex((currentIndex) =>
      Math.min(currentIndex, nextKeyCount - 1),
    );
  };

  const updateSelectedKey = (value: string) => {
    setPlaying(false);
    setSelectedKeyIndex(clampInteger(Number(value), 0, keyCount - 1));
  };

  const resetDemo = () => {
    setPlaying(false);
    setNodeCount(HASH_RING_DEFAULT_STATE.nodeCount);
    setVirtualTokenCount(HASH_RING_DEFAULT_STATE.virtualTokenCount);
    setKeyCount(HASH_RING_DEFAULT_STATE.keyCount);
    setSelectedKeyIndex(HASH_RING_DEFAULT_STATE.selectedKeyIndex);
    setShowAllKeys(HASH_RING_DEFAULT_STATE.showAllKeys);
    setShowMovement(HASH_RING_DEFAULT_STATE.showMovement);
    setShowLoad(HASH_RING_DEFAULT_STATE.showLoad);
  };

  const stepSelectedKey = () => {
    setPlaying(false);
    setSelectedKeyIndex((currentIndex) =>
      normalizeHashRingIndex(currentIndex + 1, keyCount),
    );
  };

  return (
    <figure className="sp-demo sp-hash-ring-canvas-demo">
      <DemoHeader
        eyebrow="Crossing shards"
        title="Consistent Hashing Ring"
        copy="Keys and virtual tokens share one hash ring. A key belongs to the next token clockwise, so adding a node only moves keys in the intervals that node claims."
      />

      <div
        className="sp-hash-ring-workbench"
        aria-label="Interactive consistent hashing demo"
      >
        <div className="sp-hash-ring-stage">
          <canvas
            aria-label="Consistent hashing ring diagram"
            ref={canvasRef}
          />
          <div className="sp-hash-ring-metrics" aria-live="polite">
            <div>
              <span>Selected owner</span>
              <strong>{ownerLabel}</strong>
            </div>
            <div>
              <span>Load skew</span>
              <strong>{metrics.skew} keys</strong>
            </div>
            <div>
              <span>Moved on add</span>
              <strong>{metrics.movedCount} keys</strong>
            </div>
          </div>
        </div>

        <div className="sp-hash-ring-controls">
          <div className="sp-hash-ring-button-row">
            <button
              className="sp-playback-button"
              onClick={() => setPlaying((currentPlaying) => !currentPlaying)}
              type="button"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              className="sp-query-tab"
              onClick={stepSelectedKey}
              type="button"
            >
              Step
            </button>
            <button className="sp-query-tab" onClick={resetDemo} type="button">
              Reset
            </button>
          </div>

          <HashRingRangeControl
            label="Nodes"
            max={8}
            min={3}
            onValueChange={updateNodeCount}
            value={nodeCount}
            valueLabel={String(nodeCount)}
          />

          <HashRingRangeControl
            label="Virtual tokens"
            max={8}
            min={1}
            onValueChange={updateVirtualTokenCount}
            value={virtualTokenCount}
            valueLabel={`${virtualTokenCount} each`}
          />

          <HashRingRangeControl
            label="Sample keys"
            max={72}
            min={12}
            onValueChange={updateKeyCount}
            value={keyCount}
            valueLabel={String(keyCount)}
          />

          <HashRingRangeControl
            label="Selected key"
            max={keyCount - 1}
            min={0}
            onValueChange={updateSelectedKey}
            value={selectedKeyIndex}
            valueLabel={`key ${selectedKeyIndex}`}
          />

          <fieldset className="sp-hash-ring-layers">
            <legend>Layers</legend>
            <HashRingCheckbox
              checked={showAllKeys}
              label="Show all sample keys"
              onCheckedChange={setShowAllKeys}
            />
            <HashRingCheckbox
              checked={showMovement}
              label="Show keys moved by added node"
              onCheckedChange={setShowMovement}
            />
            <HashRingCheckbox
              checked={showLoad}
              label="Show load bars"
              onCheckedChange={setShowLoad}
            />
          </fieldset>

          <div className="sp-hash-ring-legend" aria-label="Drawing legend">
            <span>
              <i className="sp-hash-ring-swatch" />
              Virtual token
            </span>
            <span>
              <i className="sp-hash-ring-swatch sp-hash-ring-swatch-key" />
              Selected key owner
            </span>
            <span>
              <i className="sp-hash-ring-swatch sp-hash-ring-swatch-move" />
              Moved by added node
            </span>
          </div>
        </div>
      </div>
    </figure>
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

function HashRingRangeControl({
  label,
  max,
  min,
  onValueChange,
  value,
  valueLabel,
}: {
  label: string;
  max: number;
  min: number;
  onValueChange: (value: string) => void;
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
        type="range"
        value={value}
      />
    </label>
  );
}

function HashRingCheckbox({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label>
      <input
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
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
  drawHashRingKeys(context, state, model);
  drawHashRingSelectedRoute(context, model);
  if (state.showLoad) drawHashRingLoadBars(context, model, view);

  drawHashRingLabel(
    context,
    "selected key chooses",
    model.center.x,
    model.center.y,
    "#172033",
  );
  drawHashRingLabel(
    context,
    "next token clockwise",
    model.center.x,
    model.center.y + 22,
    "#5c667a",
  );
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
  const showLoadPanel = state.showLoad && view.cssWidth >= 620;
  const center = {
    x: showLoadPanel ? view.cssWidth * 0.43 : view.cssWidth * 0.5,
    y: view.cssHeight * 0.43,
  };
  const radius = Math.min(view.cssWidth * 0.27, view.cssHeight * 0.29, 170);
  const tokens = buildHashRingTokens(state.nodeCount, state.virtualTokenCount);
  const previousTokens = buildHashRingTokens(
    Math.max(1, state.nodeCount - 1),
    state.virtualTokenCount,
  );
  const keys = Array.from({ length: state.keyCount }, (_, index) => {
    const hash = hashUnit(`key-${index}`);
    const owner = ownerForHash(tokens, hash);
    const previousOwner = ownerForHash(previousTokens, hash);

    return {
      hash,
      index,
      moved: owner.node !== previousOwner.node,
      owner: owner.node,
      selected: index === state.selectedKeyIndex,
    };
  });
  const loads = Array.from(
    { length: state.nodeCount },
    (_, node) => keys.filter((key) => key.owner === node).length,
  );
  const selected = keys[state.selectedKeyIndex] ?? keys[0];
  const selectedOwner = selected?.owner ?? 0;
  const movedCount = keys.filter((key) => key.moved).length;
  const skew = Math.max(...loads) - Math.min(...loads);

  return {
    center,
    keys,
    loads,
    movedCount,
    radius,
    selected,
    selectedOwner,
    skew,
    tokens,
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
  context.save();
  context.lineWidth = 12;
  context.lineCap = "round";

  model.tokens.forEach((token, index) => {
    const previous =
      model.tokens[(index - 1 + model.tokens.length) % model.tokens.length];
    let start = angleForHash(previous.hash);
    let end = angleForHash(token.hash);
    if (end <= start) end += Math.PI * 2;

    context.strokeStyle = nodeColor(token.node);
    context.globalAlpha = 0.3;
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
  model.tokens.forEach((token) => {
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
  state: HashRingState,
  model: HashRingModel,
) {
  model.keys.forEach((key) => {
    const shouldDraw =
      key.selected || state.showAllKeys || (state.showMovement && key.moved);
    if (!shouldDraw) return;

    const radius =
      model.radius +
      (key.selected ? SELECTED_KEY_RADIUS_OFFSET : SAMPLE_KEY_RADIUS_OFFSET);
    const point = pointOnHashRing(model.center, radius, key.hash);
    const moved = state.showMovement && key.moved;
    const keyColor = key.selected
      ? nodeColor(key.owner)
      : moved
        ? "#d24a44"
        : "#172033";
    const keyRadius = key.selected
      ? SELECTED_KEY_RADIUS
      : moved
        ? MOVED_KEY_RADIUS
        : SAMPLE_KEY_RADIUS;

    context.save();
    context.fillStyle = keyColor;
    context.globalAlpha = key.selected ? 1 : moved ? 0.82 : 0.28;
    context.beginPath();
    context.arc(point.x, point.y, keyRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawHashRingSelectedRoute(
  context: CanvasRenderingContext2D,
  model: HashRingModel,
) {
  if (!model.selected) return;

  const keyRadius = model.radius + SELECTED_KEY_RADIUS_OFFSET;
  const tokenOuterRadius = model.radius + TOKEN_RADIUS;
  const ownerToken = ownerForHash(model.tokens, model.selected.hash);
  const selectedAngle = angleForHash(model.selected.hash);
  const ownerAngle = angleForHash(ownerToken.hash);
  const routeColor = nodeColor(ownerToken.node);
  let start = selectedAngle;
  let end = ownerAngle;
  if (end <= start) end += Math.PI * 2;

  const routeTurnPoint = pointAtHashRingAngle(model.center, keyRadius, end);
  const arrowPoint = pointAtHashRingAngle(model.center, tokenOuterRadius, end);
  const keyLabelPoint = pointAtHashRingAngle(
    model.center,
    keyRadius + 18,
    selectedAngle,
  );
  const ownerLabelPoint = pointAtHashRingAngle(
    model.center,
    model.radius - 24,
    ownerAngle,
  );

  context.save();
  context.strokeStyle = routeColor;
  context.lineWidth = SELECTED_ROUTE_LINE_WIDTH;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.arc(model.center.x, model.center.y, keyRadius, start, end);
  context.lineTo(routeTurnPoint.x, routeTurnPoint.y);
  context.lineTo(arrowPoint.x, arrowPoint.y);
  context.stroke();
  context.restore();

  drawHashRingArrowhead(context, arrowPoint, end + Math.PI, routeColor);
  drawHashRingLabel(
    context,
    `key ${model.selected.index}`,
    keyLabelPoint.x,
    keyLabelPoint.y,
    routeColor,
  );
  drawHashRingLabel(
    context,
    formatNodeLabel(model.selectedOwner),
    ownerLabelPoint.x,
    ownerLabelPoint.y,
    nodeColor(model.selectedOwner),
  );
}

function drawHashRingLoadBars(
  context: CanvasRenderingContext2D,
  model: HashRingModel,
  view: HashRingView,
) {
  if (view.cssWidth < 620) return;

  const x = Math.max(18, model.center.x + model.radius + 72);
  const y = Math.max(70, model.center.y - model.radius * 0.68);
  const barWidth = Math.min(120, view.cssWidth - x - 20);
  const maxLoad = Math.max(...model.loads, 1);

  drawHashRingLabel(context, "sample key load", x, y - 16, "#5c667a", "left");
  model.loads.forEach((load, node) => {
    const rowY = y + node * 23;
    context.save();
    context.fillStyle = "rgba(217, 222, 234, 0.75)";
    context.fillRect(x, rowY, barWidth, 10);
    context.fillStyle = nodeColor(node);
    context.fillRect(x, rowY, (load / maxLoad) * barWidth, 10);
    context.restore();
    drawHashRingLabel(
      context,
      `N${String.fromCharCode(65 + node)} ${load}`,
      x - 8,
      rowY + 10,
      "#5c667a",
      "right",
    );
  });
}

function drawHashRingArrowhead(
  context: CanvasRenderingContext2D,
  point: HashRingPoint,
  angle: number,
  color: string,
) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(point.x, point.y);
  context.lineTo(
    point.x - Math.cos(angle - Math.PI / 6) * SELECTED_ROUTE_ARROW_SIZE,
    point.y - Math.sin(angle - Math.PI / 6) * SELECTED_ROUTE_ARROW_SIZE,
  );
  context.lineTo(
    point.x - Math.cos(angle + Math.PI / 6) * SELECTED_ROUTE_ARROW_SIZE,
    point.y - Math.sin(angle + Math.PI / 6) * SELECTED_ROUTE_ARROW_SIZE,
  );
  context.closePath();
  context.fill();
  context.restore();
}

function drawHashRingLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign = "center",
) {
  context.save();
  context.font = "700 14px Inter, system-ui, sans-serif";
  context.fillStyle = color;
  context.textAlign = align;
  context.fillText(text, x, y);
  context.restore();
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

function normalizeHashRingIndex(index: number, count: number) {
  return ((index % count) + count) % count;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function nodeColor(node: number) {
  return HASH_RING_NODE_COLORS[node % HASH_RING_NODE_COLORS.length];
}

function formatNodeLabel(node: number) {
  return `node ${String.fromCharCode(65 + node)}`;
}
