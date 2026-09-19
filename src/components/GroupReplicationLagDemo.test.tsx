/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type Scene from "~/demos/group-replication-lag/Scene";
import { GroupReplicationLagDemo } from "./GroupReplicationLagDemo";

let scene: Parameters<typeof Scene>[0];
let observer: IntersectionObserverCallback;
let reduced = false;
vi.mock("~/demos/group-replication-lag/Scene", () => ({
  default: (props: Parameters<typeof Scene>[0]) => {
    scene = props;
    return null;
  },
}));
function visibility(ratio: number) {
  act(() =>
    observer(
      [
        {
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
}
function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}
function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}
async function mount(ready = true) {
  await act(async () => {
    render(<GroupReplicationLagDemo />);
  });
  visibility(1);
  await act(async () => {});
  if (ready) act(() => scene.onReady());
}
beforeEach(() => {
  reduced = false;
  vi.useFakeTimers();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        if (!options?.rootMargin) observer = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("automatically submits only the first write, then accepts manual writes and reset", async () => {
  await mount(false);
  advance(2000);
  expect(scene.state.submitted).toBe(0);
  act(() => scene.onReady());
  advance(20_000);
  expect(scene.state.submitted).toBe(1);
  expect(scene.state.members.map((member) => member.applied)).toEqual([
    1, 1, 1,
  ]);
  click("Write");
  expect(scene.state.submitted).toBe(2);
  expect(
    (screen.getByRole("button", { name: "Write" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  click("Reset");
  expect(scene.state.submitted).toBe(0);
  advance(20_000);
  expect(scene.state.submitted).toBe(0);
  expect(vi.getTimerCount()).toBe(1);
  click("Write");
  expect(scene.state.submitted).toBe(1);
});

it("opens an obvious read comparison, freezes its values, and resumes on close", async () => {
  await mount();
  advance(4200);
  click("Read all");
  const dialog = screen.getByRole("dialog", { name: "Read results" });
  expect(
    Array.from(dialog.querySelectorAll(".group-lag-read-version")).map(
      (el) => el.textContent,
    ),
  ).toEqual(["Version 1", "Version 1", "Version 0"]);
  expect(within(dialog).getByText("00:04.20")).toBeTruthy();
  expect(
    within(dialog).getByLabelText("0 applied, 1 pending, 5 not received"),
  ).toBeTruthy();
  expect(
    within(dialog).getByText(/Replica B returned a value 1 version behind/),
  ).toBeTruthy();
  const frozenTime = scene.playback.getTime();
  advance(10_000);
  expect(scene.playback.getTime()).toBe(frozenTime);
  click("Close");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Read all" }),
  );
  advance(9000);
  click("Read all");
  expect(
    screen.getByText("All three databases returned version 1."),
  ).toBeTruthy();
});

it("preserves camera commands across writes, reads, and reset and supports keyboard control", async () => {
  await mount();
  click("Top view");
  const view = scene.view;
  advance(4500);
  click("Write");
  click("Read all");
  click("Close");
  click("Reset");
  expect(scene.view).toBe(view);
  const stage = screen.getByRole("group", {
    name: "3D replication scene camera",
  });
  for (const [key, kind] of [
    ["ArrowLeft", "left"],
    ["+", "in"],
    ["Home", "reset"],
  ]) {
    fireEvent.keyDown(stage, { key });
    expect(scene.view.kind).toBe(kind);
  }
});

it("suspends below half visibility and while hidden without closing a read comparison", async () => {
  await mount();
  advance(1000);
  visibility(0.49);
  advance(10_000);
  expect(scene.playback.getTime()).toBeCloseTo(1000 / 3);
  visibility(0.5);
  advance(200);
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  advance(10_000);
  expect(scene.playback.getTime()).toBeCloseTo(400);
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  click("Read all");
  visibility(0);
  visibility(1);
  advance(10_000);
  expect(scene.state.reads).not.toBeNull();
  expect(scene.playback.getTime()).toBeCloseTo(400);
});

it("offers discrete writes and queue application under reduced motion", async () => {
  reduced = true;
  await mount();
  expect(scene.state.members.map((member) => member.applied)).toEqual([
    1, 1, 0,
  ]);
  click("Write");
  expect(scene.state.members.map((member) => member.applied)).toEqual([
    2, 2, 0,
  ]);
  click("Apply pending");
  expect(scene.state.members.map((member) => member.applied)).toEqual([
    2, 2, 2,
  ]);
  expect(screen.queryByRole("button", { name: "Apply pending" })).toBeNull();
  expect(vi.getTimerCount()).toBe(1);
});

it.each(["renderer", "loading"])(
  "keeps writes, reads, and reset usable after %s failure",
  async (failure) => {
    await mount(false);
    if (failure === "renderer") act(() => scene.onUnavailable());
    else advance(10_000);
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    advance(4200);
    click("Read all");
    expect(screen.getByRole("dialog", { name: "Read results" })).toBeTruthy();
    expect(
      screen.getByText(/Replica B returned a value 1 version behind/),
    ).toBeTruthy();
    click("Close");
    click("Reset");
    click("Write");
    advance(4200);
    click("Read all");
    expect(
      screen.getByText(/Replica B returned a value 1 version behind/),
    ).toBeTruthy();
  },
);

it("clears playback and loading timers on unmount", async () => {
  await mount();
  expect(vi.getTimerCount()).toBe(2);
  cleanup();
  expect(vi.getTimerCount()).toBe(0);
});

it("freezes the visible wall clock during a snapshot and resumes without jumping", async () => {
  await mount();
  advance(4200);
  expect(screen.getByRole("timer").textContent).toContain("00:04.20");
  click("Read all");
  advance(2000);
  expect(screen.getByRole("timer", { hidden: true }).textContent).toContain(
    "00:04.20",
  );
  expect(within(screen.getByRole("dialog")).getByText("00:04.20")).toBeTruthy();
  expect(vi.getTimerCount()).toBe(0);
  click("Close");
  advance(500);
  expect(screen.getByRole("timer").textContent).toContain("00:04.70");
  click("Reset");
  expect(screen.getByRole("timer").textContent).toContain("00:00.00");
});

it("changes both bottlenecks live and recovers the existing write", async () => {
  await mount();
  fireEvent.change(screen.getByRole("slider", { name: "Link 2 latency" }), {
    target: { value: "2800" },
  });
  fireEvent.change(
    screen.getByRole("slider", { name: "Replica B processing time" }),
    { target: { value: "5000" } },
  );
  advance(6000);
  expect(scene.state.members[0].applied).toBe(1);
  expect(scene.state.members[1].applied).toBe(1);
  expect(scene.state.members[2].received).toBe(0);
  fireEvent.change(screen.getByRole("slider", { name: "Link 2 latency" }), {
    target: { value: "700" },
  });
  click("Speed up B");
  expect(scene.state.conditions).toEqual({
    processingTime: 400,
    linkLatency: 700,
  });
  advance(10_000);
  expect(scene.state.submitted).toBe(1);
  expect(scene.state.members.map((m) => m.applied)).toEqual([1, 1, 1]);
  expect(scene.state.pending).toBe(false);
});

it("toggles connectivity accessibly and labels disconnected snapshots as last applied state", async () => {
  await mount();
  click("Interrupt Link 2");
  expect(
    screen
      .getByRole("button", { name: "Reconnect Link 2" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  advance(500);
  click("Write");
  advance(3500);
  expect(scene.state.members[0].applied).toBe(2);
  expect(scene.state.members[2].received).toBe(0);
  click("Read all");
  const dialog = screen.getByRole("dialog", { name: "Read results" });
  expect(within(dialog).getByText("Last applied state")).toBeTruthy();
  expect(within(dialog).getByRole("heading", { name: "Read results" })).toBe(
    document.activeElement,
  );
  advance(20000);
  expect(scene.state.membership).toBe("online");
  click("Close");
  click("Reconnect Link 2");
  expect(
    screen
      .getByRole("button", { name: "Interrupt Link 2" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
  advance(30000);
  expect(scene.state.members.map((m) => m.applied)).toEqual([2, 2, 2]);
});
