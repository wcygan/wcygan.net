import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, Mesh, OrthographicCamera, Spherical, Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import type {
  ConsensusFrame,
  ConsensusNode,
  ConsensusSceneProps,
  ConsensusTopic,
} from "./types";
import {
  colorStyle,
  ENTRY_EMPTY,
  ENTRY_PENDING,
  entryColor,
  nodeColor,
  type PaletteColor,
  SNAPSHOT_COLOR,
  termColor,
} from "./colors";

type Point = [number, number, number];
type Positions = Record<string, Point>;
const INK = "#45433d";
const PAPER = "#f7f6f3";
const LINE = "#9b978d";
const FOCUS = "#a66939";
const TARGET: Point = [0, 0.2, 0];
const DEFAULT_CAMERA: Point = [0.4, 18, 9];
const LOG_CENTER_X = 1.8;
const LOG_NODE_X = -3.7;
const LOG_ROW_SPACING = 3.3;

function Overlay({
  position,
  priority,
  children,
}: {
  position: Point;
  priority: number;
  children: ReactNode;
}) {
  return (
    <Html
      center
      position={position}
      zIndexRange={priority > 1 ? [4, 3] : [2, 0]}
    >
      {children}
    </Html>
  );
}

function NodeLabel({
  node,
  position,
  acknowledged,
}: {
  node: ConsensusNode;
  position: Point;
  acknowledged?: boolean;
}) {
  const status =
    node.role === "leader"
      ? "leader"
      : node.role === "candidate"
        ? "candidate"
        : `follower of ${node.leader ?? "—"}`;
  const leaderColor =
    node.role === "leader"
      ? nodeColor(node.id)
      : node.leader
        ? nodeColor(node.leader)
        : ENTRY_EMPTY;
  return (
    <Overlay position={position} priority={2}>
      <div className="consensus-node-label" data-node-id={node.id}>
        <div className="consensus-node-heading">
          <strong
            className="consensus-metadata-chip"
            style={colorStyle(nodeColor(node.id))}
          >
            {node.id}
            {node.offline ? " ×" : acknowledged ? " ✓" : ""}
          </strong>
          <span
            className="consensus-metadata-chip"
            style={colorStyle(termColor(node.term))}
          >
            T{node.term}
          </span>
        </div>
        <span
          className="consensus-node-role"
          data-leader={node.role === "leader" || undefined}
          style={colorStyle(leaderColor)}
        >
          {status}
        </span>
      </div>
    </Overlay>
  );
}

// Remember the reader's camera across remounts, independently of playback and
// model state.
const cameraPoses = new Map<
  ConsensusTopic,
  { position: Point; zoomScale: number; top: boolean }
>();

function Label({
  position,
  children,
  kind = "note",
  committed,
  focused,
  palette,
}: {
  position: Point;
  children: ReactNode;
  kind?: "entry" | "note";
  committed?: boolean;
  focused?: boolean;
  palette?: PaletteColor;
}) {
  return (
    <Overlay position={position} priority={kind === "entry" ? 1 : 0}>
      <span
        className={`consensus-scene-label consensus-scene-${kind}`}
        data-committed={committed || undefined}
        data-focused={focused || undefined}
        data-colored={palette ? true : undefined}
        style={palette ? colorStyle(palette) : undefined}
      >
        {children}
      </span>
    </Overlay>
  );
}

function Block({
  position,
  size,
  color = PAPER,
  focused = false,
}: {
  position: Point;
  size: Point;
  color?: string;
  focused?: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
      <Edges color={focused ? FOCUS : LINE} lineWidth={focused ? 2 : 1} />
    </mesh>
  );
}

function SettlingGroup({
  active,
  reduced,
  children,
}: Pick<ConsensusSceneProps, "active" | "reduced"> & {
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => invalidate(), [active, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!group.current) return;
    if (active) elapsed.current += Math.min(delta, 0.05);
    if (reduced) elapsed.current = 0.7;
    const progress = reduced ? 1 : Math.min(1, elapsed.current / 0.7);
    const eased = 1 - (1 - progress) ** 3;
    group.current.position.y = (1 - eased) * 0.75;
    if (active && progress < 1) invalidate();
  });
  return (
    <group ref={group} position={[0, reduced ? 0 : 0.75, 0]}>
      {children}
    </group>
  );
}

