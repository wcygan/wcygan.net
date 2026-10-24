/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  TidbAgreementDiagram,
  TidbQuorumDemo,
  TidbScalingDemo,
} from "~/components/TidbOperationsDemos";

import {
  TidbRegionsDemo,
  TidbQueryEnginesDemo,
} from "~/components/TidbOverviewDemos";

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

  it("keeps every figure named with exactly one stage", () => {
    render(
      <>
        <TidbQuorumDemo />
        <TidbAgreementDiagram />
        <TidbScalingDemo />
        <TidbRegionsDemo />
        <TidbQueryEnginesDemo />
      </>,
    );
    expect(screen.getAllByRole("figure")).toHaveLength(5);
    for (const name of [
      "A Region needs a majority",
      "Two layers of agreement",
      "Scale the resource you need",
      "Regions and Replicas",
      "Rows and Columns",
    ]) {
      const figure = screen.getByRole("figure", { name });
      expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    }
  });
});
