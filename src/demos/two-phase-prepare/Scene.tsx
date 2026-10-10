import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Mesh, OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";

type Vote = "yes" | "no";
type Point = [number, number, number];
const coordinator: Point = [0, 0, -2.1];
const participants: [Point, Point] = [
  [-2.3, 0, 1.4],
  [2.3, 0, 1.4],
];
const centerOf = (position: Point): Point => [position[0], 0.48, position[2]];
const coordinatorCenter = centerOf(coordinator);
const voteColor = (vote: Vote) => (vote === "yes" ? "#27b648" : "#ff455d");

function Camera({ onUnavailable }: { onUnavailable: () => void }) {
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
    // Use a lower oblique view so the cluster reads as three separate nodes,
    // with the participants clearly in front of the coordinator.
    camera.position.set(0, 6.5, 12.8);
    camera.lookAt(0, 0, 0.3);
  }, [camera]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(size.width / 7.4, size.height / 6.0);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return (
    <OrbitControls
      enablePan={false}
      enableDamping={false}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI / 2}
      minZoom={20}
      maxZoom={130}
    />
  );
}

function Node({
  position,
  label,
  sublabel,
  metadata,
  coordinatorNode = false,
  vote,
}: {
  position: Point;
  label: string;
  sublabel: string;
  metadata?: string;
  coordinatorNode?: boolean;
  vote?: Vote;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.58, 0.62, 0.92, 48, 1]} />
        <meshStandardMaterial
          color={
            vote === "yes"
              ? "#dcefe0"
              : vote === "no"
                ? "#f8dfe2"
                : coordinatorNode
                  ? "#d8d6cf"
                  : "#eeede8"
          }
          roughness={1}
        />
        <Edges color={vote ? voteColor(vote) : "#8a8983"} />
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.08, 48]} />
        <meshStandardMaterial
          color={
            vote === "yes"
              ? "#dcefe0"
              : vote === "no"
                ? "#f8dfe2"
                : coordinatorNode
                  ? "#eeece6"
                  : "#f7f6f3"
          }
          roughness={1}
        />
        <Edges color={vote ? voteColor(vote) : "#8a8983"} />
      </mesh>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.79, 0.045, 8, 48]} />
        <meshBasicMaterial
          color={
            vote ? voteColor(vote) : coordinatorNode ? "#f35815" : "#bcbbb5"
          }
          transparent={!vote && !coordinatorNode}
          opacity={vote || coordinatorNode ? 0.95 : 0.55}
          toneMapped={false}
        />
      </mesh>
      <Html
        center
        position={[0, 1.32, 0]}
        className="two-phase-prepare-scene-title"
      >
        <strong>{label}</strong>
      </Html>
      <Html
        center
        position={[0, -1.02, 0.12]}
        className="two-phase-prepare-scene-label"
      >
        <span className="two-phase-prepare-scene-card">
          <span>
            <b>Membership</b>
            <em>{coordinatorNode ? "Coordinator" : "Participant"}</em>
          </span>
          <span>
            <b>Status</b>
            <em>{sublabel}</em>
          </span>
          {metadata && (
            <span>
              <b>Votes</b>
              <em className="two-phase-prepare-scene-metadata">{metadata}</em>
            </span>
          )}
          {!coordinatorNode && (
            <span>
              <b>Vote</b>
              <em
                className={
                  vote
                    ? `two-phase-prepare-scene-vote two-phase-prepare-scene-vote--${vote}`
                    : undefined
                }
              >
                {vote?.toUpperCase() ?? "\u00a0"}
              </em>
            </span>
          )}
        </span>
      </Html>
    </group>
  );
}

function Message({
  from,
  to,
  color,
  active,
  delay = 0,
}: {
  from: Point;
  to: Point;
  color: string;
  active: boolean;
  delay?: number;
}) {
  const mesh = useRef<Mesh>(null);
  const started = useRef(performance.now());
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    started.current = performance.now();
    if (!active) mesh.current?.position.set(to[0], 0.75, to[2]);
    invalidate();
  }, [active, from, to, invalidate]);
  useFrame(() => {
    if (!mesh.current) return;
    if (!active) return;
    const raw = (performance.now() - started.current - delay) / 1050;
    const t = Math.max(0, Math.min(1, raw));
    const eased = 1 - (1 - t) ** 3;
    mesh.current.position.set(
      from[0] + (to[0] - from[0]) * eased,
      from[1] + (to[1] - from[1]) * eased + Math.sin(t * Math.PI) * 0.34,
      from[2] + (to[2] - from[2]) * eased,
    );
    if (raw < 1) invalidate();
  });
  return (
    <mesh ref={mesh} position={[...from]}>
      <octahedronGeometry args={[0.17, 0]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      <Edges color={color} />
    </mesh>
  );
}

interface Props {
  step: number;
  votes: [Vote, Vote];
  active: boolean;
  onReady: () => void;
  onUnavailable: () => void;
}

export default function Scene({
  step,
  votes,
  active,
  onReady,
  onUnavailable,
}: Props) {
  return (
    <SceneCanvas
      sceneId="two-phase-prepare"
      onReady={onReady}
      onUnavailable={onUnavailable}
      orthographic
      camera={{ position: [0, 6.5, 12.8], zoom: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={null}
    >
      <Camera onUnavailable={onUnavailable} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[-4, 9, 5]} intensity={2} />
      {participants.map((position, index) => (
        <Line
          key={`route-${index}`}
          points={[coordinatorCenter, centerOf(position)]}
          color="#bcbbb5"
          dashed
          dashSize={0.14}
          gapSize={0.12}
          lineWidth={1.5}
        />
      ))}
      <Node
        position={coordinator}
        label="Coordinator"
        sublabel={
          step === 0
            ? "Ready"
            : step === 1
              ? "Sending"
              : step >= 4
                ? "Votes received"
                : "Waiting votes"
        }
        metadata={
          step >= 4
            ? "2 of 2 received"
            : step === 3
              ? "Responses in transit"
              : "0 of 2 received"
        }
        coordinatorNode
      />
      {participants.map((position, index) => (
        <Node
          key={`participant-${index}`}
          position={position}
          label={`Participant ${index === 0 ? "A" : "B"}`}
          sublabel={step < 2 ? "Waiting" : "Prepared"}
          vote={step >= 2 ? votes[index] : undefined}
        />
      ))}
      {step === 1 &&
        participants.map((position, index) => (
          <Message
            key={`prepare-${index}`}
            from={coordinatorCenter}
            to={centerOf(position)}
            color="#63635e"
            active={active}
            delay={index * 180}
          />
        ))}
      {step === 3 &&
        participants.map((position, index) => (
          <Message
            key={`vote-${index}`}
            from={centerOf(position)}
            to={coordinatorCenter}
            color={voteColor(votes[index])}
            active={active}
            delay={index * 180}
          />
        ))}
    </SceneCanvas>
  );
}
