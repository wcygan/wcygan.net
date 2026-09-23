import { Edges, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import type { JobDescription } from "./job-matching";
import { Label, SceneCamera, type ViewCommand } from "./scene-helpers";

interface Props {
  jobs: (JobDescription & { score: number })[];
  active: boolean;
  reduced: boolean;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}

type Point = [number, number, number];

const RADIUS = 3.1;
const ORIGIN: Point = [0, 0, 0];
const PROFILE: Point = [0, RADIUS, 0];
const POSE: Point = [8, 7.4, 11];
const TARGET: Point = [0, 1.15, 0];
const PROFILE_COLOR = "#a63d13";
const MATCH_COLOR = "#45443e";
const OTHER_COLOR = "#aaa49a";
const VIEW_DIRECTION = new Vector3(...POSE)
  .sub(new Vector3(...TARGET))
  .normalize();
const VIEW_RIGHT = new Vector3()
  .crossVectors(VIEW_DIRECTION, new Vector3(0, 1, 0))
  .normalize();
const VIEW_UP = new Vector3()
  .crossVectors(VIEW_RIGHT, VIEW_DIRECTION)
  .normalize();

// Equal-length job vectors encode cosine similarity as their angle to the
// profile vector. The view is illustrative; the values are sample scores.
function jobPoint(score: number, azimuth: number): Point {
  const angle = Math.acos(Math.max(-1, Math.min(1, score)));
  const radius = RADIUS * Math.sin(angle);
  return [
    radius * Math.cos(azimuth),
    RADIUS * Math.cos(angle),
    radius * Math.sin(azimuth),
  ];
}

function calloutPoint(x: number, y: number): Point {
  return new Vector3(...TARGET)
    .addScaledVector(VIEW_RIGHT, x)
    .addScaledVector(VIEW_UP, y)
    .toArray() as Point;
}

function Scene({ jobs, ...props }: Props) {
  const bestId = jobs.reduce(
    (best, job) => (job.score > best.score ? job : best),
    jobs[0],
  )?.id;
  const azimuths = [
    -Math.PI / 4,
    (3 * Math.PI) / 4,
    (5 * Math.PI) / 4,
    Math.PI / 4,
  ];
  const callouts: Record<string, Point> = {
    "software-engineer": calloutPoint(2.35, 1.55),
    doctor: calloutPoint(-2.35, 0.1),
    pilot: calloutPoint(2.35, 0.05),
    chef: calloutPoint(2.35, -1.5),
  };

  return (
    <>
      <SceneCamera
        view={props.view}
        active={props.active}
        onUnavailable={props.onUnavailable}
        width={8.4}
        height={6.2}
        pose={POSE}
        target={TARGET}
      />
      <ambientLight intensity={1.8} />
      <directionalLight position={[-4, 8, 7]} intensity={2.2} />
      <directionalLight position={[5, -2, -4]} intensity={0.35} />

      {/* The open guide plane gives the radial vectors a shared origin. */}
      {[-2, -1, 1, 2].map((coordinate) => (
        <group key={`guide-${coordinate}`}>
          <Line
            points={[
              [coordinate, 0, -2.6],
              [coordinate, 0, 2.6],
            ]}
            color="#e0ddd6"
            lineWidth={0.65}
            dashed
            dashSize={0.06}
            gapSize={0.08}
          />
          <Line
            points={[
              [-2.6, 0, coordinate],
              [2.6, 0, coordinate],
            ]}
            color="#e0ddd6"
            lineWidth={0.65}
            dashed
            dashSize={0.06}
            gapSize={0.08}
          />
        </group>
      ))}

      <Line points={[ORIGIN, PROFILE]} color={PROFILE_COLOR} lineWidth={2.5} />
      <mesh position={PROFILE}>
        <icosahedronGeometry args={[0.19, 1]} />
        <meshStandardMaterial color={PROFILE_COLOR} roughness={0.55} />
        <Edges color="#772d10" />
      </mesh>
      <Label position={[0, RADIUS + 0.42, 0]} modifier="accent">
        Profile
      </Label>

      {jobs.map((job, index) => {
        const point = jobPoint(job.score, azimuths[index % azimuths.length]);
        const best = job.id === bestId;
        const color = best ? MATCH_COLOR : OTHER_COLOR;
        const label = callouts[job.id];

        return (
          <group key={job.id}>
            <Line
              points={[ORIGIN, point]}
              color={color}
              lineWidth={best ? 2.4 : 1.1}
            />
            <mesh position={point}>
              <sphereGeometry args={[best ? 0.16 : 0.13, 20, 14]} />
              <meshStandardMaterial color={color} roughness={0.5} />
              <Edges color={best ? "#21201c" : "#81796d"} />
            </mesh>
            <Line
              points={[point, label]}
              color={best ? "#81796d" : "#b9b2a6"}
              lineWidth={0.7}
            />
            <Label position={label} modifier="job">
              <span>{job.title}</span>
              <span>
                {job.score.toFixed(2)}
                {best ? " · closest" : ""}
              </span>
            </Label>
          </group>
        );
      })}

      <mesh>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color="#777166" />
      </mesh>
      <Label position={[0.25, -0.25, 0]} modifier="quiet">
        shared origin
      </Label>
    </>
  );
}

export default function JobMatchScene(props: Props) {
  return (
    <SceneCanvas
      sceneId="embeddings:job-matching"
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: POSE, zoom: 42, near: 0.1, far: 100 }}
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      fallback={<span>Compare the similarity scores below.</span>}
    >
      <Scene {...props} />
    </SceneCanvas>
  );
}
