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
import {
  EmbeddingCoordinatesDemo,
  EmbeddingSearchDemo,
  EmbeddingSimilarityDemo,
} from "./EmbeddingDemos";

interface SceneProps {
  active: boolean;
  reduced: boolean;
  view: { kind: string; revision: number };
  onReady: () => void;
  onUnavailable: () => void;
  cityId?: string;
  queryId?: string;
  count?: number;
  selectedId?: string;
  metric?: string;
  normalized?: boolean;
}

const scenes = vi.hoisted(() => ({
  globe: null as SceneProps | null,
  space: null as SceneProps | null,
  metric: null as SceneProps | null,
  fail: false,
}));

vi.mock("~/demos/embeddings/GlobeScene", () => ({
  default: (props: SceneProps) => {
    if (scenes.fail) throw new Error("WebGL unavailable");
    scenes.globe = props;
    return null;
  },
}));
vi.mock("~/demos/embeddings/SpaceScene", () => ({
  default: (props: SceneProps) => {
    scenes.space = props;
    return null;
  },
}));
vi.mock("~/demos/embeddings/MetricScene", () => ({
  default: (props: SceneProps) => {
    scenes.metric = props;
    return null;
  },
}));

let intersection: IntersectionObserverCallback;
let motion: () => void;
let reduced = false;
const disconnect = vi.fn();
const removeMotionListener = vi.fn();

