import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  DATABASE_COLORS,
  LOG_ENTRY_OUTLINE,
} from "~/demos/shared/replication-palette";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Mesh, OrthographicCamera, Vector3 } from "three";
import { LOG_RECORDS, PHASE_DURATION } from "./model";
import type { ReplicationPlayback } from "./playback";
import type { Flight } from "./model";

import {
  DatabaseCylinderGeometry,
  LogTrayGeometry,
} from "~/demos/shared/DatabaseLogGeometry";

type Point = [number, number, number];
interface SceneProps {
  state: ReturnType<ReplicationPlayback["getSnapshot"]>;
  playback: ReplicationPlayback;
  active: boolean;
  top: boolean;
  readOffset: number | null;
  onReady: () => void;
  onUnavailable: () => void;
}

// Preserve the cylinder, log, and record proportions of DatabaseLogDemo.
const PRIMARY_Z = -3;
const REPLICA_Z = 3;
const DATABASE_X = -3.2;
const LOG_X = 1.15;
const LOG_Y = -0.75;
const LOG_SIZE: Point = [5.25, 0.8, 1.25];
const ENTRY_SIZE: Point = [0.58, 0.52, 0.72];
const SLOT_GAP =
  (LOG_SIZE[0] - LOG_RECORDS.length * ENTRY_SIZE[0]) / (LOG_RECORDS.length + 1);
const SLOT_START = LOG_X - LOG_SIZE[0] / 2 + SLOT_GAP + ENTRY_SIZE[0] / 2;
const PIPE_X = 4.55;
const PIPELINE: Point[] = [
  [LOG_X + LOG_SIZE[0] / 2, 0.1, PRIMARY_Z],
  [PIPE_X, 0.1, PRIMARY_Z],
  [PIPE_X, 0.1, REPLICA_Z],
  [LOG_X + LOG_SIZE[0] / 2, 0.1, REPLICA_Z],
];

function entryPosition(index: number, z: number): Point {
  return [
    SLOT_START + index * (ENTRY_SIZE[0] + SLOT_GAP),
    LOG_Y + LOG_SIZE[1] / 2 + 0.02 + ENTRY_SIZE[1] / 2,
    z,
  ];
}

function Camera({
  top,
  onUnavailable,
}: Pick<SceneProps, "top" | "onUnavailable">) {
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
    camera.position.set(top ? 0 : 1.8, top ? 12 : 8.5, top ? 0.01 : 10);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, top, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(size.width / 10.7, size.height / 10.5);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return (
    <OrbitControls key={String(top)} enablePan={false} enableDamping={false} />
  );
}

function DatabaseCylinder({
  name,
  z,
  applied,
  top,
  color,
  edgeColor,
}: {
  name: string;
  z: number;
  applied: number;
  top: boolean;
  color: string;
  edgeColor: string;
}) {
  return (
    <group position={[DATABASE_X, -0.375, z]}>
      <DatabaseCylinderGeometry
        name={name}
        color={color}
        edgeColor={edgeColor}
      />
      <Html
        center
        position={[0, 1.65, top ? -1.6 : -0.95]}
        className="database-log-replication-label"
      >
        <span>
          {name === "Primary" ? "Reads + writes" : `${applied} applied`}
        </span>
      </Html>
    </group>
  );
}

function NodeLog({
  z,
  count,
  highlightedIds,
  label,
}: {
  z: number;
  count: number;
  highlightedIds: number[];
  label: string;
}) {
  return (
    <group>
      <group position={[LOG_X, LOG_Y, z]}>
        <LogTrayGeometry label={label} />
      </group>
      <Line
        points={[
          [DATABASE_X + 0.9, LOG_Y, z],
          [LOG_X - LOG_SIZE[0] / 2, LOG_Y, z],
        ]}
        color="#8f8c83"
        lineWidth={1.2}
        dashed
        dashSize={0.12}
        gapSize={0.09}
      />
      {LOG_RECORDS.map((record, index) => {
        const position = entryPosition(index, z);
        const highlighted = highlightedIds.includes(record.id);
        return index < count ? (
          <group key={record.id}>
            <mesh position={position}>
              <boxGeometry args={ENTRY_SIZE} />
              <meshStandardMaterial
                color={record.color}
                roughness={0.9}
                emissive={highlighted ? "#fff2a8" : "#000000"}
                emissiveIntensity={highlighted ? 0.8 : 0}
              />
              <Edges color={highlighted ? "#b88900" : LOG_ENTRY_OUTLINE} />
            </mesh>
            <Html
              center
              position={[
                position[0],
                position[1] + ENTRY_SIZE[1] / 2 + 0.05,
                z,
              ]}
              className="database-log-replication-entry"
            >
              {record.id}
            </Html>
          </group>
        ) : null;
      })}
      <Html
        center
        position={[LOG_X, 0.65, z - 0.95]}
        className="database-log-replication-label"
      >
        <span>
          {count} {count === 1 ? "entry" : "entries"}
        </span>
      </Html>
    </group>
  );
}

