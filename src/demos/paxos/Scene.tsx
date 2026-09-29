import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  COLORS,
  snapshot,
  packetProgress,
  DELIVERY_BEAT_SECONDS,
  type Update,
} from "./model";

type Props = {
  step: number;
  active: boolean;
  onAdvance: () => void;
  onReady: () => void;
  onUnavailable: () => void;
};
type Point = [number, number, number];
const xs = [-3, 0, 3];
const replicaColors = ["#cee2f7", "#e5d9f2", "#eeeee8"];
const start: Point = [0, 0.65, -2.7];
const end = (x: number): Point => [x, 0.65, 2.1];
function Packet({
  update,
  x,
  phase,
  active,
  slow,
}: {
  update: Update;
  x: number;
  phase: number;
  active: boolean;
  slow: boolean;
}) {
  const ref = useRef<Group>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    elapsed.current = 0;
    invalidate();
  }, [phase, invalidate]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (active)
      elapsed.current = Math.min(
        DELIVERY_BEAT_SECONDS,
        elapsed.current + Math.min(dt, 0.1),
      );
    const t = packetProgress(phase, elapsed.current, slow);
    const a = start,
      b = end(x);
    ref.current.position.set(
      a[0] + (b[0] - a[0]) * t,
      a[1],
      a[2] + (b[2] - a[2]) * t,
    );
    if (active) invalidate();
  });
  return (
    <group ref={ref} position={start}>
      <mesh>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial color={COLORS[update]} />
      </mesh>
      <Html center position={[0, 0.35, 0]}>
        <span
          className={`paxos-3d-packet paxos-update-${update.toLowerCase()}`}
        >
          {update}
        </span>
      </Html>
    </group>
  );
}
function World({ step, active, onAdvance }: Props) {
  const { camera, size, invalidate } = useThree();
  const elapsed = useRef(0);
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = Math.min(size.width / 11, size.height / 8);
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    elapsed.current = 0;
    invalidate();
  }, [step, invalidate]);
  useFrame((_, dt) => {
    if (!active || step === 0 || step === 3) return;
    elapsed.current += Math.min(dt, 0.1);
    if (elapsed.current >= DELIVERY_BEAT_SECONDS) {
      elapsed.current = -100;
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
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        minZoom={25}
        maxZoom={100}
      />
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 8, 4]} intensity={2} />
      <mesh position={[0, 0.45, -3.3]}>
        <boxGeometry args={[1.3, 0.9, 0.8]} />
        <meshStandardMaterial color="#deddd6" roughness={1} />
        <Edges color="#77766f" />
      </mesh>
      {snapshot(step).map((r, i) => (
        <group key={r.name}>
          <Line
            points={[start, end(xs[i])]}
            color="#b6b4ab"
            dashed
            dashSize={0.12}
            gapSize={0.1}
            lineWidth={1}
          />
          {(["X", "Y"] as Update[]).map((update) => {
            const first = r.order[0] === update;
            return (
              <group key={update}>
                {(step === 1 || (step === 2 && !first)) && (
                  <Packet
                    update={update}
                    x={xs[i]}
                    phase={step}
                    active={active}
                    slow={!first}
                  />
                )}
              </group>
            );
          })}
          <mesh position={[xs[i], 0.45, 2.7]}>
            <cylinderGeometry args={[0.6, 0.6, 0.9, 32]} />
            <meshStandardMaterial color={replicaColors[i]} roughness={1} />
            <Edges color="#77766f" />
          </mesh>
          <Html
            center
            position={[xs[i], 0, 2.7]}
            style={{ pointerEvents: "none" }}
          >
            <div className="paxos-3d-label paxos-3d-replica-label">
              <span>Server {r.name}</span>
              <strong
                className={
                  r.applied.length
                    ? `paxos-update-${r.applied.at(-1)!.toLowerCase()}`
                    : ""
                }
              >
                {r.value}
              </strong>
              <div className="paxos-3d-history">
                {r.applied.length
                  ? r.applied.map((u, j) => (
                      <span key={u}>
                        {j > 0 && " → "}
                        <b className={`paxos-update-${u.toLowerCase()}`}>{u}</b>
                      </span>
                    ))
                  : "No writes"}
              </div>
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
export default function Scene(props: Props) {
  return (
    <SceneCanvas
      sceneId="paxos-agreement"
      orthographic
      camera={{ position: [0, 7, 10], zoom: 50 }}
      frameloop="demand"
      dpr={[1, 2]}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener(
          "webglcontextlost",
          props.onUnavailable,
          { once: true },
        )
      }
    >
      <World {...props} />
    </SceneCanvas>
  );
}
