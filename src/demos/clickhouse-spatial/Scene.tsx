import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type RefObject,
} from "react";
import {
  CanvasTexture,
  Group,
  Mesh,
  OrthographicCamera,
  Quaternion,
  Spherical,
  SRGBColorSpace,
  Vector3,
} from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { CLICKHOUSE_COLORS as C } from "~/demos/clickhouse-theme";
import {
  aggregateShards,
  COLUMN_FIELDS,
  COLUMN_ROWS,
  columnReadWork,
  COORDINATOR_POSITION,
  COUNTRY_VALUES,
  DICTIONARY_SIZE,
  dictionaryPosition,
  dictionaryRoute,
  encodeCountries,
  ENCODED_ID_SIZE,
  encodedIdPosition,
  MONTH_PARTITIONS,
  PART_SIZE,
  PART_QUERY_POSITION,
  PART_QUERY_SIZE,
  partPosition,
  partQueryRoute,
  PARTITION_QUERY_POSITION,
  PARTITION_QUERY_SIZE,
  PARTITION_TRAY_SIZE,
  partitionPosition,
  partitionRoute,
  queryRoute,
  replicaCopyRoute,
  replicaPosition,
  REPLICA_SIZE,
  rowPosition,
  SHARDS,
  type ColumnLayout,
  type Month,
  type PartsState,
  type Point,
  type ReplicaSelection,
} from "./model";
import { buildRoutePath, sampleRoutePath, spatialPassFrame } from "./motion";

export type SceneKind =
  | "columns"
  | "compression"
  | "parts"
  | "partitions"
  | "cluster";
export interface ViewCommand {
  kind: "reset" | "left" | "right" | "up" | "down" | "in" | "out";
  revision: number;
}
interface Props {
  kind: SceneKind;
  parts: PartsState;
  selection: ReplicaSelection;
  queried: boolean;
  layout: ColumnLayout;
  encoded: boolean;
  dictionaryRow: number;
  month: Month | "all";
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
  running: boolean;
  fractionRef: RefObject<number>;
  reducedMotion: boolean;
  settled: boolean;
}
type SpatialMotion = Pick<
  Props,
  "running" | "fractionRef" | "reducedMotion" | "settled"
>;
const MotionContext = createContext<SpatialMotion | null>(null);
type Tone = "orange" | "blue" | "green" | "yellow" | "purple" | "muted";
const TARGETS: Record<SceneKind, Point> = {
  columns: [0, 0, 0],
  compression: [0, 0.1, 0],
  parts: [0, 0.2, 0.7],
  partitions: [0, 0, 0.9],
  cluster: [0, 0, 1.2],
};
const POSES: Record<SceneKind, Point> = {
  columns: [4, 7, 9],
  compression: [4, 6, 10],
  parts: [4, 5, 9],
  partitions: [4, 7, 11],
  cluster: [5, 7.5, 12],
};
const BOUNDS: Record<SceneKind, [number, number]> = {
  columns: [7.8, 6.3],
  compression: [8, 5.8],
  parts: [8, 5.7],
  partitions: [9.8, 7.7],
  cluster: [11, 9.2],
};
const FIELD_TONES: Tone[] = ["blue", "purple", "yellow", "green"];
const COUNTRY_TONES: Tone[] = ["blue", "purple", "green"];
const KEY_TONES: Tone[] = ["blue", "green", "orange", "purple", "yellow"];

