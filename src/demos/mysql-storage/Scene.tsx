import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { OrthographicCamera, Spherical, Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  lookupSnapshot,
  type BufferPool,
  type Lookup,
  type PageId,
} from "./model";
import type { StorageState } from "./lessons";
import type { CameraPose, ViewCommand } from "./types";

type Point = [number, number, number];
const TARGET: Point = [0, 0.6, 0];
const DEFAULT_POSITION: Point = [4, 5.2, 10];
const ROOT: Point = [0, 2.5, -0.8];
const LEAVES: Point[] = [
  [-1.4, 1.1, -0.8],
  [1.4, 1.1, -0.8],
];
const ROWS: Point[] = [
  [-1.7, -0.9, 1],
  [0, -0.9, 1],
  [1.7, -0.9, 1],
];
const PAGE_X = { 1: -1.25, 2: 1.25 };
// sRGB equivalents of the OKLCH tokens in mysql-primer.css; Three materials need sRGB.
const MUTED = "#737373";
const ACTIVE = "#f35815";
const BLUE = "#1e9de7";
const GREEN = "#27b648";
const YELLOW = "#f2b600";
const RED = "#ff455d";

interface SceneProps {
  view: ViewCommand;
  pose: MutableRefObject<CameraPose | null>;
  onReady: () => void;
  onUnavailable: () => void;
}

