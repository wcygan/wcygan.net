import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { OrthographicCamera, Quaternion, Spherical, Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  RUNTIME_CONTROL_EDGES,
  RUNTIME_DATA_EDGES,
  keyedSnapshot,
  recoverySnapshot,
  runtimeSnapshot,
  shuffleSnapshot,
  skewSnapshot,
  barrierSnapshot,
  type Key,
  type RuntimeNodeId,
} from "./model";

export type SceneKind =
  | "keyed"
  | "runtime"
  | "recovery"
  | "shuffle"
  | "skew"
  | "barrier";
export interface ViewCommand {
  kind: "reset" | "left" | "right" | "in" | "out";
  revision: number;
}
import {
  KEY_SOURCE,
  KEY_Z,
  LIVE_COUNT,
  LIVE_OFFSET,
  SAVED_COUNT,
  SAVED_OFFSET,
  RUNTIME_POSITION,
  face,
  keyRoute,
  keyTray,
  recoveryInputRoute,
  recoveryRecord,
  runtimeBox,
  runtimeRoute,
  snapshotRoute,
  shuffleBox,
  shuffleRoute,
  skewTray,
  BARRIER_INPUTS,
  BARRIER_OPERATOR,
  BARRIER_STORAGE,
  barrierInputRoute,
  type Point,
} from "./geometry";
import { FLINK_COLORS as C } from "../flink-shared/palette";
interface Props {
  kind: SceneKind;
  step: number;
  balanced: boolean;
  moving: boolean;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}
const TARGET: Point = [0, 0.35, 0];
const DEFAULT_POSE: Point = [-6, 9, 12];
const MOBILE_POSE: Point = [-4, 13, 12];
const NEUTRAL = C.platform;
const INK = C.edge;
const ACTIVE = C.orange;
const KEY_COLOR: Record<Key, string> = {
  Ada: C.blue,
  Bo: C.orange,
  Cy: C.green,
};
const Motion = createContext({ step: 0, moving: false });

function Camera({
  view,
  onUnavailable,
}: Pick<Props, "view" | "onUnavailable">) {
  const { camera, size, invalidate, gl } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const lastFit = useRef<number | null>(null);
  const fitted = Math.min(size.width / 10.8, size.height / 8.5);
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
    // Resize fits the scene while retaining a deliberate user zoom multiplier.
    ortho.zoom = fitted * (lastFit.current ? ortho.zoom / lastFit.current : 1);
    lastFit.current = fitted;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fitted, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    const fitted = lastFit.current ?? 32;
    if (view.kind === "reset") {
      camera.position.set(...(size.width < 480 ? MOBILE_POSE : DEFAULT_POSE));
      ortho.zoom = fitted;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fitted * 0.65,
        Math.min(
          fitted * 1.8,
          ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const offset = camera.position.clone().sub(new Vector3(...TARGET));
      const spherical = new Spherical().setFromVector3(offset);
      spherical.theta += view.kind === "left" ? -Math.PI / 8 : Math.PI / 8;
      camera.position.setFromSpherical(spherical).add(new Vector3(...TARGET));
    }
    camera.lookAt(...TARGET);
    ortho.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
    // Only commands change the pose; records and playback never reset it.
  }, [camera, view, invalidate]);
  return (
    <OrbitControls
      ref={controls}
      target={TARGET}
      enablePan={false}
      enableDamping={false}
      enableRotate
      enableZoom
      minZoom={fitted * 0.65}
      maxZoom={fitted * 1.8}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}

function Block({
  at,
  size,
  color = NEUTRAL,
  outline = INK,
}: {
  at: Point;
  size: Point;
  color?: string;
  outline?: string;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.16}
        roughness={0.9}
        toneMapped={false}
      />
      <Edges color={outline} />
    </mesh>
  );
}

