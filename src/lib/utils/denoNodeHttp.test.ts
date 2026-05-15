import { describe, expect, it } from "vitest";
import { normalizeHeaderPairsForDenoWriteHead } from "./denoNodeHttp";

describe("normalizeHeaderPairsForDenoWriteHead", () => {
  it("flattens fetch-style header pairs for Deno's node:http writeHead", () => {
    expect(
      normalizeHeaderPairsForDenoWriteHead([
        ["content-type", "text/html; charset=utf-8"],
        ["vary", "sec-fetch-dest, accept"],
      ]),
    ).toEqual([
      "content-type",
      "text/html; charset=utf-8",
      "vary",
      "sec-fetch-dest, accept",
    ]);
  });

  it("preserves already-flat raw headers", () => {
    const headers = ["content-type", "text/html", "vary", "accept"];

    expect(normalizeHeaderPairsForDenoWriteHead(headers)).toBe(headers);
  });

  it("expands array-valued headers as repeated header names", () => {
    expect(
      normalizeHeaderPairsForDenoWriteHead([
        ["set-cookie", ["a=1", "b=2"]],
        ["content-type", "text/plain"],
      ]),
    ).toEqual([
      "set-cookie",
      "a=1",
      "set-cookie",
      "b=2",
      "content-type",
      "text/plain",
    ]);
  });
});