async function view(ratio: number) {
  await act(async () => {
    intersection(
      [
        {
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
}

function documentVisibility(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: hidden,
  });
  fireEvent(document, new Event("visibilitychange"));
}

beforeEach(() => {
  scenes.globe = null;
  scenes.space = null;
  scenes.metric = null;
  scenes.fail = false;
  reduced = false;
  disconnect.mockClear();
  removeMotionListener.mockClear();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_event: string, listener: () => void) => {
      motion = listener;
    },
    removeEventListener: removeMotionListener,
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  documentVisibility(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("embedding scene lifecycle", () => {
  it.each([
    ["coordinates", EmbeddingCoordinatesDemo, "globe"],
    ["search", EmbeddingSearchDemo, "space"],
    ["similarity", EmbeddingSimilarityDemo, "metric"],
  ] as const)(
    "mounts the %s scene initially and resolves loading on readiness",
    async (_name, Demo, key) => {
      const { unmount } = render(<Demo />);
      const stage = screen.getByRole("group", { name: /Arrow keys rotate/ });
      await act(async () => {
        await Promise.resolve();
      });
      expect(scenes[key]).not.toBeNull();
      expect(scenes[key]!.active).toBe(false);
      expect(stage.getAttribute("aria-busy")).toBe("true");
      expect(
        (
          screen.getByRole("button", {
            name: "Reset view",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);

      expect(
        screen.getByRole("status", { name: "Loading 3D demo" }),
      ).toBeTruthy();
      await view(0.1);
      expect(scenes[key]!.active).toBe(false);
      act(() => scenes[key]!.onReady());
      expect(
        screen.queryByRole("status", { name: "Loading 3D demo" }),
      ).toBeNull();
      expect(stage.getAttribute("aria-busy")).toBe("false");
      expect(
        (
          screen.getByRole("button", {
            name: "Reset view",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);

      await view(0.25);
      expect(scenes[key]!.active).toBe(true);
      documentVisibility(true);
      expect(scenes[key]!.active).toBe(false);
      documentVisibility(false);
      expect(scenes[key]!.active).toBe(true);
      await view(0);
      expect(scenes[key]!.active).toBe(false);
      expect(stage.getAttribute("aria-busy")).toBe("false");

      unmount();
      expect(disconnect).toHaveBeenCalledOnce();
      expect(removeMotionListener).toHaveBeenCalledWith("change", motion);
    },
  );

  it("honors reduced motion initially and when the preference changes", async () => {
    reduced = true;
    render(<EmbeddingSimilarityDemo />);
    await view(1);
    expect(scenes.metric!.reduced).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Normalize vectors" }));
    expect(screen.getByText("All three now rank A → B → C.")).toBeTruthy();
    expect(scenes.metric!.normalized).toBe(true);
    act(() => {
      reduced = false;
      motion();
    });
    expect(scenes.metric!.reduced).toBe(false);
    expect(scenes.metric!.normalized).toBe(true);
  });

  it("keeps camera commands independent of the selected query and document", async () => {
    render(<EmbeddingSearchDemo />);
    await view(1);
    act(() => scenes.space!.onReady());
    const results = screen.getByRole("list", { name: "Nearest phrases" });
    const buttons = within(results).getAllByRole("button");
    fireEvent.click(buttons[1]);
    const selected = scenes.space!.selectedId;
    const stage = screen.getByRole("group", { name: /Arrow keys rotate/ });

    for (const [key, kind] of [
      ["ArrowLeft", "left"],
      ["+", "in"],
      ["-", "out"],
      ["Home", "reset"],
    ]) {
      fireEvent.keyDown(stage, { key });
      expect(scenes.space!.view.kind).toBe(kind);
      expect(scenes.space!.selectedId).toBe(selected);
      expect(scenes.space!.queryId).toBe("pet");
    }
    expect(scenes.space!.view.revision).toBe(4);
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(scenes.space!.view).toEqual({ kind: "reset", revision: 5 });
    fireEvent.change(screen.getByRole("combobox", { name: "Query" }), {
      target: { value: "drink" },
    });
    expect(scenes.space!.view).toEqual({ kind: "reset", revision: 5 });
  });

  it("retains coordinate controls and clears loading when a scene throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    scenes.fail = true;
    render(<EmbeddingCoordinatesDemo />);
    await view(1);
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "Loading 3D demo" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("group", { name: /Arrow keys rotate/ })
        .getAttribute("aria-busy"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Auckland" }));
    expect(screen.queryByText("Auckland36.9° S / 174.8° E")).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Reset view" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

describe("embedding experiments", () => {
  it("defaults the coordinates globe to Chicago", async () => {
    render(<EmbeddingCoordinatesDemo />);
    await view(1);
    act(() => scenes.globe!.onReady());

    expect(scenes.globe!.cityId).toBe("chicago");
    expect(
      within(screen.getByRole("group", { name: "City" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "Chicago",
      "San Francisco",
      "Berlin",
      "Bangalore",
      "Auckland",
      "Tokyo",
    ]);
    expect(
      screen
        .getByRole("button", { name: "Chicago" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.queryByText("Chicago41.9° N / 87.6° W")).toBeNull();
  });

  it("updates the globe and coordinates together when selecting another hemisphere", async () => {
    render(<EmbeddingCoordinatesDemo />);
    await view(1);
    act(() => scenes.globe!.onReady());
    fireEvent.click(screen.getByRole("button", { name: "Tokyo" }));
    expect(scenes.globe!.cityId).toBe("tokyo");
    fireEvent.click(screen.getByRole("button", { name: "Auckland" }));
    expect(scenes.globe!.cityId).toBe("auckland");
    expect(
      screen
        .getByRole("button", { name: "Auckland" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.queryByText("Auckland36.9° S / 174.8° E")).toBeNull();
  });

  it("ranks a new query, inspects a result, and falls back to the best match when count shrinks", async () => {
    render(<EmbeddingSearchDemo />);
    await view(1);
    act(() => scenes.space!.onReady());
    const results = screen.getByRole("list", { name: "Nearest phrases" });
    expect(within(results).getAllByRole("button")).toHaveLength(3);
    expect(within(results).getAllByRole("button")[0].textContent).toContain(
      "a sleeping cat",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Query" }), {
      target: { value: "drink" },
    });
    expect(scenes.space!.queryId).toBe("drink");
    expect(within(results).getAllByRole("button")[0].textContent).toContain(
      "a cup of tea",
    );
    expect(scenes.space!.selectedId).toBe("tea");

    fireEvent.change(
      screen.getByRole("slider", { name: "Number of matches" }),
      { target: { value: "5" } },
    );
    expect(within(results).getAllByRole("button")).toHaveLength(5);
    fireEvent.click(
      within(results).getByRole("button", { name: /a milky latte/ }),
    );
    expect(scenes.space!.selectedId).toBe("latte");
    expect(screen.getByText(/a warm drink → a milky latte/)).toBeTruthy();
    fireEvent.change(
      screen.getByRole("slider", { name: "Number of matches" }),
      { target: { value: "1" } },
    );
    expect(within(results).getAllByRole("button")).toHaveLength(1);
    expect(scenes.space!.count).toBe(1);
    expect(scenes.space!.selectedId).toBe("tea");

    act(() => scenes.space!.onUnavailable());
    fireEvent.change(screen.getByRole("combobox", { name: "Query" }), {
      target: { value: "commute" },
    });
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(screen.getByText(/a ride to work → the morning train/)).toBeTruthy();
  });

  it("reveals different winners and agreement after normalization, even without WebGL", async () => {
    render(<EmbeddingSimilarityDemo />);
    await view(1);
    act(() => scenes.metric!.onReady());
    expect(screen.getByText("Cosine picks A.")).toBeTruthy();
    const stage = screen.getByRole("group", { name: /Arrow keys rotate/ });
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    const viewCommand = scenes.metric!.view;
    fireEvent.click(screen.getByRole("button", { name: "Dot product" }));
    expect(scenes.metric!.metric).toBe("dot");
    expect(screen.getByText("Dot product picks C.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Distance" }));
    expect(screen.getByText("Distance picks B.")).toBeTruthy();

    act(() => scenes.metric!.onUnavailable());
    fireEvent.click(screen.getByRole("button", { name: "Normalize vectors" }));
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
    expect(screen.getByText("All three now rank A → B → C.")).toBeTruthy();
    expect(screen.getByText("Distance picks A.")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Normalize vectors" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    const table = screen.getByRole("table", {
      name: "Scores for each similarity measure",
    });
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1]).getAllByText(/best/)).toHaveLength(3);
    expect(within(rows[2]).queryByText(/best/)).toBeNull();
    expect(within(rows[3]).queryByText(/best/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Dot product" }));
    expect(screen.getByText("Dot product picks A.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Normalize vectors" }));
    expect(screen.getByText("Dot product picks C.")).toBeTruthy();
    expect(within(rows[1]).getAllByText(/best/)).toHaveLength(1);
    expect(within(rows[2]).getAllByText(/best/)).toHaveLength(1);
    expect(within(rows[3]).getAllByText(/best/)).toHaveLength(1);
    expect(scenes.metric!.view).toBe(viewCommand);
  });
});
