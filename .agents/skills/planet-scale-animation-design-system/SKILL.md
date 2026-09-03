---
name: planet-scale-animation-design-system
description: Design system and reusable bundles for PlanetScale's interactive blog demos on wcygan.net. Use when embedding, restyling, or extending the lock-queue, concurrency, processes-and-threads, caching, io-latency, sharding, btrees, 768-servers, postgres large tables, or data topology demos in any post; when choosing between SVG and Canvas rendering styles; or when replicating PlanetScale visual design.
---

# Planet Scale Animation Design System

PlanetScale's blog demos, vendored once and reused across posts. The canonical
bundles live in this skill under `assets/` and `references/`; `scripts/sync-public.ts` publishes
them to `public/vendor/planetscale/`, the only tree the site serves. Change
the assets here, then run the sync — the public copies are build output.

---

## Quick Navigation Index

| Topic / Article                                                            | Visual Domain                      | Key Highlights / Fragment Hashes                                                                                                   | Reference Guide                                                                                                            |
| :------------------------------------------------------------------------- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **[Processes and Threads](#1-processes-and-threads)**                      | OS Kernels & Concurrency           | `#pat-cpu`, `#pat-ram`, `#pat-context-switcher`, `#pat-process-states`, `#pat-fork`, `#pat-sum-threads`, `#pat-connection-pooling` | [`references/processes-and-threads/README.md`](references/processes-and-threads/README.md)                                 |
| **[Caching](#2-caching)**                                                  | Memory Hierarchy & Routing         | `#cache-hit`, `#cache-miss`, `#cache-hr-low`, `#cache-hr-high`, `#karpathy-tweet-simulator`, `#geo-1`, `#lru-policy`               | [`references/caching/README.md`](references/caching/README.md)                                                             |
| **[IO Devices and Latency](#3-io-devices-and-latency)**                    | Physical Storage Mechanics         | `#io-tape`, `#io-hdd`, `#io-ssd`, `#io-ssd-lines-fast`, `#io-ssd-gc-fast`, human-scale logarithmic latency comparisons             | [`references/io-devices-and-latency/README.md`](references/io-devices-and-latency/README.md)                               |
| **[Database Sharding](#4-database-sharding)**                              | Distributed Partitioning           | `#sharding-1-1-4`, `#sharding-range-id-1-2-4`, `#sharding-hash-id-1-2-4`, range vs hash steps, parallel shard backups              | [`references/database-sharding/README.md`](references/database-sharding/README.md)                                         |
| **[B-trees & Database Indexes](#5-b-trees-and-database-indexes)**          | Storage Engine Tree Structures     | `#btree`, `#bplustree`, `#bplustree-random` (UUID splits) vs `#bplustree-sequential` (auto-inc), range scans                       | [`references/btrees-and-database-indexes/README.md`](references/btrees-and-database-indexes/README.md)                     |
| **[Making 768 Servers Look Like 1](#6-making-768-servers-look-like-1)**    | Massive Cluster Orchestration      | `#servers` (768 Canvas matrix), `#universal-scalability-law` ($\alpha/\beta$ USL curve), `#popular-arch`, `#pgbouncer`             | [`references/making-768-servers-look-like-1/README.md`](references/making-768-servers-look-like-1/README.md)               |
| **[Dealing with Large Tables](#7-problems-with-large-tables-in-postgres)** | PostgreSQL Failure Modes           | `#tables`, `#vacuum` (autovacuum starvation), `#repack` (2× disk bloat), `#connections`, `#indexes`, `#wide`                       | [`references/dealing-with-large-tables-in-postgres/README.md`](references/dealing-with-large-tables-in-postgres/README.md) |
| **[What is a Data Topology?](#8-what-is-a-data-topology)**                 | Neki Query Routing & Keyspaces     | Dual-theme vector SVGs: declarative topology JSON, router query dispatch, secondary shard index routing                            | [`references/what-is-a-data-topology/README.md`](references/what-is-a-data-topology/README.md)                             |
| **[Concurrency & Queuing](#9-concurrency--queuing-doing-more-with-less)**  | Simulation & Mathematical Modeling | `#junction` (arrival/throughput/latency simulation), `#usl-curve` (interactive $\alpha/\beta$ sliders)                             | [`references/bundle-inventory.md`](references/bundle-inventory.md)                                                         |
| **[Lock Queue](#10-lock-queue-debugging-live-connections)**                | Database Connection States         | `WORKING`, `ERROR`, `WAITING`, `RELEASING` cascading SVG progress bars with dashed elbow connectors                                | [`references/bundle-inventory.md`](references/bundle-inventory.md)                                                         |

---

## Directory Layout

```
.agents/skills/planet-scale-animation-design-system/
├── SKILL.md                                 # This index and architectural guide
├── assets/                                  # Canonical Vite bundle directories & runtime shells
│   ├── shared/                              # Shared JavaScript chunks & stylesheets
│   ├── lock-queue/                          # index.html + iframe bundle
│   ├── concurrency/                         # index.html + iframe bundle
│   ├── processes-and-threads/               # index.html + iframe bundle
│   ├── caching/                             # index.html + iframe bundle
│   ├── io-devices-and-latency/              # index.html + iframe bundle
│   ├── database-sharding/                   # index.html + iframe bundle
│   ├── btrees-and-database-indexes/         # index.html + iframe bundle
│   ├── making-768-servers-look-like-1/      # index.html + iframe bundle
│   ├── dealing-with-large-tables-in-postgres/ # index.html + iframe bundle
│   └── VendoredDemoFigure.tsx               # Reusable React wrapper component
├── references/                              # In-depth architectural guides per topic
│   ├── bundle-inventory.md                  # Comprehensive low-level bundle breakdown
│   ├── processes-and-threads/README.md
│   ├── caching/README.md
│   ├── io-devices-and-latency/README.md
│   ├── database-sharding/README.md
│   ├── btrees-and-database-indexes/README.md
│   ├── making-768-servers-look-like-1/README.md
│   ├── dealing-with-large-tables-in-postgres/README.md
│   └── what-is-a-data-topology/
│       ├── README.md
│       └── svgs/                            # Dual-theme (light & dark) vector SVGs
└── scripts/
    └── sync-public.ts                       # Deno task publishing canonical assets to public/
```

---

## Detailed Catalog of Vendored Demos

### 1. Processes and Threads

- **Path**: `assets/processes-and-threads/` (`/vendor/planetscale/processes-and-threads/index.html`)
- **Renderer**: Dynamic SVG + GSAP + D3 scale math.
- **Key Fragments**:
  - `#pat-display-title`: GSAP character typing effect.
  - `#pat-cpu`: Register file (`$0`, `$1`, `$2`), program counter, and ALU bus.
  - `#pat-ram`: Address space grid (`0x00`-`0x0F`) showing memory cell mutations.
  - `#pat-context-switcher`: Interactive state save/restore overhead visualizer.
  - `#pat-process-states`: FSM state machine (`NEW` → `READY` ⇄ `RUNNING` → `WAITING` → `TERMINATED`).
  - `#pat-fork` & `#pat-fork-exec`: Process tree cloning and address space replacement.
  - `#pat-sum-threads`: Array partitioning across POSIX threads.
  - `#pat-connection-pooling`: Thread-per-connection vs pooled worker queues in relational databases.
- **Reference**: [`references/processes-and-threads/README.md`](references/processes-and-threads/README.md)

### 2. Caching

- **Path**: `assets/caching/` (`/vendor/planetscale/caching/index.html`)
- **Renderer**: Canvas 2D (traffic simulations, geo maps) + dynamic SVG (request flows).
- **Key Fragments**:
  - `#cache-hit` & `#cache-miss`: Animated request lifecycle and penalty paths.
  - `#cache-hr-low` & `#cache-hr-high`: Slider-driven hit ratio simulation (50% vs 99%) with real-time origin saturation meters.
  - `#karpathy-tweet-simulator`: Viral workload simulator modeling traffic spikes and stampede mitigation.
  - `#postgres-toggle`: Interactive switcher comparing MySQL buffer pool vs Postgres shared buffers.
  - `#spatial-locality`: Memory word prefetching into contiguous cache lines.
  - `#geo-1` & `#geo-2`: Canvas-based world map demonstrating single-region vs global edge cache latency.
  - `#lifo-policy`, `#lru-policy`, `#time-aware-lru-cache`: Interactive queue/stack eviction visualizers.
- **Reference**: [`references/caching/README.md`](references/caching/README.md)

### 3. IO Devices and Latency

- **Path**: `assets/io-devices-and-latency/` (`/vendor/planetscale/io-devices-and-latency/index.html`)
- **Renderer**: Dynamic vector SVG driven by D3 transformation modules (`transform-tHp9KnZo.js`) and high-precision timing (`timer-DWAvo6M8.js`).
- **Key Fragments**:
  - `#io-tape`, `#io-tape-fast`, `#io-tape-slow`: Mechanical dual-reel magnetic tape drive with physical ribbon movement and seek latency.
  - `#io-hdd`, `#io-hdd-io-fast`, `#io-hdd-io-slow`: Multi-platter spinning disk with rotating sectors and swinging actuator arm.
  - `#io-ssd`, `#io-ssd-lines-fast`, `#io-ssd-lines-slow`: NAND flash silicon architecture, word line charging, and high-voltage block erasures.
  - `#io-ssd-gc-fast`, `#io-ssd-gc-slow`: Write amplification and garbage collection mechanics.
  - `#io-latency-tape-hdd`, `#io-latency-hdd-ssd`, `#io-latency-memory-local-ssd`: Logarithmic human-scale latency comparison bars.
- **Reference**: [`references/io-devices-and-latency/README.md`](references/io-devices-and-latency/README.md)

### 4. Database Sharding

- **Path**: `assets/database-sharding/` (`/vendor/planetscale/database-sharding/index.html`)
- **Renderer**: Modular vector architecture SVGs with animated route highlights.
- **Key Fragments**:
  - `#sharding-no-proxy-1-0-1` & `#sharding-no-proxy-1-0-2`: Monolithic connection bottlenecks.
  - `#sharding-1-1-2`, `#sharding-1-1-3`, `#sharding-1-1-4`: Horizontal scale-out to 2, 3, and 4 shard topologies.
  - `#sharding-range-id-1-2-4`, `#sharding-range-age-1-2-4`: Range sharding strategies and hotspot skew.
  - `#sharding-hash-name-1-2-4`, `#sharding-hash-id-1-2-4`: Uniform hash distribution eliminating hotspots.
  - `#sharding-steps-range-steps-1-2-4` & `#sharding-steps-hash-id-1-2-4`: Step-by-step query routing execution.
  - `#sharding-backup-1` vs `#sharding-backup-4`: Sequential monolithic backup vs parallel concurrent shard backups.
- **Reference**: [`references/database-sharding/README.md`](references/database-sharding/README.md)

### 5. B-trees and Database Indexes

- **Path**: `assets/btrees-and-database-indexes/` (`/vendor/planetscale/btrees-and-database-indexes/index.html`)
- **Renderer**: Dynamic SVG graph layout engine with bezier connector lines and interactive tree manipulation.
- **Key Fragments**:
  - `#btree`, `#btree-speed-adjuster`, `#btree-search`: Interactive B-tree explorer with custom insertion, deletion, and search stepping.
  - `#bplustree`, `#bplustree-search`: B+tree layout separating internal routing keys from linked leaf data chains.
  - `#bplustree-random` vs `#bplustree-sequential`: Live comparative simulations demonstrating page splits from UUID keys vs contiguous 93% page fill from auto-increment keys.
  - `#bplustree-insert-bar-chart` & `#bplustree-inserts-nodes-visited`: Node visitation and split frequency metrics.
  - `#bplustree-random-range-search` vs `#bplustree-sequential-range-search`: Leaf pointer scan performance vs fragmented random seeks.
- **Reference**: [`references/btrees-and-database-indexes/README.md`](references/btrees-and-database-indexes/README.md)

### 6. Making 768 Servers Look Like 1

- **Path**: `assets/making-768-servers-look-like-1/` (`/vendor/planetscale/making-768-servers-look-like-1/index.html`)
- **Renderer**: High-density Canvas 2D (768-server dot matrix) + animated vector SVG architectures with GSAP.
- **Key Fragments**:
  - `#servers`: Real-time Canvas 2D rendering of 768 database nodes actively processing traffic.
  - `#universal-scalability-law`: Animated USL curve decomposing linear scaling, contention slowdown ($\alpha$), and coherency collapse ($\beta$).
  - `#popular-arch`, `#primary-replicas`: Primary write bottleneck in classic web tier architectures.
  - `#pgbouncer`: Connection pool proxying at large instance counts.
  - `#proxy-plan`, `#shard-inserts`, `#full-sharded`: Transparent query routing proxy architecture coordinating shards.
- **Reference**: [`references/making-768-servers-look-like-1/README.md`](references/making-768-servers-look-like-1/README.md)

### 7. Problems with Large Tables in Postgres

- **Path**: `assets/dealing-with-large-tables-in-postgres/` (`/vendor/planetscale/dealing-with-large-tables-in-postgres/index.html`)
- **Renderer**: Dynamic SVG block schemas and animated timelines.
- **Key Fragments**:
  - `#tables`: Size comparison between standard tables and multi-billion-row tables.
  - `#vacuum`: Autovacuum starvation where a single giant table never finishes vacuuming.
  - `#repack`: Disk space explosion (2× table size) during `pg_repack` operations.
  - `#connections`: Connection pool saturation caused by long-running sequential table scans.
  - `#backups`: Escalating backup and recovery time windows.
  - `#indexes`: Index memory footprints exceeding RAM and buffer pools.
  - `#wide`: TOAST table fragmentation on wide table rows.
- **Reference**: [`references/dealing-with-large-tables-in-postgres/README.md`](references/dealing-with-large-tables-in-postgres/README.md)

### 8. What is a Data Topology?

- **Path**: `references/what-is-a-data-topology/svgs/` (`/vendor/planetscale/what-is-a-data-topology/`)
- **Type**: Dual-theme (light and dark mode) high-fidelity vector diagrams.
- **Key Assets**:
  - `data-topology-json-*.svg`: Syntax-highlighted Data Topology declarative JSON specification.
  - `neki-router-data-topology-shards-*.svg`: Neki routing proxy query dispatch topology.
  - `shard-index-routing-*.svg`: Secondary index routing paths across distributed shards.
- **Reference**: [`references/what-is-a-data-topology/README.md`](references/what-is-a-data-topology/README.md)

### 9. Concurrency & Queuing (Doing More With Less)

- **Path**: `assets/concurrency/` (`/vendor/planetscale/concurrency/index.html`)
- **Renderer**: Canvas 2D (device-pixel scaled 2×) with rAF physics simulation.
- **Key Fragments**:
  - `#junction`: Real-time request arrival rate simulator, queue saturation, and rolling latency meters.
  - `#usl-curve`: Scalability curve with interactive contention ($\alpha$) and coherency ($\beta$) sliders.
- **Reference**: [`references/bundle-inventory.md`](references/bundle-inventory.md)

### 10. Lock Queue (Debugging Live Connections)

- **Path**: `assets/lock-queue/` (`/vendor/planetscale/lock-queue/index.html`)
- **Renderer**: SVG assembled at runtime (`svg.brand-diagram-svg`).
- **Key Behavior**:
  - Stuck database process list on a 14-second cycle transitioning through `WORKING` → `ERROR` → `WAITING` → `RELEASING`.
- **Reference**: [`references/bundle-inventory.md`](references/bundle-inventory.md)

---

## Embedding Patterns

### 1. Interactive Bundle via `VendoredDemoFigure`

To embed an interactive bundle in an MDX post:

```tsx
import { VendoredDemoFigure } from "@/components/VendoredDemoFigure";

<VendoredDemoFigure
  src="/vendor/planetscale/processes-and-threads/index.html"
  hash="pat-connection-pooling"
  title="Connection Pooling in Relational Databases"
  caption="Visualizing worker thread contention vs pooled query queues."
/>;
```

`VendoredDemoFigure` handles:

- Measuring iframe content height dynamically on load and resize.
- Resetting/replaying animations via the editorial Replay button.
- Transparent canvas rendering that blends seamlessly into the article background.

### 2. Dual-Theme Vector Diagrams via `<picture>`

For static vector diagrams that automatically respond to light/dark themes:

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

## Token System & Styling

The design system shares a single token set across all bundles via CSS custom properties:

| Token                 | Light     | Dark      | Semantic Meaning                                    |
| :-------------------- | :-------- | :-------- | :-------------------------------------------------- |
| `--diagram-bg`        | `#FAFAFA` | `#111111` | Stage background                                    |
| `--diagram-fg`        | `#111111` | `#FAFAFA` | Primary labels, axes, and text                      |
| `--diagram-accent`    | `#F35815` | `#F35815` | PlanetScale Orange (primary callouts, incoherency)  |
| `--diagram-blue`      | `#144EB6` | `#0E73CC` | Secondary operations, contention, cache hits        |
| `--diagram-green`     | `#13862E` | `#27B648` | Success states, linear scaling, auto-increment keys |
| `--diagram-red`       | `#D92038` | `#FF455D` | Errors, lock waiting, slow paths, cache misses      |
| `--diagram-yellow`    | `#A78103` | `#F2B600` | Blocked states, warnings, intermediate steps        |
| `--diagram-connector` | `#818181` | `#818181` | Dashed queue connectors, tree branch lines          |

- **Typography**: Google Fonts JetBrains Mono (500 and 700 weights); uppercase labels with wide letter spacing.
- **Controls**: `.blog-styled-range` custom inputs with dashed track styling.

---

## Synchronization Workflow

The skill maintains canonical sources under `assets/` and `references/`. The site serves files from `public/vendor/planetscale/`. After modifying any asset or reference, sync them:

```bash
deno run --allow-read=. --allow-write=public .agents/skills/planet-scale-animation-design-system/scripts/sync-public.ts
```
