/** @vitest-environment jsdom */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DatabaseLogDemo } from "./DatabaseLogDemo";
import { DatabaseLogReplicationDemo } from "./DatabaseLogReplicationDemo";
import { KafkaPartitioningDemo } from "./KafkaPartitioningDemo";
import { FailureDetectorDemo } from "./FailureDetectorDemo";
import { RaftElectionDemo } from "./RaftElectionDemo";
import { TidbArchitectureDemo } from "./TidbArchitectureDemo";
import { TidbSecondaryIndexDemo } from "./TidbSecondaryIndexDemo";

const scene = vi.hoisted(() => ({
  ready: () => {},
  fail: () => {},
  component: (props: { onReady: () => void; onUnavailable: () => void }) => {
    scene.ready = props.onReady;
    scene.fail = props.onUnavailable;
    return null;
  },
}));
vi.mock("~/demos/database-log/Scene", () => ({ default: scene.component }));
vi.mock("~/demos/database-log-replication/Scene", () => ({
  default: scene.component,
}));
vi.mock("~/demos/kafka-partitioning/Scene", () => ({
  default: scene.component,
}));
vi.mock("~/demos/failure-detectors/Scene", () => ({
  default: scene.component,
}));
vi.mock("~/demos/raft-election/Scene", () => ({ default: scene.component }));
vi.mock("~/demos/tidb-architecture/Scene", () => ({
  default: scene.component,
}));
vi.mock("~/demos/tidb-secondary-index/Scene", () => ({
  default: scene.component,
}));

beforeEach(() => {
  vi.useFakeTimers();
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [
            {
              isIntersecting: true,
              intersectionRatio: 1,
            } as IntersectionObserverEntry,
          ],
          this as unknown as IntersectionObserver,
        );
      }
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const demos = [
  DatabaseLogDemo,
  DatabaseLogReplicationDemo,
  KafkaPartitioningDemo,
  FailureDetectorDemo,
  RaftElectionDemo,
  TidbArchitectureDemo,
  TidbSecondaryIndexDemo,
];
for (const Demo of demos) {
  it(`${Demo.name} waits for the scene before enabling controls or advancing`, async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<Demo />));
    });
    const figure = container.querySelector("figure")!;
    const before = container.textContent;
    expect(figure.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector(".demo-scene-spinner")).not.toBeNull();
    expect(
      [...container.querySelectorAll("button")].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
    act(() => vi.advanceTimersByTime(10_000));
    expect(container.textContent).toBe(before);
    act(() => scene.ready());
    expect(figure.getAttribute("aria-busy")).toBe("false");
    expect(container.querySelector(".demo-scene-spinner")).toBeNull();
    expect(
      [...container.querySelectorAll("button")].some(
        (button) => !button.disabled,
      ),
    ).toBe(true);
  });
  it(`${Demo.name} clears loading when 3D is unavailable`, async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<Demo />));
    });
    act(() => scene.fail());
    expect(container.querySelector(".demo-scene-spinner")).toBeNull();
    expect(container.textContent).toContain("3D is unavailable");
    expect(container.querySelector("figure")!.getAttribute("aria-busy")).toBe(
      "false",
    );
  });
}