function Camera({
  lesson,
  top,
  cameraCommand,
  onUnavailable,
}: Pick<
  ConsensusSceneProps,
  "lesson" | "top" | "cameraCommand" | "onUnavailable"
>) {
  const { camera, gl, size, invalidate } = useThree();
  const count = Math.max(...lesson.frames.map((frame) => frame.nodes.length));
  const depth =
    lesson.layout === "logs"
      ? Math.max(10.4, count * LOG_ROW_SPACING + 2)
      : 16.8;
  const fittedZoom = Math.min(
    size.width / (lesson.layout === "logs" ? 12.5 : 11.6),
    size.height / depth,
  );
  const fit = useRef(fittedZoom);
  fit.current = fittedZoom;
  const zoomScale = useRef(1);
  const initialized = useRef(false);
  const commandSequence = useRef(cameraCommand.sequence);
  const currentTop = useRef(top);
  currentTop.current = top;

  useEffect(() => {
    const contextLost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", contextLost);
    return () =>
      gl.domElement.removeEventListener("webglcontextlost", contextLost);
  }, [gl, onUnavailable]);

  useEffect(() => {
    const saved = initialized.current ? undefined : cameraPoses.get(lesson.id);
    const ortho = camera as OrthographicCamera;
    if (saved && saved.top === top) {
      camera.position.set(...saved.position);
      zoomScale.current = saved.zoomScale;
    } else {
      camera.position.set(
        ...(top ? ([0, 20, 0.001] as Point) : DEFAULT_CAMERA),
      );
      zoomScale.current = 1;
    }
    initialized.current = true;
    ortho.zoom = fit.current * zoomScale.current;
    camera.lookAt(...TARGET);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, lesson.id, top, invalidate]);

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = fittedZoom * zoomScale.current;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fittedZoom, invalidate]);

  useEffect(() => {
    if (commandSequence.current === cameraCommand.sequence) return;
    commandSequence.current = cameraCommand.sequence;
    const ortho = camera as OrthographicCamera;
    if (cameraCommand.action === "reset") {
      camera.position.set(
        ...(top ? ([0, 20, 0.001] as Point) : DEFAULT_CAMERA),
      );
      zoomScale.current = 1;
      ortho.zoom = fit.current;
    } else if (
      cameraCommand.action === "in" ||
      cameraCommand.action === "out"
    ) {
      zoomScale.current = Math.max(
        0.65,
        Math.min(
          2,
          (ortho.zoom / fit.current) *
            (cameraCommand.action === "in" ? 1.2 : 1 / 1.2),
        ),
      );
      ortho.zoom = fit.current * zoomScale.current;
    } else {
      const offset = camera.position.clone().sub(new Vector3(...TARGET));
      const spherical = new Spherical().setFromVector3(offset);
      spherical.theta +=
        cameraCommand.action === "left" ? -Math.PI / 8 : Math.PI / 8;
      camera.position.setFromSpherical(spherical).add(new Vector3(...TARGET));
    }
    camera.lookAt(...TARGET);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, cameraCommand.action, cameraCommand.sequence, top, invalidate]);

  useEffect(
    () => () => {
      cameraPoses.set(lesson.id, {
        position: camera.position.toArray() as Point,
        zoomScale: (camera as OrthographicCamera).zoom / fit.current,
        top: currentTop.current,
      });
    },
    [camera, lesson.id],
  );

  return (
    <OrbitControls
      target={TARGET}
      enablePan={false}
      enableDamping={false}
      minZoom={fittedZoom * 0.65}
      maxZoom={fittedZoom * 2}
      maxPolarAngle={Math.PI / 2.1}
      onEnd={() => {
        zoomScale.current = (camera as OrthographicCamera).zoom / fit.current;
      }}
    />
  );
}

const rowZ = (row: number, count: number) =>
  (row - (count - 1) / 2) * LOG_ROW_SPACING;

