import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Group, OrthographicCamera, Spherical, Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  type CameraCommand,
  type IntroSceneState,
  keyRoutingSnapshot,
  replicationSnapshot,
  lagSnapshot,
  skewSnapshot,
  placementSnapshot,
  RETAINED_OFFSETS,
} from "./spatial-model";
import { KAFKA_COLORS as C, PARTITION_COLORS } from "./palette";
type Point = [number, number, number];
interface Props {
  state: IntroSceneState;
  cameraCommand: CameraCommand;
  onReady: () => void;
  onUnavailable: () => void;
}
const DEFAULT_POSE: Point = [4, 9, 10];
const CAMERA_OPTIONS = {
  position: DEFAULT_POSE,
  zoom: 40,
  near: 0.1,
  far: 100,
};

const MotionContext = createContext(false);

function MotionBoundary({ children }: { children: ReactNode }) {
  const { gl } = useThree();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bounds = canvas.getBoundingClientRect();
    let inView = bounds.bottom > 0 && bounds.top < window.innerHeight;
    const sync = () =>
      setEnabled(inView && !document.hidden && !reduced.matches);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        sync();
      },
      { threshold: [0, 0.15] },
    );
    observer.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [gl]);

  return (
    <MotionContext.Provider value={enabled}>{children}</MotionContext.Provider>
  );
}

// A single transform keeps a moving mesh, label, and its connectors aligned.
// Only unsettled transitions request another frame; the resting scene is idle.
function AnimatedGroup({
  position,
  enter = false,
  children,
}: {
  position: Point;
  enter?: boolean;
  children: ReactNode;
}) {
  const enabled = useContext(MotionContext);
  const { invalidate } = useThree();
  const group = useRef<Group>(null);
  const target = useRef(new Vector3(...position));
  const initial = useRef<Point>([
    position[0],
    position[1] + (enter && enabled ? 0.8 : 0),
    position[2],
  ]);
  const moving = useRef(false);
  const [x, y, z] = position;

  useLayoutEffect(() => {
    target.current.set(x, y, z);
    if (!group.current) return;
    if (!enabled) {
      group.current.position.copy(target.current);
      moving.current = false;
    } else {
      moving.current =
        group.current.position.distanceToSquared(target.current) > 0;
    }
    invalidate();
  }, [enabled, invalidate, x, y, z]);

  useFrame((_, delta) => {
    if (!moving.current || !group.current) return;
    if (!enabled) {
      group.current.position.copy(target.current);
      moving.current = false;
      return;
    }
    group.current.position.lerp(
      target.current,
      1 - Math.exp(-9 * Math.min(delta, 0.05)),
    );
    if (group.current.position.distanceToSquared(target.current) < 0.000016) {
      group.current.position.copy(target.current);
      moving.current = false;
      return;
    }
    invalidate();
  });

  return (
    <group ref={group} position={initial.current}>
      {children}
    </group>
  );
}

