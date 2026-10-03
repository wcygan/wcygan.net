/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CameraCommand,
  IntroSceneState,
} from "~/demos/kafka-intro/spatial-model";
import {
  KafkaKeyRoutingDemo,
  KafkaReplicationDemo,
  KafkaRetainedLogDemo,
  KafkaLagDemo,
  KafkaHotKeyDemo,
  KafkaPlacementDemo,
} from "./KafkaIntroScenes";

interface SceneProps {
  state: IntroSceneState;
  cameraCommand: CameraCommand;
  onReady: () => void;
  onUnavailable: () => void;
}
const scene = vi.hoisted(() => ({
  props: null as SceneProps | null,
  fail: false,
}));

vi.mock("~/demos/kafka-intro/KafkaIntroScene", () => ({
  default: (props: SceneProps) => {
    if (scene.fail) throw new Error("WebGL unavailable");
    scene.props = props;
    return null;
  },
}));

const intersections = new Map<
  IntersectionObserver,
  IntersectionObserverCallback
>();
const disconnect = vi.fn();

beforeEach(() => {
  scene.props = null;
  scene.fail = false;
  disconnect.mockClear();
  intersections.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersections.set(this as unknown as IntersectionObserver, callback);
      }
      observe() {}
      disconnect() {
        disconnect();
        intersections.delete(this as unknown as IntersectionObserver);
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function enterView() {
  await act(async () => {
    for (const [observer, callback] of [...intersections]) {
      callback(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
          } as IntersectionObserverEntry,
        ],
        observer,
      );
    }
    await Promise.resolve();
  });
}