function Camera({ kind, view }: Pick<Props, "kind" | "view">) {
  const { camera, size, invalidate } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const previousFit = useRef<number | null>(null);
  const fit = Math.min(
    size.width / BOUNDS[kind][0],
    size.height / BOUNDS[kind][1],
  );
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom =
      fit * (previousFit.current ? ortho.zoom / previousFit.current : 1);
    previousFit.current = fit;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fit, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    const fitted = previousFit.current ?? fit;
    const target = new Vector3(...TARGETS[kind]);
    if (view.kind === "reset") {
      camera.position.set(...POSES[kind]);
      ortho.zoom = fitted;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fitted * 0.7,
        Math.min(
          fitted * 1.8,
          ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const pose = new Spherical().setFromVector3(
        camera.position.clone().sub(target),
      );
      if (view.kind === "left") pose.theta -= Math.PI / 10;
      if (view.kind === "right") pose.theta += Math.PI / 10;
      if (view.kind === "up") pose.phi -= Math.PI / 14;
      if (view.kind === "down") pose.phi += Math.PI / 14;
      pose.phi = Math.max(0.18, Math.min(Math.PI / 2.05, pose.phi));
      camera.position.setFromSpherical(pose).add(target);
    }
    camera.lookAt(target);
    ortho.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
    // Only explicit commands change pose. Responsive fitting retains user zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, kind, view.kind, view.revision, invalidate]);
  return (
    <OrbitControls
      ref={controls}
      target={TARGETS[kind]}
      enablePan={false}
      enableDamping={false}
      enableRotate
      enableZoom
      minZoom={fit * 0.7}
      maxZoom={fit * 1.8}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

function ContextGuard({ onUnavailable }: Pick<Props, "onUnavailable">) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const previous = gl.domElement.style.touchAction;
    gl.domElement.style.touchAction = "pan-y";
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      gl.domElement.style.touchAction = previous;
      gl.domElement.removeEventListener("webglcontextlost", lost);
    };
  }, [gl, onUnavailable]);
  return null;
}

function Box({
  position,
  size,
  color = C.panel,
  outline = C.dim,
}: {
  position: Point;
  size: Point;
  color?: string;
  outline?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.95} />
      <Edges color={outline} />
    </mesh>
  );
}

