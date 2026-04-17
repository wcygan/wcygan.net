# wcygan.net — auto-generated site metadata

How `robots.txt`, `sitemap.xml`, and `rss.xml` are produced at build time with zero ongoing maintenance. Add a route or a post and the outputs update automatically on the next `bun run build`.

## File layout

```
src/lib/sitemap/
  generators.ts              # Pure builders — frontmatter parser, robots/sitemap/rss
  generators.test.ts         # 15 unit tests (vitest)
scripts/
  site-metadata-plugin.ts    # Vite plugin — runs closeBundle, writes files into .output/public/
vite.config.ts               # Registers plugin after nitro so it runs last
```

## The data flow

```
src/posts/*.mdx                ┐
  (frontmatter: title, date,   │
   description, tags)          │
                               ├─► Vite plugin ─► .output/public/robots.txt
src/routes/*.tsx               │   (closeBundle)   .output/public/sitemap.xml
  (filename → static path)     │                   .output/public/rss.xml
                               ┘
```

The plugin runs **after** Nitro's prerender writes HTML into `.output/public/`, which is why it's registered last in `vite.config.ts`.

## What's auto-derived vs. hand-edited

| Artifact                                                | Source                                                                 | Change by...                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| Sitemap static URLs                                     | `src/routes/*.tsx` filenames (dropping `$`-prefixed and `__`-prefixed) | Add / remove a route file                   |
| Sitemap post URLs + `<lastmod>`                         | `src/posts/*.mdx` frontmatter (`date`)                                 | Add / edit a post                           |
| RSS items (title, description, `pubDate`, `<category>`) | MDX frontmatter                                                        | Add / edit a post                           |
| robots.txt structure                                    | Hardcoded in `generateRobotsTxt()`                                     | Edit `generators.ts` only if policy changes |
| Content-Signal line                                     | Hardcoded: `search=yes, ai-train=yes, ai-input=yes`                    | Edit `generators.ts` if AI-posture changes  |
| `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`            | Top of `generators.ts`                                                 | Rare — only on rebrand                      |

## Dedupe note (why `written` flag exists)

TanStack Start triggers `closeBundle` three times (client / SSR / server sub-builds). The outputs would be identical each time, so the plugin writes on the first call that finds `.output/public` and short-circuits the rest:

```ts
// scripts/site-metadata-plugin.ts:53
let written = false;
```

## Timezone gotcha (why `parseDateAsUtc` exists)

`new Date("November 1, 2025")` returns local midnight. On an EST machine that becomes `2025-11-01T05:00:00Z`, which shifts RFC-822 `pubDate` strings and changes the `<lastmod>` on some edge dates. Fix:

```ts
// src/lib/sitemap/generators.ts:28-41
function parseDateAsUtc(input: string): Date | null {
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  );
}
```

Both ISO (`2025-11-01`) and human (`November 1, 2025`) formats end up at UTC midnight of the intended wall-clock date. The unit tests assert `<pubDate>Sat, 01 Nov 2025 00:00:00 GMT</pubDate>` regardless of host TZ.

## Static-asset routing (why the plugin's outputs survive the SPA)

The `$slug` route is a catch-all. Files like `/robots.txt` and `/sitemap.xml` would normally be swallowed by it. The dot-guard at `src/lib/routing/static-asset-guard.ts` rejects any slug containing `.`, so the request falls through to Cloudflare's static-asset handler and serves the file verbatim:

```ts
export function isStaticAssetSlug(slug: string): boolean {
  return slug.includes(".");
}
```

Do not delete this guard. The unit test next to it pins the behavior.

## Adding a new auto-generated file

1. Add a pure builder to `src/lib/sitemap/generators.ts`.
2. Add tests to `generators.test.ts` — reject regressions, not just happy paths.
3. Call the builder from `scripts/site-metadata-plugin.ts` inside the existing `closeBundle` handler.
4. Run `bun run build` — confirm the log line (`[site-metadata] wrote ...`) names your new file.
5. Verify the output at `.output/public/<yourfile>` and probe with `bunx serve .output/public` before deploy.

Do not introduce a new Vite plugin — extend the existing one.

## Adding a check from `references/checks.md`

Before adding any well-known endpoint:

1. Cross-check [applicability-matrix.md](./applicability-matrix.md) — does it apply to a personal blog?
2. If not, stop. isitagentready.com scoring a 404 is not a defect.
3. If yes, follow the "new auto-generated file" steps above. For JSON-body endpoints (MCP card, Agent Skills index) use a `.json` extension so the dot-guard still keeps them out of `$slug`.

## Verifying the pipeline end-to-end

The pattern was validated by adding a dummy route + post, rebuilding, confirming both appeared in `sitemap.xml` and the post appeared in `rss.xml`, then deleting both files and confirming the outputs returned to baseline. No manual edit of the generated files was ever needed. See the conversation that produced this skill for the exact probe commands.
