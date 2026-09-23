import { Edges, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  DOCUMENTS,
  QUERIES,
  rankNeighbors,
  type Topic,
  type Vector,
} from "./model";
import {
  Label,
  scalePoint,
  SceneCamera,
  type ViewCommand,
} from "./scene-helpers";

interface Props {
  queryId: string;
  count: number;
  selectedId: string | null;
  active: boolean;
  reduced: boolean;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}

const SCALE = 3;
const POSE: Vector = [8, 5, 11];
const forward = new Vector3(...POSE).normalize();
const right = new Vector3(0, 1, 0).cross(forward).normalize();
const up = forward.clone().cross(right).normalize();
const GROUPS: {
  id: Topic;
  label: string;
  edge: "left" | "right" | "top" | "bottom";
  center: number;
}[] = [
  { id: "pets", label: "Pets", edge: "left", center: 1.3 },
  { id: "drinks", label: "Drinks", edge: "right", center: 0.4 },
  { id: "transport", label: "Transport", edge: "bottom", center: -1.2 },
  { id: "music", label: "Music", edge: "top", center: -0.6 },
  { id: "nature", label: "Nature", edge: "right", center: 1.4 },
  { id: "space", label: "Space", edge: "bottom", center: 1.2 },
];

// Annotations share a plane facing the initial view; their stems retain the
// connection to exact vector positions when readers orbit the scene.
function viewPoint(x: number, y: number): Vector {
  return right
    .clone()
    .multiplyScalar(x)
    .addScaledVector(up, y)
    .toArray() as Vector;
}

function groupLabel(group: (typeof GROUPS)[number]): Vector {
  const documents = DOCUMENTS.filter((document) => document.group === group.id);
  const heights = documents.map((document) =>
    new Vector3(...document.vector).multiplyScalar(SCALE).dot(up),
  );
  const center = documents
    .reduce(
      (sum, document) => sum.add(new Vector3(...document.vector)),
      new Vector3(),
    )
    .multiplyScalar(SCALE / documents.length);
  const labelHeight =
    group.edge === "bottom"
      ? Math.min(...heights) - 0.4
      : Math.max(...heights) + 0.4;
  return center
    .addScaledVector(up, labelHeight - center.dot(up))
    .toArray() as Vector;
}

