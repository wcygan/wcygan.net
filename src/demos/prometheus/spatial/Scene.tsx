import { seriesValue } from "./intro-model";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  OrthographicCamera,
  Spherical,
  Vector3,
} from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  cardinalitySnapshot,
  storageSnapshot,
  type CardinalityScenario,
} from "./model";

export type SceneKind =
  | "cardinality"
  | "storage"
  | "architecture"
  | "series"
  | "alerts";
export interface ViewCommand {
  kind: "reset" | "left" | "right" | "up" | "down" | "in" | "out";
  revision: number;
}
type Point = [number, number, number];
interface Props {
  kind: SceneKind;
  scenario: CardinalityScenario;
  selectedIndex: number;
  onSelect: (index: number) => void;
  step: number;
  animate: boolean;
  reducedMotion: boolean;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}

function Label({
  position,
  children,
  accent = false,
}: {
  position: Point;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <Html
      center
      position={position}
      zIndexRange={[2, 0]}
      className={`prometheus-spatial-label${accent ? " prometheus-spatial-label--accent" : ""}`}
    >
      {children}
    </Html>
  );
}

function Box({
  position,
  size,
  color = "#0e73cc",
  outline = "#76c5ff",
}: {
  position: Point;
  size: Point;
  color?: string;
  outline?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
      <Edges color={outline} />
    </mesh>
  );
}

