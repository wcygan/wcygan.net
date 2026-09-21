import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Mesh, OrthographicCamera } from "three";
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
  const { event } = snapshot(count);
  useEffect(() => {
    invalidate();
  }, [active, count, invalidate]);
  useFrame(() => {
    if (!event || !mesh.current) return;
    const t = Math.min(
      1,
      Math.max(0, (playback.getTime() / BEAT_MS - count - 0.12) / 0.72),
    );
    const from = positions[event.from],
      to = positions[event.to];
    mesh.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      0.6 + Math.sin(t * Math.PI) * 0.65,
      from[2] + (to[2] - from[2]) * t,
    );
    if (active) invalidate();
  });
  if (!event) return null;
  return (
    <mesh ref={mesh} position={positions[event.from]}>
      <boxGeometry args={[0.48, 0.3, 0.36]} />
      {/* Three.js requires sRGB input; these are the CSS OKLCH palette's sRGB equivalents. */}
      <meshBasicMaterial color={event.stale ? "#b45309" : "#2563eb"} />
      <Edges color={event.stale ? "#78350f" : "#1e3a8a"} />
      <Html
        center
        position={[0, 0.45, 0]}
        className={`gossip-packet-label${event.stale ? " gossip-packet-stale" : ""}`}
        zIndexRange={[2, 0]}
      >
        {event.stale ? "Old news · v1" : "E is here · v2"}
      </Html>
    </mesh>
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
      {state.event && (
        <Line
          points={[positions[state.event.from], positions[state.event.to]]}
          color={state.event.stale ? "#b45309" : "#2563eb"}
          dashed
          dashSize={0.12}
          gapSize={0.12}
          lineWidth={2.5}
        />
      )}
      {NODES.map((node) => (
        <group key={node} position={positions[node]}>
          <mesh>
            <boxGeometry args={[0.95, 0.85, 0.95]} />
            <meshStandardMaterial
              color={state.knowledge[node] ? "#60a5fa" : "#e4e3de"}
              roughness={1}
            />
            <Edges color={state.knowledge[node] ? "#1e3a8a" : "#55534b"} />
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
            className={`gossip-version-label${state.knowledge[node] ? " gossip-informed" : ""}`}
            zIndexRange={[1, 0]}
          >
            {state.knowledge[node] ? "Knows E" : "Not yet"}
          </Html>
        </group>
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
