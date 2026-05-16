import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { draftPostModules } from "~/lib/services/draft-post-modules";
import { getPostBySlug } from "~/lib/services/blog";
import type { LazyMdxModule, MdxModule } from "~/lib/services/post-modules";
import { slugFromPostFilepath } from "~/lib/services/post-paths";
import { isStaticAssetSlug } from "~/lib/routing/static-asset-guard";
import { toIsoDate } from "~/lib/utils/formatDate";

const mdxModules = import.meta.glob<MdxModule>([
  "/src/posts/*.mdx",
  "!/src/posts/*.draft.mdx",
]);
const postModules: Record<string, LazyMdxModule> = {
  ...mdxModules,
  ...draftPostModules,
};
const postModuleKeyBySlug = new Map(
  Object.keys(postModules).map((key) => [slugFromPostFilepath(key), key]),
);

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
    const moduleKey = postModuleKeyBySlug.get(params.slug);
    if (!moduleKey) {
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
      moduleKey,
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
  const { meta, moduleKey, slug } = Route.useLoaderData();
  const [Content, setContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const loadModule = postModules[moduleKey];
    if (loadModule) {
      loadModule().then((mod) => {
        setContent(() => mod.default);
      });
    }
  }, [moduleKey]);

  return (
    <article className="blog-post h-entry">
      <h2 className="post-title p-name">
        <Link to="/$slug" params={{ slug }} className="post-permalink">
          {meta.title}
        </Link>
      </h2>
      <p className="post-footnote">
        <time className="dt-published" dateTime={toIsoDate(meta.date)}>
          {meta.date}
        </time>
      </p>

      <div className="post-content e-content">
        {Content ? <Content /> : <p>Loading...</p>}
      </div>

      <footer />
    </article>
  );
}
