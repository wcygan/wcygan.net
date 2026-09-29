import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { historySnapshot } from "./history-model";
import { TravelToken } from "./TravelToken";
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
  const state = historySnapshot(step);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onUnavailable);
    return () => canvas.removeEventListener("webglcontextlost", onUnavailable);
  }, [gl, onUnavailable]);
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = Math.min(size.width / 11, size.height / 11);
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    elapsed.current = 0;
    invalidate();
  }, [step, invalidate]);
  useFrame((_, dt) => {
    if (!active || step === 8) return;
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
        minAzimuthAngle={-0.15}
        maxAzimuthAngle={0.15}
        minZoom={22}
        maxZoom={80}
      />
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 8, 4]} intensity={2} />
      {state.replicas.map((replica, row) => {
        const rowSpacing =
          140 /
          (Math.min(size.width / 11, size.height / 11) *
            Math.sin(Math.atan2(7, 10)));
        const z = (row - 1) * rowSpacing;
        const lagging = replica.applied.length < state.chosen.length;
        return (
          <group key={replica.name}>
            {replica.applying && (
              <TravelToken
                key={step}
                from={[-1.5 + (state.applyingSlot - 1) * 2.5, 0.8, z]}
                to={[-4, 0.9, z]}
                active={active}
                label={state.chosen[state.applyingSlot - 1].label}
                duration={2.5}
              />
            )}

            <mesh position={[-4, 0.45, z]}>
              <cylinderGeometry args={[0.55, 0.55, 0.9, 32]} />
              <meshStandardMaterial
                color={["#cee2f7", "#e5d9f2", "#eeeee8"][row]}
                roughness={1}
              />
              <Edges color="#77766f" />
            </mesh>
            <Html
              center
              position={[-4, 0, z]}
              style={{ pointerEvents: "none" }}
            >
              <div className="paxos-3d-label paxos-history-server">
                <div>Server {replica.name}</div>
                <strong
                  className={
                    lagging ? "paxos-overlap-shared" : "paxos-vote-accepted"
                  }
                >
                  {replica.value}
                  {replica.applying && (
                    <div className="paxos-value-change">
                      {replica.value} →{" "}
                      {state.chosen[state.applyingSlot - 1].apply(
                        replica.value,
                      )}
                    </div>
                  )}
                </strong>
              </div>
            </Html>
            <Line
              points={[
                [-3.2, 0.1, z],
                [4, 0.1, z],
              ]}
              color="#b6b4ab"
              dashed
              dashSize={0.12}
              gapSize={0.1}
            />
            {state.chosen.map((operation, i) => {
              const applied = i < replica.applied.length;
              const x = -1.5 + i * 2.5;
              return (
                <group key={operation.slot}>
                  <mesh position={[x, 0.25, z]}>
                    <boxGeometry args={[1.8, 0.5, 1.2]} />
                    <meshStandardMaterial
                      color={applied ? "#e7f4e9" : "#f7f6f3"}
                      roughness={1}
                    />
                    <Edges color={applied ? "#2e8052" : "#a78103"} />
                  </mesh>
                  <Html
                    center
                    position={[x, 1.15, z]}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="paxos-history-entry">
                      <strong>{operation.slot}</strong>
                    </div>
                  </Html>
                  <Html
                    center
                    position={[x, 0, z]}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="paxos-history-description">
                      <div>{operation.label}</div>
                      <div className="paxos-history-entry-state">
                        {replica.applying &&
                        operation.slot === state.applyingSlot
                          ? "Applying →"
                          : applied
                            ? "Applied"
                            : "Pending"}
                      </div>
                    </div>
                  </Html>
                </group>
              );
            })}
          </group>
        );
      })}
    </>
  );
}
export default function HistoryScene(props: Props) {
  return (
    <SceneCanvas
      sceneId="paxos-history"
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
