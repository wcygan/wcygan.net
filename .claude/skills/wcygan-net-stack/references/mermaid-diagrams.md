# Mermaid Diagram Renderer

## Overview

Mermaid diagrams render client-side in the browser via a React component (`MermaidDiagram`) that dynamically imports the `mermaid` library, renders SVG, and caches results in sessionStorage.

## Component Architecture

```
MermaidDiagram.tsx       — Main component (renders diagram, handles states)
  ├── MermaidFullscreen.tsx — Fullscreen modal for mobile viewing
  └── mermaid-cache.ts     — SessionStorage caching with 1-hour TTL
```

### MermaidDiagram Props

```tsx
interface Props {
  height?: number          // Container min-height (default: 400)
  diagram?: string         // Mermaid diagram definition
  useLazyLoading?: boolean // Load when scrolled into view (default: false)
  rootMargin?: string      // IntersectionObserver margin (default: '100px')
}
```

## Usage in MDX Posts

```mdx
import { MermaidDiagram } from '~/components/MermaidDiagram'

<MermaidDiagram height={300}
diagram={`flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Success]
  B -->|No| D[Retry]`}
/>
```

## Usage in Route Components

```tsx
import { MermaidDiagram } from '~/components/MermaidDiagram'

function MyPage() {
  return (
    <MermaidDiagram
      height={400}
      useLazyLoading={true}
      diagram={`sequenceDiagram
        A->>B: Hello
        B-->>A: Hi`}
    />
  )
}
```

## Rendering Pipeline

1. Component mounts, checks `isInViewport` (immediate or via IntersectionObserver)
2. Checks sessionStorage cache via `getCachedSVG(diagram)`
3. If cache miss: dynamically `import('mermaid')` (module cached at module level)
4. Calls `mermaid.initialize()` with the MERMAID_THEME config
5. Calls `mermaid.render(id, diagram)` to produce SVG string
6. Caches SVG via `setCachedSVG(diagram, svg)`
7. Sets `svgHtml` state → React renders via `dangerouslySetInnerHTML`

## Critical Implementation Details

### No Direct DOM Mutation

**NEVER use `ref.current.innerHTML = svg`** — this breaks React's reconciler during SSR hydration, causing `removeChild` errors. Always use React-controlled rendering:

```tsx
// CORRECT
const [svgHtml, setSvgHtml] = useState<string | null>(null)
// ...
setSvgHtml(renderResult.svg)
// In JSX:
{svgHtml && <div dangerouslySetInnerHTML={{ __html: svgHtml }} />}

// WRONG — causes hydration crashes
containerRef.current.innerHTML = renderResult.svg
```

### Dynamic Import Required

Mermaid is ~2MB and browser-only. Never import at the top level:

```tsx
// CORRECT — dynamic import at runtime
const mod = await import('mermaid')
mermaidInstance = mod.default || mod

// WRONG — breaks SSR, bloats server bundle
import mermaid from 'mermaid'
```

The Vite alias in `vite.config.ts` points to the ESM build:
```ts
resolve: { alias: { mermaid: 'mermaid/dist/mermaid.esm.min.mjs' } }
```

### Module-Level Instance Cache

The mermaid module is cached at module scope (not component scope) so it's only loaded once across all diagram instances on a page:

```tsx
let mermaidInstance: typeof import('mermaid').default | null = null
```

## Theme Configuration

The `MERMAID_THEME` object uses `theme: 'base'` with custom variables matching the site's design system:

- **Primary green**: `#5c8b3f` (borders, titles, git branches)
- **Link green**: `#2e6810` (secondary accents)
- **Background**: `#f9f9f9` (nodes, actors, labels)
- **Text**: `#000000` (all text elements)
- **Lines**: `#666666` (connections, signals)
- **Colorblind-safe palette**: Orange `#E69F00`, Blue `#0072B2`, Teal `#009E73`, Purple `#CC79A7`
- **Font**: System font stack matching `design.md`

## Supported Diagram Types

All types tested and working: flowchart, sequence, state, gitGraph, erDiagram, pie, gantt, classDiagram.

## Caching System

`src/lib/utils/mermaid-cache.ts`:

- **Storage**: `sessionStorage` (browser session scoped)
- **Key format**: `mermaid-cache-{hash}` where hash is a 32-bit FNV of the diagram string
- **TTL**: 1 hour (`CACHE_DURATION = 3600000`)
- **Auto-cleanup**: Expired entries cleared on quota exceeded errors

## MermaidFullscreen Component

Uses the native `<dialog>` element with `showModal()`/`close()`:

- Opens when user taps fullscreen button (mobile only, `window.innerWidth <= 768`)
- SVG scaled to `90vw` / `90vh`
- Closes on Escape key or close button
- Dark backdrop with blur

## Gotcha: SVG Shrinks Inside Flex Wrapper

Mermaid emits an SVG with `width="100%"` and an inline `max-width: Xpx` style. That `100%` resolves against the SVG's **parent**, not the outer container. If the parent is a shrink-wrap flex item, the SVG collapses to ~300px regardless of the intended max-width.

The inner `.mermaid-render-container` wrapper (which holds `dangerouslySetInnerHTML`) must be full-width so `width="100%"` resolves to the outer container's width:

```tsx
// CORRECT — wrapper fills outer flex row, SVG hits its max-width
<div
  className="mermaid-render-container flex w-full justify-center"
  dangerouslySetInnerHTML={{ __html: svgHtml }}
/>

// WRONG — shrink-wrap parent collapses the SVG
<div
  className="mermaid-render-container"
  dangerouslySetInnerHTML={{ __html: svgHtml }}
/>
```

## Gotcha: Diagrams Need Vertical Margin

Without explicit margin, diagrams sit flush against the following heading. Typography plugin spacing doesn't apply to the custom component. The outer `.mermaid-container` needs `my-6` (24px top/bottom) to match the Svelte version's visual spacing:

```tsx
<div className="mermaid-container relative my-6 flex justify-center overflow-x-auto rounded-lg p-4" ...>
```

## Key Files

- `src/components/MermaidDiagram.tsx` — Main renderer (~300 lines)
- `src/components/MermaidFullscreen.tsx` — Fullscreen modal
- `src/lib/utils/mermaid-cache.ts` — SessionStorage cache
- `src/styles/app.css` — `.mermaid-container`, `.fullscreen-button` styles
- `src/routes/mermaid-examples.tsx` — Showcase page with all diagram types
- `src/posts/mermaid-diagrams.mdx` — Blog post demonstrating MDX usage
