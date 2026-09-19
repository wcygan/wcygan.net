import {
  Canvas,
  useFrame,
  useThree,
  type CanvasProps,
} from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

function FirstFrame({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  const scheduled = useRef(false);
  const frame = useRef<number | undefined>(undefined);
  useEffect(() => {
    invalidate();
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      scheduled.current = false;
    };
  }, [invalidate, onReady]);
  useFrame(() => {
    if (scheduled.current) return;
    scheduled.current = true;
    // Fiber runs frame subscribers before drawing. Notify on the next browser
    // frame, after this scene has drawn, never just after importing the module.
    frame.current = requestAnimationFrame(onReady);
  });
  return null;
}

export function SceneCanvas({
  onReady,
  onUnavailable,
  children,
  ...props
}: CanvasProps & { onReady: () => void; onUnavailable: () => void }) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    // Renderer creation is asynchronous in Fiber. Detect absent WebGL before
    // mounting so the loading overlay can yield to the usable HTML fallback.
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      if (!context) {
        onUnavailable();
        return;
      }
      context.getExtension("WEBGL_lose_context")?.loseContext();
      setSupported(true);
    } catch {
      onUnavailable();
    }
  }, [onUnavailable]);
  if (!supported) return null;
  return (
    <Canvas {...props}>
      {children}
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
