# What is a Data Topology: Visualizations and Architecture

This reference describes how the diagrams and architectural visualizations in PlanetScale's **"What is a Data Topology?"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/what-is-a-data-topology`
- **Vendored vector assets location**: `.agents/skills/planet-scale-animation-design-system/references/what-is-a-data-topology/svgs/`
- **Served public path**: `/vendor/planetscale/what-is-a-data-topology/`

---

## 1. Overview and Topics Covered

Unlike the canvas and interactive iframe-driven posts, this article uses high-fidelity, dual-theme vector SVGs to articulate the architecture of **Neki** (PlanetScale's distributed PostgreSQL query routing proxy):

1. **The Data Topology JSON Definition**: The formal declarative JSON configuration schema defining keyspaces, sharding keys, hashing algorithms, and physical shard mappings.
2. **Neki Router Routing Architecture**: How stateless query routers intercept incoming client PostgreSQL wire protocol connections, inspect the SQL AST, consult the in-memory data topology, and dispatch to individual shard backends.
3. **Shard Index Routing**: Direct shard indexing using lookup tables and secondary index lookups for cross-shard operations.

---

## 2. Vendored Vector Asset Inventory

All SVGs have been vendored with both light mode and dark mode variants, preserving exact typography, vector geometry, and high-DPI scaling:

| File Name                                                | Theme | Description                                                                                |
| :------------------------------------------------------- | :---- | :----------------------------------------------------------------------------------------- |
| `data-topology-json-CCh5Wtoi.svg`                        | Light | Visual syntax-highlighted code card illustrating the declarative Data Topology JSON schema |
| `data-topology-json-darkmode-CSBdTDxQ.svg`               | Dark  | Dark mode variant of the Data Topology JSON card with dark background and syntax tokens    |
| `neki-router-data-topology-shards-BJvkLSGa.svg`          | Light | Architecture flowchart: Application → Neki Router (Topology) → Shard 1 / Shard 2 / Shard 3 |
| `neki-router-data-topology-shards-darkmode-DzeXwqJn.svg` | Dark  | Dark mode variant of the Neki Router architecture flowchart                                |
| `shard-index-routing-Bde5tmWH.svg`                       | Light | Secondary index routing diagram showing query dispatch through an index table to shards    |
| `shard-index-routing-darkmode-Dt8K1rWM.svg`              | Dark  | Dark mode variant of the shard index routing diagram                                       |

---

## 3. Styling and Design Tokens

The SVGs utilize PlanetScale's brand design system:

- **Typography**: Inter and JetBrains Mono fonts embedded as vector paths / clean text blocks.
- **Accents**: PlanetScale Orange (`#F35815`), crisp border outlines (`#E5E5E5` in light, `#2A2A2A` in dark), and translucent background fills.
- **Responsive Embed**:
  Embed natively via responsive `<picture>` tags to automatically toggle between light and dark modes:

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
    alt="Neki router data topology routing"
    width="900"
    height="450"
  />
</picture>
```
