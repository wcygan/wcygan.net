---
name: wcygan-net-design
description: >
  Design system and UI/UX conventions for wcygan.net — a TanStack Start + Tailwind v3
  personal blog with a minimal, readable, editorial aesthetic. Auto-loads when working in
  /Users/wcygan/Development/wcygan.net, editing src/styles/app.css, src/routes/__root.tsx,
  or any route/component/MDX post on that site. Use when styling pages, adding routes,
  writing MDX posts, touching the header/nav/footer chrome, or changing colors, type,
  spacing, or layout.
  Keywords: wcygan.net, wcygan blog, personal site design, minimal blog design, system
  fonts, primary green, link green, bio-highlight banner, post-list, blog-post, 800px
  container, MDX frontmatter, Mermaid diagram, Shiki, Tailwind v3, TanStack Start blog,
  __root chrome, design.md, app.css
---

# wcygan.net Design System

Minimal, text-first personal blog. The aesthetic is **editorial minimalism** with one committed green accent — no cards, no gradients, no drop shadows, no web fonts. System fonts, 800px column, generous vertical rhythm.

**Project root**: `/Users/wcygan/Development/wcygan.net`

## Prime directives

1. **The aesthetic is already chosen.** Do not introduce new directions (brutalist, glassmorphic, neon, etc.) without explicit request. This is a reader's blog.
2. **`src/styles/app.css` and `design.md` are the source of truth.** If a style is defined there, use it; don't reinvent.
3. **`src/routes/__root.tsx` owns all chrome** — header, nav, HTML shell. Child routes render inside `<Outlet />`. Never regenerate nav.
4. **This is Tailwind v3, not v4.** There's a `tailwind.config.ts`. CSS entry uses `@import 'tailwindcss/base'`. Do not apply v4 `@theme` / CSS-first patterns here.
5. **System fonts only.** Never add Google Fonts, Fontsource, or web-font CSS. Display = body = system stack.
6. **No component libraries.** No shadcn, Radix, Headless UI, or Motion. Plain React + Tailwind utility classes + the named component classes in `app.css`.

## The palette (memorize)

| Name | Value | Use |
|---|---|---|
| Primary green | `rgb(92, 139, 63)` / `#5c8b3f` | Post titles, bio banner bg, header border, H3 |
| Link green | `rgb(46, 104, 16)` / `#2e6810` | Body links (bold, no underline until hover) |
| Text | `rgb(0, 0, 0)` | Body, H1, H2, site title |
| Muted | `rgb(102, 102, 102)` / `#666` | Dates, H2 in post content, italic meta |
| Nav | `rgb(170, 170, 170)` / `#aaa` | Header nav links |
| Border | `rgb(222, 222, 222)` / `#dedede` | Tables, code blocks |
| Surface | `rgb(249, 249, 249)` / `#f9f9f9` | Code blocks, table headers |
| Bg | `#fff` | Page |

No other colors. No dark mode. No Tailwind color-scale classes in new work (`text-emerald-400`, `bg-zinc-700`) — legacy posts/components have them and are being drifted back to the palette over time.

## Type, layout, motion (one-liners)

- **Type**: system stack (`system, -apple-system, system-ui, 'Helvetica Neue', 'Lucida Grande', sans-serif`), body 18px / line-height 28px. Monospace: `'Courier New', monospace` at 16px.
- **Layout**: 800px max-width container (`.container`), 12px main-section padding, 30px vertical rhythm between block elements.
- **Motion**: none. Links change text-decoration on hover. That is the entire motion vocabulary.

## Before you touch anything

1. Read the relevant reference below.
2. Prefer existing named classes (`.bio-highlight`, `.post-list`, `.post-item`, `.site-header`, `.blog-post`, `.post-content`) over new Tailwind utilities.
3. If a new color, size, or spacing is truly needed, add it to `src/styles/app.css` — not inline — and update `design.md`.
4. Never touch the `$slug` route's `beforeLoad` dot-rejection logic (it protects `/rss.xml`, `/favicon.ico`, etc.).

## References

- [colors](references/colors.md) — exact values, where each is used, anti-patterns
- [typography](references/typography.md) — font stack, sizes, headings hierarchy, meta/date style
- [layout](references/layout.md) — 800px container, header, spacing, responsive rules
- [components](references/components.md) — header, bio-highlight, post-list, blog-post, post-content, MermaidDiagram, ExperienceCard drift
- [blog-mdx](references/blog-mdx.md) — MDX frontmatter shape, post location, RSS sync, Mermaid usage
- [routing-and-chrome](references/routing-and-chrome.md) — `__root.tsx` rules, `$slug` catch-all, loader serialization
- [accessibility](references/accessibility.md) — focus ring, semantic HTML, WCAG AA contrast

## Validation checklist

Before calling frontend work on wcygan.net done:

- [ ] No new hex colors outside the palette above (check `design.md` / `app.css`)
- [ ] No Google Font / `@import url(fonts.googleapis…)` / Fontsource added
- [ ] `__root.tsx` header/nav not duplicated in child routes
- [ ] New route renders inside `<Outlet />`, uses `createFileRoute`
- [ ] MDX posts have `title`, `date`, `description`, `tags` frontmatter
- [ ] Loaders return serializable data only (no React components from loaders)
- [ ] No `ref.current.innerHTML` — use `dangerouslySetInnerHTML` via state
- [ ] Mermaid imported dynamically (`import('mermaid')`), never top-level
- [ ] `bun run pre-commit` passes (format + typecheck)

## External canonical docs

- Project design spec: `/Users/wcygan/Development/wcygan.net/design.md`
- Global stylesheet: `/Users/wcygan/Development/wcygan.net/src/styles/app.css`
- Project CLAUDE.md: `/Users/wcygan/Development/wcygan.net/CLAUDE.md`
- TanStack Start: https://tanstack.com/start/latest/docs/framework/react/overview
- Tailwind v3 Typography plugin: https://tailwindcss.com/docs/typography-plugin

## Complements

- `claude-code-best-practices` — skill/hook authoring, always co-present
- `tanstack-start` — general framework reference (routing, loaders, server fns)
- `tailwind` — general Tailwind utility reference (but confirm v3 vs v4 before applying)
