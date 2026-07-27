/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IncrementalEtlFlowDemo } from "~/components/IncrementalEtlFlowDemo";
import { KafkaIcon } from "~/components/icons/KafkaIcon";

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

  addListener(listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener);
  }

  dispatchEvent(event: Event) {
    for (const listener of this.listeners) {
      listener(event as MediaQueryListEvent);
    }
    return true;
  }

  setMatches(matches: boolean) {
    this.matches = matches;
    const event = {
      matches,
      media: this.media,
    } as MediaQueryListEvent;

    for (const listener of this.listeners) listener(event);
    this.onchange?.(event);
  }

  listenerCount() {
    return this.listeners.size;
  }
}

describe("IncrementalEtlFlowDemo motion preferences", () => {
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

  it("keeps branded actors in causal order with decorative logos", () => {
    const { container } = render(<IncrementalEtlFlowDemo />);
    const actors = Array.from(
      container.querySelectorAll<HTMLElement>(".etl-flow-actor"),
    );

    expect(actors.map((actor) => actor.dataset.actor)).toEqual([
      "mysql",
      "brooklin",
      "kafka",
      "gobblin",
      "opal",
    ]);
    expect(
      actors.map((actor) => actor.querySelector("header strong")?.textContent),
    ).toEqual(["MySQL", "Brooklin", "Kafka", "Gobblin", "Opal"]);
    expect(
      actors
        .slice(1, 4)
        .map((actor) => actor.querySelector("header span")?.textContent),
    ).toEqual(["Capture & publish", "Accept & record", "Read & write"]);
    expect(
      actors.every(
        (actor) =>
          actor
            .querySelector(".etl-flow-actor-logo")
            ?.getAttribute("aria-hidden") === "true",
      ),
    ).toBe(true);
    expect(actors[0].querySelector("svg")).not.toBeNull();
    expect(actors[2].querySelector("svg")).not.toBeNull();
    expect(
      Array.from(
        container.querySelectorAll<HTMLImageElement>(
          ".etl-flow-actor-logo img",
        ),
        (image) => image.getAttribute("src"),
      ),
    ).toEqual([
      "/change-data-capture/brooklin.png",
      "/change-data-capture/gobblin.png",
      "/change-data-capture/hdfs.png",
    ]);

    expect(
      actors
        .slice(1, 4)
        .map(
          (actor) =>
            actor.querySelector(".etl-flow-actor-state code")?.textContent,
        ),
    ).toEqual([
      "MySQL change → Kafka",
      "topic app.public.users",
      "app.public.users → HDFS",
    ]);
    expect(
      actors
        .slice(1, 4)
        .map(
          (actor) =>
            actor.querySelector(".etl-flow-actor-state > span")?.textContent,
        ),
    ).toEqual([
      "Awaiting MySQL commit",
      "Awaiting Brooklin event",
      "Awaiting users record",
    ]);
    expect(
      container.querySelector("#etl-flow-description")?.textContent,
    ).toContain(
      "Brooklin captures the committed MySQL change and publishes a CDC event to Kafka",
    );
    expect(
      container.querySelector("#etl-flow-description")?.textContent,
    ).toContain(
      "Kafka accepts the event and records it in the app.public.users topic",
    );
    expect(
      container.querySelector("#etl-flow-description")?.textContent,
    ).toContain("Gobblin reads that topic and writes the record into HDFS");

    const handoffs = Array.from(
      container.querySelectorAll<SVGElement>(".etl-flow-handoff"),
    );
    expect(handoffs).toHaveLength(4);
    expect(handoffs.map((handoff) => handoff.dataset.status)).toEqual([
      "waiting",
      "waiting",
      "waiting",
      "waiting",
    ]);
    expect(container.querySelector(".etl-flow-rail")).toBeNull();

    const eventLeg = container.querySelector<HTMLElement>(
      ".etl-flow-event-leg",
    );
    expect(eventLeg?.dataset.from).toBe("mysql");
    expect(eventLeg?.dataset.to).toBe("brooklin");
    expect(eventLeg?.dataset.hopState).toBe("hidden");
    expect(
      eventLeg?.querySelector(".etl-flow-event-payload")?.textContent,
    ).toBe("id 42commit");
  });

  it("gives each Kafka logo an instance-safe SVG mask", () => {
    const { container } = render(
      <div>
        <KafkaIcon />
        <KafkaIcon />
      </div>,
    );
    const maskIds = Array.from(
      container.querySelectorAll<SVGMaskElement>("mask"),
      (mask) => mask.id,
    );
    const maskReferences = Array.from(
      container.querySelectorAll<SVGGElement>("g[mask]"),
      (group) => group.getAttribute("mask"),
    );

    expect(new Set(maskIds).size).toBe(2);
    expect(maskReferences).toEqual(maskIds.map((id) => `url(#${id})`));
  });

  it("settles immediately and keeps Replay finite in reduced motion", () => {
    motionPreference.matches = true;

    const { container } = render(<IncrementalEtlFlowDemo />);
    const figure = container.querySelector<HTMLElement>(".etl-flow-demo");
    const replay =
      container.querySelector<HTMLButtonElement>(".etl-flow-replay");

    expect(figure?.dataset.phase).toBe("synchronized");
    expect(figure?.dataset.mysqlPlan).toBe("pro");
    expect(figure?.dataset.opalPlan).toBe("pro");
    expect(
      Array.from(
        container.querySelectorAll<SVGElement>(".etl-flow-handoff"),
        (handoff) => handoff.dataset.status,
      ),
    ).toEqual(["complete", "complete", "complete", "complete"]);
    expect(
      container.querySelector<HTMLElement>(".etl-flow-event-leg")?.dataset
        .visible,
    ).toBe("false");
    expect(
      container.querySelector(
        '[data-actor="gobblin"] .etl-flow-actor-state > span',
      )?.textContent,
    ).toBe("Wrote record into HDFS");
    expect(
      container
        .querySelector('[data-actor="mysql"] [data-plan-option="free"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      container
        .querySelector('[data-actor="mysql"] [data-plan-option="pro"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("false");

    fireEvent.click(replay!);

    expect(figure?.dataset.phase).toBe("synchronized");
    expect(figure?.dataset.opalPlan).toBe("pro");
  });

  it("responds to live reduced-motion preference changes", () => {
    const { container } = render(<IncrementalEtlFlowDemo />);
    const figure = container.querySelector<HTMLElement>(".etl-flow-demo");

    expect(figure?.dataset.phase).toBe("establishing");
    expect(figure?.dataset.mysqlPlan).toBe("free");
    expect(figure?.dataset.opalPlan).toBe("free");
    expect(
      container
        .querySelector('[data-actor="mysql"] [data-plan-option="free"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("false");
    expect(
      container
        .querySelector('[data-actor="mysql"] [data-plan-option="pro"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");

    act(() => motionPreference.setMatches(true));

    expect(figure?.dataset.phase).toBe("synchronized");
    expect(figure?.dataset.mysqlPlan).toBe("pro");
    expect(figure?.dataset.opalPlan).toBe("pro");

    act(() => motionPreference.setMatches(false));

    expect(figure?.dataset.phase).toBe("establishing");
    expect(figure?.dataset.mysqlPlan).toBe("free");
    expect(figure?.dataset.opalPlan).toBe("free");
  });

  it("caps long frame gaps so a stalled frame cannot skip readable phases", () => {
    let queuedFrame: FrameRequestCallback | undefined;
    let nextFrameId = 1;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        queuedFrame = callback;
        return nextFrameId++;
      }),
    );

    const { container } = render(<IncrementalEtlFlowDemo />);
    const figure = container.querySelector<HTMLElement>(".etl-flow-demo");

    const runFrame = (timestamp: number) => {
      const frame = queuedFrame;
      queuedFrame = undefined;
      act(() => frame?.(timestamp));
    };

    runFrame(0);
    runFrame(5_000);

    expect(figure?.dataset.phase).toBe("establishing");

    for (let frame = 1; frame <= 21; frame += 1) {
      runFrame(5_000 + frame * 100);
    }

    expect(figure?.dataset.phase).toBe("establishing");

    runFrame(7_200);

    expect(figure?.dataset.phase).toBe("submitting");
  });

  it("pauses while hidden and cleans up every playback listener", () => {
    let isHidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => isHidden);

    const { unmount } = render(<IncrementalEtlFlowDemo />);
    const requestFrame = vi.mocked(window.requestAnimationFrame);
    const cancelFrame = vi.mocked(window.cancelAnimationFrame);

    expect(motionPreference.listenerCount()).toBe(1);
    expect(requestFrame).toHaveBeenCalledTimes(1);

    isHidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(cancelFrame).toHaveBeenCalled();

    isHidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(requestFrame).toHaveBeenCalledTimes(2);

    unmount();

    expect(motionPreference.listenerCount()).toBe(0);
    expect(cancelFrame).toHaveBeenCalled();
  });
});
