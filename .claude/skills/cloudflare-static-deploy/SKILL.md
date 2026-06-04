---
name: cloudflare-static-deploy
description: Deploy wcygan.net as a pure static site to Cloudflare via Workers Assets. Use when configuring static prerendering, updating vite.config.ts Nitro preset, writing wrangler.jsonc, tuning Cloudflare Workers Builds dashboard settings, switching CI or deploys to Deno, or debugging failed Cloudflare deploys. Keywords cloudflare, wrangler, workers assets, pages, deploy, prerender, static, nitro preset, deno ci, workers builds, wrangler.jsonc, deno.lock, .output/public
---

# Cloudflare Static Deploy

How wcygan.net ships: **prerender every route to flat HTML/JS/CSS, upload via Workers Assets, no server at runtime.** No `@cloudflare/vite-plugin`, no `wrangler` runtime coupling in app code.

## Why static, not SSR

The blog has zero per-request logic. Homepage, `/posts`, `/{slug}`, `/about`, `/resume`, `/feed`, `/mermaid-examples` are all content-static. Mermaid diagrams are rendered to static SVG at build time, so they ship as plain images with no client-side JavaScript. RSS is a committed `public/rss.xml`. Prerendering beats SSR on cost, latency, portability, and operational surface.

If we ever add auth, per-user data, or build-time bindings (KV/D1), revisit — see "When to switch to the Workers runtime" below.

## Required pieces

### 1. `vite.config.ts` — prerender + keep Nitro `deno-server` preset

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
nitro({ preset: 'deno-server' }),
```

- **Do NOT use `preset: 'static'`**. Nitro's own prerenderer with that preset does not know about TanStack Start's route handlers and 404s on every path. TanStack Start runs its own prerender _against_ the Nitro-built server via a preview server. Keeping `preset: 'deno-server'` gives it a Deno-compatible server to probe, and the prerendered HTML lands in `.output/public/` alongside a server bundle in `.output/server/` that we simply don't ship.
- `crawlLinks` discovers posts via links from `/` and `/posts`. Every post must be reachable from a crawled page, otherwise add it to `prerender.pages: ['/slug-a', ...]`.
- `autoSubfolderIndex` emits `/posts/foo/index.html` (correct for Workers Assets routing) rather than `/posts/foo.html`.

Mermaid is build-time only now (the render script serves it to a headless Chrome; it never enters the client or server bundle), but the alias and `ssr.external` entry still guard any stray import. Keep the Mermaid alias as a regex — a string alias gets re-applied by Nitro's SSR bundler and produces `mermaid/dist/.../dist/...` paths that fail to resolve:

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
    "not_found_handling": "404-page",
  },
}
```

No `main`. No `nodejs_compat`. Wrangler is a deploy CLI only — not a runtime dependency. Keep the file minimal; every added field is a coupling point.

### 3. `deno.json` tasks

```json
"build": "vite build",
"deploy": "deno task build && wrangler deploy",
"preview-static": "deno run --allow-net --allow-read --allow-sys jsr:@std/http@1/file-server .output/public"
```

Delete any `start` script pointing at `.output/server/index.mjs` — that file no longer exists under the `static` preset.

### 4. Cloudflare Workers Builds dashboard

The Workers Builds image as of 2026-05 ships **Bun and Node, but not Deno**, so we install Deno inline. CF auto-runs `bun install` first (because `package.json` exists); that's fine — the build command then layers Deno on top for the actual build.

| Field                            | Value                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build command                    | `curl -fsSL https://deno.land/install.sh \| sh -s -- -y v2.6.10 && export PATH="$HOME/.deno/bin:$PATH" && deno install --frozen && deno task build` |
| Deploy command                   | `export PATH="$HOME/.deno/bin:$PATH" && deno x wrangler deploy`                                                                                     |
| Non-production branch deploy cmd | `export PATH="$HOME/.deno/bin:$PATH" && deno x wrangler versions upload`                                                                            |
| Path                             | `/`                                                                                                                                                 |
| Production branch                | `main`                                                                                                                                              |

Three non-obvious requirements baked into those commands:

1. **Pin the Deno version** (`v2.6.10` as the `sh -s` positional arg — see install script source). The unpinned `curl | sh` form grabs the latest release, and newer Deno tightens `node:_http_server.writeHead` argument validation, which breaks `srvx@0.11.15` during TanStack Start's prerender step. Bump the pin only after locally rebuilding on a newer Deno and confirming `.output/public/*.html` still emits.
2. **Each command exports `$HOME/.deno/bin` to PATH** independently. The build command's `export` doesn't persist — deploy commands run in a fresh shell. Without the re-export you get `/bin/sh: 1: deno: not found`.
3. **`deno x wrangler ...` replaces `bunx` and `deno task --eval`.** `deno x` is the npx/bunx equivalent (since Deno 2). It resolves `wrangler` from `node_modules` populated by `deno install --frozen`. No Bun on the deploy path.

Enable **Build cache** to reuse `node_modules` across builds.

