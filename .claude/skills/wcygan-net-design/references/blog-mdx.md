# Blog & MDX

Posts live in `src/posts/*.mdx` and are loaded by `src/lib/services/blog.ts` via `import.meta.glob('/src/posts/*.mdx', { eager: true })`.

## File layout

```
src/posts/
  my-post-slug.mdx      → /my-post-slug
  another-post.mdx      → /another-post
```

Filename (minus `.mdx`) becomes the URL slug. Routes resolve through `src/routes/$slug.tsx`.

## Frontmatter

**Required** keys (exported as `frontmatter`, not `metadata` — `remark-mdx-frontmatter` config):

```yaml
---
title: "The Post Title"
date: "2026-04-13"
description: "One-sentence summary for RSS and meta description."
tags: ["distributed-systems", "rust"]
---
```

- `title` — string, appears as the green H1 on the post page.
- `date` — ISO `YYYY-MM-DD`, rendered as the italic gray meta line.
- `description` — 1–2 sentences. Used for `<meta name="description">` and RSS.
- `tags` — array of lowercase-hyphen strings. Currently not rendered in UI, but kept for RSS and future filtering.

## Body conventions

- Start with a lede paragraph. No duplicate H1 — the frontmatter `title` renders it.
- First in-content heading should be H2 (gray, 28px).
- H3 (green, 24px) for subsections.
- Code fences with language tag always — Shiki is build-time and uses the `github-light` theme.
- Mermaid diagrams: import at top of MDX, use `<MermaidDiagram height={N} diagram={\`...\`} />`.

Example skeleton:

```mdx
---
title: "Title"
date: "2026-04-13"
description: "Summary."
tags: ["topic"]
---

import { MermaidDiagram } from "~/components/MermaidDiagram";

Lede paragraph.

## First section

Body.

## Second section

<MermaidDiagram
  height={400}
  diagram={`flowchart LR
  A --> B`}
/>
```

## Routing gotchas

- `src/routes/$slug.tsx` rejects slugs containing `.` in `beforeLoad`. This protects `/rss.xml`, `/favicon.ico`, etc. from being treated as post slugs. **Never remove this guard.**
- Loaders must return serializable data. **Do not return a React component from a loader** — load the MDX component client-side via `useEffect` on `slug`.

## RSS sync

- `/feed` is a TanStack route.
- `public/rss.xml` is a static file served directly.
- **When adding a new post, update `public/rss.xml` manually** to keep RSS subscribers in sync. (Yes, this is manual. Yes, it should probably be automated — but today it's manual.)

## Homepage + `/posts` listing

- Homepage (`src/routes/index.tsx`) shows the bio-highlight banner + full post list.
- `/posts` shows the same list without the banner.
- Both use `getAllPosts()` from `src/lib/services/blog.ts`, which sorts by `date` descending.

## NEVER / INSTEAD

- **NEVER** use `metadata` as the frontmatter export key — the plugin exports under `frontmatter`.
- **NEVER** use `ref.current.innerHTML` inside an MDX-rendered component. Use `dangerouslySetInnerHTML` via state. Direct DOM writes break React hydration.
- **NEVER** import Mermaid at the top of a component file. It's ~2MB and browser-only. Dynamic `import('mermaid')` only.
- **INSTEAD** of adding a new MDX remark/rehype plugin, check if Shiki + frontmatter already cover it.
