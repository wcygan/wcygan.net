import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import {
  ExtrudeGeometry,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Shape,
  Spherical,
} from "three";
import { type NodeId, NODES, type Packet, type Simulation } from "./types";
import { deadline, electionTimeout, follower, followerIds } from "./model";
import { seconds } from "./presentation";
import type { Playback } from "./playback";

type Point = [number, number, number];
type Positions = Record<NodeId, Point>;
const DEFAULT_CAMERA: Point = [-10, 7.8, 10];
const MOBILE_CAMERA: Point = [-10, 11.8, 10];
const CAMERA_TARGET: Point = [0, 0.8, 0];
// Stable pastel identities; crash and timeout states take precedence.
const NODE_COLORS: Record<NodeId, string> = {
  A: "#efba91", // Peach
  B: "#ead082", // Butter yellow
  C: "#cbd5a3", // Warm sage
  D: "#e7b2ba", // Blush
  E: "#cdbadf", // Rosy lilac
};
export interface ViewCommand {
  kind: "top" | "reset" | "left" | "right" | "in" | "out";
  revision: number;
}
interface Props {
  state: Simulation;
  playback: Playback;
  active: boolean;
  reduced: boolean;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}

function createHeartGeometry() {
  const heart = new Shape();
  heart.moveTo(0, 0.22);
  heart.bezierCurveTo(-0.06, 0.48, -0.5, 0.48, -0.5, 0.12);
  heart.bezierCurveTo(-0.5, -0.12, -0.18, -0.32, 0, -0.5);
  heart.bezierCurveTo(0.18, -0.32, 0.5, -0.12, 0.5, 0.12);
  heart.bezierCurveTo(0.5, 0.48, 0.06, 0.48, 0, 0.22);
  heart.closePath();
  return new ExtrudeGeometry(heart, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 5,
    curveSegments: 12,
    steps: 1,
  }).center();
}

function Camera({
  view,
  onUnavailable,
}: Pick<Props, "view" | "onUnavailable">) {
  const { camera, size, invalidate, gl } = useThree();
  const fittedZoom = Math.min(size.width / 8, size.height / 6.3);
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
    ortho.zoom = fittedZoom;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fittedZoom, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (view.kind === "reset" || view.kind === "top") {
      // More elevation on narrow screens separates labels from the cubes behind.
      const preset = size.width < 480 ? MOBILE_CAMERA : DEFAULT_CAMERA;
      camera.position.set(
        ...(view.kind === "top" ? ([0, 15.8, 0.001] as Point) : preset),
      );
      ortho.zoom = fittedZoom;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fittedZoom * 0.6,
        Math.min(
          fittedZoom * 2,
          ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const offset = camera.position.clone();
      offset.y -= CAMERA_TARGET[1];
      const spherical = new Spherical().setFromVector3(offset);
      spherical.theta += view.kind === "left" ? -Math.PI / 8 : Math.PI / 8;
      camera.position.setFromSpherical(spherical);
      camera.position.y += CAMERA_TARGET[1];
    }
    camera.lookAt(...CAMERA_TARGET);
    ortho.updateProjectionMatrix();
    invalidate();
    // Camera commands are independent of simulation updates and tuning.
    // Resizing is handled by the fitting effect above.
  }, [camera, view, invalidate]);
  return (
    <OrbitControls
      target={CAMERA_TARGET}
      enablePan={false}
      enableDamping={false}
      minZoom={fittedZoom * 0.6}
      maxZoom={fittedZoom * 2}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

function Message({
  packet,
  positions,
  playback,
  geometry,
  material,
}: {
  packet: Packet;
  positions: Positions;
  playback: Playback;
  geometry: ExtrudeGeometry;
  material: MeshStandardMaterial;
}) {
  const mesh = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    if (!mesh.current) return;
    const clock = playback.getTime();
    const t = Math.max(
      0,
      Math.min(1, (clock - packet.sentAt) / (packet.arrivesAt - packet.sentAt)),
    );
    const a = positions[packet.from],
      b = positions[packet.to];
    mesh.current.position.set(
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    );
    // Match camera azimuth only: vertical orbit never tilts the hearts.
    const facing = camera.matrixWorld.elements;
    mesh.current.rotation.y = Math.atan2(facing[8], facing[10]);
    mesh.current.visible = clock < packet.arrivesAt;
  });
  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={positions[packet.from]}
      scale={0.44}
      dispose={null}
    />
  );
}

