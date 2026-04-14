import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { PostMetadata } from "~/lib/types";
import { getPostBySlug, getAdjacentPosts } from "~/lib/services/blog";
import type { AdjacentPost } from "~/lib/services/blog";
import { isStaticAssetSlug } from "~/lib/routing/static-asset-guard";

interface MdxModule {
  frontmatter: PostMetadata;
  default: React.ComponentType;
}

const mdxModules = import.meta.glob<MdxModule>("/src/posts/*.mdx");

function formatReadingTime(minutes: number): string {
  return minutes === 1 ? "1 min read" : `${minutes} min read`;
}

export const Route = createFileRoute("/$slug")({
  beforeLoad: ({ params }) => {
    if (isStaticAssetSlug(params.slug)) {
      throw notFound();
    }
  },
  loader: ({ params }) => {
    // Only return serializable data from the loader
    const post = getPostBySlug(params.slug);
    if (!post) {
      throw notFound();
    }
    const hasModule = `/src/posts/${params.slug}.mdx` in mdxModules;
    if (!hasModule) {
      throw notFound();
    }
    const adjacent = getAdjacentPosts(params.slug);
    return {
      meta: {
        title: post.title,
        date: post.date,
        description: post.description,
        tags: post.tags,
        readingTime: post.readingTime ?? 1,
      },
      slug: params.slug,
      prev: adjacent.prev,
      next: adjacent.next,
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.meta?.title ?? "Post"} - Will Cygan` },
      {
        name: "description",
        content: loaderData?.meta?.description ?? "",
      },
    ],
  }),
  component: BlogPostPage,
});

function PostNavCard({
  post,
  direction,
}: {
  post: AdjacentPost;
  direction: "prev" | "next";
}) {
  const label = direction === "prev" ? "Previous" : "Next";
  const align =
    direction === "prev" ? "post-nav-card--prev" : "post-nav-card--next";
  return (
    <div className={`post-nav-card ${align}`}>
      <span className="post-nav-card__label">{label}</span>
      <Link
        to="/$slug"
        params={{ slug: post.slug }}
        className="post-nav-card__title"
      >
        {post.title}
      </Link>
      <span className="post-nav-card__date">{post.date}</span>
    </div>
  );
}

function BlogPostPage() {
  const { meta, slug, prev, next } = Route.useLoaderData();
  const [Content, setContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const key = `/src/posts/${slug}.mdx`;
    const loadModule = mdxModules[key];
    if (loadModule) {
      loadModule().then((mod) => {
        setContent(() => mod.default);
      });
    }
  }, [slug]);

  return (
    <article className="blog-post">
      <header className="post-header">
        <h1 className="post-title">{meta.title}</h1>
        <div className="post-meta">
          <time dateTime={meta.date}>{meta.date}</time>
        </div>
      </header>

      <div className="post-content">
        {Content ? <Content /> : <p>Loading...</p>}
      </div>

      <footer className="post-footer">
        <div className="post-footer__rule" aria-hidden="true" />

        <p className="post-footer__meta">
          Last updated {meta.date}
          {meta.readingTime ? ` · ${formatReadingTime(meta.readingTime)}` : ""}
        </p>

        {(prev || next) && (
          <nav className="post-nav" aria-label="Post navigation">
            {prev && <PostNavCard post={prev} direction="prev" />}
            {next && <PostNavCard post={next} direction="next" />}
          </nav>
        )}

        <div className="post-footer__back">
          <Link to="/posts">← back to all posts</Link>
        </div>
      </footer>
    </article>
  );
}
