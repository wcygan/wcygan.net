---
name: wcygan-net-stack
description: Project stack guide for wcygan.net covering Bun runtime, TanStack Start framework, MDX markdown rendering, and Mermaid diagram components. Auto-loads when working on routes, components, blog posts, MDX config, Vite config, mermaid diagrams, or build/deploy. Keywords: bun, tanstack, tanstack start, tanstack router, mdx, markdown, mermaid, diagram, vite, nitro, blog post, route, shiki
---

# wcygan.net Stack Guide

This skill provides project-specific knowledge for the wcygan.net blog, covering the four core subsystems. Load the appropriate reference for detailed patterns.

## Quick Reference

| Area                         | Entry Point                               | Reference                                             |
| ---------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| Bun runtime & build          | `package.json`, `vite.config.ts`          | [bun.md](references/bun.md)                           |
| TanStack Start routing & SSR | `src/routes/`, `src/router.tsx`           | [tanstack-start.md](references/tanstack-start.md)     |
| MDX markdown pipeline        | `vite.config.ts` MDX plugin, `src/posts/` | [mdx-pipeline.md](references/mdx-pipeline.md)         |
| Mermaid diagrams             | `src/components/MermaidDiagram.tsx`       | [mermaid-diagrams.md](references/mermaid-diagrams.md) |

## Critical Gotchas

1. **Loaders must return serializable data only.** Never return React components, functions, or class instances from TanStack Router loaders — they get JSON-serialized for SSR hydration. Load MDX components client-side via `useEffect`.

2. **Never use `ref.current.innerHTML` in React components.** Use `dangerouslySetInnerHTML` via state instead. Direct DOM mutation breaks React's reconciler during hydration (causes `removeChild` errors).

3. **The `$slug` route is a catch-all.** It matches everything including `/rss.xml` and `/favicon.ico`. The `beforeLoad` guard rejects slugs containing dots to let static files through.

4. **Mermaid must be dynamically imported.** It's browser-only and ~2MB. Use `import('mermaid')` at runtime, never a top-level import. The ESM alias in `vite.config.ts` points to the optimized build.

5. **MDX frontmatter uses `frontmatter` not `metadata`.** The `remark-mdx-frontmatter` plugin exports frontmatter under `module.frontmatter`, unlike the old MDsveX which used `module.metadata`.
