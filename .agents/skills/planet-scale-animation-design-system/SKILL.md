---
name: planet-scale-animation-design-system
description: Design system and reusable bundles for PlanetScale's interactive blog demos on wcygan.net. Use when embedding, restyling, or extending the lock-queue, concurrency, processes-and-threads, caching, io-latency, sharding, btrees, 768-servers, postgres large tables, or data topology demos in any post; when choosing between SVG and Canvas rendering styles; or when replicating PlanetScale visual design.
---

# Planet Scale Animation Design System

PlanetScale's blog demos, vendored once and reused across posts. The canonical
bundles live in this skill under `assets/` and `references/`; `scripts/sync-public.ts` publishes
them to `public/vendor/planetscale/`, the only tree the site serves. Change
the assets here, then run the sync — the public copies are build output.

## The vendored bundles & references

Each interactive bundle is a self-contained Vite module: minified JS code, shared
stylesheets, a modulepreload polyfill, and a local `index.html` shell (Google
Fonts JetBrains Mono 500/700, an `#app` mount, transparent body). Vector references
provide dual-theme (light/dark) scalable diagrams.

### 1. Interactive Modules (`assets/`)

- `assets/lock-queue/` — `iframe-BxfYI-2n.js`:
  Stuck-database process list (from `blog/debugging-live-database-connections/iframe`).
- `assets/concurrency/` — `iframe-A02iGTt6.js`:
  Hash-routed trio `#junction` (request queue playground), `#usl-curve` (scalability curve with $\alpha/\beta$ sliders), `#before-after` (from `blog/doing-more-with-less/iframe`).
- `assets/processes-and-threads/` — `iframe-DRKIPuh6.js`:
  Low-level OS abstractions: `#pat-cpu`, `#pat-ram`, `#pat-context-switcher`, `#pat-process-states`, `#pat-fork`, `#pat-fork-exec`, `#pat-sum-threads`, `#pat-connection-pooling` (from `blog/processes-and-threads/iframe`).
- `assets/caching/` — `iframe-DB2zOhbH.js`:
  Memory hierarchy, cache hit/miss mechanics, `#karpathy-tweet-simulator`, `#postgres-toggle`, `#spatial-locality`, `#geo-1`/`#geo-2` edge routing, and `#lru-policy`/`#time-aware-lru-cache` (from `blog/caching/iframe`).
- `assets/io-devices-and-latency/` — `iframe-DCKehAfE.js`:
  Hardware storage visualizers: `#io-tape` (magnetic tape reels), `#io-hdd` (rotating platters & actuator arms), `#io-ssd` (NAND flash word lines & GC block erase), and logarithmic human-scale latency bars (from `blog/io-devices-and-latency/iframe`).
- `assets/database-sharding/` — `iframe-BUj6wNLP.js`:
  Horizontal scaling: `#sharding-1-1-4` topologies, range vs hash partitioning (`#sharding-range-id-1-2-4`, `#sharding-hash-id-1-2-4`), step routing, and parallel shard backup benchmarks (from `blog/database-sharding/iframe`).
- `assets/btrees-and-database-indexes/` — `iframe-C-dQmWZC.js`:
  Database index internals: live `#btree` explorer, `#bplustree` visualizer, and `#bplustree-random` (UUID page splits) vs `#bplustree-sequential` (auto-increment contiguous fill) (from `blog/btrees-and-database-indexes/iframe`).
- `assets/making-768-servers-look-like-1/` — `iframe-D6gXH5Cl.js`:
  Massive distributed topologies: `#servers` (768-node live Canvas matrix), animated `#universal-scalability-law` (USL contention/coherency curves), `#popular-arch`, `#pgbouncer`, and `#full-sharded` (from `blog/many-servers-appear-as-one/iframe`).
- `assets/dealing-with-large-tables-in-postgres/` — `iframe-D_ySlzsB.js`:
  Postgres scaling bottlenecks: `#vacuum` autovacuum starvation, `#repack` 2× disk bloat, `#connections` pool saturation, `#indexes` memory bloat, and `#wide` TOAST fragmentation (from `blog/dealing-with-large-tables-in-postgres/iframe`).

