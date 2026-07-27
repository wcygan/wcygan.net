/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OptimisticLockingRaceDemo } from "~/components/OptimisticLockingRaceDemo";

let documentHidden = false;
let nextFrameId = 1;
let pendingFrames = new Map<number, FrameRequestCallback>();

class MotionPreference {
  readonly media = "(prefers-reduced-motion: reduce)";
  matches = false;
  onchange = null;
  private listeners = new Set<(event: MediaQueryListEvent) => void>();

  addEventListener(
    _type: "change",
    listener: (event: MediaQueryListEvent) => void,
  ) {
    this.listeners.add(listener);
  }

  removeEventListener(
    _type: "change",
    listener: (event: MediaQueryListEvent) => void,
  ) {
    this.listeners.delete(listener);
  }

  setMatches(matches: boolean) {
    this.matches = matches;
    const event = { matches, media: this.media } as MediaQueryListEvent;
    for (const listener of this.listeners) listener(event);
  }

  listenerCount() {
    return this.listeners.size;
  }
}

let motionPreference: MotionPreference;

function runAnimationFrame(now: number) {
  const frames = [...pendingFrames.values()];
  pendingFrames.clear();
  for (const frame of frames) frame(now);
}

function inventoryValues(container: HTMLElement) {
  return [
    ...container.querySelectorAll(
      ".optimistic-locking-race-live-table tbody th, .optimistic-locking-race-live-table tbody td",
    ),
  ].map((value) => value.textContent);
}

function sqlText(container: HTMLElement) {
  return (
    container.querySelector(".optimistic-locking-race-sql")?.textContent ?? ""
  );
}

function versionPredicate(container: HTMLElement) {
  return container.querySelector(".optimistic-locking-race-version-predicate");
}

function liveVersionCell(container: HTMLElement) {
  return container.querySelector(".optimistic-locking-race-live-version");
}

