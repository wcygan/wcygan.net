/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TidbArchitectureDemo } from "~/components/TidbArchitectureDemo";
import { operationSteps, type ViewCommand } from "./model";
import type { Playback, PlaybackSnapshot } from "./playback";
import type { Inspection } from "./presentation";

interface SceneProps {
  playback: Playback;
  state: PlaybackSnapshot;
  active: boolean;
  reduced: boolean;
  view: ViewCommand;
  onUnavailable: () => void;
  inspection: Inspection | null;
  onHover: (target: Inspection | null) => void;
  onSelect: (target: Inspection | null) => void;
}
const scene = vi.hoisted(() => ({
  fail: false,
  props: null as SceneProps | null,
}));
vi.mock("./Scene", () => ({
  default: (props: SceneProps) => {
    if (scene.fail) throw new Error("Scene failed");
    scene.props = props;
    return <div data-testid="scene" />;
  },
}));
let intersection: IntersectionObserverCallback;
let reduced = false;
let mediaChange: () => void;
const visibility = (visible: boolean) =>
  act(async () =>
    intersection(
      [
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
beforeEach(() => {
  scene.fail = false;
  scene.props = null;
  reduced = false;
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, cb: () => void) => {
      mediaChange = cb;
    },
    removeEventListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

const choose = (name: string) => {
  click(name.startsWith("Random write") ? "Write" : "Read");
  fireEvent.click(screen.getByRole("menuitem", { name }));
};
// One 2x beat, including the initial animation-frame timestamp.
const advance = (beats = 1) => act(() => vi.advanceTimersByTime(1216 * beats));

describe("query workbench", () => {
  it("groups scenarios, supports menu keys and dismisses on selection, Escape, blur, or outside click", async () => {
    render(<TidbArchitectureDemo />);
    await visibility(true);
    const read = screen.getByRole("button", { name: "Read" });
    const write = screen.getByRole("button", { name: "Write" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Step" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Show all replicas" }),
    ).toBeNull();
    click("Read");
    expect(read.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Leader read");
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement?.textContent).toBe("Lagging follower read");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toBe("Leader read");
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(document.activeElement).toBe(read);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.keyDown(read, { key: "ArrowUp" });
    expect(document.activeElement?.textContent).toBe("Lagging follower read");
    fireEvent.click(document.activeElement!);
    expect(scene.props!.state.operation.readMode).toBe("follower-lagging");
    expect(document.activeElement).toBe(read);
    expect(screen.queryByRole("menu")).toBeNull();
    click("Write");
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
    click("Read");
    act(() => write.focus());
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("previews choices on mouse hover without moving focus or starting playback", async () => {
    // jsdom does not implement PointerEvent.
    vi.stubGlobal(
      "PointerEvent",
      class extends MouseEvent {
        pointerType: string;
        constructor(type: string, init: PointerEventInit) {
          super(type, init);
          this.pointerType = init.pointerType ?? "mouse";
        }
      },
    );
    render(<TidbArchitectureDemo />);
    await visibility(true);
    const read = screen.getByRole("button", { name: "Read" });
    fireEvent.pointerEnter(read, { pointerType: "mouse" });
    expect(screen.getByRole("menu", { name: "Read" })).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
    expect(scene.props!.state.playing).toBe(false);
    fireEvent.pointerLeave(read.parentElement!, { pointerType: "mouse" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.pointerEnter(read, { pointerType: "touch" });
    expect(screen.queryByRole("menu")).toBeNull();
    click("Read");
    expect(screen.getByRole("menu")).toBeTruthy();
  });
  it.each([false, true])(
    "plays each read scenario and the majority write with WebGL unavailable=%s",
    async (unavailable) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(Math, "random").mockReturnValue(426.5 / 1400);
      scene.fail = unavailable;
      render(<TidbArchitectureDemo />);
      await visibility(true);
      const view = scene.props?.view;
      choose("Lagging follower read");
      advance(6);
      expect(screen.getByRole("status").textContent).toContain(
        "Its applied position is still 98",
      );
      advance();
      expect(screen.getByRole("status").textContent).toContain(
        "read remains blocked",
      );
      advance();
      expect(screen.getByRole("status").textContent).toContain(
        "has applied through position 100",
      );
      advance();
      expect(screen.getByRole("status").textContent).toContain(
        "returns the row directly",
      );
      choose("Caught-up follower read");
      advance(6);
      expect(screen.getByRole("status").textContent).toContain(
        "read barrier is satisfied immediately",
      );
      advance();
      expect(screen.getByRole("status").textContent).toContain(
        "returns the row directly",
      );
      choose("Leader read");
      advance(3);
      expect(screen.getByRole("status").textContent).toContain(
        "valid leader lease",
      );
      if (!unavailable) expect(scene.props!.view).toBe(view);
      choose("Random write");
      advance(4);
      expect(screen.getByRole("status").textContent).toContain(
        "A majority commits",
      );
    },
  );
  it("defaults to 2x and preserves speed, progress, and camera when settings change", async () => {
    render(<TidbArchitectureDemo />);
    await visibility(true);
    const speed = screen.getByRole("combobox", {
      name: "Speed",
    }) as HTMLSelectElement;
    expect(speed.value).toBe("2");
    expect([...speed.options].map((o) => o.value)).toEqual([
      "0.5",
      "1",
      "2",
      "4",
      "8",
    ]);
    const view = scene.props!.view;
    choose("Caught-up follower read");
    act(() => vi.advanceTimersByTime(200));
    const progress = scene.props!.playback.progress();
    fireEvent.change(speed, { target: { value: "8" } });
    expect(scene.props!.playback.progress()).toBe(progress);
    expect(scene.props!.state).toMatchObject({ speed: 8, playing: true });
    choose("Lagging follower read");
    expect(speed.value).toBe("8");
    expect(scene.props!.view).toBe(view);
    act(() => {
      reduced = true;
      mediaChange();
    });
    expect(speed.disabled).toBe(false);
    expect(scene.props!.reduced).toBe(true);
    expect(scene.props!.state.playing).toBe(true);
  });
  it("pauses for inspection, resumes from the controls, and keeps camera commands independent", async () => {
    render(<TidbArchitectureDemo />);
    await visibility(true);
    const stage = screen.getByRole("group", { name: /^3D architecture/ });
    expect(stage.contains(screen.getByRole("button", { name: "Play" }))).toBe(
      false,
    );
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    const view = scene.props!.view;
    act(() => scene.props!.onHover({ kind: "node", id: "TiKV 7" }));
    expect(screen.getByRole("status").textContent).toContain(
      "R3 (users 401–600): leader",
    );
    act(() => scene.props!.onHover(null));
    click("Play");
    advance();
    act(() => scene.props!.onSelect({ kind: "node", id: "TiKV 7" }));
    expect(scene.props!.state.playing).toBe(false);
    act(() => scene.props!.onSelect({ kind: "connection", id: "metadata" }));
    expect(screen.getByRole("status").textContent).toContain(
      "row itself never travels through PD",
    );
    const progress = scene.props!.playback.progress();
    click("Play");
    expect(scene.props!.playback.progress()).toBe(progress);
    expect(scene.props!.inspection).toBeNull();
    expect(scene.props!.view).toBe(view);
    click("Pause");
    advance(3);
    expect(scene.props!.playback.progress()).toBe(progress);
    fireEvent.keyDown(stage, { key: "Home" });
    expect(scene.props!.view.kind).toBe("reset");
    expect(scene.props!.state.playing).toBe(false);
  });
  it("provides a usable summary before the client scene loads", async () => {
    render(<TidbArchitectureDemo />);
    expect(
      screen.getByText("SELECT name FROM users WHERE id = 427;"),
    ).toBeTruthy();
    expect(screen.getByText("TiKV 9", { selector: "dt" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(document.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    expect(scene.props).toBeNull();
    await visibility(true);
    expect(screen.getByTestId("scene")).toBeTruthy();
    expect(scene.props!.state.step).toBe(0);
  });
  it.each(["Random write", "Leader read"])(
    "clears failure when switching to %s",
    async (next) => {
      render(<TidbArchitectureDemo />);
      await visibility(true);
      choose("Random write with failure");
      advance(3);
      expect(screen.getByRole("status").textContent).toContain(
        "drops the message",
      );
      choose(next);
      expect(scene.props!.state.operation.dropFollowerMessage).toBe(false);
      expect(scene.props!.state.step).toBe(1);
      const steps = operationSteps(scene.props!.state.operation);
      expect(steps.every((s) => !s.follower)).toBe(true);
      expect(
        steps.flatMap((s) => s.paths).some((p) => p.delivery === "dropped"),
      ).toBe(false);
    },
  );
  it("pauses offscreen and in hidden documents, then stops at completion", async () => {
    render(<TidbArchitectureDemo />);
    await visibility(true);
    click("Play");
    act(() => vi.advanceTimersByTime(500));
    const progress = scene.props!.playback.progress();
    expect(progress).toBeGreaterThan(0);
    await visibility(false);
    advance(5);
    expect(scene.props!.playback.progress()).toBe(progress);
    await visibility(true);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    advance(5);
    expect(scene.props!.playback.progress()).toBe(progress);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    advance(20);
    expect(screen.getByRole("status").textContent).toContain("Read complete");
    expect(scene.props!.state.moving).toBe(false);
    click("Play again");
    expect(scene.props!.state.step).toBe(1);
  });
  it.each(["render", "context"])(
    "keeps menus, playback, and narration usable after %s failure",
    async (failure) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      scene.fail = failure === "render";
      render(<TidbArchitectureDemo />);
      await visibility(true);
      if (failure === "context") act(() => scene.props!.onUnavailable());
      expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
      choose("Random write");
      advance(2);
      expect(screen.getByRole("status").textContent).toContain(
        "TiDB sends the request",
      );
      click("Pause");
      const status = screen.getByRole("status").textContent;
      advance(5);
      expect(screen.getByRole("status").textContent).toBe(status);
      click("Play");
      advance(10);
      expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();
    },
  );
  it("plays and pauses reduced-motion states, including failure and catch-up without WebGL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Math, "random").mockReturnValue(426.5 / 1400);
    reduced = true;
    scene.fail = true;
    render(<TidbArchitectureDemo />);
    await visibility(true);
    choose("Random write with failure");
    advance(3);
    const follower = () =>
      screen.getByText("TiKV 9", { selector: "dt" }).nextElementSibling!
        .textContent;
    expect(follower()).toContain("R3: Behind");
    click("Pause");
    advance(3);
    expect(screen.getByRole("status").textContent).toContain(
      "drops the message to TiKV 9",
    );
    click("Play");
    advance(4);
    expect(screen.getByRole("status").textContent).toContain(
      "acknowledges the update to the application",
    );
    expect(follower()).toContain("Behind");
    advance();
    expect(follower()).toContain("Retrying");
    advance();
    expect(follower()).toContain("Applying");
    advance();
    expect(follower()).toContain("Applying");
    advance();
    expect(follower()).toContain("Caught up");
    advance();
    expect(screen.getByRole("status").textContent).toContain(
      "follower caught up",
    );
    choose("Leader read");
    expect(follower()).not.toMatch(/Behind|Retrying|Caught up/);
  });
});