function World(props: Props) {
  const query = QUERIES.find((item) => item.id === props.queryId) ?? QUERIES[0];
  const ranked = rankNeighbors(query.id, props.count);
  const selected = DOCUMENTS.find((item) => item.id === props.selectedId);
  const queryPoint = scalePoint(query.vector, SCALE);
  const queryLabel = scalePoint(query.vector, SCALE * 0.55);
  const group = GROUPS.find((item) => item.id === ranked[0].group)!;
  const horizontal = group.edge === "top" || group.edge === "bottom";
  const callouts = [...ranked].sort((a, b) => {
    const axis = horizontal ? right : up;
    const difference =
      new Vector3(...a.vector).dot(axis) - new Vector3(...b.vector).dot(axis);
    return horizontal ? difference : -difference;
  });
  const calloutPosition = (id: string): Vector => {
    const slot = callouts.findIndex((item) => item.id === id);
    const offset = (slot - (callouts.length - 1) / 2) * 0.62;
    return horizontal
      ? viewPoint(group.center + offset, group.edge === "top" ? 4 : -4)
      : viewPoint(group.edge === "left" ? -4.2 : 4.2, group.center - offset);
  };
  return (
    <>
      <SceneCamera
        view={props.view}
        active={props.active}
        onUnavailable={props.onUnavailable}
        width={10.2}
        height={9.4}
        pose={POSE}
        horizontalOnly
      />
      <ambientLight intensity={1.9} />
      <directionalLight position={[-4, 6, 8]} intensity={2.4} />
      <directionalLight position={[5, -3, 1]} intensity={0.45} />
      <Line
        points={[
          [-3.5, 0, 0],
          [3.5, 0, 0],
        ]}
        color="#c9c6bb"
        lineWidth={0.7}
        dashed
        dashSize={0.07}
        gapSize={0.07}
      />
      <Line
        points={[
          [0, -3.5, 0],
          [0, 3.5, 0],
        ]}
        color="#c9c6bb"
        lineWidth={0.7}
        dashed
        dashSize={0.07}
        gapSize={0.07}
      />
      <Line
        points={[
          [0, 0, -3.5],
          [0, 0, 3.5],
        ]}
        color="#c9c6bb"
        lineWidth={0.7}
        dashed
        dashSize={0.07}
        gapSize={0.07}
      />
      <mesh>
        <boxGeometry args={[0.07, 0.07, 0.07]} />
        <meshBasicMaterial color="#a6a297" />
      </mesh>
      {(
        [
          { label: "+x", point: [3.8, 0, 0] },
          { label: "−x", point: [-3.8, 0, 0] },
          { label: "+y", point: [0, 3.8, 0] },
          { label: "−y", point: [0, -3.8, 0] },
          { label: "+z", point: [0, 0, 3.8] },
          { label: "−z", point: [0, 0, -3.8] },
        ] as { label: string; point: Vector }[]
      ).map((axis) => (
        <Label key={axis.label} position={axis.point} modifier="quiet">
          {axis.label}
        </Label>
      ))}
      <Line
        points={[[0, 0, 0], queryPoint]}
        color="#c96a3c"
        lineWidth={1}
        dashed
        dashSize={0.1}
        gapSize={0.1}
        transparent
        opacity={0.65}
      />
      {GROUPS.map((group) => (
        <Label key={group.id} position={groupLabel(group)} modifier="quiet">
          {group.label}
        </Label>
      ))}
      {ranked.map((document, index) => (
        <group key={`match-${document.id}`}>
          <Line
            points={[queryPoint, scalePoint(document.vector, SCALE)]}
            color={document.id === props.selectedId ? "#a34416" : "#c98157"}
            lineWidth={index === 0 ? 1.8 : 1}
            transparent
            opacity={0.9 - index * 0.12}
          />
          <Line
            points={[
              scalePoint(document.vector, SCALE),
              calloutPosition(document.id),
            ]}
            color={document.id === props.selectedId ? "#6d6254" : "#b1aa9e"}
            lineWidth={0.7}
          />
          <Label position={calloutPosition(document.id)} modifier="rank">
            {index + 1}
          </Label>
        </group>
      ))}
      {DOCUMENTS.map((document) => {
        const index = ranked.findIndex((item) => item.id === document.id);
        const chosen = document.id === props.selectedId;
        const point = scalePoint(document.vector, SCALE);
        const size = chosen ? 0.22 : index >= 0 ? 0.18 : 0.12;
        return (
          <group key={document.id} position={point}>
            <mesh>
              <boxGeometry args={[size, size, size]} />
              <meshStandardMaterial
                color={index >= 0 ? "#3d3b35" : "#a8a397"}
                roughness={0.55}
                metalness={0.1}
              />
              {chosen && <Edges color="#a34416" lineWidth={1.5} />}
            </mesh>
          </group>
        );
      })}
      {selected && (
        <Line
          points={[[0, 0, 0], scalePoint(selected.vector, SCALE)]}
          color="#868177"
          lineWidth={0.9}
          dashed
          dashSize={0.1}
          gapSize={0.07}
        />
      )}
      <mesh position={queryPoint} rotation={[0.4, 0.3, 0.2]}>
        <octahedronGeometry args={[0.115, 0]} />
        <meshStandardMaterial color="#e98043" roughness={0.5} metalness={0.1} />
        <Edges color="#a74b1d" />
      </mesh>
      <Line points={[queryPoint, queryLabel]} color="#b86438" lineWidth={0.8} />
      <Label position={queryLabel} modifier="accent">
        Query
      </Label>
    </>
  );
}

export default function SpaceScene(props: Props) {
  return (
    <SceneCanvas
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: POSE, zoom: 42, near: 0.1, far: 100 }}
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      fallback={<span>Follow the nearest phrases below.</span>}
    >
      <World {...props} />
    </SceneCanvas>
  );
}
