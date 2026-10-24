/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SpatialSceneProps } from "~/demos/celld/spatial/Scene";
import {
  CelldCellAnatomyDemo,
  CelldPageChangesDemo,
} from "./CelldSpatialDemos";

let scene: SpatialSceneProps;
vi.mock("~/demos/celld/spatial/Scene", () => ({
  default: (props: SpatialSceneProps) => {
    scene = props;
    return <div aria-hidden="true" />;
  },
}));

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [
            {
              target,
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

it("announces the selected cell layer after the 3D view is ready", async () => {
  await act(async () => render(<CelldCellAnatomyDemo />));
  act(() => scene.onReady());
  const status = screen.getByRole("status");
  const stage = screen.getByRole("img", { name: "Inside one cell: 3D view" });
  expect(stage.contains(status)).toBe(false);
  expect(status.textContent).toBe("JavaScript");

  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(scene.layer).toBe("sqlite");
  expect(status.textContent).toBe("SQLite · 6 pages");
  expect(
    screen.getByRole("button", { name: "SQLite" }).getAttribute("aria-pressed"),
  ).toBe("true");

  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(scene.layer).toBe("ltx");
  expect(status.textContent).toBe("LTX changes · pages 2, 5");
  expect(
    (screen.getByRole("button", { name: "Next step" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "JavaScript" }));
  expect(scene.layer).toBe("handler");
  expect(status.textContent).toBe("JavaScript");
});

it("announces page versions and captured LTX IDs through commit, capture, and reset", async () => {
  await act(async () => render(<CelldPageChangesDemo />));
  act(() => scene.onReady());
  const status = screen.getByRole("status");
  const initial =
    "SQLite pages: 1 v1, 2 v1, 3 v1, 4 v1, 5 v1, 6 v1 · LTX pages: none";
  const committed =
    "SQLite pages: 1 v1, 2 v2, 3 v1, 4 v1, 5 v2, 6 v1 · LTX pages: none";
  expect(status.textContent).toBe(initial);

  fireEvent.click(screen.getByRole("button", { name: "Commit pages 2 + 5" }));
  expect(scene.pageStep).toBe(1);
  expect(status.textContent).toBe(committed);

  fireEvent.click(screen.getByRole("button", { name: "Capture LTX" }));
  expect(scene.pageStep).toBe(2);
  expect(status.textContent).toBe(
    committed.replace("LTX pages: none", "LTX pages: 2 v2, 5 v2"),
  );
  expect(
    (screen.getByRole("button", { name: "LTX captured" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Reset example" }));
  expect(scene.pageStep).toBe(0);
  expect(status.textContent).toBe(initial);

  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(status.textContent).toBe(committed);
});
