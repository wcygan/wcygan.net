import { Edges, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, Vector3 } from "three";
import { CELLD_COLORS } from "../palette";
import type { Point } from "./model";

export function Box({
  position,
  size,
  color = CELLD_COLORS.panel,
  outline = CELLD_COLORS.connector,
}: {
  position: Point;
  size: Point;
  color?: string;
  outline?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
      <Edges color={outline} />
    </mesh>
  );
}

export function Database({
  position,
  color = CELLD_COLORS.blue,
  radius = 0.72,
  height = 0.95,
}: {
  position: Point;
  color?: string;
  radius?: number;
  height?: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[radius, radius, height, 36]} />
        <meshStandardMaterial color={color} roughness={0.85} />
        <Edges color={CELLD_COLORS.darkInk} threshold={20} />
      </mesh>
      {[-height / 4, height / 4].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.006, 0.023, 6, 36]} />
          <meshBasicMaterial color={CELLD_COLORS.darkInk} />
        </mesh>
      ))}
    </group>
  );
}

export function Runtime({
  position,
  color = CELLD_COLORS.blue,
  size = 1,
}: {
  position: Point;
  color?: string;
  size?: number;
}) {
  return (
    <group position={position}>
      <Box
        position={[0, 0, 0]}
        size={[size, size * 0.72, size]}
        color={color}
        outline={CELLD_COLORS.darkInk}
      />
      <SurfaceId
        position={[0, 0, size / 2 + 0.006]}
        scale={size * 0.28}
        color={CELLD_COLORS.darkInk}
      >
        JS
      </SurfaceId>
      <SurfaceId
        position={[0, 0, -size / 2 - 0.006]}
        rotation={[0, Math.PI, 0]}
        scale={size * 0.28}
        color={CELLD_COLORS.darkInk}
      >
        JS
      </SurfaceId>
    </group>
  );
}

export function Log({
  position,
  color = CELLD_COLORS.orange,
  length = 2,
}: {
  position: Point;
  color?: string;
  length?: number;
}) {
  return (
    <Box
      position={position}
      size={[length, 0.25, 0.82]}
      color={color}
      outline={CELLD_COLORS.darkInk}
    />
  );
}

export function Bucket({
  position,
  color = CELLD_COLORS.green,
}: {
  position: Point;
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.98, 0.77, 1.05, 36, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.9} side={2} />
      </mesh>
      <mesh position={[0, -0.53, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.77, 36]} />
        <meshStandardMaterial color={color} roughness={0.9} side={2} />
      </mesh>
      <mesh position={[0, 0.53, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.045, 8, 36]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export function SurfaceId({
  children,
  position,
  rotation,
  scale = 0.3,
  color = CELLD_COLORS.fg,
}: {
  children: string;
  position: Point;
  rotation?: Point;
  scale?: number;
  color?: string;
}) {
  const label = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "600 80px ui-monospace, monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(children, 128, 64);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [children, color]);
  useEffect(() => () => label.dispose(), [label]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[scale * 2, scale]} />
      <meshBasicMaterial map={label} transparent depthWrite={false} />
    </mesh>
  );
}

export interface Label {
  id: string;
  text: string;
  position: Point;
  tone?: "orange" | "blue" | "green" | "yellow" | "red";
}
const ORIGIN = () => [0, 0];
type LabelRect = { x: number; y: number; width: number; height: number };
const overlaps = (a: LabelRect, b: LabelRect) =>
  a.x < b.x + b.width + 8 &&
  a.x + a.width + 8 > b.x &&
  a.y < b.y + b.height + 8 &&
  a.y + a.height + 8 > b.y;

/** Lay out the few direct labels together when the camera changes. */
export function Labels({ labels }: { labels: Label[] }) {
  const { camera, size, invalidate } = useThree();
  const spans = useRef(new Map<string, HTMLSpanElement>());
  const lines = useRef(new Map<string, SVGLineElement>());
  const previous = useRef("");
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
    const used: LabelRect[] = [];
    const projected = labels.map((label) => {
      const p = new Vector3(...label.position).project(camera);
      return {
        label,
        x: ((p.x + 1) * size.width) / 2,
        y: ((1 - p.y) * size.height) / 2,
      };
    });
    projected.sort((a, b) => a.y - b.y);
    for (const { label, x, y } of projected) {
      const span = spans.current.get(label.id);
      const line = lines.current.get(label.id);
      if (!span || !line) continue;
      const width = span.offsetWidth;
      const height = span.offsetHeight;
      let rect: LabelRect | undefined;
      for (const dx of [0, -90, 90]) {
        for (const dy of [-25, -55, 10, -85, 40, 70]) {
          const candidate = {
            x: Math.max(
              8,
              Math.min(size.width - width - 8, x - width / 2 + dx),
            ),
            y: Math.max(8, Math.min(size.height - height - 8, y + dy)),
            width,
            height,
          };
          if (!used.some((other) => overlaps(candidate, other))) {
            rect = candidate;
            break;
          }
        }
        if (rect) break;
      }
      span.style.visibility = rect ? "visible" : "hidden";
      line.style.visibility = rect ? "visible" : "hidden";
      if (!rect) continue;
      used.push(rect);
      span.style.transform = `translate3d(${rect.x}px,${rect.y}px,0)`;
      line.setAttribute(
        "x1",
        String(Math.max(rect.x, Math.min(x, rect.x + width))),
      );
      line.setAttribute(
        "y1",
        String(Math.max(rect.y, Math.min(y, rect.y + height))),
      );
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(y));
    }
  });
  return (
    <Html
      calculatePosition={ORIGIN}
      zIndexRange={[2, 2]}
      className="celld-spatial-labels"
    >
      <svg width={size.width} height={size.height} aria-hidden="true">
        {labels.map((label) => (
          <line
            key={label.id}
            ref={(line) => {
              if (line) lines.current.set(label.id, line);
              else lines.current.delete(label.id);
            }}
          />
        ))}
      </svg>
      {labels.map((label) => (
        <span
          key={label.id}
          data-tone={label.tone}
          ref={(span) => {
            if (span) spans.current.set(label.id, span);
            else spans.current.delete(label.id);
            previous.current = "";
            // Html commits in a separate React root. Its labels can mount
            // after the first demand frame, so request their initial layout.
            invalidate();
          }}
        >
          {label.text}
        </span>
      ))}
    </Html>
  );
}
