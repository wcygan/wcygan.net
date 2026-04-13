---
name: cloudflare-static-deploy
description: Deploy wcygan.net as a pure static site to Cloudflare via Workers Assets. Use when configuring static prerendering, updating vite.config.ts Nitro preset, writing wrangler.jsonc, tuning Cloudflare Workers Builds dashboard settings, switching from pnpm to Bun in CI, or debugging failed Cloudflare deploys. Keywords cloudflare, wrangler, workers assets, pages, deploy, prerender, static, nitro preset, bun ci, workers builds, wrangler.jsonc, BUN_VERSION, .output/public
---

# Cloudflare Static Deploy

How wcygan.net ships: **prerender every route to flat HTML/JS/CSS, upload via Workers Assets, no server at runtime.** No `@cloudflare/vite-plugin`, no `wrangler` runtime coupling in app code.

## Why static, not SSR

The blog has zero per-request logic. Homepage, `/posts`, `/{slug}`, `/about`, `/resume`, `/feed`, `/mermaid-examples` are all content-static. Mermaid renders client-side. RSS is a committed `public/rss.xml`. Prerendering beats SSR on cost, latency, portability, and operational surface.

If we ever add auth, per-user data, or build-time bindings (KV/D1), revisit — see "When to switch to the Workers runtime" below.

## Required pieces

### 1. `vite.config.ts` — prerender + keep Nitro `bun` preset

```ts
tanstackStart({
  srcDirectory: 'src',
  prerender: {
    enabled: true,
    crawlLinks: true,
    autoSubfolderIndex: true,
    failOnError: true,
  },
}),
react(),
nitro({ preset: 'bun' }),
```

- **Do NOT use `preset: 'static'`**. Nitro's own prerenderer with that preset does not know about TanStack Start's route handlers and 404s on every path. TanStack Start runs its own prerender *against* the Nitro-built server via a preview server. Keeping `preset: 'bun'` gives it a server to probe, and the prerendered HTML lands in `.output/public/` alongside a server bundle in `.output/server/` that we simply don't ship.
- `crawlLinks` discovers posts via links from `/` and `/posts`. Every post must be reachable from a crawled page, otherwise add it to `prerender.pages: ['/slug-a', ...]`.
- `autoSubfolderIndex` emits `/posts/foo/index.html` (correct for Workers Assets routing) rather than `/posts/foo.html`.

Also tighten the Mermaid alias to a regex — a string alias gets re-applied by Nitro's SSR bundler and produces `mermaid/dist/.../dist/...` paths that fail to resolve:

```ts
resolve: {
  alias: [
    { find: '~', replacement: new URL('./src', import.meta.url).pathname },
    { find: /^mermaid$/, replacement: 'mermaid/dist/mermaid.esm.min.mjs' },
  ],
},
ssr: { external: ['mermaid'] },
```

