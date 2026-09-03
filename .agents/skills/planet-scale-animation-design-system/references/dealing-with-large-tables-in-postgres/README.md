# Problems with Large Tables in Postgres: Visualizations and Architecture

This reference describes how the animations, diagrams, and interactive simulations in PlanetScale's **"Dealing with Large Tables in Postgres"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/dealing-with-large-tables-in-postgres`
- **Vendored bundle location**: `.agents/skills/planet-scale-animation-design-system/assets/dealing-with-large-tables-in-postgres/`
- **Served public path**: `/vendor/planetscale/dealing-with-large-tables-in-postgres/`
- **Bundle entrypoint**: `iframe-D_ySlzsB.js` (with preloaded `modulepreload-polyfill-B5Qt9EMX.js`, Google Fonts JetBrains Mono, and stylesheet `styles-CWGXrFsx.css`)

---

## 1. Overview and Topics Covered

The article breaks down specific performance cliffs encountered in PostgreSQL as individual tables grow beyond hundreds of gigabytes or billions of rows:

1. **Autovacuum degradation**: Long-running vacuum workers falling behind table bloat; table freeze loops.
2. **Table repacking (`pg_repack`)**: Exclusive lock acquisition timeouts, massive disk space overhead (2× table size), and replication lag storms during repacks.
3. **Connection pool exhaustion**: Slow table scans holding client connections longer, triggering connection pooling timeouts upstream.
4. **Backup and Restore time**: RTO (Recovery Time Objective) expanding into days when restoring giant physical backups.
5. **Index bloat & memory pressure**: B-tree index sizes exceeding available `shared_buffers` / RAM, forcing every query to perform random disk IO.
6. **Wide tables & TOAST**: Out-of-line TOAST table storage causing multiple secondary reads for wide rows.

---

## 2. Interactive Demonstrations & Fragment Hash Routing

The bundle mounts directly in `#app` and selects the component using `location.hash` router function:

```javascript
function si() {
  const e = document.querySelector("#app");
  if (!e) return;
  const t = (location.hash || "#tables").slice(1);
  t === "vacuum"
    ? kn(e)
    : t === "partitioning"
      ? Tn(e)
      : t === "repack"
        ? Un(e)
        : t === "connections"
          ? ei(e)
          : t === "backups"
            ? Vn(e)
            : t === "indexes"
              ? ni(e)
              : t === "wide"
                ? ii(e)
                : Gn(e); // defaults to #tables
}
```

| Fragment Hash   | Section / Title        | Visual Type        | Renderer & Description                                                                         |
| :-------------- | :--------------------- | :----------------- | :--------------------------------------------------------------------------------------------- |
| `#tables`       | Introduction           | Comparative Bar    | Visual table row size comparison showing small tables vs massive multi-billion row table       |
| `#vacuum`       | Autovacuum             | Timeline Animation | Autovacuum running repeatedly on small tables while a single giant table vacuum never finishes |
| `#repack`       | pg_repack bloat        | Disk Block Grid    | Disk space explosion showing the original table alongside the transient copy during repack     |
| `#connections`  | Connection exhaustion  | Server Visualizer  | Slow sequential queries holding connections, resulting in connection pool queue backup         |
| `#backups`      | Backup duration        | Progress Timeline  | Time required to dump/restore small tables (minutes) vs 100TB table (days)                     |
| `#indexes`      | Index memory footprint | RAM vs Disk        | Index tree exceeding RAM capacity, causing cache misses and disk thrashing                     |
| `#wide`         | Wide tables / TOAST    | Data Block Schema  | Row fragmentation showing in-line fixed attributes vs out-of-line TOAST blocks                 |
| `#partitioning` | Table partitioning     | Partitioned Flow   | Splitting large monolithic table into manageable daily/monthly partitions                      |

---

## 3. Implementation Details

- **Rendering Engine**: Dynamic SVG timeline visualizers and block layout diagrams styled with JetBrains Mono 500/700 typography.
- **Color Token Integration**: Built directly against PlanetScale's `--diagram-*` tokens, with seamless light and dark mode responsiveness.
- **Replication**: Use `VendoredDemoFigure` pointing to `/vendor/planetscale/dealing-with-large-tables-in-postgres/index.html#<hash>`.
