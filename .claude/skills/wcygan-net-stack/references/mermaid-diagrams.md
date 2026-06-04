# Mermaid Diagram Pipeline

## Overview

Mermaid diagrams are compiled to static SVG at build time. There is no runtime
React component and no client-side `mermaid` bundle. Diagram source lives in
`.mmd` files, a script renders them to SVGs under `public/`, and posts embed the
result as a plain `<img>`.

## Pipeline

```
src/diagrams/<post-slug>/<name>.mmd   — Mermaid source (plain text)
src/diagrams/<post-slug>/<name>.css   — optional sidecar, inlined as <style> in the SVG
        │  deno task render:diagrams  (scripts/render-diagrams.mjs)
        ▼
public/<post-slug>/<name>.svg         — committed static SVG, no JS
        │  embedded via <img> in the .mdx post
        ▼
rendered page                         — plain image, no client-side mermaid
```

1. Author the diagram in `src/diagrams/<post-slug>/<name>.mmd`. Include
   `accTitle` and `accDescr` lines for accessibility.
2. Optionally add a sibling `<name>.css` for charts that need custom colors; it
   is inlined into the SVG as a `<style>` so the image stays self-contained when
   loaded via `<img>`.
3. Run `deno task render:diagrams` (script: `scripts/render-diagrams.mjs`). It
   walks `src/diagrams`, compiles every `.mmd` to `public/<post-slug>/<name>.svg`,
   and prints each output's `width` and `height`.
4. Embed the SVG in the post (see below) using the printed dimensions.

The render step also runs during `deno task build`. It is best-effort: it needs
a local Chrome/Chromium to render, and when none is found (for example in the
Cloudflare build container) it logs and exits 0, so the build falls back to the
committed SVGs. Pass `--force` to re-render everything regardless of mtime.

## Usage in MDX Posts

```mdx
<figure className="static-mermaid-figure">
  <div className="static-mermaid-frame">
    <img
      className="static-mermaid-diagram"
      src="/post-slug/name.svg"
      alt="One-sentence description of what the diagram shows."
      width={400}
      height={300}
    />
  </div>
  <figcaption>Caption.</figcaption>
</figure>
```

Use `static-mermaid-frame-simple` alongside `static-mermaid-frame` for small or
narrow diagrams:

```mdx
<div className="static-mermaid-frame static-mermaid-frame-simple">
```

The `width`/`height` are the values the render script prints. They give the SVG
a stable intrinsic size; CSS owns responsive scaling from there.

## Theme Configuration

`scripts/render-diagrams.mjs` is the sole owner of the diagram theme. It uses
`theme: 'base'` with custom `themeVariables` matching the site design system:

- **Primary blue**: `#466eaa` (borders, titles, git/pie color 0)
- **Link blue**: `#1e468c` (secondary accent, git/pie color 1)
- **Background**: `#f9f9f9` (nodes, actors, labels)
- **Text**: `#000000` (all text elements)
- **Lines**: `#666666` (connections, signals)
- **Colorblind-safe palette**: Orange `#E69F00`, Blue `#0072B2`, Teal `#009E73`,
  Purple `#CC79A7`, plus others for pie/git series
- **Font**: Inter / system stack matching `design.md`

`htmlLabels` is `false`, so labels render as SVG `<text>` that measures correctly
at build time. This sidesteps the `foreignObject` clipping and global-`p`-style
leakage that the old runtime renderer had to fight in CSS.

## Per-diagram CSS Override

When the base theme is not enough (for example the temperature bar/line chart),
add a sibling `.css` next to the `.mmd`. It targets Mermaid's internal SVG
classes and is inlined verbatim. Example:
`src/diagrams/mermaid-diagrams/temperature.css`.

## Supported Diagram Types

flowchart, sequence, state, gitGraph, erDiagram, pie, quadrant, and others. See
the examples under `src/diagrams/mermaid-diagrams/` and the rendered post.

## CSS in app.css

The only Mermaid-related classes remaining in `src/styles/app.css` are the
static figure styles: `.static-mermaid-figure`, `.static-mermaid-frame`,
`.static-mermaid-frame-simple`, and `.static-mermaid-diagram`. All runtime
classes (`.mermaid-container`, fullscreen dialog, etc.) were removed with the
runtime component.

## Key Files

- `src/diagrams/<post-slug>/<name>.mmd` — diagram source
- `src/diagrams/<post-slug>/<name>.css` — optional inlined style sidecar
- `scripts/render-diagrams.mjs` — renderer (owns theme + config)
- `public/<post-slug>/<name>.svg` — committed output, embedded via `<img>`
- `src/styles/app.css` — `.static-mermaid-*` figure styles
- `src/posts/mermaid-diagrams.mdx` — blog post demonstrating the embed markup
