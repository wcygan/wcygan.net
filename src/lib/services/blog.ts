import type { Post } from "~/lib/types";
import { posts } from "virtual:blog-post-index";
import { findPostBySlug } from "./post-index";

export function getAllPosts(): Post[] {
  return posts.filter((post) => !post.unlisted);
}

export function getPostBySlug(slug: string): Post | undefined {
  return findPostBySlug(posts, slug);
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
  const index = posts.findIndex((post) => post.slug === slug);
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
