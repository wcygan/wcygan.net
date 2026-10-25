import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyPrerenderedPages } from "./verify-prerender";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "prerender-test-"));
  await writeFile(
    join(directory, "index.html"),
    "<title>Will Cygan - Software Engineer</title>",
  );
  await mkdir(join(directory, "embeddings"));
  await writeFile(
    join(directory, "embeddings/index.html"),
    '<h1 id="post-title-embeddings">Embeddings</h1>',
  );
});
afterEach(() => rm(directory, { recursive: true, force: true }));

it("accepts the site's homepage and every expected article", async () => {
  await expect(
    verifyPrerenderedPages(directory, [{ slug: "embeddings" }]),
  ).resolves.toBeUndefined();
});

it("rejects a successful response from a different app", async () => {
  await writeFile(join(directory, "index.html"), "<title>Another app</title>");
  await expect(verifyPrerenderedPages(directory, [])).rejects.toThrow(
    "homepage does not belong to wcygan.net",
  );
});

it("rejects a missing article", async () => {
  await expect(
    verifyPrerenderedPages(directory, [{ slug: "fanout" }]),
  ).rejects.toThrow("ENOENT");
});

it("rejects another page written to an article's output path", async () => {
  await writeFile(
    join(directory, "embeddings/index.html"),
    "<h1>Not found</h1>",
  );
  await expect(
    verifyPrerenderedPages(directory, [{ slug: "embeddings" }]),
  ).rejects.toThrow("/embeddings is missing its article title");
});
