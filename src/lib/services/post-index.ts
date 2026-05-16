import type { Post, PostMetadata } from "~/lib/types";
import { isDraftPostFile, slugFromPostFilepath } from "./post-paths";
import { isPublicPost } from "./post-publication";

export interface PostModule {
  frontmatter: PostMetadata;
  default?: { toString(): string };
}

const WORDS_PER_MINUTE = 200;

function wordsInSource(source: string): number {
  return source.split(/\s+/).filter((word) => word.length > 0).length;
}

function readingTimeFor(post: PostModule): number {
  try {
    const words = wordsInSource(post.default?.toString() || "");
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  } catch {
    return 1;
  }
}

export function buildPostIndex(
  entries: Iterable<[string, PostModule]>,
): Post[] {
  return [...entries]
    .flatMap(([filepath, post]) => {
      if (isDraftPostFile(filepath)) {
        return [];
      }
      if (!isPublicPost(post.frontmatter)) {
        throw new Error(
          `${filepath} is marked private but is still matched by the public post glob. ` +
            `Rename it with a .draft.mdx suffix so it stays out of public assets.`,
        );
      }

      return [
        {
          slug: slugFromPostFilepath(filepath),
          title: post.frontmatter.title,
          date: post.frontmatter.date,
          description: post.frontmatter.description,
          tags: post.frontmatter.tags || [],
          readingTime: readingTimeFor(post),
        },
      ];
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function findPostBySlug(
  posts: readonly Post[],
  slug: string,
): Post | undefined {
  return posts.find((post) => post.slug === slug);
}
