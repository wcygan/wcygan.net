---
name: planet-scale-animation-design-system
description: Design system and reusable bundles for PlanetScale's interactive blog demos on wcygan.net. Use when embedding, restyling, or extending the lock-queue, junction-queue, or USL-curve demos in any post; when choosing between the SVG and Canvas rendering styles for a new diagram; or when a user asks how these animations were created or styled.
---

# Planet Scale Animation Design System

PlanetScale's blog demos, vendored once and reused across posts. The canonical
bundles live in this skill under `assets/`; `scripts/sync-public.ts` publishes
them to `public/vendor/planetscale/`, the only tree the site serves. Change
the assets here, then run the sync — the public copies are build output.

## The bundles

Each bundle is a self-contained Vite module: one minified JS file, one shared
stylesheet, a modulepreload polyfill, and a local `index.html` shell (Google
Fonts JetBrains Mono 500/700, an `#app` mount, transparent body). The shell is
the only file authored locally; everything else is the vendor's.

- `assets/lock-queue/` — `iframe-BxfYI-2n.js`: the stuck-database process
  list (from `blog/debugging-live-database-connections/iframe`).
- `assets/concurrency/` — `iframe-A02iGTt6.js`: hash-routed trio
  `#junction` (request queue playground), `#usl-curve` (scalability curve
  with α/β sliders), `#before-after` (from
  `blog/doing-more-with-less/iframe`).

## Embedding

Copy the wrapper into the components tree when a post embeds a demo:

```bash
cp .agents/skills/planet-scale-animation-design-system/assets/VendoredDemoFigure.tsx src/components/
```

`VendoredDemoFigure` owns the editorial figure header, Replay (resets
`iframe.src`), and an iframe whose height is measured from the rendered
content on load and on stage resize. Pass `hash` for the routed bundles, and
pick the fragment from the section's prose — one bundle serves several
demos. Then write thin per-demo exports beside it (see the reference copy's
doc comment for the prop contract).

## How the animations work

The demos are not one technique. Each bundle picks the renderer its geometry
needs; both read the same token system.

- **SVG, assembled at runtime** (lock-queue): `svg.brand-diagram-svg`
  viewBox `0 0 1054 1203` with one `clipPath` + `conn-fill-N` rect per row.
  The per-row progress fill is a clipped rect resized by JS — geometry lives
  in the DOM, so rows indent, grow elbow connectors, and cascade as real
  elements. No static SVG asset exists to download.
- **Canvas 2D** (junction, USL curve): `canvas.brand-diagram-canvas` scaled
  2× for device pixels (e.g. `width=2400 height=760` at `380px` CSS). A
  `requestAnimationFrame` loop steps the simulation with delta clamped to
  50ms, redraws every frame, and pushes a chart sample every 0.25s.
- **Simulation** (junction): arrivals spawn on the slider rate, timestamps
  land in `spawnTimes`/`doneTimes`, a rolling 3-second window computes
  `throughput()`, `offeredRate()`, and mean latency; a per-request flash
  decays by `2.2 × dt`.
- **State machine** (lock-queue): `working → error → stuck → releasing` on a
  14-second cycle, labeled `WORKING / ERROR / WAITING / RELEASING` and
  colored `gray / red / yellow / green`.

## Tokens

Colors are CSS custom properties, so the stage follows the reader's
`prefers-color-scheme` without a bundle change:

| Token                 | Light     | Dark      |
| --------------------- | --------- | --------- |
| `--diagram-bg`        | `#FAFAFA` | `#111111` |
| `--diagram-fg`        | `#111111` | `#FAFAFA` |
| `--diagram-accent`    | `#F35815` | `#F35815` |
| `--diagram-blue`      | `#144EB6` | `#0E73CC` |
| `--diagram-green`     | `#13862E` | `#27B648` |
| `--diagram-red`       | `#D92038` | `#FF455D` |
| `--diagram-yellow`    | `#A78103` | `#F2B600` |
| `--diagram-connector` | `#818181` | `#818181` |

Typography is JetBrains Mono 500/700; labels are uppercase with wide
letter-spacing; controls are `blog-styled-range` inputs with dashed tracks.

## Vendoring a new demo

Follow `$wcygan-demo-replication` end to end. On success, drop the bundle,
polyfill reference, and a local shell into `assets/<name>/`, extend
`scripts/sync-public.ts`, run the sync, and add a thin export beside the
other demo components.

## Reference

- [Bundle inventory](references/bundle-inventory.md) — exact per-demo
  renderer, geometry, constants, and state machine observed in the DOM.
