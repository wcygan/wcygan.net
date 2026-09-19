import { useEffect, useMemo } from "react";
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
  const label = useMemo(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const font = "600 64px Arial, sans-serif";
    context.font = font;
    canvas.width = Math.ceil(context.measureText(children).width) + 12;
    canvas.height = 80;
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(255, 255, 255, 0.65)";
    context.fillText(children, canvas.width / 2, 42);
    context.fillStyle = "#37333e";
    context.fillText(children, canvas.width / 2, 40);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return { texture, width: canvas.width / 64, height: canvas.height / 64 };
  }, [children]);
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
