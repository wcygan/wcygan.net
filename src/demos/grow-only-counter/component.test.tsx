/** @vitest-environment jsdom */
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GrowOnlyCounterDemo } from "~/components/GrowOnlyCounterDemo";
const scene = vi.hoisted(() => ({
  fail: false,
  ready: true,
  view: undefined as { kind: string; revision: number } | undefined,
}));
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
    scene.view = view;
    useEffect(() => {
      if (scene.fail) onUnavailable();
      else if (scene.ready) onReady();
    }, [onReady, onUnavailable]);
    return <div>Scene</div>;
  },
}));
beforeEach(() => {
  scene.fail = false;
  scene.ready = true;
  scene.view = undefined;
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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
  vi.unstubAllGlobals();
});
it("keeps loading controls disabled until the first frame", async () => {
  scene.ready = false;
  await act(async () => {
    render(<GrowOnlyCounterDemo />);
  });
  expect(
    (
      screen.getByRole("button", {
        name: "Increment A",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.getByLabelText("Current node counters").textContent).toContain(
    "[1, 0, 0]",
  );
});
it("keeps the full lesson usable without WebGL", async () => {
  scene.fail = true;
  await act(async () => {
    render(<GrowOnlyCounterDemo />);
  });
  expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
  expect(screen.getByLabelText("Saved messages")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Increment A" }));
  expect(screen.getByRole("status").textContent).toContain("[2, 0, 0]");
  expect(screen.getByLabelText("Saved messages").textContent).toContain(
    "[2, 0, 0]",
  );
  fireEvent.click(screen.getByRole("button", { name: "Restart" }));
  for (const name of [
    "Deliver A to C",
    "Deliver C to B",
    "Deliver A to B",
    "Deliver C to A",
  ]) {
    fireEvent.click(screen.getByRole("button", { name }));
  }
  expect(screen.getByText(/All three replicas hold/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Deliver again A to B" }));
  expect(screen.getByRole("status").textContent).toContain("No change");
  fireEvent.click(screen.getByRole("button", { name: "Restart" }));
  expect(screen.getByText("0 of 4 saved messages delivered")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Step" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Try your own order" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Replay example" })).toBeNull();
});
it("authors one discoverable stage", async () => {
  let container!: HTMLElement;
  await act(async () => {
    ({ container } = render(<GrowOnlyCounterDemo />));
  });
  expect(
    container.querySelectorAll('[data-graphic-frame="workbench"]'),
  ).toHaveLength(1);
  expect(container.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
});

it("provides a labeled speed selector defaulting to 4×", async () => {
  await act(async () => {
    render(<GrowOnlyCounterDemo />);
  });
  const speed = screen.getByRole("combobox", {
    name: "Speed",
  }) as HTMLSelectElement;
  expect(speed.value).toBe("4");
  fireEvent.change(speed, { target: { value: "2" } });
  expect(speed.value).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Restart" }));
  expect(speed.value).toBe("2");
});

it("toggles between side and top views and restores the side with Home", async () => {
  await act(async () => {
    render(<GrowOnlyCounterDemo />);
  });
  expect(scene.view?.kind).toBe("reset");
  const topView = screen.getByRole("button", { name: "Top view" });
  fireEvent.click(topView);
  expect(scene.view?.kind).toBe("top");
  const sideView = screen.getByRole("button", { name: "Side view" });
  fireEvent.click(sideView);
  expect(scene.view?.kind).toBe("reset");
  fireEvent.keyDown(screen.getByRole("button", { name: "Top view" }), {
    key: "ArrowLeft",
  });
  expect(scene.view?.kind).toBe("left");
  fireEvent.keyDown(screen.getByRole("button", { name: "Top view" }), {
    key: "Home",
  });
  expect(scene.view?.kind).toBe("reset");
});

it("disables competing actions during animation but keeps restart available", async () => {
  vi.useFakeTimers();
  try {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await act(async () => {
      render(<GrowOnlyCounterDemo />);
    });
    const incrementA = screen.getByRole("button", {
      name: "Increment A",
    }) as HTMLButtonElement;
    fireEvent.click(incrementA);
    expect(incrementA.disabled).toBe(true);
    for (const button of screen.getAllByRole("button", { name: /^Deliver / })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    const restart = screen.getByRole("button", {
      name: "Restart",
    }) as HTMLButtonElement;
    expect(restart.disabled).toBe(false);
    fireEvent.click(restart);
    expect(incrementA.disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Deliver A to B" }));
    for (const button of screen.getAllByRole("button", { name: /^Deliver / })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    for (const button of screen.getAllByRole("button", {
      name: /increment [AC]$/i,
    })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    fireEvent.click(restart);
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByText("0 of 4 saved messages delivered")).toBeTruthy();
  } finally {
    cleanup();
    vi.useRealTimers();
  }
});
