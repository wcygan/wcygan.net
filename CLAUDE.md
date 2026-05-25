# CLAUDE.md

Modern UI/UX Engineering guide for wcygan.net — a TanStack Start blog with clean, accessible design.

## Essential Commands

```bash
# Development
just dev              # Dev server at https://wcygan.localhost (portless-wrapped, opens browser)
just dev-vite         # Bare Vite on :3000 (CI / no-portless fallback)
deno task dev         # Portless-wrapped Vite without the browser-open
deno task build       # Build for production (Nitro + Deno)
deno task preview     # Preview production build

# Quality & Testing
deno task pre-commit  # Format + typecheck + tests (run before commits)
deno task test        # Run Vitest unit tests
```

### Local dev URL: `https://wcygan.localhost`

`just dev` runs Vite under [portless](https://github.com/vercel-labs/portless), which gives a stable HTTPS URL backed by a local CA. Configured via `portless.json` (`{ "name": "wcygan" }`); the justfile also `open`s the URL after a 2s delay.

- **First run on a new machine** prompts for sudo to trust the local CA and bind :443.
- **Vite must bind IPv4** so portless's proxy (which dials `127.0.0.1`) can reach it. `vite.config.ts` reads `host`/`port` from env (`HOST`, `PORT`) — portless sets both. Don't hardcode `host: 'localhost'` (resolves to IPv6-only `::1` on macOS, causes 502s).
- **Stale routes** after a crash: `deno task --eval "portless prune"` (clears dead PIDs); `deno task --eval "portless list"` (inspect table).
- **CI / no-portless**: use `just dev-vite` or run `deno task dev-vite` directly.

### Verifying frontend changes

For UI work, use [agent-browser](https://github.com/vercel-labs/agent-browser) against the running dev server — type-checks and unit tests don't catch hydration mismatches, broken loaders, or layout regressions.

```bash
agent-browser open https://wcygan.localhost/
agent-browser get title
agent-browser get text "h1"
agent-browser screenshot /tmp/page.png
```

The `agent-browser` skill auto-loads on browser-automation requests; prefer it over generic web tools.

## Technology Stack

- **TanStack Start** with TanStack Router for full-stack React SSR
- **Deno** runtime and package manager
- **React 19** with hooks for state management
- **Tailwind CSS 3** with Typography plugin for consistent styling
- **MDX** via `@mdx-js/rollup` for Markdown blog posts with React component imports
- **Shiki** (`@shikijs/rehype`) for build-time syntax highlighting (custom Idle Toes theme)
- **Mermaid.js** for interactive diagrams (client-side rendered, sessionStorage cached)
- **TypeScript** with strict mode for type safety
- **Nitro** with `deno-server` preset for prerendering

A project-local skill (`wcygan-net-stack`) documents Deno, TanStack Start, MDX, and Mermaid patterns in detail under `.claude/skills/wcygan-net-stack/references/`.

## Project Structure

```
src/
  routes/              # TanStack Router file-based routes
    __root.tsx         # Root layout (HTML shell, header, nav, CSS)
    index.tsx          # Homepage (bio + post list)
    posts.tsx          # /posts listing
    $slug.tsx          # /{slug} dynamic blog post route
    about.tsx          # /about page with experience cards
    resume.tsx         # /resume page
    mermaid-examples.tsx  # Mermaid diagram showcase
    feed.tsx           # /feed RSS page
  components/          # React components
    MermaidDiagram.tsx # Mermaid renderer (lazy load, cache, fullscreen)
    MermaidFullscreen.tsx
    ExperienceCard.tsx
    PostCard.tsx
  lib/
    types.ts           # TypeScript interfaces (Post, PostMetadata, Experience)
    services/blog.ts   # Blog post loading via import.meta.glob
    utils/readingTime.ts
    utils/mermaid-cache.ts  # SessionStorage diagram caching
    data/experiences.ts
  posts/               # MDX blog content (.mdx with YAML frontmatter)
  styles/app.css       # Global design system CSS (576 lines)
  router.tsx           # Router factory (must export getRouter)
public/                # Static assets (images, resume PDF, rss.xml)
```

## Critical Gotchas

1. **Loaders must return serializable data only.** Never return React components from TanStack Router loaders — they get JSON-serialized for SSR hydration. Load MDX components client-side via `useEffect`.

2. **Never use `ref.current.innerHTML` in React components.** Use `dangerouslySetInnerHTML` via state. Direct DOM mutation breaks React's reconciler during hydration.

3. **The `$slug` route is a catch-all.** It rejects slugs with dots in `beforeLoad` so static files (like `rss.xml`) can be served from `public/`.

4. **Mermaid must be dynamically imported** — it's browser-only and ~2MB. Use `import('mermaid')` at runtime.

5. **MDX frontmatter uses `frontmatter`** (not `metadata`). The `remark-mdx-frontmatter` plugin exports under that key.

## DESIGN.md

Goal: Keep the rendered site and `design.md` aligned around a readable software-blog typography system.

Success means:

- Body and long-form prose use `Atkinson Hyperlegible` with `system-ui` fallbacks.
- Headings, navigation, metadata, buttons, and compact UI labels use `Inter` with `system-ui` fallbacks.
- Code samples, terminals, inline code, and ASCII animation blocks use the existing `Lilex` mono stack.

Stop when `src/styles/app.css`, `tailwind.config.ts`, `design.md`, and browser-computed styles agree on those three roles.

### Design System

**Color Palette** (Light theme):

- Primary blue: `rgb(70, 110, 170)` — titles, banners, accents
- Link blue: `rgb(30, 70, 140)` — interactive links
- Text primary: `rgb(0, 0, 0)` — body text
- Text secondary: `rgb(102, 102, 102)` — dates, metadata

**Typography**: Atkinson Hyperlegible for body/prose, Inter for headings/UI, Lilex for code/ASCII

**Code block palette**: Idle Toes from Cmux Themes. Keep this palette encoded in both `src/lib/syntax/idle-toes-theme.ts` and `src/styles/app.css`:

- Foreground `#ffffff`, background `#323232`, cursor `#d6d6d6`
- ANSI 0-7: black `#323232`, red `#d25252`, green `#7fe173`, yellow `#ffc66d`, blue `#4099ff`, magenta `#f680ff`, cyan `#bed6ff`, white `#eeeeec`
- ANSI 8-15: bright black `#606060`, bright red `#f07070`, bright green `#9dff91`, bright yellow `#ffe48b`, bright blue `#5eb7f7`, bright magenta `#ff9dff`, bright cyan `#dcf4ff`, bright white `#ffffff`

**Layout**: 800px max-width container, 8pt grid system

**Accessibility**: WCAG AA contrast, semantic HTML, visible focus rings, ARIA labels

**Code and ASCII blocks**:

- MDX code fences are Shiki-rendered with the custom Idle Toes theme from `src/lib/syntax/idle-toes-theme.ts`.
- Keep code block chrome dark: background `#323232`, `Lilex` mono, line numbers, and a continuous vertical separator between line numbers and code.
- Use one consistent border style on all sides of code blocks unless a specific visual design calls for mixed borders.
- Keep the global `pre:not(.shiki)` fallback in mind for blog snippets and non-blog `pre` blocks. ASCII animation components such as `RotatingPenguin` and `RotatingHotdog` reset inherited `pre` chrome (`border`, `padding`, `background`, and margins`) when they own their own presentation.
- For code block or ASCII art styling changes, verify both a rendered blog post and the homepage in the browser. Computed styles are useful for regressions: Shiki blocks should report a single border style, while homepage ASCII art should report no border.

## Blog System

- Posts are `.mdx` files in `src/posts/` with YAML frontmatter (`title`, `date`, `description`, `tags`)
- MDX supports importing React components (e.g., MermaidDiagram)
- Blog service uses `import.meta.glob('/src/posts/*.mdx', { eager: true })`
- Clean URLs: `/{slug}` (no `/blog` prefix)
- RSS available at `/feed` route and `/rss.xml` static file

## IndieWeb

The site is wired into the [IndieWeb](https://indieweb.org/):

- **Representative h-card** lives on the homepage bio block in `src/routes/index.tsx` — carries `p-name`, `u-photo`, `u-url`, `p-note`. Do not move it back to `<header>` in `__root.tsx`: that location has no `u-url` and no note content, so parsers (and the webring directory) ignore it.
- **h-entry** wraps every blog post `<article>` in `src/routes/$slug.tsx` with `p-name` (title), `dt-published` (date), `e-content` (body). Author is implied via the homepage representative h-card — no per-post byline needed.
- **`rel="me"`** is set on the GitHub and LinkedIn anchors in `__root.tsx` and the LinkedIn link in `index.tsx`. Both external profiles must list `https://wcygan.net` for the bidirectional chain (and IndieAuth) to verify.
- **Webmention discovery** — `<link rel="webmention">` and `<link rel="pingback">` in `__root.tsx` head point at [webmention.io](https://webmention.io/) (`https://webmention.io/wcygan.net/…`). Received mentions land in the webmention.io dashboard.
- **IndieWeb Webring** — the `.site-footer` in `__root.tsx` carries the prev/index/next widget for [An IndieWeb Webring](https://xn--sr8hvo.ws/). The prev/next links use the Referer header to resolve the current member; no domain-specific URL needed.

Social URLs are centralized in `src/lib/socials.ts`. Validate markup with [indiewebify.me](https://indiewebify.me/).

## Adding Blog Posts

1. Create `src/posts/my-post.mdx` with frontmatter (`title`, `date`, `description`, `tags`)
2. Posts automatically appear on homepage and `/posts`
3. `robots.txt`, `sitemap.xml`, and `rss.xml` regenerate on every `deno task build` via `scripts/site-metadata-plugin.ts` — no manual edits

## Mermaid Diagrams in MDX

```mdx
import { MermaidDiagram } from "~/components/MermaidDiagram";

<MermaidDiagram
  height={400}
  diagram={`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Try Again]`}
/>
```

## Key Configuration

- `vite.config.ts` — Vite + TanStack Start + MDX + Shiki + Nitro plugins
- `tailwind.config.ts` — Tailwind design system with Typography plugin
- `tsconfig.json` — TypeScript with `~/*` path alias to `src/*`
- `src/styles/app.css` — Global styles and design tokens
- `design.md` — Complete design system specification
