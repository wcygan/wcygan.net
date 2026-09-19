import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  DATABASE_COLORS,
  LOG_ENTRY_OUTLINE,
} from "~/demos/shared/replication-palette";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Line, OrbitControls } from "@react-three/drei";
import { CylinderGeometry, Mesh, OrthographicCamera } from "three";
import { databaseLogSnapshot, LOG_RECORDS, type LogRecord } from "./model";

import { DatabaseSideLabel, LogSideLabels } from "~/demos/shared/EtchedLabel";
import { SceneLabel } from "./SceneLabel";

type Point = [number, number, number];

interface SceneProps {
  step: number;
  reduced: boolean;
  active: boolean;
  speed: number;
  top: boolean;
  highlightedId: number | null;
  missingId: number | null;
  onReady: () => void;
  onUnavailable: () => void;
}

const DATABASE_POSITION: Point = [-3.2, -0.375, 0];
const LOG_POSITION: Point = [1.15, -0.75, 0];
const LOG_SIZE: Point = [5.25, 0.8, 1.25];
const ENTRY_WIDTH = 0.58;
const ENTRY_HEIGHT = 0.52;
const ENTRY_DEPTH = 0.72;
// Keep the entries flush with the log's top surface while lifting them just
// enough that their lower outline is not swallowed by the log geometry.
const ENTRY_SURFACE_LIFT = 0.02;
const SLOT_GAP =
  (LOG_SIZE[0] - LOG_RECORDS.length * ENTRY_WIDTH) / (LOG_RECORDS.length + 1);
const SLOT_SPACING = ENTRY_WIDTH + SLOT_GAP;
const SLOT_START =
  LOG_POSITION[0] - LOG_SIZE[0] / 2 + SLOT_GAP + ENTRY_WIDTH / 2;
const DATABASE_RUNG_LEVELS = [-0.76, -0.26, 0.26, 0.76];
const DATABASE_ENTRY_Y = DATABASE_POSITION[1] + 1.15;

function entryPosition(index: number): Point {
  const logTop = LOG_POSITION[1] + LOG_SIZE[1] / 2;
  const entryCenterY = logTop + ENTRY_SURFACE_LIFT + ENTRY_HEIGHT / 2;
  return [SLOT_START + index * SLOT_SPACING, entryCenterY, 0];
}

function Camera({ top }: { top: boolean }) {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    camera.position.set(top ? 0 : 3.6, top ? 10 : 6.8, top ? 0.01 : 9.2);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, top, invalidate]);

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(size.width / 9.5, size.height / 4.7);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);

  return (
    <OrbitControls
      key={String(top)}
      enablePan={false}
      enableZoom
      enableDamping={false}
      enableRotate
    />
  );
}

function DatabaseCylinder() {
  const geometry = useMemo(() => new CylinderGeometry(0.9, 0.9, 1.55, 40), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group position={DATABASE_POSITION}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={DATABASE_COLORS.primary.fill}
          roughness={0.86}
        />
        <Edges color={DATABASE_COLORS.primary.outline} threshold={15} />
      </mesh>
      {DATABASE_RUNG_LEVELS.map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.84, 0.085, 12, 48]} />
          <meshStandardMaterial
            color={DATABASE_COLORS.primary.outline}
            roughness={0.78}
          />
        </mesh>
      ))}
      <DatabaseSideLabel>Database</DatabaseSideLabel>
    </group>
  );
}

function LogBase() {
  return (
    <group>
      <mesh position={LOG_POSITION}>
        <boxGeometry args={LOG_SIZE} />
        <meshStandardMaterial color="#e4e1d8" roughness={1} />
        <Edges color="#8f8c83" threshold={15} />
      </mesh>
      {LOG_RECORDS.map((_, index) => {
        const x = SLOT_START - SLOT_SPACING / 2 + index * SLOT_SPACING;
        return (
          <Line
            key={index}
            points={[
              [x, -1.13, -0.64],
              [x, -1.13, 0.64],
            ]}
            color="#bcb9af"
            lineWidth={0.7}
          />
        );
      })}
      <group position={LOG_POSITION}>
        <LogSideLabels>Append Only Log</LogSideLabels>
      </group>
    </group>
  );
}

