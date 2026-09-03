# Database Sharding: Visualizations and Architecture

This reference describes how the animations, diagrams, and interactive simulations in PlanetScale's **"Database Sharding"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/database-sharding`
- **Vendored bundle location**: `.agents/skills/planet-scale-animation-design-system/assets/database-sharding/`
- **Served public path**: `/vendor/planetscale/database-sharding/`
- **Bundle entrypoint**: `iframe-BUj6wNLP.js` (with preloaded `index-Brfk6Bdo.js`, `modulepreload-polyfill-B5Qt9EMX.js`, and `styles-CWGXrFsx.css`)

---

## 1. Overview and Topics Covered

The article explains horizontal database scaling via sharding:

1. **Vertical scaling limits**: CPU, memory, and IOPS bottlenecks on a single monolithic database instance.
2. **Horizontal partitioning**: Distributing rows across multiple independent physical database instances (shards).
3. **Routing architectures**: Client-side routing vs transparent proxy-based routing (e.g. Vitess / Neki).
4. **Sharding strategies**:
   - **Range-based sharding**: Routing by key ranges (e.g. IDs 1–1000 on Shard 1, 1001–2000 on Shard 2). Pros: trivial range queries; Cons: hot spots on sequential inserts.
   - **Hash-based sharding**: Cryptographic or uniform hashing of the shard key (`hash(key) % N`). Pros: perfectly even distribution; Cons: scatter-gather scatter queries for range lookups.
5. **Operational trade-offs**: Backup duration scaling (parallel shard backups vs single monolithic backup), replication lag, and cross-shard query latency.

---

## 2. Interactive Demonstrations & Fragment Hash Routing

The bundle mounts in `#app` and binds to the container element matching the URL fragment.

| Fragment Hash                       | Section / Title     | Visual Type         | Renderer & Description                                                               |
| :---------------------------------- | :------------------ | :------------------ | :----------------------------------------------------------------------------------- |
| `#sharding-no-proxy-1-0-1`          | Single database     | Architecture SVG    | Application server directly querying a single primary database                       |
| `#sharding-duration`                | Query duration      | Interactive Chart   | Query latency and throughput curves as table volume grows past RAM limits            |
| `#sharding-no-proxy-1-0-2`          | Monolith bottleneck | Architecture SVG    | Multiple app servers overwhelming a single database server's connection limit        |
| `#sharding-1-1-2`                   | 2 Shards with proxy | Architecture SVG    | App server communicating with a Query Router directing traffic to 2 shards           |
| `#sharding-1-1-3`                   | 3 Shards with proxy | Architecture SVG    | Scaling out to 3 shards with router balancing load                                   |
| `#sharding-1-1-4`                   | 4 Shards with proxy | Architecture SVG    | Topology with 4 shards showing linear capacity increase                              |
| `#sharding-1-3-4`                   | Distributed apps    | Architecture SVG    | Multi-application server cluster querying through a distributed routing layer        |
| `#sharding-range-id-1-2-4`          | Range sharding: ID  | Data Flow SVG       | Range partitioning on integer ID (`1..250` → S1, `251..500` → S2, etc.)              |
| `#sharding-range-name-1-2-4`        | Range: Name         | Data Flow SVG       | Alphabetical range partitioning (`A-F` → S1, `G-M` → S2, `N-S` → S3, `T-Z` → S4)     |
| `#sharding-range-age-1-2-4`         | Range: Age skew     | Data Flow SVG       | Range partitioning highlighting severe data skew on uneven demographic distributions |
| `#sharding-hash-name-1-2-4`         | Hash sharding: Name | Data Flow SVG       | Consistent hash distribution on string names ensuring balanced shard allocation      |
| `#sharding-hash-id-1-2-4`           | Hash sharding: ID   | Data Flow SVG       | Hash hashing on auto-increment IDs eliminating sequential hot spotting               |
| `#sharding-steps-range-steps-1-2-4` | Range lookup steps  | Interactive Stepper | Step-by-step query evaluation showing router routing single-shard queries            |
| `#sharding-steps-hash-id-1-2-4`     | Hash lookup steps   | Interactive Stepper | Step-by-step evaluation showing hash calculation and direct single-shard dispatch    |
| `#sharding-latency-app-db`          | Direct latency      | Timeline Bar        | Round-trip latency for direct app-to-database communication                          |
| `#sharding-latency-app-proxy-shard` | Proxy latency       | Breakdown Bar       | Latency decomposition showing router hop overhead (<1ms) vs query execution time     |
| `#sharding-replicating`             | Shard replication   | Animated Topology   | Primary and replica clusters per shard maintaining local high availability           |
| `#sharding-backup-1`                | Monolith backup     | Progress Bar        | Slow sequential backup of a 4TB single database taking 8+ hours                      |
| `#sharding-backup-4`                | Parallel backups    | Progress Bar        | Concurrent parallel backup of 4 × 1TB shards completing in 2 hours                   |

---

## 3. Implementation Details

- **Rendering**: Clean, crisp SVG architecture diagrams with smooth CSS transition effects on data paths.
- **Topology Visuals**: Standardized server, router, and database disk glyphs matching PlanetScale's brand design language.
- **Color Coding**: Disks and shards are color-coded to visually differentiate partitions and route assignments.
- **Replication**: Use `VendoredDemoFigure` pointing to `/vendor/planetscale/database-sharding/index.html#<hash>`.
