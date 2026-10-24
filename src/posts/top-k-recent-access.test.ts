/** @vitest-environment jsdom */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { evaluate } from "@mdx-js/mdx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import { expect, it } from "vitest";
import { remarkPostToc } from "../../scripts/remark-post-toc";

it("preserves one paragraph per complexity summary after browser parsing", async () => {
  const article = pathToFileURL(resolve("src/posts/top-k-recent-access.mdx"));
  const { default: Post } = await evaluate(await readFile(article, "utf8"), {
    ...runtime,
    baseUrl: article,
    remarkPlugins: [
      remarkFrontmatter,
      remarkMdxFrontmatter,
      remarkGfm,
      remarkPostToc,
    ],
  });
  const container = document.createElement("article");
  container.innerHTML = renderToStaticMarkup(createElement(Post));
  const summaries = Array.from(
    container.querySelectorAll(".top-k-complexity > section"),
    (section) =>
      Array.from(section.querySelectorAll(":scope > p"), (paragraph) =>
        paragraph.textContent?.replace(/\s+/g, " ").trim(),
      ),
  );
  expect(summaries).toEqual([
    ["topK(k) takes O(n + e + q log q)."],
    ["Stored state takes O(n + r); topK uses O(q) extra space."],
    ["A clean topK(k) usually takes O(k log h), where h is the heap size."],
    [
      "After a successful read or nonzero topK, stored state takes O(n + a + c + 1); the query uses O(k) extra space.",
    ],
  ]);
});
