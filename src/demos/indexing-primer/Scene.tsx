import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Vector3, type OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { WIDTH, type Page, type TreeLink, type TreeVisual } from "./visual";

const UNITS = 60;
const DEPTH = 0.22;
const colors = {
  background: "#111111",
  plate: "#1c1c1c",
  border: "#777777",
  branch: "#f35815",
  index: "#0e73cc",
  found: "#27b648",
  checked: "#3d3d3d",
  muted: "#202020",
  wire: "#8b8b8b",
};

export interface CameraPose {
  azimuth: number;
  polar: number;
}

type PoseChange = (pose: CameraPose, normalizedZoom: number) => void;

function point(
  x: number,
  y: number,
  height: number,
  verticalScale: number,
  z = DEPTH / 2,
) {
  return new Vector3(
    (x - WIDTH / 2) / UNITS,
    ((height / 2 - y) / UNITS) * verticalScale,
    z,
  );
}

function Camera({
  view,
  zoom,
  height,
  verticalScale,
  onUnavailable,
  pose,
  onPoseChange,
}: {
  view: number;
  zoom: number;
  height: number;
  verticalScale: number;
  onUnavailable: () => void;
  pose?: CameraPose;
  onPoseChange?: PoseChange;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const fittedZoom = Math.min(
    size.width / (WIDTH / UNITS + 0.3),
    size.height / ((height / UNITS) * verticalScale + 0.3),
  );
  useLayoutEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  // Advancing a lesson changes its pages, never the reader's camera pose.
  useEffect(() => {
    const angles = [0.06, 0.3, -0.3];
    const angle =
      angles[((view % angles.length) + angles.length) % angles.length];
    if (pose) {
      const horizontalRadius = 16 * Math.sin(pose.polar);
      camera.position.set(
        horizontalRadius * Math.sin(pose.azimuth),
        16 * Math.cos(pose.polar),
        horizontalRadius * Math.cos(pose.azimuth),
      );
    } else {
      camera.position.set(16 * Math.sin(angle), 0.6, 16 * Math.cos(angle));
    }
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [view, pose?.azimuth, pose?.polar, camera, invalidate]);
  useEffect(() => {
    (camera as OrthographicCamera).zoom = fittedZoom * zoom;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, fittedZoom, zoom, invalidate]);
  return (
    <OrbitControls
      enablePan={false}
      enableZoom
      minZoom={fittedZoom * 0.7}
      maxZoom={fittedZoom * 1.5}
      enableDamping={false}
      target={[0, 0, 0]}
      minAzimuthAngle={-0.45}
      maxAzimuthAngle={0.45}
      minPolarAngle={Math.PI / 2 - 0.2}
      maxPolarAngle={Math.PI / 2 + 0.2}
      onEnd={() => {
        const radius = camera.position.length();
        onPoseChange?.(
          {
            azimuth: Math.atan2(camera.position.x, camera.position.z),
            polar: Math.acos(
              Math.max(-1, Math.min(1, camera.position.y / radius)),
            ),
          },
          (camera as OrthographicCamera).zoom / fittedZoom,
        );
      }}
    />
  );
}

function PagePlate({
  page,
  height,
  verticalScale,
}: {
  page: Page;
  height: number;
  verticalScale: number;
}) {
  const { camera, size, invalidate } = useThree();
  const label = useRef<HTMLDivElement>(null);
  const measured = useRef("");
  const mountLabel = useCallback(
    (element: HTMLDivElement | null) => {
      label.current = element;
      measured.current = "";
      // Html mounts through a separate React root, possibly after Fiber's first
      // demand frame. Schedule its measurement when the actual label exists.
      if (element) invalidate();
    },
    [invalidate],
  );
  const topLeft = useRef(new Vector3());
  const topRight = useRef(new Vector3());
  const bottomLeft = useRef(new Vector3());
  const center = point(page.x, page.y, height, verticalScale, 0);
  const width = page.width / UNITS;
  const plateHeight = (page.height / UNITS) * verticalScale;
  const border =
    page.state === "found"
      ? colors.found
      : page.state === "new"
        ? colors.branch
        : page.state === "active"
          ? colors.index
          : page.kind === "branch"
            ? colors.index
            : page.kind === "memory"
              ? colors.border
              : colors.index;

  // Upright HTML text follows the projected face dimensions. Demand rendering
  // only writes these dimensions when resize, orbit or zoom changes them.
  useFrame(() => {
    if (!label.current) return;
    topLeft.current
      .copy(
        point(
          page.x - page.width / 2,
          page.y - page.height / 2,
          height,
          verticalScale,
        ),
      )
      .project(camera);
    topRight.current
      .copy(
        point(
          page.x + page.width / 2,
          page.y - page.height / 2,
          height,
          verticalScale,
        ),
      )
      .project(camera);
    bottomLeft.current
      .copy(
        point(
          page.x - page.width / 2,
          page.y + page.height / 2,
          height,
          verticalScale,
        ),
      )
      .project(camera);
    const pixelsWide =
      Math.abs(topRight.current.x - topLeft.current.x) * size.width * 0.5;
    const pixelsHigh =
      Math.abs(bottomLeft.current.y - topLeft.current.y) * size.height * 0.5;
    const dimensions = `${pixelsWide.toFixed(1)}:${pixelsHigh.toFixed(1)}`;
    if (dimensions === measured.current) return;
    measured.current = dimensions;
    label.current.style.width = `${pixelsWide}px`;
    label.current.style.height = `${pixelsHigh}px`;
    label.current.style.setProperty(
      "--ip-label-scale",
      String(Math.min(1, pixelsWide / page.width)),
    );
  });

  const titleHeight = (Math.min(32, page.height * 0.3) / UNITS) * verticalScale;
  const rowHeight =
    (plateHeight - titleHeight) / Math.max(1, page.entries.length);
  return (
    <group position={center}>
      <mesh>
        <boxGeometry args={[width, plateHeight, DEPTH]} />
        <meshStandardMaterial color={colors.plate} roughness={1} />
        <Edges color={border} lineWidth={1.2} />
      </mesh>
      {page.entries.map((entry, i) => {
        const cellWidth =
          page.kind === "branch" ? width / page.entries.length : width;
        const cellHeight =
          page.kind === "branch" ? plateHeight - titleHeight : rowHeight;
        const x =
          page.kind === "branch" ? -width / 2 + cellWidth * (i + 0.5) : 0;
        const y =
          page.kind === "branch"
            ? -titleHeight / 2
            : plateHeight / 2 - titleHeight - rowHeight * (i + 0.5);
        const color =
          entry.state === "found"
            ? "#123e1b"
            : entry.state === "new"
              ? "#482611"
              : entry.state === "active"
                ? page.kind === "branch"
                  ? "#482611"
                  : "#12304b"
                : entry.state === "checked"
                  ? colors.checked
                  : entry.state === "muted"
                    ? colors.muted
                    : page.kind === "branch"
                      ? "#173449"
                      : colors.plate;
        return (
          <mesh key={`${entry.key}-${i}`} position={[x, y, DEPTH / 2 + 0.004]}>
            <planeGeometry args={[cellWidth - 0.035, cellHeight - 0.035]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
      <Html center position={[0, 0, DEPTH / 2 + 0.01]} zIndexRange={[2, 0]}>
        <div
          ref={mountLabel}
          className="ip-page-label"
          data-kind={page.kind}
          data-state={page.state}
          style={{ pointerEvents: "none" }}
        >
          <span className="ip-page-title">{page.title}</span>
          <span className="ip-page-entries">
            {page.entries.map((entry, i) => (
              <span
                className="ip-page-entry"
                data-state={entry.state}
                key={`${entry.key}-${i}`}
              >
                <span className="ip-page-key">
                  {entry.key.split(" / ").map((part, line) => (
                    <span className="ip-page-key-line" key={line}>
                      {part}
                    </span>
                  ))}
                </span>
                {entry.value !== undefined && (
                  <span className="ip-page-value">{entry.value}</span>
                )}
              </span>
            ))}
          </span>
        </div>
      </Html>
    </group>
  );
}

function Connector({
  link,
  pages,
  height,
  verticalScale,
}: {
  link: TreeLink;
  pages: Page[];
  height: number;
  verticalScale: number;
}) {
  const from = pages.find((page) => page.id === link.from);
  const to = pages.find((page) => page.id === link.to);
  if (!from || !to) return null;
  const at = (x: number, y: number) => point(x, y, height, verticalScale);
  let route: Vector3[];
  if (link.kind === "leaf") {
    const direction = Math.sign(to.x - from.x) || 1;
    route = [
      at(from.x + (from.width / 2) * direction, from.y),
      at(to.x - (to.width / 2) * direction, to.y),
    ];
  } else {
    const start = from.y + from.height / 2;
    const end = to.y - to.height / 2;
    const midway = (start + end) / 2;
    route = [
      at(from.x, start),
      at(from.x, midway),
      at(to.x, midway),
      at(to.x, end),
    ];
  }
  const color = !link.active
    ? colors.wire
    : link.kind === "handoff"
      ? colors.branch
      : colors.index;
  const endpoint = route[route.length - 1];
  const previous = route[route.length - 2];
  const horizontal = Math.abs(endpoint.x - previous.x) > 0.01;
  const direction = horizontal
    ? Math.sign(endpoint.x - previous.x)
    : Math.sign(endpoint.y - previous.y);
  const arrow: Vector3[] = horizontal
    ? [
        new Vector3(
          endpoint.x - 0.08 * direction,
          endpoint.y + 0.065,
          endpoint.z,
        ),
        endpoint,
        new Vector3(
          endpoint.x - 0.08 * direction,
          endpoint.y - 0.065,
          endpoint.z,
        ),
      ]
    : [
        new Vector3(
          endpoint.x - 0.065,
          endpoint.y - 0.08 * direction,
          endpoint.z,
        ),
        endpoint,
        new Vector3(
          endpoint.x + 0.065,
          endpoint.y - 0.08 * direction,
          endpoint.z,
        ),
      ];
  return (
    <>
      <Line
        points={route}
        color={color}
        dashed
        dashSize={0.08}
        gapSize={0.06}
        lineWidth={link.active ? 2 : 1}
      />
      <Line points={arrow} color={color} lineWidth={link.active ? 2 : 1} />
    </>
  );
}

function TreeContent({
  visual,
  view,
  zoom,
  onUnavailable,
  pose,
  onPoseChange,
}: {
  visual: TreeVisual;
  view: number;
  zoom: number;
  onUnavailable: () => void;
  pose?: CameraPose;
  onPoseChange?: PoseChange;
}) {
  const width = useThree((state) => state.size.width);
  const verticalScale = WIDTH / Math.max(width, 1);
  const pages = visual.groups.flatMap((group) => group.pages);
  return (
    <>
      <Camera
        view={view}
        zoom={zoom}
        height={visual.height}
        verticalScale={verticalScale}
        onUnavailable={onUnavailable}
        pose={pose}
        onPoseChange={onPoseChange}
      />
      {visual.groups.flatMap((group) =>
        group.links.map((link) => (
          <Connector
            key={`${group.id}-${link.from}-${link.to}`}
            link={link}
            pages={pages}
            height={visual.height}
            verticalScale={verticalScale}
          />
        )),
      )}
      {visual.groups.map((group) => {
        const top = Math.min(
          ...group.pages.map((page) => page.y - page.height / 2),
        );
        const left = Math.min(
          ...group.pages.map((page) => page.x - page.width / 2),
        );
        const right = Math.max(
          ...group.pages.map((page) => page.x + page.width / 2),
        );
        return (
          <Html
            key={group.id}
            center
            position={point(
              (left + right) / 2,
              top - 22,
              visual.height,
              verticalScale,
            )}
            zIndexRange={[2, 0]}
          >
            <span className="ip-group-title">{group.title}</span>
          </Html>
        );
      })}
      {pages.map((page) => (
        <PagePlate
          key={page.id}
          page={page}
          height={visual.height}
          verticalScale={verticalScale}
        />
      ))}
    </>
  );
}

export default function Scene({
  visual,
  view,
  onUnavailable,
  zoom,
  pose,
  onPoseChange,
  onReady,
}: {
  visual: TreeVisual;
  view: number;
  onUnavailable: () => void;
  zoom: number;
  pose?: CameraPose;
  onPoseChange?: PoseChange;
  onReady: () => void;
}) {
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      // Fiber disposes the renderer during unmount and may emit context loss.
      // That is expected teardown, not a capability failure for this figure.
      mounted.current = false;
    };
  }, []);
  const handleUnavailable = useCallback(() => {
    if (mounted.current) onUnavailable();
  }, [onUnavailable]);
  return (
    <SceneCanvas
      sceneId="indexing-primer"
      onReady={onReady}
      onUnavailable={handleUnavailable}
      orthographic
      camera={{ position: [1, 0.6, 16], near: 0.1, far: 100 }}
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "low-power" }}
      fallback={<p className="ip-fallback">{visual.takeaway}</p>}
    >
      <color attach="background" args={[colors.background]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[2, 4, 8]} intensity={1.4} />
      <TreeContent
        visual={visual}
        view={view}
        zoom={zoom}
        onUnavailable={handleUnavailable}
        pose={pose}
        onPoseChange={onPoseChange}
      />
    </SceneCanvas>
  );
}
