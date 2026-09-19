import { VectorNotation } from "./VectorNotation";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, Mesh, OrthographicCamera, Spherical } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { EVENTS, NODES, snapshot, type NodeId } from "./model";
import type { Playback, PlaybackState } from "./playback";
type Point = [number, number, number];
const POSITIONS: Record<NodeId, Point> = {
  A: [-2.3, 0.5, 1.3],
  B: [0, 0.5, -2],
  C: [2.3, 0.5, 1.3],
};
const CLIENT_POSITIONS: Record<"A" | "C", Point> = {
  A: [-3, 0.5, -1.2],
  C: [2.6, 0.5, -1.5],
};
const COLORS = { A: "#efba91", B: "#ead082", C: "#cbd5a3" };
export type View = {
  kind: "reset" | "left" | "right" | "in" | "out";
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
  const fitted = Math.min(size.width / 8.2, size.height / 6.6);
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
      camera.position.set(4, 10, 12);
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
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
    // Simulation updates and resizing must not reset the reader's orbit.
  }, [camera, view, invalidate]);
  return (
    <OrbitControls
      enablePan={false}
      enableDamping={false}
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
  const event = state.inProgress ? EVENTS[state.step] : undefined;
  useFrame(() => {
    if (!mesh.current) return;
    const p = playback.getProgress();
    // Client input arrives first; processing follows in the final 35%.
    const processing =
      event?.kind === "local" ? Math.max(0, (p - 0.65) / 0.35) : p;
    const pulse =
      !state.reduced && event?.node === node
        ? Math.sin(Math.PI * processing)
        : 0;
    // Lift and expand the node while it processes its local/send/receive event.
    mesh.current.position.y = 0.4 * pulse;
    mesh.current.scale.setScalar(1 + 0.2 * pulse);
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[0.85, 0.85, 0.85]} />
      <meshStandardMaterial color={COLORS[node]} roughness={0.85} />
      <Edges color={event?.node === node ? "#21201c" : "#736f64"} />
    </mesh>
  );
}
function Packet({ state, playback }: Pick<Props, "state" | "playback">) {
  const narrow = useThree((s) => s.size.width < 640);
  const group = useRef<Group>(null);
  // A packet exists only after the sender has committed its increment.
  const message = state.message;
  useFrame(() => {
    if (!group.current || !message) return;
    const from = POSITIONS[message.from];
    const to = POSITIONS[message.to];
    const progress = state.reduced ? 0 : playback.getProgress();
    // Park a sent message on its path until the reader starts receipt.
    const p = 0.35 + 0.65 * progress;
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
      <Html
        center
        position={narrow ? [1.3, 0.1, 0] : [0, 0.55, 0]}
        className="vc-packet-label"
      >
        <span>Clock </span>
        <VectorNotation value={message.clock} />
      </Html>
    </group>
  );
}
function ClientInputs({ state, playback }: Pick<Props, "state" | "playback">) {
  const request = useRef<Group>(null);
  const event = state.inProgress ? EVENTS[state.step] : undefined;
  const input = event?.kind === "local" ? event : undefined;
  useFrame(() => {
    if (!request.current || !input) return;
    const p = Math.min(1, playback.getProgress() / 0.65);
    const from = CLIENT_POSITIONS[input.node];
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
      {([EVENTS[0], EVENTS[1]] as const).map((source) => (
        <group key={source.client}>
          <Line
            points={[CLIENT_POSITIONS[source.node], POSITIONS[source.node]]}
            color="#bcbbb5"
            lineWidth={1}
          />
          <group position={CLIENT_POSITIONS[source.node]}>
            <mesh>
              <boxGeometry args={[0.55, 0.36, 0.08]} />
              <meshStandardMaterial color="#e4e3de" />
              <Edges color="#736f64" />
            </mesh>
            <mesh position={[0, -0.2, 0.12]}>
              <boxGeometry args={[0.65, 0.06, 0.4]} />
              <meshStandardMaterial color="#bcbbb5" />
              <Edges color="#736f64" />
            </mesh>
            <Html center position={[0, 0.85, 0]} className="vc-client-label">
              <strong>{source.client}</strong>
              <span>{source.input}</span>
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
          <Html center position={[0, 0.5, 0]} className="vc-packet-label">
            {input.input}
          </Html>
        </group>
      )}
    </>
  );
}
/** Keep labels below the projected cube even when the reader orbits overhead. */
function NodeLabel({ node, state }: { node: NodeId; state: PlaybackState }) {
  const anchor = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ camera }) => {
    if (!anchor.current) return;
    const e = camera.matrixWorld.elements;
    const radius = 0.425 * (Math.abs(e[4]) + Math.abs(e[5]) + Math.abs(e[6]));
    const distance = radius + 28 / (camera as OrthographicCamera).zoom;
    const changed =
      Math.abs(anchor.current.position.x + e[4] * distance) +
        Math.abs(anchor.current.position.y + e[5] * distance) +
        Math.abs(anchor.current.position.z + e[6] * distance) >
      0.00001;
    anchor.current.position.set(
      -e[4] * distance,
      -e[5] * distance,
      -e[6] * distance,
    );
    if (changed) invalidate();
  });
  return (
    <group ref={anchor}>
      <Html center className="vc-node-label">
        <strong>
          Node{" "}
          <span
            className="vc-node-chip"
            style={{ backgroundColor: COLORS[node] }}
          >
            {node}
          </span>
          {state.inProgress && EVENTS[state.step]?.node === node
            ? " · " +
              (EVENTS[state.step].kind === "local"
                ? "write +1"
                : EVENTS[state.step].kind === "send"
                  ? "send +1"
                  : "merge +1")
            : ""}
        </strong>
        <VectorNotation
          value={state.clocks[node]}
          previous={snapshot(Math.max(0, state.step - 1)).clocks[node]}
        />
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
      {(
        [
          ["A", "B"],
          ["B", "C"],
        ] as const
      ).map(([a, b]) => (
        <group key={a}>
          <Line
            points={[POSITIONS[a], POSITIONS[b]]}
            color="#bcbbb5"
            lineWidth={1}
            dashed
            dashSize={0.12}
            gapSize={0.09}
          />
          <Html
            center
            position={[
              POSITIONS[a][0] +
                (POSITIONS[b][0] - POSITIONS[a][0]) * (a === "B" ? 0.8 : 0.5) +
                (a === "B" ? 0.8 : 0),
              0.9,
              POSITIONS[a][2] +
                (POSITIONS[b][2] - POSITIONS[a][2]) * (a === "B" ? 0.8 : 0.5),
            ]}
            className="vc-path-label"
          >
            {a} → {b}
          </Html>
        </group>
      ))}
      {NODES.map((node) => (
        <group key={node} position={POSITIONS[node]}>
          <NodeBody node={node} state={state} playback={props.playback} />
          <NodeLabel node={node} state={state} />
        </group>
      ))}
      <ClientInputs state={state} playback={props.playback} />
      <Packet state={state} playback={props.playback} />
    </>
  );
}
export default function Scene(props: Props) {
  return (
    <SceneCanvas
      orthographic
      camera={{ position: [4, 10, 12], zoom: 45, near: 0.1, far: 100 }}
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
