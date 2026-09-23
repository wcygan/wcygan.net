import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import {
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  OrthographicCamera,
} from "three";
import {
  type KafkaRecord,
  KEY_COLORS,
  partitionSnapshot,
  type RoutingMode,
} from "./model";

type Point = [number, number, number];
interface Props {
  onReady: () => void;
  onUnavailable: () => void;
  mode: RoutingMode;
  partitions: number;
  step: number;
  reduced: boolean;
  active: boolean;
  speed: number;
  top: boolean;
}
const laneZ = (partition: number, partitions: number) =>
  (partition - (partitions - 1) / 2) * 2;
const destination = (
  record: KafkaRecord,
  partitions: number,
  spacing: number,
): Point => [
  -1.01 + spacing / 2 + record.offset * spacing,
  0.38,
  laneZ(record.partition, partitions),
];

function Block({
  position,
  size,
  color,
}: {
  position: Point;
  size: Point;
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
      <Edges color="#56554e" threshold={15} />
    </mesh>
  );
}
function Producer() {
  const geometry = useMemo(() => {
    const box = new BoxGeometry(1.25, 1.45, 1.25, 24, 12, 12);
    const palette = ["#df6d65", "#e4ae59", "#76a978", "#519ba6", "#777ac4"].map(
      (hex) => new Color(hex),
    );
    const positions = box.getAttribute("position");
    const colors: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const t =
        (positions.getX(i) / 1.25 + 0.5) * 0.7 +
        (positions.getY(i) / 1.45 + 0.5) * 0.3;
      const stop = Math.max(0, Math.min(1, t)) * (palette.length - 1);
      const index = Math.min(palette.length - 2, Math.floor(stop));
      const color = palette[index]
        .clone()
        .lerp(palette[index + 1], stop - index);
      colors.push(color.r, color.g, color.b);
    }
    box.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return box;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh position={[-4, 0.455, 0]} geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={1} />
      <Edges color="#56554e" threshold={15} />
    </mesh>
  );
}

