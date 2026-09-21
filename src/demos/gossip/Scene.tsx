import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, Mesh, OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { BEAT_MS, NODES, snapshot, type Node } from "./model";
import type { Playback } from "./playback";

type Point = [number, number, number];
const positions: Record<Node, Point> = {
  A: [-2.7, 0, -1.8],
  B: [0, 0, -2.5],
  C: [2.7, 0, -1],
  D: [1.7, 0, 2.3],
  E: [-2, 0, 2.1],
};
const arrivalStart: Point = [-5.4, 0, 3.7];
const clusterLinks: readonly [Node, Node][] = [
  ["A", "B"],
  ["B", "C"],
  ["C", "D"],
  ["D", "A"],
];
interface Props {
  playback: Playback;
  count: number;
  active: boolean;
  reduced: boolean;
  top: boolean;
  onReady: () => void;
  onUnavailable: () => void;
}

function Camera({ top, onUnavailable }: Pick<Props, "top" | "onUnavailable">) {
  const { camera, size, invalidate, gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  useEffect(() => {
    camera.position.set(top ? 0 : 4, top ? 12 : 8, top ? 0.01 : 9);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, top, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(size.width / 8.7, size.height / 7.5);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return (
    <OrbitControls
      key={String(top)}
      enablePan={false}
      enableDamping={false}
      minZoom={20}
      maxZoom={140}
    />
  );
}

function Packet({
  playback,
  count,
  active,
}: Pick<Props, "playback" | "count" | "active">) {
  const mesh = useRef<Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const { step } = snapshot(count);
  useEffect(() => {
    invalidate();
  }, [active, count, invalidate]);
  useFrame(() => {
    if (step?.kind !== "exchange" || !mesh.current) return;
    const t = Math.min(
      1,
      Math.max(0, (playback.getTime() / BEAT_MS - count - 0.12) / 0.72),
    );
    const from = positions[step.from],
      to = positions[step.to];
    mesh.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      0.6 + Math.sin(t * Math.PI) * 0.65,
      from[2] + (to[2] - from[2]) * t,
    );
    if (active) invalidate();
  });
  if (step?.kind !== "exchange") return null;
  return (
    <mesh ref={mesh} position={positions[step.from]}>
      <boxGeometry args={[0.48, 0.3, 0.36]} />
      {/* Three.js requires sRGB input; these are the CSS OKLCH palette's sRGB equivalents. */}
      <meshBasicMaterial color="#27b648" />
      <Edges color="#168336" />
      <Html
        center
        position={[0, 0.45, 0]}
        className="gossip-packet-label"
        zIndexRange={[2, 0]}
      >
        {step.role === "seed" ? "Join via seed" : "E joined"}
      </Html>
    </mesh>
  );
}

function GossipNode({
  node,
  playback,
  count,
  active,
}: Pick<Props, "playback" | "count" | "active"> & { node: Node }) {
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const state = snapshot(count);
  const visible = node !== "E" || count >= 1;
  useEffect(() => invalidate(), [active, count, invalidate]);
  useFrame(() => {
    if (node !== "E" || !group.current || count !== 1) return;
    const t = Math.min(1, Math.max(0, playback.getTime() / BEAT_MS - count));
    const eased = 1 - Math.pow(1 - t, 3);
    const target = positions.E;
    group.current.position.set(
      arrivalStart[0] + (target[0] - arrivalStart[0]) * eased,
      Math.sin(t * Math.PI) * 0.35,
      arrivalStart[2] + (target[2] - arrivalStart[2]) * eased,
    );
    if (active) invalidate();
  });
  if (!visible) return null;
  const informed = node === "E" || state.knowledge[node];
  return (
    <group
      ref={group}
      position={node === "E" && count === 1 ? arrivalStart : positions[node]}
    >
      <mesh>
        <boxGeometry args={[0.95, 0.85, 0.95]} />
        <meshStandardMaterial
          color={state.ePresent && informed ? "#27b648" : "#0e73cc"}
          roughness={1}
        />
        <Edges color={state.ePresent && informed ? "#168336" : "#075b9f"} />
      </mesh>
      <Html
        center
        position={[0, 0.75, 0]}
        className="gossip-node-label"
        zIndexRange={[1, 0]}
      >
        {node}
      </Html>
      <Html
        center
        position={[0, -0.75, 0]}
        className={`gossip-version-label${state.ePresent && informed ? " gossip-informed" : ""}`}
        zIndexRange={[1, 0]}
      >
        {node === "E" && !state.ePresent
          ? "Arriving"
          : informed
            ? "Knows E"
            : "Not yet"}
      </Html>
    </group>
  );
}

export default function Scene(props: Props) {
  const state = snapshot(props.count);
  return (
    <SceneCanvas
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: [0, 8, 9], zoom: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={null}
    >
      <Camera top={props.top} onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[-4, 9, 5]} intensity={2} />
      {clusterLinks.map(([from, to]) => (
        <Line
          key={`${from}-${to}`}
          points={[positions[from], positions[to]]}
          color="#bcbbb5"
          dashed
          dashSize={0.12}
          gapSize={0.12}
          lineWidth={1.5}
        />
      ))}
      {state.ePresent && (
        <Line
          points={[positions.E, positions.A]}
          color="#bcbbb5"
          dashed
          dashSize={0.12}
          gapSize={0.12}
          lineWidth={1.5}
        />
      )}
      {state.step?.kind === "exchange" && (
        <Line
          points={[positions[state.step.from], positions[state.step.to]]}
          color="#27b648"
          dashed
          dashSize={0.12}
          gapSize={0.12}
          lineWidth={2.5}
        />
      )}
      {NODES.map((node) => (
        <GossipNode
          key={node}
          node={node}
          playback={props.playback}
          count={props.count}
          active={props.active}
        />
      ))}
      {!props.reduced && (
        <Packet
          playback={props.playback}
          count={props.count}
          active={props.active}
        />
      )}
    </SceneCanvas>
  );
}
