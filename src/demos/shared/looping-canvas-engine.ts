export type LoopingCanvasEngine<TSnapshot> = {
  start(): void;
  destroy(): void;
  snapshot(): TSnapshot;
};

type LoopingCanvasEngineOptions<TSnapshot> = {
  canvas: HTMLCanvasElement;
  snapshot: () => TSnapshot;
  render: () => void;
  advance: (deltaMs: number) => void;
  shouldPlay: () => boolean;
  motionQuery: MediaQueryList;
  onMotionPreferenceChange: (prefersReducedMotion: boolean) => void;
  maxFrameDeltaMs?: number;
  rootMargin?: string;
};

export function createLoopingCanvasEngine<TSnapshot>({
  advance,
  canvas,
  maxFrameDeltaMs = 80,
  motionQuery,
  onMotionPreferenceChange,
  render,
  rootMargin = "160px 0px",
  shouldPlay,
  snapshot,
}: LoopingCanvasEngineOptions<TSnapshot>): LoopingCanvasEngine<TSnapshot> {
  let frameId: number | undefined;
  let lastTime = 0;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let inViewport = true;

  function shouldAnimate() {
    return shouldPlay() && inViewport && !document.hidden;
  }

  function loop(now: number) {
    if (!shouldAnimate()) {
      frameId = undefined;
      return;
    }

    const deltaMs =
      lastTime === 0 ? 0 : Math.min(now - lastTime, maxFrameDeltaMs);
    lastTime = now;
    advance(deltaMs);
    render();
    frameId = requestAnimationFrame(loop);
  }

  function scheduleLoop() {
    if (frameId !== undefined || !shouldAnimate()) return;
    lastTime = 0;
    frameId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (frameId === undefined) return;
    cancelAnimationFrame(frameId);
    frameId = undefined;
  }

  function syncPlayback() {
    if (shouldAnimate()) {
      scheduleLoop();
    } else {
      stopLoop();
    }
  }

  function handleVisibilityChange() {
    syncPlayback();
    render();
  }

  function handleMotionPreferenceChange() {
    onMotionPreferenceChange(motionQuery.matches);
    syncPlayback();
    render();
  }

  function handleIntersection(entries: IntersectionObserverEntry[]) {
    const nextInViewport = entries.some((entry) => entry.isIntersecting);
    if (nextInViewport === inViewport) return;

    inViewport = nextInViewport;
    syncPlayback();
    if (inViewport) render();
  }

  return {
    start() {
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(canvas);
      }

      if (typeof IntersectionObserver !== "undefined") {
        intersectionObserver = new IntersectionObserver(handleIntersection, {
          rootMargin,
        });
        intersectionObserver.observe(canvas);
      }

      motionQuery.addEventListener("change", handleMotionPreferenceChange);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      render();
      syncPlayback();
    },
    destroy() {
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      motionQuery.removeEventListener("change", handleMotionPreferenceChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
    snapshot,
  };
}
