import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  COMPLETE_TOOL_CALLING_SNAPSHOT,
  deriveToolCallingSnapshot,
  type FlowRoute,
  type FlowSegment,
  INITIAL_TOOL_CALLING_SNAPSHOT,
  type JsonValue,
  TOOL_CALLING_DURATION_MS,
  type ToolCallingPayload,
  type ToolCallingSnapshot,
} from "~/demos/llm-tool-calling/model";

const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type ActorKind = "keyboard" | "computer" | "api" | "tool";

const ROUTES_BY_SEGMENT: Record<
  FlowSegment,
  { direction: "request" | "response"; name: FlowRoute }
> = {
  input: { direction: "request", name: "human" },
  prompt: { direction: "request", name: "remote" },
  "tool-request": { direction: "response", name: "remote" },
  "tool-execution": { direction: "request", name: "tool" },
  "tool-result": { direction: "response", name: "tool" },
  context: { direction: "request", name: "remote" },
  answer: { direction: "response", name: "remote" },
  delivery: { direction: "response", name: "human" },
};

type RouteDirection = "request" | "response";
type RouteRefs = Partial<
  Record<FlowRoute, Partial<Record<RouteDirection, SVGPathElement>>>
>;

export function ToolCallingFlowDemo() {
  const { actorRefs, replay, routeRefs, snapshot, stageRef, tokenRef } =
    useToolCallingPlayback();
  const activeSegment = snapshot.segment;

  return (
    <figure
      className="tool-calling-network"
      data-graphic-frame="workbench"
      data-graphic-key="llm-tool-calling-flow"
      data-graphic-kind="svg"
      data-phase={snapshot.phase}
      aria-labelledby="tool-calling-network-title"
      aria-describedby="tool-calling-network-description tool-calling-network-caption"
    >
      <header className="tool-calling-network-header">
        <div>
          <p className="article-graphic-title" id="tool-calling-network-title">
            Agent Harness: Tool Call Flow
          </p>
          <p>LLMs request real-world information from the harness</p>
        </div>
        <button
          className="tool-calling-network-replay"
          type="button"
          onClick={replay}
        >
          Replay
        </button>
      </header>

      <p className="sr-only" id="tool-calling-network-description">
        A keyboard sends a question to a local computer running the application
        harness. The harness calls an external LLM API, receives a tool request,
        validates that list_directory is available in its local tool registry,
        runs ls src/components, sends the three returned filenames back to the
        API, and presents DemoReplayButton.tsx, NPlusOneQueryDemos.tsx, and
        TableOfContents.tsx to the person.
      </p>

      <div
        className="tool-calling-network-stage"
        data-graphic-stage="padded"
        aria-hidden="true"
        ref={stageRef}
      >
        <svg
          className="tool-calling-network-routes"
          viewBox="0 0 680 340"
          preserveAspectRatio="none"
        >
          <Route activeSegment={activeSegment} routeRefs={routeRefs} />
          <g className="tool-calling-network-token" ref={tokenRef}>
            <circle className="tool-calling-network-token-glow" r="11" />
            <circle className="tool-calling-network-token-core" r="5" />
          </g>
        </svg>
        <Actor
          actorRefs={actorRefs}
          kind="keyboard"
          state={snapshot.actorStates.keyboard}
          title="Human input"
          detail="keyboard"
        />
        <Actor
          actorRefs={actorRefs}
          kind="computer"
          state={snapshot.actorStates.computer}
          title="Local computer"
          detail="application harness"
        />
        <Actor
          actorRefs={actorRefs}
          kind="api"
          state={snapshot.actorStates.api}
          title="External API"
          detail="LLM inference"
        />
        <Actor
          actorRefs={actorRefs}
          kind="tool"
          state={snapshot.actorStates.tool}
          title="Local tool"
          detail="list_directory"
        />

        {snapshot.payload ? (
          <PayloadCard key={snapshot.phase} payload={snapshot.payload} />
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete
          ? "Complete. The external LLM API requested a tool, but the local application harness validated and executed it before returning the final answer."
          : ""}
      </p>

      <figcaption id="tool-calling-network-caption">
        Tools are programs that run in the agent harness; they aren't executed
        by the LLM directly
      </figcaption>
    </figure>
  );
}

function PayloadCard({ payload }: { payload: ToolCallingPayload }) {
  if (payload.kind === "json") {
    return (
      <div className="tool-calling-network-payload" data-kind="json">
        <JsonPayload value={payload.value} />
      </div>
    );
  }

  if (payload.kind === "terminal") {
    return (
      <div className="tool-calling-network-payload" data-kind="terminal">
        <pre>
          <span data-token="validation">✓ {payload.validation}</span>
          {"\n"}
          <span data-token="prompt">$ {payload.command}</span>
          {"\n"}
          {payload.files.map((file) => (
            <span className="tool-calling-network-code-line" key={file}>
              {file}
            </span>
          ))}
        </pre>
      </div>
    );
  }

  if (payload.kind === "result") {
    return (
      <div className="tool-calling-network-payload" data-kind="result">
        <pre>
          {payload.lines.map((line) => (
            <span className="tool-calling-network-code-line" key={line}>
              {line}
            </span>
          ))}
        </pre>
      </div>
    );
  }

  return (
    <div className="tool-calling-network-payload" data-kind="prompt">
      <pre>
        <span data-token="prompt">&gt; {payload.text}</span>
      </pre>
    </div>
  );
}

type JsonTokenKind =
  | "boolean"
  | "key"
  | "null"
  | "number"
  | "punctuation"
  | "string";

type JsonToken = { kind: JsonTokenKind; text: string };

export function JsonPayload({ value }: { value: JsonValue }) {
  return (
    <pre className="tool-calling-network-json">
      {formatJsonLines(value).map((line, lineIndex) => (
        <span className="tool-calling-network-code-line" key={lineIndex}>
          {line.map((token, tokenIndex) => (
            <span data-token={token.kind} key={`${token.text}-${tokenIndex}`}>
              {token.text}
            </span>
          ))}
        </span>
      ))}
    </pre>
  );
}

function formatJsonLines(
  value: JsonValue,
  depth = 0,
  allowCompactObject = true,
): JsonToken[][] {
  if (isPrimitive(value)) return [[literal(value)]];

  if (Array.isArray(value)) {
    const items = value.map((item) => formatJsonLines(item, depth + 1));
    if (items.every((item) => item.length === 1)) {
      return compactArrayLines(
        items.map((item) => item[0][0]),
        depth,
      );
    }

    return multilineValueLines("[", "]", items, depth);
  }

  const entries = Object.entries(value);
  if (allowCompactObject && canCompactObject(entries)) {
    return [compactObject(entries)];
  }

  const lines: JsonToken[][] = [[punctuation("{")]];
  for (const [entryIndex, [key, item]] of entries.entries()) {
    const formattedItem = formatJsonLines(item, depth + 1);
    const itemLines =
      entryIndex < entries.length - 1
        ? withTrailingComma(formattedItem)
        : formattedItem;

    lines.push([
      indentation(depth + 1),
      { kind: "key", text: JSON.stringify(key) },
      punctuation(": "),
      ...itemLines[0],
    ]);
    lines.push(...itemLines.slice(1));
  }
  lines.push([indentation(depth), punctuation("}")]);
  return lines;
}

function compactArrayLines(items: JsonToken[], depth: number): JsonToken[][] {
  const lines: JsonToken[][] = [[punctuation("[")]];
  for (let index = 0; index < items.length; index += 2) {
    const row = [indentation(depth + 1), items[index]];
    if (index + 1 < items.length) {
      row.push(punctuation(", "), items[index + 1]);
    }
    if (index + 2 < items.length) row.push(punctuation(","));
    lines.push(row);
  }
  lines.push([indentation(depth), punctuation("]")]);
  return lines;
}

function multilineValueLines(
  opening: string,
  closing: string,
  items: JsonToken[][][],
  depth: number,
): JsonToken[][] {
  const lines: JsonToken[][] = [[punctuation(opening)]];
  for (const [index, item] of items.entries()) {
    const itemLines = index < items.length - 1 ? withTrailingComma(item) : item;
    lines.push(...itemLines);
  }
  lines.push([indentation(depth), punctuation(closing)]);
  return lines;
}

function compactObject(entries: [string, JsonValue][]): JsonToken[] {
  const tokens: JsonToken[] = [punctuation("{ ")];
  for (const [index, [key, value]] of entries.entries()) {
    if (!isPrimitive(value)) continue;
    tokens.push(
      { kind: "key", text: JSON.stringify(key) },
      punctuation(": "),
      literal(value),
    );
    if (index < entries.length - 1) tokens.push(punctuation(", "));
  }
  tokens.push(punctuation(" }"));
  return tokens;
}

function canCompactObject(entries: [string, JsonValue][]) {
  return (
    entries.every(([, value]) => isPrimitive(value)) &&
    JSON.stringify(Object.fromEntries(entries)).length <= 48
  );
}

function isPrimitive(
  value: JsonValue,
): value is boolean | null | number | string {
  return value === null || typeof value !== "object";
}

function literal(value: boolean | null | number | string): JsonToken {
  if (value === null) return { kind: "null", text: "null" };
  if (typeof value === "boolean") {
    return { kind: "boolean", text: String(value) };
  }
  if (typeof value === "number") return { kind: "number", text: String(value) };
  return { kind: "string", text: JSON.stringify(value) };
}

function punctuation(text: string): JsonToken {
  return { kind: "punctuation", text };
}

function indentation(depth: number): JsonToken {
  return punctuation("  ".repeat(depth));
}

function withTrailingComma(lines: JsonToken[][]): JsonToken[][] {
  const result = lines.map((line) => [...line]);
  result.at(-1)?.push(punctuation(","));
  return result;
}

function Route({
  activeSegment,
  routeRefs,
}: {
  activeSegment?: FlowSegment;
  routeRefs: React.MutableRefObject<RouteRefs>;
}) {
  const activeRoute = activeSegment
    ? ROUTES_BY_SEGMENT[activeSegment]
    : undefined;

  return (
    <g className="tool-calling-network-route-set">
      {(["human", "remote", "tool"] as const).flatMap((name) =>
        (["request", "response"] as const).map((direction) => {
          const active =
            activeRoute?.name === name && activeRoute.direction === direction;

          return (
            <g key={`${name}-${direction}`}>
              <path
                className="tool-calling-network-travel"
                d={
                  name === "tool"
                    ? "M340 207V263"
                    : name === "human"
                      ? "M162 172H269"
                      : "M411 172H518"
                }
                data-direction={direction}
                data-route={name}
                ref={(node) => {
                  const route = (routeRefs.current[name] ??= {});
                  route[direction] = node ?? undefined;
                }}
              />
              <path
                className="tool-calling-network-arrow"
                data-active={active ? "true" : undefined}
                data-direction={direction}
                data-route={name}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

function Actor({
  actorRefs,
  detail,
  kind,
  state,
  title,
}: {
  actorRefs: React.MutableRefObject<Partial<Record<ActorKind, HTMLDivElement>>>;
  detail: string;
  kind: ActorKind;
  state: "idle" | "active" | "complete";
  title: string;
}) {
  return (
    <div
      className={`tool-calling-network-actor tool-calling-network-actor--${kind}`}
      data-state={state}
      ref={(node) => {
        actorRefs.current[kind] = node ?? undefined;
      }}
    >
      <ActorIcon kind={kind} />
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function ActorIcon({ kind }: { kind: ActorKind }) {
  if (kind === "keyboard") {
    return (
      <svg viewBox="0 0 48 32">
        <rect x="3" y="8" width="42" height="20" rx="3" />
        <path d="M9 14h2M15 14h2M21 14h2M27 14h2M33 14h2M9 20h18M30 20h9" />
      </svg>
    );
  }
  if (kind === "computer") {
    return (
      <svg viewBox="0 0 48 40">
        <rect x="5" y="3" width="38" height="26" rx="3" />
        <path d="M19 36h10M24 29v7M13 14h22" />
      </svg>
    );
  }
  if (kind === "api") {
    return (
      <svg viewBox="0 0 48 40">
        <path d="M8 15a8 8 0 0 1 9-8 10 10 0 0 1 18 4 7 7 0 0 1 5 13H10a6 6 0 0 1-2-9Z" />
        <path d="M14 31h20M18 36h12" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 40">
      <path d="M9 10h30v23H9zM15 5h18M15 17h18M15 24h18" />
    </svg>
  );
}

function useToolCallingPlayback(): {
  actorRefs: React.MutableRefObject<Partial<Record<ActorKind, HTMLDivElement>>>;
  replay: () => void;
  routeRefs: React.MutableRefObject<RouteRefs>;
  snapshot: ToolCallingSnapshot;
  stageRef: React.RefObject<HTMLDivElement | null>;
  tokenRef: React.RefObject<SVGGElement | null>;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_TOOL_CALLING_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);
  const actorRefs = useRef<Partial<Record<ActorKind, HTMLDivElement>>>({});
  const routeRefs = useRef<RouteRefs>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<SVGGElement>(null);

  const placeToken = useCallback((next: ToolCallingSnapshot) => {
    const token = tokenRef.current;
    if (!token) return;
    const segment = next.segment ?? (next.isComplete ? "delivery" : undefined);
    const route = segment ? ROUTES_BY_SEGMENT[segment] : undefined;
    const path = route
      ? routeRefs.current[route.name]?.[route.direction]
      : undefined;
    if (!path) {
      token.style.opacity = next.isComplete ? "1" : "0";
      return;
    }

    const progress = next.isComplete ? 1 : next.segmentProgress;
    const point = path.getPointAtLength(path.getTotalLength() * progress);
    token.setAttribute("transform", `translate(${point.x} ${point.y})`);
    token.style.opacity = "1";
  }, []);

  useRouteGeometry(stageRef, actorRefs, routeRefs);

  useClientLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSnapshot(COMPLETE_TOOL_CALLING_SNAPSHOT);
      placeToken(COMPLETE_TOOL_CALLING_SNAPSHOT);
    }
  }, [placeToken]);

  const replay = useCallback(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const next = reducedMotion
      ? COMPLETE_TOOL_CALLING_SNAPSHOT
      : INITIAL_TOOL_CALLING_SNAPSHOT;
    setSnapshot(next);
    placeToken(next);
    setPlaybackId((current) => current + 1);
  }, [placeToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stage = stageRef.current;
    let animationFrame = 0;
    let elapsedMs = reducedMotion.matches ? TOOL_CALLING_DURATION_MS : 0;
    let previousFrame: number | undefined;
    let isVisible = false;
    let previousPhase = snapshot.phase;

    const stop = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = undefined;
    };

    const render = (next: ToolCallingSnapshot) => {
      placeToken(next);
      if (next.phase !== previousPhase) {
        previousPhase = next.phase;
        setSnapshot(next);
      }
    };

    const complete = () => {
      elapsedMs = TOOL_CALLING_DURATION_MS;
      stop();
      previousPhase = "complete";
      setSnapshot(COMPLETE_TOOL_CALLING_SNAPSHOT);
      placeToken(COMPLETE_TOOL_CALLING_SNAPSHOT);
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) elapsedMs += now - previousFrame;
      previousFrame = now;
      const next = deriveToolCallingSnapshot(elapsedMs);
      render(next);
      if (!next.isComplete) animationFrame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      stop();
      if (
        reducedMotion.matches ||
        document.hidden ||
        !isVisible ||
        elapsedMs >= TOOL_CALLING_DURATION_MS
      ) {
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      if (reducedMotion.matches) {
        complete();
        return;
      }
      elapsedMs = 0;
      previousPhase = "establishing";
      setSnapshot(INITIAL_TOOL_CALLING_SNAPSHOT);
      placeToken(INITIAL_TOOL_CALLING_SNAPSHOT);
      start();
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(([entry]) => {
            isVisible = entry?.isIntersecting ?? false;
            start();
          });

    if (reducedMotion.matches) complete();
    else if (stage && observer) observer.observe(stage);
    else {
      isVisible = true;
      start();
    }
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", start);

    return () => {
      stop();
      observer?.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", start);
    };
  }, [placeToken, playbackId]);

  return {
    actorRefs,
    replay,
    routeRefs,
    snapshot,
    stageRef,
    tokenRef,
  };
}

function useRouteGeometry(
  stageRef: React.RefObject<HTMLDivElement | null>,
  actorRefs: React.MutableRefObject<Partial<Record<ActorKind, HTMLDivElement>>>,
  routeRefs: React.MutableRefObject<RouteRefs>,
) {
  useClientLayoutEffect(() => {
    const stage = stageRef.current;
    const keyboard = actorRefs.current.keyboard;
    const computer = actorRefs.current.computer;
    const api = actorRefs.current.api;
    const tool = actorRefs.current.tool;
    if (!stage || !keyboard || !computer || !api || !tool) return;

    const update = () => {
      const stageBox = stage.getBoundingClientRect();
      if (!stageBox.width || !stageBox.height) return;
      const routeBox =
        routeRefs.current.human?.request?.ownerSVGElement?.getBoundingClientRect() ??
        stageBox;

      const point = (x: number, y: number) => ({
        x: ((x - routeBox.left) / routeBox.width) * 680,
        y: ((y - routeBox.top) / routeBox.height) * 340,
      });
      const box = (element: HTMLDivElement) => element.getBoundingClientRect();
      const keyboardBox = box(keyboard);
      const computerBox = box(computer);
      const apiBox = box(api);
      const toolBox = box(tool);
      const humanStart = point(
        keyboardBox.right,
        keyboardBox.top + keyboardBox.height / 2,
      );
      const humanEnd = point(
        computerBox.left,
        computerBox.top + computerBox.height / 2,
      );
      const remoteStart = point(
        computerBox.right,
        computerBox.top + computerBox.height / 2,
      );
      const remoteEnd = point(apiBox.left, apiBox.top + apiBox.height / 2);
      const toolStart = point(
        computerBox.left + computerBox.width / 2,
        computerBox.bottom,
      );
      const toolEnd = point(toolBox.left + toolBox.width / 2, toolBox.top);
      const horizontalOffset = (5 / routeBox.height) * 340;
      const verticalOffset = (5 / routeBox.width) * 680;
      const horizontalArrowClearance = (0.5 / routeBox.width) * 680;
      const verticalArrowClearance = (0.5 / routeBox.height) * 340;
      const setRoute = (
        name: FlowRoute,
        direction: RouteDirection,
        travelPath: string,
        arrowPath: string,
      ) => {
        const travel = routeRefs.current[name]?.[direction];
        travel?.setAttribute("d", travelPath);
        const arrow = travel?.nextElementSibling;
        if (arrow instanceof SVGPathElement) arrow.setAttribute("d", arrowPath);
      };
      setRoute(
        "human",
        "request",
        `M${humanStart.x} ${humanStart.y - horizontalOffset}H${
          humanEnd.x - horizontalArrowClearance
        }`,
        horizontalArrow(
          humanStart.x,
          humanEnd.x - horizontalArrowClearance,
          humanStart.y - horizontalOffset,
          routeBox,
        ),
      );
      setRoute(
        "human",
        "response",
        `M${humanEnd.x} ${humanEnd.y + horizontalOffset}H${
          humanStart.x + horizontalArrowClearance
        }`,
        horizontalArrow(
          humanEnd.x,
          humanStart.x + horizontalArrowClearance,
          humanEnd.y + horizontalOffset,
          routeBox,
        ),
      );
      setRoute(
        "remote",
        "request",
        `M${remoteStart.x} ${remoteStart.y - horizontalOffset}H${
          remoteEnd.x - horizontalArrowClearance
        }`,
        horizontalArrow(
          remoteStart.x,
          remoteEnd.x - horizontalArrowClearance,
          remoteStart.y - horizontalOffset,
          routeBox,
        ),
      );
      setRoute(
        "remote",
        "response",
        `M${remoteEnd.x} ${remoteEnd.y + horizontalOffset}H${
          remoteStart.x + horizontalArrowClearance
        }`,
        horizontalArrow(
          remoteEnd.x,
          remoteStart.x + horizontalArrowClearance,
          remoteEnd.y + horizontalOffset,
          routeBox,
        ),
      );
      setRoute(
        "tool",
        "request",
        `M${toolStart.x - verticalOffset} ${toolStart.y}V${
          toolEnd.y - verticalArrowClearance
        }`,
        verticalArrow(
          toolStart.x - verticalOffset,
          toolStart.y,
          toolEnd.y - verticalArrowClearance,
          routeBox,
        ),
      );
      setRoute(
        "tool",
        "response",
        `M${toolEnd.x + verticalOffset} ${toolEnd.y}V${
          toolStart.y + verticalArrowClearance
        }`,
        verticalArrow(
          toolEnd.x + verticalOffset,
          toolEnd.y,
          toolStart.y + verticalArrowClearance,
          routeBox,
        ),
      );
    };

    update();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(keyboard);
    observer.observe(computer);
    observer.observe(api);
    observer.observe(tool);
    return () => observer.disconnect();
  }, [actorRefs, routeRefs, stageRef]);
}

function horizontalArrow(
  start: number,
  end: number,
  centerY: number,
  routeBox: DOMRect,
) {
  const { headHalfHeight, headLength, shaftHalfWidth } =
    arrowDimensions(routeBox);
  const shaftEnd = end + (end > start ? -headLength : headLength);

  return `M${start} ${centerY - shaftHalfWidth}H${shaftEnd}V${
    centerY - headHalfHeight
  }L${end} ${centerY}L${shaftEnd} ${centerY + headHalfHeight}V${
    centerY + shaftHalfWidth
  }H${start}Z`;
}

function verticalArrow(
  centerX: number,
  start: number,
  end: number,
  routeBox: DOMRect,
) {
  const { headHalfHeight, headLength, shaftHalfWidth } =
    arrowDimensions(routeBox);
  const shaftEnd = end + (end > start ? -headLength : headLength);

  return `M${centerX - shaftHalfWidth} ${start}H${
    centerX + shaftHalfWidth
  }V${shaftEnd}H${centerX + headHalfHeight}L${centerX} ${end}L${
    centerX - headHalfHeight
  } ${shaftEnd}H${centerX - shaftHalfWidth}Z`;
}

function arrowDimensions(routeBox: DOMRect) {
  return {
    headHalfHeight: (3.5 / routeBox.height) * 340,
    headLength: (7 / routeBox.width) * 680,
    shaftHalfWidth: (0.75 / routeBox.height) * 340,
  };
}
