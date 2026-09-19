import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Group, OrthographicCamera, Spherical, Vector3 } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  DATABASE_COLORS,
  LOG_ENTRY_COLORS,
  LOG_ENTRY_OUTLINE,
  LAG_OUTLINE,
} from "~/demos/shared/replication-palette";
import {
  DatabaseCylinderGeometry,
  LogTrayGeometry,
} from "~/demos/shared/DatabaseLogGeometry";
import type { Flight, Member } from "./model";
import { MAX_WRITES } from "./model";
import type { LagPlayback, LagState } from "./playback";
import {
  type Point,
  ROWS,
  DATABASE_X,
  LOG_X,
  SLOT_START,
  SLOT_SPACING,
  ENTRY_SIZE,
  LOG_SURFACE_Y,
  slot,
  linkPath,
  flightPath,
  measurePath,
  samplePath,
  cacheSlot,
  proposalInletPath,
  donorPath,
  interruptedLinkPaths,
} from "./paths";

export interface ViewCommand {
  kind: "top" | "reset" | "left" | "right" | "up" | "down" | "in" | "out";
  revision: number;
}
interface Props {
  state: LagState;
  playback: LagPlayback;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}
const TARGET: Point = [0, 0, -0.45];

function Camera({
  view,
  onUnavailable,
}: Pick<Props, "view" | "onUnavailable">) {
  const { camera, gl, size, invalidate } = useThree();
  const fittedZoom = Math.min(size.width / 14.0, size.height / 16.2);
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
    ortho.zoom = fittedZoom;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fittedZoom, invalidate]);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (view.kind === "top" || view.kind === "reset") {
      camera.position.set(
        ...((view.kind === "top" ? [0, 17, -0.449] : [1.3, 15, 12]) as Point),
      );
      ortho.zoom = fittedZoom;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fittedZoom * 0.6,
        Math.min(
          fittedZoom * 2,
          ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const offset = camera.position.clone().sub(new Vector3(...TARGET));
      const spherical = new Spherical().setFromVector3(offset);
      if (view.kind === "left" || view.kind === "right")
        spherical.theta += view.kind === "left" ? -Math.PI / 12 : Math.PI / 12;
      else
        spherical.phi = Math.max(
          0.08,
          Math.min(
            Math.PI - 0.08,
            spherical.phi + (view.kind === "up" ? -0.15 : 0.15),
          ),
        );
      camera.position.setFromSpherical(spherical).add(new Vector3(...TARGET));
    }
    camera.lookAt(...TARGET);
    ortho.updateProjectionMatrix();
    invalidate();
    // Only explicit commands change the pose; resize fitting is separate.
  }, [camera, view, invalidate]);
  return (
    <OrbitControls
      target={TARGET}
      enablePan={false}
      enableDamping={false}
      minZoom={fittedZoom * 0.6}
      maxZoom={fittedZoom * 2}
    />
  );
}

