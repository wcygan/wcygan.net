import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import {
  ExtrudeGeometry,
  Group,
  OrthographicCamera,
  Shape,
  Spherical,
} from "three";
import { NODES, type NodeId, type Packet, type Simulation } from "./types";
import type { Playback } from "./playback";
import { RECOVERY_DELAY } from "./model";
import { NODE_COLORS, termColor, PLAYBACK_RATE } from "./presentation";
type Point = [number, number, number];
const DEFAULT_CAMERA: Point = [0, 10, 10];
const MOBILE_CAMERA: Point = [0, 14, 8];
const CAMERA_TARGET: Point = [0, 0.8, 0];
const positions = Object.fromEntries(
  NODES.map((id, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    return [id, [3.3 * Math.cos(a), 0.48, 3.3 * Math.sin(a)]];
  }),
) as Record<NodeId, Point>;
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
  const fittedZoom = Math.min(size.width / 10, size.height / 9);
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

function PacketMesh({
  packet,
  playback,
  heart,
}: {
  packet: Packet;
  playback: Playback;
  heart: ExtrudeGeometry;
}) {
  const ref = useRef<Group>(null);
  const label = useRef<HTMLSpanElement>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    if (packet.kind === "heartbeat") {
      // Match camera azimuth only: vertical orbit never tilts the hearts.
      const facing = camera.matrixWorld.elements;
      ref.current.rotation.y = Math.atan2(facing[8], facing[10]);
    }
    const t = Math.max(
      0,
      Math.min(
        1,
        (playback.getTime() - packet.sentAt) /
          (packet.arrivesAt - packet.sentAt),
      ),
    );
    if (label.current)
      label.current.style.opacity = t > 0.22 && t < 0.78 ? "1" : "0";
    const a = positions[packet.from],
      b = positions[packet.to];
    ref.current.position.set(
      a[0] + (b[0] - a[0]) * t,
      1 + Math.sin(t * Math.PI) * 0.35,
      a[2] + (b[2] - a[2]) * t,
    );
  });
  return (
    <group ref={ref} position={positions[packet.from]}>
      <mesh scale={packet.kind === "heartbeat" ? 0.28 : 1}>
        {packet.kind === "heartbeat" ? (
          <primitive object={heart} attach="geometry" />
        ) : packet.kind === "request" ? (
          <octahedronGeometry args={[0.14]} />
        ) : (
          <boxGeometry args={[0.2, 0.08, 0.24]} />
        )}
        <meshStandardMaterial
          color={packet.kind === "heartbeat" ? "#be102a" : "#45423c"}
        />
      </mesh>
      {packet.kind !== "heartbeat" && (
        <Html center position={[0, 0.3, 0]} zIndexRange={[5, 0]}>
          <span ref={label} className="raft-packet">
            {packet.kind === "request"
              ? "Vote?"
              : packet.granted
                ? "Yes"
                : "No"}
          </span>
        </Html>
      )}
    </group>
  );
}
function Label({
  id,
  state,
  playback,
  active,
  reduced,
}: {
  id: NodeId;
  state: Simulation;
  playback: Playback;
  active: boolean;
  reduced: boolean;
}) {
  const bar = useRef<HTMLProgressElement>(null);
  const timer = useRef<HTMLSpanElement>(null);
  const node = state.nodes[id];
  const crashed = state.crashed.includes(id);
  const deadline = crashed ? (state.recoverAt[id] ?? state.now) : node.deadline;
  const duration = crashed ? RECOVERY_DELAY : node.timerDuration;
  const draw = useCallback(() => {
    const remaining = Number.isFinite(deadline)
      ? Math.max(0, deadline - playback.getTime())
      : 0;
    if (bar.current)
      bar.current.value =
        !crashed && node.role === "leader" ? duration : remaining;
    if (timer.current)
      timer.current.textContent = crashed
        ? `Back in ${(remaining / PLAYBACK_RATE / 1000).toFixed(1)}s`
        : node.role === "leader"
          ? "No timeout"
          : `${(remaining / 1000).toFixed(1)}s`;
  }, [deadline, duration, node.role, crashed, playback]);
  useFrame(draw);
  useLayoutEffect(draw, [draw]);
  useEffect(() => {
    if (!active || !reduced) return;
    const timer = setInterval(draw, 100);
    return () => clearInterval(timer);
  }, [active, reduced, draw]);

  return (
    <Html
      center
      position={[positions[id][0], 1.45, positions[id][2]]}
      zIndexRange={[10, 0]}
    >
      <div className="raft-node-label" data-crashed={crashed}>
        <strong className="raft-node-heading">
          <span
            className="raft-metadata-chip"
            style={{ backgroundColor: NODE_COLORS[id] }}
          >
            {id}
          </span>
          <span>{crashed ? "crashed" : node.role}</span>
        </strong>
        <span className="raft-node-metadata">
          <span
            className="raft-metadata-chip"
            style={{ backgroundColor: termColor(node.term) }}
          >
            Term {node.term}
          </span>
          <span
            className="raft-metadata-chip"
            style={{
              backgroundColor: node.votedFor
                ? NODE_COLORS[node.votedFor]
                : undefined,
            }}
          >
            Vote {node.votedFor ?? "—"}
          </span>
        </span>
        <span className="raft-node-votes">
          {!crashed && node.role === "candidate"
            ? `${node.votes.length} / 5 votes`
            : " "}
        </span>
        <progress
          ref={bar}
          className="raft-node-timer"
          max={duration}
          value={
            !crashed && node.role === "leader"
              ? duration
              : Math.max(0, deadline - state.now)
          }
        />
        <span ref={timer} className="raft-node-countdown" />
      </div>
    </Html>
  );
}
function World(props: Props) {
  const { state, playback, reduced } = props;
  const heart = useMemo(createHeartGeometry, []);
  useEffect(() => () => heart.dispose(), [heart]);
  const links = [
    ...new Set(state.packets.map((p) => [p.from, p.to].sort().join(""))),
  ];
  return (
    <>
      <Camera view={props.view} onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[-4, 10, 6]} intensity={2.2} />
      {links.map((key) => (
        <Line
          key={key}
          points={[positions[key[0] as NodeId], positions[key[1] as NodeId]]}
          color="#ccc7bc"
          dashed
          dashSize={0.12}
          gapSize={0.09}
          lineWidth={1}
        />
      ))}
      {NODES.map((id) => (
        <group key={id}>
          <mesh position={positions[id]}>
            <boxGeometry args={[0.85, 0.85, 0.85]} />
            <meshStandardMaterial
              color={state.crashed.includes(id) ? "#b9b4ab" : NODE_COLORS[id]}
              roughness={1}
            />
            <Edges
              color={state.nodes[id].role === "leader" ? "#21201c" : "#8c8578"}
              lineWidth={state.nodes[id].role === "leader" ? 2 : 1}
            />
          </mesh>
          <Label
            id={id}
            state={state}
            playback={playback}
            active={props.active}
            reduced={reduced}
          />
        </group>
      ))}
      {!reduced &&
        state.packets.map((p) => (
          <PacketMesh key={p.id} packet={p} playback={playback} heart={heart} />
        ))}
    </>
  );
}
export default function Scene(props: Props) {
  return (
    <Canvas
      orthographic
      camera={{ position: DEFAULT_CAMERA, zoom: 42, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop={props.active && !props.reduced ? "always" : "demand"}
      fallback={<span>3D unavailable</span>}
    >
      <World {...props} />
    </Canvas>
  );
}
