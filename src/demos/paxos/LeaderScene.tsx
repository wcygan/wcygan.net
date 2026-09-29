import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { leaderSnapshot } from "./leader-model";
import { TravelToken } from "./TravelToken";
type Point = [number, number, number];
const positions: Point[] = [
  [-3, 0.45, 4],
  [0, 0.45, 4],
  [3, 0.45, 4],
  [-3, 0.45, -3],
  [3, 0.45, -3],
];
const colors = ["#cee2f7", "#e5d9f2", "#eeeee8", "#e6dff0", "#e1e0dc"];

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
  const state = leaderSnapshot(step);
  const source: Point = step < 3 ? [-3, 1, 4] : [-3, 1, -3];
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onUnavailable);
    return () => canvas.removeEventListener("webglcontextlost", onUnavailable);
  }, [gl, onUnavailable]);
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = Math.min(size.width / 13, size.height / 14);
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
        <div className="paxos-scene-explanation">
          {
            [
              "One decision: choose P",
              "A + B + C accepted P → P is chosen",
              "A is offline. Its accepted value remains stored.",
              "D takes over and consults C + D + E",
              "C reports P → D must reuse P",
              "New leader, same decision: P",
            ][step]
          }
        </div>
      </Html>
      {step === 3 && (
        <TravelToken
          key="report"
          from={[3, 0.8, 4]}
          to={source}
          active={active}
          label="I accepted P"
          color="#a4420a"
        />
      )}
      {step === 4 &&
        [2, 4].map((i) => (
          <TravelToken
            key={i}
            from={source}
            to={positions[i]}
            active={active}
            label="Keep P"
          />
        ))}
      {state.voters.map((v, i) => {
        const recovering =
          (state.index === 3 || state.index === 4) && v.name === "C";
        const connected =
          state.leader !== "absent" &&
          v.name !== state.leaderId &&
          (state.index < 3 ? i < 3 : state.consulted.includes(v.name));
        return (
          <group key={v.name}>
            {connected && (
              <Line
                points={[
                  source,
                  [positions[i][0], 0.65, positions[i][2] - 0.6],
                ]}
                color={
                  recovering
                    ? "#a4420a"
                    : state.index === 5
                      ? "#2e8052"
                      : "#b6b4ab"
                }
                dashed
                dashSize={0.12}
                gapSize={0.1}
                lineWidth={recovering ? 2 : 1}
              />
            )}
            {(v.name === state.leaderId || !v.online) && (
              <Html
                center
                position={[positions[i][0], 1.7, positions[i][2]]}
                style={{ pointerEvents: "none" }}
              >
                <div className="paxos-leader-role">
                  {!v.online
                    ? "Offline · former leader"
                    : step < 3
                      ? "Leader · proposes P"
                      : step === 3
                        ? "New leader · asks C/E"
                        : "New leader · keeps P"}
                </div>
              </Html>
            )}
            <mesh position={positions[i]}>
              <cylinderGeometry args={[0.55, 0.55, 0.9, 32]} />
              <meshStandardMaterial
                color={v.online ? colors[i] : "#deddd6"}
                roughness={1}
                transparent
                opacity={v.online ? 1 : 0.35}
              />
              <Edges color="#77766f" />
            </mesh>
            {(v.accepted || state.consulted.includes(v.name)) && (
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[positions[i][0], 0.03, positions[i][2]]}
              >
                <ringGeometry args={[0.72, 0.8, 64]} />
                <meshBasicMaterial
                  color={
                    recovering ? "#a4420a" : v.accepted ? "#2e8052" : "#bcbbb5"
                  }
                />
              </mesh>
            )}
            <Html
              center
              position={[positions[i][0], 0, positions[i][2]]}
              style={{ pointerEvents: "none" }}
            >
              <div className="paxos-3d-label paxos-vote-label">
                <div>Server {v.name}</div>
                <strong
                  className={
                    recovering
                      ? "paxos-overlap-shared"
                      : v.accepted
                        ? "paxos-vote-accepted"
                        : "paxos-vote-waiting"
                  }
                >
                  {v.accepted ?? "—"}
                </strong>
                <div className="paxos-3d-history">
                  {recovering
                    ? "Reports P"
                    : v.accepted
                      ? "Stored P"
                      : "No vote yet"}
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
export default function LeaderScene(props: Props) {
  return (
    <SceneCanvas
      sceneId="paxos-leader"
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