/** Small IDs are physical surface marks; the main labels remain upright HTML. */
function SurfaceText({
  text,
  position,
  rotation,
  width = 0.55,
  height = width / 2,
  color = C.bg,
}: {
  text: string;
  position: Point;
  rotation?: Point;
  width?: number;
  height?: number;
  color?: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = color;
    context.font = "600 96px ui-monospace, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 128, 64);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

interface Label {
  id: string;
  text: string;
  position: Point;
  tone?: Tone;
}
interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
const ORIGIN = () => [0, 0];
const overlaps = (a: LabelRect, b: LabelRect) =>
  a.x < b.x + b.width + 8 &&
  a.x + a.width + 8 > b.x &&
  a.y < b.y + b.height + 8 &&
  a.y + a.height + 8 > b.y;

/** Reproject sparse labels together only when the camera, viewport, or data change. */
function Labels({ labels }: { labels: Label[] }) {
  const { camera, size, invalidate } = useThree();
  const spans = useRef(new Map<string, HTMLSpanElement>());
  const lines = useRef(new Map<string, SVGLineElement>());
  const previous = useRef("");
  useEffect(() => {
    previous.current = "";
    invalidate();
  }, [labels, size.width, size.height, invalidate]);
  useFrame(() => {
    camera.updateMatrixWorld();
    const signature = [
      ...camera.matrixWorld.elements,
      ...camera.projectionMatrix.elements,
      size.width,
      size.height,
    ].join(",");
    if (signature === previous.current) return;
    previous.current = signature;
    const used: LabelRect[] = [];
    const projected = labels
      .map((label) => {
        const point = new Vector3(...label.position).project(camera);
        return {
          label,
          x: ((point.x + 1) * size.width) / 2,
          y: ((1 - point.y) * size.height) / 2,
        };
      })
      .sort((a, b) => a.y - b.y);
    for (const { label, x, y } of projected) {
      const span = spans.current.get(label.id),
        line = lines.current.get(label.id);
      if (!span || !line) continue;
      const width = span.offsetWidth,
        height = span.offsetHeight;
      let rect: LabelRect | undefined;
      for (const dy of [-32, -64, 10, -96, 40, 72]) {
        for (const dx of [0, -80, 80]) {
          const candidate = {
            x: Math.max(
              8,
              Math.min(size.width - width - 8, x - width / 2 + dx),
            ),
            y: Math.max(8, Math.min(size.height - height - 8, y + dy)),
            width,
            height,
          };
          if (!used.some((other) => overlaps(candidate, other))) {
            rect = candidate;
            break;
          }
        }
        if (rect) break;
      }
      span.style.visibility = rect ? "visible" : "hidden";
      line.style.visibility = rect ? "visible" : "hidden";
      if (!rect) continue;
      used.push(rect);
      span.style.transform = `translate3d(${rect.x}px,${rect.y}px,0)`;
      line.setAttribute(
        "x1",
        String(Math.max(rect.x, Math.min(x, rect.x + width))),
      );
      line.setAttribute(
        "y1",
        String(Math.max(rect.y, Math.min(y, rect.y + height))),
      );
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(y));
    }
  });
  return (
    <Html
      calculatePosition={ORIGIN}
      zIndexRange={[2, 2]}
      className="clickhouse-spatial-labels"
    >
      <svg width={size.width} height={size.height} aria-hidden="true">
        {labels.map((label) => (
          <line
            key={label.id}
            ref={(line) => {
              if (line) lines.current.set(label.id, line);
              else lines.current.delete(label.id);
            }}
          />
        ))}
      </svg>
      {labels.map((label) => (
        <span
          key={label.id}
          data-tone={label.tone}
          ref={(span) => {
            if (span) spans.current.set(label.id, span);
            else spans.current.delete(label.id);
            previous.current = "";
            invalidate(); // Html can commit after the first demand frame.
          }}
        >
          {label.text}
        </span>
      ))}
    </Html>
  );
}

/** The last route segment owns the shaft trim, arrow direction, and exact tip. */
function Route({
  points,
  color = C.orange,
}: {
  points: Point[];
  color?: string;
}) {
  const arrow = useMemo(() => {
    const tip = new Vector3(...points[points.length - 1]);
    const direction = tip
      .clone()
      .sub(new Vector3(...points[points.length - 2]))
      .normalize();
    return {
      shaft: [
        ...points.slice(0, -1),
        tip.clone().addScaledVector(direction, -0.14).toArray() as Point,
      ],
      center: tip.clone().addScaledVector(direction, -0.07),
      rotation: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction,
      ),
    };
  }, [points]);
  return (
    <>
      <Line
        points={arrow.shaft}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={0.12}
        gapSize={0.08}
      />
      <mesh position={arrow.center} quaternion={arrow.rotation}>
        <coneGeometry args={[0.065, 0.14, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <RoutePacket points={points} color={color} />
    </>
  );
}

/** One causal pass per tour beat. The settled connector remains afterward. */
function RoutePacket({ points, color }: { points: Point[]; color: string }) {
  const motion = useContext(MotionContext)!;
  const packet = useRef<Mesh>(null);
  const path = useMemo(() => buildRoutePath(points), [points]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [motion.running, motion.reducedMotion, motion.settled, path, invalidate]);
  useFrame(() => {
    if (!packet.current) return;
    const { fraction, schedule } = spatialPassFrame(
      motion.fractionRef.current,
      motion.running,
      motion.reducedMotion,
      motion.settled,
    );
    packet.current.visible = fraction !== null;
    if (fraction === null) return;
    packet.current.position.set(...sampleRoutePath(path, fraction));
    if (schedule) invalidate();
  });
  return (
    <mesh ref={packet} visible={false}>
      <sphereGeometry args={[0.085, 10, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** Depth is record order; the scanner touches only the selected column lanes. */
function ColumnReadCursor({ layout }: Pick<Props, "layout">) {
  const motion = useContext(MotionContext)!;
  const cursor = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [
    layout,
    motion.running,
    motion.reducedMotion,
    motion.settled,
    invalidate,
  ]);
  useFrame(() => {
    if (!cursor.current) return;
    const { fraction, schedule } = spatialPassFrame(
      motion.fractionRef.current,
      motion.running,
      motion.reducedMotion,
      motion.settled,
    );
    cursor.current.visible = fraction !== null;
    if (fraction === null) return;
    cursor.current.position.z = -2.03 + fraction * 4.06;
    if (schedule) invalidate();
  });
  const lanes = layout === "rows" ? [0] : [-1.65, 1.65];
  return (
    <group ref={cursor} visible={false}>
      {lanes.map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <boxGeometry args={[layout === "rows" ? 4.5 : 0.97, 0.04, 0.07]} />
          <meshBasicMaterial color={C.orange} />
        </mesh>
      ))}
    </group>
  );
}

function Columns({ layout, queried }: Pick<Props, "layout" | "queried">) {
  const work = columnReadWork(layout);
  const labels = useMemo<Label[]>(
    () => [
      ...COLUMN_FIELDS.map((field, index) => ({
        id: field,
        text: field === "amount" ? "revenue (cents)" : field,
        position: [(index - 1.5) * 1.1, 0.5, -2.3] as Point,
        tone:
          queried &&
          layout === "columns" &&
          !work.selectedFields.includes(field)
            ? ("muted" as const)
            : FIELD_TONES[index],
      })),
      {
        id: "layout",
        text: queried
          ? `${work.readValues} values read`
          : "6 records · 4 fields",
        position: [0, 0.25, 2.7],
        tone: "orange",
      },
    ],
    [layout, queried, work.readValues, work.selectedFields],
  );
  return (
    <>
      {layout === "rows"
        ? COLUMN_ROWS.map((_, row) => (
            <Box
              key={row}
              position={[0, -0.14, (row - 2.5) * 0.7]}
              size={[4.5, 0.16, 0.61]}
              outline={queried ? C.orange : C.dim}
            />
          ))
        : COLUMN_FIELDS.map((field, index) => (
            <Box
              key={field}
              position={[(index - 1.5) * 1.1, -0.14, 0]}
              size={[0.97, 0.16, 4.3]}
              outline={
                queried && work.selectedFields.includes(field)
                  ? C.orange
                  : C.dim
              }
            />
          ))}
      {COLUMN_ROWS.flatMap((row, rowIndex) =>
        COLUMN_FIELDS.map((field, fieldIndex) => {
          const read =
            !queried ||
            layout === "rows" ||
            work.selectedFields.includes(field);
          const color = C[FIELD_TONES[fieldIndex]];
          const text =
            field === "day"
              ? row.day.slice(-2)
              : String(row[field]).slice(0, 3);
          return (
            <group
              key={`${rowIndex}-${field}`}
              position={[
                (fieldIndex - 1.5) * 1.1,
                0.15,
                (rowIndex - 2.5) * 0.7,
              ]}
            >
              <Box
                position={[0, 0, 0]}
                size={[0.8, 0.38, 0.5]}
                color={read ? color : C.panel}
                outline={read ? color : C.dim}
              />
              <SurfaceText
                text={text}
                position={[0, 0.196, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                width={0.73}
                height={0.43}
                color={read ? C.bg : C.muted}
              />
            </group>
          );
        }),
      )}
      {queried && <ColumnReadCursor layout={layout} />}
      <Labels labels={labels} />
    </>
  );
}

function Compression({
  encoded,
  dictionaryRow,
}: Pick<Props, "encoded" | "dictionaryRow">) {
  const dictionary = useMemo(() => encodeCountries(COUNTRY_VALUES), []);
  const selectedId = dictionary.ids[dictionaryRow];
  const selectedTone = COUNTRY_TONES[selectedId];
  const labels = useMemo<Label[]>(
    () =>
      encoded
        ? [
            ...dictionary.dictionary.map((country, index) => ({
              id: country,
              text: `${index} → ${country}`,
              position: [-2.2, 0.45, dictionaryPosition(index)[2]] as Point,
              tone: COUNTRY_TONES[index],
            })),
            {
              id: "ids",
              text: "12 IDs · row order",
              position: [1.25, 0.1, 2.1],
              tone: "yellow",
            },
            {
              id: "row",
              text: `row ${dictionaryRow + 1} · ID ${selectedId}`,
              position: [
                encodedIdPosition(dictionaryRow)[0],
                0.55,
                encodedIdPosition(dictionaryRow)[2],
              ],
              tone: selectedTone,
            },
          ]
        : [
            {
              id: "raw",
              text: "12 repeated labels",
              position: [0, 0.2, 2.2],
              tone: "yellow",
            },
          ],
    [encoded, dictionary, dictionaryRow, selectedId, selectedTone],
  );
  return (
    <>
      {encoded ? (
        <>
          <Box
            position={[-2.2, -0.3, 0]}
            size={[1.75, 0.12, 3.9]}
            outline={C.purple}
          />
          <Box
            position={[1.275, -0.3, 0]}
            size={[3.25, 0.12, 3.9]}
            outline={C.yellow}
          />
          {dictionary.dictionary.map((country, index) => (
            <group key={country} position={dictionaryPosition(index)}>
              <Box
                position={[0, 0, 0]}
                size={DICTIONARY_SIZE}
                color={C[COUNTRY_TONES[index]]}
                outline={
                  index === selectedId ? C.text : C[COUNTRY_TONES[index]]
                }
              />
              <SurfaceText
                text={country}
                position={[0, 0.181, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                width={1.0}
                height={0.55}
              />
            </group>
          ))}
          {dictionary.ids.map((id, row) => (
            <group key={row} position={encodedIdPosition(row)}>
              <Box
                position={[0, 0, 0]}
                size={ENCODED_ID_SIZE}
                color={C[COUNTRY_TONES[id]]}
                outline={row === dictionaryRow ? C.text : C[COUNTRY_TONES[id]]}
              />
              <SurfaceText
                text={String(id)}
                position={[0, 0.181, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                width={0.47}
                height={0.48}
              />
            </group>
          ))}
          <Route
            points={dictionaryRoute(dictionaryRow, selectedId)}
            color={C[selectedTone]}
          />
        </>
      ) : (
        <>
          <Box
            position={[0, -0.3, 0]}
            size={[4.7, 0.12, 3.9]}
            outline={C.yellow}
          />
          {COUNTRY_VALUES.map((country, row) => (
            <group
              key={row}
              position={[
                ((row % 4) - 1.5) * 1.1,
                0,
                (Math.floor(row / 4) - 1) * 1.25,
              ]}
            >
              <Box
                position={[0, 0, 0]}
                size={[0.95, 0.35, 0.9]}
                color={C[COUNTRY_TONES[dictionary.dictionary.indexOf(country)]]}
                outline={C.dim}
              />
              <SurfaceText
                text={country}
                position={[0, 0.181, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                width={0.88}
                height={0.55}
              />
            </group>
          ))}
        </>
      )}
      <Labels labels={labels} />
    </>
  );
}

function Parts({ parts, queried }: Pick<Props, "parts" | "queried">) {
  const labels = useMemo<Label[]>(
    () => [
      ...parts.parts.map((part, index) => {
        const position = partPosition(index, parts.parts.length);
        return {
          id: part.id,
          text: `${part.id} · ${part.rows.length} sorted rows`,
          position: [2.85, position[1] + 0.4, 0] as Point,
          tone:
            part.id === "P1"
              ? ("blue" as const)
              : part.id === "P2"
                ? ("purple" as const)
                : ("green" as const),
        };
      }),
      {
        id: "query",
        text: queried
          ? `count() = ${parts.parts.reduce((total, part) => total + part.rows.length, 0)}`
          : "query active parts",
        position: [0, 0.85, PART_QUERY_POSITION[2]],
        tone: "orange",
      },
    ],
    [parts, queried],
  );
  return (
    <>
      {parts.parts.map((part, partIndex) => {
        const tone =
          part.id === "P1" ? C.blue : part.id === "P2" ? C.purple : C.green;
        return (
          <group key={part.id}>
            <group position={partPosition(partIndex, parts.parts.length)}>
              <Box
                position={[0, 0, 0]}
                size={PART_SIZE}
                color={C.panel}
                outline={tone}
              />
              {part.rows.map((row, index) => (
                <group
                  key={index}
                  position={rowPosition(index, part.rows.length)}
                >
                  <Box
                    position={[0, 0, 0]}
                    size={[0.65, 0.34, 1.1]}
                    color={C[KEY_TONES[row.key - 1]]}
                    outline={queried ? C.text : C[KEY_TONES[row.key - 1]]}
                  />
                  <SurfaceText
                    text={String(row.key)}
                    position={[0, 0.176, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    width={0.59}
                    height={0.7}
                  />
                  <SurfaceText
                    text={String(row.key)}
                    position={[0, 0, 0.556]}
                    width={0.59}
                  />
                  <SurfaceText
                    text={String(row.key)}
                    position={[0, 0, -0.556]}
                    rotation={[0, Math.PI, 0]}
                    width={0.59}
                  />
                </group>
              ))}
            </group>
            {queried && (
              <Route points={partQueryRoute(partIndex, parts.parts.length)} />
            )}
          </group>
        );
      })}
      <Box
        position={PART_QUERY_POSITION}
        size={PART_QUERY_SIZE}
        color={C.orange}
        outline={C.orange}
      />
      <Labels labels={labels} />
    </>
  );
}

function Partitions({ month }: Pick<Props, "month">) {
  const tones: Tone[] = ["blue", "purple", "green"];
  const labels = useMemo<Label[]>(
    () => [
      ...MONTH_PARTITIONS.map((group, index) => ({
        id: group.month,
        text: `${group.month} · ${month === "all" || group.month === month ? "4 rows" : "pruned"}`,
        position: [partitionPosition(index)[0], 0.75, 0] as Point,
        tone:
          month === "all" || group.month === month
            ? tones[index]
            : ("muted" as const),
      })),
      {
        id: "query",
        text: month === "all" ? "query all months" : `query ${month}`,
        position: [0, 0.9, PARTITION_QUERY_POSITION[2]],
        tone: "orange",
      },
    ],
    [month],
  );
  return (
    <>
      {MONTH_PARTITIONS.map((group, index) => {
        const selected = month === "all" || group.month === month;
        const color = C[tones[index]];
        const position = partitionPosition(index);
        return (
          <group key={group.month}>
            <Box
              position={position}
              size={PARTITION_TRAY_SIZE}
              outline={selected ? color : C.dim}
            />
            {group.parts.map((part, partIndex) => (
              <group
                key={part.id}
                position={[position[0], 0, (partIndex - 0.5) * 1.5]}
              >
                <Box
                  position={[0, 0, 0]}
                  size={[1.58, 0.12, 1.25]}
                  outline={selected ? color : C.dim}
                />
                {part.rows.map((row, rowIndex) => (
                  <group
                    key={row.key}
                    position={[(rowIndex - 0.5) * 0.73, 0.26, 0]}
                  >
                    <Box
                      position={[0, 0, 0]}
                      size={[0.61, 0.35, 0.84]}
                      color={selected ? color : C.panel}
                      outline={selected ? color : C.dim}
                    />
                    <SurfaceText
                      text={String(row.key)}
                      position={[0, 0.181, 0]}
                      rotation={[-Math.PI / 2, 0, 0]}
                      width={0.56}
                      height={0.65}
                      color={selected ? C.bg : C.dim}
                    />
                  </group>
                ))}
              </group>
            ))}
            {selected && <Route points={partitionRoute(index)} />}
          </group>
        );
      })}
      <Box
        position={PARTITION_QUERY_POSITION}
        size={PARTITION_QUERY_SIZE}
        color={C.orange}
        outline={C.orange}
      />
      <Labels labels={labels} />
    </>
  );
}

function Cluster({ selection, queried }: Pick<Props, "selection" | "queried">) {
  const aggregate = aggregateShards(selection);
  const labels = useMemo<Label[]>(
    () => [
      ...SHARDS.flatMap((shard, index) =>
        (["A", "B"] as const).map((replica) => {
          const position = replicaPosition(index, replica),
            active = queried && selection[index] === replica;
          return {
            id: `${shard.id}-${replica}`,
            text: `S${shard.id}/${replica}${active ? ` · sum ${aggregate.partials[index].sum}` : " · copy"}`,
            position: [position[0], 0.65, position[2]] as Point,
            tone: active
              ? ("orange" as const)
              : index === 0
                ? ("blue" as const)
                : ("green" as const),
          };
        }),
      ),
      {
        id: "coordinator",
        text: queried ? "60 + 150 = 210" : "query coordinator",
        position: [0, 1.15, COORDINATOR_POSITION[2]],
        tone: "orange",
      },
    ],
    [selection, queried, aggregate.partials],
  );
  return (
    <>
      {SHARDS.map((shard, index) => (
        <group key={shard.id}>
          <Box
            position={[shard.positionX, -0.4, 0]}
            size={[3.1, 0.1, 4.4]}
            outline={index === 0 ? C.blue : C.green}
          />
          {(["A", "B"] as const).map((replica) => (
            <group key={replica} position={replicaPosition(index, replica)}>
              <Box
                position={[0, 0, 0]}
                size={REPLICA_SIZE}
                outline={
                  queried && selection[index] === replica
                    ? C.orange
                    : index === 0
                      ? C.blue
                      : C.green
                }
              />
              {shard.amounts.map((amount, row) => (
                <group key={amount} position={[(row - 1) * 0.72, 0.4, 0]}>
                  <Box
                    position={[0, 0, 0]}
                    size={[0.6, 0.22, 0.87]}
                    color={index === 0 ? C.blue : C.green}
                    outline={index === 0 ? C.blue : C.green}
                  />
                  <SurfaceText
                    text={String(amount)}
                    width={0.56}
                    height={0.65}
                    position={[0, 0.116, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  />
                  <SurfaceText
                    text={String(amount)}
                    width={0.56}
                    position={[0, 0, 0.441]}
                  />
                  <SurfaceText
                    text={String(amount)}
                    width={0.56}
                    position={[0, 0, -0.441]}
                    rotation={[0, Math.PI, 0]}
                  />
                </group>
              ))}
            </group>
          ))}
          <Line
            points={replicaCopyRoute(index)}
            color={C.purple}
            lineWidth={1.2}
            dashed
            dashSize={0.1}
            gapSize={0.1}
          />
          {queried && <Route points={queryRoute(index, selection[index])} />}
        </group>
      ))}
      <Box
        position={COORDINATOR_POSITION}
        size={[1.6, 0.5, 0.9]}
        color={C.orange}
        outline={C.orange}
      />
      <Labels labels={labels} />
    </>
  );
}

export default function ClickHouseSpatialScene(props: Props) {
  return (
    <SceneCanvas
      sceneId={`clickhouse-${props.kind}`}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: POSES[props.kind], zoom: 1, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={null}
    >
      <Camera kind={props.kind} view={props.view} />
      <ContextGuard onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[-4, 8, 7]} intensity={1.6} />
      <MotionContext.Provider value={props}>
        {props.kind === "columns" && (
          <Columns layout={props.layout} queried={props.queried} />
        )}
        {props.kind === "compression" && (
          <Compression
            encoded={props.encoded}
            dictionaryRow={props.dictionaryRow}
          />
        )}
        {props.kind === "parts" && (
          <Parts parts={props.parts} queried={props.queried} />
        )}
        {props.kind === "partitions" && <Partitions month={props.month} />}
        {props.kind === "cluster" && (
          <Cluster selection={props.selection} queried={props.queried} />
        )}
      </MotionContext.Provider>
    </SceneCanvas>
  );
}