function Packet({
  flight,
  playback,
  active,
}: {
  flight: Flight;
  playback: ReplicationPlayback;
  active: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const invalidate = useThree((value) => value.invalidate);
  const route = useMemo(() => {
    const index = flight.record.id - 1;
    const primary = entryPosition(index, PRIMARY_Z);
    const replica = entryPosition(index, REPLICA_Z);
    const points: Point[] =
      flight.phase === "writing"
        ? [[DATABASE_X, 0.85, PRIMARY_Z], primary]
        : flight.phase === "replicating"
          ? [primary, ...PIPELINE, replica]
          : [replica, [DATABASE_X, 0.85, REPLICA_Z]];
    const vectors = points.map((point) => new Vector3(...point));
    const distances = vectors
      .slice(1)
      .map((point, index) => point.distanceTo(vectors[index]));
    return {
      vectors,
      distances,
      length: distances.reduce((sum, distance) => sum + distance, 0),
    };
  }, [flight.record, flight.phase]);
  useEffect(() => {
    invalidate();
  }, [active, invalidate]);
  useFrame(() => {
    if (!mesh.current) return;
    const t = Math.max(
      0,
      Math.min(
        1,
        (playback.getTime() - flight.phaseStarted) /
          PHASE_DURATION[flight.phase],
      ),
    );
    let distance = t * route.length;
    for (let index = 0; index < route.distances.length; index++) {
      const length = route.distances[index];
      if (distance <= length || index === route.distances.length - 1) {
        mesh.current.position.lerpVectors(
          route.vectors[index],
          route.vectors[index + 1],
          Math.min(1, distance / length),
        );
        break;
      }
      distance -= length;
    }
    if (flight.phase !== "replicating") {
      mesh.current.position.y += Math.sin(Math.PI * t) * 0.5;
    }
    if (active && t < 1) invalidate();
  });
  return (
    <mesh
      ref={mesh}
      position={route.vectors[0]}
      scale={flight.phase === "applying" ? 0.65 : 1}
    >
      <boxGeometry args={ENTRY_SIZE} />
      <meshStandardMaterial color={flight.record.color} roughness={0.9} />
      <Edges color={LOG_ENTRY_OUTLINE} />
    </mesh>
  );
}

function World({
  state,
  playback,
  active,
  top,
  readOffset,
  onUnavailable,
}: SceneProps) {
  const sending = state.flights.filter(
    (flight) => flight.phase === "replicating",
  );
  return (
    <>
      <Camera top={top} onUnavailable={onUnavailable} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-3, 8, 5]} intensity={2} />
      <DatabaseCylinder
        name="Primary"
        color={DATABASE_COLORS.primary.fill}
        edgeColor={DATABASE_COLORS.primary.outline}
        top={top}
        z={PRIMARY_Z}
        applied={state.primary.length}
      />
      <NodeLog
        z={PRIMARY_Z}
        count={state.primary.length}
        highlightedIds={readOffset === null ? [] : [readOffset + 1]}
        label="Primary Log"
      />
      <DatabaseCylinder
        name="Replica"
        color={DATABASE_COLORS.replica.fill}
        edgeColor={DATABASE_COLORS.replica.outline}
        top={top}
        z={REPLICA_Z}
        applied={state.applied.length}
      />
      <NodeLog
        z={REPLICA_Z}
        count={state.replica.length}
        highlightedIds={[]}
        label="Replica Log"
      />
      <Line
        points={PIPELINE}
        color={sending.length ? "#21201c" : "#8f8c83"}
        lineWidth={1.5}
        dashed
        dashSize={0.12}
        gapSize={0.09}
      />
      <Html
        center
        position={[1.4, 0.1, 0]}
        className="database-log-replication-label"
      >
        <strong>Replication ↓</strong>
        <span>
          {sending.length
            ? `Sending ${
                sending.length === 1
                  ? `entry ${sending[0].record.id}`
                  : `${sending.length} entries`
              }`
            : "Copy entries in order"}
        </span>
      </Html>
      {state.flights.map((flight) => (
        <Packet
          key={`${flight.record.id}-${flight.phase}`}
          flight={flight}
          playback={playback}
          active={active}
        />
      ))}
    </>
  );
}

export default function DatabaseLogReplicationScene(props: SceneProps) {
  return (
    <SceneCanvas
      sceneId="database-log-replication"
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: [1.8, 8.5, 10], zoom: 45, near: 0.1, far: 100 }}
      // Supersample small surface labels; cap high-density screens at 3×.
      dpr={[2, 3]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={
        <p className="database-log-scene-fallback">
          Primary log → replica log. Follow replication below.
        </p>
      }
    >
      <World {...props} />
    </SceneCanvas>
  );
}
