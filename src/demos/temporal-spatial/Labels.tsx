import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

export interface TemporalSpatialLabel {
  id: string;
  text: string;
  position: [number, number, number];
  active?: boolean;
  tone?: string;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ORIGIN = () => [0, 0];
const EDGE = 8;
const GAP = 6;
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width + GAP &&
  a.x + a.width + GAP > b.x &&
  a.y < b.y + b.height + GAP &&
  a.y + a.height + GAP > b.y;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(Math.max(low, high), value));
const setAttribute = (element: SVGLineElement, name: string, value: string) => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};

/** Solve labels together only when a demand frame changes camera or content. */
export function Labels({ labels }: { labels: TemporalSpatialLabel[] }) {
  const { camera, size, invalidate } = useThree();
  const spans = useRef(new Map<string, HTMLSpanElement>());
  const lines = useRef(new Map<string, SVGLineElement>());
  const spanRefs = useRef(
    new Map<string, (element: HTMLSpanElement | null) => void>(),
  );
  const lineRefs = useRef(
    new Map<string, (element: SVGLineElement | null) => void>(),
  );
  const previous = useRef("");
  const spanRef = (id: string) => {
    if (!spanRefs.current.has(id)) {
      spanRefs.current.set(id, (span) => {
        if (span) spans.current.set(id, span);
        else spans.current.delete(id);
        previous.current = "";
        // Html's separate React root can mount after the demand frame.
        invalidate();
      });
    }
    return spanRefs.current.get(id)!;
  };
  const lineRef = (id: string) => {
    if (!lineRefs.current.has(id)) {
      lineRefs.current.set(id, (line) => {
        if (line) lines.current.set(id, line);
        else lines.current.delete(id);
        previous.current = "";
        invalidate();
      });
    }
    return lineRefs.current.get(id)!;
  };
  useEffect(() => {
    previous.current = "";
    invalidate();
  }, [labels, size.width, size.height, invalidate]);
  useFrame(() => {
    camera.updateMatrixWorld();
    const signature = [
      ...camera.matrixWorld.elements,
      ...camera.projectionMatrix.elements,
      size.width,
      size.height,
    ].join(",");
    if (previous.current === signature) return;
    previous.current = signature;
    const projected = labels
      .flatMap((label) => {
        const span = spans.current.get(label.id);
        const line = lines.current.get(label.id);
        if (!span || !line) return [];
        span.style.width = "";
        span.style.maxWidth = `${Math.max(1, size.width - EDGE * 2)}px`;
        span.style.whiteSpace = "normal";
        span.removeAttribute("data-compact");
        const point = new Vector3(...label.position).project(camera);
        return [
          {
            label,
            span,
            line,
            x: ((point.x + 1) * size.width) / 2,
            y: ((1 - point.y) * size.height) / 2,
            width: span.offsetWidth,
            height: span.offsetHeight,
          },
        ];
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const positions = new Map<string, Rect>();
    for (const item of projected) {
      const { x, y, width, height } = item;
      const candidates: Rect[] = [];
      for (const dx of [0, -72, 72, -144, 144]) {
        for (const dy of [
          -height - 12,
          -height - 42,
          12,
          -height - 72,
          42,
          72,
        ]) {
          candidates.push({
            x: clamp(x - width / 2 + dx, EDGE, size.width - width - EDGE),
            y: clamp(y + dy, EDGE, size.height - height - EDGE),
            width,
            height,
          });
        }
      }
      const available = (candidate: Rect) =>
        ![...positions.values()].some((other) => overlaps(candidate, other));
      const nearby = candidates.find(available);
      if (nearby) {
        positions.set(item.label.id, nearby);
        continue;
      }
      // A large orbit or close zoom can put anchors together. Look beyond
      // their immediate neighbors before switching to a compact group.
      const freeSpace: Rect[] = [];
      for (let cy = EDGE; cy <= size.height - height - EDGE; cy += 12) {
        for (let cx = EDGE; cx <= size.width - width - EDGE; cx += 12) {
          freeSpace.push({ x: cx, y: cy, width, height });
        }
      }
      const distance = (rect: Rect) =>
        (rect.x + width / 2 - x) ** 2 + (rect.y + height / 2 - y) ** 2;
      freeSpace.sort((a, b) => distance(a) - distance(b));
      const position = freeSpace.find(available);
      if (position) positions.set(item.label.id, position);
    }

    if (positions.size !== projected.length) {
      // Keep every label legible even if no nearby free space remains.
      // The scene supplies a small, bounded label set; a compact shelf fits
      // that set at mobile widths and leaders retain object associations.
      positions.clear();
      const columns = size.width >= 480 ? 2 : 1;
      const width = (size.width - EDGE * 2 - GAP * (columns - 1)) / columns;
      let y = EDGE;
      for (let index = 0; index < projected.length; index += columns) {
        let rowHeight = 0;
        const row = projected.slice(index, index + columns);
        for (const item of row) {
          item.span.setAttribute("data-compact", "true");
          item.span.style.width = `${width}px`;
          rowHeight = Math.max(rowHeight, item.span.offsetHeight);
        }
        row.forEach((item, column) => {
          positions.set(item.label.id, {
            x: EDGE + column * (width + GAP),
            y,
            width,
            height: rowHeight,
          });
        });
        y += rowHeight + GAP;
      }
    }

    for (const item of projected) {
      const rect = positions.get(item.label.id)!;
      const transform = `translate3d(${rect.x}px,${rect.y}px,0)`;
      if (item.span.style.transform !== transform) {
        item.span.style.transform = transform;
      }
      const x = clamp(item.x, EDGE, size.width - EDGE);
      const y = clamp(item.y, EDGE, size.height - EDGE);
      const startX = clamp(x, rect.x, rect.x + rect.width);
      const startY = clamp(y, rect.y, rect.y + rect.height);
      setAttribute(item.line, "x1", String(startX));
      setAttribute(item.line, "y1", String(startY));
      setAttribute(item.line, "x2", String(x));
      setAttribute(item.line, "y2", String(y));
      // Adjacent direct labels need no connector; displaced callouts do.
      setAttribute(
        item.line,
        "opacity",
        Math.hypot(x - startX, y - startY) > 18 ? "1" : "0",
      );
    }
  });
  return (
    <Html
      calculatePosition={ORIGIN}
      zIndexRange={[2, 2]}
      className="temporal-spatial-label-layer"
      style={{ pointerEvents: "none" }}
    >
      <svg
        className="temporal-spatial-label-lines"
        width={size.width}
        height={size.height}
        aria-hidden="true"
      >
        {labels.map((label) => (
          <line
            key={label.id}
            ref={lineRef(label.id)}
            opacity={1}
            data-tone={label.tone}
          />
        ))}
      </svg>
      {labels.map((label) => (
        <span
          key={label.id}
          className="temporal-spatial-label"
          data-label-id={label.id}
          data-active={label.active || undefined}
          data-tone={label.tone}
          ref={spanRef(label.id)}
        >
          {label.text}
        </span>
      ))}
    </Html>
  );
}
