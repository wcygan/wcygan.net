/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RaftElectionDemo } from "~/components/RaftElectionDemo";
import type { Playback } from "./playback";
const scene = vi.hoisted(() => ({
  playback: null as Playback | null,
  fail: false,
}));
vi.mock("./Scene", () => ({
  default: ({
    playback,
    view,
  }: {
    playback: Playback;
    view: { revision: number };
  }) => {
    scene.playback = playback;
    if (scene.fail) throw new Error("WebGL failed");
    return <div data-testid="scene" data-view={view.revision} />;
  },
}));
let intersection: IntersectionObserverCallback;
let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  scene.fail = false;
  scene.playback = null;
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        intersection = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  reduced = false;
});
async function visible(value = true) {
  await act(async () => {
    intersection(
      [
        {
          isIntersecting: value,
          intersectionRatio: value ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
}
it("preserves pause and camera, resets and changes scenarios", async () => {
  render(<RaftElectionDemo />);
  await visible();
  fireEvent.click(screen.getByText("Crash leader"));
  fireEvent.click(screen.getByText("Pause"));
  const time = scene.playback!.getTime();
  await visible(false);
  await visible();
  act(() => vi.advanceTimersByTime(10000));
  expect(scene.playback!.getTime()).toBe(time);
  fireEvent.keyDown(screen.getByRole("group", { name: /Election network/ }), {
    key: "ArrowLeft",
  });
  expect(screen.getByTestId("scene").getAttribute("data-view")).toBe("1");
  fireEvent.click(screen.getByText("Reset"));
  expect(scene.playback!.getSnapshot().crashed).toEqual([]);
  expect(screen.getByTestId("scene").getAttribute("data-view")).toBe("1");
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "split" },
  });
  expect(scene.playback!.getSnapshot().scenario).toBe("split");
  fireEvent.click(screen.getByText("Crash leader"));
  act(() => vi.advanceTimersByTime(25000));
  expect(scene.playback!.getSnapshot().nodes.A.role).toBe("leader");
  expect((screen.getByText("Crash leader") as HTMLButtonElement).disabled).toBe(
    false,
  );
  await visible(false);
  await visible();
  expect(screen.queryByRole("button", { name: "Step" })).toBeNull();
});
it("starts paused under reduced motion and remains operable after renderer failure", async () => {
  reduced = true;
  scene.fail = true;
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<RaftElectionDemo />);
  await visible();
  expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
  fireEvent.click(screen.getByText("Crash leader"));
  expect(screen.getByText("Resume")).toBeTruthy();
  act(() => vi.advanceTimersByTime(10000));
  expect(scene.playback!.getTime()).toBe(0);
  fireEvent.click(screen.getByText("Resume"));
  act(() => vi.advanceTimersByTime(1000));
  expect(scene.playback!.getTime()).toBeGreaterThan(0);
  error.mockRestore();
});

it("scenario selection preserves paused progress and the current leader", async () => {
  render(<RaftElectionDemo />);
  await visible();
  fireEvent.click(screen.getByText("Crash leader"));
  act(() => vi.advanceTimersByTime(20000));
  fireEvent.click(screen.getByText("Pause"));
  const before = scene.playback!.getSnapshot();
  expect(before.nodes.A.role).toBe("leader");
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "split" },
  });
  expect(scene.playback!.getSnapshot().now).toBe(before.now);
  expect(scene.playback!.getSnapshot().crashed).toEqual([]);
  expect(scene.playback!.getSnapshot().nodes.A.role).toBe("leader");
  expect(screen.getByText("Resume")).toBeTruthy();
  act(() => vi.advanceTimersByTime(5000));
  expect(scene.playback!.getTime()).toBe(before.now);
});
