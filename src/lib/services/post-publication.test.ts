import { describe, expect, it } from "vitest";
import { isPublicPost } from "./post-publication";

describe("isPublicPost", () => {
  it("keeps posts public by default", () => {
    expect(isPublicPost({})).toBe(true);
    expect(isPublicPost({ published: true })).toBe(true);
    expect(isPublicPost({ draft: false })).toBe(true);
  });

  it("treats draft posts as private", () => {
    expect(isPublicPost({ draft: true })).toBe(false);
    expect(isPublicPost({ draft: "true" })).toBe(false);
  });

  it("treats explicitly unpublished posts as private", () => {
    expect(isPublicPost({ published: false })).toBe(false);
    expect(isPublicPost({ published: "false" })).toBe(false);
  });
});