describe("Kafka introduction 3D shells", () => {
  it.each([
    ["A Retained Log", KafkaRetainedLogDemo],
    ["Keys and Partitions", KafkaKeyRoutingDemo],
    ["Replicas and Failures", KafkaReplicationDemo],
    ["A Slow Reader", KafkaLagDemo],
    ["One Busy Key", KafkaHotKeyDemo],
    ["Partitions Across Brokers", KafkaPlacementDemo],
  ] as const)(
    "gives %s one authored stage and controls outside it",
    async (title, Demo) => {
      const { container } = render(<Demo />);
      expect(container.querySelectorAll("figure")).toHaveLength(1);
      expect(
        container.querySelector("figure")?.getAttribute("data-graphic-frame"),
      ).toBe("workbench");
      expect(container.querySelectorAll("[data-graphic-stage]")).toHaveLength(
        1,
      );
      const stage = screen.getByRole("group", { name: `${title}: 3D view` });
      expect(within(stage).queryAllByRole("button")).toHaveLength(0);
      expect(scene.props).toBeNull();
      expect(stage.getAttribute("aria-busy")).toBe("true");
      await enterView();
      expect(scene.props).not.toBeNull();
      act(() => scene.props!.onReady());
      expect(stage.getAttribute("aria-busy")).toBe("false");
      expect(
        screen.queryByRole("status", { name: "Loading 3D demo" }),
      ).toBeNull();
      expect(
        (
          screen.getByRole("button", {
            name: "Orbit left",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
      expect(disconnect).toHaveBeenCalled();
    },
  );

  it("keeps positions independent and retained records readable without WebGL", async () => {
    render(<KafkaRetainedLogDemo />);
    await enterView();
    act(() => scene.props!.onUnavailable());
    const billing = screen.getByRole("button", { name: "Read as Billing" });
    for (let i = 0; i < 6; i++) fireEvent.click(billing);
    expect((billing as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText("Billing: caught up. Analytics: next offset 0."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Read as Analytics" }));
    fireEvent.click(screen.getByRole("button", { name: "Replay Billing" }));
    expect(
      screen.getByText("Billing: next offset 0. Analytics: next offset 1."),
    ).toBeTruthy();
    expect(
      screen.getByText("Partition 0 still holds offsets 0, 1, 2, 3, 4, 5."),
    ).toBeTruthy();
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Reset view" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("sends the finite key sequence with inspectable local offsets", () => {
    render(<KafkaKeyRoutingDemo />);
    for (const key of ["A", "B", "A", "C", "B", "A"]) {
      fireEvent.click(screen.getByRole("button", { name: `Send ${key}` }));
    }
    const logs = screen.getByRole("list", { name: "Partition contents" });
    expect(logs.textContent).toBe("P0: A@0, A@1, A@2P1: B@0, B@1P2: C@0");
    expect(
      screen.getByText("Three logs; no single order across all three."),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "All records sent",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Reset records" }));
    expect(logs.textContent).toBe("P0: emptyP1: emptyP2: empty");
  });

  it("finishes the replication scenario with a rejected write and preserved offsets", () => {
    render(<KafkaReplicationDemo />);
    for (const label of [
      "Fail broker 1",
      "Write record 3",
      "Fail broker 3",
      "Try another write",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }
    expect(screen.getByText(/The new write is rejected/)).toBeTruthy();
    const copies = screen.getByRole("list", { name: "Replica contents" });
    expect(copies.textContent).toContain(
      "Broker 2: leader; offsets 0, 1, 2, 3.",
    );
    expect(copies.textContent).toContain(
      "Broker 3: offline; offsets 0, 1, 2, 3.",
    );
    expect(copies.textContent).not.toContain(", 4");
    expect(
      (
        screen.getByRole("button", {
          name: "Scenario complete",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("makes keyboard camera commands independent of record progress", async () => {
    render(<KafkaKeyRoutingDemo />);
    await enterView();
    act(() => scene.props!.onReady());
    const stage = screen.getByRole("group", {
      name: "Keys and Partitions: 3D view",
    });
    for (const [key, action] of [
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
      ["ArrowUp", "up"],
      ["ArrowDown", "down"],
      ["+", "in"],
      ["-", "out"],
      ["0", "reset"],
    ]) {
      fireEvent.keyDown(stage, { key });
      expect(scene.props!.cameraCommand.action).toBe(action);
    }
    const camera = scene.props!.cameraCommand;
    expect(camera.revision).toBe(7);
    fireEvent.click(screen.getByRole("button", { name: "Send A" }));
    expect(scene.props!.cameraCommand).toBe(camera);
    expect(scene.props!.state).toEqual({ kind: "routing", sent: 1 });
  });

  it("clears loading after renderer failure and retains operable lesson controls", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    scene.fail = true;
    render(<KafkaReplicationDemo />);
    await enterView();
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "Loading 3D demo" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fail broker 1" }));
    expect(screen.getByText(/After failure detection/)).toBeTruthy();
  });

  it("waits for WebGL, keeps autoplay during camera exploration, and pauses for a manual record", async () => {
    vi.useFakeTimers();
    render(<KafkaKeyRoutingDemo />);
    await enterView();
    act(() => vi.advanceTimersByTime(9000));
    expect(scene.props!.state).toEqual({ kind: "routing", sent: 0 });

    act(() => scene.props!.onReady());
    act(() => vi.advanceTimersByTime(2200));
    expect(scene.props!.state).toEqual({ kind: "routing", sent: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Orbit left" }));
    const camera = scene.props!.cameraCommand;
    act(() => vi.advanceTimersByTime(2200));
    expect(scene.props!.state).toEqual({ kind: "routing", sent: 2 });
    expect(scene.props!.cameraCommand).toBe(camera);

    fireEvent.click(screen.getByRole("button", { name: "Send A" }));
    act(() => vi.advanceTimersByTime(9000));
    expect(scene.props!.state).toEqual({ kind: "routing", sent: 3 });
  });

  it.each([
    [
      KafkaRetainedLogDemo,
      8,
      2400,
      { kind: "retained", readers: { billing: 1, analytics: 3 } },
    ],
    [KafkaKeyRoutingDemo, 6, 2200, { kind: "routing", sent: 6 }],
    [KafkaReplicationDemo, 4, 2800, { kind: "replication", step: 4 }],
    [KafkaLagDemo, 9, 2200, { kind: "lag", end: 7, processed: 7 }],
    [KafkaHotKeyDemo, 1, 3000, { kind: "skew", skewed: false }],
    [KafkaPlacementDemo, 1, 3000, { kind: "placement", distributed: true }],
  ] as const)(
    "autoplays %s to a finite inspectable result",
    async (Demo, steps, interval, result) => {
      vi.useFakeTimers();
      render(<Demo />);
      await enterView();
      act(() => scene.props!.onReady());
      for (let i = 0; i < steps; i++) {
        act(() => vi.advanceTimersByTime(interval));
      }
      expect(scene.props!.state).toEqual(result);
      act(() => vi.advanceTimersByTime(10000));
      expect(scene.props!.state).toEqual(result);
    },
  );

  it("stops autoplay after a WebGL failure while manual controls still work", async () => {
    vi.useFakeTimers();
    render(<KafkaReplicationDemo />);
    await enterView();
    act(() => scene.props!.onReady());
    act(() => vi.advanceTimersByTime(2800));
    act(() => scene.props!.onUnavailable());
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.getByText(/After failure detection/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Write record 3" }));
    expect(
      screen.getByText(/Both in-sync replicas stored record 3/),
    ).toBeTruthy();
  });
});