### 2. Dual-Theme Vector Diagrams (`references/`)

- `references/what-is-a-data-topology/svgs/`:
  Dual-theme vector architecture diagrams:
  - `data-topology-json-*.svg`: Declarative Data Topology JSON specification.
  - `neki-router-data-topology-shards-*.svg`: Neki routing proxy dispatch architecture.
  - `shard-index-routing-*.svg`: Secondary index routing paths across distributed shards.

---

## Embedding

Copy the wrapper into the components tree when a post embeds a demo:

```bash
cp .agents/skills/planet-scale-animation-design-system/assets/VendoredDemoFigure.tsx src/components/
```

`VendoredDemoFigure` owns the editorial figure header, Replay (resets
`iframe.src`), and an iframe whose height is measured from the rendered
content on load and on stage resize. Pass `hash` for the routed bundles, and
pick the fragment from the section's prose — one bundle serves several
demos. Then write thin per-demo exports beside it:

```tsx
<VendoredDemoFigure
  src="/vendor/planetscale/processes-and-threads/index.html"
  hash="pat-connection-pooling"
  title="Connection Pooling in Relational Databases"
  caption="Visualizing worker thread contention vs pooled query queues."
/>
```

For static vector references (e.g. data topology):

```html
<picture>
  <source
    srcset="
      /vendor/planetscale/what-is-a-data-topology/neki-router-data-topology-shards-darkmode-DzeXwqJn.svg
    "
    media="(prefers-color-scheme: dark)"
  />
  <img
    src="/vendor/planetscale/what-is-a-data-topology/neki-router-data-topology-shards-BJvkLSGa.svg"
    alt="Neki router query routing"
    width="900"
    height="450"
  />
</picture>
```

---

## How the animations work

The demos combine several rendering techniques across an unified token system:

- **SVG, assembled at runtime** (lock-queue, processes-and-threads, btrees, io-devices):
  Geometry lives in the DOM (`svg.brand-diagram-svg`), allowing dynamic tree layout re-balancing, clip-path progress rects, and dashed elbow connectors.
- **Canvas 2D** (junction, USL curve, 768-servers, caching maps):
  `canvas.brand-diagram-canvas` scaled 2× for device pixels. A `requestAnimationFrame` loop steps simulations with delta clamped to 50ms, redraws high-density nodes, and pushes chart samples.
- **Simulation models**:
  Arrival rate queues, sliding window throughput and latency calculations, physical tape reel inertia, and in-memory B+Tree data structure implementations.
- **State machines & GSAP**:
  Multi-step state machines (`working → error → stuck → releasing` or `NEW → READY ⇄ RUNNING → WAITING → TERMINATED`) driven by GSAP timelines and SVG transition tweens.

---

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

---

## Publishing and Syncing

After updating assets or references in this skill, publish them to `public/`:

```bash
deno run --allow-read=. --allow-write=public .agents/skills/planet-scale-animation-design-system/scripts/sync-public.ts
```

---

## Detailed References

Each blog post has a dedicated reference README documenting every fragment hash, visual type, and architectural mechanism:

- [Processes and Threads Reference](references/processes-and-threads/README.md)
- [Caching Reference](references/caching/README.md)
- [IO Devices and Latency Reference](references/io-devices-and-latency/README.md)
- [Database Sharding Reference](references/database-sharding/README.md)
- [B-trees and Database Indexes Reference](references/btrees-and-database-indexes/README.md)
- [Making 768 Servers Look Like 1 Reference](references/making-768-servers-look-like-1/README.md)
- [Dealing with Large Tables in Postgres Reference](references/dealing-with-large-tables-in-postgres/README.md)
- [What is a Data Topology Reference](references/what-is-a-data-topology/README.md)
- [Comprehensive Bundle Inventory](references/bundle-inventory.md)
