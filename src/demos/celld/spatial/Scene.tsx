import { Line, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type RefObject,
} from "react";
import { OrthographicCamera, Spherical } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { CELLD_COLORS as C } from "../palette";
import {
  CELL_LAYERS,
  CHANGED_PAGES,
  fleetSnapshot,
  pageChangeSnapshot,
  sqlitePagePosition,
  type CameraCommand,
  type CellLayer,
  type FleetView,
  type PageStep,
  type Point,
} from "./model";
import {
  Box,
  Bucket,
  Database,
  Labels,
  Log,
  Runtime,
  SurfaceId,
  type Label,
} from "./primitives";
import { NamedStateWorld } from "./NamedStateWorld";
import type { NamedState } from "./named-state-model";
import { FailureDomainsWorld } from "./FailureDomainsWorld";
import type { FailureLayout, FailurePhase } from "./failure-domains-model";

export type SpatialKind =
  | "named-state"
  | "anatomy"
  | "pages"
  | "fleet"
  | "failure-domains";
export interface CameraMemory {
  position: Point;
  zoomRatio: number;
}
export interface SpatialSceneProps {
  kind: SpatialKind;
  layer: CellLayer;
  view: FleetView;
  pageStep: PageStep;
  namedState: NamedState;
  failureLayout: FailureLayout;
  failurePhase: FailurePhase;
  cameraCommand: CameraCommand;
  cameraMemory: RefObject<CameraMemory | null>;
  onReady: () => void;
  onUnavailable: () => void;
}
const DEFAULT_POSE: Point = [4.5, 5.7, 11];
const ANATOMY_POSE: Point = [5, 4.4, 10];

function Camera({
  kind,
  command,
  memory,
}: {
  kind: SpatialKind;
  command: CameraCommand;
  memory: RefObject<CameraMemory | null>;
}) {
  const { camera, size, invalidate } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const fit = Math.min(
    size.width / (kind === "anatomy" ? 7.3 : kind === "pages" ? 10.2 : 12.0),
    size.height / (kind === "anatomy" ? 6.9 : 8.5),
  );
  const previousFit = useRef(fit);
  const previousCommand = useRef(command.sequence);
  const initialized = useRef(false);
  const pose = kind === "anatomy" ? ANATOMY_POSE : DEFAULT_POSE;

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (!initialized.current) {
      camera.position.set(...(memory.current?.position ?? pose));
      ortho.zoom = fit * (memory.current?.zoomRatio ?? 1);
      camera.lookAt(0, 0, 0);
      initialized.current = true;
      controls.current?.update();
    } else {
      ortho.zoom = fit * (ortho.zoom / previousFit.current);
    }
    previousFit.current = fit;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fit, invalidate, memory, pose]);

  useEffect(() => {
    if (previousCommand.current === command.sequence) return;
    previousCommand.current = command.sequence;
    const ortho = camera as OrthographicCamera;
    if (command.action === "reset" || command.action === "front") {
      camera.position.set(
        ...(command.action === "front" ? ([0, 2.5, 12] as Point) : pose),
      );
      ortho.zoom = previousFit.current;
      camera.lookAt(0, 0, 0);
    } else if (command.action === "in" || command.action === "out") {
      ortho.zoom = Math.max(
        previousFit.current * 0.65,
        Math.min(
          previousFit.current * 2.4,
          ortho.zoom * (command.action === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const spherical = new Spherical().setFromVector3(camera.position);
      if (command.action === "left") spherical.theta -= Math.PI / 10;
      if (command.action === "right") spherical.theta += Math.PI / 10;
      if (command.action === "up") spherical.phi -= Math.PI / 14;
      if (command.action === "down") spherical.phi += Math.PI / 14;
      spherical.phi = Math.max(0.18, Math.min(Math.PI - 0.18, spherical.phi));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    }
    ortho.updateProjectionMatrix();
    controls.current?.update();
    memory.current = {
      position: camera.position.toArray() as Point,
      zoomRatio: ortho.zoom / previousFit.current,
    };
    invalidate();
  }, [camera, command.action, command.sequence, invalidate, memory, pose]);

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping={false}
      enableRotate
      enableZoom
      minZoom={fit * 0.65}
      maxZoom={fit * 2.4}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI - 0.18}
      onChange={() => {
        memory.current = {
          position: camera.position.toArray() as Point,
          zoomRatio: (camera as OrthographicCamera).zoom / previousFit.current,
        };
      }}
    />
  );
}

