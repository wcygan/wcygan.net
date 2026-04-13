# TanStack Start Framework

## Overview

wcygan.net is a full-stack React app using TanStack Start (v1.167+) with TanStack Router for file-based routing and SSR via Nitro.

## File-Based Routing

Routes live in `src/routes/`. TanStack Router auto-generates `src/routeTree.gen.ts` (gitignored).

| File | Route | Purpose |
|------|-------|---------|
| `__root.tsx` | Layout wrapper | HTML shell, header, nav, `<Outlet />` |
| `index.tsx` | `/` | Homepage with bio + post list |
| `posts.tsx` | `/posts` | All blog posts listing |
| `$slug.tsx` | `/{slug}` | Dynamic blog post (MDX) |
| `about.tsx` | `/about` | About page with experience cards |
| `resume.tsx` | `/resume` | Resume page |
| `mermaid-examples.tsx` | `/mermaid-examples` | Mermaid diagram showcase |
| `feed.tsx` | `/feed` | RSS feed |

## Route Anatomy

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/my-route')({
  // Runs before the loader — use for guards/validation
  beforeLoad: ({ params }) => { /* ... */ },

  // Returns SERIALIZABLE data only — no components, functions, or classes
  loader: ({ params }) => {
    return { title: 'Hello' }  // must be JSON-serializable
  },

  // SEO head tags
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData.title }],
  }),

  // React component
  component: MyPage,
})

function MyPage() {
  const data = Route.useLoaderData()
  return <div>{data.title}</div>
}
```

## Root Layout Pattern

The `__root.tsx` provides the HTML document shell:

```tsx
import { Outlet, HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({ meta: [...], links: [...] }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {/* Site chrome */}
        <Outlet />  {/* Page content renders here */}
        <Scripts />
      </body>
    </html>
  )
}
```

## Navigation

Use `<Link>` for internal routes (enables client-side navigation):

```tsx
import { Link } from '@tanstack/react-router'

// Static route
<Link to="/about">About</Link>

// Dynamic route with params
<Link to="/$slug" params={{ slug: post.slug }}>{post.title}</Link>
```

Use plain `<a>` for external links and static assets (`/will_cygan_resume.pdf`).

## Router Configuration

`src/router.tsx` exports `getRouter()` (name matters — the generated route tree references it):

```tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}
```

## SSR Hydration Rules

**CRITICAL**: Loader data crosses the SSR→client serialization boundary.

- Return only JSON-serializable values (strings, numbers, arrays, plain objects)
- NEVER return React components, functions, Dates, Maps, Sets, or class instances
- Load non-serializable things (MDX components) client-side via `useEffect`

```tsx
// WRONG — crashes hydration
loader: async ({ params }) => {
  const post = await import(`../posts/${params.slug}.mdx`)
  return { content: post.default }  // React component is not serializable!
}

// CORRECT — return metadata, load component client-side
loader: ({ params }) => {
  const post = getPostBySlug(params.slug)
  return { meta: { title: post.title }, slug: params.slug }
}
```

## The $slug Catch-All Problem

`$slug.tsx` matches ALL single-segment paths including `/rss.xml`, `/favicon.ico`. The `beforeLoad` guard rejects slugs with dots:

```tsx
beforeLoad: ({ params }) => {
  if (params.slug.includes('.')) throw notFound()
},
```

If you need a new static-file route (e.g., `/sitemap.xml`), put the file in `public/` — but the `$slug` guard is what lets it through.

## Key Files

- `src/router.tsx` — Router factory (must export `getRouter`)
- `src/routeTree.gen.ts` — Auto-generated, gitignored
- `src/routes/__root.tsx` — HTML document shell + site layout
- `src/routes/$slug.tsx` — Dynamic MDX blog post route
- `vite.config.ts` — `tanstackStart({ srcDirectory: 'src' })`
