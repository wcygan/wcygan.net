import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, OrthographicCamera, Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { votesSnapshot, VOTE_SECONDS } from "./votes-model";
type Point = [number, number, number];
const positions: Point[] = [
  [-3, 0.45, 4],
  [0, 0.45, 4],
  [3, 0.45, 4],
  [-3, 0.45, -6],
  [3, 0.45, -6],
];
const colors = ["#cee2f7", "#e5d9f2", "#eeeee8", "#e6dff0", "#e1e0dc"];
const source: Point = [0, 0.65, -7.5];
type Props = {
  step: number;
  active: boolean;
  onAdvance: () => void;
  onReady: () => void;
  onUnavailable: () => void;
};
/** Project the node bounds and labels so highlights stay aligned while orbiting. */
function QuorumHighlights() {
  const { camera, size } = useThree();
  const quorum = useRef<SVGPolygonElement>(null);
  const waiting = useRef<SVGRectElement>(null);
  const unavailable = useRef<SVGRectElement>(null);
  const point = new Vector3();
  useFrame(() => {
    const bounds = (indices: number[]) => {
      let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;
      const include = (x: number, y: number) => {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      };
      for (const index of indices) {
        const [x, , z] = positions[index];
        for (const dx of [-0.65, 0.65])
          for (const y of [0, 1])
            for (const dz of [-0.65, 0.65]) {
              point.set(x + dx, y, z + dz).project(camera);
              include(
                ((point.x + 1) * size.width) / 2,
                ((1 - point.y) * size.height) / 2,
              );
            }
        point.set(x, 0, z).project(camera);
        const px = ((point.x + 1) * size.width) / 2,
          py = ((1 - point.y) * size.height) / 2;
        include(px - 43, py + 88);
        include(px + 43, py + 88);
      }
      return {
        x: left - 8,
        y: top - 8,
        width: right - left + 16,
        height: bottom - top + 16,
      };
    };
    const a = bounds([0]),
      c = bounds([2]);
    quorum.current?.setAttribute(
      "points",
      `${a.x},${a.y} ${c.x + c.width},${c.y} ${c.x + c.width},${c.y + c.height} ${a.x},${a.y + a.height}`,
    );
    for (const [ref, indices] of [
      [waiting, [3]],
      [unavailable, [4]],
    ] as const) {
      const rect = bounds([...indices]);
      for (const [key, value] of Object.entries(rect))
        ref.current?.setAttribute(key, String(value));
    }
  });
  return (
    <Html fullscreen style={{ pointerEvents: "none" }} zIndexRange={[1, 0]}>
      <svg
        width={size.width}
        height={size.height}
        aria-hidden="true"
        className="paxos-vote-highlights"
      >
        <polygon ref={quorum} className="paxos-quorum-outline" />
        <rect ref={waiting} className="paxos-uncertain-outline" rx="8" />
        <rect ref={unavailable} className="paxos-uncertain-outline" rx="8" />
      </svg>
    </Html>
  );
}
function World({ step, active, onAdvance, onUnavailable }: Props) {
  const { camera, size, invalidate, gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onUnavailable);
    return () => canvas.removeEventListener("webglcontextlost", onUnavailable);
  }, [gl, onUnavailable]);
  const packet = useRef<Group>(null);
  const elapsed = useRef(0);
  const state = votesSnapshot(step);
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = Math.min(size.width / 13, size.height / 16);
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    elapsed.current = 0;
    invalidate();
  }, [step, invalidate]);
  useFrame((_, dt) => {
    if (step < 1 || step > 6) return;
    if (active)
      elapsed.current = Math.min(
        VOTE_SECONDS,
        elapsed.current + Math.min(dt, 0.1),
      );
    const t = elapsed.current / VOTE_SECONDS;
    const destination = positions[Math.floor((step - 1) / 2)];
    const progress = step % 2 === 0 ? 1 - t : t;
    packet.current?.position.set(
      source[0] + (destination[0] - source[0]) * progress,
      0.65,
      source[2] + (destination[2] - 0.6 - source[2]) * progress,
    );
    if (active && t >= 1) onAdvance();
    if (active) invalidate();
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
        minZoom={25}
        maxZoom={80}
      />
      {state.chosen && <QuorumHighlights />}
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 8, 4]} intensity={2} />
      <mesh position={[0, 0.45, -8]}>
        <boxGeometry args={[1, 0.9, 0.8]} />
        <meshStandardMaterial color="#deddd6" roughness={1} />
        <Edges color="#77766f" />
      </mesh>
      <Html center position={[0, 1.45, -8]}>
        <div className="paxos-3d-label">
          Proposer · {state.replies}/3 replies
          <br />
          {state.known ? "Knows P is chosen" : "Proposing P"}
        </div>
      </Html>
      {state.voters.map((v, i) => (
        <group key={v.name}>
          <Line
            points={[source, [positions[i][0], 0.65, positions[i][2] - 0.6]]}
            color={i < state.accepted ? "#2e8052" : "#b6b4ab"}
            dashed
            dashSize={0.12}
            gapSize={0.1}
            lineWidth={1}
          />
          <mesh position={positions[i]}>
            <cylinderGeometry args={[0.55, 0.55, 0.9, 32]} />
            <meshStandardMaterial color={colors[i]} roughness={1} />
            <Edges color="#77766f" />
          </mesh>
          <Html
            center
            position={[positions[i][0], 0, positions[i][2]]}
            style={{ pointerEvents: "none" }}
          >
            <div className="paxos-3d-label paxos-vote-label">
              <div>Server {v.name}</div>
              <strong
                className={
                  i < state.accepted
                    ? "paxos-vote-accepted"
                    : "paxos-vote-waiting"
                }
              >
                {i < state.accepted ? "✓ P" : i === 4 ? "×" : "…"}
              </strong>
              <div className="paxos-3d-history">{v.status}</div>
            </div>
          </Html>
        </group>
      ))}
      {step >= 1 && step <= 6 && (
        <group
          ref={packet}
          position={
            step % 2 === 0 ? positions[Math.floor((step - 1) / 2)] : source
          }
        >
          <mesh>
            <boxGeometry args={[0.24, 0.24, 0.24]} />
            <meshStandardMaterial
              color={step % 2 === 0 ? "#2e8052" : "#145da0"}
            />
          </mesh>
          <Html center position={[0, 0.35, 0]}>
            <span className="paxos-3d-packet paxos-update-x">
              {step % 2 === 0 ? "Accepted P" : "Accept P"}
            </span>
          </Html>
        </group>
      )}
    </>
  );
}
export default function VotesScene(props: Props) {
  return (
    <SceneCanvas
      sceneId="paxos-majority"
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
