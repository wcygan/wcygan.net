/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installPlaybackBrowser } from "~/demos/mysql-primer/playback-test-utils";
import {
  MySqlQueryDemo,
  MySqlRelationsDemo,
  MySqlConstraintsDemo,
  MySqlRequestDemo,
  MySqlTransactionDemo,
} from "./MySqlPrimerDemos";

beforeEach(() => installPlaybackBrowser());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MySQL primer workbenches", () => {
  it("discovers five independently named figures with one stage and controls outside it", () => {
    const { container } = render(
      <>
        <MySqlRequestDemo />
        <MySqlRelationsDemo />
        <MySqlQueryDemo />
        <MySqlTransactionDemo />
        <MySqlConstraintsDemo />
      </>,
    );
    const figures = within(container).getAllByRole("figure");
    expect(figures).toHaveLength(5);
    for (const figure of figures) {
      expect(figure.getAttribute("data-graphic-frame")).toBe("workbench");
      expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
      expect(figure.querySelector("[data-graphic-stage] button")).toBeNull();
      expect(within(figure).getByRole("status")).toBeTruthy();
    }
  });

  it("settles a full query round trip and resets it", () => {
    const view = render(<MySqlRequestDemo />);
    const next = view.getByRole("button", { name: "Next step" });
    fireEvent.click(next);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(next.hasAttribute("disabled")).toBe(true);
    expect(view.getByRole("status").textContent).toContain("two orders");
    expect(view.getAllByText("Orders 101 and 102")[0]).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Reset" }));
    expect(next.hasAttribute("disabled")).toBe(false);
    expect(view.getAllByText("Waiting for the result")[0]).toBeTruthy();
  });

  it("changes the selected relation and computes the filtered sum", () => {
    const view = render(
      <>
        <MySqlRelationsDemo />
        <MySqlQueryDemo />
      </>,
    );
    const lin = view.getByRole("button", { name: "Lin's orders" });
    fireEvent.click(lin);
    expect(lin.getAttribute("aria-pressed")).toBe("true");
    const relations = view.getByRole("figure", { name: "Related rows" });
    expect(within(relations).getByRole("status").textContent).toContain(
      "1 order",
    );
    expect(within(relations).getByText("#103")).toBeTruthy();
    expect(within(relations).queryByText("#101")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Apply WHERE" }));
    fireEvent.click(view.getByRole("button", { name: "Calculate SUM" }));
    const query = view.getByRole("figure", { name: "From rows to a result" });
    expect(within(query).getByRole("status").textContent).toContain(
      "7400 cents",
    );
  });

  it("lets a reader commit both changes or roll back and repeat", () => {
    const view = render(<MySqlTransactionDemo />);
    fireEvent.click(view.getByRole("button", { name: "Start transaction" }));
    fireEvent.click(view.getByRole("button", { name: "Reserve one book" }));
    fireEvent.click(view.getByRole("button", { name: "Insert order 104" }));
    fireEvent.click(view.getByRole("button", { name: "Commit both" }));
    expect(view.getByRole("status").textContent).toContain("stock is 1");
    expect(view.getByRole("status").textContent).toContain(
      "order 104 is present",
    );
    fireEvent.click(view.getByRole("button", { name: "Reset" }));
    fireEvent.click(view.getByRole("button", { name: "Start transaction" }));
    fireEvent.click(view.getByRole("button", { name: "Reserve one book" }));
    fireEvent.click(view.getByRole("button", { name: "Roll back" }));
    expect(view.getByRole("status").textContent).toContain("stock is 2");
    expect(view.getByRole("status").textContent).toContain(
      "order 104 is absent",
    );
  });

  it("shows which enforced rule rejects each invalid write", () => {
    const view = render(<MySqlConstraintsDemo />);
    for (const [button, rule] of [
      ["Unknown customer", "FOREIGN KEY"],
      ["Duplicate id", "PRIMARY KEY"],
      ["Negative stock", "CHECK"],
    ]) {
      fireEvent.click(view.getByRole("button", { name: button }));
      expect(view.getByRole("status").textContent).toContain(rule);
      expect(view.getByRole("status").textContent).toContain("unchanged");
    }
    fireEvent.click(view.getByRole("button", { name: "Valid order" }));
    expect(view.getByRole("status").textContent).toContain("Accepted");
  });
});
