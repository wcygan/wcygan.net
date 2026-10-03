/** @vitest-environment jsdom */
import { useEffect } from "react";
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
  PrometheusArchitectureDemo,
  PrometheusSeriesDemo,
  PrometheusAlertsDemo,
  PrometheusCardinalityDemo,
  PrometheusStorageDemo,
} from "~/components/PrometheusSpatialDemos";

const scene = vi.hoisted(() => ({ unavailable: false }));
vi.mock("./Scene", () => ({
  default: ({
    onReady,
    onUnavailable,
    view,
    animate,
  }: {
    onReady: () => void;
    onUnavailable: () => void;
    view: { kind: string; revision: number };
    animate: boolean;
  }) => {
    useEffect(() => {
      scene.unavailable ? onUnavailable() : onReady();
    }, [onReady, onUnavailable]);
    return (
      <div
        data-testid="scene"
        data-view={`${view.kind}-${view.revision}`}
        data-animate={animate}
      />
    );
  },
}));

let intersections: IntersectionObserverCallback[];
beforeEach(() => {
  scene.unavailable = false;
  intersections = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersections.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function showScenes() {
  await act(async () => {
    for (const callback of intersections)
      callback(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
  });
}

describe("Prometheus spatial article controls", () => {
  it("preserves the cardinality lesson and series inspection without WebGL", async () => {
    scene.unavailable = true;
    render(<PrometheusCardinalityDemo />);
    await showScenes();
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("12 observed series");
    fireEvent.click(screen.getByRole("button", { name: "Add 10 user IDs" }));
    expect(status.textContent).toContain("120 observed series");
    expect(status.textContent).toContain('user_id="u1"');
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect next series" }),
    );
    expect(status.textContent).toContain('user_id="u2"');
    expect(
      (screen.getByRole("button", { name: "Reset view" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/3D is unavailable/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Bounded labels" }));
    expect(status.textContent).toContain("12 observed series");
    expect(status.textContent).not.toContain("user_id");
  });

  it("lets readers recover and expire samples manually in the HTML fallback", async () => {
    scene.unavailable = true;
    render(<PrometheusStorageDemo />);
    await showScenes();
    const next = screen.getByRole("button", { name: "Next step" });
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("1 / 4");
    fireEvent.click(next);
    expect(status.textContent).toContain("4 immutable blocks");
    fireEvent.click(next);
    expect(status.textContent).toContain("Compact blocks and recover Head");
    expect(status.textContent).toContain("3 Head samples · 3 WAL samples");
    fireEvent.click(next);
    expect(status.textContent).toContain("4 / 4");
    expect(status.textContent).toContain("1 immutable block");
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(status.textContent).toContain("1 / 4");
    expect((next as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps each camera keyboard control independent of storage progress", async () => {
    render(<PrometheusStorageDemo />);
    await showScenes();
    const stage = screen.getByRole("group", {
      name: "Local Storage: interactive 3D view",
    });
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    expect(screen.getByTestId("scene").getAttribute("data-view")).toBe(
      "left-1",
    );
    fireEvent.keyDown(stage, { key: "+" });
    expect(screen.getByTestId("scene").getAttribute("data-view")).toBe("in-2");
    fireEvent.keyDown(stage, { key: "Home" });
    expect(screen.getByTestId("scene").getAttribute("data-view")).toBe(
      "reset-3",
    );
    expect(screen.getByRole("status").textContent).toContain("2 / 4");
  });

  it("authors one stage and independent accessible titles for both figures", () => {
    render(
      <>
        <PrometheusCardinalityDemo />
        <PrometheusStorageDemo />
      </>,
    );
    for (const title of ["Label Cardinality", "Local Storage"]) {
      const figure = screen.getByRole("figure", { name: title });
      expect(figure.getAttribute("data-graphic-frame")).toBe("workbench");
      expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
      expect(
        within(figure).getByRole("group", {
          name: `${title}: interactive 3D view`,
        }).tabIndex,
      ).toBe(0);
    }
  });
});

it.each([
  [PrometheusArchitectureDemo, "Alertmanager"],
  [PrometheusSeriesDemo, "Two label sets still mean two series"],
  [PrometheusAlertsDemo, "After 30 s continuously true"],
])(
  "preserves each introductory lesson through terminal state and replay",
  async (Demo, outcome) => {
    scene.unavailable = true;
    render(<Demo />);
    await showScenes();
    const next = screen.getByRole("button", { name: "Next step" });
    for (let i = 0; i < 3; i++) fireEvent.click(next);
    expect(screen.getByRole("status").textContent).toContain(outcome);
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(screen.getByRole("status").textContent).toContain("1 / 4");
  },
);

it.each([
  [PrometheusArchitectureDemo, "Monitoring Pipeline"],
  [PrometheusSeriesDemo, "Series and Samples"],
  [PrometheusAlertsDemo, "Sustained Alerts"],
  [PrometheusCardinalityDemo, "Label Cardinality"],
  [PrometheusStorageDemo, "Local Storage"],
])("autoplays %s to a bounded outcome", async (Demo, title) => {
  vi.useFakeTimers();
  render(<Demo />);
  await showScenes();
  const figure = screen.getByRole("figure", { name: title });
  expect(figure.getAttribute("data-playback-step")).toBe("0");
  expect(figure.getAttribute("data-playback-active")).toBe("true");
  for (let step = 1; step <= 3; step++) {
    act(() => vi.advanceTimersByTime(2600));
    expect(figure.getAttribute("data-playback-step")).toBe(String(step));
  }
  expect(figure.getAttribute("data-playback")).toBe("complete");
  expect(figure.getAttribute("data-playback-active")).toBe("false");
  // A bounded final reveal remains allowed while the schedule itself is done.
  expect(screen.getByTestId("scene").getAttribute("data-animate")).toBe("true");
  act(() => vi.advanceTimersByTime(26000));
  expect(figure.getAttribute("data-playback-step")).toBe("3");
  if (title === "Label Cardinality") {
    expect(screen.getByRole("status").textContent).toContain(
      "120 observed series",
    );
  }
});

it("preserves pause across visibility and replay without resetting the camera", async () => {
  vi.useFakeTimers();
  render(<PrometheusSeriesDemo />);
  await showScenes();
  const figure = screen.getByRole("figure", { name: "Series and Samples" });
  fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  for (const visible of [false, true]) {
    act(() => {
      for (const callback of intersections)
        callback(
          [
            {
              isIntersecting: visible,
              intersectionRatio: visible ? 1 : 0,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        );
    });
    act(() => vi.advanceTimersByTime(7800));
  }
  expect(figure.getAttribute("data-playback-step")).toBe("0");
  expect(screen.getByTestId("scene").getAttribute("data-view")).toBe("right-1");
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  act(() => vi.advanceTimersByTime(2600));
  expect(figure.getAttribute("data-playback-step")).toBe("1");
  expect(screen.getByTestId("scene").getAttribute("data-view")).toBe("right-1");
});

it("keeps reduced-motion playback manual and shows each discrete outcome", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  render(<PrometheusAlertsDemo />);
  await showScenes();
  const figure = screen.getByRole("figure", { name: "Sustained Alerts" });
  act(() => vi.advanceTimersByTime(26000));
  expect(figure.getAttribute("data-playback-step")).toBe("0");
  expect(
    (screen.getByRole("button", { name: "Play" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  const next = screen.getByRole("button", { name: "Next step" });
  for (let i = 0; i < 3; i++) fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toContain(
    "After 30 s continuously true",
  );
  expect(screen.getByTestId("scene").getAttribute("data-animate")).toBe(
    "false",
  );
});
