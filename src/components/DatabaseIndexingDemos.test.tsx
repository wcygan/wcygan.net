/** @vitest-environment jsdom */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FollowTheLookupDemo,
  OneRecordMovesDemo,
} from "./DatabaseIndexingDemos";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function next(figure: HTMLElement) {
  fireEvent.click(within(figure).getByRole("button", { name: "Next step" }));
}

describe("database indexing explanations", () => {
  it("preserves ID references through movement and changes only the shared mapping", () => {
    render(<OneRecordMovesDemo />);
    const figure = screen.getByRole("figure", { name: "One Record Moves" });
    next(figure);
    expect(
      within(figure).getByRole("img", { name: /^Stable ID/ }).textContent,
    ).toContain("42 → A");
    next(figure);
    const stable = within(figure).getByRole("img", { name: /^Stable ID/ });
    expect(stable.querySelectorAll(".indexing-value")).toHaveLength(3);
    expect(
      Array.from(stable.querySelectorAll(".indexing-value")).every(
        (n) => n.textContent === "ID 42",
      ),
    ).toBe(true);
    expect(stable.textContent).toContain("42 → B");
    next(figure);
    expect(figure.querySelector("figcaption")?.textContent).toContain(
      "0 changed with a stable ID, plus 1 mapping update",
    );
    expect(
      (
        within(figure).getByRole("button", {
          name: "Next step",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("finishes the direct lookup one resolution step before the stable-ID lookup", () => {
    render(<FollowTheLookupDemo />);
    const figure = screen.getByRole("figure", { name: "Follow the Lookup" });
    next(figure);
    next(figure);
    expect(
      within(figure)
        .getByRole("img", { name: /^Direct access/ })
        .getAttribute("aria-label"),
    ).toContain("Document found");
    expect(
      within(figure)
        .getByRole("img", { name: /^Stable identity/ })
        .getAttribute("aria-label"),
    ).toContain("Lookup in progress");
    next(figure);
    expect(
      within(figure)
        .getByRole("img", { name: /^Stable identity/ })
        .getAttribute("aria-label"),
    ).toContain("Document found");
  });

  it("keeps replay independent and authors one stage per demo", () => {
    render(
      <>
        <OneRecordMovesDemo />
        <FollowTheLookupDemo />
      </>,
    );
    const move = screen.getByRole("figure", { name: "One Record Moves" });
    const lookup = screen.getByRole("figure", { name: "Follow the Lookup" });
    next(move);
    next(lookup);
    fireEvent.click(within(move).getByRole("button", { name: "Replay" }));
    expect(move.querySelector(".indexing-beat")?.textContent).toBe("1 / 3");
    expect(lookup.querySelector(".indexing-beat")?.textContent).toBe("2 / 3");
    for (const figure of [move, lookup])
      expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
  });

  it("shows the settled explanation without starting motion under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<OneRecordMovesDemo />);
    expect(screen.getByText(/Move complete:/)).toBeTruthy();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
