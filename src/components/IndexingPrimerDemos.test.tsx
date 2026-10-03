/** @vitest-environment jsdom */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { IndexingPrimerDemo } from "./IndexingPrimerDemos";
import { lessons } from "~/demos/indexing-primer/model";
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
  vi.unstubAllGlobals();
});
describe("indexing tree workbenches", () => {
  it("keeps twelve named figures independent with one stage and one external control area", () => {
    render(
      <>
        {lessons.map((l) => (
          <IndexingPrimerDemo key={l.id} lesson={l.id} />
        ))}
      </>,
    );
    expect(screen.getAllByRole("figure")).toHaveLength(12);
    for (const f of screen.getAllByRole("figure")) {
      expect(f.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
      expect(f.querySelectorAll(".ip-controls")).toHaveLength(1);
      expect(f.querySelector("[data-graphic-stage] button")).toBeNull();
    }
    const scan = screen.getByRole("figure", {
      name: "Finding data without a useful index",
    });
    for (let i = 0; i < 3; i++)
      fireEvent.click(within(scan).getByRole("button", { name: "Next step" }));
    expect(scan.querySelector(".ip-metric")?.textContent).toContain(
      "9 records checked",
    );
    expect(
      scan.querySelectorAll('[data-state="found"].ip-svg-entry'),
    ).toHaveLength(1);
    const tree = screen.getByRole("figure", {
      name: "A sorted index narrows the search",
    });
    expect(
      within(tree)
        .getByRole("button", { name: "Next step" })
        .hasAttribute("disabled"),
    ).toBe(false);
    fireEvent.click(within(scan).getByRole("button", { name: "Replay" }));
    expect(
      scan.querySelectorAll('.ip-svg-entry[data-state="found"]'),
    ).toHaveLength(0);
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
    expect(next.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("ID 9");
  });
});
