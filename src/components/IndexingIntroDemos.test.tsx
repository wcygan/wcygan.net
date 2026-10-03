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
  FullTableScanDemo,
  IndexedLookupIntroDemo,
} from "./IndexingIntroDemos";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        private callback: (entries: { isIntersecting: boolean }[]) => void,
      ) {}
      observe() {
        this.callback([{ isIntersecting: true }]);
      }
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function insert() {
  fireEvent.click(screen.getByRole("button", { name: "Insert record" }));
}
function find() {
  fireEvent.click(screen.getByRole("button", { name: "Find Zoe" }));
}

describe("intro to database indexing", () => {
  it("inserts row nine and scans every row before finding the last match", () => {
    render(<FullTableScanDemo />);
    expect(document.querySelectorAll(".intro-index-row")).toHaveLength(8);
    insert();
    find();
    for (let checked = 1; checked <= 9; checked++) {
      act(() => vi.advanceTimersByTime(600));
      expect(
        document.querySelector(".intro-index-takeaway strong")?.textContent,
      ).toBe(String(checked));
    }
    expect(screen.getByText(/Found Zoe after checking all nine/)).toBeTruthy();
    expect(document.querySelectorAll('[data-found="true"]')).toHaveLength(1);
  });
  it("maintains a sorted index for an inserted value and fetches only its matching table row", () => {
    render(<IndexedLookupIntroDemo />);
    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Ada" },
    });
    insert();
    const entries = Array.from(document.querySelectorAll(".intro-index-entry"));
    expect(entries[0].textContent).toBe("Ada→ 9");
    expect(entries).toHaveLength(9);
    fireEvent.click(screen.getByRole("button", { name: "Find Ada" }));
    for (let step = 0; step < 3; step++) act(() => vi.advanceTimersByTime(900));
    expect(
      document.querySelector(".intro-index-takeaway strong")?.textContent,
    ).toBe("1");
    expect(
      document.querySelector('[data-found="true"]')?.textContent,
    ).toContain("Ada");
    expect(document.querySelectorAll('[data-checked="true"]')).toHaveLength(0);
  });
  it("routes through vertically ordered name and primary-key trees", () => {
    render(<IndexedLookupIntroDemo />);
    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Ada" },
    });
    insert();
    const trees = Array.from(document.querySelectorAll(".intro-tree"));
    expect(trees).toHaveLength(2);
    expect(trees[0].getAttribute("aria-label")).toContain("Name-index");
    expect(trees[1].getAttribute("aria-label")).toContain("Primary-key");
    for (const tree of trees)
      expect(tree.querySelectorAll(".intro-tree-page")).toHaveLength(3);
    for (const tree of trees) {
      for (const page of tree.querySelectorAll(".intro-tree-page")) {
        expect(
          page.querySelectorAll(".intro-index-entry, .intro-index-row"),
        ).toHaveLength(3);
      }
    }
    expect(trees[0].querySelector(".intro-tree-root > div")?.textContent).toBe(
      "IslaMia",
    );
    expect(trees[1].querySelector(".intro-tree-root > div")?.textContent).toBe(
      "47",
    );
    fireEvent.click(screen.getByRole("button", { name: "Find Ada" }));
    act(() => vi.advanceTimersByTime(900));
    expect(trees[0].querySelector('[data-selected="true"]')?.textContent).toBe(
      "Ada→ 9",
    );
    expect(
      trees[1].querySelectorAll(
        '.intro-tree-branches > path[data-active="true"]',
      ),
    ).toHaveLength(0);
    act(() => vi.advanceTimersByTime(900));
    expect(
      trees[1]
        .querySelector('.intro-tree-branches > path[data-active="true"]')
        ?.getAttribute("d"),
    ).toBe("M300 0 V18 H500 V64");
  });
  it("rejects duplicate names and resets table and index together", () => {
    render(<IndexedLookupIntroDemo />);
    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "ava" },
    });
    insert();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(document.querySelectorAll(".intro-index-row")).toHaveLength(8);
    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Zoe" },
    });
    insert();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(document.querySelectorAll(".intro-index-entry")).toHaveLength(8);
    expect(document.querySelectorAll(".intro-index-row")).toHaveLength(8);
  });
  it("preserves independent state and one authored stage per figure", () => {
    render(
      <>
        <FullTableScanDemo />
        <IndexedLookupIntroDemo />
      </>,
    );
    const first = screen.getByRole("figure", {
      name: "Finding Data Without an Index",
    });
    fireEvent.click(
      within(first).getByRole("button", { name: "Insert record" }),
    );
    const second = screen.getByRole("figure", {
      name: "Finding Data With an Index",
    });
    expect(first.querySelectorAll(".intro-index-row")).toHaveLength(9);
    expect(second.querySelectorAll(".intro-index-row")).toHaveLength(8);
    for (const figure of [first, second])
      expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
  });
  it("shows the complete scan without motion under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<FullTableScanDemo />);
    insert();
    find();
    expect(screen.getByText(/Found Zoe after checking all nine/)).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
