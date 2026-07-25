/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CdcWalKafkaDemo } from "~/components/CdcWalKafkaDemo";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("CdcWalKafkaDemo reduced motion", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mounts and replays on the complete synchronized snapshot", () => {
    const { container } = render(<CdcWalKafkaDemo />);
    const figure = container.querySelector<HTMLElement>(".cdc-wal-kafka-demo");
    const replay = container.querySelector<HTMLButtonElement>(
      ".demo-replay-button",
    );

    expect(figure?.dataset.phase).toBe("complete");
    expect(
      [...container.querySelectorAll(".cdc-wal-kafka-kafka-row code")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["offset 0", "offset 1", "offset 2"]);
    expect(container.querySelector(".cdc-wal-kafka-payload")).toBeNull();
    expect(container.querySelector('[data-status="accepting"]')).toBeNull();
    expect(
      container.querySelectorAll(".cdc-wal-kafka-acceptance-highlight"),
    ).toHaveLength(3);
    expect(
      container.querySelector(".cdc-wal-kafka-result")?.textContent,
    ).toContain("3 WAL records");
    expect(
      container.querySelector(".cdc-wal-kafka-result")?.textContent,
    ).toContain("Kafka offsets 0–2");

    expect(replay).not.toBeNull();
    fireEvent.click(replay!);

    expect(figure?.dataset.phase).toBe("complete");
  });

  it("keeps the WAL-to-offset summary visible from the first frame", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const { container } = render(<CdcWalKafkaDemo />);
    const figure = container.querySelector<HTMLElement>(".cdc-wal-kafka-demo");
    const result = container.querySelector<HTMLElement>(
      ".cdc-wal-kafka-result",
    );

    expect(figure?.dataset.phase).toBe("establishing");
    expect(result?.textContent).toContain("3 WAL records");
    expect(result?.textContent).toContain("Kafka offsets 0–2");
    expect(result?.dataset.visible).toBeUndefined();
  });
});
