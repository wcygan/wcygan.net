# Caching: Visualizations and Architecture

This reference describes how the animations, diagrams, and interactive simulations in PlanetScale's **"Caching"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/caching`
- **Vendored bundle location**: `.agents/skills/planet-scale-animation-design-system/assets/caching/`
- **Served public path**: `/vendor/planetscale/caching/`
- **Bundle entrypoint**: `iframe-DB2zOhbH.js` (with preloaded `index-Brfk6Bdo.js`, `modulepreload-polyfill-B5Qt9EMX.js`, and `styles-CWGXrFsx.css`)

---

## 1. Overview and Topics Covered

The article provides a comprehensive exploration of memory hierarchies, cache mechanics, eviction algorithms, and database query caching:

1. **Cache fundamentals**: Cache hits vs cache misses, latency differential between RAM cache and disk/database access.
2. **Hit Ratio impact**: How a 10% change in cache hit ratio creates a 10× change in origin database load.
3. **Real-world workload simulation**: The "Karpathy Tweet Simulator", showing traffic spikes on viral content and cache stampede effects.
4. **Locality of Reference**: Temporal locality (recently accessed data) and spatial locality (nearby memory or related data records).
5. **Geographic distribution**: Multi-region edge caching vs centralized database origin latency.
6. **Eviction policies**: LIFO (Last-In-First-Out), LRU (Least-Recently-Used), and time-aware TTL LRU eviction models.
7. **Database caching architecture**: Client query caching, connection pooler caches, and relational DBMS buffer pools (Postgres shared buffers).

---

## 2. Interactive Demonstrations & Fragment Hash Routing

The bundle mounts within the `#app` shell. It parses the URL hash fragment (`document.URL.split("#")[1]`) and matches the target element via `data-id`.

| Fragment Hash               | Section / Title      | Visual Type       | Renderer & Description                                                                          |
| :-------------------------- | :------------------- | :---------------- | :---------------------------------------------------------------------------------------------- |
| `#title`                    | Introduction         | Canvas / SVG      | Title animation introducing cache mechanics                                                     |
| `#cache-0`                  | Introduction         | Canvas 2D         | Visual pipeline showing App Request → Cache Check → DB Storage                                  |
| `#postgres-toggle`          | Foundation           | UI Switcher       | Toggle between MySQL InnoDB Buffer Pool and PostgreSQL Shared Buffers                           |
| `#cache-basic`              | Foundation           | Diagram SVG       | Step-by-step request pathway for basic caching                                                  |
| `#cache-hit`                | Cache hits           | Animated Flow     | Animated hit path: App → Cache → Return data (0.5ms latency)                                    |
| `#cache-miss`               | Cache misses         | Animated Flow     | Animated miss path: App → Cache (miss) → DB query (50ms) → Populate cache → Return data         |
| `#cache-hr-low`             | Hit ratio low        | Interactive Sim   | Slider-driven simulation showing 50% hit ratio with high DB saturation                          |
| `#cache-hr-low-stats`       | Hit ratio stats      | Live Counter      | Real-time statistics meter showing throughput, hit count, miss count, and DB queue              |
| `#cache-hr-high`            | Hit ratio high       | Interactive Sim   | Slider-driven simulation showing 99% hit ratio with near-zero DB saturation                     |
| `#cache-hr-high-stats`      | Hit ratio stats      | Live Counter      | Real-time statistics meter for high hit ratio performance                                       |
| `#cache-1`                  | Request flows        | Pipeline SVG      | Request flow diagram showing cache lookup branch                                                |
| `#cache-2`                  | Concurrent load      | Canvas 2D         | Concurrent worker requests contending for cache slots                                           |
| `#cache-2-stats`            | Worker load          | Bar Gauge         | Worker latency distribution under un-cached load                                                |
| `#latency-comparison`       | Latency scale        | Comparison Bar    | Visual logarithmic scale comparing L1 cache (1ns), RAM (100ns), SSD (100μs), and Network (50ms) |
| `#tweet-example`            | Workload sample      | DOM Card          | Sample viral social media post card                                                             |
| `#karpathy-tweet-simulator` | Tweet simulator      | Interactive Sim   | Interactive traffic spike simulator modeling viral tweets and cache warm-up                     |
| `#cache-3`                  | Cache invalidation   | Diagram SVG       | Cache invalidation on mutation (`UPDATE`/`DELETE`) showing stale reads                          |
| `#cache-3-stats`            | Invalidation metrics | Real-time Metrics | Invalidation rate vs cache consistency metrics                                                  |
| `#spatial-locality`         | Spatial locality     | Memory Grid       | Block-level memory cache lines showing pre-fetching of adjacent memory words                    |
| `#geo-1`                    | Geographic caching   | Canvas Map        | Single-region origin DB request latency from worldwide clients                                  |
| `#geo-2`                    | Edge caching         | Canvas Map        | Multi-region edge caching with local pop latency vs global replication                          |
| `#lifo-policy`              | Eviction: LIFO       | Interactive Stack | Stack eviction model dropping the newest insertions first                                       |
| `#lru-policy`               | Eviction: LRU        | Interactive Queue | Doubly-linked list eviction model moving accessed items to head and evicting tail               |
| `#time-aware-lru-cache`     | TTL + LRU            | Interactive Queue | Dual eviction: item expiration based on TTL coupled with LRU capacity limits                    |

---

## 3. Implementation Details

- **Rendering**: Hybrid Canvas 2D and dynamic SVG. Heavy particulate or high-frequency simulations (Karpathy simulator, geo map, concurrent workers) use Canvas with an active rAF loop. Structural explanations use SVG.
- **Controls**: Includes interactive sliders (`.blog-styled-range`), buttons to trigger requests, eviction step controls, and hit-ratio dials.
- **Replication**: Use `VendoredDemoFigure` pointing to `/vendor/planetscale/caching/index.html#<hash>`.
