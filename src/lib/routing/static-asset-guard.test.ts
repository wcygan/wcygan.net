import { describe, expect, it } from "vitest";
import { isStaticAssetSlug } from "./static-asset-guard";

describe("isStaticAssetSlug", () => {
  it("flags slugs that contain a dot as static assets", () => {
    expect(isStaticAssetSlug("rss.xml")).toBe(true);
    expect(isStaticAssetSlug("will_cygan_resume.pdf")).toBe(true);
    expect(isStaticAssetSlug("favicon.ico")).toBe(true);
    expect(isStaticAssetSlug("robots.txt")).toBe(true);
  });

  it("does not flag normal post slugs", () => {
    expect(isStaticAssetSlug("my-first-post")).toBe(false);
    expect(isStaticAssetSlug("experiment-pull-quotes")).toBe(false);
    expect(isStaticAssetSlug("a")).toBe(false);
    expect(isStaticAssetSlug("")).toBe(false);
  });

  it("flags slugs where the dot is not the extension separator", () => {
    expect(isStaticAssetSlug(".hidden")).toBe(true);
    expect(isStaticAssetSlug("foo.bar.baz")).toBe(true);
  });
});
