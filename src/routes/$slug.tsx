import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { TableOfContents } from "~/components/TableOfContents";
import {
  clearArticleGraphicMarkers,
  markArticleGraphics,
  shouldInspectArticleGraphics,
} from "~/lib/article-graphics";
import { draftPostModules } from "~/lib/services/draft-post-modules";
import { getPostBySlug } from "~/lib/services/blog";
import type { LazyMdxModule, MdxModule } from "~/lib/services/post-modules";
import { slugFromPostFilepath } from "~/lib/services/post-paths";
import { isStaticAssetSlug } from "~/lib/routing/static-asset-guard";
import {
  shouldShowTableOfContents,
  type TableOfContentsItem,
} from "~/lib/table-of-contents";
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
const POST_TITLE_TOC_ID_PREFIX = "post-title";
const EMPTY_TOC: readonly TableOfContentsItem[] = [];

function useActiveTocId(items: readonly TableOfContentsItem[]): string {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!shouldShowTableOfContents(items)) {
      setActiveId("");
      return;
    }

    const headings = items
      .map((item) => ({
        id: item.id,
        element: document.getElementById(item.id),
      }))
      .filter(
        (heading): heading is { id: string; element: HTMLElement } =>
          heading.element instanceof HTMLElement,
      );

    if (headings.length === 0) {
      setActiveId("");
      return;
    }

    let animationFrame = 0;

    const updateActiveHeading = () => {
      animationFrame = 0;
      const documentHeight = document.documentElement.scrollHeight;
      const canScroll = documentHeight > window.innerHeight + 2;
      const isAtPageTop = window.scrollY <= 8;
      const isAtPageBottom =
        canScroll && window.scrollY + window.innerHeight >= documentHeight - 8;
      const readingLine = Math.min(window.innerHeight * 0.3, 220);
      let nextActiveId = isAtPageTop
        ? headings[0].id
        : isAtPageBottom
          ? headings[headings.length - 1].id
          : headings[0].id;

      if (!isAtPageTop && !isAtPageBottom) {
        for (const heading of headings) {
          if (heading.element.getBoundingClientRect().top <= readingLine) {
            nextActiveId = heading.id;
          } else {
            break;
          }
        }
      }

      setActiveId((currentId) =>
        currentId === nextActiveId ? currentId : nextActiveId,
      );
    };

    const scheduleUpdate = () => {
      if (animationFrame !== 0) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [items]);

  return activeId;
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
  const [postModule, setPostModule] = useState<MdxModule | null>(null);
  const postContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCurrent = true;
    const loadModule = postModules[moduleKey];
    setPostModule(null);
    if (loadModule) {
      loadModule().then((mod) => {
        if (isCurrent) {
          setPostModule(mod);
        }
      });
    }

    return () => {
      isCurrent = false;
    };
  }, [moduleKey]);

  const Content = postModule?.default ?? null;
  const toc = postModule?.toc ?? EMPTY_TOC;
  const postTitleTocId = `${POST_TITLE_TOC_ID_PREFIX}-${slug}`;
  const tocWithTitle = useMemo<TableOfContentsItem[]>(
    () => [
      {
        id: postTitleTocId,
        title: meta.title,
        depth: 2,
      },
      ...toc,
    ],
    [meta.title, postTitleTocId, toc],
  );
  const showToc = shouldShowTableOfContents(tocWithTitle);
  const activeTocId = useActiveTocId(tocWithTitle);

  useEffect(() => {
    const postContent = postContentRef.current;
    if (!postContent) {
      return;
    }

    markArticleGraphics(postContent, slug);
    postContent.toggleAttribute(
      "data-inspect-graphics",
      shouldInspectArticleGraphics(window.location.search),
    );

    return () => clearArticleGraphicMarkers(postContent);
  }, [Content, slug]);

  return (
    <div className={showToc ? "post-shell post-shell-with-toc" : "post-shell"}>
      <article className="blog-post h-entry">
        <h1 id={postTitleTocId} className="post-title p-name">
          <Link to="/$slug" params={{ slug }} className="post-permalink">
            {meta.title}
          </Link>
        </h1>
        <p className="post-footnote">
          <time className="dt-published" dateTime={toIsoDate(meta.date)}>
            {meta.date}
          </time>
        </p>

        <div ref={postContentRef} className="post-content e-content">
          {Content ? <Content /> : <p>Loading...</p>}
        </div>

        <footer />
      </article>

      {showToc ? (
        <aside className="post-toc-desktop">
          <TableOfContents activeId={activeTocId} items={tocWithTitle} />
        </aside>
      ) : null}
    </div>
  );
}
