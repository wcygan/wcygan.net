/** @vitest-environment jsdom */
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetWebGL2SupportForTests, SceneCanvas } from "./SceneCanvas";

const fiber = vi.hoisted(() => ({ frame: () => {}, invalidate: vi.fn() }));
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useFrame: (callback: () => void) => {
    fiber.frame = callback;
  },
  useThree: (select: (state: { invalidate: () => void }) => unknown) =>
    select({ invalidate: fiber.invalidate }),
}));
beforeEach(() => {
  resetWebGL2SupportForTests();
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getExtension: () => null,
  } as unknown as WebGL2RenderingContext);
});
afterEach(() => {
  cleanup();
  resetWebGL2SupportForTests();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("announces readiness after a rendered frame, once, not at Canvas mount", () => {
  const ready = vi.fn();
  render(
    <SceneCanvas
      sceneId="Test Scene"
      onReady={ready}
      onUnavailable={vi.fn()}
    />,
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(ready).not.toHaveBeenCalled();
  act(() => fiber.frame());
  expect(ready).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(20));
  expect(ready).toHaveBeenCalledTimes(1);
  act(() => {
    fiber.frame();
    vi.advanceTimersByTime(20);
  });
  expect(ready).toHaveBeenCalledTimes(1);
});
it("cancels the readiness notification when the scene unmounts", () => {
  const ready = vi.fn();
  const { unmount } = render(
    <SceneCanvas
      sceneId="Test Scene"
      onReady={ready}
      onUnavailable={vi.fn()}
    />,
  );
  act(() => fiber.frame());
  unmount();
  act(() => vi.advanceTimersByTime(20));
  expect(ready).not.toHaveBeenCalled();
});
it("reports unsupported WebGL instead of leaving the spinner pending", () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  const ready = vi.fn(),
    fail = vi.fn();
  render(
    <SceneCanvas sceneId="Test Scene" onReady={ready} onUnavailable={fail} />,
  );
  expect(fail).toHaveBeenCalledTimes(1);
  expect(ready).not.toHaveBeenCalled();
});
