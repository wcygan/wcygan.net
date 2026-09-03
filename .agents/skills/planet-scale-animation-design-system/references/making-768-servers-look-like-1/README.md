# Making 768 Servers Look Like 1: Visualizations and Architecture

This reference describes how the animations, diagrams, and interactive simulations in PlanetScale's **"Making 768 Servers Look Like 1"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/making-768-servers-look-like-1`
- **Vendored bundle location**: `.agents/skills/planet-scale-animation-design-system/assets/making-768-servers-look-like-1/`
- **Served public path**: `/vendor/planetscale/making-768-servers-look-like-1/`
- **Bundle entrypoint**: `iframe-D6gXH5Cl.js` (with preloaded `index-Brfk6Bdo.js`, `modulepreload-polyfill-B5Qt9EMX.js`, and `styles-CWGXrFsx.css`)

---

## 1. Overview and Topics Covered

The article explains the architecture used to manage massive distributed PostgreSQL clusters (768 physical servers) presenting as a single unified logical endpoint to application code:

1. **The Server Matrix**: High-density 768-server cluster visualizer rendering a grid of active server nodes.
2. **Growing Pains**: The limits of vertical scaling, primary/replica read scaling, and replication lag bottlenecks.
3. **Universal Scalability Law (USL)**: Gunther's USL model explaining how concurrency contention ($\alpha$) and coherency overhead ($\beta$) cause throughput to degrade under high server counts.
4. **Primary and Replicas**: Write-throughput bottlenecks on the single primary instance.
5. **Connection Pooling at Scale**: PgBouncer vs native server connection pools and memory consumption per connection.
6. **Query Routing & Shard Formation**: Vitess/Neki routing proxies analyzing SQL parse trees, resolving keyspaces, and routing queries directly to designated target shards.

---

## 2. Interactive Demonstrations & Fragment Hash Routing

The bundle mounts in `#app` and matches against its internal map of visualizer classes:

```javascript
const ti = {
  servers: Jt,
  "shard-formation": Kt,
  "primary-replicas": Yt,
  sharding: Xt,
  "simple-sharded": qt,
  "tons-of-shards": _t,
  "shard-inserts": Zt,
  "proxy-plan": zt,
  pgbouncer: Ut,
  "full-sharded": jt,
  "universal-scalability-law": Qt,
  "popular-arch": Vt,
};
```

| Fragment Hash                | Section / Title      | Visual Type        | Renderer & Description                                                                        |
| :--------------------------- | :------------------- | :----------------- | :-------------------------------------------------------------------------------------------- |
| `#servers`                   | The 768 cluster      | Canvas 2D          | Grid simulation of 768 individual database servers rendering active ping states               |
| `#popular-arch`              | Popular architecture | Architecture SVG   | Standard monolithic web stack: Load Balancer → Web App → Primary DB + Replicas                |
| `#universal-scalability-law` | USL Curve            | Dynamic SVG / GSAP | Animated USL curve comparing linear scaling vs contention slowdown vs coherency decline       |
| `#primary-replicas`          | Read/write split     | Architecture SVG   | Flow diagram highlighting write bottleneck: all `INSERT`/`UPDATE` queries hitting one primary |
| `#sharding`                  | Sharded layout       | Architecture SVG   | Basic sharded layout splitting rows across multiple independent master databases              |
| `#tons-of-shards`            | Scaled shards        | Grid SVG           | Visual representation of dozens of shards scaling horizontal write throughput                 |
| `#simple-sharded`            | Direct app routing   | Flow SVG           | Complex application code having to maintain multiple database connection strings              |
| `#pgbouncer`                 | Connection poolers   | Architecture SVG   | Multiple PgBouncer instances placed before shards to protect server process memory            |
| `#shard-inserts`             | Shard insert routing | Flow SVG           | Inserting rows into specific shards based on hash modulus calculations                        |
| `#proxy-plan`                | Query Proxy planner  | Step Visualizer    | Intelligent routing proxy parsing SQL query, checking schema metadata, and dispatching        |
| `#full-sharded`              | Full architecture    | Complete Topology  | Full production topology: App Layer → Routing Proxies → Shards with Primaries & Replicas      |
| `#shard-formation`           | Shard expansion      | Animated Layout    | Dynamic resharding animation showing data splitting into smaller shard ranges                 |

---

## 3. Implementation Details

- **Rendering Engine**: Hybrid high-performance Canvas 2D (used for the 768-server dot matrix and real-time activity) alongside vector SVG layouts driven by GSAP timeline animations for topological flows.
- **USL Math Engine**: Implements the Universal Scalability Law equation:
  $$X(N) = \frac{\gamma N}{1 + \alpha(N - 1) + \beta N(N - 1)}$$
  annotating the transition points where contention slows scaling and coherency causes throughput collapse.
- **Replication**: Use `VendoredDemoFigure` pointing to `/vendor/planetscale/making-768-servers-look-like-1/index.html#<hash>`.
