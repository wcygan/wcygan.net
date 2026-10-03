import { Edges, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  CanvasTexture,
  Mesh,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { TEMPORAL_PALETTE as PALETTE } from "~/demos/temporal-palette";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { Camera } from "./Camera";
import { Labels, type TemporalSpatialLabel } from "./Labels";
import { LAYOUTS, type SpatialNode, type SpatialRoute } from "./layout";
import type {
  CameraCommand,
  NodeState,
  Point,
  SpatialFrame,
  Tone,
} from "./model";

const color = (tone: Tone) => PALETTE[tone];

function RecordNumber({ text, position }: { text: string; position: Point }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 80;
    const context = canvas.getContext("2d")!;
    context.fillStyle = PALETTE.text;
    context.font = "600 54px ui-monospace, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 64, 40);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[0.62, 0.38, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

function Node({
  item,
  state,
  incoming,
  selected,
  onSelect,
}: {
  item: SpatialNode;
  state: NodeState | undefined;
  incoming: boolean;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const visible = state?.visible !== false || incoming;
  const ghost = state?.visible === false;
  const tone = ghost ? "panel" : (state?.tone ?? "panel");
  const isRecord = item.shape === "record";
  return (
    <group visible={visible} position={item.position}>
      <mesh
        scale={
          item.shape === "cylinder"
            ? [1, 1, item.size[2] / item.size[0]]
            : undefined
        }
        onClick={
          isRecord && !ghost
            ? (event) => {
                event.stopPropagation();
                onSelect(Number(item.id.slice(6)));
              }
            : undefined
        }
      >
        {item.shape === "cylinder" ? (
          <cylinderGeometry
            args={[item.size[0] / 2, item.size[0] / 2, item.size[1], 32]}
          />
        ) : (
          <boxGeometry args={item.size} />
        )}
        <meshStandardMaterial
          color={color(tone)}
          emissive={color(tone)}
          emissiveIntensity={tone === "panel" ? 0 : 0.09}
          roughness={0.85}
          transparent={ghost}
          opacity={ghost ? 0.26 : 1}
          depthWrite={!ghost}
        />
        <Edges
          color={
            selected
              ? PALETTE.orange
              : tone === "panel"
                ? PALETTE.border
                : PALETTE.text
          }
          threshold={20}
        />
      </mesh>
      {item.shape === "gate" &&
        [-0.62, 0.62].map((z) => (
          <mesh key={z} position={[item.size[0] / 2 + 0.012, 0, z]}>
            <boxGeometry args={[0.024, item.size[1] * 0.65, 0.18]} />
            <meshBasicMaterial color={PALETTE.canvas} />
          </mesh>
        ))}
      {isRecord && !ghost && (
        <RecordNumber
          text={item.label}
          position={[0, item.size[1] / 2 + 0.27, 0]}
        />
      )}
      {tone === "red" && !isRecord && (
        <>
          <Line
            points={[
              [
                -item.size[0] * 0.32,
                item.size[1] / 2 + 0.012,
                -item.size[2] * 0.32,
              ],
              [
                item.size[0] * 0.32,
                item.size[1] / 2 + 0.012,
                item.size[2] * 0.32,
              ],
            ]}
            color={PALETTE.text}
            lineWidth={1.4}
          />
          <Line
            points={[
              [
                -item.size[0] * 0.32,
                item.size[1] / 2 + 0.012,
                item.size[2] * 0.32,
              ],
              [
                item.size[0] * 0.32,
                item.size[1] / 2 + 0.012,
                -item.size[2] * 0.32,
              ],
            ]}
            color={PALETTE.text}
            lineWidth={1.4}
          />
        </>
      )}
    </group>
  );
}

function Route({ route, active }: { route: SpatialRoute; active: boolean }) {
  const arrow = useMemo(() => {
    const tip = new Vector3(...route.points.at(-1)!);
    const direction = tip
      .clone()
      .sub(new Vector3(...route.points.at(-2)!))
      .normalize();
    return {
      position: tip.addScaledVector(direction, -0.1),
      rotation: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction,
      ),
    };
  }, [route]);
  return (
    <>
      <Line
        points={route.points}
        color={active ? PALETTE.orange : PALETTE.connector}
        lineWidth={active ? 2 : 1.1}
        dashed={!active}
        dashSize={0.12}
        gapSize={0.1}
      />
      {active && (
        <mesh position={arrow.position} quaternion={arrow.rotation}>
          <coneGeometry args={[0.085, 0.2, 8]} />
          <meshBasicMaterial color={PALETTE.orange} />
        </mesh>
      )}
    </>
  );
}

/** Lengths, route and occlusion are shared by line, tip, and retained packet. */
function Packet({
  route,
  progress,
  running,
}: {
  route: SpatialRoute;
  progress: RefObject<number>;
  running: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const path = useMemo(() => {
    const points = route.points.map((point) => new Vector3(...point));
    const lengths = points
      .slice(1)
      .map((point, index) => point.distanceTo(points[index]));
    return {
      points,
      lengths,
      total: lengths.reduce((sum, value) => sum + value, 0),
    };
  }, [route]);
  useEffect(() => {
    invalidate();
  }, [invalidate, route, running]);
  useFrame(() => {
    let distance = path.total * progress.current;
    for (let index = 0; index < path.lengths.length; index += 1) {
      const length = path.lengths[index];
      if (distance <= length || index === path.lengths.length - 1) {
        mesh.current?.position
          .copy(path.points[index])
          .lerp(path.points[index + 1], Math.min(1, distance / length));
        break;
      }
      distance -= length;
    }
    if (running) invalidate();
  });
  return (
    <mesh ref={mesh} position={route.points[0]}>
      <icosahedronGeometry args={[0.105, 0]} />
      <meshBasicMaterial color={PALETTE.orange} />
    </mesh>
  );
}

function ContextGuard({ onUnavailable }: { onUnavailable: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  return null;
}

function World({
  frame,
  target,
  moving,
  running,
  routeIds,
  progress,
  selectedEvent,
  onSelect,
}: {
  frame: SpatialFrame;
  target: SpatialFrame | null;
  moving: boolean;
  running: boolean;
  routeIds: string[];
  progress: RefObject<number>;
  selectedEvent: number | null;
  onSelect: (id: number) => void;
}) {
  const layout = LAYOUTS[frame.kind];
  const labels = useMemo<TemporalSpatialLabel[]>(
    () => [
      ...layout.nodes
        .filter(
          (item) =>
            item.shape !== "record" &&
            (frame.nodes[item.id]?.visible !== false ||
              target?.nodes[item.id]?.visible),
        )
        .map((item) => ({
          id: item.id,
          text: item.label,
          position: [
            item.position[0],
            item.position[1] + item.size[1] / 2,
            item.position[2],
          ] as Point,
          tone: frame.nodes[item.id]?.tone,
          active: routeIds.some(
            (id) =>
              layout.routes.find((route) => route.id === id)?.to === item.id,
          ),
        })),
      ...layout.regions
        .filter((item) => item.label)
        .map((item) => ({
          id: item.id,
          text: item.label,
          position: [
            item.position[0],
            item.position[1] + item.size[1] / 2,
            item.position[2] + item.size[2] / 2,
          ] as Point,
          tone: item.tone,
        })),
    ],
    [layout, frame.nodes, target?.nodes, routeIds],
  );
  const routes = layout.routes.filter((route) => {
    const source =
      frame.nodes[route.from]?.visible !== false ||
      target?.nodes[route.from]?.visible;
    const destination =
      frame.nodes[route.to]?.visible !== false ||
      target?.nodes[route.to]?.visible;
    return source && destination;
  });
  return (
    <>
      {layout.regions.map((item) => (
        <mesh key={item.id} position={item.position}>
          <boxGeometry args={item.size} />
          <meshStandardMaterial color={PALETTE.panel} roughness={1} />
          <Edges color={color(item.tone)} />
        </mesh>
      ))}
      {routes.map((route) => (
        <Route
          key={route.id}
          route={route}
          active={routeIds.includes(route.id)}
        />
      ))}
      {layout.nodes.map((item) => (
        <Node
          key={item.id}
          item={item}
          state={frame.nodes[item.id]}
          incoming={Boolean(target?.nodes[item.id]?.visible)}
          selected={item.id === `record${selectedEvent}`}
          onSelect={onSelect}
        />
      ))}
      {moving &&
        routes
          .filter((route) => routeIds.includes(route.id))
          .map((route) => (
            <Packet
              key={route.id}
              route={route}
              running={running}
              progress={progress}
            />
          ))}
      <Labels labels={labels} />
    </>
  );
}

export interface TemporalSceneProps {
  frame: SpatialFrame;
  target: SpatialFrame | null;
  moving: boolean;
  running: boolean;
  routeIds: string[];
  progress: RefObject<number>;
  cameraCommand: CameraCommand;
  selectedEvent: number | null;
  onSelect: (id: number) => void;
  onReady: () => void;
  onUnavailable: () => void;
}
export default function TemporalSpatialScene(props: TemporalSceneProps) {
  return (
    <SceneCanvas
      sceneId={`temporal-${props.frame.kind}`}
      className="temporal-spatial-event-source"
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{
        position: LAYOUTS[props.frame.kind].pose,
        zoom: 1,
        near: 0.1,
        far: 100,
      }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={null}
    >
      <Camera kind={props.frame.kind} command={props.cameraCommand} />
      <ContextGuard onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[-4, 8, 7]} intensity={1.7} />
      <World {...props} />
    </SceneCanvas>
  );
}