### 2. `wrangler.jsonc` — assets-only Worker

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "wcygan-net",
  "compatibility_date": "2026-04-13",
  "assets": {
    "directory": ".output/public",
    "not_found_handling": "404-page"
  }
}
```

No `main`. No `nodejs_compat`. Wrangler is a deploy CLI only — not a runtime dependency. Keep the file minimal; every added field is a coupling point.

### 3. `package.json` scripts

```json
"build": "bun --bun vite build",
"deploy": "bun run build && npx wrangler deploy",
"preview-static": "bunx serve .output/public"
```

Delete any `start` script pointing at `.output/server/index.mjs` — that file no longer exists under the `static` preset.

### 4. Cloudflare Workers Builds dashboard

| Field | Value |
|---|---|
| Build command | `bun install && bun run build` |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Production branch | `main` |

**Environment variable**: `BUN_VERSION=1.2.23` (match local `bun --version`). Cloudflare's build image auto-installs Bun when this is set.

Enable **Build cache** to reuse `node_modules` across builds.

Commit only `bun.lock` — never both `bun.lock` and `pnpm-lock.yaml`/`package-lock.json` (ambiguous manager detection).

## Verification checklist after `bun run build`

- `.output/public/index.html` exists
- `.output/public/posts/index.html` exists
- `.output/public/<slug>/index.html` exists for every MDX post
- `.output/public/rss.xml` present (copied from `public/`)
- `.output/server/` exists (Nitro bun bundle — we just don't deploy it; `wrangler.jsonc` has no `main`, only `assets.directory`)
- Total `.output/public/` size sane (posts + mermaid client chunk)

## Catch-all route gotcha

`src/routes/$slug.tsx` rejects slugs containing dots in `beforeLoad`. Keep this. Static files (`rss.xml`, `favicon.ico`) live in `public/` and Workers Assets serves them before the catch-all is ever consulted. If you rename the guard logic, prerender will try to render `/rss.xml` as a post — don't.

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Cloudflare build fails with "pnpm not found" or lockfile mismatch | Dashboard still running `pnpm run build` from old SvelteKit config | Update Build command to `bun install && bun run build`, set `BUN_VERSION` |
| `wrangler deploy` errors "No compatible entrypoint" | `wrangler.jsonc` has `main` but no server bundle built | Remove `main` — assets-only deploys omit it |
| Post route returns 404 in prod but works locally | Prerender crawler didn't discover it | Add to `prerender.pages` explicitly or ensure it's linked from `/posts` |
| `/rss.xml` returns HTML 404 page | Catch-all matched before static file | Confirm `$slug.tsx` `beforeLoad` still rejects dotted slugs |
| Mermaid chunk huge in client bundle | Top-level `import 'mermaid'` reintroduced | Restore dynamic `import('mermaid')` in `MermaidDiagram.tsx` |
| Build succeeds locally, fails on Cloudflare | Bun-specific API in build-time code (Nitro runs build-time code in the CI Bun runtime which matches — usually it's a Node API missing from the `static` preset's minimal shim) | Check build log for module resolution errors; avoid `node:fs` in config/plugins |

## When to switch to the Workers runtime

Only if ALL of these become true:
- Need to read request context (cookies, auth) server-side
- Need Cloudflare bindings (KV, D1, R2, Queues, DO)
- Need ISR / on-demand revalidation

Then: install `@cloudflare/vite-plugin` + `wrangler`, replace Nitro with the Cloudflare plugin, add `main: "@tanstack/react-start/server-entry"` and `compatibility_flags: ["nodejs_compat"]` to `wrangler.jsonc`. See the Cloudflare TanStack Start framework guide (link below).

## Reference docs

Primary:
- [TanStack Start — Static Prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) — `prerender` config shape; crawler behavior
- [Nitro — Deployment presets](https://nitro.build/deploy) — `static` preset and output layout
- [Cloudflare Workers — Static Assets](https://developers.cloudflare.com/workers/static-assets/) — `assets` binding in `wrangler.jsonc`, `not_found_handling` modes
- [Cloudflare Workers Builds — Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) — dashboard fields, env vars, `BUN_VERSION`

Secondary / "if we migrate to Workers runtime":
- [Cloudflare — TanStack Start framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) — the SSR-on-Workers path
- [Cloudflare — Wrangler vs Vite plugin](https://developers.cloudflare.com/workers/development-testing/wrangler-vs-vite/) — when each is appropriate
- [Cloudflare Changelog (Dec 19, 2025) — TanStack Start prerendering](https://developers.cloudflare.com/changelog/post/2025-12-19-tanstack-start-prerendering/) — prerender combined with bindings
- [TanStack Start — Incremental Static Regeneration](https://tanstack.com/start/latest/docs/framework/react/guide/isr) — if we outgrow pure static

Adjacent project skills:
- `wcygan-net-stack` — stack fundamentals (Bun, TanStack Start, MDX, Mermaid)
- `github-actions-troubleshooter` — CI failures that aren't Cloudflare-specific
