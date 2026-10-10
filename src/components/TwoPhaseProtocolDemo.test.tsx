/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TwoPhaseProtocolDemo } from "./TwoPhaseProtocolDemo";
import { participantLabels } from "~/demos/two-phase-commit/model";

let callbacks: Map<number, FrameRequestCallback>;
let clock: number;
let nextId: number;
let reduced: boolean;
let observeVisibility: (visible: boolean) => void;

function advance(milliseconds: number) {
  for (const timestamp of [clock, clock + milliseconds]) {
    act(() => {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(timestamp));
    });
  }
  clock += milliseconds;
}

function nextBeat() {
  advance(1000);
  advance(1000);
}

beforeEach(() => {
  callbacks = new Map();
  clock = 0;
  nextId = 0;
  reduced = false;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        private callback: (
          entries: { isIntersecting: boolean; intersectionRatio: number }[],
        ) => void,
      ) {
        observeVisibility = (visible) =>
          this.callback([
            { isIntersecting: visible, intersectionRatio: visible ? 1 : 0 },
          ]);
      }
      observe() {
        this.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function states(container: HTMLElement) {
  return [...container.querySelectorAll(".two-phase-participant")].map((node) =>
    node.getAttribute("data-state"),
  );
}
function scene(container: HTMLElement) {
  return container.querySelector(".two-phase-controls > span")?.textContent;
}
function finishDecision() {
  for (let beat = 0; beat < 6; beat++) nextBeat();
}

describe("two-phase uniform scene playback", () => {
  it("stops on green participants ready to vote, without sending votes", () => {
    const { container, queryByRole } = render(
      <TwoPhaseProtocolDemo phase="prepare" />,
    );
    expect(queryByRole("button", { name: "Yes" })).toBeNull();
    expect(states(container)).toEqual(["staged", "staged"]);
    nextBeat();
    expect(states(container)).toEqual(["requested", "requested"]);
    expect(container.querySelector(".two-phase-node-state")?.textContent).toBe(
      "Waiting for votes",
    );
    nextBeat();
    expect(states(container)).toEqual(["prepared", "prepared"]);
    expect(
      container.querySelectorAll('.two-phase-message[data-tone="yes"]'),
    ).toHaveLength(0);
    nextBeat();
    expect(scene(container)).toBe("4 / 4");
    expect(states(container)).toEqual(["voted-yes", "voted-yes"]);
    expect(container.querySelectorAll(".two-phase-message")).toHaveLength(0);
    expect(
      container
        .querySelector(".two-phase-coordinator")
        ?.getAttribute("data-tone"),
    ).toBe("info");
    expect(
      container.querySelectorAll('.two-phase-row[data-locked="true"]'),
    ).toHaveLength(2);
    advance(10000);
    expect(scene(container)).toBe("4 / 4");
    expect(callbacks.size).toBe(0);
  });

  it("keeps YES participants green while the decision demo sends their votes", () => {
    const { container, getByRole } = render(
      <TwoPhaseProtocolDemo phase="decision" />,
    );
    expect(scene(container)).toBe("1 / 7");
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "0/2 = ABORT",
    );
    expect(states(container)).toEqual(["voted-yes", "voted-yes"]);
    expect(container.querySelectorAll(".two-phase-message")).toHaveLength(0);
    fireEvent.click(getByRole("button", { name: "Pause" }));
    fireEvent.click(getByRole("button", { name: "Step" }));
    advance(400);
    expect(states(container)).toEqual(["voted-yes", "voted-yes"]);
    expect(
      container.querySelectorAll('.two-phase-message[data-tone="yes"]'),
    ).toHaveLength(1);
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "0/2 = ABORT",
    );
    expect(
      container.querySelector(".two-phase-message rect")?.getAttribute("y"),
    ).not.toBe("0");
    advance(600);
    expect(scene(container)).toBe("2 / 7");
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "1/2 = ABORT",
    );
    expect(states(container)).toEqual(["voted-yes", "voted-yes"]);
    expect(container.querySelectorAll(".two-phase-message")).toHaveLength(0);
    expect(container.querySelector(".two-phase-node-state")?.textContent).toBe(
      "A: YES",
    );
  });

  it("resumes at the same votes and rows, records the decision before sending it, then settles", () => {
    const { container, getByRole } = render(
      <TwoPhaseProtocolDemo phase="decision" />,
    );
    expect(states(container)).toEqual(["voted-yes", "voted-yes"]);
    expect(container.querySelector(".two-phase-node-state")?.textContent).toBe(
      "Waiting for votes",
    );
    for (let beat = 0; beat < 6; beat++) {
      const initialScene = scene(container);
      advance(999);
      expect(scene(container)).toBe(initialScene);
      expect(container.querySelectorAll(".two-phase-message")).toHaveLength(0);
      advance(1);
      expect(container.querySelectorAll(".two-phase-message")).toHaveLength(
        beat === 0 ? 1 : beat === 1 ? 1 : beat === 2 ? 0 : beat === 5 ? 2 : 1,
      );
      if (beat === 0 || beat === 1 || beat === 2) {
        expect(
          container.querySelector(".two-phase-vote-rule")?.textContent,
        ).toBe(
          beat === 0
            ? "0/2 = ABORT"
            : beat === 1
              ? "1/2 = ABORT"
              : "2/2 = COMMIT",
        );
      }
      if (beat === 0 || beat === 1) {
        expect(states(container)).toEqual(["voted-yes", "voted-yes"]);
        expect(
          container.querySelector(".two-phase-node-state")?.textContent,
        ).toBe(beat === 0 ? "Waiting for votes" : "A: YES");
      }
      advance(999);
      expect(scene(container)).toBe(initialScene);
      advance(1);
      expect(scene(container)).toBe(`${beat + 2} / 7`);
    }
    expect(states(container)).toEqual(["committed", "committed"]);
    expect(getByRole("button", { name: "Step" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(getByRole("button", { name: "Play" }).hasAttribute("disabled")).toBe(
      true,
    );
    advance(10000);
    expect(scene(container)).toBe("7 / 7");
    expect(callbacks.size).toBe(0);
  });

  it("freezes a paused packet and Step resumes from its current position", () => {
    const { container, getByRole } = render(
      <TwoPhaseProtocolDemo phase="prepare" />,
    );
    advance(1000);
    advance(200);
    const packet = container.querySelector(".two-phase-message rect")!;
    const position = packet.getAttribute("x");
    fireEvent.click(getByRole("button", { name: "Pause" }));
    advance(10000);
    expect(packet.getAttribute("x")).toBe(position);
    fireEvent.click(getByRole("button", { name: "Step" }));
    advance(799);
    expect(states(container)).toEqual(["staged", "staged"]);
    advance(1);
    expect(states(container)).toEqual(["requested", "requested"]);
    expect(callbacks.size).toBe(0);
  });

  it("resets votes to zero and tallies only votes received by the coordinator", () => {
    const { container, getByRole, getAllByRole } = render(
      <TwoPhaseProtocolDemo phase="decision" />,
    );
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "0/2 = ABORT",
    );
    fireEvent.click(getAllByRole("button", { name: "No" })[1]);
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "0/2 = ABORT",
    );
    fireEvent.click(getAllByRole("button", { name: "Yes" })[0]);
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "0/2 = ABORT",
    );
    for (let beat = 0; beat < 6; beat++) nextBeat();
    expect(states(container)).toEqual(["aborted", "aborted"]);
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "1/2 = ABORT",
    );
    fireEvent.click(getByRole("button", { name: "Replay" }));
    expect(container.querySelector(".two-phase-vote-rule")?.textContent).toBe(
      "0/2 = ABORT",
    );
    expect(states(container)).toEqual(["voted-yes", "rejected"]);
  });

  it.each(["hidden", "offscreen"] as const)(
    "does not catch up %s time during a packet transition",
    (reason) => {
      const { container } = render(<TwoPhaseProtocolDemo phase="prepare" />);
      advance(1000);
      advance(200);
      const packet = container.querySelector(".two-phase-message rect")!;
      const position = packet.getAttribute("x");
      const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
      function setVisible(visible: boolean) {
        act(() => {
          if (reason === "offscreen") observeVisibility(visible);
          else {
            hidden.mockReturnValue(!visible);
            document.dispatchEvent(new Event("visibilitychange"));
          }
        });
      }
      setVisible(false);
      advance(10000);
      expect(packet.getAttribute("x")).toBe(position);
      setVisible(true);
      advance(800);
      expect(scene(container)).toBe("2 / 4");
    },
  );

  it.each(["prepare", "decision"] as const)(
    "steps %s without motion and keeps the final state",
    (phase) => {
      reduced = true;
      const { container, getByRole } = render(
        <TwoPhaseProtocolDemo phase={phase} />,
      );
      expect(callbacks.size).toBe(0);
      for (let beat = 0; beat < (phase === "prepare" ? 3 : 6); beat++)
        fireEvent.click(getByRole("button", { name: "Step" }));
      advance(10000);
      expect(states(container)).toEqual(
        phase === "prepare"
          ? ["voted-yes", "voted-yes"]
          : ["committed", "committed"],
      );
      expect(container.querySelectorAll(".two-phase-message")).toHaveLength(0);
      expect(callbacks.size).toBe(0);
    },
  );
});
