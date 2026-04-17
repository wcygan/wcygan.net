import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { PostMetadata } from "~/lib/types";
import { getPostBySlug } from "~/lib/services/blog";
import { isStaticAssetSlug } from "~/lib/routing/static-asset-guard";
import { toIsoDate } from "~/lib/utils/formatDate";

interface MdxModule {
  frontmatter: PostMetadata;
  default: React.ComponentType;
}

const mdxModules = import.meta.glob<MdxModule>("/src/posts/*.mdx");

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
    return {
      meta: {
        title: post.title,
        date: post.date,
        description: post.description,
        tags: post.tags,
        readingTime: post.readingTime ?? 1,
      },
      slug: params.slug,
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

function BlogPostPage() {
  const { meta, slug } = Route.useLoaderData();
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
      <h2 className="post-title">
        <Link to="/$slug" params={{ slug }} className="post-permalink">
          {meta.title}
        </Link>
      </h2>
      <p className="post-footnote">
        <time dateTime={toIsoDate(meta.date)}>{meta.date}</time>
      </p>

      <div className="post-content">
        {Content ? <Content /> : <p>Loading...</p>}
      </div>

      <footer />
    </article>
  );
}