function AppendedEntry({
  record,
  index,
  visible,
  highlighted,
}: {
  record: LogRecord;
  index: number;
  visible: boolean;
  highlighted: boolean;
}) {
  return (
    <group visible={visible}>
      <mesh position={entryPosition(index)}>
        <boxGeometry args={[ENTRY_WIDTH, ENTRY_HEIGHT, ENTRY_DEPTH]} />
        <meshStandardMaterial
          color={record.color}
          roughness={0.9}
          emissive={highlighted ? "#fff2a8" : "#000000"}
          emissiveIntensity={highlighted ? 0.8 : 0}
        />
        <Edges color={highlighted ? "#b88900" : LOG_ENTRY_OUTLINE} />
      </mesh>
      <SceneLabel
        position={[
          entryPosition(index)[0],
          entryPosition(index)[1] + ENTRY_HEIGHT / 2 + 0.008,
          entryPosition(index)[2],
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color={LOG_ENTRY_OUTLINE}
      >
        {record.id}
      </SceneLabel>
    </group>
  );
}

function Packet({
  record,
  index,
  reduced,
  active,
  speed,
}: {
  record: LogRecord;
  index: number;
  reduced: boolean;
  active: boolean;
  speed: number;
}) {
  const mesh = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  const target = entryPosition(index);

  useEffect(() => {
    invalidate();
  }, [active, reduced, invalidate]);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (active) elapsed.current += Math.min(delta, 0.05) * speed;
    const t = reduced ? 1 : Math.min(1, elapsed.current / 0.85);
    const eased = t * t * (3 - 2 * t);
    mesh.current.position.set(
      DATABASE_POSITION[0] + (target[0] - DATABASE_POSITION[0]) * eased,
      DATABASE_ENTRY_Y +
        (target[1] - DATABASE_ENTRY_Y) * eased +
        Math.sin(Math.PI * t) * 0.5,
      target[2] * eased,
    );
    if (active && t < 1) invalidate();
  });

  return (
    <mesh ref={mesh} position={[DATABASE_POSITION[0], DATABASE_ENTRY_Y, 0]}>
      <boxGeometry args={[ENTRY_WIDTH, ENTRY_HEIGHT, ENTRY_DEPTH]} />
      <meshStandardMaterial color={record.color} roughness={0.9} />
      <Edges color={LOG_ENTRY_OUTLINE} />
    </mesh>
  );
}

function MissingNotice({ id, active }: { id: number; active: boolean }) {
  const marker = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useFrame((_, delta) => {
    if (!marker.current) return;
    if (active) elapsed.current += delta;
    marker.current.scale.setScalar(1 + Math.sin(elapsed.current * 10) * 0.1);
    if (active) invalidate();
  });

  return (
    <group position={[DATABASE_POSITION[0], 1.45, 0]}>
      <mesh ref={marker}>
        <sphereGeometry args={[0.12, 20, 12]} />
        <meshStandardMaterial
          color="#b45d62"
          emissive="#b45d62"
          emissiveIntensity={0.7}
        />
      </mesh>
      <SceneLabel position={[0, 0.28, 0]} fontSize={0.2} color="#b45d62">
        {`Element ${id} Not Found`}
      </SceneLabel>
    </group>
  );
}

function World({
  step,
  reduced,
  active,
  speed,
  top,
  highlightedId,
  missingId,
}: SceneProps) {
  const state = databaseLogSnapshot(step);

  return (
    <>
      <Camera top={top} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-3, 8, 5]} intensity={2} />
      <DatabaseCylinder />
      <LogBase />
      <Line
        points={[
          [DATABASE_POSITION[0] + 0.9, LOG_POSITION[1], LOG_POSITION[2]],
          [LOG_POSITION[0] - LOG_SIZE[0] / 2, LOG_POSITION[1], LOG_POSITION[2]],
        ]}
        color="#8f8c83"
        lineWidth={1.2}
        dashed
        dashSize={0.12}
        gapSize={0.09}
      />
      {state.appended.map((record, index) => (
        <AppendedEntry
          key={record.id}
          record={record}
          index={index}
          visible={index < state.appended.length}
          highlighted={record.id === highlightedId}
        />
      ))}
      {state.writing && state.current ? (
        <Packet
          key={`${state.current.id}-${state.tick}`}
          record={state.current}
          index={state.current.id - 1}
          reduced={reduced}
          active={active}
          speed={speed}
        />
      ) : null}
      {missingId !== null ? (
        <MissingNotice id={missingId} active={active && !reduced} />
      ) : null}
    </>
  );
}

export default function DatabaseLogScene(props: SceneProps) {
  return (
    <SceneCanvas
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: [3.6, 6.8, 9.2], zoom: 45, near: 0.1, far: 100 }}
      // Supersample small surface labels; cap high-density screens at 3×.
      dpr={[2, 3]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={
        <div className="database-log-scene-fallback">
          3D is unavailable. Follow each write into the ordered log below.
        </div>
      }
    >
      <World {...props} />
    </SceneCanvas>
  );
}
