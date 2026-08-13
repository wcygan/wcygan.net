/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReconciliationIngestionDemo,
  ReconciliationRepairDemo,
} from "~/components/ReconciliationDemos";

class MotionPreferenceStub {
  matches: boolean;
  readonly media = "(prefers-reduced-motion: reduce)";
  onchange: ((event: MediaQueryListEvent) => void) | null = null;

  private listeners = new Set<(event: MediaQueryListEvent) => void>();

  constructor(matches: boolean) {
    this.matches = matches;
  }

  addEventListener(
    type: string,
    listener: (event: MediaQueryListEvent) => void,
  ) {
    if (type === "change") this.listeners.add(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: MediaQueryListEvent) => void,
  ) {
    if (type === "change") this.listeners.delete(listener);
  }

  dispatchEvent(event: Event) {
    for (const listener of this.listeners) {
      listener(event as MediaQueryListEvent);
    }
    return true;
  }
}

describe("reconciliation demos", () => {
  let motionPreference: MotionPreferenceStub;

  beforeEach(() => {
    motionPreference = new MotionPreferenceStub(false);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => motionPreference),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders separate ingestion and repair figures", () => {
    const { container } = render(
      <>
        <ReconciliationIngestionDemo />
        <ReconciliationRepairDemo />
      </>,
    );
    const figures = Array.from(container.querySelectorAll("figure"));

    expect(
      figures.map((figure) => figure.getAttribute("data-graphic-key")),
    ).toEqual(["reconciliation-ingestion", "reconciliation-repair"]);
    expect(
      figures.map(
        (figure) => figure.querySelectorAll("[data-graphic-stage]").length,
      ),
    ).toEqual([1, 1]);
    expect(
      Array.from(
        figures[0].querySelectorAll<HTMLElement>(".reconciliation-actor"),
        (actor) => actor.dataset.actor,
      ),
    ).toEqual(["mysql", "debezium", "kafka", "flink", "lake"]);
    expect(
      Array.from(
        figures[1].querySelectorAll<HTMLElement>(".reconciliation-actor"),
        (actor) => actor.dataset.actor,
      ),
    ).toEqual(["airflow", "lake", "trino", "kafka", "flink", "mysql"]);
  });

  it("renders the complete lesson immediately for reduced motion", () => {
    motionPreference.matches = true;
    const { container } = render(<ReconciliationRepairDemo />);
    const figure = container.querySelector<HTMLElement>(
      ".reconciliation-demo--repair",
    );

    expect(figure?.dataset.phase).toBe("complete");
    expect(
      figure?.querySelector('[data-actor="mysql"] code')?.textContent,
    ).toBe("order 42 · v7 · paid");
    expect(figure?.querySelector(".reconciliation-packet")).toBeNull();
    expect(
      figure?.querySelector(".reconciliation-status")?.textContent,
    ).toContain("MySQL version 7 now matches the trusted data lake");
  });

  it("keeps Replay finite for reduced motion", () => {
    motionPreference.matches = true;
    const { container } = render(<ReconciliationIngestionDemo />);
    const figure = container.querySelector<HTMLElement>(
      ".reconciliation-demo--ingestion",
    );
    const replay = container.querySelector<HTMLButtonElement>(
      ".reconciliation-replay",
    );

    fireEvent.click(replay!);

    expect(figure?.dataset.phase).toBe("complete");
    expect(figure?.querySelector(".reconciliation-packet")).toBeNull();
  });
});
