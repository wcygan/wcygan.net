import { Html, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { type ReactNode, useEffect, useRef } from "react";
import { OrthographicCamera, Spherical, Vector3 } from "three";
import type { Vector } from "./model";

export type Point = Vector;
export interface ViewCommand {
  kind: "reset" | "left" | "right" | "up" | "down" | "in" | "out";
  revision: number;
}

export function SceneCamera({
  view,
  active,
  width = 8.3,
  height = 7.4,
  pose = [2.2, 1.6, 12],
  target = [0, 0, 0],
  horizontalOnly = false,
  onUnavailable,
}: {
  view: ViewCommand;
  active: boolean;
  width?: number;
  height?: number;
  pose?: Point;
  target?: Point;
  horizontalOnly?: boolean;
  onUnavailable: () => void;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const fittedZoom = Math.min(size.width / width, size.height / height);
  const polarAngle = new Spherical().setFromVector3(
    new Vector3(...pose).sub(new Vector3(...target)),
  ).phi;
  const currentFit = useRef({ fittedZoom, pose, target });
  currentFit.current = { fittedZoom, pose, target };
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
    const {
      fittedZoom: fit,
      pose: preset,
      target: center,
    } = currentFit.current;
    const ortho = camera as OrthographicCamera;
    if (view.kind === "reset") {
      camera.position.set(...preset);
      ortho.zoom = fit;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fit * 0.65,
        Math.min(fit * 2.4, ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2)),
      );
    } else {
      const offset = camera.position.clone();
      offset.x -= center[0];
      offset.y -= center[1];
      offset.z -= center[2];
      const orbit = new Spherical().setFromVector3(offset);
      if (view.kind === "left" || view.kind === "right") {
        orbit.theta += view.kind === "left" ? -Math.PI / 9 : Math.PI / 9;
      } else {
        orbit.phi += view.kind === "up" ? -Math.PI / 12 : Math.PI / 12;
        orbit.makeSafe();
      }
      camera.position.setFromSpherical(orbit);
      camera.position.x += center[0];
      camera.position.y += center[1];
      camera.position.z += center[2];
    }
    camera.lookAt(...center);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, view]);
  return (
    <OrbitControls
      target={target}
      enabled={active}
      enablePan={false}
      enableDamping={false}
      minPolarAngle={horizontalOnly ? polarAngle : undefined}
      maxPolarAngle={horizontalOnly ? polarAngle : undefined}
      minZoom={fittedZoom * 0.65}
      maxZoom={fittedZoom * 2.4}
    />
  );
}

export function Label({
  position,
  children,
  modifier = "",
}: {
  position: Point;
  children: ReactNode;
  modifier?: "" | "accent" | "quiet" | "rank" | "job";
}) {
  return (
    <Html
      center
      position={position}
      zIndexRange={[2, 0]}
      style={{ pointerEvents: "none" }}
      className={`embeddings-scene-label${
        modifier ? ` embeddings-scene-label--${modifier}` : ""
      }`}
    >
      {children}
    </Html>
  );
}

export function scalePoint(vector: Point, radius: number): Point {
  return vector.map((value) => value * radius) as Point;
}