const Connection = memo(function Connection({
  from,
  to,
  cut,
}: {
  from: Point;
  to: Point;
  cut: boolean;
}) {
  const points = useMemo(() => [from, to], [from, to]);
  const midpoint = useMemo<Point>(
    () => [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
    [from, to],
  );
  return (
    <>
      <Line
        points={points}
        dashed
        dashSize={cut ? 0.1 : 0.24}
        gapSize={cut ? 0.3 : 0.12}
        lineWidth={2.5}
        color={cut ? "#914931" : "#63635e"}
      />
      {cut && (
        <Html center position={midpoint} zIndexRange={[1, 0]}>
          <span className="fd-link-fault">OFFLINE</span>
        </Html>
      )}
    </>
  );
});

function NodeLabel({
  state,
  id,
  position,
  playback,
  active,
  reduced,
}: Pick<Props, "state" | "playback" | "active" | "reduced"> & {
  id: NodeId;
  position: Point;
}) {
  const bar = useRef<HTMLProgressElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const leader = id === "B";
  const crashed = leader && state.transport.crashed;
  const expired = !leader && follower(state, id).role === "candidate";
  const expiresAt = leader ? 0 : deadline(state, id);
  const total = leader ? 1 : electionTimeout(state, id);
  const draw = useCallback(() => {
    const remaining = expired ? 0 : Math.max(0, expiresAt - playback.getTime());
    if (bar.current) bar.current.value = remaining;
    const text = expired ? "Expired" : seconds(remaining);
    if (label.current && label.current.textContent !== text) {
      label.current.textContent = text;
    }
  }, [expired, expiresAt, playback]);
  useFrame(draw);
  useLayoutEffect(draw, [draw]);
  useEffect(() => {
    if (!active || !reduced) return;
    // Reduced motion keeps readable countdowns without a continuous WebGL loop.
    const timer = setInterval(draw, 100);
    return () => clearInterval(timer);
  }, [active, reduced, draw]);
  return (
    <Html position={position} zIndexRange={[1, 0]}>
      <div className="fd-node-label" data-node={id} data-expired={expired}>
        <div className="fd-node-heading">
          <strong
            className="fd-node-chip"
            style={{ backgroundColor: NODE_COLORS[id] }}
          >
            {id}
          </strong>
          <span>{leader ? "Leader" : expired ? "Timed out" : "Follower"}</span>
        </div>
        {!leader && (
          <>
            <progress ref={bar} className="fd-node-timer" max={total} />
            <span ref={label} className="fd-node-countdown" />
          </>
        )}
        {crashed && <em>× crashed</em>}
      </div>
    </Html>
  );
}

function World({
  state,
  playback,
  active,
  reduced,
  view,
  onUnavailable,
}: Props) {
  const nodeCount = state.config.nodeCount;
  const positions = useMemo(() => {
    const count = nodeCount - 1;
    // With three followers, keep the lower pair's labels beside the leader.
    const start = count === 3 ? -Math.PI / 4 : 0;
    // These are node centers, shared by cubes, links, labels and heart paths.
    // All followers share one radius; adding nodes redistributes the full ring.
    return Object.fromEntries(
      NODES.map((id, index) => {
        const angle = start + ((index - 1) * Math.PI * 2) / count;
        return [
          id,
          id === "B"
            ? [0, 0.48, 0]
            : [3.2 * Math.cos(angle), 0.48, 3.2 * Math.sin(angle)],
        ];
      }),
    ) as Positions;
  }, [nodeCount]);
  const geometry = useMemo(createHeartGeometry, []);
  const material = useMemo(
    () => new MeshStandardMaterial({ color: "#be102a", roughness: 0.35 }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return (
    <>
      <Camera view={view} onUnavailable={onUnavailable} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[-4, 10, 6]} intensity={2.2} />
      {followerIds(state).map((id) => (
        <Connection
          key={id}
          from={positions.B}
          to={positions[id]}
          cut={state.transport.cut.includes(id)}
        />
      ))}
      {(["B", ...followerIds(state)] as NodeId[]).map((id) => {
        const crashed = id === "B" && state.transport.crashed;
        const candidate =
          id !== "B" && follower(state, id).role === "candidate";
        return (
          <group key={id}>
            <mesh position={positions[id]}>
              <boxGeometry args={[0.85, 0.85, 0.85]} />
              <meshStandardMaterial
                color={
                  candidate ? "#be102a" : crashed ? "#b9b4ab" : NODE_COLORS[id]
                }
                roughness={1}
              />
              <Edges color={candidate ? "#861125" : "#736f64"} />
            </mesh>
            <NodeLabel
              state={state}
              id={id}
              position={positions[id]}
              playback={playback}
              active={active}
              reduced={reduced}
            />
          </group>
        );
      })}
      {!reduced &&
        state.packets.map((packet) => (
          <Message
            key={packet.id}
            packet={packet}
            positions={positions}
            playback={playback}
            geometry={geometry}
            material={material}
          />
        ))}
    </>
  );
}

export default function FailureDetectorScene(props: Props) {
  return (
    <SceneCanvas
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: DEFAULT_CAMERA, zoom: 42, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop={props.active && !props.reduced ? "always" : "demand"}
      gl={{ antialias: true, alpha: true }}
      fallback={<p>3D is unavailable.</p>}
    >
      <World {...props} />
    </SceneCanvas>
  );
}
