import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { MEMBERS, overlapSnapshot } from "./overlap-model";
import { QUORUM_POSITIONS, quorumPath } from "./quorum-paths";
type Point = [number, number, number];
const positions = QUORUM_POSITIONS;
const colors = ["#f3db91", "#a9ceef", "#efb3b9", "#c9b5e8", "#acd8c2"];
const previousRing: Point[] = Array.from({ length: 65 }, (_, i) => [
  Math.cos((i * Math.PI) / 32) * 0.95,
  0.04,
  Math.sin((i * Math.PI) / 32) * 0.95,
]);
type Props = {
  step: number;
  active: boolean;
  onAdvance: () => void;
  onReady: () => void;
  onUnavailable: () => void;
};
function World({ step, active, onAdvance, onUnavailable }: Props) {
  const { camera, size, invalidate, gl } = useThree();
  const elapsed = useRef(0);
  const state = overlapSnapshot(step);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onUnavailable);
    return () => canvas.removeEventListener("webglcontextlost", onUnavailable);
  }, [gl, onUnavailable]);
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = Math.min(size.width / 12, size.height / 13);
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    elapsed.current = 0;
    invalidate();
  }, [step, invalidate]);
  useFrame((_, dt) => {
    if (!active || step === 5) return;
    elapsed.current += Math.min(dt, 0.1);
    if (elapsed.current >= 3.5) {
      elapsed.current = 0;
      onAdvance();
    }
    invalidate();
  });
  return (
    <>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping={false}
        minPolarAngle={Math.atan2(10, 7)}
        maxPolarAngle={Math.atan2(10, 7)}
        minAzimuthAngle={-0.25}
        maxAzimuthAngle={0.25}
        minZoom={22}
        maxZoom={80}
      />
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 8, 4]} intensity={2} />
      <Html fullscreen style={{ pointerEvents: "none" }}>
        <div className="paxos-quorum-tracker">
          <div>
            {step === 0
              ? "Cluster ready · no quorum yet"
              : `Round ${step} · quorum ${state.current.join(" + ")}`}
          </div>
          <div className="paxos-quorum-members">
            {MEMBERS.map((name, i) => (
              <span key={name} data-member={state.current.includes(name)}>
                <i style={{ backgroundColor: colors[i] }} />
                {name}
                <small>
                  {state.shared.includes(name)
                    ? "Shared"
                    : state.current.includes(name)
                      ? "Current"
                      : "—"}
                </small>
              </span>
            ))}
          </div>
        </div>
      </Html>
      {[state.previous, state.current].map((members, group) =>
        members.flatMap((a, i) =>
          members
            .slice(i + 1)
            .map((b) => (
              <Line
                key={`${group}-${a}-${b}`}
                points={quorumPath(MEMBERS.indexOf(a), MEMBERS.indexOf(b))}
                color={group === 1 ? "#2e8052" : "#99988e"}
                lineWidth={group === 1 ? 2 : 1}
                dashed={group === 0}
                dashSize={0.15}
                gapSize={0.12}
              />
            )),
        ),
      )}
      {MEMBERS.map((name, i) => {
        const current = state.current.includes(name),
          previous = state.previous.includes(name),
          shared = state.shared.includes(name);
        return (
          <group key={name} position={[positions[i][0], 0, positions[i][2]]}>
            {previous && (
              <Line
                points={previousRing}
                dashed
                dashSize={0.12}
                gapSize={0.09}
                color="#77766f"
                lineWidth={1.5}
              />
            )}
            {current && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[0.7, shared ? 0.85 : 0.78, 64]} />
                <meshBasicMaterial color={shared ? "#b75b19" : "#2e8052"} />
              </mesh>
            )}
            <mesh position={[0, 0.45, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.9, 32]} />
              <meshStandardMaterial color={colors[i]} roughness={1} />
              <Edges color="#77766f" />
            </mesh>
            <Html center position={[0, 0, 0]} style={{ pointerEvents: "none" }}>
              <div className="paxos-3d-label paxos-overlap-label">
                <div>Server {name}</div>
                <strong
                  className={
                    shared
                      ? "paxos-overlap-shared"
                      : current
                        ? "paxos-vote-accepted"
                        : "paxos-vote-waiting"
                  }
                >
                  {shared
                    ? "Shared"
                    : current
                      ? "Current"
                      : previous
                        ? "Previous"
                        : "—"}
                </strong>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
export default function OverlapScene(props: Props) {
  return (
    <SceneCanvas
      sceneId="paxos-overlap"
      orthographic
      camera={{ position: [0, 7, 10], zoom: 40 }}
      frameloop="demand"
      dpr={[1, 2]}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
    >
      <World {...props} />
    </SceneCanvas>
  );
}