function logTint(mode: RoutingMode, partition: number, records: KafkaRecord[]) {
  // Round-robin can send any key to every lane. Keyed routing uses each
  // reachable key once, rather than weighting the tint by sample frequency.
  const keys =
    mode === "round-robin"
      ? KEY_COLORS.map((_, index) => index)
      : [
          ...new Set(
            records
              .filter((r) => r.partition === partition)
              .map((r) => r.keyIndex),
          ),
        ];
  const average = keys.length
    ? keys
        .reduce(
          (sum, key) => sum.add(new Color(KEY_COLORS[key])),
          new Color(0, 0, 0),
        )
        .multiplyScalar(1 / keys.length)
    : new Color("#aaa69b");
  // Empty lanes stay neutral; differing lightness identifies lanes whose
  // reachable colors have the same average.
  return `#${average
    .lerp(new Color("#ffffff"), 0.14 + partition * 0.035)
    .getHexString()}`;
}
function Label({
  position,
  children,
  plain = false,
}: {
  position: Point;
  children: React.ReactNode;
  plain?: boolean;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[1, 0]}
      className={`kafka-scene-label${plain ? " kafka-scene-label-plain" : ""}`}
    >
      {children}
    </Html>
  );
}
function Camera({ top, partitions }: { top: boolean; partitions: number }) {
  const { camera, size, invalidate } = useThree();
  // Only an explicit view change should replace the reader's orbit angle.
  useEffect(() => {
    camera.position.set(top ? 0 : 3, top ? 12 : 8, top ? 0.01 : 10);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, top, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(
      size.width / 10.5,
      size.height / (Math.max(3, partitions) * 2 + (top ? 1.5 : 0.3)),
    );
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, top, partitions, invalidate]);
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
function Packet({
  record,
  partitions,
  spacing,
  reduced,
  active,
  speed,
}: {
  record: KafkaRecord;
  partitions: number;
  spacing: number;
  reduced: boolean;
  active: boolean;
  speed: number;
}) {
  const mesh = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  const end = destination(record, partitions, spacing);
  useEffect(() => {
    invalidate();
  }, [active, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (active) elapsed.current += Math.min(delta, 0.05) * speed;
    const t = reduced ? 1 : Math.min(1, elapsed.current / 0.85);
    const eased = t * t * (3 - 2 * t);
    mesh.current.position.set(
      -4 + (end[0] + 4) * eased,
      1.5 + (end[1] - 1.5) * eased + Math.sin(Math.PI * t) * 0.5,
      end[2] * eased,
    );
    if (active && t < 1) invalidate();
  });
  return (
    <mesh ref={mesh} position={[-4, 1.5, 0]}>
      <boxGeometry args={[Math.min(0.55, spacing * 0.76), 0.55, 0.66]} />
      <meshStandardMaterial color={KEY_COLORS[record.keyIndex]} />
      <Edges color="#393833" />
    </mesh>
  );
}
function World({ mode, partitions, step, reduced, active, top, speed }: Props) {
  const state = partitionSnapshot(mode, step, partitions);
  const lanes = Array.from({ length: partitions }, (_, p) => p);
  const capacity = Math.max(
    6,
    ...lanes.map((p) => state.records.filter((r) => r.partition === p).length),
  );
  const spacing = 4.32 / capacity;
  return (
    <>
      <Camera top={top} partitions={partitions} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-3, 8, 5]} intensity={2} />
      <Producer />
      <Label position={[-4, 1.85, 0]} plain>
        Producer
      </Label>
      <Label position={[1.1, 1.1, -partitions - 0.35]} plain>
        orders.events
      </Label>
      {lanes.map((p) => (
        <group key={p}>
          <Line
            points={[
              [-3.35, 0.12, 0],
              [-2.65, 0.12, 0],
              [-2.65, 0.12, laneZ(p, partitions)],
              [-1.3, 0.12, laneZ(p, partitions)],
            ]}
            color={
              state.routing && state.current?.partition === p
                ? "#56554e"
                : "#c8c5bb"
            }
            lineWidth={1}
            dashed
            dashSize={0.12}
            gapSize={0.09}
          />
          <Block
            position={[1.2, -0.32, laneZ(p, partitions)]}
            size={[5.1, 0.8, 1]}
            color={logTint(mode, p, state.records)}
          />
          <Label position={[-1.65, 0.15, laneZ(p, partitions)]} plain>
            P{p}
          </Label>
          {Array.from({ length: capacity }, (_, offset) => (
            <Line
              key={offset}
              points={[
                [-1.01 + offset * spacing, 0.09, laneZ(p, partitions) - 0.45],
                [-1.01 + offset * spacing, 0.09, laneZ(p, partitions) + 0.45],
              ]}
              color="#bcb9af"
              lineWidth={0.6}
            />
          ))}
        </group>
      ))}
      {state.appended.map((record) => (
        <group key={record.id}>
          <Block
            position={destination(record, partitions, spacing)}
            size={[Math.min(0.55, spacing * 0.76), 0.55, 0.66]}
            color={KEY_COLORS[record.keyIndex]}
          />
          <Label
            position={[
              destination(record, partitions, spacing)[0],
              0.88,
              laneZ(record.partition, partitions),
            ]}
          >
            {record.id}
          </Label>
        </group>
      ))}
      {state.routing && state.current && (
        <Packet
          key={`${mode}-${step}`}
          record={state.current}
          partitions={partitions}
          spacing={spacing}
          reduced={reduced}
          active={active}
          speed={speed}
        />
      )}
      <Label position={[1.1, 0, partitions + 0.05]} plain>
        offset →
      </Label>
    </>
  );
}
export default function KafkaScene(props: Props) {
  return (
    <SceneCanvas
      sceneId="kafka-partitioning"
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: [0, 8, 10], zoom: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={
        <div className="kafka-scene-fallback">
          3D is unavailable. Follow record routing in the status below.
        </div>
      }
    >
      <World {...props} />
    </SceneCanvas>
  );
}
