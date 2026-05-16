import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readPosts } from "../../../scripts/site-metadata-plugin";
import {
  buildSitemapEntries,
  generateRssXml,
  generateSitemapXml,
  SITE_URL,
} from "./generators";

const tempDirs: string[] = [];

function makePostsDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wcygan-posts-"));
  tempDirs.push(dir);
  return dir;
}

function writePost(postsDir: string, filename: string, frontmatter: string) {
  fs.writeFileSync(
    path.join(postsDir, filename),
    ["---", frontmatter.trim(), "---", "", "Body"].join("\n"),
  );
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("site metadata generation", () => {
  it("does not expose draft posts through public indexes", () => {
    const postsDir = makePostsDir();
    writePost(
      postsDir,
      "public-post.mdx",
      `
title: Public Post
date: January 1, 2025
description: Visible post
tags: [Public]
`,
    );
    writePost(
      postsDir,
      "draft-post.draft.mdx",
      `
title: Draft Post
date: January 2, 2025
description: Draft post
tags: [Draft]
`,
    );
    writePost(
      postsDir,
      "unpublished-post.draft.mdx",
      `
title: Unpublished Post
date: January 3, 2025
description: Unpublished post
tags: [Draft]
published: false
`,
    );

    const posts = readPosts(postsDir);
    const rss = generateRssXml(posts);
    const sitemap = generateSitemapXml(
      buildSitemapEntries([], posts, new Date("2026-01-01T00:00:00Z")),
    );

    expect(posts.map((post) => post.slug)).toEqual(["public-post"]);
    expect(rss).toContain(`${SITE_URL}/public-post`);
    expect(rss).not.toContain("draft-post");
    expect(rss).not.toContain("unpublished-post");
    expect(sitemap).toContain(`${SITE_URL}/public-post`);
    expect(sitemap).not.toContain("draft-post");
    expect(sitemap).not.toContain("unpublished-post");
  });
});
