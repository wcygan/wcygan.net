/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BigDatabaseCacheHitDemo } from "./BigDatabaseCacheHitDemo";
import { BigDatabaseCacheMissDemo } from "./BigDatabaseCacheMissDemo";
import { BigDatabaseSecondaryIndexDemo } from "./BigDatabaseSecondaryIndexDemo";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
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

it("keeps each demo's steps and replay independent without a scenario selector", () => {
  const view = render(
    <>
      <BigDatabaseCacheHitDemo />
      <BigDatabaseCacheMissDemo />
      <BigDatabaseSecondaryIndexDemo />
    </>,
  );
  const hit = within(
    view.getByRole("figure", { name: "A lookup served from RAM" }),
  );
  const miss = within(
    view.getByRole("figure", { name: "A cache miss reads from SSD" }),
  );
  const secondary = within(
    view.getByRole("figure", {
      name: "A secondary lookup traverses two trees",
    }),
  );
  expect(view.queryByRole("group", { name: "Lookup scenario" })).toBeNull();
  fireEvent.click(miss.getByRole("button", { name: "Step" }));
  expect(miss.getByRole("status").textContent).toContain("Step 2 of 6");
  expect(hit.getByRole("status").textContent).toContain("Step 1 of 4");
  expect(secondary.getByRole("status").textContent).toContain("Step 1 of 8");
  fireEvent.click(secondary.getByRole("button", { name: "Step" }));
  fireEvent.click(miss.getByRole("button", { name: "Replay" }));
  expect(miss.getByRole("status").textContent).toContain("Step 1 of 6");
  expect(secondary.getByRole("status").textContent).toContain("Step 2 of 8");
  expect(hit.getByRole("status").textContent).toContain("Step 1 of 4");
});