function ContextGuard({ onUnavailable }: { onUnavailable: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const prior = gl.domElement.style.touchAction;
    gl.domElement.style.touchAction = "pan-y";
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      gl.domElement.style.touchAction = prior;
      gl.domElement.removeEventListener("webglcontextlost", lost);
    };
  }, [gl, onUnavailable]);
  return null;
}

function Anatomy({ layer }: { layer: CellLayer }) {
  const labels = useMemo<Label[]>(
    () => [
      {
        id: "handler",
        text: "V8 · handler",
        position: [0, 2.1, 0],
        tone: layer === "handler" ? "blue" : undefined,
      },
      {
        id: "sqlite",
        text: "private SQLite",
        position: [0, 0, 1.07],
        tone: layer === "sqlite" ? "blue" : undefined,
      },
      {
        id: "ltx",
        text: "LTX · page images",
        position: [0, -1.1, 0],
        tone: layer === "ltx" ? "orange" : undefined,
      },
    ],
    [layer],
  );
  return (
    <>
      <Runtime position={[0, 1.65, 0]} size={2.2} color={C.blue} />
      <Database
        position={[0, 0, 0]}
        radius={1.07}
        height={1.13}
        color={C.blue}
      />
      <Log position={[0, -1.65, 0]} length={3.05} color={C.orange} />
      {CHANGED_PAGES.map((page, i) => (
        <group key={page} position={[i ? 0.55 : -0.55, -1.3, 0]}>
          <Box
            position={[0, 0, 0]}
            size={[0.76, 0.45, 0.66]}
            color={C.orange}
            outline={C.darkInk}
          />
          <SurfaceId position={[0, 0, 0.338]} color={C.darkInk}>
            {String(page)}
          </SurfaceId>
          <SurfaceId
            position={[0, 0.233, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            color={C.darkInk}
          >
            {String(page)}
          </SurfaceId>
        </group>
      ))}
      {[-1.75, 1.75].map((x) => (
        <Line
          key={x}
          points={[
            [x, 1.55, 0],
            [x, -1.5, 0],
          ]}
          color={C.connector}
          lineWidth={1}
          dashed
          dashSize={0.1}
          gapSize={0.1}
        />
      ))}
      <Labels labels={labels} />
    </>
  );
}

function PageChanges({ step }: { step: PageStep }) {
  const snapshot = pageChangeSnapshot(step);
  const labels = useMemo<Label[]>(
    () => [
      {
        id: "sqlite",
        text: "SQLite · 6 pages",
        position: [-2.3, 0.55, -0.8],
        tone: "blue",
      },
      {
        id: "ltx",
        text: "LTX · later commit",
        position: [2.2, 0.37, 0],
        tone: "orange",
      },
    ],
    [],
  );
  return (
    <>
      {snapshot.pages.map((page) => {
        const slot = sqlitePagePosition(page.id);
        const position: Point = [slot[0] - 2.3, 0, slot[2]];
        return (
          <group key={page.id} position={position}>
            <Box
              position={[0, 0, 0]}
              size={[0.88, page.changed ? 0.78 : 0.58, 0.73]}
              color={page.changed ? C.orange : C.blue}
              outline={C.darkInk}
            />
            <SurfaceId position={[0, 0, 0.373]} color={C.darkInk}>
              {String(page.id)}
            </SurfaceId>
            <SurfaceId
              position={[0, page.changed ? 0.398 : 0.298, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              color={C.darkInk}
            >
              {String(page.id)}
            </SurfaceId>
            <SurfaceId
              position={[0, 0, -0.373]}
              rotation={[0, Math.PI, 0]}
              color={C.darkInk}
            >
              {String(page.id)}
            </SurfaceId>
          </group>
        );
      })}
      <Log position={[2.2, -0.36, 0]} length={2.7} color={C.orange} />
      <Line
        points={[
          [-0.8, -0.06, 0],
          [0.8, -0.06, 0],
        ]}
        color={step === 2 ? C.orange : C.connector}
        lineWidth={1.5}
        dashed
        dashSize={0.09}
        gapSize={0.08}
      />
      {snapshot.ltxPageImages.map((page, i) => (
        <group key={page.id} position={[i ? 2.8 : 1.6, 0.05, 0]}>
          <Box
            position={[0, 0, 0]}
            size={[0.82, 0.56, 0.73]}
            color={C.orange}
            outline={C.darkInk}
          />
          <SurfaceId position={[0, 0, 0.373]} color={C.darkInk}>
            {String(page.id)}
          </SurfaceId>
          <SurfaceId
            position={[0, 0.288, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            color={C.darkInk}
          >
            {String(page.id)}
          </SurfaceId>
        </group>
      ))}
      <Labels labels={labels} />
    </>
  );
}

function Fleet({ view }: { view: FleetView }) {
  const snapshot = useMemo(() => fleetSnapshot(view), [view]);
  const labels = useMemo<Label[]>(
    () => [
      ...snapshot.nodes.map(
        (node): Label => ({
          id: node.id,
          text: `node ${node.id}`,
          position: [node.position[0], 0.96, 1.03],
          tone: view === "handoff" && node.id === "C" ? "orange" : "blue",
        }),
      ),
      {
        id: "bucket",
        text: "one shared bucket",
        position: [0, -1.18, 0.35],
        tone: "green",
      },
    ],
    [snapshot, view],
  );
  return (
    <>
      <Bucket position={[0, -1.75, 0]} />
      {snapshot.nodes.map((node) => (
        <group key={node.id}>
          <Box
            position={node.position}
            size={[2.65, 0.25, 2.0]}
            color={C.blue}
            outline={C.darkInk}
          />
          <Log
            position={[node.position[0], 0.41, 0]}
            length={1.72}
            color={C.orange}
          />
          <Line
            points={[
              [node.position[0], 0.725, -0.76],
              [node.position[0], -0.85, -0.76],
              [0, -0.85, -0.76],
              [0, -1.225, -0.76],
            ]}
            color={C.connector}
            lineWidth={1}
            dashed
            dashSize={0.1}
            gapSize={0.1}
          />
        </group>
      ))}
      {snapshot.cells.map((cell) => (
        <group key={cell.name} position={cell.position}>
          <Box
            position={[0, 0, 0]}
            size={[1.07, 0.43, 0.75]}
            color={cell.name === "room:blue" ? C.orange : C.green}
            outline={C.darkInk}
          />
          <SurfaceId
            position={[0, 0.224, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={0.39}
            color={C.darkInk}
          >
            {cell.number}
          </SurfaceId>
          <SurfaceId position={[0, 0, 0.383]} scale={0.33} color={C.darkInk}>
            {cell.number}
          </SurfaceId>
          <SurfaceId
            position={[0, 0, -0.383]}
            rotation={[0, Math.PI, 0]}
            scale={0.33}
            color={C.darkInk}
          >
            {cell.number}
          </SurfaceId>
        </group>
      ))}
      <Labels labels={labels} />
    </>
  );
}

export default function SpatialScene(props: SpatialSceneProps) {
  return (
    <SceneCanvas
      sceneId={`celld-${props.kind}`}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: DEFAULT_POSE, zoom: 1, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={null}
    >
      <Camera
        kind={props.kind}
        command={props.cameraCommand}
        memory={props.cameraMemory}
      />
      <ContextGuard onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.75} />
      <directionalLight position={[-4, 8, 7]} intensity={1.6} />
      {props.kind === "named-state" ? (
        <NamedStateWorld state={props.namedState} />
      ) : props.kind === "anatomy" ? (
        <Anatomy layer={props.layer} />
      ) : props.kind === "pages" ? (
        <PageChanges step={props.pageStep} />
      ) : props.kind === "fleet" ? (
        <Fleet view={props.view} />
      ) : (
        <FailureDomainsWorld
          layout={props.failureLayout}
          phase={props.failurePhase}
        />
      )}
    </SceneCanvas>
  );
}
