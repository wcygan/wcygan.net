# CLAUDE.md

guide for wcygan.net — a TanStack Start blog with clean, accessible design.

## Essential Commands

```bash
# Development
just dev              # Dev server at https://wcygan.localhost (portless-wrapped, opens browser)

# Quality & Testing
deno task pre-commit  # Format + typecheck + tests (run before commits)
deno task test        # Run Vitest unit tests
```

### Local dev URL: `https://wcygan.localhost`

`just dev` runs Vite under [portless](https://github.com/vercel-labs/portless),
which gives a stable HTTPS URL backed by a local CA. The dev task first runs
`scripts/ensure-portless-443.sh`, which keeps the proxy on privileged port 443
and repairs root-owned Portless state after sudo startup. Configured via
`portless.json` (`{ "name": "wcygan" }`); the justfile also `open`s the URL
after a 2s delay.

## Technology Stack

- **TanStack Start** with TanStack Router for full-stack React SSR
- **Deno** runtime and package manager
- **React 19** with hooks for state management
- **Tailwind CSS 3** with Typography plugin for consistent styling
- **MDX** via `@mdx-js/rollup` for Markdown blog posts with React component
  imports
- **Shiki** (`@shikijs/rehype`) for build-time syntax highlighting (custom Idle
  Toes theme)
- **Mermaid.js** for diagrams, compiled to static SVG at build time
  (`deno task render:diagrams`); no client-side rendering
- **TypeScript** with strict mode for type safety
- **Nitro** with `deno-server` preset for prerendering

## Interactive Graphics Demos

It's encouraged to embed interactive graphics with the
`interactive-graphics-demos` Codex skill.

## Mobile Support

Assume most readers will view the site from a phone. Treat mobile styling as a
first-class acceptance criterion for pages, posts, and demos: text must stay
readable, controls must remain usable, and layouts must avoid horizontal
overflow at common phone widths. When a change affects rendered UI, verify the
real page in a mobile viewport as well as desktop before calling it done.

## DESIGN.md

Goal: Keep the rendered site and `design.md` aligned around a readable
software-blog typography system.

Success means:

- Body and long-form prose use `Atkinson Hyperlegible` with `system-ui`
  fallbacks.
- Headings, navigation, metadata, buttons, and compact UI labels use `Inter`
  with `system-ui` fallbacks.
- Code samples, terminals, inline code, and ASCII animation blocks use the
  existing `Lilex` mono stack.

Stop when `src/styles/app.css`, `tailwind.config.ts`, `design.md`, and
browser-computed styles agree on those three roles.

### Design System

**Color Palette** (Light theme):

- Primary blue: `rgb(70, 110, 170)` — titles, banners, accents
- Link blue: `rgb(30, 70, 140)` — interactive links
- Text primary: `rgb(0, 0, 0)` — body text
- Text secondary: `rgb(102, 102, 102)` — dates, metadata

**Typography**: Atkinson Hyperlegible for body/prose, Inter for headings/UI,
Lilex for code/ASCII

**Code block palette**: Idle Toes from Cmux Themes. Keep this palette encoded in
both `src/lib/syntax/idle-toes-theme.ts` and `src/styles/app.css`:

- Foreground `#ffffff`, background `#323232`, cursor `#d6d6d6`
- ANSI 0-7: black `#323232`, red `#d25252`, green `#7fe173`, yellow `#ffc66d`,
  blue `#4099ff`, magenta `#f680ff`, cyan `#bed6ff`, white `#eeeeec`
- ANSI 8-15: bright black `#606060`, bright red `#f07070`, bright green
  `#9dff91`, bright yellow `#ffe48b`, bright blue `#5eb7f7`, bright magenta
  `#ff9dff`, bright cyan `#dcf4ff`, bright white `#ffffff`

**Layout**: 800px max-width container, 8pt grid system