function Block({
  position,
  size,
  color = C.panel,
  offline = false,
}: {
  position: Point;
  size: Point;
  color?: string;
  offline?: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        metalness={0}
        transparent={offline}
        opacity={offline ? 0.28 : 1}
      />
      <Edges
        color={offline ? C.red : color === C.panel ? C.connector : C.text}
        threshold={15}
      />
    </mesh>
  );
}
function Label({
  position,
  children,
  compact = false,
  above = false,
  tone,
}: {
  position: Point;
  children: ReactNode;
  compact?: boolean;
  above?: boolean;
  tone?: string;
}) {
  return (
    <Html position={position} center zIndexRange={[1, 0]}>
      <span
        data-tone={tone}
        className={`kafka-intro-scene-label${compact ? " kafka-intro-scene-label-compact" : ""}${above ? " kafka-intro-scene-label-above" : ""}`}
      >
        {children}
      </span>
    </Html>
  );
}
function Wire({
  from,
  to,
  color = C.connector,
}: {
  from: Point;
  to: Point;
  color?: string;
}) {
  return (
    <Line
      points={[from, to]}
      color={color}
      lineWidth={1.4}
      dashed
      dashSize={0.12}
      gapSize={0.09}
    />
  );
}
function Camera({
  kind,
  command,
  onUnavailable,
}: {
  kind: IntroSceneState["kind"];
  command: CameraCommand;
  onUnavailable: () => void;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const previousFit = useRef<number | null>(null);
  const fittedZoom = useRef(40);
  const lastCommand = useRef(command.revision);
  // Reserve space for labels and the geometry's full rotation envelope.
  const worldWidth = 12;
  const worldHeight = 12;
  const fit = Math.min(size.width / worldWidth, size.height / worldHeight);

  useEffect(() => {
    const failed = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", failed);
    return () => gl.domElement.removeEventListener("webglcontextlost", failed);
  }, [gl, onUnavailable]);

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    const ratio = previousFit.current ? ortho.zoom / previousFit.current : 1;
    fittedZoom.current = fit;
    previousFit.current = fit;
    ortho.zoom = fit * ratio;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fit, invalidate]);

  useEffect(() => {
    if (command.revision === lastCommand.current) return;
    lastCommand.current = command.revision;
    const ortho = camera as OrthographicCamera;
    if (command.action === "reset") {
      camera.position.set(...DEFAULT_POSE);
      camera.lookAt(0, 0, 0);
      ortho.zoom = fittedZoom.current;
    } else if (command.action === "in" || command.action === "out") {
      ortho.zoom = Math.max(
        fittedZoom.current * 0.65,
        Math.min(
          fittedZoom.current * 2.4,
          ortho.zoom * (command.action === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const spherical = new Spherical().setFromVector3(camera.position);
      if (command.action === "left") spherical.theta -= Math.PI / 8;
      if (command.action === "right") spherical.theta += Math.PI / 8;
      if (command.action === "up") spherical.phi -= Math.PI / 12;
      if (command.action === "down") spherical.phi += Math.PI / 12;
      spherical.phi = Math.max(0.14, Math.min(Math.PI * 0.92, spherical.phi));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    }
    ortho.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [camera, command, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping={false}
      minPolarAngle={0.14}
      maxPolarAngle={Math.PI * 0.92}
      minZoom={fit * 0.65}
      maxZoom={fit * 2.4}
    />
  );
}

const logX = (offset: number, count: number) =>
  (offset - (count - 1) / 2) * 1.05;
function Tape({
  count,
  colors,
  capacity = count,
}: {
  count: number;
  colors?: readonly string[];
  capacity?: number;
}) {
  return (
    <>
      <Block position={[0, 0, 0]} size={[capacity * 1.05 + 0.35, 0.18, 1.1]} />
      {Array.from({ length: count }, (_, offset) => (
        <AnimatedGroup
          key={offset}
          position={[logX(offset, capacity), 0, 0]}
          enter
        >
          <Block
            position={[0, 0.48, 0]}
            size={[0.82, 0.8, 0.82]}
            color={colors?.[offset] ?? C.blue}
          />
          <Label position={[0, 1.02, 0]} compact>
            {offset}
          </Label>
        </AnimatedGroup>
      ))}
    </>
  );
}
function RetainedLog({
  state,
}: {
  state: Extract<IntroSceneState, { kind: "retained" }>;
}) {
  return (
    <>
      <Tape count={6} />
      <Label position={[-3.3, 0.5, 0]}>P0</Label>
      {(["billing", "analytics"] as const).map((reader, index) => {
        const x = logX(state.readers[reader], 6),
          z = index === 0 ? 1.75 : -1.75,
          color = index === 0 ? C.accent : C.green;
        return (
          <AnimatedGroup key={reader} position={[x, 0, 0]}>
            <Wire
              from={[0, 0.12, z - Math.sign(z) * 0.28]}
              to={[0, 0.12, Math.sign(z) * 0.55]}
              color={color}
            />
            <mesh position={[0, 0.3, z]}>
              <cylinderGeometry args={[0.23, 0.23, 0.45, 12]} />
              <meshStandardMaterial color={color} />
              <Edges color={C.text} />
            </mesh>
            <Label
              position={[0, 0.6, z]}
              above
              tone={index === 0 ? "accent" : "green"}
            >
              {reader === "billing" ? "BILLING" : "ANALYTICS"}
              <br />
              {state.readers[reader] === 6
                ? "caught up"
                : `next ${state.readers[reader]}`}
            </Label>
          </AnimatedGroup>
        );
      })}
    </>
  );
}
const laneZ = (partition: number) => (partition - 1) * 2.45;
const laneX = (offset: number) => -2.3 + offset * 1.35;
function PartitionLanes({
  records,
  producer = true,
}: {
  records: readonly {
    id: number;
    key: string;
    partition: number;
    offset: number;
  }[];
  producer?: boolean;
}) {
  return (
    <>
      {producer && (
        <>
          <Block
            position={[-4.6, 0.48, 0]}
            size={[0.9, 0.9, 0.9]}
            color={C.accent}
          />
          <Label position={[-4.6, 1.2, 0]} above tone="accent">
            PRODUCER
          </Label>
          {[0, 1, 2].map((p) => (
            <Wire
              key={p}
              from={[-4.15, 0.08, 0]}
              to={[-3.1, 0.08, laneZ(p)]}
              color={records.at(-1)?.partition === p ? C.accent : C.connector}
            />
          ))}
        </>
      )}
      {[0, 1, 2].map((p) => (
        <group key={p}>
          <Block
            position={[0.3, 0, laneZ(p)]}
            size={[6.8, 0.18, 1.55]}
            color={C.panel}
          />
          <Label position={[-3.5, 0.3, laneZ(p)]}>P{p}</Label>
        </group>
      ))}
      {records.map((r) => (
        <AnimatedGroup
          key={r.id}
          position={[laneX(r.offset), 0, laneZ(r.partition)]}
          enter
        >
          <Block
            position={[0, 0.47, 0]}
            size={[0.95, 0.76, 0.85]}
            color={PARTITION_COLORS[r.partition]}
          />
          <Label position={[0, 1.01, 0]} compact>
            {r.key}
            <br />@{r.offset}
          </Label>
        </AnimatedGroup>
      ))}
    </>
  );
}
function KeyRouting({
  state,
}: {
  state: Extract<IntroSceneState, { kind: "routing" }>;
}) {
  return <PartitionLanes records={keyRoutingSnapshot(state.sent).records} />;
}
function Skew({
  state,
}: {
  state: Extract<IntroSceneState, { kind: "skew" }>;
}) {
  const snapshot = skewSnapshot(state.skewed);
  return <PartitionLanes records={snapshot.records} producer={false} />;
}
const BROKERS: readonly Point[] = [
  [-2.7, 0, 1.4],
  [0, 0, -2.2],
  [2.7, 0, 1.4],
];
function port(from: Point, to: Point): Point {
  const dx = to[0] - from[0],
    dz = to[2] - from[2];
  const t = Math.min(
    dx === 0 ? Infinity : 1.2 / Math.abs(dx),
    dz === 0 ? Infinity : 0.65 / Math.abs(dz),
  );
  return [from[0] + dx * t, 0.05, from[2] + dz * t];
}
function Replication({
  state,
}: {
  state: Extract<IntroSceneState, { kind: "replication" }>;
}) {
  const snapshot = replicationSnapshot(state.step),
    leader = BROKERS[snapshot.leader];
  return (
    <>
      {snapshot.brokers.map((b) => {
        const [x, , z] = BROKERS[b.id],
          isLeader = b.id === snapshot.leader;
        return (
          <group key={b.id}>
            <Block
              position={[x, 0, z]}
              size={[2.4, 0.22, 1.3]}
              color={isLeader ? C.accent : C.panel}
              offline={!b.online}
            />
            <Label
              position={[x, 1, z]}
              above
              tone={!b.online ? "red" : isLeader ? "accent" : "green"}
            >
              BROKER {b.id + 1}
              <br />
              {!b.online ? "offline" : isLeader ? "leader" : "in sync"}
            </Label>
            {b.offsets.map((offset) => (
              <AnimatedGroup
                key={offset}
                position={[x - 0.78 + offset * 0.52, 0, z]}
                enter
              >
                <Block
                  position={[0, 0.5, 0]}
                  size={[0.4, 0.78, 0.78]}
                  color={C.blue}
                  offline={!b.online}
                />
                <Label position={[0, 1.02, 0]} compact>
                  {offset}
                </Label>
              </AnimatedGroup>
            ))}
            {!b.online && (
              <Wire
                from={[x - 1, 0.18, z - 0.5]}
                to={[x + 1, 0.18, z + 0.5]}
                color={C.red}
              />
            )}
            {b.online && !isLeader && (
              <Wire
                from={port(leader, BROKERS[b.id])}
                to={port(BROKERS[b.id], leader)}
                color={C.green}
              />
            )}
          </group>
        );
      })}
    </>
  );
}
function Lag({ state }: { state: Extract<IntroSceneState, { kind: "lag" }> }) {
  const snapshot = lagSnapshot(state.end, state.processed);
  return (
    <>
      <Tape
        count={snapshot.end}
        capacity={8}
        colors={Array.from({ length: snapshot.end }, (_, i) =>
          i < snapshot.processed ? C.green : C.yellow,
        )}
      />
      <Label position={[0, 0, -1.4]} tone="yellow">
        {snapshot.lag} WAITING
      </Label>
      <AnimatedGroup position={[logX(snapshot.processed, 8), 0, 0]}>
        <Block
          position={[0, 0.4, 1.65]}
          size={[0.6, 0.6, 0.6]}
          color={C.accent}
        />
        <Label position={[0, 0.1, 2.5]} tone="accent">
          READER
          <br />
          next {snapshot.processed}
        </Label>
        <Wire from={[0, 0.12, 1.35]} to={[0, 0.12, 0.55]} color={C.accent} />
      </AnimatedGroup>
    </>
  );
}
function Placement({
  state,
}: {
  state: Extract<IntroSceneState, { kind: "placement" }>;
}) {
  const placement = placementSnapshot(state.distributed);
  return (
    <>
      {[0, 1, 2].map((broker) => {
        const x = (broker - 1) * 3.4;
        return (
          <group key={broker}>
            <Block position={[x, 0, 0]} size={[2.8, 0.35, 4.1]} />
            <Label position={[x, 0.7, -2.3]} above>
              BROKER {broker + 1}
            </Label>
          </group>
        );
      })}
      {placement.map((p) => (
        <AnimatedGroup
          key={p.partition}
          position={[(p.broker - 1) * 3.4, 0, (p.partition - 1) * 1.2]}
        >
          <Block
            position={[0, 0.35, 0]}
            size={[2.2, 0.38, 0.85]}
            color={PARTITION_COLORS[p.partition]}
          />
          <Label position={[0, 0.8, 0]} compact>
            P{p.partition} leader
          </Label>
        </AnimatedGroup>
      ))}
    </>
  );
}
function World(props: Props) {
  return (
    <>
      <color attach="background" args={[C.canvas]} />
      <Camera
        kind={props.state.kind}
        command={props.cameraCommand}
        onUnavailable={props.onUnavailable}
      />
      <ambientLight intensity={1.3} />
      <directionalLight position={[-3, 8, 6]} intensity={1.7} />
      {props.state.kind === "retained" && <RetainedLog state={props.state} />}
      {props.state.kind === "routing" && <KeyRouting state={props.state} />}
      {props.state.kind === "replication" && (
        <Replication state={props.state} />
      )}
      {props.state.kind === "lag" && <Lag state={props.state} />}
      {props.state.kind === "skew" && <Skew state={props.state} />}
      {props.state.kind === "placement" && <Placement state={props.state} />}
    </>
  );
}
export default function KafkaIntroScene(props: Props) {
  return (
    <SceneCanvas
      sceneId={`kafka-intro-${props.state.kind}`}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={CAMERA_OPTIONS}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: false }}
      fallback={
        <p className="kafka-intro-scene-fallback">
          3D is unavailable. Use the controls and current state below.
        </p>
      }
    >
      <MotionBoundary>
        <World {...props} />
      </MotionBoundary>
    </SceneCanvas>
  );
}
