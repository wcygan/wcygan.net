import fs from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { parseFrontmatter } from "../src/lib/sitemap/generators";
import {
  isDraftPostFile,
  slugFromPostFilepath,
} from "../src/lib/services/post-paths";
import { isPublicPost } from "../src/lib/services/post-publication";
import type { Post } from "../src/lib/types";

const VIRTUAL_ID = "virtual:blog-post-index";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const WORDS_PER_MINUTE = 200;

function readBlogPosts(postsDirectory: string, includeDrafts: boolean): Post[] {
  if (!fs.existsSync(postsDirectory)) return [];

  const posts: Post[] = [];
  const files = fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".mdx"));
  for (const file of files) {
    const draft = isDraftPostFile(file);
    if (draft && !includeDrafts) continue;

    const source = fs.readFileSync(path.join(postsDirectory, file), "utf8");
    const frontmatter = parseFrontmatter(source);
    if (!frontmatter) continue;
    if (!draft && !isPublicPost(frontmatter)) {
      throw new Error(
        `${file} is marked private but is still matched by the public post glob. ` +
          "Rename it with a .draft.mdx suffix so it stays out of public assets.",
      );
    }

    const title =
      typeof frontmatter.title === "string" ? frontmatter.title : undefined;
    const date =
      typeof frontmatter.date === "string" ? frontmatter.date : undefined;
    if (!title || !date) continue;

    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    const tags = Array.isArray(frontmatter.tags)
      ? frontmatter.tags.filter((tag): tag is string => typeof tag === "string")
      : [];

    posts.push({
      slug: slugFromPostFilepath(file),
      title,
      date,
      description:
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : "",
      ...(typeof frontmatter.image === "string"
        ? { image: frontmatter.image }
        : {}),
      ...(typeof frontmatter.imageAlt === "string"
        ? { imageAlt: frontmatter.imageAlt }
        : {}),
      ...(typeof frontmatter.imageCaption === "string"
        ? { imageCaption: frontmatter.imageCaption }
        : {}),
      ...(typeof frontmatter.relatedReading === "string"
        ? { relatedReading: frontmatter.relatedReading }
        : {}),
      ...(draft || frontmatter.draft === true ? { draft: true } : {}),
      ...(frontmatter.unlisted === true ? { unlisted: true } : {}),
      tags,
      readingTime: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    });
  }

  return posts.sort(
    (left, right) =>
      new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export function blogPostIndexPlugin(): Plugin {
  let postsDirectory: string;
  let includeDrafts = false;

  return {
    name: "wcygan-blog-post-index",
    configResolved(config: ResolvedConfig) {
      postsDirectory = path.resolve(config.root, "src/posts");
      includeDrafts = config.command === "serve";
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      for (const file of fs.readdirSync(postsDirectory)) {
        if (file.endsWith(".mdx")) {
          this.addWatchFile(path.join(postsDirectory, file));
        }
      }
      const posts = readBlogPosts(postsDirectory, includeDrafts);
      return `export const posts = ${JSON.stringify(posts)};`;
    },
    handleHotUpdate({ file, server }) {
      if (
        !file.startsWith(`${postsDirectory}${path.sep}`) ||
        !file.endsWith(".mdx")
      ) {
        return;
      }

      const module = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (module) server.moduleGraph.invalidateModule(module);
    },
  };
}
