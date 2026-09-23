import {
  type ComponentRef,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, Line, OrbitControls } from "@react-three/drei";
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Spherical,
  Vector2,
  Vector3,
} from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { messageRole, type Palette, readPalette, recordRole } from "./palette";
import { changedNodes, messagePhase } from "./motion";
import { fitTransactionZoom } from "./camera";
import { StateHighlight } from "./StateHighlight";
import type {
  AccountState,
  Message,
  ReplicaState,
  TransactionFrame,
} from "./types";

import {
  BACK_REPLICA_HEIGHT,
  connectionsFor,
  COORDINATOR_RADIUS,
  DATABASE_HEIGHT,
  DATABASE_RADIUS,
  nodeRadius,
  type Point,
  pointOnRoute,
  type Positions,
  positionsFor,
  REPLICA_HEIGHT,
  routeBetween,
} from "./geometry";

export interface TransactionSceneProps {
  sceneId: string;
  frame: TransactionFrame;
  nextFrame?: TransactionFrame;
  messages: Message[];
  /** The shell owns the only animation clock. */
  progress: { current: number };
  moving: boolean;
  active: boolean;
  reduced: boolean;
  viewReset: number;
  onReady: () => void;
  onUnavailable: () => void;
}

const TARGET: Point = [0, 0, 0];
const DEFAULT_CAMERA: Point = [0, 5.5, 16];
const PaletteContext = createContext<Palette | null>(null);
const useColors = () => useContext(PaletteContext)!;

function offset(point: Point, x = 0, y = 0, z = 0): Point {
  return [point[0] + x, point[1] + y, point[2] + z];
}