describe("OptimisticLockingRaceDemo", () => {
  beforeEach(() => {
    documentHidden = false;
    nextFrameId = 1;
    pendingFrames = new Map();
    motionPreference = new MotionPreference();

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => documentHidden,
    });

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        pendingFrames.set(frameId, callback);
        return frameId;
      }),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((frameId: number) => {
        pendingFrames.delete(frameId);
      }),
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => motionPreference),
    );
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(document, "hidden");
    vi.unstubAllGlobals();
  });

  it("plays once, holds the final row, and replays from the true initial state", () => {
    const { container, getByRole } = render(<OptimisticLockingRaceDemo />);
    const figure = container.querySelector("figure");

    expect(figure?.dataset.phase).toBe("initial");
    expect(inventoryValues(container)).toEqual(["SKU-42", "2", "7"]);
    expect(sqlText(container)).toContain("SELECT available, version");
    expect(sqlText(container)).toContain("awaiting row");
    expect(
      [...container.querySelectorAll('[data-token="keyword"]')].map(
        (token) => token.textContent,
      ),
    ).toEqual(["SELECT", "FROM", "WHERE"]);
    expect(container.querySelector('[data-token="string"]')?.textContent).toBe(
      "SKU-42",
    );
    expect(versionPredicate(container)).toBeNull();
    expect(container.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    expect(
      container.querySelector(".optimistic-locking-race-live-table caption")
        ?.textContent,
    ).toContain("Live SQL Table");

    act(() => runAnimationFrame(0));
    act(() => runAnimationFrame(4_500));
    expect(figure?.dataset.phase).toBe("worker-a-submit");
    expect(versionPredicate(container)?.textContent).toContain("version = 7");
    expect(versionPredicate(container)?.getAttribute("data-guard-state")).toBe(
      "matching",
    );
    expect(liveVersionCell(container)?.getAttribute("data-guard-state")).toBe(
      "matching",
    );

    act(() => runAnimationFrame(6_000));
    expect(figure?.dataset.phase).toBe("worker-a-success");
    expect(inventoryValues(container)).toEqual(["SKU-42", "1", "8"]);
    expect(sqlText(container)).toContain("AND version = 7;");
    expect(sqlText(container)).toContain("ROW_COUNT() = 1");
    expect(versionPredicate(container)?.getAttribute("data-guard-state")).toBe(
      "matched",
    );
    expect(
      container
        .querySelector(".optimistic-locking-race-live-table tbody tr")
        ?.getAttribute("data-row-state"),
    ).toBe("updated");

    act(() => runAnimationFrame(8_000));
    expect(figure?.dataset.phase).toBe("worker-b-submit");
    expect(versionPredicate(container)?.textContent).toContain("version = 7");
    expect(versionPredicate(container)?.getAttribute("data-guard-state")).toBe(
      "stale",
    );
    expect(liveVersionCell(container)?.getAttribute("data-guard-state")).toBe(
      "none",
    );

    act(() => runAnimationFrame(11_000));
    expect(figure?.dataset.phase).toBe("worker-b-rejected");
    expect(inventoryValues(container)).toEqual(["SKU-42", "1", "8"]);
    expect(sqlText(container)).toContain("AND version = 7;");
    expect(sqlText(container)).toContain("ROW_COUNT() = 0");
    expect(versionPredicate(container)?.getAttribute("data-guard-state")).toBe(
      "stale",
    );
    expect(
      container
        .querySelector(".optimistic-locking-race-live-table tbody tr")
        ?.getAttribute("data-row-state"),
    ).toBe("unchanged");

    act(() => runAnimationFrame(13_000));
    expect(figure?.dataset.phase).toBe("worker-b-reread");
    expect(sqlText(container)).toContain("SELECT available, version");
    expect(sqlText(container)).toContain("available 1 · version 8");
    expect(versionPredicate(container)).toBeNull();

    act(() => runAnimationFrame(14_500));
    expect(figure?.dataset.phase).toBe("worker-b-retry");
    expect(versionPredicate(container)?.textContent).toContain("version = 8");
    expect(versionPredicate(container)?.getAttribute("data-guard-state")).toBe(
      "matching",
    );
    expect(liveVersionCell(container)?.getAttribute("data-guard-state")).toBe(
      "matching",
    );

    act(() => runAnimationFrame(16_000));
    expect(figure?.dataset.phase).toBe("complete");
    expect(inventoryValues(container)).toEqual(["SKU-42", "0", "9"]);
    expect(sqlText(container)).toContain("AND version = 8;");
    expect(sqlText(container)).toContain("ROW_COUNT() = 1");
    expect(versionPredicate(container)?.getAttribute("data-guard-state")).toBe(
      "matched",
    );
    expect(container.textContent).toContain(
      "2 reservations applied · 1 stale write rejected",
    );
    expect(pendingFrames.size).toBe(0);

    fireEvent.click(
      getByRole("button", { name: "Replay optimistic locking race" }),
    );
    expect(figure?.dataset.phase).toBe("initial");
    expect(figure?.dataset.resetting).toBe("true");
    expect(inventoryValues(container)).toEqual(["SKU-42", "2", "7"]);
    expect(sqlText(container)).toContain("SELECT available, version");
    expect(sqlText(container)).toContain("awaiting row");
    expect(sqlText(container)).not.toContain("ROW_COUNT() = 1");
    expect(versionPredicate(container)).toBeNull();
  });

  it("settles on live reduced motion and remains coherent when motion returns", () => {
    const { container } = render(<OptimisticLockingRaceDemo />);
    const figure = container.querySelector("figure");

    act(() => runAnimationFrame(0));
    act(() => runAnimationFrame(8_000));
    expect(figure?.dataset.phase).toBe("worker-b-submit");

    act(() => motionPreference.setMatches(true));
    expect(figure?.dataset.phase).toBe("complete");
    expect(inventoryValues(container)).toEqual(["SKU-42", "0", "9"]);
    expect(sqlText(container)).toContain("AND version = 8;");
    expect(sqlText(container)).toContain("ROW_COUNT() = 1");
    expect(versionPredicate(container)?.getAttribute("data-guard-state")).toBe(
      "matched",
    );
    expect(pendingFrames.size).toBe(0);

    act(() => motionPreference.setMatches(false));
    expect(figure?.dataset.phase).toBe("complete");
    expect(pendingFrames.size).toBe(0);
  });

  it("pauses while hidden, resumes without a time jump, and cleans resources", () => {
    const { container, unmount } = render(<OptimisticLockingRaceDemo />);
    const figure = container.querySelector("figure");

    act(() => runAnimationFrame(0));
    act(() => runAnimationFrame(5_000));
    expect(figure?.dataset.phase).toBe("worker-a-submit");

    act(() => {
      documentHidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(pendingFrames.size).toBe(0);

    act(() => {
      documentHidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => runAnimationFrame(20_000));
    expect(figure?.dataset.phase).toBe("worker-a-submit");

    act(() => runAnimationFrame(21_000));
    expect(figure?.dataset.phase).toBe("worker-a-success");

    unmount();
    expect(pendingFrames.size).toBe(0);
    expect(motionPreference.listenerCount()).toBe(0);
  });
});
