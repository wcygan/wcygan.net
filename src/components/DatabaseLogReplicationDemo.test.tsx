/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DatabaseLogReplicationDemo } from "./DatabaseLogReplicationDemo";

let ready: () => void;
let unavailable: () => void;
let observer: IntersectionObserverCallback;
let preload: IntersectionObserverCallback;
let motionChange: () => void;
let reduced = false;
let sceneReadOffset: number | null;
vi.mock("~/demos/database-log-replication/Scene", () => ({
  default: ({
    onReady,
    onUnavailable,
    readOffset,
  }: {
    readOffset: number | null;
    onReady: () => void;
    onUnavailable: () => void;
  }) => {
    sceneReadOffset = readOffset;
    ready = onReady;
    unavailable = onUnavailable;
    return null;
  },
}));

function visibility(visible: boolean) {
  act(() =>
    observer(
      [
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
}
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
function button(name: string) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}
function status() {
  return screen.getByRole("status").textContent;
}
async function mount() {
  await act(async () => {
    render(<DatabaseLogReplicationDemo />);
  });
  visibility(true);
  await act(async () => {});
  act(() => ready());
}

beforeEach(() => {
  reduced = false;
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener(_event: string, callback: () => void) {
      motionChange = callback;
    },
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        if (options?.rootMargin) preload = callback;
        else observer = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("allows primary reads after commit while the replica is still behind", async () => {
  await mount();
  expect(button("Read").disabled).toBe(false);
  advance(950);
  expect(status()).toContain("Primary 1 · Received 0 · Applied 0 · Lag 1");
  expect(button("Read").disabled).toBe(false);
  act(() => fireEvent.click(button("Read")));
  expect(status()).toContain("Read served by primary at log offset 0.");
  expect(button("Write").disabled).toBe(false);
  advance(1700);
  expect(status()).toContain("Primary 1 · Received 1 · Applied 0 · Lag 1");
  advance(1100);
  expect(status()).toContain("1 write replicated in order");
  expect(button("Write").disabled).toBe(false);
  advance(10_000);
  expect(status()).toContain("Primary 1 · Received 1 · Applied 1 · Lag 0");
});

it("pauses the pipeline offscreen and resumes the same write", async () => {
  await mount();
  advance(950);
  visibility(false);
  advance(10_000);
  expect(status()).toContain("Primary 1 · Received 0 · Applied 0 · Lag 1");
  visibility(true);
  advance(1700);
  advance(1100);
  expect(status()).toContain("1 write replicated in order");
});

it("uses settled writes with reduced motion and resets both logs", async () => {
  reduced = true;
  await mount();
  expect(status()).toContain("1 write replicated in order");
  for (let index = 0; index < 5; index++) {
    advance(500);
    act(() => fireEvent.click(button("Write")));
  }
  advance(500);
  expect(status()).toContain("6 writes replicated in order");
  act(() => fireEvent.click(button("Reset")));
  expect(status()).toContain("Primary 0 · Received 0 · Applied 0 · Lag 0");
  expect(button("Read").disabled).toBe(false);
  act(() => fireEvent.click(button("Write")));
  expect(status()).toContain("1 write replicated in order");
});

it("settles an in-flight write when reduced motion is enabled", async () => {
  await mount();
  advance(950);
  act(() => {
    reduced = true;
    motionChange();
  });
  expect(status()).toContain("Primary 1 · Received 1 · Applied 1 · Lag 0");
  expect(button("Write").disabled).toBe(false);
});

it("keeps the simulation usable if WebGL fails", async () => {
  await act(async () => {
    render(<DatabaseLogReplicationDemo />);
  });
  visibility(true);
  await act(async () => {});
  act(() => unavailable());
  expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
  advance(950);
  advance(1700);
  advance(1100);
  expect(status()).toContain("1 write replicated in order");
  expect(button("Write").disabled).toBe(false);
});

it("preloads near the viewport without starting replication offscreen", async () => {
  await act(async () => {
    render(<DatabaseLogReplicationDemo />);
  });
  await act(async () => {
    preload(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
  act(() => ready());
  advance(10_000);
  expect(button("Write").disabled).toBe(false);
  expect(status()).toContain("Primary 0 · Received 0 · Applied 0 · Lag 0");
  visibility(true);
  advance(950);
  expect(status()).toContain("Primary 1 · Received 0 · Applied 0 · Lag 1");
});

it("accepts overlapping writes every 500ms and refreshes repeated reads", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.9);
  await mount();
  expect(button("Write").disabled).toBe(true);
  advance(499);
  expect(button("Write").disabled).toBe(true);
  advance(1);
  expect(button("Write").disabled).toBe(false);
  act(() => fireEvent.click(button("Write")));
  expect(status()).toContain("2 writes in flight");
  advance(850);
  expect(status()).toContain("Primary 2 · Received 0 · Applied 0 · Lag 2");
  act(() => fireEvent.click(button("Read")));
  advance(2000);
  act(() => fireEvent.click(button("Read")));
  advance(500);
  expect(status()).toContain("Read served by primary at log offset 1");
  advance(1900);
  expect(status()).toContain("Reads and writes → primary only");
  expect(status()).toContain("Primary 2 · Received 2 · Applied 2 · Lag 0");
});

it("reads random committed entries and passes the same offset to the scene", async () => {
  await mount();
  advance(500);
  act(() => fireEvent.click(button("Write")));
  advance(500);
  act(() => fireEvent.click(button("Write")));
  advance(850);
  expect(status()).toContain("Primary 3 · Received 0 · Applied 0 · Lag 3");
  const random = vi.spyOn(Math, "random");
  for (const [sample, offset] of [
    [0, 0],
    [0.5, 1],
    [0.999, 2],
  ]) {
    random.mockReturnValue(sample);
    act(() => fireEvent.click(button("Read")));
    expect(status()).toContain(
      `Read served by primary at log offset ${offset}.`,
    );
    expect(sceneReadOffset).toBe(offset);
  }
});

it("reports no committed entries when read before the first commit", async () => {
  await mount();
  act(() => fireEvent.click(button("Read")));
  expect(status()).toContain(
    "Read served by primary: no committed entries yet.",
  );
  expect(sceneReadOffset).toBe(-1);
});
