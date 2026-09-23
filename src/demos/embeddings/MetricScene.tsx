import { Edges, Line } from "@react-three/drei";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { metricVectors, rankByMetric, type SimilarityMetric } from "./metrics";
import type { Vector } from "./model";
import {
  Label,
  scalePoint,
  SceneCamera,
  type ViewCommand,
} from "./scene-helpers";

interface Props {
  metric: SimilarityMetric;
  normalized: boolean;
  active: boolean;
  reduced: boolean;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}

const SCALE = 2.8;
const ORIGIN: Vector = [0, 0, 0];
const INK = "#45443f";
const ACCENT = "#ad4c23";
// Look across x and z from above so A's depth doesn't collapse onto the query.
const POSE: Vector = [-9.5, 14, 4.2];
const TARGET: Vector = [2.5, 1, 0];
const QUERY_LABEL: Vector = [1.85, 0.2, -0.6];

function callout(id: string, point: Vector): Vector {
  if (id === "A") return [point[0] + 0.65, point[1] + 0.9, point[2] + 0.25];
  if (id === "B") return [point[0] - 0.2, point[1] - 0.8, point[2] + 0.1];
  return [point[0], point[1] + 0.7, point[2]];
}

function ReferenceAxes() {
  return (
    <>
      {/* An open x/z grid gives the vectors depth without enclosing them. */}
      {[1.4, 2.8, 4.2, 5.6].map((x) => (
        <Line
          key={`grid-x-${x}`}
          points={[
            [x, 0, -2.8],
            [x, 0, 1.4],
          ]}
          color="#d2ccc1"
          lineWidth={0.7}
          dashed
          dashSize={0.055}
          gapSize={0.08}
        />
      ))}
      {[-2.8, -1.4, 1.4].map((z) => (
        <Line
          key={`grid-z-${z}`}
          points={[
            [0, 0, z],
            [5.6, 0, z],
          ]}
          color="#d2ccc1"
          lineWidth={0.7}
          dashed
          dashSize={0.055}
          gapSize={0.08}
        />
      ))}
      {(
        [
          [
            [-0.3, 0, 0],
            [5.8, 0, 0],
          ],
          [
            [0, -1.7, 0],
            [0, 2.8, 0],
          ],
          [
            [0, 0, -2.7],
            [0, 0, 1.8],
          ],
        ] as Vector[][]
      ).map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#aaa294"
          lineWidth={0.9}
          dashed
          dashSize={0.06}
          gapSize={0.07}
        />
      ))}
      <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="#777166" />
      </mesh>
      <Label position={[-0.15, -0.4, 0]} modifier="quiet">
        0
      </Label>
      <Label position={[6.1, 0, 0]} modifier="quiet">
        x
      </Label>
      <Label position={[0, 3.1, 0]} modifier="quiet">
        y
      </Label>
      <Label position={[0, 0, 2.05]} modifier="quiet">
        z
      </Label>
    </>
  );
}

function DirectionAngle({ vector }: { vector: Vector }) {
  const magnitude = Math.hypot(...vector);
  const angle = Math.acos(vector[0] / magnitude);
  const perpendicular = Math.hypot(vector[1], vector[2]);
  const radius = 1.65;
  const arc: Vector[] = Array.from({ length: 33 }, (_, index) => {
    const step = (angle * index) / 32;
    return [
      radius * Math.cos(step),
      (radius * Math.sin(step) * vector[1]) / perpendicular,
      (radius * Math.sin(step) * vector[2]) / perpendicular,
    ];
  });
  return (
    <>
      <Line points={arc} color={ACCENT} lineWidth={2.5} />
      <Label position={[1.15, 0.7, 0.35]} modifier="accent">
        {((angle * 180) / Math.PI).toFixed(1)}°
      </Label>
    </>
  );
}

function Projection({ point, winner }: { point: Vector; winner: boolean }) {
  const foot: Vector = [point[0], 0, 0];
  const perpendicular = Math.hypot(point[1], point[2]);
  const corner: Vector = [
    point[0] - 0.13,
    (point[1] / perpendicular) * 0.13,
    (point[2] / perpendicular) * 0.13,
  ];
  return (
    <>
      <Line
        points={[point, foot]}
        color={winner ? ACCENT : "#b1aa9e"}
        lineWidth={winner ? 1.7 : 1}
        dashed
        dashSize={0.08}
        gapSize={0.06}
      />
      <Line
        points={[
          [point[0] - 0.13, 0, 0],
          corner,
          [point[0], corner[1], corner[2]],
        ]}
        color={winner ? ACCENT : "#b1aa9e"}
        lineWidth={0.85}
      />
      <mesh position={foot}>
        <boxGeometry args={[0.045, 0.17, 0.17]} />
        <meshBasicMaterial color={winner ? ACCENT : "#8b8479"} />
      </mesh>
      {winner && (
        <Line
          points={[ORIGIN, foot]}
          color={ACCENT}
          lineWidth={7}
          transparent
          opacity={0.28}
        />
      )}
    </>
  );
}

