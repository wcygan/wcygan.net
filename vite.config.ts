import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { addCopyButton } from "shiki-transformer-copy-button";
import {
  blogPostIndexPlugin,
  readBlogPosts,
} from "./scripts/blog-post-index-plugin";
import { siteMetadataPlugin } from "./scripts/site-metadata-plugin";
import { postReloadPlugin } from "./scripts/post-reload-plugin";
import { recmaPostToc, remarkPostToc } from "./scripts/remark-post-toc";
import { idleToesTheme } from "./src/lib/syntax/idle-toes-theme";

const devCacheKey = process.env.PORT || process.pid;

export default defineConfig(({ command }) => ({
  // Concurrent previews and builds must not replace a running server's optimized
  // dependencies. Portless supplies a distinct PORT; bare Vite runs use their PID.
  cacheDir:
    command === "serve"
      ? `node_modules/.vite/dev-${devCacheKey}`
      : "node_modules/.vite/build",
  optimizeDeps: {
    esbuildOptions: {
      // Vite's browser hash omits cacheDir. Include its identity in the hashed
      // optimizer options so cached dependencies cannot import an older dev
      // server's React while React DOM loads from the current cache directory.
      define: {
        __WCYGAN_DEV_CACHE_KEY__: JSON.stringify(devCacheKey),
      },
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    host: process.env.HOST || "localhost",
  },
  css: {
    postcss: "./postcss.config.js",
  },
  plugins: [
    blogPostIndexPlugin(),
    mdx({
      remarkPlugins: [
        remarkFrontmatter,
        remarkMdxFrontmatter,
        remarkGfm,
        remarkPostToc,
      ],
      recmaPlugins: [recmaPostToc],
      rehypePlugins: [
        [
          rehypeShiki,
          {
            theme: idleToesTheme,
            langs: [
              "javascript",
              "typescript",
              "tsx",
              "json",
              "bash",
              "markdown",
              "mdx",
              "html",
              "css",
              "rust",
              "go",
              "java",
              "python",
              "sql",
              "diff",
              "yaml",
            ],
            transformers: [
              {
                name: "add-line-numbers",
                line(node: any, line: number) {
                  node.properties = node.properties || {};
                  node.properties["data-line"] = line;
                },
              },
              addCopyButton({ toggle: 2000 }),
              {
                name: "strip-copy-button-inline-handler",
                pre(node: any) {
                  node.properties = node.properties || {};
                  node.properties.tabIndex = 0;
                  for (const child of node.children ?? []) {
                    if (
                      child.type === "element" &&
                      child.tagName === "button" &&
                      child.properties
                    ) {
                      delete child.properties.onclick;
                      delete child.properties.onClick;
                      child.properties["aria-label"] = "Copy code";
                    }
                  }
                },
              },
            ],
          },
        ],
        // Add target="_blank" to external links
        () => (tree: any) => {
          (function traverse(node: any) {
            if (
              node.type === "element" &&
              node.tagName === "a" &&
              node.properties?.href?.startsWith("http")
            ) {
              node.properties.target = "_blank";
              node.properties.rel = "noopener noreferrer";
            }
            if (node.children) {
              node.children.forEach(traverse);
            }
          })(tree);
        },
      ],
    }),
    tanstackStart({
      srcDirectory: "src",
      pages: [
        { path: "/" },
        ...readBlogPosts(
          fileURLToPath(new URL("./src/posts", import.meta.url)),
          false,
        ).map((post) => ({
          path: `/${post.slug}`,
          ...(post.unlisted ? { sitemap: { exclude: true } } : {}),
        })),
      ],
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        failOnError: true,
        // Don't re-render static assets (e.g. PDFs) the crawler discovers —
        // Nitro copies them from public/ verbatim, and running them through
        // the HTML prerenderer corrupts binary bytes via UTF-8 decoding.
        filter: ({ path }) => !/\.[a-z0-9]+$/i.test(path),
      },
    }),
    react(),
    nitro({ preset: "bun" }),
    siteMetadataPlugin(),
    postReloadPlugin(),
  ],
  resolve: {
    alias: [
      ...(command === "serve"
        ? [
            {
              find: "~/lib/services/draft-post-modules",
              replacement: new URL(
                "./src/lib/services/draft-post-modules.dev.ts",
                import.meta.url,
              ).pathname,
            },
          ]
        : []),
      { find: "~", replacement: new URL("./src", import.meta.url).pathname },
      { find: /^mermaid$/, replacement: "mermaid/dist/mermaid.esm.min.mjs" },
    ],
  },
  ssr: {
    noExternal: [],
    external: ["mermaid"],
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
}));
