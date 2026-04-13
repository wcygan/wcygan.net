import type { Post, PostMetadata } from "~/lib/types";
import { calculateReadingTime } from "~/lib/utils/readingTime";

interface MdxModule {
  frontmatter: PostMetadata;
  default: React.ComponentType;
}

const postFiles = import.meta.glob<MdxModule>("/src/posts/*.mdx", {
  eager: true,
});

let _posts: Post[] | null = null;

function initPosts(): Post[] {
  if (!_posts) {
    _posts = Object.entries(postFiles)
      .map(([filepath, post]) => {
        const slug = filepath.replace("/src/posts/", "").replace(".mdx", "");

        let readingTime = 0;
        try {
          const contentMatch = post.default?.toString() || "";
          readingTime = calculateReadingTime(contentMatch);
        } catch {
          readingTime = 1;
        }

        return {
          slug,
          title: post.frontmatter.title,
          date: post.frontmatter.date,
          description: post.frontmatter.description,
          tags: post.frontmatter.tags || [],
          readingTime,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return _posts;
}

export function getAllPosts(): Post[] {
  return initPosts();
}

export function getRecentPosts(count: number): Post[] {
  return initPosts().slice(0, count);
}

export function getPostBySlug(slug: string): Post | undefined {
  return initPosts().find((post) => post.slug === slug);
}

export function getPostsByTag(tag: string): Post[] {
  return initPosts().filter((post) => post.tags && post.tags.includes(tag));
}

export function getAllTags(): string[] {
  const allTags = initPosts()
    .flatMap((post) => post.tags || [])
    .filter((tag, index, array) => array.indexOf(tag) === index);
  return allTags.sort();
}

export interface AdjacentPost {
  slug: string;
  title: string;
  date: string;
}

export interface AdjacentPosts {
  prev: AdjacentPost | null;
  next: AdjacentPost | null;
}

/**
 * Returns the previous and next posts relative to the given slug.
 * Posts are sorted newest-first, so "prev" is the newer neighbor
 * (lower index) and "next" is the older neighbor (higher index).
 */
export function getAdjacentPosts(slug: string): AdjacentPosts {
  const posts = initPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };

  const prevPost = index > 0 ? posts[index - 1] : null;
  const nextPost = index < posts.length - 1 ? posts[index + 1] : null;

  return {
    prev: prevPost
      ? { slug: prevPost.slug, title: prevPost.title, date: prevPost.date }
      : null,
    next: nextPost
      ? { slug: nextPost.slug, title: nextPost.title, date: nextPost.date }
      : null,
  };
}
