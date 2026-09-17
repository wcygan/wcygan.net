import { PayloadModel } from "../tidb-architecture/PayloadModel";
import { Processor } from "../tidb-architecture/Processor";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import {
  Group,
  OrthographicCamera,
  QuadraticBezierCurve3,
  Spherical,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  layout,
  traversal,
  sourcePosition,
  STORAGE_SOURCES,
  READ_TS,
  packetForStep,
  PRIMARY_ENTRIES,
  rowPosition,
  SECONDARY_ENTRIES,
  type Point,
  type ViewCommand,
} from "./model";
import type { Playback, Snapshot } from "./playback";
import { placePacketLabel, type Rect } from "./label-layout";
const SCREEN_ORIGIN = () => [0, 0];

export interface Props {
  playback: Playback;
  state: Snapshot;
  active: boolean;
  reduced: boolean;
  view: ViewCommand;
  onUnavailable: () => void;
}
const INK = "#56554e";
const BLUE = "#a6becb";
const TEAL = "#9ebfb4";
const TARGET: Point = [0, 0.6, -0.6];
const POSITION: Point = [0, 26, 10];

function Box({
  position,
  size,
  color = "#e3e1d9",
  selected = false,
}: {
  position: Point;
  size: Point;
  color?: string;
  selected?: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
      <Edges
        color={selected ? "#21201c" : INK}
        lineWidth={selected ? 1.8 : 1}
      />
    </mesh>
  );
}
function Label({
  position,
  children,
  className = "",
  surface = false,
}: {
  position: Point;
  children: ReactNode;
  className?: string;
  surface?: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const labelMounted = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) invalidate();
    },
    [invalidate],
  );
  return (
    <Html
      ref={labelMounted}
      center
      transform={surface}
      distanceFactor={surface ? 8 : undefined}
      rotation={surface ? [-Math.PI / 2, 0, 0] : undefined}
      position={position}
      zIndexRange={[2, 1]}
      className={`secondary-scene-label ${className}`}
      style={{ pointerEvents: "none" }}
    >
      {children}
    </Html>
  );
}
function Camera({
  view,
  onUnavailable,
}: Pick<Props, "view" | "onUnavailable">) {
  const { camera, size, gl, invalidate } = useThree();
  const mobile = size.width < 592;
  const fit = mobile
    ? Math.min(size.width / 8.8, size.height / 26)
    : Math.min(size.width / 12.5, size.height / 14.5);
  const previousFit = useRef(fit);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom *= fit / previousFit.current;
    previousFit.current = fit;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fit, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (view.kind === "reset") {
      camera.position.set(...POSITION);
      ortho.zoom = fit;
    } else if (view.kind === "in" || view.kind === "out")
      ortho.zoom = Math.max(
        fit * 0.7,
        Math.min(fit * 2, ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2)),
      );
    else {
      const target = new Vector3(...TARGET);
      const spherical = new Spherical().setFromVector3(
        camera.position.clone().sub(target),
      );
      spherical.theta += view.kind === "left" ? -Math.PI / 12 : Math.PI / 12;
      camera.position.setFromSpherical(spherical).add(target);
    }
    camera.lookAt(...TARGET);
    ortho.updateProjectionMatrix();
    invalidate();
    // Responsive fit changes independently, preserving the reader's orbit and zoom.
  }, [camera, view, invalidate]);
  return (
    <OrbitControls
      target={TARGET}
      enablePan={false}
      enableDamping={false}
      minZoom={fit * 0.7}
      maxZoom={fit * 2}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.3}
    />
  );
}
function Tray({
  position,
  primary,
  step,
}: {
  position: Point;
  primary: boolean;
  step: number;
}) {
  const entries = primary ? PRIMARY_ENTRIES : SECONDARY_ENTRIES;
  const color = primary ? TEAL : BLUE;
  const seek = traversal(step, primary);
  return (
    <group>
      <Box
        position={position}
        size={[5.25, 0.16, 9.4]}
        color={primary ? "#dde7e1" : "#e0e7eb"}
      />
      <Box
        position={[position[0], 0.12, position[2] - 4.55]}
        size={[5.25, 0.2, 0.16]}
        color={color}
      />
      <Label
        position={[position[0], 3, position[2] - 4.8]}
        className="secondary-tray-title"
      >
        <strong>
          {primary ? "Clustered primary index" : "Secondary index"}
        </strong>
        <span>{primary ? "TableRowIDScan" : "IndexRangeScan"}</span>
        <span>
          {primary
            ? "Region B · leader on TiKV 2"
            : "Region A · leader on TiKV 1"}
        </span>
      </Label>
      {STORAGE_SOURCES.map((source, i) => {
        const point = sourcePosition(position, i);
        const selected = seek.seeking;
        return (
          <group key={i}>
            <Box
              position={point}
              size={[1.55, 0.18, 0.65]}
              selected={selected}
              color={selected ? color : "#eeede8"}
            />
            <Label
              surface
              position={[point[0], point[1] + 0.095, point[2]]}
              className="secondary-source"
            >
              {source}
              <span>{i === 0 ? "memory" : "immutable"}</span>
            </Label>
          </group>
        );
      })}
      <Label
        surface
        position={[position[0], 0.42, position[2] - 2.7]}
        className="secondary-view-label"
      >
        Logical view · snapshot {READ_TS}
        <span>
          {primary ? "row key → columns" : "index key: (email, handle)"}
        </span>
      </Label>
      {entries.map((entry, i) => {
        const selected = seek.row === i;
        const p = rowPosition(position, i);
        const y = selected ? 0.49 : p[1];
        return (
          <group key={entry.id}>
            <Box
              position={[p[0], y, p[2]]}
              size={[4.7, 0.18, 0.56]}
              color={selected ? color : "#eeede8"}
              selected={selected}
            />
            <Label
              surface
              position={[p[0], y + 0.095, p[2]]}
              className={`secondary-entry ${selected ? "secondary-entry-selected" : ""}`}
            >
              {primary ? (
                <>
                  <span>{entry.id}</span>
                  <span>
                    {PRIMARY_ENTRIES.find((row) => row.id === entry.id)!.name}
                  </span>
                </>
              ) : (
                <>
                  <span>({entry.email},</span>
                  <span>{entry.id})</span>
                </>
              )}
            </Label>
          </group>
        );
      })}
    </group>
  );
}
function Packet({
  playback,
  state,
  active,
  reduced,
  mobile,
}: Pick<Props, "playback" | "state" | "active" | "reduced"> & {
  mobile: boolean;
}) {
  const ref = useRef<Group>(null);
  const { invalidate, camera, size, gl } = useThree();
  const payload = useRef<HTMLSpanElement>(null);
  const leader = useRef<SVGLineElement>(null);
  const cached = useRef<{ signature: string; obstacles: Rect[] }>({
    signature: "",
    obstacles: [],
  });
  const packet = packetForStep(state.step, mobile);
  const curve = useMemo(() => {
    if (!packet) return null;
    const from = new Vector3(...packet.from),
      to = new Vector3(...packet.to);
    const middle = from.clone().lerp(to, 0.5);
    middle.y += 1.6;
    return new QuadraticBezierCurve3(from, middle, to);
  }, [state.step, mobile]);
  useEffect(() => {
    invalidate();
  }, [state, active, reduced, invalidate]);
  useFrame(() => {
    if (ref.current && curve) {
      // Movement ends early, leaving a readable hold before the next step.
      ref.current.position.copy(
        curve.getPoint(Math.min(1, playback.progress() / 0.72)),
      );
    }
    if (ref.current && payload.current) {
      camera.updateMatrixWorld();
      const signature = [
        ...camera.matrixWorld.elements,
        ...camera.projectionMatrix.elements,
        size.width,
        size.height,
        state.step,
      ].join(",");
      const stage = gl.domElement.closest(".secondary-stage");
      if (
        stage &&
        (cached.current.signature !== signature ||
          cached.current.obstacles.length < 27)
      ) {
        const origin = gl.domElement.getBoundingClientRect();
        cached.current = {
          signature,
          obstacles: [
            ...stage.querySelectorAll(
              ".secondary-scene-label:not(.secondary-packet)",
            ),
          ].map((element) => {
            const r = element.getBoundingClientRect();
            return {
              x: r.x - origin.x,
              y: r.y - origin.y,
              width: r.width,
              height: r.height,
            };
          }),
        };
      }
      const projected = ref.current.position.clone().project(camera);
      const point = {
        x: ((projected.x + 1) * size.width) / 2,
        y: ((1 - projected.y) * size.height) / 2,
      };
      const rect = placePacketLabel(
        point,
        {
          width: payload.current.offsetWidth,
          height: payload.current.offsetHeight,
        },
        size,
        cached.current.obstacles,
      );
      payload.current.style.visibility = rect ? "visible" : "hidden";
      if (rect) {
        payload.current.style.transform = `translate3d(${rect.x}px,${rect.y}px,0)`;
        leader.current?.setAttribute("x1", String(point.x));
        leader.current?.setAttribute("y1", String(point.y));
        leader.current?.setAttribute(
          "x2",
          String(Math.max(rect.x, Math.min(point.x, rect.x + rect.width))),
        );
        leader.current?.setAttribute(
          "y2",
          String(Math.max(rect.y, Math.min(point.y, rect.y + rect.height))),
        );
      }
      if (leader.current)
        leader.current.style.visibility = rect ? "visible" : "hidden";
    }
    if (active && state.moving && !reduced) invalidate();
  });
  if (!packet || !curve || reduced) return null;
  return (
    <>
      <group ref={ref} position={packet.from}>
        <PayloadModel
          shape={packet.shape}
          color={packet.kind === "primary" ? TEAL : BLUE}
        />
      </group>
      <Html
        calculatePosition={SCREEN_ORIGIN}
        zIndexRange={[3, 3]}
        className="secondary-packet-layer"
      >
        <svg width={size.width} height={size.height} aria-hidden="true">
          <line ref={leader} stroke="#88867e" strokeWidth="1" />
        </svg>
        <span ref={payload} className="secondary-scene-label secondary-packet">
          {packet.label}
          {"detail" in packet && <span>{packet.detail}</span>}
        </span>
      </Html>
    </>
  );
}
function World(props: Props) {
  const { size } = useThree();
  const mobile = size.width < 592;
  const positions = layout(mobile);
  const activeServer =
    props.state.step === 1 || props.state.step === 7 || props.state.step >= 13;
  return (
    <>
      <Camera view={props.view} onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-4, 10, 6]} intensity={1.6} />
      {[positions.secondary, positions.primary].map((tray, i) => (
        <Line
          key={i}
          points={[
            [positions.server[0], 0.14, positions.server[2]],
            [tray[0], 0.14, tray[2] - 4.6],
          ]}
          color="#b5b2a8"
          lineWidth={1}
        />
      ))}
      <group position={positions.server}>
        <Processor selected={activeServer} />
        <Label position={[0, 3.2, 0]} className="secondary-server-label">
          TiDB<span>SQL server</span>
        </Label>
      </group>
      <Tray
        position={positions.secondary}
        primary={false}
        step={props.state.step}
      />
      <Tray position={positions.primary} primary step={props.state.step} />
      <Packet {...props} mobile={mobile} />
    </>
  );
}
export default function Scene(props: Props) {
  return (
    <Canvas
      orthographic
      camera={{ position: POSITION, zoom: 30, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={(defaults) => {
        try {
          return new WebGLRenderer({
            ...defaults,
            antialias: true,
            alpha: true,
          });
        } catch (error) {
          props.onUnavailable();
          throw error;
        }
      }}
      fallback={
        <p>3D is unavailable. Follow the lookup in the status below.</p>
      }
    >
      <World {...props} />
    </Canvas>
  );
}
