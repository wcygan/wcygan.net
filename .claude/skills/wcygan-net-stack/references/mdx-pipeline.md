# MDX Markdown Pipeline

## Overview

Blog posts are `.mdx` files in `src/posts/` compiled at build time by `@mdx-js/rollup` with Shiki syntax highlighting and frontmatter extraction.

## Pipeline Architecture

```
.mdx file
  → remark-frontmatter (parses YAML block)
  → remark-mdx-frontmatter (exports as `frontmatter`)
  → @shikijs/rehype (syntax highlighting with github-light theme)
  → custom rehype plugin (external links → target="_blank")
  → @mdx-js/rollup (compiles to React component)
```

Configured in `vite.config.ts` as the first plugin (must run before React).

## Blog Post Format

````mdx
---
title: My Post Title
date: January 1, 2026
description: A short description for SEO and listings
tags: [Tag1, Tag2, Tag3]
---

import { MermaidDiagram } from "~/components/MermaidDiagram";

Regular markdown content here. Links, **bold**, _italic_, etc.

## Code blocks get Shiki highlighting

```bash
echo "highlighted with github-light theme"
```
````

## React components work inline

<MermaidDiagram height={300} diagram={`flowchart LR
  A --> B --> C`} />

````

## Frontmatter Access

The `remark-mdx-frontmatter` plugin exports frontmatter as a named export:

```ts
// After MDX compilation, each .mdx module has:
export const frontmatter = {
  title: 'My Post Title',
  date: 'January 1, 2026',
  description: '...',
  tags: ['Tag1', 'Tag2'],
}
export default function MDXContent() { /* ... */ }
````

**Note**: This is `frontmatter`, not `metadata` (the old MDsveX convention).

## Blog Service: Post Discovery

`src/lib/services/blog.ts` uses Vite's glob import for build-time post discovery:

```ts
const postFiles = import.meta.glob<MdxModule>("/src/posts/*.mdx", {
  eager: true,
});
```

- `eager: true` loads all posts at build time (no lazy loading for the listing)
- Posts sorted by date (newest first)
- Slug extracted from filename: `src/posts/my-post.mdx` → slug `my-post`

Available functions: `getAllPosts()`, `getPostBySlug(slug)`, `getPostsByTag(tag)`, `getAllTags()`

## Dynamic Route Loading

The `$slug.tsx` route loads MDX content client-side (not in the loader) because React components aren't serializable across the SSR boundary:

```tsx
// In the route component (NOT the loader):
const mdxModules = import.meta.glob<MdxModule>("/src/posts/*.mdx");

// Client-side loading via useEffect
useEffect(() => {
  const loadModule = mdxModules[`/src/posts/${slug}.mdx`];
  loadModule().then((mod) => setContent(() => mod.default));
}, [slug]);
```

## Shiki Syntax Highlighting

Configured via `@shikijs/rehype` in the MDX rehype plugins:

- **Theme**: `github-light` (matches the site's light design)
- **Languages**: javascript, typescript, json, bash, markdown, html, css, rust, go, java, python, diff, yaml
- **Transformers**: Line numbers via `data-line` attribute
- **CSS**: Styling in `src/styles/app.css` under `.shiki` rules (background, line numbers, copy button)

To add a new language, add it to the `langs` array in `vite.config.ts`.

## Adding a New Blog Post

1. Create `src/posts/my-new-post.mdx` with frontmatter
2. It automatically appears on `/` and `/posts` (glob import picks it up)
3. Accessible at `/my-new-post` (slug from filename)
4. Update `public/rss.xml` manually if you want it in the RSS feed

## Gotcha: Bare URLs Are Not Autolinked

CommonMark-only parsing does not auto-link bare URLs like `https://github.com/foo/bar` on their own line — they render as plain text. The pipeline does **not** include `remark-gfm`, so GitHub-flavored autolink behavior is absent.

Use explicit markdown link syntax in posts:

```mdx
<!-- WRONG — renders as plain text -->

https://github.com/foo/bar

<!-- CORRECT -->

[https://github.com/foo/bar](https://github.com/foo/bar)
```

Avoid `<https://...>` CommonMark autolink syntax too — the leading `<` can be parsed as JSX in MDX.

If many bare URLs need linking across posts, adding `remark-gfm` to `remarkPlugins` in `vite.config.ts` is the alternative (also enables tables and strikethrough). The old Svelte/MDsveX build had GFM enabled, which is why ported posts lost their autolinks.

## Key Files

- `vite.config.ts` — MDX plugin config, Shiki settings, rehype plugins
- `src/lib/services/blog.ts` — Post discovery and metadata
- `src/routes/$slug.tsx` — Dynamic post rendering
- `src/posts/*.mdx` — Blog content
- `src/styles/app.css` — Code block styling (`.shiki` section)
- `src/lib/types.ts` — `PostMetadata`, `Post` interfaces
