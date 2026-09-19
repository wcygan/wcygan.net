import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";

type Point = [number, number, number];

// These short, fixed labels need no asynchronous font resolver or glyph worker.
// Rasterize with a system font, retaining their positions on the model surfaces.
export function SceneLabel({
  children,
  position,
  rotation,
  fontSize,
  color,
}: {
  children: string | number;
  position: Point;
  rotation?: Point;
  fontSize: number;
  color: string;
}) {
  const gl = useThree((state) => state.gl);
  const label = useMemo(() => {
    // Supersample the lettering without changing its model-space dimensions.
    const scale = 4;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const font = "64px Arial, sans-serif";
    context.font = font;
    const width = Math.ceil(context.measureText(String(children)).width) + 16;
    const height = 96;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);
    context.font = font;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(children), width / 2, height / 2);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    // Preserve detail on the curved database and oblique log faces.
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return { texture, width: width / 64, height: height / 64 };
  }, [children, color, gl]);
  useEffect(() => () => label.texture.dispose(), [label]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[label.width * fontSize, label.height * fontSize]} />
      <meshBasicMaterial map={label.texture} transparent depthWrite={false} />
    </mesh>
  );
}
