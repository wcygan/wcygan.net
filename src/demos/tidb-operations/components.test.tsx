/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  TidbAgreementDiagram,
  TidbQuorumDemo,
  TidbScalingDemo,
} from "~/components/TidbOperationsDemos";

afterEach(cleanup);

describe("TiDB operation figures", () => {
  it("updates visible offline replicas and announces loss of write quorum", () => {
    render(<TidbQuorumDemo />);
    fireEvent.click(screen.getByRole("button", { name: "1 unavailable" }));
    expect(screen.getByRole("status").textContent).toContain(
      "Write quorum remains",
    );
    expect(screen.getAllByText("Offline")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "2 unavailable" }));
    expect(screen.getByRole("status").textContent).toContain(
      "Write quorum is lost",
    );
    expect(screen.getAllByText("Offline")).toHaveLength(2);
    expect(
      screen
        .getByRole("button", { name: "2 unavailable" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("shows storage movement separately and resets it when choosing a new scenario", () => {
    render(<TidbScalingDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Add TiKV storage" }));
    expect(screen.getByText("No Regions yet")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Show redistribution" }),
    );
    expect(screen.queryByText("No Regions yet")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add SQL compute" }));
    expect(screen.getByText("TiDB 3")).toBeTruthy();
    expect(screen.queryByText("TiKV 4")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add TiKV storage" }));
    expect(screen.getByText("No Regions yet")).toBeTruthy();
  });

  it("authors exactly one stage for each figure", () => {
    const { container } = render(
      <>
        <TidbQuorumDemo />
        <TidbAgreementDiagram />
        <TidbScalingDemo />
      </>,
    );
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(3);
    for (const figure of figures) {
      expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
      expect(figure.getAttribute("aria-labelledby")).toBeTruthy();
    }
  });
});
