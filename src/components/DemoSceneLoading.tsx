import { useCallback, useState } from "react";

export function useSceneReady() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return { ready, onReady };
}

/** The owning stage reserves its responsive height, including during SSR. */
export function DemoSceneLoading() {
  return (
    <div
      className="demo-scene-loading"
      role="status"
      aria-label="Loading 3D demo"
    >
      <span className="demo-scene-spinner" aria-hidden="true" />
      <span className="sr-only">Loading 3D demo…</span>
    </div>
  );
}
