# Routing & Chrome

File-based routing via TanStack Router. Chrome lives in `__root.tsx`. Content lives in child routes.

## Route map

```
src/routes/
  __root.tsx              → HTML shell, <head>, header, nav, <Outlet />
  index.tsx               → /                  (homepage: bio + post list)
  posts.tsx               → /posts             (post list only)
  $slug.tsx               → /{anything}        (blog post, dot-rejected)
  about.tsx               → /about             (bio + experiences)
  resume.tsx              → /resume            (links to /will_cygan_resume.pdf)
  mermaid-examples.tsx    → /mermaid-examples  (diagram showcase)
  feed.tsx                → /feed              (RSS XML)
```

## `__root.tsx` rules

1. **Single source of truth for chrome.** Header, nav, HTML `<head>`, global CSS import, font loading (currently none), favicon all live here.
2. **Do not duplicate** any of the above in child routes.
3. **CSS import is direct**, not `?url`: `import '~/styles/app.css'`. This is TanStack Start + Vite v3/v4 pattern for this project. Do not "fix" it to a `?url` pattern unless upgrading to a specific Vite config that requires it.
4. Links in nav: `<Link to="/">` for internal, `<a href="...">` for external + `mailto:` + PDF asset.

## `createFileRoute` pattern

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  // Optional:
  loader: () => ({ data }),   // Must return serializable JSON
  beforeLoad: () => { ... },  // Can throw redirect / 404
})
```

## The `$slug` catch-all

```tsx
// src/routes/$slug.tsx
export const Route = createFileRoute('/$slug')({
  beforeLoad: ({ params }) => {
    if (params.slug.includes('.')) {
      throw notFound()   // Let public/ assets pass through
    }
  },
  loader: ({ params }) => ({ slug: params.slug }),  // serializable only
  component: PostPage,
})
```

- The dot-check is **load-bearing**. Without it, `/rss.xml`, `/favicon.ico`, `/will_cygan_resume.pdf` get caught by `$slug` and 404 (or worse, prerender as "posts").
- Historically we had a bug where the prerenderer corrupted the resume PDF because `$slug` matched `.pdf`. Don't regress it.

## Loader serialization

TanStack Router serializes loader return values to JSON for SSR hydration. Rules:

- **OK**: strings, numbers, booleans, arrays, plain objects, Dates (become strings), nested primitives.
- **NOT OK**: React components, functions, class instances, promises, Maps/Sets.
- **Pattern for MDX**: loader returns `{ slug }`, component calls `useEffect(() => { loadMdx(slug) }, [slug])` to fetch the MDX component client-side.

## Adding a new route

1. Create `src/routes/my-page.tsx`.
2. Export `Route = createFileRoute('/my-page')({ component: MyPage })`.
3. Render inside the existing `__root.tsx` chrome — do **not** include `<html>`, `<head>`, `<header>`, or `<nav>` in the new route. Those are global.
4. If you need route-specific `<title>` or meta, use `head: () => ({ meta: [...] })` in the route config — it merges with root.

## Scripts prerendering

The project prerenders routes to static output served via Cloudflare Workers Assets. Commits like "fix: stop prerenderer from corrupting resume PDF" are evidence of past edge cases. When adding a new route, verify `bun run build` completes without corrupting public assets.