/** A newly scraped sample grows from its own baseline, then stops rendering. */
function SampleGrowth({
  position,
  animate,
  reducedMotion,
  complete,
  children,
}: {
  position: Point;
  animate: boolean;
  reducedMotion: boolean;
  complete: boolean;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const startsAnimated = useRef(animate);
  const { invalidate } = useThree();
  useLayoutEffect(() => {
    elapsed.current = startsAnimated.current ? 0 : 0.6;
    group.current?.scale.set(1, startsAnimated.current ? 0.02 : 1, 1);
    invalidate();
  }, [invalidate]);
  useLayoutEffect(() => {
    if (reducedMotion || complete) {
      elapsed.current = 0.6;
      group.current?.scale.set(1, 1, 1);
      invalidate();
    } else if (animate && elapsed.current < 0.6) invalidate();
  }, [animate, reducedMotion, complete, invalidate]);
  useFrame((_, delta) => {
    if (!animate || elapsed.current >= 0.6 || !group.current) return;
    elapsed.current = Math.min(0.6, elapsed.current + Math.min(delta, 0.04));
    const t = elapsed.current / 0.6;
    group.current.scale.y = 1 - (1 - t) ** 3;
    if (t < 1) invalidate();
  });
  return (
    <group ref={group} position={position}>
      {children}
    </group>
  );
}

const PIPELINE_ROUTES: Point[][] = [
  [
    [-2.25, 0.5, -1.5],
    [-1.5, 0.5, -1.5],
    [-1.5, 0.5, 0],
    [-0.75, 0.5, 0],
  ],
  [
    [0.75, 0.5, 0],
    [1.5, 0.5, 0],
    [1.5, 0.5, 1.5],
    [2.25, 0.5, 1.5],
  ],
];

/** The payload follows the very same facing ports and bends as its connector. */
function Transfer({
  route,
  animate,
  color,
  reducedMotion,
}: {
  route: Point[];
  animate: boolean;
  color: string;
  reducedMotion: boolean;
}) {
  const packet = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const startsAnimated = useRef(animate);
  const { invalidate } = useThree();
  const path = useMemo(() => {
    const points = route.map((point) => new Vector3(...point));
    const lengths = points
      .slice(1)
      .map((point, index) => point.distanceTo(points[index]));
    return { points, lengths, total: lengths.reduce((sum, n) => sum + n, 0) };
  }, [route]);
  useLayoutEffect(() => {
    elapsed.current = startsAnimated.current ? 0 : 1.1;
    packet.current?.position.copy(
      path.points[startsAnimated.current ? 0 : path.points.length - 1],
    );
    invalidate();
  }, [path, invalidate]);
  useLayoutEffect(() => {
    if (reducedMotion) {
      elapsed.current = 1.1;
      packet.current?.position.copy(path.points[path.points.length - 1]);
      invalidate();
    } else if (animate && elapsed.current < 1.1) invalidate();
  }, [animate, reducedMotion, path, invalidate]);
  useFrame((_, delta) => {
    if (!animate || elapsed.current >= 1.1 || !packet.current) return;
    elapsed.current = Math.min(1.1, elapsed.current + Math.min(delta, 0.04));
    let distance = (elapsed.current / 1.1) * path.total;
    for (let i = 0; i < path.lengths.length; i++) {
      if (distance <= path.lengths[i] || i === path.lengths.length - 1) {
        packet.current.position.lerpVectors(
          path.points[i],
          path.points[i + 1],
          Math.min(1, distance / path.lengths[i]),
        );
        break;
      }
      distance -= path.lengths[i];
    }
    if (elapsed.current < 1.1) invalidate();
  });
  return (
    <mesh ref={packet} position={route[0]}>
      <sphereGeometry args={[0.12, 12, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Camera({
  view,
  kind,
  onUnavailable,
}: Pick<Props, "view" | "kind" | "onUnavailable">) {
  const { camera, gl, size, invalidate } = useThree();
  const width = kind === "cardinality" ? 10 : 11.5;
  const height = kind === "cardinality" ? 7 : 5.8;
  const fit = Math.min(size.width / width, size.height / height);
  const target = useMemo<Point>(
    () => (kind === "cardinality" ? [0, 1.3, 0] : [0, 0.6, 0]),
    [kind],
  );
  const previousFit = useRef<number | null>(null);
  const currentFit = useRef(fit);
  currentFit.current = fit;
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
    // A resize preserves both the reader's orbit and their relative zoom.
    ortho.zoom = previousFit.current
      ? (ortho.zoom * fit) / previousFit.current
      : fit;
    previousFit.current = fit;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fit, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    const fittedZoom = currentFit.current;
    if (view.kind === "reset") {
      camera.position.set(
        ...(kind === "cardinality"
          ? ([8, 7.5, 10] as Point)
          : ([5, 6, 12] as Point)),
      );
      ortho.zoom = fittedZoom;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fittedZoom * 0.7,
        Math.min(
          fittedZoom * 2.2,
          ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const center = new Vector3(...target);
      const orbit = new Spherical().setFromVector3(
        camera.position.clone().sub(center),
      );
      if (view.kind === "left" || view.kind === "right")
        orbit.theta += view.kind === "left" ? -Math.PI / 9 : Math.PI / 9;
      else
        orbit.phi = Math.max(
          0.25,
          Math.min(
            Math.PI / 2 - 0.1,
            orbit.phi + (view.kind === "up" ? -Math.PI / 12 : Math.PI / 12),
          ),
        );
      camera.position.setFromSpherical(orbit).add(center);
    }
    camera.lookAt(...target);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, kind, target, view, invalidate]);
  return (
    <OrbitControls
      target={target}
      enablePan={false}
      enableDamping={false}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.1}
      minZoom={fit * 0.7}
      maxZoom={fit * 2.2}
    />
  );
}

function Cardinality({
  scenario,
  selectedIndex,
  onSelect,
}: Pick<Props, "scenario" | "selectedIndex" | "onSelect">) {
  const mesh = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  const series = useMemo(
    () => cardinalitySnapshot(scenario).series,
    [scenario],
  );
  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    const matrix = new Matrix4();
    series.forEach((record, index) => {
      const x = (record.methodIndex - 0.5) * 3.25;
      const y = record.statusIndex * 2 + 0.6;
      const z = (record.routeIndex - 1) * 2.4;
      // The fourth label dimension subdivides each observed method/route/status
      // cell. Rendering is bounded to the 120 actually emitted demo series.
      const subX =
        scenario === "users" ? ((record.userIndex % 2) - 0.5) * 0.55 : 0;
      const subZ =
        scenario === "users" ? (Math.floor(record.userIndex / 2) - 2) * 0.4 : 0;
      const scale = scenario === "users" ? 0.35 : 0.9;
      matrix.compose(
        new Vector3(x + subX, y, z + subZ),
        instances.quaternion,
        new Vector3(scale, scale, scale),
      );
      instances.setMatrixAt(index, matrix);
      instances.setColorAt(
        index,
        new Color(
          index === selectedIndex
            ? "#f35815"
            : record.status === "500"
              ? "#ff455d"
              : "#27b648",
        ),
      );
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    instances.computeBoundingSphere();
    invalidate();
  }, [series, scenario, selectedIndex, invalidate]);
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    onSelect(event.instanceId);
  };
  return (
    <>
      {[0, 1].map((status) => (
        <group key={status}>
          <Line
            points={[
              [-2.55, status * 2, -3.55],
              [2.55, status * 2, -3.55],
              [2.55, status * 2, 3.55],
              [-2.55, status * 2, 3.55],
              [-2.55, status * 2, -3.55],
            ]}
            color="#818181"
            dashed
            dashSize={0.12}
            gapSize={0.12}
          />
          <Label position={[3.15, status * 2 + 0.65, 0]}>
            status {status ? "500" : "200"}
          </Label>
        </group>
      ))}
      <instancedMesh
        key={scenario}
        ref={mesh}
        args={[undefined, undefined, series.length]}
        onClick={select}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </instancedMesh>
      <Label position={[-1.625, 0.1, 3.65]}>GET</Label>
      <Label position={[1.625, 0.1, 3.65]}>POST</Label>
      {["/orders", "/search", "/health"].map((route, index) => (
        <Label key={route} position={[-3.35, 0.1, (index - 1) * 2.4]}>
          {route}
        </Label>
      ))}
    </>
  );
}

const timeX = (hour: number) => (hour - 5) * 0.85;

function IntroScene({
  kind,
  step,
  animate,
  reducedMotion,
}: Pick<Props, "kind" | "step" | "animate" | "reducedMotion">) {
  if (kind === "series")
    return (
      <>
        {[0, 1].map((lane) => (
          <group key={lane}>
            <Line
              points={[
                [-3.8, 0, lane * 2 - 1],
                [3.8, 0, lane * 2 - 1],
              ]}
              color="#818181"
              dashed
              dashSize={0.12}
              gapSize={0.1}
            />
            <Label position={[-4.1, 1, lane * 2 - 1]}>
              app {lane ? "B" : "A"}
            </Label>
            {Array.from({ length: step + 1 }, (_, i) => {
              const height = seriesValue(lane, i) / 6;
              return (
                <group key={i}>
                  <SampleGrowth
                    position={[-2.7 + i * 1.8, 0, lane * 2 - 1]}
                    animate={animate && i === step}
                    reducedMotion={reducedMotion}
                    complete={i < step}
                  >
                    <Box
                      position={[0, height / 2, 0]}
                      size={[0.65, height, 0.65]}
                      color={lane ? "#0e73cc" : "#f35815"}
                    />
                  </SampleGrowth>
                  <Label
                    position={[-2.7 + i * 1.8, height + 0.45, lane * 2 - 1]}
                  >
                    {seriesValue(lane, i)}
                  </Label>
                </group>
              );
            })}
          </group>
        ))}
        <Label position={[0, -0.3, 2.3]}>time → · 15 s between samples</Label>
      </>
    );
  if (kind === "alerts")
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <group key={i}>
            <Box
              position={[-3 + i * 2, 0.3, 0]}
              size={[1.3, 0.6, 1.3]}
              color={
                i <= step ? (step === 3 ? "#ff455d" : "#f2b600") : "#1c1c1c"
              }
            />
            <Label position={[-3 + i * 2, 1.2, 0]}>{i * 10} s</Label>
          </group>
        ))}
        <Line
          points={[
            [-3, 0.3, 0.8],
            [3, 0.3, 0.8],
          ]}
          color="#818181"
          dashed
          dashSize={0.12}
          gapSize={0.12}
        />
        <Label position={[0, 2.3, -1]}>
          {step === 3
            ? "FIRING · sustained 30 s"
            : `PENDING · ${step * 10} / 30 s`}
        </Label>
        <Label position={[0, -0.3, 2]}>
          error ratio 25% &gt; threshold 20%
        </Label>
      </>
    );
  const nodes: { label: string; position: Point; color: string }[] = [
    { label: "APPLICATION", position: [-3, 0.5, -1.5], color: "#f35815" },
    { label: "PROMETHEUS", position: [0, 0.5, 0], color: "#0e73cc" },
    {
      label: step === 3 ? "ALERTMANAGER" : "QUERY / RULE",
      position: [3, 0.5, 1.5],
      color: step === 3 ? "#ff455d" : "#27b648",
    },
  ];
  return (
    <>
      {nodes.map((n) => (
        <group key={n.label}>
          <Box position={n.position} size={[1.5, 1, 1.5]} color={n.color} />
          <Label position={[n.position[0], 1.6, n.position[2]]}>
            {n.label}
          </Label>
        </group>
      ))}
      <Line
        points={PIPELINE_ROUTES[0]}
        color={step >= 1 ? "#f35815" : "#818181"}
        dashed
        dashSize={0.12}
        gapSize={0.1}
      />
      <Line
        points={PIPELINE_ROUTES[1]}
        color={step >= 2 ? "#27b648" : "#818181"}
        dashed
        dashSize={0.12}
        gapSize={0.1}
      />
      {step > 0 && (
        <Transfer
          key={step}
          route={PIPELINE_ROUTES[step === 1 ? 0 : 1]}
          animate={animate}
          reducedMotion={reducedMotion}
          color={step === 1 ? "#f35815" : step === 3 ? "#ff455d" : "#27b648"}
        />
      )}
      <Label position={[0, -0.3, 2.5]}>
        {
          [
            "1 · expose /metrics",
            "2 · scrape and store",
            "3 · query measurements",
            "4 · route firing alerts",
          ][step]
        }
      </Label>
    </>
  );
}

