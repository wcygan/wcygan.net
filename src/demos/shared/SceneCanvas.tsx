import {
  Canvas,
  type CanvasProps,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";

let webgl2Support: boolean | undefined;

function supportsWebGL2(onUnavailable: () => void): boolean {
  if (webgl2Support !== undefined) {
    if (!webgl2Support) onUnavailable();
    return webgl2Support;
  }
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    if (!context) {
      webgl2Support = false;
      onUnavailable();
      return webgl2Support;
    }
    context.getExtension("WEBGL_lose_context")?.loseContext();
    webgl2Support = true;
    return webgl2Support;
  } catch {
    webgl2Support = false;
    onUnavailable();
    return webgl2Support;
  }
}

/** Reset cached capability detection between isolated component tests. */
export function resetWebGL2SupportForTests() {
  webgl2Support = undefined;
}

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
  sceneId,
  onReady,
  onUnavailable,
  children,
  ...props
}: CanvasProps & {
  sceneId: string;
  onReady: () => void;
  onUnavailable: () => void;
}) {
  const [supported, setSupported] = useState(false);
  const timingRef = useRef<{
    startedAt: number | null;
    finished: boolean;
  }>({ startedAt: null, finished: false });

  const finishTiming = useCallback(
    (outcome: "ready" | "unavailable") => {
      if (!import.meta.env.DEV) return;

      const timing = timingRef.current;
      if (timing.finished || timing.startedAt === null) return;
      timing.finished = true;

      const duration = performance.now() - timing.startedAt;
      const measureName = `3d-demo:${sceneId}:${outcome}`;
      performance.measure(measureName, {
        start: timing.startedAt,
        duration,
      });
      console.info(
        `[3D timing] ${sceneId}: ${duration.toFixed(1)} ms (${outcome})`,
      );
    },
    [sceneId],
  );

  const handleReady = useCallback(() => {
    finishTiming("ready");
    onReady();
  }, [finishTiming, onReady]);

  useEffect(() => {
    if (import.meta.env.DEV && timingRef.current.startedAt === null) {
      // Start before capability detection and Canvas setup. Lazy module loading
      // has already completed by the time this scene component mounts.
      timingRef.current.startedAt = performance.now();
    }

    // Renderer creation is asynchronous in Fiber. Detect absent WebGL before
    // mounting so the loading overlay can yield to the usable HTML fallback.
    // All canvases share this page-level check instead of creating one probe
    // context per scene.
    if (
      supportsWebGL2(() => {
        finishTiming("unavailable");
        onUnavailable();
      })
    ) {
      setSupported(true);
    }
  }, [finishTiming, onUnavailable]);
  if (!supported) return null;
  return (
    <Canvas {...props}>
      {children}
      <FirstFrame onReady={handleReady} />
    </Canvas>
  );
}