/** Mesh ports, the stroke, and its arrow tip all share one world-space route. */
function Route({
  points,
  active = false,
  dashed = false,
  tone = C.orange as string,
}: {
  points: Point[];
  active?: boolean;
  dashed?: boolean;
  tone?: string;
}) {
  const geometry = useMemo(() => {
    const tip = new Vector3(...points[points.length - 1]);
    const previous = new Vector3(...points[points.length - 2]);
    const direction = tip.clone().sub(previous).normalize();
    const base = tip.clone().addScaledVector(direction, -0.19);
    return {
      line: [...points.slice(0, -1), base.toArray() as Point],
      center: tip.clone().addScaledVector(direction, -0.09).toArray() as Point,
      rotation: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction,
      ),
    };
  }, [points]);
  const color = active ? tone : C.edge;
  return (
    <>
      <Line
        points={geometry.line}
        color={color}
        lineWidth={active ? 2.5 : 1.2}
        dashed={dashed || !active}
        dashSize={0.16}
        gapSize={0.12}
      />
      {active && !dashed && <RoutedRecord points={points} color={tone} />}
      <mesh position={geometry.center} quaternion={geometry.rotation}>
        <coneGeometry args={[0.07, 0.18, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

/** Retained payload follows the same route as its wire. No state on frame ticks. */
function RoutedRecord({ points, color }: { points: Point[]; color: string }) {
  const { step, moving } = useContext(Motion);
  const mesh = useRef<import("three").Mesh>(null);
  const progress = useRef(0);
  const { invalidate } = useThree();
  const signature = points.flat().join(",");
  const route = useMemo(() => {
    const vertices = points.map((p) => new Vector3(...p));
    const lengths = vertices.slice(1).map((v, i) => v.distanceTo(vertices[i]));
    return { vertices, lengths, total: lengths.reduce((a, b) => a + b, 0) };
  }, [signature]);
  const place = (t: number) => {
    let distance = t * route.total;
    for (let i = 0; i < route.lengths.length; i++) {
      if (distance <= route.lengths[i] || i === route.lengths.length - 1) {
        mesh.current?.position
          .copy(route.vertices[i])
          .lerp(
            route.vertices[i + 1],
            route.lengths[i] === 0
              ? 1
              : Math.min(1, distance / route.lengths[i]),
          );
        break;
      }
      distance -= route.lengths[i];
    }
  };
  useEffect(() => {
    progress.current = moving ? 0 : 1;
    place(progress.current);
    invalidate();
  }, [step, signature]);
  useEffect(() => {
    if (moving) invalidate();
  }, [moving, invalidate]);
  useFrame((_, delta) => {
    if (!moving || progress.current >= 1) return;
    progress.current = Math.min(
      1,
      progress.current + Math.min(delta, 0.05) / 1.4,
    );
    place(progress.current);
    if (progress.current < 1) invalidate();
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.09, 12, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

interface SceneLabel {
  id: string;
  at: Point;
  text: string;
  active?: boolean;
}
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width + 5 &&
  a.x + a.width + 5 > b.x &&
  a.y < b.y + b.height + 5 &&
  a.y + a.height + 5 > b.y;
const origin = () => [0, 0];

/** Upright callouts are laid out together after orbit, never on a continuous loop. */
function Labels({ labels }: { labels: SceneLabel[] }) {
  const { camera, size, invalidate } = useThree();
  const elements = useRef(new Map<string, HTMLSpanElement>());
  const lines = useRef(new Map<string, SVGLineElement>());
  const previous = useRef("");
  useEffect(() => {
    previous.current = "";
    invalidate();
  }, [labels, invalidate]);
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
    const project = (at: Point) => {
      const p = new Vector3(...at).project(camera);
      return {
        x: ((p.x + 1) * size.width) / 2,
        y: ((1 - p.y) * size.height) / 2,
      };
    };
    const occupied: Rect[] = [];
    const ordered = labels
      .map((label) => ({ label, anchor: project(label.at) }))
      .sort((a, b) => a.anchor.y - b.anchor.y);
    for (const { label, anchor } of ordered) {
      const element = elements.current.get(label.id);
      if (!element) continue;
      const width = element.offsetWidth,
        height = element.offsetHeight;
      const candidate = (x: number, y: number): Rect => ({
        x: Math.max(4, Math.min(size.width - width - 4, x)),
        y: Math.max(4, Math.min(size.height - height - 4, y)),
        width,
        height,
      });
      const candidates = [
        candidate(anchor.x - width / 2, anchor.y - height - 12),
        candidate(anchor.x - width / 2, anchor.y + 12),
      ];
      for (const delta of [34, 62, 90]) {
        candidates.push(
          candidate(anchor.x - width / 2, anchor.y - height - delta),
        );
        candidates.push(candidate(anchor.x - width / 2, anchor.y + delta));
        candidates.push(
          candidate(anchor.x - width - delta, anchor.y - height / 2),
        );
        candidates.push(candidate(anchor.x + delta, anchor.y - height / 2));
      }
      // Dense edge-on views still retain every direct label, with leader lines.
      for (let y = 6; y < size.height - height; y += height + 8) {
        for (let x = 6; x < size.width - width; x += width + 8)
          candidates.push(candidate(x, y));
      }
      const place =
        candidates.find((rect) =>
          occupied.every((other) => !overlaps(rect, other)),
        ) ?? candidates[0];
      occupied.push(place);
      element.style.transform = `translate3d(${place.x}px,${place.y}px,0)`;
      const line = lines.current.get(label.id);
      if (line) {
        line.setAttribute("x1", String(anchor.x));
        line.setAttribute("y1", String(anchor.y));
        line.setAttribute(
          "x2",
          String(Math.max(place.x, Math.min(anchor.x, place.x + width))),
        );
        line.setAttribute(
          "y2",
          String(Math.max(place.y, Math.min(anchor.y, place.y + height))),
        );
      }
    }
  });
  return (
    <Html
      calculatePosition={origin}
      zIndexRange={[2, 2]}
      className="flink-spatial-label-layer"
    >
      <svg
        className="flink-spatial-label-lines"
        width={size.width}
        height={size.height}
      >
        {labels.map((label) => (
          <line
            key={label.id}
            ref={(node) => {
              if (node) lines.current.set(label.id, node);
              else lines.current.delete(label.id);
            }}
            stroke={C.dim}
            strokeWidth="0.8"
          />
        ))}
      </svg>
      {labels.map((label) => (
        <span
          key={label.id}
          className="flink-spatial-label"
          data-active={label.active ?? false}
          ref={(node) => {
            if (node) elements.current.set(label.id, node);
            else elements.current.delete(label.id);
          }}
        >
          {label.text}
        </span>
      ))}
    </Html>
  );
}

function KeyedWorld({ step }: { step: number }) {
  const state = keyedSnapshot(step);
  const labels: SceneLabel[] = [
    {
      id: "input",
      at: [-3.5, 0.8, 0],
      text: state.current
        ? `Record ${state.current.id} · ${state.current.key}`
        : "Input records",
    },
    { id: "task0", at: [2.8, 0, -1.4], text: "Subtask 0" },
    { id: "task1", at: [2.8, 0, 2.5], text: "Subtask 1" },
    ...(["Ada", "Bo", "Cy"] as Key[]).map((key) => ({
      id: key,
      at: [0.65, 0.85, KEY_Z[key]] as Point,
      text: `${key} · count ${state.counts[key]}`,
      active: state.current?.key === key,
    })),
  ];
  return (
    <>
      <Block {...KEY_SOURCE} color={C.blue} outline={C.blue} />
      <Block
        at={[0.8, -0.22, -1.4]}
        size={[4.6, 0.18, 3.75]}
        color={C.platform}
      />
      <Block
        at={[0.8, -0.22, 2.5]}
        size={[4.6, 0.18, 1.6]}
        color={C.platform}
      />
      {(["Ada", "Bo", "Cy"] as Key[]).map((key) => (
        <group key={key}>
          <Block {...keyTray(key)} color={C.panel} outline={KEY_COLOR[key]} />
          <Route
            points={keyRoute(key)}
            tone={KEY_COLOR[key]}
            active={state.current?.key === key}
          />
          {Array.from({ length: state.counts[key] }, (_, index) => (
            <Block
              key={index}
              at={[-0.45 + index * 0.8, 0.38, KEY_Z[key]]}
              size={[0.65, 0.65, 0.66]}
              color={KEY_COLOR[key]}
              outline={KEY_COLOR[key]}
            />
          ))}
        </group>
      ))}
      <Labels labels={labels} />
    </>
  );
}

function RuntimeWorld({ step }: { step: number }) {
  const state = runtimeSnapshot(step);
  const labels: SceneLabel[] = [
    {
      id: "jobmanager",
      at: [0, 1, -4.2],
      text: "JobManager",
      active: state.action === "deploy",
    },
    { id: "tm0", at: [0, -0.08, -2.7], text: "TaskManager 0" },
    { id: "tm1", at: [0, -0.08, 2.7], text: "TaskManager 1" },
    { id: "input", at: [-4.2, 0.95, 0], text: "Input" },
    { id: "sink", at: [4.2, 0.95, 0], text: "Sink" },
    ...(["source-0", "source-1", "count-0", "count-1"] as const).map((id) => ({
      id,
      at: [RUNTIME_POSITION[id][0], 1, RUNTIME_POSITION[id][2]] as Point,
      text: id.replace("-", " "),
      active: state.dataPath.at(-1) === id,
    })),
  ];
  return (
    <>
      {([0, 1] as const).map((worker) => (
        <Block
          key={worker}
          {...runtimeBox(`taskmanager-${worker}`)}
          color={C.platform}
        />
      ))}
      {[
        "jobmanager",
        "input",
        "sink",
        "source-0",
        "source-1",
        "count-0",
        "count-1",
      ].map((id) => (
        <Block
          key={id}
          {...runtimeBox(id as RuntimeNodeId)}
          color={
            id === "sink"
              ? C.green
              : id.startsWith("source") || id === "input"
                ? C.blue
                : C.orange
          }
        />
      ))}
      {[...RUNTIME_CONTROL_EDGES, ...RUNTIME_DATA_EDGES].map((edge) => (
        <Route
          key={edge.id}
          points={runtimeRoute(edge)}
          dashed={edge.kind === "control"}
          tone={
            edge.kind === "control"
              ? C.yellow
              : edge.to === "sink"
                ? C.green
                : C.blue
          }
          active={state.activeEdgeIds.includes(edge.id)}
        />
      ))}
      <Labels labels={labels} />
    </>
  );
}

function RecoveryWorld({ step }: { step: number }) {
  const state = recoverySnapshot(step);
  const lost = state.count === null;
  const saving = state.action === "checkpoint";
  const restoring = state.action === "restore";
  const sourcePath = recoveryInputRoute(state.currentOffset ?? 0);
  const snapshotSource = snapshotRoute(LIVE_OFFSET, SAVED_OFFSET);
  const snapshotCount = snapshotRoute(LIVE_COUNT, SAVED_COUNT);
  const labels: SceneLabel[] = [
    { id: "log", at: [-3.15, 0.8, 0], text: "Replayable source · 0–4" },
    {
      id: "worker",
      at: [0, -0.15, 2.05],
      text: lost ? "Worker crashed" : "Worker local state",
      active: lost,
    },
    {
      id: "offset",
      at: [0, 0.95, -0.9],
      text:
        state.nextOffset === null
          ? "Position lost"
          : `Next offset ${state.nextOffset}`,
      active: restoring,
    },
    {
      id: "count",
      at: [0, 0.95, 0.9],
      text: state.count === null ? "Count lost" : `Count ${state.count}`,
      active: restoring,
    },
    { id: "durable", at: [3.05, -0.05, 2], text: "Checkpoint storage" },
    {
      id: "snapshot-offset",
      at: [3.05, 0.95, -0.75],
      text: state.checkpoint
        ? `Saved offset ${state.checkpoint.nextOffset}`
        : "No checkpoint",
      active: saving,
    },
    ...(state.checkpoint
      ? [
          {
            id: "snapshot-count",
            at: [3.05, 0.95, 0.75] as Point,
            text: `Saved count ${state.checkpoint.count}`,
            active: saving,
          },
        ]
      : []),
  ];
  return (
    <>
      <Block at={[-3.15, -0.02, 0]} size={[2.5, 0.2, 3.2]} color={C.platform} />
      {Array.from({ length: 5 }, (_, offset) => (
        <Block
          key={offset}
          {...recoveryRecord(offset)}
          color={C.blue}
          outline={state.currentOffset === offset ? ACTIVE : INK}
        />
      ))}
      <Block
        at={[0, -0.25, 0]}
        size={[2.2, 0.2, 3.8]}
        color={C.platform}
        outline={lost ? C.red : C.edge}
      />
      <Block {...LIVE_OFFSET} color={lost ? C.red : C.orange} />
      <Block {...LIVE_COUNT} color={lost ? C.red : C.orange} />
      <Block
        at={[3.05, -0.15, 0]}
        size={[1.8, 0.3, 3.3]}
        color={C.panel}
        outline={C.yellow}
      />
      {state.checkpoint &&
        [SAVED_OFFSET, SAVED_COUNT].map((box) => (
          <Block key={box.at[2]} {...box} color={C.yellow} outline={C.yellow} />
        ))}
      <Route
        points={sourcePath}
        tone={C.blue}
        active={state.action === "consume" || state.action === "replay"}
      />
      <Route
        points={[face(LIVE_OFFSET, 2, 1), face(LIVE_COUNT, 2, -1)]}
        active={state.action === "consume" || state.action === "replay"}
      />
      {[snapshotSource, snapshotCount].map((path, index) => (
        <Route
          key={index}
          points={restoring ? [...path].reverse() : path}
          dashed
          tone={C.yellow}
          active={saving || restoring}
        />
      ))}
      <Labels labels={labels} />
    </>
  );
}

function ShuffleWorld({ step }: { step: number }) {
  const state = shuffleSnapshot(step);
  const labels: SceneLabel[] = [];
  for (const lane of [0, 1] as const) {
    const source = shuffleBox("source", lane),
      owner = shuffleBox("owner", lane);
    labels.push({
      id: `source-${lane}`,
      at: [source.at[0], 1.2, source.at[2]],
      text: `Source ${lane}`,
    });
    labels.push({
      id: `owner-${lane}`,
      at: [owner.at[0], 1.2, owner.at[2]],
      text: `${lane === 0 ? "Ada" : "Cy"} · ${lane === 0 ? state.counts.Ada : state.counts.Cy} records`,
    });
  }
  return (
    <>
      {([0, 1] as const).map((lane) => (
        <group key={lane}>
          <Block {...shuffleBox("source", lane)} color={C.blue} />
          <Block
            at={[2.9, -0.12, lane === 0 ? -1.6 : 1.6]}
            size={[2.3, 0.16, 1.6]}
            outline={lane === 0 ? C.blue : C.green}
          />
          {state.delivered
            .filter((r) => r.key === (lane === 0 ? "Ada" : "Cy"))
            .map((r, index) => (
              <Block
                key={r.id}
                at={[2.55 + index * 0.65, 0.32, lane === 0 ? -1.6 : 1.6]}
                size={[0.5, 0.65, 0.75]}
                color={lane === 0 ? C.blue : C.green}
              />
            ))}
          {([0, 1] as const).map((owner) => (
            <Route
              key={owner}
              points={shuffleRoute(lane, owner)}
              tone={owner === 0 ? C.blue : C.green}
              active={
                state.current?.source === lane &&
                (state.current.key === "Ada" ? 0 : 1) === owner
              }
            />
          ))}
        </group>
      ))}
      <Labels labels={labels} />
    </>
  );
}

function SkewWorld({ step, balanced }: { step: number; balanced: boolean }) {
  const state = skewSnapshot(step, balanced);
  const source = {
    at: [-3.4, 0.4, 0] as Point,
    size: [1.2, 0.8, 1.2] as Point,
  };
  const colors = balanced
    ? [C.blue, C.green, C.orange, C.yellow]
    : [C.blue, C.green, C.edge, C.edge];
  const labels: SceneLabel[] = [
    { id: "source", at: [-3.4, 1, 0], text: `Source · ${state.unread} unread` },
  ];
  for (let lane = 0; lane < 4; lane++)
    labels.push({
      id: `lane-${lane}`,
      at: [0.8, 0.8, skewTray(lane).at[2]],
      text: `Worker ${lane} · queue ${state.queued[lane]}`,
      active: state.queued[lane] > 1,
    });
  return (
    <>
      <Block {...source} color={C.blue} />
      {state.queued.map((count, lane) => {
        const tray = skewTray(lane),
          a = face(source, 0, 1),
          b = face(tray, 0, -1);
        return (
          <group key={lane}>
            <Block {...tray} outline={colors[lane]} />
            <Route
              points={[a, [-2.3, a[1], a[2]], [-2.3, b[1], b[2]], b]}
              tone={colors[lane]}
              active={step > 0 && step <= 3 && (balanced || lane < 2)}
            />
            {Array.from({ length: count }, (_, i) => (
              <Block
                key={i}
                at={[-0.7 + i * 0.42, 0.26, tray.at[2]]}
                size={[0.32, 0.5, 0.6]}
                color={colors[lane]}
                outline={colors[lane]}
              />
            ))}
          </group>
        );
      })}
      <Labels labels={labels} />
    </>
  );
}

function BarrierWorld({ step }: { step: number }) {
  const state = barrierSnapshot(step);
  const labels: SceneLabel[] = [
    {
      id: "a",
      at: [-3.1, 0.9, -1.3],
      text: state.blocked ? "A · paused at barrier 7" : "Channel A",
    },
    {
      id: "b",
      at: [-3.1, 0.9, 1.3],
      text: state.bBarrier ? "B · barrier 7 arrived" : "Channel B",
    },
    { id: "sum", at: [0, 1.25, 0], text: `Live sum ${state.sum}` },
    {
      id: "snapshot",
      at: [3.2, 1.1, 0],
      text:
        state.saved === null
          ? "No snapshot yet"
          : `Checkpoint 7 · sum ${state.saved}`,
      active: step === 5,
    },
    ...(state.buffered
      ? [
          {
            id: "waiting",
            at: [-3.1, 0.75, -2.2] as Point,
            text: "A2 (+10) · buffered",
          },
        ]
      : []),
  ];
  const a = face(BARRIER_OPERATOR, 0, 1),
    b = face(BARRIER_STORAGE, 0, -1);
  return (
    <>
      {BARRIER_INPUTS.map((box, lane) => (
        <group key={lane}>
          <Block {...box} color={C.blue} />
          {(lane === 0 ? state.aBarrier : state.bBarrier) && (
            <Block
              at={[box.at[0] + 0.3, 0.74, box.at[2]]}
              size={[0.14, 0.12, 1.06]}
              color={C.yellow}
              outline={C.yellow}
            />
          )}
          <Route
            points={barrierInputRoute(lane)}
            tone={
              (lane === 0 ? state.aBarrier : state.bBarrier) ? C.yellow : C.blue
            }
            active={
              lane === 0 ? [1, 2, 6].includes(step) : [3, 5].includes(step)
            }
          />
        </group>
      ))}
      {state.buffered && (
        <Block at={[-3.1, 0.2, -2.2]} size={[0.5, 0.4, 0.5]} color={C.blue} />
      )}
      <Block {...BARRIER_OPERATOR} color={C.orange} />
      <Block at={[3.2, -0.08, 0]} size={[1.8, 0.16, 1.8]} outline={C.yellow} />
      <mesh position={BARRIER_STORAGE.at}>
        <cylinderGeometry args={[0.65, 0.65, 0.9, 32]} />
        <meshStandardMaterial
          color={state.saved === null ? C.panel : C.yellow}
          roughness={0.9}
          emissive={C.yellow}
          emissiveIntensity={state.saved === null ? 0 : 0.12}
        />
        <Edges color={C.yellow} />
      </mesh>
      <Route points={[a, b]} active={step === 5} dashed tone={C.yellow} />
      <Labels labels={labels} />
    </>
  );
}

function World({ kind, step, view, onUnavailable, balanced }: Props) {
  let lesson: ReactNode;
  if (kind === "keyed") lesson = <KeyedWorld step={step} />;
  else if (kind === "runtime") lesson = <RuntimeWorld step={step} />;
  else if (kind === "recovery") lesson = <RecoveryWorld step={step} />;
  else if (kind === "shuffle") lesson = <ShuffleWorld step={step} />;
  else if (kind === "skew")
    lesson = <SkewWorld step={step} balanced={balanced} />;
  else lesson = <BarrierWorld step={step} />;
  return (
    <>
      <Camera view={view} onUnavailable={onUnavailable} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-4, 9, 6]} intensity={2} />
      <directionalLight position={[6, 4, -3]} intensity={0.5} />
      {lesson}
    </>
  );
}
export default function FlinkSpatialScene(props: Props) {
  return (
    <SceneCanvas
      sceneId={`flink-${props.kind}`}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: DEFAULT_POSE, zoom: 35, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={<p>3D is unavailable. The state and controls remain below.</p>}
    >
      <Motion.Provider value={{ step: props.step, moving: props.moving }}>
        <World {...props} />
      </Motion.Provider>
    </SceneCanvas>
  );
}
