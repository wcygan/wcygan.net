import { VectorNotation } from "./VectorNotation";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, Mesh, OrthographicCamera, Spherical } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { INPUTS, type NodeId, NODES, value } from "./model";
import type { Playback, PlaybackState } from "./playback";
type Point = [number, number, number];
const POSITIONS: Record<NodeId, Point> = {
  A: [1.1, 0.5, 2.1],
  B: [1.1, 0.5, -2.1],
};
const CLIENT_POSITIONS: Record<NodeId, Point> = {
  A: [-2.2, 0.5, 2.1],
  B: [-2.2, 0.5, -2.1],
};
const LAPTOP_BASE_SIZE: Point = [0.9, 0.045, 0.58];
const LAPTOP_BASE_POSITION: Point = [0, -0.16, 0.07];
function clientConnectionPosition(node: NodeId): Point {
  const [x, y, z] = CLIENT_POSITIONS[node];
  return [
    x + LAPTOP_BASE_SIZE[0] / 2,
    y + LAPTOP_BASE_POSITION[1],
    z + LAPTOP_BASE_POSITION[2],
  ];
}
const SIDE_CAMERA: Point = [7, 4.2, 12];
const TOP_CAMERA: Point = [0, 12, 0.01];
const CAMERA_TARGET: Point = [0, 0.1, 0];
const COLORS = { A: "#efba91", B: "#ead082" };
export type View = {
  kind: "reset" | "top" | "left" | "right" | "in" | "out";
  revision: number;
};
interface Props {
  state: PlaybackState;
  playback: Playback;
  view: View;
  onReady: () => void;
  onUnavailable: () => void;
}
function Camera({
  view,
  onUnavailable,
}: Pick<Props, "view" | "onUnavailable">) {
  const { camera, size, invalidate, gl } = useThree();
  const fitted = Math.min(size.width / 8.8, size.height / 7.6) * 0.9;
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  useEffect(() => {
    (camera as OrthographicCamera).zoom = fitted;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, fitted, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (view.kind === "reset") {
      camera.position.set(...SIDE_CAMERA);
      ortho.zoom = fitted;
    } else if (view.kind === "top") {
      camera.position.set(...TOP_CAMERA);
      ortho.zoom = fitted;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fitted * 0.6,
        Math.min(fitted * 2, ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2)),
      );
    } else {
      const spherical = new Spherical().setFromVector3(camera.position);
      spherical.theta += view.kind === "left" ? -Math.PI / 8 : Math.PI / 8;
      camera.position.setFromSpherical(spherical);
    }
    camera.lookAt(...CAMERA_TARGET);
    camera.updateProjectionMatrix();
    invalidate();
    // Simulation updates and resizing must not reset the reader's orbit.
  }, [camera, view, invalidate]);
  return (
    <OrbitControls
      enablePan={false}
      enableDamping={false}
      target={CAMERA_TARGET}
      minZoom={fitted * 0.6}
      maxZoom={fitted * 2}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}
