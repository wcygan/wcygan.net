import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, OrthographicCamera, Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { durableRecords, type Protocol, type RecoveryFrame } from "./model";
type Point = [number, number, number];
const roles = [
  "canvas",
  "panel",
  "border",
  "text",
  "text-muted",
  "accent",
  "good",
  "warn",
  "bad",
  "info",
] as const;
type Palette = Record<(typeof roles)[number], string>;
interface Props {
  protocol: Protocol;
  frame: RecoveryFrame;
  active: boolean;
  reduced: boolean;
  view: number;
  angle: number;
  zoom: number;
  onReady: () => void;
  onUnavailable: () => void;
}
const C: Point = [0, 0, -3.1];
const A: Point = [-1.85, 0, 0.35];
const B: Point = [1.85, 0, 0.35];
function Label({
  at,
  children,
  tone,
}: {
  at: Point;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <Html
      center
      position={at}
      zIndexRange={[8, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span className="cr-label" data-tone={tone}>
        {children}
      </span>
    </Html>
  );
}
function Block({
  at,
  size,
  color,
  edge,
}: {
  at: Point;
  size: Point;
  color: string;
  edge: string;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} toneMapped={false} />
      <Edges color={edge} material-toneMapped={false} />
    </mesh>
  );
}
function Moving({
  to,
  active,
  reduced,
  children,
}: {
  to: Point;
  active: boolean;
  reduced: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const target = new Vector3(...to);
  const initial = useRef(to);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [to[0], to[1], to[2], active, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (reduced || !active) ref.current.position.copy(target);
    else
      ref.current.position.lerp(
        target,
        1 - Math.exp(-Math.min(delta, 0.05) * 6),
      );
    if (ref.current.position.distanceToSquared(target) > 0.00001) invalidate();
  });
  return (
    <group ref={ref} position={initial.current}>
      {children}
    </group>
  );
}
function Camera({
  view,
  angle,
  zoom,
}: {
  view: number;
  angle: number;
  zoom: number;
}) {
  const { camera, size, invalidate } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(size.width / 7.8, size.height / 6.8) * zoom;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [size.width, size.height, camera, invalidate, zoom]);
  useEffect(() => {
    camera.position.set(Math.sin(angle) * 11, 8, Math.cos(angle) * 11);
    controls.current?.target.set(0, -0.2, 0.2);
    camera.lookAt(0, -0.2, 0.2);
    controls.current?.update();
    invalidate();
  }, [camera, view, angle, invalidate]);
  return (
    <OrbitControls
      ref={controls}
      target={[0, -0.2, 0.2]}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={0.25}
      maxPolarAngle={1.2}
    />
  );
}
function Packets({
  paths,
  color,
  active,
  reduced,
}: {
  paths: Point[][];
  color: string;
  active: boolean;
  reduced: boolean;
}) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    elapsed.current = 0;
    invalidate();
  }, [paths, invalidate]);
  useFrame((_, delta) => {
    if (!group.current) return;
    if (reduced) {
      group.current.visible = false;
      return;
    }
    if (active) elapsed.current += Math.min(delta, 0.05);
    const t = Math.min(elapsed.current / 1.2, 1);
    group.current.visible = t < 1;
    paths.forEach((path, i) => {
      const k = t * (path.length - 1);
      const n = Math.min(Math.floor(k), path.length - 2);
      group.current!.children[i].position.lerpVectors(
        new Vector3(...path[n]),
        new Vector3(...path[n + 1]),
        k - n,
      );
    });
    if (active && t < 1) invalidate();
  });
  return (
    <group ref={group}>
      {paths.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.13, 0.13, 0.13]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
const route = (p: Point): Point[] => [
  [0, 0.12, -2.5],
  [p[0], 0.12, -2.5],
  [p[0], 0.12, -0.65],
];
const peerPath: Point[] = [
  [-0.6, 0.1, 0.35],
  [0.6, 0.1, 0.35],
];
function World({
  frame,
  protocol,
  active,
  reduced,
  view,
  angle,
  zoom,
  colors,
}: Props & { colors: Palette }) {
  const locked = frame.prepared && !frame.committed;
  const signal =
    frame.traffic === "precommit" ||
    frame.traffic === "acks" ||
    frame.traffic === "exchange"
      ? colors.info
      : frame.traffic === "commit"
        ? colors.good
        : colors.accent;
  const paths =
    frame.traffic === "exchange"
      ? [peerPath, [...peerPath].reverse()]
      : frame.traffic === "commit" && protocol === "3pc"
        ? [peerPath]
        : [route(A), route(B)].map((p) =>
            frame.traffic === "votes" || frame.traffic === "acks"
              ? [...p].reverse()
              : p,
          );
  return (
    <>
      <Camera view={view} angle={angle} zoom={zoom} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 8, 5]} intensity={0.9} />
      <color attach="background" args={[colors.canvas]} />
      {[A, B].map((p, i) => (
        <group key={i} position={p}>
          <Block
            at={[0, -0.2, 0]}
            size={[2.6, 0.35, 2]}
            color={colors.panel}
            edge={colors.border}
          />
          <Label at={[0, 1.2, -0.45]}>
            SHARD {i === 0 ? "A" : "B"} · $
            {frame.committed ? (i === 0 ? 90 : 110) : 100}
          </Label>
          <Moving
            to={[0, frame.committed ? 0.13 : 0.6, 0]}
            active={active}
            reduced={reduced}
          >
            <Block
              at={[0, 0, 0]}
              size={[1.7, 0.18, 0.8]}
              color={colors.panel}
              edge={
                frame.committed
                  ? colors.good
                  : frame.prepared
                    ? colors.accent
                    : colors.border
              }
            />
            <Label
              at={[0, 0.16, 0]}
              tone={
                frame.committed ? "good" : frame.prepared ? "accent" : undefined
              }
            >
              {frame.committed
                ? "COMMITTED"
                : frame.prepared
                  ? `${i === 0 ? "−" : "+"}$10 PENDING`
                  : "ROW"}
            </Label>
          </Moving>
          <Moving
            to={[locked ? 0 : 1.05, 0.16, 1.08]}
            active={active}
            reduced={reduced}
          >
            <Block
              at={[0, 0, 0]}
              size={[locked ? 1.9 : 0.12, 0.18, 0.12]}
              color={locked ? colors.warn : colors.border}
              edge={locked ? colors.warn : colors.border}
            />
          </Moving>
          <Label at={[0, 0.15, 1.42]} tone={locked ? "warn" : undefined}>
            {locked ? "LOCK HELD" : "ROW AVAILABLE"}
          </Label>
          <Block
            at={[0, -1.9, 0.1]}
            size={[2.6, 0.24, 1.9]}
            color={colors.panel}
            edge={colors.border}
          />
          {durableRecords(frame).map((record, n) => (
            <group key={record} position={[0, -1.73, -0.5 + n * 0.48]}>
              <Block
                at={[0, 0, 0]}
                size={[2.15, 0.04, 0.37]}
                color={colors.panel}
                edge={
                  record === "COMMIT"
                    ? colors.good
                    : record === "PRE-COMMIT"
                      ? colors.info
                      : colors.accent
                }
              />
              <Label
                at={[0, 0.02, 0]}
                tone={
                  record === "COMMIT"
                    ? "good"
                    : record === "PRE-COMMIT"
                      ? "info"
                      : "accent"
                }
              >
                {record}
              </Label>
            </group>
          ))}
          <Label at={[0, -2.25, 0.8]}>DURABLE LOG</Label>
        </group>
      ))}
      <group position={C}>
        <Block
          at={[0, -0.4, 0]}
          size={[2, 0.24, 1]}
          color={colors.panel}
          edge={colors.border}
        />
        <Block
          at={[0, 0.2, 0]}
          size={[1.8, 0.45, 0.8]}
          color={colors.panel}
          edge={frame.online ? colors.border : colors.bad}
        />
        <Label at={[0, 0.85, 0]} tone={frame.online ? undefined : "bad"}>
          {frame.online ? "COORDINATOR" : "PROCESS OFFLINE"}
        </Label>
        <Label at={[0, 0.25, 0]} tone={frame.online ? undefined : "bad"}>
          {frame.online ? "RUNNING" : "×"}
        </Label>
        <Label at={[0, -0.45, 0.45]} tone={frame.decision ? "info" : undefined}>
          LOG: {frame.decision ?? "EMPTY"}
        </Label>
      </group>
      {[A, B].map((p, i) => (
        <Line
          key={i}
          points={route(p)}
          color={frame.online ? colors.border : colors.bad}
          dashed
          dashSize={0.12}
          gapSize={0.1}
          lineWidth={1}
        />
      ))}
      <Line
        points={peerPath}
        color={colors.info}
        dashed
        dashSize={0.08}
        gapSize={0.08}
        lineWidth={1}
      />
      <Moving
        to={frame.released ? [A[0], 0.42, A[2]] : [0, 0.12, 3.6]}
        active={active}
        reduced={reduced}
      >
        <Block
          at={[0, 0, 0]}
          size={[1.8, 0.12, 0.55]}
          color={colors.panel}
          edge={frame.released ? colors.good : colors.warn}
        />
        <Label at={[0, 0.2, 0]} tone={frame.released ? "good" : "warn"}>
          {frame.released ? "UPDATE STARTS" : "NEXT UPDATE"}
        </Label>
      </Moving>
      {frame.traffic && (
        <Packets
          key={frame.title}
          paths={paths}
          color={signal}
          active={active}
          reduced={reduced}
        />
      )}
    </>
  );
}
export default function RecoveryScene(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<Palette>();
  useEffect(() => {
    if (!ref.current) return;
    const styles = getComputedStyle(ref.current);
    const context = document.createElement("canvas").getContext("2d")!;
    setColors(
      Object.fromEntries(
        roles.map((role) => {
          context.fillStyle = styles.getPropertyValue("--cr-canvas");
          context.fillRect(0, 0, 1, 1);
          context.fillStyle = styles.getPropertyValue(`--cr-${role}`);
          context.fillRect(0, 0, 1, 1);
          const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
          return [role, `rgb(${r},${g},${b})`];
        }),
      ) as Palette,
    );
  }, []);
  return (
    <div ref={ref} className="cr-canvas">
      {colors && (
        <SceneCanvas
          sceneId={`commit-recovery-${props.protocol}`}
          onReady={props.onReady}
          onUnavailable={props.onUnavailable}
          orthographic
          camera={{ position: [0, 8, 11], zoom: 60, near: 0.1, far: 100 }}
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              props.onUnavailable,
              { once: true },
            );
          }}
        >
          <World {...props} colors={colors} />
        </SceneCanvas>
      )}
    </div>
  );
}
