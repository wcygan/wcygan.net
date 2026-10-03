import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { boxFaces, layoutLabels, projector, visibleSegments } from "./geometry";
import { scene } from "./scene";
import type { LessonId } from "./model";

const INITIAL = { azimuth: 0.22, elevation: 0.72, zoom: 1 };
export function SpatialDiagram({
  id,
  phase,
  option,
  width,
  stageRef,
}: {
  id: LessonId;
  phase: number;
  option: number;
  width: number;
  stageRef: Ref<HTMLDivElement>;
}) {
  const pose =
    id === "index" || id === "tiflash"
      ? { ...INITIAL, azimuth: 0.08, elevation: 1.02 }
      : INITIAL;
  const [camera, setCamera] = useState(pose);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    camera: typeof INITIAL;
  } | null>(null);
  const pending = useRef<typeof INITIAL | null>(null);
  const frame = useRef<number | null>(null);
  const compact = width < 480;
  const height =
    compact && (id === "index" || id === "tiflash") ? 640 : compact ? 480 : 440;
  const world = useMemo(
    () => scene(id, phase, option, compact),
    [id, phase, option, compact],
  );
  const project = useMemo(
    () =>
      projector(
        width,
        height,
        camera.azimuth,
        camera.elevation,
        camera.zoom,
        world.extent,
      ),
    [width, height, camera, world.extent],
  );
  const faces = useMemo(
    () =>
      world.solids
        .flatMap((s) => boxFaces(s, camera.azimuth))
        .map((face) => ({
          ...face,
          points: face.vertices.map(project),
          // Broad support planes sit beneath every raised record. Painting them
          // first avoids their average depth hiding records at the far edge.
          support: Math.max(...face.vertices.map((v) => v[1])) <= 0.46,
        })),
    [world.solids, camera.azimuth, project],
  );
  const ordered = [...faces].sort(
    (a, b) =>
      Number(b.support) - Number(a.support) ||
      a.points.reduce((n, p) => n + p.depth, 0) / a.points.length -
        b.points.reduce((n, p) => n + p.depth, 0) / b.points.length,
  );
  const labels = layoutLabels(world.labels, project, width, height);
  const guideId = `tidb-${id}-camera-guide`;
  const zoom = (change: number) =>
    setCamera((c) => ({
      ...c,
      zoom: Math.max(0.8, Math.min(1.3, c.zoom * change)),
    }));
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", wheel);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);
  const endDrag = () => {
    drag.current = null;
  };
  const clearCamera = () => {
    pending.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setCamera(pose);
  };
  return (
    <>
      <div
        ref={stageRef}
        className="tidb-learn-stage"
        data-graphic-stage="flush"
      >
        <svg
          ref={svgRef}
          className="tidb-learn-svg tidb-learn-spatial"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${id}: orbitable 3D view`}
          aria-describedby={guideId}
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              camera,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start || start.id !== event.pointerId) return;
            pending.current = {
              ...start.camera,
              azimuth: start.camera.azimuth + (event.clientX - start.x) * 0.008,
              elevation: Math.max(
                0.5,
                Math.min(
                  1.25,
                  start.camera.elevation + (event.clientY - start.y) * 0.005,
                ),
              ),
            };
            if (frame.current === null)
              frame.current = requestAnimationFrame(() => {
                frame.current = null;
                if (pending.current) {
                  setCamera(pending.current);
                  pending.current = null;
                }
              });
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onKeyDown={(event) => {
            if (
              ![
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "+",
                "-",
              ].includes(event.key)
            )
              return;
            event.preventDefault();
            if (event.key === "Home") clearCamera();
            else if (event.key === "+" || event.key === "ArrowUp") zoom(1.1);
            else if (event.key === "-" || event.key === "ArrowDown")
              zoom(1 / 1.1);
            else
              setCamera((c) => ({
                ...c,
                azimuth: c.azimuth + (event.key === "ArrowLeft" ? -0.25 : 0.25),
              }));
          }}
        >
          <title>{id}: three-dimensional storage and placement</title>
          <desc>
            Drag to orbit. Labels remain upright. Use the camera buttons or
            keyboard arrows; Home resets the camera. The HTML explanation gives
            the current state.
          </desc>
          {world.connections.flatMap((connection) =>
            connection.path.slice(1).flatMap((end, i) => {
              const a = project(connection.path[i]),
                b = project(end);
              const segments = visibleSegments(
                a,
                b,
                faces.map((f) => f.points),
              );
              return segments.map(([lo, hi], j) => {
                const interpolate = (t: number) => ({
                  x: a.x + (b.x - a.x) * t,
                  y: a.y + (b.y - a.y) * t,
                });
                const from = interpolate(lo),
                  to = interpolate(hi),
                  last = i === connection.path.length - 2 && hi > 0.999;
                const dx = b.x - a.x,
                  dy = b.y - a.y,
                  length = Math.hypot(dx, dy) || 1,
                  ux = dx / length,
                  uy = dy / length;
                return (
                  <g
                    key={`${connection.id}-${i}-${j}`}
                    className="tidb-learn-wire"
                    data-tone={connection.tone}
                  >
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x - (last ? ux * 7 : 0)}
                      y2={to.y - (last ? uy * 7 : 0)}
                      strokeDasharray={connection.dashed ? "5 5" : undefined}
                    />
                    {last && (
                      <path
                        d={`M${b.x} ${b.y}L${b.x - ux * 8 - uy * 4} ${b.y - uy * 8 + ux * 4}L${b.x - ux * 8 + uy * 4} ${b.y - uy * 8 - ux * 4}Z`}
                      />
                    )}
                  </g>
                );
              });
            }),
          )}
          {ordered.map((face) => (
            <polygon
              key={face.id}
              className="tidb-learn-face"
              data-tone={face.tone}
              data-shade={face.shade}
              points={face.points.map((p) => `${p.x},${p.y}`).join(" ")}
            />
          ))}
          {labels.map((label) => (
            <g
              key={label.id}
              className={`tidb-learn-world-label${label.inline ? " tidb-learn-cell-label" : ""}`}
            >
              {!label.inline && (
                <>
                  <line
                    x1={label.anchor.x}
                    y1={label.anchor.y}
                    x2={label.x}
                    y2={label.y + 10}
                  />
                  <rect
                    x={label.x - label.w / 2}
                    y={label.y - 15}
                    width={label.w}
                    height="23"
                    rx="2"
                  />
                </>
              )}
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label.text}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div
        className="tidb-learn-camera"
        role="group"
        aria-label={`${id} camera`}
      >
        <button
          type="button"
          aria-label="Rotate left"
          onClick={() => setCamera((c) => ({ ...c, azimuth: c.azimuth - 0.3 }))}
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="Rotate right"
          onClick={() => setCamera((c) => ({ ...c, azimuth: c.azimuth + 0.3 }))}
        >
          ↷
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={camera.zoom <= 0.8}
          onClick={() => zoom(1 / 1.1)}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={camera.zoom >= 1.3}
          onClick={() => zoom(1.1)}
        >
          +
        </button>
        <button type="button" onClick={clearCamera}>
          Reset view
        </button>
      </div>
      <p className="tidb-learn-guide" id={guideId}>
        Drag to orbit · arrows rotate / zoom · Home resets
      </p>
    </>
  );
}
