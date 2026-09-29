// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PaxosDemo } from "./PaxosDemo";
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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup() {
  return render(
    <PaxosDemo
      title="Quorums"
      graphicKey="test"
      stages={["ABC", "CDE", "ADE"]}
      Scene={() => null}
      caption="Shared members"
    >
      {(step) => ({ status: `Round ${step + 1}` })}
    </PaxosDemo>,
  );
}
it("retains green progress through successive rounds and clears it on replay", () => {
  const { container } = setup();
  const reached = () =>
    container.querySelectorAll('[data-reached="true"]').length;
  expect(reached()).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Step" }));
  expect(reached()).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Step" }));
  expect(reached()).toBe(3);
  expect(
    container.querySelector('[aria-current="step"]')?.textContent,
  ).toContain("ADE");
  expect(
    screen.getByRole("button", { name: "Step" }).hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Replay" }));
  expect(reached()).toBe(1);
});
it("supports inspecting an earlier stage", () => {
  const { container } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Step 3: ADE" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Step 2: CDE (completed)" }),
  );
  expect(container.querySelectorAll('[data-reached="true"]').length).toBe(2);
  expect(
    container.querySelector(".demo-workbench-status")?.textContent,
  ).toContain("Round 2");
});