function Camera({ view, pose, onUnavailable }: SceneProps) {
  const { camera, size, invalidate, gl } = useThree();
  const fittedZoom = Math.min(size.width / 7.5, size.height / 6.4);
  const initialized = useRef(false);
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
    if (!initialized.current) {
      camera.position.set(...(pose.current?.position ?? DEFAULT_POSITION));
      camera.lookAt(...TARGET);
      initialized.current = true;
    }
    // Retain the reader's orbit and relative zoom when resizing or revisiting.
    ortho.zoom = fittedZoom * (pose.current?.zoomScale ?? 1);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fittedZoom, invalidate, pose]);
  useEffect(() => {
    if (pose.current && view.revision <= pose.current.revision) return;
    const ortho = camera as OrthographicCamera;
    if (view.kind === "reset") {
      camera.position.set(...DEFAULT_POSITION);
      ortho.zoom = fittedZoom;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fittedZoom * 0.65,
        Math.min(
          fittedZoom * 1.8,
          ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const spherical = new Spherical().setFromVector3(
        camera.position.clone().sub(new Vector3(...TARGET)),
      );
      spherical.theta += view.kind === "left" ? -Math.PI / 8 : Math.PI / 8;
      camera.position.setFromSpherical(spherical).add(new Vector3(...TARGET));
    }
    camera.lookAt(...TARGET);
    ortho.updateProjectionMatrix();
    pose.current = {
      position: camera.position.toArray() as Point,
      zoomScale: ortho.zoom / fittedZoom,
      revision: view.revision,
    };
    invalidate();
    // View commands are independent of lookup/caching steps and resize fitting.
  }, [camera, view, invalidate, pose]);
  return (
    <OrbitControls
      target={TARGET}
      enablePan={false}
      enableDamping={false}
      minZoom={fittedZoom * 0.65}
      maxZoom={fittedZoom * 1.8}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2.05}
      onChange={() => {
        pose.current = {
          position: camera.position.toArray() as Point,
          zoomScale: (camera as OrthographicCamera).zoom / fittedZoom,
          revision: view.revision,
        };
        invalidate();
      }}
    />
  );
}
function Label({
  position,
  children,
  active = false,
  role = false,
}: {
  position: Point;
  children: ReactNode;
  active?: boolean;
  role?: boolean;
}) {
  return (
    <Html position={position} center zIndexRange={[2, 0]}>
      <span
        className={
          role
            ? "mysql-storage-label mysql-storage-label-role"
            : "mysql-storage-label"
        }
        data-active={active}
      >
        {children}
      </span>
    </Html>
  );
}
function Block({
  position,
  size,
  active = false,
  faint = false,
  color,
}: {
  position: Point;
  size: Point;
  active?: boolean;
  faint?: boolean;
  color?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color ?? (active ? ACTIVE : faint ? "#202020" : BLUE)}
        roughness={0.85}
      />
      <Edges
        color={color ?? (active ? "#ffb18d" : faint ? MUTED : "#87cff8")}
      />
    </mesh>
  );
}
function Wire({
  points,
  active = false,
}: {
  points: Point[];
  active?: boolean;
}) {
  return (
    <Line
      points={points}
      color={active ? ACTIVE : MUTED}
      lineWidth={active ? 2 : 1}
      dashed
      dashSize={0.08}
      gapSize={0.07}
    />
  );
}
function IndexGeometry({ lookup }: { lookup: Lookup }) {
  const snapshot = lookupSnapshot(lookup);
  const leafActive = lookup.step >= 2;
  const rowsActive = snapshot.rowFetches > 0;
  return (
    <>
      <Label position={[0, 3.35, -0.8]} role>
        Secondary index
      </Label>
      <Block
        position={ROOT}
        size={[1.65, 0.35, 0.75]}
        active={lookup.step >= 1}
      />
      <Label position={[0, 2.73, -0.8]} active={lookup.step >= 1}>
        &lt;2 | ≥2
      </Label>
      {LEAVES.map((position, i) => (
        <group key={i}>
          <Wire
            points={[
              [0, 2.32, -0.8],
              [position[0], 1.29, -0.8],
            ]}
            active={i === 0 && leafActive}
          />
          <Block
            position={position}
            size={[2.3, 0.35, 0.75]}
            active={i === 0 && leafActive}
          />
          <Label
            position={[position[0], 1.32, -0.8]}
            active={i === 0 && leafActive}
          >
            {i === 0 ? "1 → 101, 102" : "2 → 103"}
          </Label>
        </group>
      ))}
      <Block position={[0, -1.12, 1]} size={[5.5, 0.1, 1.4]} faint />
      <Label position={[0, 0.75, 1]} role>
        Clustered rows
      </Label>
      {ROWS.map((position, i) => (
        <group key={i}>
          {i < 2 && rowsActive && (
            <Wire
              active
              points={[
                [-1.4, 0.92, -0.8],
                [position[0], 0.2, 0.1],
                [position[0], -0.7, 1],
              ]}
            />
          )}
          <Block
            position={position}
            size={[1.45, 0.35, 1]}
            active={i < 2 && rowsActive}
          />
          <Label
            position={[position[0], -0.67, 1]}
            active={i < 2 && rowsActive}
          >
            PK {101 + i}
          </Label>
        </group>
      ))}
    </>
  );
}
function BufferGeometry({ buffer }: { buffer: BufferPool }) {
  return (
    <>
      <Label position={[0, 2.05, -0.4]} role>
        Buffer pool · memory
      </Label>
      <Label position={[0, 0.1, 0.5]} role>
        Pages on disk
      </Label>
      {([1, 2] as const).map((page: PageId) => {
        const x = PAGE_X[page];
        const resident = buffer.resident.includes(page);
        const active = buffer.last?.page === page;
        return (
          <group key={page}>
            <Block
              position={[x, 1.05, -0.4]}
              size={[1.9, 0.18, 1.3]}
              faint={!resident}
              active={active && resident}
            />
            <Label position={[x, 1.43, -0.4]} active={active && resident}>
              {resident ? `Page ${page}` : "Empty slot"}
            </Label>
            <Block
              position={[x, -1.12, 0.5]}
              size={[1.9, 0.38, 1.3]}
              active={active && buffer.last?.outcome === "miss"}
            />
            <Label position={[x, -0.85, 0.5]}>Page {page}</Label>
            {active && buffer.last?.outcome === "miss" && (
              <Wire
                active
                points={[
                  [x, -0.92, 0.5],
                  [x, 0.96, -0.4],
                ]}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

function Platform({
  x,
  y,
  z = 0,
  width = 2.2,
}: {
  x: number;
  y: number;
  z?: number;
  width?: number;
}) {
  return <Block position={[x, y, z]} size={[width, 0.12, 1.5]} faint />;
}
function LockingGeometry({ step }: { step: number }) {
  const owner = step === 1 || step === 2 ? "A" : step === 3 ? "B" : "none";
  return (
    <>
      <Label position={[0, 3.1, 0]} role>
        Inventory row · primary key 1
      </Label>
      <Platform x={0} y={1.65} width={2.4} />
      <Block
        position={[0, 2, 0]}
        size={[1.9, 0.5, 1]}
        color={step >= 3 ? GREEN : BLUE}
      />
      <Label position={[0, 2.5, 0]}>Stock {step >= 3 ? 0 : 1}</Label>
      <Label position={[0, 1.2, 0]} active={owner !== "none"}>
        Lock: {owner}
      </Label>
      {([-1, 1] as const).map((side, i) => {
        const x = side * 1.7;
        const name = i === 0 ? "A" : "B";
        const color =
          owner === name
            ? ACTIVE
            : i === 1 && step === 2
              ? YELLOW
              : step >= 3 && i === 0
                ? GREEN
                : BLUE;
        return (
          <group key={name}>
            <Platform x={x} y={-0.85} z={1.1} />
            <Block
              position={[x, -0.25, 1.1]}
              size={[1.1, 1, 0.8]}
              color={color}
            />
            <Label position={[x, 0.5, 1.1]}>Session {name}</Label>
            <Label position={[x, -1.3, 1.1]} role>
              {i === 0
                ? step >= 3
                  ? "Sale committed"
                  : step >= 1
                    ? "Holds lock"
                    : "Ready"
                : step === 2
                  ? "Waiting"
                  : step === 3
                    ? "Reads stock 0"
                    : step === 4
                      ? "No sale"
                      : "Ready"}
            </Label>
            <Wire
              points={[
                [x, 0.3, 1.1],
                [x, 0.9, 0],
                [0, 1.65, 0],
              ]}
              active={owner === name}
            />
          </group>
        );
      })}
    </>
  );
}
function RecoveryGeometry({ step }: { step: number }) {
  return (
    <>
      <Label position={[0, 3.1, 0]} role>
        {step === 2 ? "CRASH · MEMORY LOST" : "MEMORY · BUFFER POOL"}
      </Label>
      <Platform x={0} y={1.7} width={3} />
      <Block
        position={[0, 2, 0]}
        size={[2.2, 0.4, 1]}
        color={
          step === 2 ? RED : step === 3 ? GREEN : step === 1 ? ACTIVE : BLUE
        }
      />
      <Label position={[0, 2.45, 0]} active={step === 1}>
        {step === 2 ? "Unavailable" : `Stock ${step === 0 ? 2 : 1}`}
      </Label>
      <Label position={[-1.6, 0.4, 1]} role>
        Durable redo
      </Label>
      <Label position={[1.6, 0.4, 1]} role>
        {step === 3 ? "Recovered data page" : "Disk data page"}
      </Label>
      <Platform x={-1.6} y={-0.85} z={1} />
      <Platform x={1.6} y={-0.85} z={1} />
      <Block
        position={[-1.6, -0.35, 1]}
        size={[1.9, 0.6, 1]}
        color={step >= 1 ? GREEN : BLUE}
      />
      <Label position={[-1.6, -0.05, 1]}>
        {step >= 1 ? "Stock 2 → 1" : "No new redo"}
      </Label>
      <Block
        position={[1.6, -0.35, 1]}
        size={[1.9, 0.6, 1]}
        color={step === 3 ? GREEN : BLUE}
      />
      <Label position={[1.6, -0.05, 1]}>Stock {step === 3 ? 1 : 2}</Label>
      {step === 1 && (
        <Wire
          active
          points={[
            [0, 1.8, 0],
            [-1.6, 0.75, 0.5],
            [-1.6, -0.05, 1],
          ]}
        />
      )}
      {step === 3 && (
        <>
          <Wire
            active
            points={[
              [-0.65, -0.35, 1],
              [0, -0.35, 1],
              [0.65, -0.35, 1],
            ]}
          />
          <Label position={[0, -1.35, 1]} role>
            Redo restores missing page changes
          </Label>
        </>
      )}
    </>
  );
}
function ReplicationGeometry({ step }: { step: number }) {
  return (
    <>
      {[-1.6, 1.6].map((x, i) => {
        const count = i === 0 ? (step >= 1 ? 4 : 3) : step === 3 ? 4 : 3;
        return (
          <group key={i}>
            <Label position={[x, 3, 0]} role>
              {i === 0 ? "SOURCE · WRITES" : "REPLICA · READS"}
            </Label>
            <Platform x={x} y={-0.1} width={2.3} />
            {[0, 1, 2, 3].map((n) => (
              <group key={n}>
                <Block
                  position={[x, 0.2 + n * 0.5, 0]}
                  size={[1.7, 0.35, 0.95]}
                  faint={n >= count}
                  color={n < count ? (n === 3 ? GREEN : BLUE) : undefined}
                />
                <Label position={[x, 0.43 + n * 0.5, 0]}>
                  {n < count ? `Order ${101 + n}` : "104 absent"}
                </Label>
              </group>
            ))}
            <Label position={[x, -0.55, 0]}>{count} orders</Label>
            <Block
              position={[x, -1.1, 1.3]}
              size={[1.9, 0.15, 0.65]}
              color={(i === 0 ? step >= 1 : step >= 2) ? YELLOW : undefined}
            />
            <Label position={[x, -1.45, 1.3]} role>
              {i === 0 ? "Binary log" : "Relay log"}
            </Label>
          </group>
        );
      })}
      <Wire
        points={[
          [-0.65, -1.1, 1.3],
          [0.65, -1.1, 1.3],
        ]}
        active={step >= 2}
      />
      <Label position={[0, 0.6, 1.3]} role>
        {step === 1
          ? "Not received"
          : step === 2
            ? "Apply pending"
            : step === 3
              ? "Caught up"
              : "No change"}
      </Label>
    </>
  );
}
export default function MySqlStorageScene(props: SceneProps & StorageState) {
  return (
    <SceneCanvas
      sceneId={`mysql-${props.kind}`}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: DEFAULT_POSITION, near: 0.1, far: 100 }}
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={<p>3D unavailable; follow the controls and result below.</p>}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 8, 6]} intensity={1.5} />
      <Camera {...props} />
      {props.kind === "index" ? (
        <IndexGeometry lookup={props.lookup} />
      ) : props.kind === "buffer" ? (
        <BufferGeometry buffer={props.buffer} />
      ) : props.kind === "locking" ? (
        <LockingGeometry step={props.step} />
      ) : props.kind === "recovery" ? (
        <RecoveryGeometry step={props.step} />
      ) : (
        <ReplicationGeometry step={props.step} />
      )}
    </SceneCanvas>
  );
}