/** Drive all phases, including local events that have no packet yet. */
function AnimationFrames({ state }: Pick<Props, "state">) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [state, invalidate]);
  useFrame(() => {
    if (state.running && !state.reduced) invalidate();
  });
  return null;
}
function NodeBody({
  node,
  state,
  playback,
}: Pick<Props, "state" | "playback"> & { node: NodeId }) {
  const mesh = useRef<Mesh>(null);
  const event = state.action;
  useFrame(() => {
    if (!mesh.current) return;
    const p = playback.getProgress();
    // Client input arrives first; processing follows in the final 35%.
    const processing =
      event?.kind === "increment" ? Math.max(0, (p - 0.65) / 0.35) : p;
    const pulse =
      !state.reduced &&
      (event?.kind === "increment" ? event.node : event?.message.to) === node
        ? Math.sin(Math.PI * processing)
        : 0;
    // Briefly emphasize the node applying an increment or receiving state.
    mesh.current.position.y = 0.4 * pulse;
    mesh.current.scale.setScalar(1 + 0.2 * pulse);
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[0.85, 0.85, 0.85]} />
      <meshStandardMaterial color={COLORS[node]} roughness={0.85} />
      <Edges
        color={
          (event?.kind === "increment" ? event.node : event?.message.to) ===
          node
            ? "#21201c"
            : "#736f64"
        }
      />
    </mesh>
  );
}
function Packet({ state, playback }: Pick<Props, "state" | "playback">) {
  const group = useRef<Group>(null);
  const message =
    state.action?.kind === "deliver" ? state.action.message : null;
  useFrame(() => {
    if (!group.current || !message) return;
    const from = POSITIONS[message.from];
    const to = POSITIONS[message.to];
    const progress = state.reduced ? 0 : playback.getProgress();
    const p = progress;
    group.current.position.set(
      from[0] + (to[0] - from[0]) * p,
      from[1] +
        (to[1] - from[1]) * p +
        0.4 * (1 - p) +
        Math.sin(Math.PI * p) * 0.5,
      from[2] + (to[2] - from[2]) * p,
    );
  });
  if (!message) return null;
  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.4, 0.3, 0.42]} />
        <meshStandardMaterial color={COLORS[message.from]} />
        <Edges color="#393833" />
      </mesh>
    </group>
  );
}
function ClientInputs({ state, playback, view }: Props) {
  const request = useRef<Group>(null);
  const event = state.action;
  const input = event?.kind === "increment" ? event : undefined;
  useFrame(() => {
    if (!request.current || !input) return;
    const p = Math.min(1, playback.getProgress() / 0.65);
    const from = clientConnectionPosition(input.node);
    const to = POSITIONS[input.node];
    request.current.visible = !state.reduced && p < 1;
    request.current.position.set(
      from[0] + (to[0] - from[0]) * p,
      from[1] + Math.sin(Math.PI * p) * 0.45,
      from[2] + (to[2] - from[2]) * p,
    );
  });
  return (
    <>
      {INPUTS.filter((action) => action.kind === "increment").map((source) => (
        <group key={source.client}>
          <Line
            points={[
              clientConnectionPosition(source.node),
              POSITIONS[source.node],
            ]}
            color="#bcbbb5"
            lineWidth={1}
          />
          <group position={CLIENT_POSITIONS[source.node]}>
            {/* Open laptop with a connected lid, hinge, aluminum deck, and screen. */}
            <mesh position={[0, 0.125, -0.2]}>
              <boxGeometry args={[0.78, 0.53, 0.055]} />
              <meshStandardMaterial color="#b8b7b1" roughness={0.82} />
              <Edges color="#736f64" />
            </mesh>
            <mesh position={[0, 0.125, -0.166]}>
              <boxGeometry args={[0.7, 0.45, 0.012]} />
              <meshStandardMaterial color="#323232" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.125, -0.158]}>
              <boxGeometry args={[0.64, 0.39, 0.006]} />
              <meshStandardMaterial color="#555650" roughness={0.9} />
            </mesh>
            <mesh position={LAPTOP_BASE_POSITION}>
              <boxGeometry args={LAPTOP_BASE_SIZE} />
              <meshStandardMaterial color="#c4c3bd" roughness={0.82} />
              <Edges color="#736f64" />
            </mesh>
            <mesh position={[0, -0.137, 0.055]}>
              <boxGeometry args={[0.65, 0.012, 0.31]} />
              <meshStandardMaterial color="#b8b7b1" roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.14, -0.205]}>
              <boxGeometry args={[0.78, 0.035, 0.04]} />
              <meshStandardMaterial color="#85837d" roughness={0.8} />
            </mesh>
            {[-0.065, 0, 0.065].flatMap((row) =>
              Array.from({ length: 8 }, (_, index) => (
                <mesh
                  key={`${row}-${index}`}
                  position={[(index - 3.5) * 0.07, -0.131, row]}
                >
                  <boxGeometry args={[0.055, 0.012, 0.045]} />
                  <meshStandardMaterial color="#777670" roughness={0.9} />
                </mesh>
              )),
            )}
            <mesh position={[0, -0.132, 0.25]}>
              <boxGeometry args={[0.2, 0.012, 0.11]} />
              <meshStandardMaterial color="#d6d5cf" roughness={0.9} />
              <Edges color="#a5a39c" />
            </mesh>
            <Html
              center
              position={view.kind === "top" ? [-1.2, 0, 0] : [0, 1.05, 0]}
              className="gc-client-label"
            >
              <strong>{source.client}</strong>
              <span>Increment +1</span>
            </Html>
          </group>
        </group>
      ))}
      {input && !state.reduced && (
        <group ref={request}>
          <mesh>
            <boxGeometry args={[0.32, 0.12, 0.24]} />
            <meshStandardMaterial color="#63635e" />
            <Edges color="#21201c" />
          </mesh>
        </group>
      )}
    </>
  );
}
/** Keep the whole label clear of the projected cube while the reader orbits. */
function NodeLabel({
  node,
  state,
  view,
}: {
  node: NodeId;
  state: PlaybackState;
  view: View;
}) {
  const anchor = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ camera }) => {
    if (!anchor.current) return;
    const e = camera.matrixWorld.elements;
    const radius = 0.425 * (Math.abs(e[4]) + Math.abs(e[5]) + Math.abs(e[6]));
    const distance = radius + 82 / (camera as OrthographicCamera).zoom;
    const next =
      view.kind === "top"
        ? [0, 0, 0]
        : [-e[4] * distance, -e[5] * distance, -e[6] * distance];
    const changed =
      Math.abs(anchor.current.position.x - next[0]) +
        Math.abs(anchor.current.position.y - next[1]) +
        Math.abs(anchor.current.position.z - next[2]) >
      0.00001;
    anchor.current.position.set(next[0], next[1], next[2]);
    if (changed) invalidate();
  });
  return (
    <group ref={anchor}>
      <Html center position={[1.25, 0, 0]} className="gc-node-label">
        <strong>
          Node{" "}
          <span
            className="gc-node-chip"
            style={{ backgroundColor: COLORS[node] }}
          >
            {node}
          </span>
        </strong>
        <VectorNotation
          value={state.replicas[node]}
          previous={state.previous[node]}
        />
        <span>Value: {value(state.replicas[node])}</span>
      </Html>
    </group>
  );
}
function World(props: Props) {
  const { state } = props;
  return (
    <>
      <AnimationFrames state={state} />
      <Camera view={props.view} onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-3, 8, 6]} intensity={2.2} />
      {([["A", "B"]] as const).map(([a, b]) => (
        <group key={`${a}-${b}`}>
          <Line
            points={[POSITIONS[a], POSITIONS[b]]}
            color="#bcbbb5"
            lineWidth={1}
            dashed
            dashSize={0.12}
            gapSize={0.09}
          />
        </group>
      ))}
      {NODES.map((node) => (
        <group key={node} position={POSITIONS[node]}>
          <NodeBody node={node} state={state} playback={props.playback} />
          <NodeLabel node={node} state={state} view={props.view} />
        </group>
      ))}
      <ClientInputs {...props} />
      <Packet state={state} playback={props.playback} />
    </>
  );
}
export default function Scene(props: Props) {
  return (
    <SceneCanvas
      sceneId="grow-only-counter"
      orthographic
      camera={{ position: SIDE_CAMERA, zoom: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      fallback={<p>3D is unavailable.</p>}
    >
      <World {...props} />
    </SceneCanvas>
  );
}
