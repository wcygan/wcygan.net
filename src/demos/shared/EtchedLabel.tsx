import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";

type Point = [number, number, number];

/** Surface-bound lettering: a dark recess with a fine, light lower edge. */
export function EtchedLabel({
  children,
  position,
  rotation,
  size,
  radius,
}: {
  children: string;
  position: Point;
  rotation?: Point;
  size: number;
  radius?: number;
}) {
  const gl = useThree((state) => state.gl);
  const label = useMemo(() => {
    // Supersample the lettering without changing its model-space dimensions.
    const scale = 4;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const font = "600 64px Arial, sans-serif";
    context.font = font;
    const width = Math.ceil(context.measureText(children).width) + 12;
    const height = 80;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(255, 255, 255, 0.65)";
    context.fillText(children, width / 2, 42);
    context.fillStyle = "#37333e";
    context.fillText(children, width / 2, 40);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    // Preserve detail on the curved database and oblique log faces.
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return { texture, width: width / 64, height: height / 64 };
  }, [children, gl]);
  useEffect(() => () => label.texture.dispose(), [label]);
  return (
    <mesh position={position} rotation={rotation}>
      {radius ? (
        <cylinderGeometry
          args={[
            radius,
            radius,
            label.height * size,
            48,
            1,
            true,
            (-label.width * size) / radius / 2,
            (label.width * size) / radius,
          ]}
        />
      ) : (
        <planeGeometry args={[label.width * size, label.height * size]} />
      )}
      <meshStandardMaterial
        map={label.texture}
        transparent
        depthWrite={false}
        roughness={1}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

// Shared model-local placement keeps both database/log demos aligned.
export function DatabaseSideLabel({ children }: { children: string }) {
  return (
    <EtchedLabel position={[0, 0, 0]} radius={0.903} size={0.24}>
      {children}
    </EtchedLabel>
  );
}

export function LogSideLabels({ children }: { children: string }) {
  return (
    <>
      <EtchedLabel position={[0, 0, 0.627]} size={0.26}>
        {children}
      </EtchedLabel>
      <EtchedLabel
        position={[0, 0, -0.627]}
        rotation={[0, Math.PI, 0]}
        size={0.26}
      >
        {children}
      </EtchedLabel>
    </>
  );
}