function Storage({ step }: Pick<Props, "step">) {
  const state = storageSnapshot(step);
  const headX = timeX((state.head.startHour + state.head.endHour) / 2);
  const headWidth = (state.head.endHour - state.head.startHour) * 0.85 - 0.1;
  return (
    <>
      <Line
        points={[
          [-4.35, -0.12, 2.3],
          [4.35, -0.12, 2.3],
        ]}
        color="#818181"
      />
      {[0, 2, 4, 6, 8, 10].map((hour) => (
        <Line
          key={hour}
          points={[
            [timeX(hour), -0.12, 2.2],
            [timeX(hour), -0.12, 2.42],
          ]}
          color="#818181"
        />
      ))}
      <Label position={[-4.25, -0.15, 2.8]}>0 h</Label>
      <Label position={[4.25, -0.15, 2.8]}>10 h</Label>
      {state.blocks.map((block) => {
        const x = timeX((block.startHour + block.endHour) / 2);
        return (
          <group key={block.id}>
            <Box
              position={[x, 0.35, -0.7]}
              size={[(block.endHour - block.startHour) * 0.85 - 0.12, 0.7, 1.5]}
            />
            <Label position={[x, 1.1, -0.75]}>
              {block.startHour}–{block.endHour} h
            </Label>
          </group>
        );
      })}
      {state.deletedRange && (
        <>
          <Line
            points={[
              [timeX(0), 0, -1.45],
              [timeX(6) - 0.12, 0, -1.45],
              [timeX(6) - 0.12, 0, 0.05],
              [timeX(0), 0, 0.05],
              [timeX(0), 0, -1.45],
            ]}
            color="#ff455d"
            dashed
            dashSize={0.1}
            gapSize={0.14}
          />
          <Label position={[timeX(3), 0.5, -0.7]}>0–6 h expired</Label>
        </>
      )}
      <Box
        position={[headX, 0.35, -0.7]}
        size={[headWidth, 0.7, 1.5]}
        color="#1c1c1c"
        outline="#f35815"
      />
      <Line
        points={[
          [headX, 1.05, -0.75],
          [headX, 2.3, -0.75],
        ]}
        color="#818181"
      />
      <Label position={[headX, 2.6, -0.75]}>
        Head {state.head.startHour}–{state.head.endHour} h
      </Label>
      {Array.from({ length: state.head.samples }, (_, index) => (
        <Box
          key={`head-${index}`}
          position={[
            headX + ((index % 3) - 1) * 0.33,
            0.83,
            -0.95 + Math.floor(index / 3) * 0.48,
          ]}
          size={[0.22, 0.22, 0.22]}
          color={state.recovery ? "#f35815" : "#f2b600"}
        />
      ))}
      <Box
        position={[headX, 0.03, 1.35]}
        size={[headWidth, 0.12, 0.75]}
        color="#1c1c1c"
      />
      {Array.from({ length: state.walSamples }, (_, index) => (
        <Box
          key={`wal-${index}`}
          position={[
            headX + ((index % 3) - 1) * 0.33,
            0.2,
            1.2 + Math.floor(index / 3) * 0.3,
          ]}
          size={[0.2, 0.2, 0.2]}
          color="#f2b600"
        />
      ))}
      <Label position={[headX, 0.3, 2.15]} accent={state.recovery}>
        WAL{state.recovery ? " → Head" : ""}
      </Label>
      <Line
        points={[
          [headX, 0.2, 1],
          [headX, 0.2, 0.3],
          [headX, 0.8, 0.3],
          [headX, 0.8, -0.05],
        ]}
        color={state.recovery ? "#f35815" : "#818181"}
        dashed
        dashSize={0.1}
        gapSize={0.1}
      />
      <Label position={[-2.5, 2.4, -2.05]}>Immutable blocks</Label>
    </>
  );
}

export default function Scene(props: Props) {
  return (
    <SceneCanvas
      sceneId={`prometheus-${props.kind}`}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: [8, 7.5, 10], near: 0.1, far: 100 }}
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <Camera
        view={props.view}
        kind={props.kind}
        onUnavailable={props.onUnavailable}
      />
      <ambientLight intensity={1.7} />
      <directionalLight position={[-3, 8, 5]} intensity={2} />
      {props.kind === "cardinality" ? (
        <Cardinality
          scenario={props.scenario}
          selectedIndex={props.selectedIndex}
          onSelect={props.onSelect}
        />
      ) : props.kind === "storage" ? (
        <Storage step={props.step} />
      ) : (
        <IntroScene
          kind={props.kind}
          step={props.step}
          animate={props.animate}
          reducedMotion={props.reducedMotion}
        />
      )}
    </SceneCanvas>
  );
}