/** The cap identifies ownership; the narrow body band identifies durable state. */
function Database({
  position,
  radius = DATABASE_RADIUS,
  height = DATABASE_HEIGHT,
  owner = "a",
  record,
  offline = false,
}: {
  position: Point;
  radius?: number;
  height?: number;
  owner?: "a" | "b";
  record?: string | null;
  offline?: boolean;
}) {
  const colors = useColors();
  const { profile, rims } = useMemo(() => {
    const bevel = 0.018;
    const half = height / 2;
    return {
      profile: [
        [0, -half],
        [radius - bevel, -half],
        [radius, -half + bevel],
        [radius, half - bevel],
        [radius - bevel, half],
        [0, half],
      ].map(([x, y]) => new Vector2(x, y)),
      rims: [-0.5, -1 / 6, 1 / 6, 0.5].map((level) =>
        Array.from({ length: 129 }, (_, index): Point => {
          const angle = (index / 128) * Math.PI * 2;
          const r = (Math.abs(level) === 0.5 ? radius - bevel : radius) + 0.003;
          return [Math.cos(angle) * r, height * level, Math.sin(angle) * r];
        }),
      ),
    };
  }, [radius, height]);
  return (
    <group position={position}>
      <mesh>
        <latheGeometry args={[profile, 96]} />
        <meshBasicMaterial color={colors.neutral} toneMapped={false} />
      </mesh>
      <mesh
        position={[0, height / 2 + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[radius - 0.018, 96]} />
        <meshBasicMaterial
          color={offline ? colors.offline : colors[`database-${owner}`]}
          toneMapped={false}
        />
      </mesh>
      {rims.map((points, index) => (
        <Line
          toneMapped={false}
          key={index}
          points={points}
          color={colors.line}
          lineWidth={1}
        />
      ))}
      {record && (
        <mesh position={[0, -height * 0.08, 0]}>
          <cylinderGeometry
            args={[radius + 0.006, radius + 0.006, 0.045, 96, 1, true]}
          />
          <meshBasicMaterial
            color={colors[recordRole(record)]}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

function Label({
  position,
  variant = "node",
  owner,
  children,
}: {
  position: Point;
  variant?:
    | "node"
    | "account"
    | "record"
    | "offline"
    | "replica"
    | "coordinator";
  owner?: "a" | "b";
  children: ReactNode;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[1, 0]}
      className={`dt-scene-label dt-scene-label--${variant}${
        owner ? ` dt-scene-label--${owner}` : ""
      }`}
    >
      {children}
    </Html>
  );
}

function Camera({
  viewReset,
  onUnavailable,
  replicated,
}: Pick<TransactionSceneProps, "viewReset" | "onUnavailable"> & {
  replicated: boolean;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const fittedZoom = Math.min(
    size.width / (replicated ? 10.4 : 8.2),
    size.height / (replicated ? 9.6 : 7.6),
  );
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const previousFit = useRef(fittedZoom);
  const basis = useMemo(
    () => ({ right: new Vector3(), up: new Vector3() }),
    [],
  );
  const fitView = useCallback(
    (reset = false) => {
      const ortho = camera as OrthographicCamera;
      // Preserve deliberate wheel/key zoom while fitting a newly rotated pose.
      const readerZoom = reset ? 1 : ortho.zoom / previousFit.current;
      camera.updateMatrixWorld();
      basis.right.setFromMatrixColumn(camera.matrixWorld, 0);
      basis.up.setFromMatrixColumn(camera.matrixWorld, 1);
      const fit = fitTransactionZoom({
        replicated,
        width: size.width,
        height: size.height,
        right: basis.right.toArray() as Point,
        up: basis.up.toArray() as Point,
        defaultFit: fittedZoom,
      });
      previousFit.current = fit;
      ortho.zoom = fit * readerZoom;
      ortho.updateProjectionMatrix();
      if (controls.current) {
        controls.current.minZoom = fit * 0.6;
        controls.current.maxZoom = fit * 2.2;
      }
      invalidate();
    },
    [
      basis,
      camera,
      fittedZoom,
      invalidate,
      replicated,
      size.height,
      size.width,
    ],
  );
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;
  // Resizing fits the current orientation; it does not change the reader's pose.
  useEffect(() => {
    fitView(true);
  }, [fitView]);
  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA);
    camera.lookAt(...TARGET);
    fitViewRef.current(true);
  }, [camera, viewReset]);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  useEffect(() => {
    const stage = gl.domElement.closest<HTMLElement>("[data-graphic-stage]");
    if (!stage) return;
    const keyboard = (event: KeyboardEvent) => {
      // Controls are outside the stage. Do not intercept nested form controls.
      if (
        event.target !== stage ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }
      const ortho = camera as OrthographicCamera;
      const spherical = new Spherical().setFromVector3(
        camera.position.clone().sub(new Vector3(...TARGET)),
      );
      switch (event.key) {
        case "ArrowLeft":
          spherical.theta -= Math.PI / 12;
          break;
        case "ArrowRight":
          spherical.theta += Math.PI / 12;
          break;
        case "ArrowUp":
          spherical.phi = Math.max(0.1, spherical.phi - Math.PI / 16);
          break;
        case "ArrowDown":
          spherical.phi = Math.min(Math.PI - 0.1, spherical.phi + Math.PI / 16);
          break;
        case "+":
        case "=":
          ortho.zoom = Math.min(previousFit.current * 2.2, ortho.zoom * 1.15);
          break;
        case "-":
          ortho.zoom = Math.max(previousFit.current * 0.6, ortho.zoom / 1.15);
          break;
        case "Home":
          camera.position.set(...DEFAULT_CAMERA);
          ortho.zoom = fittedZoom;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (event.key.startsWith("Arrow")) {
        camera.position.setFromSpherical(spherical).add(new Vector3(...TARGET));
      }
      camera.lookAt(...TARGET);
      fitView(event.key === "Home");
    };
    stage.addEventListener("keydown", keyboard);
    return () => stage.removeEventListener("keydown", keyboard);
  }, [camera, fittedZoom, fitView, gl]);
  return (
    <OrbitControls
      ref={controls}
      target={TARGET}
      onChange={() => fitView()}
      enablePan={false}
      enableRotate
      enableZoom
      enableDamping={false}
      minZoom={fittedZoom * 0.6}
      maxZoom={fittedZoom * 2.2}
    />
  );
}

function Account({
  id,
  state,
  position,
  showRecord = true,
}: {
  id: "A" | "B";
  state: AccountState;
  position: Point;
  showRecord?: boolean;
}) {
  const record = state.records.at(-1);
  return (
    <Label position={position} variant="account">
      <small className="dt-account-name">Account {id}</small>
      <strong className="dt-account-value">${state.balance}</strong>
      <span className="dt-account-pending">
        {state.pending !== 0 ? (
          <>
            <StateHighlight>pending</StateHighlight>{" "}
            {state.pending > 0 ? "+" : "−"}${Math.abs(state.pending)}
          </>
        ) : state.state === "committed" || state.state === "aborted" ? (
          <StateHighlight>{state.state}</StateHighlight>
        ) : (
          "\u00a0"
        )}
      </span>
      <span className="dt-account-record">
        {showRecord && record ? (
          <>
            STORED: <StateHighlight>{record}</StateHighlight>
          </>
        ) : (
          "\u00a0"
        )}
      </span>
    </Label>
  );
}

function Coordinator({
  frame,
  position,
}: {
  frame: TransactionFrame;
  position: Point;
}) {
  const colors = useColors();
  const outline = useMemo(
    () =>
      Array.from({ length: 65 }, (_, i): Point => {
        const angle = (i / 64) * Math.PI * 2;
        return [
          Math.cos(angle) * COORDINATOR_RADIUS,
          Math.sin(angle) * COORDINATOR_RADIUS,
          0,
        ];
      }),
    [],
  );
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[COORDINATOR_RADIUS, 32, 24]} />
        <meshBasicMaterial color={colors.paper} toneMapped={false} />
      </mesh>
      <Billboard>
        <Line
          toneMapped={false}
          points={outline}
          color={colors.line}
          lineWidth={1}
        />
      </Billboard>
      <Label position={[0, 0, 0]} variant="replica">
        C
      </Label>
      <Label position={[0, 0.85, 0]} variant="coordinator">
        Coordinator
      </Label>
      <Label position={[0, -0.68, 0]} variant="record">
        <span>
          {frame.coordinator.online ? (
            frame.coordinator.record ? (
              <>
                DECISION:{" "}
                <StateHighlight>{frame.coordinator.record}</StateHighlight>
              </>
            ) : (
              <StateHighlight>COLLECTING VOTES</StateHighlight>
            )
          ) : (
            <StateHighlight>UNREACHABLE</StateHighlight>
          )}
        </span>
        {!frame.coordinator.online && (
          <span>
            STORED:{" "}
            <StateHighlight>
              {frame.coordinator.record ?? "NO DECISION"}
            </StateHighlight>
          </span>
        )}
      </Label>
    </group>
  );
}

function Connection({
  points,
  interrupted = false,
  emphasis = false,
}: {
  points: Point[];
  interrupted?: boolean;
  emphasis?: boolean;
}) {
  const colors = useColors();
  return (
    <Line
      toneMapped={false}
      points={points}
      color={emphasis ? colors.active : colors.line}
      lineWidth={emphasis ? 1.5 : 1}
      dashed
      dashSize={interrupted ? 0.08 : 0.13}
      gapSize={interrupted ? 0.27 : 0.1}
    />
  );
}

function RouteArrow({
  points,
  color,
  message,
  messages,
  progress,
}: {
  points: Point[];
  color: string;
  message: Message;
  messages: Message[];
  progress: { current: number };
}) {
  const group = useRef<Group>(null);
  useFrame(() => {
    const phase = messagePhase(message, messages, progress.current);
    if (group.current) group.current.visible = phase >= 0 && phase < 1;
  });
  const tip = points.at(-1)!;
  const before = points.at(-2)!;
  const length = Math.hypot(tip[0] - before[0], tip[2] - before[2]);
  if (!length) return null;
  const x = (tip[0] - before[0]) / length;
  const z = (tip[2] - before[2]) / length;
  return (
    <group ref={group} visible={false}>
      <Line
        toneMapped={false}
        points={[
          [tip[0] - x * 0.2 - z * 0.1, tip[1], tip[2] - z * 0.2 + x * 0.1],
          tip,
          [tip[0] - x * 0.2 + z * 0.1, tip[1], tip[2] - z * 0.2 - x * 0.1],
        ]}
        color={color}
        lineWidth={1.25}
      />
    </group>
  );
}

function SplitServers({
  frame,
  positions,
}: {
  frame: TransactionFrame;
  positions: Positions;
}) {
  const colors = useColors();
  const together = frame.layout === "together";
  return (
    <>
      {together ? (
        <>
          <Database
            position={[0, 0, 0]}
            record={frame.accounts[0].records.at(-1)}
          />
          <Label position={[0, 1.15, 0]}>One database</Label>
          {[-1, 1].map((side) => (
            <Line
              toneMapped={false}
              key={side}
              points={[
                [side * 0.35, -0.57, 0.35],
                [side * 0.35, -1.05, 0.35],
                [side * 1.35, -1.05, 0.35],
                [side * 1.35, -1.14, 0.35],
              ]}
              color={colors.line}
              lineWidth={1}
            />
          ))}
        </>
      ) : (
        (["a", "b"] as const).map((id, index) => (
          <group key={id}>
            <Database
              position={positions[id]}
              owner={id}
              record={frame.accounts[index].records.at(-1)}
            />
            <Label position={offset(positions[id], 0, 1.1)}>
              Shard {id.toUpperCase()}
              {id === "b" && frame.isolated && (
                <>
                  {" "}
                  · <StateHighlight>isolated</StateHighlight>
                </>
              )}
            </Label>
          </group>
        ))
      )}
      {frame.accounts.map((state, index) => (
        <Account
          key={index}
          id={index === 0 ? "A" : "B"}
          state={state}
          position={[
            together
              ? index === 0
                ? -1.35
                : 1.35
              : positions[index === 0 ? "a" : "b"][0],
            -2.3,
            0,
          ]}
        />
      ))}
      {frame.coordinator.visible && (
        <Coordinator frame={frame} position={positions.coordinator} />
      )}
    </>
  );
}

function Replica({
  replica,
  position,
  coordinator,
}: {
  replica: ReplicaState;
  position: Point;
  coordinator: boolean;
}) {
  const front = replica.id.length === 1;
  const radius = nodeRadius("replicated", replica.id);
  const height = front ? REPLICA_HEIGHT : BACK_REPLICA_HEIGHT;
  const id = `${replica.group.toUpperCase()}${
    front ? "1" : replica.id.slice(1)
  }`;
  return (
    <>
      <Database
        position={position}
        radius={radius}
        height={height}
        owner={replica.group}
        record={replica.record}
        offline={!replica.online}
      />
      <Label
        position={offset(position, 0, height * 0.2, radius + 0.02)}
        variant="replica"
      >
        {id}
      </Label>
      {(replica.leader || !replica.online) && (
        <Label position={offset(position, 0, height / 2 + 0.52)}>
          {!replica.online ? (
            <StateHighlight>UNREACHABLE</StateHighlight>
          ) : coordinator ? (
            "LEADER · COORD."
          ) : (
            "LEADER"
          )}
        </Label>
      )}
      <Label position={offset(position, 0, -height / 2 - 0.4)} variant="record">
        {replica.record ? (
          <>
            {front ? "STORED: " : ""}
            <StateHighlight>{replica.record}</StateHighlight>
          </>
        ) : (
          "—"
        )}
      </Label>
    </>
  );
}

function ReplicatedServers({
  frame,
  positions,
}: {
  frame: TransactionFrame;
  positions: Positions;
}) {
  return (
    <>
      {(["a", "b"] as const).map((group, index) => (
        <group key={group}>
          <Label position={[positions[group][0], 1.7, -4]}>
            Shard {group.toUpperCase()}
          </Label>
          <Account
            id={index === 0 ? "A" : "B"}
            state={frame.accounts[index]}
            position={offset(positions[group], 0, -2.6)}
            showRecord={false}
          />
        </group>
      ))}
      {frame.replicas.map((replica) => (
        <Replica
          key={replica.id}
          replica={replica}
          position={positions[replica.id]}
          coordinator={
            frame.coordinator.visible && replica.group === "a" && replica.leader
          }
        />
      ))}
    </>
  );
}

function MovingMessages({
  layout,
  messages,
  positions,
  progress,
  active,
}: {
  layout: TransactionFrame["layout"];
  messages: Message[];
  positions: Positions;
  progress: { current: number };
  active: boolean;
}) {
  const colors = useColors();
  const group = useRef<Group>(null);
  const routes = useMemo(
    () =>
      messages.map((message) =>
        routeBetween(positions, layout, message.from, message.to),
      ),
    [positions, layout, messages],
  );
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [active, messages, invalidate]);
  useFrame(() => {
    if (!group.current) return;
    const t = Math.max(0, Math.min(1, progress.current));
    messages.forEach((message, index) => {
      const child = group.current?.children[index];
      if (!child) return;
      const phase = messagePhase(message, messages, t);
      child.visible = phase >= 0 && phase <= 1;
      const local = Math.max(0, Math.min(1, (phase - 0.08) / 0.84));
      const eased = local * local * (3 - 2 * local);
      const arrival = Math.max(
        0,
        Math.min(1, phase / 0.08, (1 - phase) / 0.08),
      );
      child.scale.setScalar(arrival * arrival * (3 - 2 * arrival));
      child.position.set(...pointOnRoute(routes[index], eased));
    });
    if (active && t < 1) invalidate();
  });
  return (
    <group ref={group}>
      {messages.map((message, index) => (
        <mesh
          key={`${message.from}-${message.to}-${index}`}
          position={routes[index][0]}
        >
          <sphereGeometry args={[0.075, 16, 12]} />
          <meshBasicMaterial
            color={colors[messageRole(message.label)]}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** One restrained ring identifies a local operation without exposing its result early. */
function LocalActivity({
  frame,
  nextFrame,
  positions,
  progress,
  active,
}: {
  frame: TransactionFrame;
  nextFrame: TransactionFrame;
  positions: Positions;
  progress: { current: number };
  active: boolean;
}) {
  const colors = useColors();
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const changed = useMemo(() => {
    const nodes = changedNodes(frame, nextFrame);
    if (frame.layout === "together") return nodes.size ? ["a" as const] : [];
    if (frame.layout === "replicated" && nodes.delete("coordinator")) {
      nodes.add(
        frame.replicas.find((node) => node.group === "a" && node.leader)?.id ??
          "a",
      );
    }
    return [...nodes];
  }, [frame, nextFrame]);
  useEffect(() => {
    invalidate();
  }, [active, invalidate]);
  useFrame(() => {
    const t = Math.max(0, Math.min(1, progress.current));
    group.current?.children.forEach((child) => {
      child.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.06);
      ((child as Mesh).material as MeshBasicMaterial).opacity =
        Math.sin(t * Math.PI) * 0.85;
    });
    if (active && t < 1) invalidate();
  });
  return (
    <group ref={group}>
      {[...changed].map((id) => (
        <mesh
          key={id}
          position={
            frame.layout === "together"
              ? [0, DATABASE_HEIGHT / 2 + 0.04, 0]
              : offset(
                  positions[id],
                  0,
                  id === "coordinator" && frame.layout !== "replicated"
                    ? 0
                    : (frame.layout === "replicated"
                        ? id.length === 1
                          ? REPLICA_HEIGHT
                          : BACK_REPLICA_HEIGHT
                        : DATABASE_HEIGHT) /
                        2 +
                        0.04,
                )
          }
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry
            args={[
              frame.layout === "together"
                ? DATABASE_RADIUS + 0.06
                : nodeRadius(frame.layout, id) + 0.06,
              0.025,
              6,
              64,
            ]}
          />
          <meshBasicMaterial
            color={colors.active}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** A finite clock sweep distinguishes commit wait from message traffic. */
function CommitWait({
  position,
  progress,
  active,
  complete,
  radius,
  height,
}: {
  radius: number;
  height: number;
  position: Point;
  progress: { current: number };
  active: boolean;
  complete: boolean;
}) {
  const colors = useColors();
  const arc = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [active, complete, invalidate]);
  useFrame(() => {
    const t = complete ? 1 : Math.max(0, Math.min(1, progress.current));
    arc.current?.geometry.setDrawRange(0, Math.floor(t * 128) * 6);
    if (active && !complete && t < 1) invalidate();
  });
  return (
    <group
      position={offset(position, 0, height / 2 + 0.04)}
      rotation={[-Math.PI / 2, 0, Math.PI / 2]}
    >
      <mesh>
        <ringGeometry args={[radius + 0.05, radius + 0.075, 128]} />
        <meshBasicMaterial color={colors.line} />
      </mesh>
      <mesh ref={arc} position={[0, 0, 0.005]}>
        <ringGeometry args={[radius + 0.04, radius + 0.085, 128]} />
        <meshBasicMaterial color={complete ? colors.commit : colors.active} />
      </mesh>
    </group>
  );
}

function SeparateDatabases({
  frame,
  progress,
  active,
}: {
  frame: TransactionFrame;
  progress: { current: number };
  active: boolean;
}) {
  const first = useRef<Group>(null);
  const second = useRef<Group>(null);
  const accountA = useRef<Group>(null);
  const accountB = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [active, invalidate]);
  useFrame(() => {
    const t = progress.current * progress.current * (3 - 2 * progress.current);
    first.current?.position.set(-2.2 * t, 0, 0);
    second.current?.position.set(2.2 * t, 0, 0);
    second.current?.scale.setScalar(t);
    accountA.current?.position.set(-1.35 - 0.85 * t, -2.3, 0);
    accountB.current?.position.set(1.35 + 0.85 * t, -2.3, 0);
    if (active && t < 1) invalidate();
  });
  return (
    <>
      <group ref={first}>
        <Database position={[0, 0, 0]} owner="a" />
      </group>
      <group ref={second} scale={0}>
        <Database position={[0, 0, 0]} owner="b" />
      </group>
      <group ref={accountA} position={[-1.35, -2.3, 0]}>
        <Account id="A" state={frame.accounts[0]} position={[0, 0, 0]} />
      </group>
      <group ref={accountB} position={[1.35, -2.3, 0]}>
        <Account id="B" state={frame.accounts[1]} position={[0, 0, 0]} />
      </group>
    </>
  );
}

function World(props: TransactionSceneProps) {
  const gl = useThree((state) => state.gl);
  const palette = useMemo(() => readPalette(gl.domElement), [gl]);
  const { frame, moving, active, reduced, progress, messages } = props;
  const connections = useMemo(
    () => connectionsFor(frame, messages),
    [frame, messages],
  );
  const basePositions = useMemo(
    () => positionsFor(frame.layout),
    [frame.layout],
  );
  const coordinatorId =
    frame.replicas.find((node) => node.group === "a" && node.leader)?.id ?? "a";
  const positions = useMemo(
    () =>
      frame.layout === "replicated"
        ? { ...basePositions, coordinator: basePositions[coordinatorId] }
        : basePositions,
    [basePositions, frame.layout, coordinatorId],
  );
  return (
    <PaletteContext.Provider value={palette}>
      <Camera
        viewReset={props.viewReset}
        onUnavailable={props.onUnavailable}
        replicated={frame.layout === "replicated"}
      />
      <group position={[0, frame.layout === "replicated" ? 0.25 : 0.45, 0]}>
        {connections.map((connection) => (
          <Connection
            key={`${connection.from}-${connection.to}`}
            points={routeBetween(
              positions,
              frame.layout,
              connection.from,
              connection.to,
            )}
            interrupted={connection.interrupted}
            emphasis={connection.active}
          />
        ))}
        {moving &&
        frame.layout === "together" &&
        props.nextFrame?.layout === "split" &&
        !reduced ? (
          <SeparateDatabases
            frame={frame}
            progress={progress}
            active={active}
          />
        ) : frame.layout === "replicated" ? (
          <ReplicatedServers frame={frame} positions={positions} />
        ) : (
          <SplitServers frame={frame} positions={positions} />
        )}
        {moving &&
          messages.map((message, index) => (
            <RouteArrow
              key={`${message.from}-${message.to}-${index}`}
              points={routeBetween(
                positions,
                frame.layout,
                message.from,
                message.to,
              )}
              color={palette[messageRole(message.label)]}
              message={message}
              messages={messages}
              progress={progress}
            />
          ))}
        {moving && messages.length > 0 && !reduced && (
          <MovingMessages
            layout={frame.layout}
            messages={messages}
            positions={positions}
            progress={progress}
            active={active}
          />
        )}
        {!reduced && (frame.wait || (moving && props.nextFrame?.wait)) && (
          <CommitWait
            position={positions.coordinator}
            radius={nodeRadius(frame.layout, coordinatorId)}
            height={
              coordinatorId.length === 1 ? REPLICA_HEIGHT : BACK_REPLICA_HEIGHT
            }
            progress={progress}
            active={active}
            complete={Boolean(frame.wait)}
          />
        )}
        {moving &&
          !reduced &&
          props.nextFrame &&
          !props.nextFrame.wait &&
          !messages.length &&
          frame.layout === props.nextFrame.layout && (
            <LocalActivity
              frame={frame}
              nextFrame={props.nextFrame}
              positions={positions}
              progress={progress}
              active={active}
            />
          )}
      </group>
    </PaletteContext.Provider>
  );
}

export default function TransactionScene(props: TransactionSceneProps) {
  return (
    <SceneCanvas
      sceneId={props.sceneId}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: DEFAULT_CAMERA, zoom: 40, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={
        <p>
          3D is unavailable. Follow the transaction in the account ledger below.
        </p>
      }
    >
      <World {...props} />
    </SceneCanvas>
  );
}
