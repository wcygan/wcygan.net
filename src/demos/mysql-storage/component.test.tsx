/** @vitest-environment jsdom */
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MySqlBufferPoolDemo,
  MySqlIndexDemo,
  MySqlLockingDemo,
  MySqlRecoveryDemo,
  MySqlReplicationDemo,
} from "~/components/MySqlStorageDemos";

import { installPlaybackBrowser } from "~/demos/mysql-primer/playback-test-utils";

const scene = vi.hoisted(() => ({ fail: false, defer: false }));
vi.mock("./Scene", () => ({
  default: ({
    onReady,
    onUnavailable,
    view,
  }: {
    onReady: () => void;
    onUnavailable: () => void;
    view: { kind: string; revision: number };
  }) => {
    useEffect(() => {
      if (scene.fail) onUnavailable();
      else if (!scene.defer) onReady();
    }, [onReady, onUnavailable]);
    return (
      <div
        data-testid="storage-scene"
        data-view={`${view.kind}-${view.revision}`}
      />
    );
  },
}));
let browser: ReturnType<typeof installPlaybackBrowser>;
async function visible(value: boolean) {
  await act(async () => browser.visible(value));
}
function facts() {
  return Object.fromEntries(
    Array.from(
      screen.getByRole("status").querySelectorAll("dl > div"),
      (fact) => [
        fact.querySelector("dt")?.textContent,
        fact.querySelector("dd")?.textContent,
      ],
    ),
  );
}
beforeEach(() => {
  scene.fail = false;
  scene.defer = false;
  browser = installPlaybackBrowser();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MySQL storage figures", () => {
  it("yields to the HTML lesson if a context is lost before the first ready frame", async () => {
    scene.defer = true;
    render(<MySqlLockingDemo />);
    await visible(true);
    expect(
      screen
        .getByRole("button", { name: "Rotate view left" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent(
      screen.getByTestId("storage-scene"),
      new Event("webglcontextlost", { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByTestId("storage-scene")).toBeNull();
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(document.querySelector('[data-scene-loading="true"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "A locks inventory" }));
    expect(facts()).toEqual({
      "Available stock": "1",
      "Lock owner": "A",
      B: "Not started",
    });
  });

  it("uses one stage and lazily releases offscreen WebGL while retaining experiment state", async () => {
    render(<MySqlBufferPoolDemo />);
    expect(screen.queryByTestId("storage-scene")).toBeNull();
    const figure = screen.getByRole("figure", { name: "Memory before disk" });
    expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    await visible(true);
    expect(screen.getByTestId("storage-scene")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Read page 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Read page 1" }));
    await visible(false);
    expect(screen.queryByTestId("storage-scene")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("memory hit");
    await visible(true);
    expect(
      document.querySelectorAll(".mysql-storage-counters dd")[0]?.textContent,
    ).toBe("2");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.queryByTestId("storage-scene")).toBeNull();
  });
  it("supports keyboard camera commands independently of query steps", async () => {
    render(<MySqlIndexDemo />);
    await visible(true);
    fireEvent.keyDown(screen.getByRole("group", { name: "3D storage view" }), {
      key: "ArrowLeft",
    });
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByTestId("storage-scene").getAttribute("data-view")).toBe(
      "left-1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Covered query" }));
    for (let i = 0; i < 3; i++)
      fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByRole("status").textContent).toContain(
      "0 clustered fetches",
    );
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(
      ["101", "1", "102", "1"],
    );
  });
  it("keeps the lesson operable when the renderer fails", async () => {
    scene.fail = true;
    render(<MySqlBufferPoolDemo />);
    await visible(true);
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Read page 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Read page 2" }));
    expect(screen.getByRole("status").textContent).toContain("memory hit");
    fireEvent.click(screen.getByRole("button", { name: "Clear demo" }));
    expect(screen.getByRole("status").textContent).toContain("Memory empty");
  });
  it("prevents the waiting shopper from selling the same last book", () => {
    render(<MySqlLockingDemo />);
    fireEvent.click(screen.getByRole("button", { name: "A locks inventory" }));
    fireEvent.click(
      screen.getByRole("button", { name: "B requests same row" }),
    );
    expect(facts()).toEqual({
      "Available stock": "1",
      "Lock owner": "A",
      B: "Waiting",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "A sells and commits" }),
    );
    expect(facts()).toEqual({
      "Available stock": "0",
      "Lock owner": "B",
      B: "Reads 0",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "B checks and rolls back" }),
    );
    expect(facts()).toEqual({
      "Available stock": "0",
      "Lock owner": "None",
      Sales: "1",
    });
  });
  it("retains durable redo across a crash and reconstructs the committed change", () => {
    render(<MySqlRecoveryDemo />);
    fireEvent.click(
      screen.getByRole("button", { name: "Commit stock change" }),
    );
    expect(facts()).toEqual({
      "Memory stock": "1",
      "Disk stock": "2",
      Redo: "Durable change",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Crash before page flush" }),
    );
    expect(facts()).toEqual({
      "Memory stock": "Lost",
      "Disk stock": "2",
      Redo: "Survives",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Restart and recover" }),
    );
    expect(facts()).toEqual({
      "Recovered stock": "1",
      "Old page stock": "2 before redo",
      Commit: "Preserved",
    });
  });
  it("keeps a received replica change invisible until it is applied", () => {
    render(<MySqlReplicationDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Write order 104" }));
    fireEvent.click(screen.getByRole("button", { name: "Receive change" }));
    expect(facts()).toEqual({
      "Source orders": "4",
      "Replica orders": "3",
      "Relay log": "Change 1",
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply on replica" }));
    expect(facts()).toEqual({
      "Source orders": "4",
      "Replica orders": "4",
      "Pending changes": "0",
    });
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(facts()).toEqual({
      "Source orders": "3",
      "Replica orders": "3",
      "Pending changes": "0",
    });
  });
});
