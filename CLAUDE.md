# CLAUDE.md

Modern UI/UX Engineering guide for wcygan.net — a TanStack Start blog with clean, accessible design.

## Essential Commands

```bash
# Development
bun run dev           # Start development server (port 3000)
bun run build         # Build for production (Nitro + Bun)
bun run start         # Start production server
bun run preview       # Preview production build

# Quality & Testing
bun run pre-commit    # Format + typecheck (recommended before commits)
bun run test          # Run Vitest unit tests
```

## Technology Stack

- **TanStack Start** with TanStack Router for full-stack React SSR
- **Bun** runtime and package manager
- **React 19** with hooks for state management
- **Tailwind CSS 3** with Typography plugin for consistent styling
- **MDX** via `@mdx-js/rollup` for Markdown blog posts with React component imports
- **Shiki** (`@shikijs/rehype`) for build-time syntax highlighting (github-light theme)
- **Mermaid.js** for interactive diagrams (client-side rendered, sessionStorage cached)
- **TypeScript** with strict mode for type safety
- **Nitro** with `bun` preset for deployment

A project-local skill (`wcygan-net-stack`) documents Bun, TanStack Start, MDX, and Mermaid patterns in detail under `.claude/skills/wcygan-net-stack/references/`.

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

## Design System

**Color Palette** (Light theme):

- Primary blue: `rgb(70, 110, 170)` — titles, banners, accents
- Link blue: `rgb(30, 70, 140)` — interactive links
- Text primary: `rgb(0, 0, 0)` — body text
- Text secondary: `rgb(102, 102, 102)` — dates, metadata

**Layout**: 800px max-width container, 8pt grid system, system font stack

**Accessibility**: WCAG AA contrast, semantic HTML, visible focus rings, ARIA labels

## Blog System

- Posts are `.mdx` files in `src/posts/` with YAML frontmatter (`title`, `date`, `description`, `tags`)
- MDX supports importing React components (e.g., MermaidDiagram)
- Blog service uses `import.meta.glob('/src/posts/*.mdx', { eager: true })`
- Clean URLs: `/{slug}` (no `/blog` prefix)
- RSS available at `/feed` route and `/rss.xml` static file

## Adding Blog Posts

1. Create `src/posts/my-post.mdx` with frontmatter
2. Posts automatically appear on homepage and `/posts`
3. Update `public/rss.xml` manually for RSS subscribers

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