function Logs({
  lesson,
  frame,
  active,
  reduced,
}: Pick<ConsensusSceneProps, "lesson" | "frame" | "active" | "reduced">) {
  // All rows keep the same absolute indexes, even when a row is shorter or a
  // snapshot has replaced the prefix. Empty slots are evidence too.
  const slots = [
    ...new Set(
      lesson.frames.flatMap((step) =>
        step.nodes.flatMap((node) => node.log.map((entry) => entry.index)),
      ),
    ),
  ].sort((a, b) => a - b);
  const spacing = Math.min(1.65, 6.9 / Math.max(1, slots.length));
  const entryWidth = spacing - 0.3;
  const entryX = (slot: number) =>
    LOG_CENTER_X + (slot - (slots.length - 1) / 2) * spacing;
  return (
    <>
      {frame.nodes.map((node, row) => {
        const z = rowZ(row, frame.nodes.length);
        const compactedSlots = node.snapshot
          ? slots.filter((index) => index <= node.snapshot!.index).length
          : 0;
        const snapshotX = entryX(0) + ((compactedSlots - 1) * spacing) / 2;
        return (
          <group key={node.id}>
            <Block
              position={[LOG_CENTER_X, -0.19, z]}
              size={[7.25, 0.24, 1.05]}
              color="#e8e5de"
            />
            <Block
              position={[LOG_NODE_X, 0.19, z]}
              size={[0.65, 0.66, 0.65]}
              color={nodeColor(node.id).three}
              focused={node.highlighted}
            />
            <NodeLabel node={node} position={[LOG_NODE_X, 0.6, z]} />
            {slots.map((index, slot) => {
              const stored = node.log.some((entry) => entry.index === index);
              const compacted = index <= (node.snapshot?.index ?? 0);
              return !stored && !compacted ? (
                <Block
                  key={index}
                  position={[entryX(slot), -0.015, z]}
                  size={[entryWidth, 0.08, 0.85]}
                  color={ENTRY_EMPTY.three}
                />
              ) : null;
            })}
            {node.snapshot && (
              <SettlingGroup
                key={`snapshot-${node.snapshot.index}`}
                active={active}
                reduced={reduced}
              >
                <Block
                  position={[snapshotX, 0.24, z]}
                  size={[
                    Math.max(entryWidth, compactedSlots * spacing - 0.3),
                    0.59,
                    0.85,
                  ]}
                  color={SNAPSHOT_COLOR.three}
                />
                <Label
                  kind="entry"
                  position={[snapshotX, 0.72, z]}
                  palette={SNAPSHOT_COLOR}
                >
                  <strong>SNAP</strong>
                  <small>
                    i{node.snapshot.index}/t{node.snapshot.term}
                  </small>
                </Label>
              </SettlingGroup>
            )}
            {node.log.map((entry) => {
              const committed = entry.index <= node.commitIndex;
              const focused = entry.index === frame.focusIndex;
              const palette = committed ? entryColor(entry) : ENTRY_PENDING;
              const x = entryX(slots.indexOf(entry.index));
              return (
                <SettlingGroup
                  key={`${entry.index}-${entry.term}-${entry.command}`}
                  active={active}
                  reduced={reduced}
                >
                  <Block
                    position={[x, 0.22, z]}
                    size={[entryWidth, 0.55, 0.85]}
                    color={palette.three}
                    focused={focused}
                  />
                  <Label
                    kind="entry"
                    position={[x, 0.71, z]}
                    committed={committed}
                    focused={focused}
                    palette={palette}
                  >
                    <strong>i{entry.index}</strong>
                    <small>t{entry.term}</small>
                  </Label>
                </SettlingGroup>
              );
            })}
            {node.commitIndex > 0 && (
              <Line
                points={[
                  [entryX(0) - entryWidth / 2, 0.03, z + 0.58],
                  [
                    entryX(
                      Math.max(
                        0,
                        slots.findLastIndex(
                          (index) => index <= node.commitIndex,
                        ),
                      ),
                    ) +
                      entryWidth / 2,
                    0.03,
                    z + 0.58,
                  ],
                ]}
                color={INK}
                lineWidth={2.5}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

function Pulse({
  from,
  to,
  active,
  reduced,
}: { from: Point; to: Point } & Pick<
  ConsensusSceneProps,
  "active" | "reduced"
>) {
  const mesh = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => invalidate(), [active, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (active) elapsed.current += Math.min(delta, 0.05);
    if (reduced) elapsed.current = 1.15;
    const t = reduced ? 1 : Math.min(1, elapsed.current / 1.15);
    mesh.current.visible = t < 1;
    mesh.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      0.6 + Math.sin(Math.PI * t) * 0.4,
      from[2] + (to[2] - from[2]) * t,
    );
    if (active && t < 1) invalidate();
  });
  return (
    <mesh ref={mesh} position={from} visible={!reduced}>
      <sphereGeometry args={[0.11, 12, 8]} />
      <meshStandardMaterial color={FOCUS} />
    </mesh>
  );
}

function Network({
  frame,
  frameIndex,
  active,
  reduced,
}: Pick<ConsensusSceneProps, "frame" | "frameIndex" | "active" | "reduced">) {
  const partitioned = frame.links?.some((link) => link.blocked) ?? false;
  const positions = useMemo<Positions>(() => {
    const result: Positions = {};
    for (const group of ["left", "right"] as const) {
      const nodes = frame.nodes.filter((node) => node.group === group);
      nodes.forEach((node, index) => {
        result[node.id] = [
          group === "left" ? -2.45 : 2.45,
          0.42,
          (index - (nodes.length - 1) / 2) * 4.7,
        ];
      });
    }
    return result;
  }, [frame.nodes]);
  return (
    <>
      {([-1, 1] as const).map((side) => (
        <Block
          key={side}
          position={[side * 2.45, -0.23, 0]}
          size={[3.8, 0.35, 13.6]}
          color="#ece9e2"
        />
      ))}
      {partitioned && (
        <Line
          points={[
            [0, -0.05, -6.8],
            [0, -0.05, 6.8],
          ]}
          color={LINE}
          lineWidth={1.5}
          dashed
          dashSize={0.17}
          gapSize={0.17}
        />
      )}
      {!partitioned && positions.A && positions.C && (
        <Line
          points={[positions.A, positions.C]}
          color={LINE}
          dashed
          dashSize={0.12}
          gapSize={0.12}
          lineWidth={1}
        />
      )}
      {[
        ["A", "B"],
        ["C", "D"],
        ["D", "E"],
      ].map(([from, to]) =>
        positions[from] && positions[to] ? (
          <Line
            key={`${from}-${to}`}
            points={[positions[from], positions[to]]}
            color={LINE}
            dashed
            dashSize={0.12}
            gapSize={0.12}
            lineWidth={1}
          />
        ) : null,
      )}
      {frame.links?.map((link) => {
        const from = positions[link.from];
        const to = positions[link.to];
        if (!from || !to) return null;
        return (
          <group key={`${link.from}-${link.to}`}>
            <Line
              points={[from, to]}
              color={link.blocked ? "#b6b1a5" : INK}
              dashed
              dashSize={0.12}
              gapSize={link.blocked ? 0.35 : 0.12}
              lineWidth={1}
            />
            {link.blocked && (
              <Label position={[0, 0, -8.5]}>link blocked</Label>
            )}
            {!link.blocked && (
              <Pulse
                key={frameIndex}
                from={from}
                to={to}
                active={active}
                reduced={reduced}
              />
            )}
          </group>
        );
      })}
      {frame.nodes.map((node) => {
        const position = positions[node.id];
        if (!position) return null;
        const tail = node.log.at(-1);
        const tailColor = tail
          ? tail.index <= node.commitIndex
            ? entryColor(tail)
            : ENTRY_PENDING
          : ENTRY_EMPTY;
        return (
          <group key={node.id}>
            <Block
              position={position}
              size={[0.95, 0.9, 0.9]}
              color={nodeColor(node.id).three}
              focused={node.highlighted}
            />
            <NodeLabel
              node={node}
              position={[position[0], 1.35, position[2]]}
            />
            <Block
              position={[position[0], tail ? 0.2 : 0.04, position[2] + 1.15]}
              size={[0.6, tail ? 0.4 : 0.08, 0.65]}
              color={tailColor.three}
            />
            {tail && (
              <Label
                kind="entry"
                position={[position[0], 0.64, position[2] + 1.15]}
                committed={tail.index <= node.commitIndex}
                palette={tailColor}
              >
                <strong>i{tail.index}</strong>
                <small>t{tail.term}</small>
              </Label>
            )}
          </group>
        );
      })}
      <Label position={[-2.45, 0, -8.5]}>2 of 5</Label>
      <Label position={[2.45, 0, -8.5]}>3 of 5</Label>
      <Label position={[0, 0, 7.7]}>
        {partitioned ? "network partition" : "connected cluster"}
      </Label>
    </>
  );
}

function Machines({
  lesson,
  frame,
  frameIndex,
  active,
  reduced,
}: Pick<
  ConsensusSceneProps,
  "lesson" | "frame" | "frameIndex" | "active" | "reduced"
>) {
  return (
    <>
      {frame.nodes.map((node, row) => {
        const z = (row - (frame.nodes.length - 1) / 2) * 4.5;
        const previouslyApplied =
          lesson.frames[frameIndex - 1]?.nodes.find(
            (previous) => previous.id === node.id,
          )?.lastApplied ?? 0;
        return (
          <group key={node.id}>
            <Line
              points={[
                [-3.8, 0, z],
                [3.8, 0, z],
              ]}
              color={LINE}
              dashed
              dashSize={0.12}
              gapSize={0.12}
            />
            {node.log.map((entry, slot) => (
              <group key={entry.index}>
                <Block
                  position={[-3.9 + slot * 1.1, 0.17, z]}
                  size={[0.67, 0.35, 0.73]}
                  color={
                    entry.index <= node.commitIndex
                      ? entryColor(entry).three
                      : ENTRY_PENDING.three
                  }
                />
                <Label
                  kind="entry"
                  position={[-3.9 + slot * 1.1, 0.72, z]}
                  committed={entry.index <= node.commitIndex}
                  palette={
                    entry.index <= node.commitIndex
                      ? entryColor(entry)
                      : ENTRY_PENDING
                  }
                >
                  <strong>
                    {entry.index}
                    {entry.index <= node.lastApplied ? " ✓" : ""}
                  </strong>
                </Label>
              </group>
            ))}
            <Block
              position={[0.1, 0.48, z]}
              size={[1.4, 1.1, 1.15]}
              color={nodeColor(node.id).three}
            />
            <NodeLabel node={node} position={[0.1, 1.5, z]} />
            <SettlingGroup key={node.value} active={active} reduced={reduced}>
              <Block
                position={[3.6, 0.13 + Math.max(0, node.value) * 0.045, z]}
                size={[1.1, 0.3 + Math.max(0, node.value) * 0.09, 1.1]}
                color={nodeColor(node.id).three}
              />
              <Label
                kind="entry"
                position={[3.6, 0.72 + Math.max(0, node.value) * 0.09, z]}
                committed
                palette={nodeColor(node.id)}
              >
                <strong>x = {node.value}</strong>
              </Label>
            </SettlingGroup>
            {node.lastApplied > previouslyApplied && (
              <Pulse
                key={frameIndex}
                from={[-1.2, 0.6, z]}
                to={[3.6, 0.6, z]}
                active={active}
                reduced={reduced}
              />
            )}
          </group>
        );
      })}
      <Label position={[-3.35, 0, -9.1]}>log</Label>
      <Label position={[0.1, 0, -9.1]}>apply</Label>
      <Label position={[3.6, 0, -9.1]}>state</Label>
    </>
  );
}

function Membership({
  frame,
  active,
  reduced,
}: Pick<ConsensusSceneProps, "frame" | "active" | "reduced">) {
  const configuration = frame.configuration;
  if (!configuration) return null;
  const { old, next, acknowledgements } = configuration;
  const shared = old.filter((id) => next.includes(id));
  const oldOnly = old.filter((id) => !next.includes(id));
  const newOnly = next.filter((id) => !old.includes(id));
  const joint = old.length > 0 && next.length > 0;
  const sets = [
    ...(old.length
      ? [{ name: "old", ids: old, center: joint ? -1.55 : 0, dashed: true }]
      : []),
    ...(next.length
      ? [{ name: "new", ids: next, center: joint ? 1.55 : 0, dashed: false }]
      : []),
  ];
  const positions: Positions = {};
  const columns: [string[], number][] = [
    [oldOnly, -2.7],
    [shared, 0],
    [newOnly, 2.7],
  ];
  columns.forEach(([ids, x]) => {
    ids.forEach((id, index) => {
      positions[id] = [
        joint ? x : (index - (ids.length - 1) / 2) * 2.7,
        0.43,
        joint
          ? ids.length === 1
            ? 1.2
            : index === 0
              ? -3.2
              : 4.1
          : ids.length > 1
            ? index % 2 === 0
              ? -2.2
              : 2.4
            : 0,
      ];
    });
  });
  return (
    <>
      {sets.map((set) => (
        <group key={set.name}>
          <Block
            position={[set.center, -0.2 + (set.name === "new" ? 0.04 : 0), 0]}
            size={[joint ? 4.5 : 8, 0.18, 10.2]}
            color={set.name === "old" ? "#e5e1d7" : "#f0eee8"}
          />
          <Line
            points={[
              [set.center - (joint ? 2.25 : 4), 0.02, -5.1],
              [set.center + (joint ? 2.25 : 4), 0.02, -5.1],
              [set.center + (joint ? 2.25 : 4), 0.02, 5.1],
              [set.center - (joint ? 2.25 : 4), 0.02, 5.1],
              [set.center - (joint ? 2.25 : 4), 0.02, -5.1],
            ]}
            color={INK}
            lineWidth={1}
            dashed={set.dashed}
            dashSize={0.15}
            gapSize={0.12}
          />
          <Label position={[joint ? set.center * 1.35 : 0, 0.1, -7.9]}>
            {set.name} · {set.ids.join(" ")}
          </Label>
          <Label position={[joint ? set.center * 1.35 : 0, 0.1, 6]}>
            {set.ids.filter((id) => acknowledgements.includes(id)).length} /{" "}
            {set.ids.length} {set.name}
          </Label>
        </group>
      ))}
      {[...new Set([...old, ...next])].map((id) => {
        const acknowledged = acknowledgements.includes(id);
        const position = positions[id];
        const node: ConsensusNode | undefined = frame.nodes.find(
          (item) => item.id === id,
        );
        if (!node) return null;
        return (
          <group key={id}>
            <SettlingGroup
              key={String(acknowledged)}
              active={active}
              reduced={reduced}
            >
              <Block
                position={position}
                size={[1, 0.8, 1]}
                color={nodeColor(id).three}
                focused={node?.highlighted}
              />
              <NodeLabel
                node={node}
                position={[position[0], 1.25, position[2]]}
                acknowledged={acknowledged}
              />
            </SettlingGroup>
          </group>
        );
      })}
    </>
  );
}

function World(props: ConsensusSceneProps) {
  return (
    <>
      <Camera {...props} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[-3, 8, 6]} intensity={1.8} />
      {props.lesson.layout === "logs" && <Logs {...props} />}
      {props.lesson.layout === "network" && <Network {...props} />}
      {props.lesson.layout === "machines" && <Machines {...props} />}
      {props.lesson.layout === "membership" && <Membership {...props} />}
    </>
  );
}

export default function ConsensusScene(props: ConsensusSceneProps) {
  return (
    <SceneCanvas
      sceneId={`consensus:${props.lesson.id}`}
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: DEFAULT_CAMERA, zoom: 35, near: 0.1, far: 100 }}
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      fallback={
        <div className="consensus-scene-fallback">
          The same state is available in the node table below.
        </div>
      }
    >
      <World {...props} />
    </SceneCanvas>
  );
}
