/** @vitest-environment jsdom */
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { IndexingPrimerDemo } from "./IndexingPrimerDemos";
import { lessons } from "~/demos/indexing-primer/model";
import { TreeDiagram } from "~/demos/indexing-primer/TreeDiagram";
import { visual } from "~/demos/indexing-primer/visual";
import * as timeline from "~/demos/indexing-primer/transition";
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("indexing tree workbenches", () => {
  it("exposes the query matching the visible scene throughout the query fade", () => {
    const duration = timeline.transitionPlan("compound", 1).duration;
    const before = timeline.transitionVisual("compound", 1, 1700 / duration);
    const after = timeline.transitionVisual("compound", 1, 2100 / duration);
    const frame = vi
      .spyOn(timeline, "transitionVisual")
      .mockReturnValue(before);
    const { rerender } = render(<IndexingPrimerDemo lesson="compound" />);
    expect(screen.getByRole("code").textContent).toBe("WHERE city = 'Austin'");
    expect(screen.getByRole("status").textContent).toBe(
      "Austin entries are together",
    );
    frame.mockReturnValue(after);
    rerender(<IndexingPrimerDemo lesson="compound" />);
    expect(screen.getByRole("code").textContent).toBe("WHERE name = 'Zoe'");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("fits both trees into the phone layout without resetting the lookup", () => {
    let resize = (_width: number) => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(
          callback: (entries: { contentRect: { width: number } }[]) => void,
        ) {
          resize = (width) => callback([{ contentRect: { width } }]);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<IndexingPrimerDemo lesson="secondary" />);
    const next = screen.getByRole("button", { name: "Next step" });
    fireEvent.click(next);
    fireEvent.click(next);
    act(() => resize(316));
    expect(
      document.querySelector(".ip-tree-svg")?.getAttribute("viewBox"),
    ).toBe("0 0 316 556");
    expect(
      document.querySelectorAll('.ip-svg-entry[data-state="found"]'),
    ).toHaveLength(2);
    act(() => resize(610));
    expect(
      document.querySelector(".ip-tree-svg")?.getAttribute("viewBox"),
    ).toBe("0 0 610 556");
    expect(
      document.querySelectorAll('.ip-svg-entry[data-state="found"]'),
    ).toHaveLength(2);
    expect(next.hasAttribute("disabled")).toBe(false);
  });

  it("keeps existing records in place when a write fills the next slot", () => {
    const { rerender } = render(<TreeDiagram visual={visual("writes", 0)} />);
    const positions = () =>
      Array.from(
        document.querySelectorAll(
          '[data-page-id="write-primary-leaf"] .ip-svg-key',
        ),
        (entry) => entry.getAttribute("y"),
      ).slice(0, 2);
    const before = positions();
    rerender(<TreeDiagram visual={visual("writes", 1)} />);
    expect(positions()).toEqual(before);
  });

  it("removes the forward arrow while a covering result travels back", () => {
    render(
      <TreeDiagram
        visual={visual("cover", 1)}
        travel={{
          from: "secondary-root",
          to: "secondary-leaf-3",
          kind: "branch",
          progress: 0.5,
          reverse: true,
        }}
      />,
    );
    const route = document.querySelector(
      '.ip-tree-link[data-traveling="true"]',
    )!;
    expect(route.hasAttribute("marker-end")).toBe(false);
    expect(document.querySelector(".ip-travel-packet")).not.toBeNull();
  });

  it("keeps six named figures independent with one stage and one external control area", () => {
    render(
      <>
        {lessons.map((l) => (
          <IndexingPrimerDemo key={l.id} lesson={l.id} />
        ))}
      </>,
    );
    expect(screen.getAllByRole("figure")).toHaveLength(6);
    for (const f of screen.getAllByRole("figure")) {
      expect(f.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
      expect(f.querySelectorAll(".ip-controls")).toHaveLength(1);
      expect(f.querySelector("[data-graphic-stage] button")).toBeNull();
      expect(within(f).getAllByRole("button")).toHaveLength(2);
      expect(within(f).queryByRole("button", { name: "Replay" })).toBeNull();
    }
    const scan = screen.getByRole("figure", {
      name: "Table Scan",
    });
    for (let i = 0; i < 3; i++)
      fireEvent.click(within(scan).getByRole("button", { name: "Next step" }));
    expect(scan.querySelector(".ip-metric")?.textContent).toContain(
      "9 rows checked",
    );
    expect(
      scan.querySelectorAll('[data-state="found"].ip-svg-entry'),
    ).toHaveLength(1);
    const tree = screen.getByRole("figure", {
      name: "Tree Lookup",
    });
    expect(
      within(tree)
        .getByRole("button", { name: "Next step" })
        .hasAttribute("disabled"),
    ).toBe(false);
    fireEvent.click(within(scan).getByRole("button", { name: "Next step" }));
    expect(
      scan.querySelectorAll('.ip-svg-entry[data-state="found"]'),
    ).toHaveLength(0);
    expect(scan.dataset.step).toBe("0");
    expect(tree.dataset.step).toBe("0");
  });
  it("keeps both index trees visible while stepping a secondary lookup", () => {
    render(<IndexingPrimerDemo lesson="secondary" />);
    expect(
      document.querySelectorAll('.ip-tree-page[data-kind="branch"]'),
    ).toHaveLength(2);
    const next = screen.getByRole("button", { name: "Next step" });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(
      document.querySelectorAll('.ip-svg-entry[data-state="found"]'),
    ).toHaveLength(2);
    expect(next.hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("status").textContent).toContain("ID 9");
    expect(screen.getByRole("timer").textContent).toContain("Paused · 4s");
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).not.toBeNull();
    expect(screen.getByRole("timer").textContent).toContain("Paused · 4s");
    fireEvent.click(next);
    expect(document.querySelector(".ip-demo")?.getAttribute("data-step")).toBe(
      "0",
    );
    expect(
      document.querySelectorAll('.ip-svg-entry[data-state="found"]'),
    ).toHaveLength(0);
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("omits the automatic-reset countdown under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    render(<IndexingPrimerDemo lesson="writes" />);
    const next = screen.getByRole("button", { name: "Next step" });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(
      document.querySelectorAll('.ip-svg-entry[data-state="new"]'),
    ).toHaveLength(3);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Play" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});
