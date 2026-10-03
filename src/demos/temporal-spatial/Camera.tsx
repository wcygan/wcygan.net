import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, type ComponentRef } from "react";
import { OrthographicCamera, Spherical } from "three";
import { LAYOUTS } from "./layout";
import type { DemoKind } from "./model";

export interface TemporalCameraCommand {
  action: "left" | "right" | "up" | "down" | "in" | "out" | "reset";
  sequence: number;
}

export function Camera({
  kind,
  command,
}: {
  kind: DemoKind;
  command: TemporalCameraCommand;
}) {
  const { camera, size, invalidate } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const layout = LAYOUTS[kind];
  const fit = Math.min(
    size.width / layout.worldWidth,
    size.height / layout.worldHeight,
  );
  const previousFit = useRef<number | null>(null);
  const lastCommand = useRef(command.sequence);

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (previousFit.current === null) {
      camera.position.set(layout.pose[0], layout.pose[1], layout.pose[2]);
      camera.lookAt(0, 0, 0);
      controls.current?.update();
    }
    const ratio = previousFit.current ? ortho.zoom / previousFit.current : 1;
    ortho.zoom = fit * ratio;
    previousFit.current = fit;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fit, invalidate, layout]);

  useEffect(() => {
    // Mounting, resizing, and simulation changes are not reader commands.
    if (lastCommand.current === command.sequence) return;
    lastCommand.current = command.sequence;
    const ortho = camera as OrthographicCamera;
    const fittedZoom = previousFit.current ?? 1;
    if (command.action === "reset") {
      camera.position.set(layout.pose[0], layout.pose[1], layout.pose[2]);
      ortho.zoom = fittedZoom;
    } else if (command.action === "in" || command.action === "out") {
      ortho.zoom = Math.max(
        fittedZoom * 0.65,
        Math.min(
          fittedZoom * 2.4,
          ortho.zoom * (command.action === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const pose = new Spherical().setFromVector3(camera.position);
      if (command.action === "left") pose.theta -= Math.PI / 10;
      if (command.action === "right") pose.theta += Math.PI / 10;
      if (command.action === "up") pose.phi -= Math.PI / 14;
      if (command.action === "down") pose.phi += Math.PI / 14;
      pose.phi = Math.max(0.18, Math.min(Math.PI / 2 + 0.3, pose.phi));
      camera.position.setFromSpherical(pose);
    }
    camera.lookAt(0, 0, 0);
    ortho.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [camera, command.action, command.sequence, invalidate, layout]);

  const onChange = useCallback(() => invalidate(), [invalidate]);

  return (
    <OrbitControls
      ref={controls}
      target={[0, 0, 0]}
      enablePan={false}
      enableDamping={false}
      enableRotate
      enableZoom
      minZoom={fit * 0.65}
      maxZoom={fit * 2.4}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2 + 0.3}
      onChange={onChange}
    />
  );
}