function World(props: Props) {
  const { query, documents } = metricVectors(props.normalized);
  const raw = metricVectors(false);
  const winner = rankByMetric(props.metric, props.normalized)[0];
  const queryPoint = scalePoint(query, SCALE);
  const originalC = scalePoint(
    raw.documents.find((document) => document.id === "C")!.vector,
    SCALE,
  );

  return (
    <>
      <SceneCamera
        view={props.view}
        active={props.active}
        onUnavailable={props.onUnavailable}
        width={8.5}
        height={7.8}
        pose={POSE}
        target={TARGET}
      />
      <ambientLight intensity={1.9} />
      <directionalLight position={[-3, 7, 8]} intensity={2.5} />
      <ReferenceAxes />
      {documents.map((document) => {
        const point = scalePoint(document.vector, SCALE);
        const label = callout(document.id, point);
        const chosen = document.id === winner.id;
        const rawPoint = scalePoint(
          raw.documents.find((candidate) => candidate.id === document.id)!
            .vector,
          SCALE,
        );
        return (
          <group key={document.id}>
            <Line
              points={[point, [point[0], 0, point[2]]]}
              color="#b9b1a3"
              lineWidth={0.8}
              dashed
              dashSize={0.055}
              gapSize={0.07}
            />
            <Line
              points={[
                [point[0] - 0.09, 0, point[2]],
                [point[0] + 0.09, 0, point[2]],
              ]}
              color="#b9b1a3"
              lineWidth={0.8}
            />
            <Line
              points={[
                [point[0], 0, point[2] - 0.09],
                [point[0], 0, point[2] + 0.09],
              ]}
              color="#b9b1a3"
              lineWidth={0.8}
            />
            <Line
              points={[ORIGIN, point]}
              color={chosen ? INK : "#a49c8e"}
              lineWidth={chosen ? 2 : 1}
            />
            {props.normalized && (
              <>
                <Line
                  points={[point, rawPoint]}
                  color="#b9b2a6"
                  lineWidth={0.8}
                  dashed
                  dashSize={0.06}
                  gapSize={0.07}
                />
                <mesh position={rawPoint}>
                  <boxGeometry args={[0.14, 0.14, 0.14]} />
                  <meshBasicMaterial color="#b9b2a6" wireframe />
                </mesh>
              </>
            )}
            {props.metric === "distance" && (
              <Line
                points={[queryPoint, point]}
                color={chosen ? ACCENT : "#b9b2a6"}
                lineWidth={chosen ? 3 : 1}
                dashed={!chosen}
                dashSize={0.06}
                gapSize={0.06}
              />
            )}
            {props.metric === "dot" && (
              <Projection point={point} winner={chosen} />
            )}
            <mesh position={point}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial
                color={chosen ? "#555046" : "#aaa295"}
                roughness={0.6}
              />
              <Edges color={chosen ? ACCENT : "#81796d"} lineWidth={1.5} />
            </mesh>
            <Line
              points={[point, label]}
              color={chosen ? "#8a6b56" : "#b9b2a6"}
              lineWidth={0.7}
            />
            <Label position={label} modifier={chosen ? "accent" : ""}>
              {document.id}
              {chosen ? " · winner" : ""}
            </Label>
          </group>
        );
      })}
      <Line points={[ORIGIN, queryPoint]} color="#d07340" lineWidth={2.5} />
      <mesh position={queryPoint} rotation={[0.4, 0.3, 0.2]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#e98043" roughness={0.5} />
        <Edges color={ACCENT} />
      </mesh>
      <Label position={QUERY_LABEL} modifier="accent">
        Query
      </Label>
      <Line
        points={[queryPoint, QUERY_LABEL]}
        color="#c79576"
        lineWidth={0.7}
      />
      {props.metric === "cosine" && <DirectionAngle vector={winner.vector} />}
      {props.normalized && (
        <Label position={callout("C", originalC)} modifier="quiet">
          Original C
        </Label>
      )}
    </>
  );
}

export default function MetricScene(props: Props) {
  return (
    <SceneCanvas
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: POSE, zoom: 42, near: 0.1, far: 100 }}
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      fallback={
        <span>Compare the rankings below, then normalize the vectors.</span>
      }
    >
      <World {...props} />
    </SceneCanvas>
  );
}
