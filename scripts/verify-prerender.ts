import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readBlogPosts } from "./blog-post-index-plugin";

export async function verifyPrerenderedPages(
  outputDirectory: string,
  posts: readonly { slug: string }[],
) {
  const home = await readFile(join(outputDirectory, "index.html"), "utf8");
  assert(
    home.includes("<title>Will Cygan - Software Engineer</title>"),
    "Prerendered homepage does not belong to wcygan.net",
  );

  for (const { slug } of posts) {
    const html = await readFile(
      join(outputDirectory, slug, "index.html"),
      "utf8",
    );
    assert(
      html.includes(`id="post-title-${slug}"`),
      `Prerendered /${slug} is missing its article title`,
    );
  }
}

export async function verifyProductionPrerender() {
  const posts = readBlogPosts(
    fileURLToPath(new URL("../src/posts", import.meta.url)),
    false,
  );
  await verifyPrerenderedPages(
    fileURLToPath(new URL("../.output/public", import.meta.url)),
    posts,
  );
  console.log(`[prerender] Verified homepage and ${posts.length} articles`);
}

if (import.meta.main) await verifyProductionPrerender();
