# B-trees and Database Indexes: Visualizations and Architecture

This reference describes how the animations, diagrams, and interactive simulations in PlanetScale's **"B-trees and Database Indexes"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/btrees-and-database-indexes`
- **Vendored bundle location**: `.agents/skills/planet-scale-animation-design-system/assets/btrees-and-database-indexes/`
- **Served public path**: `/vendor/planetscale/btrees-and-database-indexes/`
- **Bundle entrypoint**: `iframe-C-dQmWZC.js` (with preloaded `modulepreload-polyfill-B5Qt9EMX.js`, `timer-DWAvo6M8.js`, `transform-tHp9KnZo.js`, `line-CEF1yL-R.js`, `quad-DIO_O7IL.js`, and stylesheets `iframe-B9fV42kC.css`, `styles-CWGXrFsx.css`)

---

## 1. Overview and Topics Covered

The article explores tree data structures that power modern relational database storage engines (MySQL InnoDB, PostgreSQL heap & btree indexes):

1. **Binary Search Trees vs B-trees**: Why binary trees fail for disk-based storage (excessive tree depth, small node size causing multiple disk reads).
2. **B-tree mechanics**: Multi-way search trees with high branching factor (fanout), storing keys and data pointers in both internal and leaf nodes.
3. **B+Tree architecture**: Distinguishing internal nodes (routing keys only) from leaf nodes (all data pointers), and doubly-linked leaf nodes for fast range scans.
4. **Tree growth and splits**: Inserting keys into full nodes, triggering splits, and escalating splits up the tree to the root.
5. **Primary Key selection**: The dramatic difference between sequential primary keys (auto-increment / BIGINT) vs random primary keys (UUIDv4) on page splits, fragmentation, and buffer pool efficiency.

---

## 2. Interactive Demonstrations & Fragment Hash Routing

The bundle mounts in `#app` and binds to target elements via fragment ID.

| Fragment Hash                        | Section / Title     | Visual Type      | Renderer & Description                                                                 |
| :----------------------------------- | :------------------ | :--------------- | :------------------------------------------------------------------------------------- |
| `#btree`                             | What is a B-tree?   | Interactive Tree | Live B-tree explorer where users can insert keys, delete keys, and observe node splits |
| `#btree-speed-adjuster`              | B-tree animation    | Control Bar      | Speed adjustment slider controlling tree mutation playback speed                       |
| `#btree-search`                      | B-tree search       | Step Visualizer  | Step-by-step key search traversing internal nodes down to target key                   |
| `#bplustree`                         | The B+Tree          | Interactive Tree | Live B+tree visualizer showing routing-only internal nodes and linked leaf nodes       |
| `#bplustree-search`                  | B+tree search       | Step Visualizer  | Search traversal showing how lookups always navigate to the leaf level                 |
| `#bplustree-depth-line`              | B+tree depth        | Depth Chart      | Tree depth vs record count demonstrating how 4 levels can index billions of rows       |
| `#bplustree-random`                  | Random inserts      | Live B+tree Sim  | Simulation of UUID / random inserts causing frequent node splits and 50% page fill     |
| `#bplustree-sequential`              | Sequential inserts  | Live B+tree Sim  | Simulation of auto-increment inserts filling pages to 93% without intermediate splits  |
| `#bplustree-insert-bar-chart`        | Insert comparison   | Comparative Bar  | Side-by-side comparison of page split frequency for sequential vs random inserts       |
| `#bplustree-inserts-nodes-visited`   | Nodes visited       | Comparative Bar  | Comparison of pages read and written per insert operation                              |
| `#bplustree-random-range-search`     | Range on random     | Scan Visualizer  | Range scan across fragmented pages requiring multiple random disk seeks                |
| `#bplustree-sequential-range-search` | Range on sequential | Scan Visualizer  | Range scan traversing contiguous leaf nodes via the linked leaf chain                  |
| `#bplustree-key-size-large`          | Large key size      | Node Geometry    | Visualizing large composite / UUID keys reducing fanout per 16KB InnoDB page           |
| `#bplustree-key-size-small`          | Compact key size    | Node Geometry    | Visualizing 4-byte / 8-byte integer keys maximizing fanout and minimizing depth        |

---

## 3. Implementation Details

- **Rendering Engine**: Dynamic SVG node graphs connected by SVG bezier curves, with real-time recalculation of tree node layouts upon insertions and deletions.
- **Data Structure Implementation**: Contains a complete in-memory JavaScript implementation of B-tree and B+tree data structures supporting arbitrary branching orders (`t` parameter).
- **Interactive Tree Controls**: Users can type custom keys, click random insertion generators, step through search algorithms, and alter the leaf / inner node capacities.
- **Replication**: Use `VendoredDemoFigure` pointing to `/vendor/planetscale/btrees-and-database-indexes/index.html#<hash>`.