Commit only `deno.lock` — never `bun.lock`, `pnpm-lock.yaml`, or `package-lock.json` alongside it.

## Verification checklist after `deno task build`

- `.output/public/index.html` exists **and is non-empty** (silent prerender failure can leave the dir asset-only)
- `.output/public/posts/index.html` exists
- `.output/public/<slug>/index.html` exists for every MDX post
- `.output/public/rss.xml` present (copied from `public/`)
- `.output/server/` exists (Nitro Deno bundle — we just don't deploy it; `wrangler.jsonc` has no `main`, only `assets.directory`)
- Total `.output/public/` size sane (posts + mermaid client chunk)
- Build log contains `[prerender] Prerendered N pages:` with the expected route list, not `Prerendered 0 pages:`

## `scripts/build.mjs` must fail loudly

TanStack Start's prerender step rejects with an `unhandledRejection` rather than throwing, so a naïve `try/catch + process.exit(0)` builder script reports success even when zero HTML emitted. Guard against this at the top of `scripts/build.mjs`:

```js
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection during build:", err);
  process.exit(1);
});
```

Without this, a broken prerender produces a deploy that uploads only `/assets/*.js` and yields a 404 on every route — the failure mode behind the May 2026 outage.

## Catch-all route gotcha

`src/routes/$slug.tsx` rejects slugs containing dots in `beforeLoad`. Keep this. Static files (`rss.xml`, `favicon.ico`) live in `public/` and Workers Assets serves them before the catch-all is ever consulted. If you rename the guard logic, prerender will try to render `/rss.xml` as a post — don't.

## Common failure modes

| Symptom                                                                                                 | Cause                                                                                                                                                                                   | Fix                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare build fails with "pnpm not found", "bun not found", or lockfile mismatch                     | Dashboard still running an old package-manager command                                                                                                                                  | Replace Build command with the pinned-Deno form from the dashboard table above                                                                                         |
| `wrangler deploy` errors "No compatible entrypoint"                                                     | `wrangler.jsonc` has `main` but no server bundle built                                                                                                                                  | Remove `main` — assets-only deploys omit it                                                                                                                            |
| Post route returns 404 in prod but works locally                                                        | Prerender crawler didn't discover it                                                                                                                                                    | Add to `prerender.pages` explicitly or ensure it's linked from `/posts`                                                                                                |
| `/rss.xml` returns HTML 404 page                                                                        | Catch-all matched before static file                                                                                                                                                    | Confirm `$slug.tsx` `beforeLoad` still rejects dotted slugs                                                                                                            |
| Mermaid chunk appears in client bundle                                                                  | A source file imported `mermaid` directly; it must stay build-time only (`scripts/render-diagrams.mjs`)                                                                                 | Remove the import. Posts embed prebuilt SVGs from `public/`; no client mermaid chunk should ever exist                                                                 |
| Build succeeds locally, fails on Cloudflare                                                             | Build image Deno/Wrangler mismatch or a missing lifecycle script approval                                                                                                               | Check build log for Deno version, `deno install` warnings, and module resolution errors                                                                                |
| Prod 404 on every route; build reported "Success"; deploy uploaded only `/assets/*.js`                  | Prerender crashed with `TypeError [ERR_INVALID_ARG_TYPE]: "headers" argument must be an Array` from `srvx/dist/adapters/node.mjs writeHead`. CF's unpinned Deno is stricter than local. | Pin Deno version in the build command (`sh -s -- -y vX.Y.Z`). Add the `unhandledRejection` guard above so future regressions fail the build instead of shipping empty. |
| `/bin/sh: 1: deno: not found` during deploy command                                                     | Build command's `export PATH` doesn't survive into the fresh deploy shell                                                                                                               | Prepend `export PATH="$HOME/.deno/bin:$PATH" && ` to every deploy/version command                                                                                      |
| Transient `error reading a body from connection` on a single npm tarball during `deno install --frozen` | npm CDN flake in CF build sandbox                                                                                                                                                       | Hit "Retry deployment" in dashboard. If recurrent, wrap with `for i in 1 2 3; do deno install --frozen && break; sleep 3; done`                                        |

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
- [Cloudflare Workers Builds — Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) — dashboard build and deploy fields

Secondary / "if we migrate to Workers runtime":

- [Cloudflare — TanStack Start framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) — the SSR-on-Workers path
- [Cloudflare — Wrangler vs Vite plugin](https://developers.cloudflare.com/workers/development-testing/wrangler-vs-vite/) — when each is appropriate
- [Cloudflare Changelog (Dec 19, 2025) — TanStack Start prerendering](https://developers.cloudflare.com/changelog/post/2025-12-19-tanstack-start-prerendering/) — prerender combined with bindings
- [TanStack Start — Incremental Static Regeneration](https://tanstack.com/start/latest/docs/framework/react/guide/isr) — if we outgrow pure static

Adjacent project skills:

- `wcygan-net-stack` — stack fundamentals (Deno, TanStack Start, MDX, Mermaid)
- `github-actions-troubleshooter` — CI failures that aren't Cloudflare-specific
