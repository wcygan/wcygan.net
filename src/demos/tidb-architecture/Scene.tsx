import { Application, Box, StorageShell } from "./Models";
import { Processor } from "./Processor";
import { useEffect, useMemo, useRef } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { Billboard, Edges, Line, OrbitControls } from "@react-three/drei";
import {
  DoubleSide,
  Group,
  Mesh,
  LineCurve3,
  OrthographicCamera,
  QuadraticBezierCurve3,
  Shape,
  Spherical,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  GROUPS,
  NODES,
  architectureConnections,
  messagePoints,
  operationSteps,
  regionForUser,
  regionsOnNode,
  replicaHeight,
  REPLICA_BLOCK_HEIGHT,
  stepParticipants,
  type ArchitectureNode,
  type GroupId,
  type MessagePath,
  type Point,
  type Region,
  type ViewCommand,
} from "./model";
import type { Playback, PlaybackSnapshot } from "./playback";
import { CONNECTIONS, sceneLabels, type Inspection } from "./presentation";
import { Labels } from "./Labels";

interface Props {
  playback: Playback;
  state: PlaybackSnapshot;
  reduced: boolean;
  active: boolean;
  view: ViewCommand;
  onUnavailable: () => void;
  inspection: Inspection | null;
  onHover: (target: Inspection | null) => void;
  onSelect: (target: Inspection | null) => void;
}
const TARGET: Point = [-0.25, 0.3, 1.6];
// Low oblique overview keeps all three storage rows and replica faces visible.
const DEFAULT_CAMERA: Point = [-13.25, 13.3, 22.6];
const INK = "#56554e";
const MISSED_INK = "#993d35";

function LeaderStar({ position, dim }: { position: Point; dim: boolean }) {
  const shape = useMemo(() => {
    const star = new Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? 0.108 : 0.048;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    star.closePath();
    return star;
  }, []);
  return (
    <mesh position={position}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={dim ? "#aaa79d" : "#21201c"} />
    </mesh>
  );
}

function Camera({
  view,
  onUnavailable,
}: Pick<Props, "view" | "onUnavailable">) {
  const { camera, size, invalidate, gl } = useThree();
  const fit = Math.min(size.width / 15.2, size.height / 11.2);
  const previousFit = useRef(fit);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom *= fit / previousFit.current;
    previousFit.current = fit;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fit, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (view.kind === "reset") {
      camera.position.set(...DEFAULT_CAMERA);
      ortho.zoom = fit;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fit * 0.65,
        Math.min(fit * 2.5, ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2)),
      );
    } else {
      const target = new Vector3(...TARGET);
      const spherical = new Spherical().setFromVector3(
        camera.position.clone().sub(target),
      );
      spherical.theta += view.kind === "left" ? -Math.PI / 8 : Math.PI / 8;
      camera.position.setFromSpherical(spherical).add(target);
    }
    camera.lookAt(...TARGET);
    ortho.updateProjectionMatrix();
    invalidate();
    // Query state never changes the camera; resizing preserves orbit and relative zoom.
  }, [camera, view, invalidate]);
  return (
    <OrbitControls
      target={TARGET}
      enablePan={false}
      enableDamping={false}
      minZoom={fit * 0.65}
      maxZoom={fit * 2.5}
      minPolarAngle={0.01}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

function ControlHub({ selected }: { selected: boolean }) {
  return (
    <>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.62, 6]} />
        <meshStandardMaterial color={GROUPS.pd.tint} roughness={1} />
        <Edges
          color={selected ? "#21201c" : INK}
          lineWidth={selected ? 1.8 : 1}
        />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.335, 32]} />
        <meshBasicMaterial color={INK} side={DoubleSide} />
      </mesh>
      <Line
        points={[
          [0, 0.73, -0.22],
          [0, 0.73, 0],
          [0.17, 0.73, 0.09],
        ]}
        color={INK}
        lineWidth={2}
      />
    </>
  );
}

