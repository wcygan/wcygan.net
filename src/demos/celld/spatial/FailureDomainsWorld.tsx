import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { CELLD_COLORS } from "../palette";
import {
  failureSnapshot,
  FAILURE_POSITIONS,
  type FailureLayout,
  type FailurePhase,
  type FailureSlot,
} from "./failure-domains-model";
import type { Point } from "./model";
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

const LOG_LENGTH = 1.25;
const LOG_Y = -0.69;
const LOG_Z = 0.48;

function offset(position: Point, by: Point): Point {
  return position.map((value, index) => value + by[index]) as Point;
}

// Log-to-log ports share the log's dimensions and world coordinates. The
// upload route leaves its front face and stays in front of both hosts.
const FOLLOWER_ROUTE: Point[] = [
  offset(FAILURE_POSITIONS.owner, [LOG_LENGTH / 2, LOG_Y, LOG_Z]),
  offset(FAILURE_POSITIONS.follower, [-LOG_LENGTH / 2, LOG_Y, LOG_Z]),
];
const UPLOAD_ROUTE: Point[] = [
  offset(FAILURE_POSITIONS.owner, [0, LOG_Y, LOG_Z + 0.41]),
  offset(FAILURE_POSITIONS.owner, [0, LOG_Y, 1.4]),
  offset(FAILURE_POSITIONS.bucket, [0, LOG_Y, 1.4]),
  // The bucket narrows toward its base; this port meets that front surface.
  offset(FAILURE_POSITIONS.bucket, [0, LOG_Y, 0.7]),
];

function LostDisk({ position }: { position: Point }) {
  return (
    <>
      <Line
        points={[
          offset(position, [-0.45, 0.12, 0.2]),
          offset(position, [0.45, 0.92, 0.2]),
        ]}
        color={CELLD_COLORS.red}
        lineWidth={5}
      />
      <Line
        points={[
          offset(position, [-0.45, 0.92, 0.2]),
          offset(position, [0.45, 0.12, 0.2]),
        ]}
        color={CELLD_COLORS.red}
        lineWidth={5}
      />
      <SurfaceId
        position={offset(position, [0, -0.55, 0.6])}
        scale={0.25}
        color={CELLD_COLORS.red}
      >
        LOST
      </SurfaceId>
    </>
  );
}

function RetainedLog({ position }: { position: Point }) {
  return (
    <>
      <Log position={offset(position, [0, LOG_Y, LOG_Z])} length={LOG_LENGTH} />
      <SurfaceId
        position={offset(position, [0, LOG_Y + 0.131, LOG_Z])}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.24}
        color={CELLD_COLORS.darkInk}
      >
        42
      </SurfaceId>
      <SurfaceId
        position={offset(position, [0, LOG_Y, LOG_Z + 0.416])}
        scale={0.22}
        color={CELLD_COLORS.darkInk}
      >
        42
      </SurfaceId>
    </>
  );
}

function NodeCopy({ slot }: { slot: FailureSlot }) {
  if (slot.state === "lost") return <LostDisk position={slot.position} />;
  return (
    <>
      {slot.id === "owner" ? (
        <>
          <Runtime
            position={offset(slot.position, [0, 0.73, -0.33])}
            size={1.02}
          />
          <Database
            position={offset(slot.position, [0, -0.03, -0.26])}
            radius={0.48}
            height={0.64}
          />
        </>
      ) : (
        <>
          <Box
            position={offset(slot.position, [0, 0.45, -0.23])}
            size={[1.2, 0.72, 1]}
            color={CELLD_COLORS.blue}
            outline={CELLD_COLORS.darkInk}
          />
          <SurfaceId
            position={offset(slot.position, [0, 0.45, 0.277])}
            color={CELLD_COLORS.darkInk}
            scale={0.3}
          >
            B
          </SurfaceId>
          <SurfaceId
            position={offset(slot.position, [0, 0.45, -0.737])}
            rotation={[0, Math.PI, 0]}
            color={CELLD_COLORS.darkInk}
            scale={0.3}
          >
            B
          </SurfaceId>
        </>
      )}
      <RetainedLog position={slot.position} />
    </>
  );
}

export function FailureDomainsWorld({
  layout,
  phase,
}: {
  layout: FailureLayout;
  phase: FailurePhase;
}) {
  const snapshot = useMemo(
    () => failureSnapshot(layout, phase),
    [layout, phase],
  );
  const labels = useMemo<Label[]>(
    () => [
      ...snapshot.slots.map((slot): Label => {
        const text =
          slot.id === "bucket"
            ? `Bucket · through ${slot.containsWrite ? "42" : "41"}`
            : slot.id === "owner"
              ? `Owner A${slot.state === "lost" ? " · lost" : " · SQLite"}`
              : `Follower B${slot.state === "lost" ? " · lost" : " · log 42"}`;
        return {
          id: slot.id,
          text,
          position: offset(slot.position, [
            0,
            slot.id === "bucket" ? 0.75 : 1.2,
            0,
          ]),
          tone: slot.tone,
        };
      }),
      ...snapshot.hosts.map(
        (host): Label => ({
          id: host.id,
          text: host.label,
          position: offset(host.position, [0, 0.09, 0.94]),
          tone: host.lost ? "red" : host.id === "storage" ? "green" : "blue",
        }),
      ),
    ],
    [snapshot],
  );

  return (
    <>
      {snapshot.hosts.map((host) => (
        <Box
          key={host.id}
          position={host.position}
          size={host.size}
          color={CELLD_COLORS.panel}
          outline={
            host.lost
              ? CELLD_COLORS.red
              : host.id === "storage"
                ? CELLD_COLORS.green
                : CELLD_COLORS.blue
          }
        />
      ))}
      <Line
        points={FOLLOWER_ROUTE}
        color={snapshot.ownerLost ? CELLD_COLORS.track : CELLD_COLORS.orange}
        lineWidth={1.7}
        dashed={snapshot.ownerLost}
        dashSize={0.1}
        gapSize={0.07}
      />
      <Line
        points={UPLOAD_ROUTE}
        color={
          snapshot.bucketCovered
            ? CELLD_COLORS.green
            : snapshot.recovery === "tail-unavailable"
              ? CELLD_COLORS.red
              : CELLD_COLORS.connector
        }
        lineWidth={1.2}
        dashed={!snapshot.bucketCovered}
        dashSize={0.12}
        gapSize={0.09}
      />
      {snapshot.slots
        .filter((slot) => slot.id !== "bucket")
        .map((slot) => (
          <NodeCopy key={slot.id} slot={slot} />
        ))}
      <Bucket position={offset(FAILURE_POSITIONS.bucket, [0, -0.35, -0.13])} />
      <SurfaceId
        position={offset(FAILURE_POSITIONS.bucket, [0, -0.35, 0.773])}
        scale={0.25}
        color={CELLD_COLORS.darkInk}
      >
        {snapshot.bucketCovered ? "42" : "41"}
      </SurfaceId>
      {snapshot.bucketCovered && (
        <group position={offset(FAILURE_POSITIONS.bucket, [0, 0.43, -0.13])}>
          <Box
            position={[0, 0, 0]}
            size={[0.46, 0.38, 0.46]}
            color={CELLD_COLORS.green}
            outline={CELLD_COLORS.darkInk}
          />
          <SurfaceId
            position={[0, 0, 0.237]}
            scale={0.17}
            color={CELLD_COLORS.darkInk}
          >
            42
          </SurfaceId>
        </group>
      )}
      <Labels labels={labels} />
    </>
  );
}
