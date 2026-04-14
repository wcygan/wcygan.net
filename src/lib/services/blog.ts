import type { Post, PostMetadata } from "~/lib/types";

interface MdxModule {
  frontmatter: PostMetadata;
  default: React.ComponentType;
}

const postFiles = import.meta.glob<MdxModule>("/src/posts/*.mdx", {
  eager: true,
});

const WORDS_PER_MINUTE = 200;

function wordsInSource(source: string): number {
  return source.split(/\s+/).filter((word) => word.length > 0).length;
}

const posts: Post[] = Object.entries(postFiles)
  .map(([filepath, post]) => {
    const slug = filepath.replace("/src/posts/", "").replace(".mdx", "");

    let readingTime = 1;
    try {
      const words = wordsInSource(post.default?.toString() || "");
      readingTime = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
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

export function getAllPosts(): Post[] {
  return posts;
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
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

// Posts are sorted newest-first, so prev is the newer neighbor (lower index)
// and next is the older neighbor (higher index).
export function getAdjacentPosts(slug: string): AdjacentPosts {
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