function Storage({
  node,
  region,
  focused,
  operating,
  behind,
  involved,
}: {
  node: ArchitectureNode;
  region: Region;
  focused: boolean;
  operating: boolean;
  behind: boolean;
  involved: boolean;
}) {
  const dim = operating && !involved && !focused;
  return (
    <>
      <StorageShell dim={dim} focused={focused} />
      {regionsOnNode(node.id).map((item) => {
        const selected = operating && involved && item.id === region.id;
        const y = replicaHeight(item, node.id);
        return (
          <group key={item.id}>
            <Box
              position={[0, y, 0.11]}
              size={[0.98, REPLICA_BLOCK_HEIGHT, 0.72]}
              color={item.color}
              dim={operating && !selected}
              selected={selected}
              behind={selected && behind}
            />
            {item.leader === node.id && (
              <LeaderStar
                // The cutaway opens toward +Z; sit just outside the block's front face.
                position={[0, y, 0.11 + 0.72 / 2 + 0.004]}
                dim={operating && !selected}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

function Message({
  path,
  region,
  playback,
  state,
  active,
  reduced,
}: {
  path: MessagePath;
  region: Region;
} & Pick<Props, "playback" | "state" | "active" | "reduced">) {
  const packet = useRef<Mesh>(null);
  const missed = useRef<Group>(null);
  const dropped = path.delivery === "dropped";
  const stop = dropped ? 0.72 : 1;
  const { invalidate } = useThree();
  const curve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        ...(messagePoints(path, region).map((p) => new Vector3(...p)) as [
          Vector3,
          Vector3,
          Vector3,
        ]),
      ),
    [path.from, path.to, path.kind, region],
  );
  const points = useMemo(
    () => Array.from({ length: 41 }, (_, i) => curve.getPoint((i / 40) * stop)),
    [curve, stop],
  );
  const color = dropped
    ? MISSED_INK
    : path.kind === "coordination"
      ? "#75527f"
      : region.ink;
  const end = curve.getPoint(stop),
    tangent = curve.getTangent(stop);
  const side = new Vector3()
    .crossVectors(tangent, new Vector3(0, 1, 0))
    .normalize()
    .multiplyScalar(0.1);
  const back = end.clone().addScaledVector(tangent, -0.24);
  useEffect(() => {
    invalidate();
  }, [state.revision, active, reduced, invalidate]);
  useFrame(() => {
    if (!packet.current) return;
    const progress = reduced ? 1 : playback.progress();
    const t =
      path.phase !== undefined
        ? Math.max(0, Math.min(1, progress * 2 - path.phase))
        : progress;
    packet.current.position.copy(curve.getPoint(Math.min(t, stop)));
    packet.current.visible =
      !reduced &&
      (dropped
        ? t < stop
        : path.phase === undefined ||
          (path.phase === 0 ? progress < 0.5 : progress >= 0.5));
    if (missed.current) missed.current.visible = t >= stop;
    if (state.moving && active && !reduced) invalidate();
  });
  return (
    <>
      <Line
        points={points}
        color={color}
        lineWidth={2}
        dashed={path.kind === "coordination"}
        dashSize={0.14}
        gapSize={0.1}
      />
      {dropped ? (
        <Billboard position={end}>
          <group ref={missed} visible={reduced || playback.progress() >= stop}>
            <Line
              points={[
                [-0.14, -0.14, 0],
                [0.14, 0.14, 0],
              ]}
              color={MISSED_INK}
              lineWidth={2.5}
            />
            <Line
              points={[
                [-0.14, 0.14, 0],
                [0.14, -0.14, 0],
              ]}
              color={MISSED_INK}
              lineWidth={2.5}
            />
          </group>
        </Billboard>
      ) : (
        <Line
          points={[back.clone().add(side), end, back.clone().sub(side)]}
          color={color}
          lineWidth={2}
        />
      )}
      <mesh ref={packet} position={points[0]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

function World(props: Props) {
  const region = regionForUser(props.state.operation.userId);
  const steps = operationSteps(props.state.operation);
  const current = steps[props.state.step];
  const participants = stepParticipants(current);
  const operating = props.state.step > 0 && props.state.step < steps.length - 1;
  const labels = useMemo(
    () => sceneLabels(props.state.operation, props.state.step),
    [props.state.operation, props.state.step],
  );
  const events = (target: Inspection) => ({
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (!event.buttons && event.pointerType !== "touch")
        props.onHover(target);
    },
    onPointerOut: () => props.onHover(null),
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (event.delta < 6) props.onSelect(target);
    },
  });
  const focused = (node: ArchitectureNode) =>
    (props.inspection?.kind === "node" && props.inspection.id === node.id) ||
    (props.inspection?.kind === "group" && props.inspection.id === node.group);
  return (
    <>
      <Camera view={props.view} onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.65} />
      <directionalLight position={[-4, 10, 6]} intensity={1.6} />
      {(Object.entries(GROUPS) as [GroupId, (typeof GROUPS)[GroupId]][]).map(
        ([id, group]) => (
          <group
            key={id}
            position={group.position}
            {...events({ kind: "group", id })}
          >
            <Box
              position={[0, -0.04, 0]}
              size={group.size}
              color={group.tint}
              selected={
                props.inspection?.kind === "group" && props.inspection.id === id
              }
            />
          </group>
        ),
      )}
      {architectureConnections().map((link, index) => {
        const connection = CONNECTIONS[index];
        const selected =
          props.inspection?.kind === "connection" &&
          props.inspection.id === connection.id;
        return (
          <group
            key={connection.id}
            {...events({ kind: "connection", id: connection.id })}
          >
            <Line
              points={link.points}
              color={selected ? INK : link.dashed ? "#a5a196" : "#c3c0b7"}
              lineWidth={selected ? 2 : 1}
              dashed={link.dashed}
              dashSize={0.12}
              gapSize={0.1}
            />
            <mesh>
              <tubeGeometry
                args={[
                  new LineCurve3(
                    new Vector3(...link.points[0]),
                    new Vector3(...link.points[1]),
                  ),
                  1,
                  0.2,
                  6,
                  false,
                ]}
              />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
      {NODES.map((node) => (
        <group
          key={node.id}
          position={node.position}
          {...events({ kind: "node", id: node.id })}
        >
          {node.group === "application" ? (
            <Application
              selected={
                focused(node) || (operating && participants.has(node.id))
              }
            />
          ) : node.group === "tidb" ? (
            <Processor
              selected={
                focused(node) ||
                (operating && node.id === props.state.operation.sqlNode)
              }
            />
          ) : node.group === "pd" ? (
            <ControlHub
              selected={
                focused(node) ||
                (node.id === "PD 1" && current.id === "timestamp")
              }
            />
          ) : (
            <Storage
              node={node}
              region={region}
              focused={focused(node)}
              operating={operating}
              behind={
                (current.follower?.nodeId === node.id &&
                  current.follower.status !== "caught-up") ||
                (current.readSafety?.nodeId === node.id &&
                  current.readSafety.appliedIndex <
                    current.readSafety.requiredIndex)
              }
              involved={
                props.state.operation.kind === "read"
                  ? participants.has(node.id)
                  : region.replicas.some((r) => r.nodeId === node.id)
              }
            />
          )}
        </group>
      ))}
      <Labels labels={labels} />
      {current.paths.map((path, index) => (
        <Message
          key={`${props.state.operation.userId}-${props.state.operation.kind}-${props.state.step}-${index}`}
          path={path}
          region={region}
          playback={props.playback}
          state={props.state}
          active={props.active}
          reduced={props.reduced}
        />
      ))}
    </>
  );
}

export default function TidbArchitectureScene(props: Props) {
  return (
    <Canvas
      orthographic
      onPointerMissed={() => props.onSelect(null)}
      camera={{ position: DEFAULT_CAMERA, zoom: 30, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={(defaults) => {
        try {
          return new WebGLRenderer({
            ...defaults,
            antialias: true,
            alpha: true,
          });
        } catch (error) {
          props.onUnavailable();
          throw error;
        }
      }}
      fallback={
        <p>3D is unavailable. Play a scenario to follow the query below.</p>
      }
    >
      <World {...props} />
    </Canvas>
  );
}