function MemberRow({ member }: { member: Member }) {
  const z = ROWS[member.id];
  const database =
    DATABASE_COLORS[
      member.id === "primary"
        ? "primary"
        : member.id === "a"
          ? "replica"
          : "replicaB"
    ];
  const markerX = Math.max(
    LOG_X - 2.625 + 0.06,
    Math.min(
      LOG_X + 2.625 - 0.06,
      SLOT_START - SLOT_SPACING / 2 + member.applied * SLOT_SPACING,
    ),
  );
  return (
    <group>
      <group position={[DATABASE_X, -0.375, z]}>
        <DatabaseCylinderGeometry
          name={member.id === "primary" ? "Primary" : member.id.toUpperCase()}
          color={database.fill}
          edgeColor={database.outline}
        />
      </group>
      <Html
        center
        position={[DATABASE_X, 1.3, z - 1.5]}
        className="group-lag-scene-label"
      >
        <strong>{member.name}</strong>
        <span>
          {member.id === "primary" ? "Committed" : "Applied"} · v
          {member.applied}
        </span>
      </Html>
      <group position={[LOG_X, -0.75, z]}>
        <LogTrayGeometry
          label={member.id === "primary" ? "Committed" : "Received"}
        />
      </group>
      {member.id !== "primary" && (
        <Line
          points={[
            [DATABASE_X + 0.9, -0.5, z],
            [-1.525, -0.5, z],
          ]}
          color="#8f8c83"
          dashed
          dashSize={0.12}
          gapSize={0.09}
          lineWidth={1}
        />
      )}
      {Array.from({ length: MAX_WRITES }, (_, index) => {
        const id = index + 1;
        const present = id <= member.received;
        const delayed = member.id === "b" && present && id > member.applied;
        const position = slot(index, z);
        return (
          <group key={id}>
            {id <= member.applied && (
              <mesh
                position={[position[0], LOG_SURFACE_Y + 0.002, z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[0.7, 0.94]} />
                <meshBasicMaterial
                  color="#27d84b"
                  toneMapped={false}
                  polygonOffset
                  polygonOffsetFactor={-1}
                  polygonOffsetUnits={-1}
                />
              </mesh>
            )}
            <mesh
              position={
                present ? position : [position[0], LOG_SURFACE_Y + 0.0175, z]
              }
            >
              <boxGeometry
                args={
                  present ? ENTRY_SIZE : [ENTRY_SIZE[0], 0.035, ENTRY_SIZE[2]]
                }
              />
              <meshStandardMaterial
                color={present ? LOG_ENTRY_COLORS[index] : "#dedbd2"}
                roughness={0.9}
              />
              <Edges color={present ? LOG_ENTRY_OUTLINE : "#a8a59b"} />
            </mesh>
            {delayed && (
              <mesh position={position}>
                <boxGeometry args={[0.7, 0.64, 0.84]} />
                <meshBasicMaterial visible={false} />
                <Edges color={LAG_OUTLINE} lineWidth={2} />
              </mesh>
            )}
            {present && (
              <Html
                center
                position={[position[0], 0.25, z]}
                className="group-lag-entry"
              >
                {id}
              </Html>
            )}
          </group>
        );
      })}
      {member.id !== "primary" && (
        <>
          {/* A shallow, surface-bound groove, with the same lit lip as etched labels. */}
          <mesh
            position={[markerX + 0.027, LOG_SURFACE_Y + 0.004, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.025, 1.16]} />
            <meshBasicMaterial color="#fdfdfc" />
          </mesh>
          <mesh
            position={[markerX, LOG_SURFACE_Y + 0.005, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.04, 1.16]} />
            <meshBasicMaterial color="#393833" />
          </mesh>
          <Html
            center
            position={[LOG_X, -0.9, z + 1.1]}
            className="group-lag-scene-label group-lag-marker-label"
          >
            <span>
              Applied {member.applied} · {member.received - member.applied}{" "}
              pending
            </span>
          </Html>
        </>
      )}
    </group>
  );
}

function MovingTransaction({
  flight,
  playback,
  active,
}: {
  flight: Flight;
  playback: LagPlayback;
  active: boolean;
}) {
  const packet = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const route = useMemo(
    () => measurePath(flightPath(flight)),
    [flight.member, flight.kind, flight.transaction, flight.source],
  );
  useFrame(() => {
    if (!packet.current) return;
    const progress = Math.max(
      0,
      Math.min(
        1,
        (playback.getTime() - flight.startsAt) /
          (flight.endsAt - flight.startsAt),
      ),
    );
    packet.current.position.set(...samplePath(route, progress));
    if (flight.kind === "ordering" || flight.kind === "applying")
      packet.current.position.y += Math.sin(progress * Math.PI) * 0.45;
    if (active && progress < 1) invalidate();
  });
  useEffect(() => {
    invalidate();
  }, [active, invalidate]);
  return (
    <group
      ref={packet}
      position={route.points[0]}
      scale={flight.kind === "applying" ? 0.5 : 1}
    >
      <mesh>
        <boxGeometry args={ENTRY_SIZE} />
        <meshStandardMaterial
          color={LOG_ENTRY_COLORS[flight.transaction - 1]}
          roughness={0.9}
        />
        <Edges color={LOG_ENTRY_OUTLINE} />
      </mesh>
      {flight.kind !== "applying" && (
        <Html center position={[0, 0.32, 0]} className="group-lag-entry">
          {flight.transaction}
        </Html>
      )}
    </group>
  );
}

export default function GroupReplicationLagScene(props: Props) {
  return (
    <SceneCanvas
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: [1.3, 15, 12], zoom: 36, near: 0.1, far: 100 }}
      // Supersample small surface labels; cap high-density screens at 3×.
      dpr={[2, 3]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
    >
      <Camera view={props.view} onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[-3, 8, 5]} intensity={2} />
      {(["a", "b"] as const).map((member, index) => {
        const points = linkPath(member);
        return (
          <group key={member}>
            {(member === "b" && props.state.disconnected
              ? interruptedLinkPaths()
              : [points]
            ).map((segment, part) => (
              <Line
                key={part}
                points={segment}
                color={
                  member === "b" && props.state.disconnected
                    ? LAG_OUTLINE
                    : "#8f8c83"
                }
                dashed
                dashSize={0.12}
                gapSize={0.09}
              />
            ))}
            <Html
              center
              position={[points[1][0] - 1.05, 0.1, member === "a" ? -2.6 : 3.5]}
              className="group-lag-scene-label"
            >
              <strong>Link {index + 1}</strong>
              <span>Group messages</span>
              {member === "b" && props.state.disconnected && (
                <span className="group-lag-fault-label">Interrupted</span>
              )}
            </Html>
          </group>
        );
      })}
      <group>
        <Line
          points={proposalInletPath()}
          color="#8f8c83"
          dashed
          dashSize={0.12}
          gapSize={0.09}
        />
        {props.state.flights
          .filter((flight) => flight.kind === "committing")
          .map((flight) => (
            <Line
              key={flight.transaction}
              points={flightPath(flight)}
              color="#8f8c83"
              dashed
              dashSize={0.12}
              gapSize={0.09}
            />
          ))}
        <mesh position={[1.45, -0.3, -7]}>
          <boxGeometry args={[3.3, 0.16, 0.75]} />
          <meshStandardMaterial color="#deddd7" />
          <Edges color="#8f8c83" />
        </mesh>
        {Array.from({ length: props.state.cached }, (_, index) => (
          <mesh key={index} position={cacheSlot(index + 1)}>
            <boxGeometry args={[0.35, 0.3, 0.45]} />
            <meshStandardMaterial color={LOG_ENTRY_COLORS[index]} />
            <Edges color={LOG_ENTRY_OUTLINE} />
            <Html center position={[0, 0.25, 0]} className="group-lag-entry">
              {index + 1}
            </Html>
          </mesh>
        ))}
        <Html
          center
          position={[1.45, 0.1, -8.1]}
          className="group-lag-scene-label"
        >
          <strong>XCom message cache</strong>
          <span>In primary memory</span>
        </Html>
      </group>
      {props.state.recoverySource === "donor" && !props.state.disconnected && (
        <group>
          <Line
            points={donorPath()}
            color={DATABASE_COLORS.replicaB.outline}
            dashed
            dashSize={0.25}
            gapSize={0.12}
          />
          <Html
            center
            position={[4.7, 0.1, 1.8]}
            className="group-lag-scene-label group-lag-donor-label"
          >
            <strong>Distributed</strong>
            <strong>recovery</strong>
          </Html>
        </group>
      )}
      {props.state.members.map((member) => (
        <MemberRow key={member.id} member={member} />
      ))}
      {!props.state.reduced &&
        props.state.flights.map((flight) => (
          <MovingTransaction
            key={`${flight.member}-${flight.transaction}-${flight.kind}-${flight.attemptId ?? 0}`}
            flight={flight}
            playback={props.playback}
            active={props.state.running}
          />
        ))}
    </SceneCanvas>
  );
}
