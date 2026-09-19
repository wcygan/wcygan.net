import { useEffect, useMemo } from "react";
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
  const label = useMemo(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const font = "64px Arial, sans-serif";
    context.font = font;
    canvas.width = Math.ceil(context.measureText(String(children)).width) + 16;
    canvas.height = 96;
    context.font = font;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(children), canvas.width / 2, canvas.height / 2);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return { texture, width: canvas.width / 64, height: canvas.height / 64 };
  }, [children, color]);
  useEffect(() => () => label.texture.dispose(), [label]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[label.width * fontSize, label.height * fontSize]} />
      <meshBasicMaterial map={label.texture} transparent depthWrite={false} />
    </mesh>
  );
}
