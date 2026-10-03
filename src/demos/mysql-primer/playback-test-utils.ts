import { vi } from "vitest";

/** Browser signals shared by the SVG and WebGL playback tests. */
export function installPlaybackBrowser(initialReducedMotion = false) {
  const observers = new Map<
    IntersectionObserver,
    {
      callback: IntersectionObserverCallback;
      target?: Element;
    }
  >();
  let reducedMotion = initialReducedMotion;
  const motionListeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reducedMotion;
    },
    addEventListener: (_: string, callback: () => void) =>
      motionListeners.add(callback),
    removeEventListener: (_: string, callback: () => void) =>
      motionListeners.delete(callback),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observers.set(this as unknown as IntersectionObserver, { callback });
      }
      observe(target: Element) {
        observers.get(this as unknown as IntersectionObserver)!.target = target;
      }
      disconnect() {
        observers.delete(this as unknown as IntersectionObserver);
      }
    },
  );
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  return {
    visible(value: boolean) {
      for (const [observer, { callback, target }] of observers) {
        callback(
          [
            {
              isIntersecting: value,
              intersectionRatio: value ? 1 : 0,
              target,
            } as IntersectionObserverEntry,
          ],
          observer,
        );
      }
    },
    motion(value: boolean) {
      reducedMotion = value;
      motionListeners.forEach((callback) => callback());
    },
    hidden(value: boolean) {
      Object.defineProperty(document, "hidden", { configurable: true, value });
      document.dispatchEvent(new Event("visibilitychange"));
    },
  };
}
