# Bundle inventory

Observed structure of each vendored bundle (DOM inspection + grep of the
served minified source, 2026-09).

## 1. lock-queue — `iframe-BxfYI-2n.js`

- **Source**: `planetscale.com/blog/debugging-live-database-connections/iframe`
- **Renderer**: SVG built at runtime. `svg.brand-diagram-svg.compact`
  viewBox `0 0 1054 1203`; per row `i`: `clipPath id="conn-clip-i"`
  (`rect x=16 y=16+i·Δ w=1022 h=94.7`) plus `conn-fill-i` for the progress
  fill. Rows slide in; waiting rows staircase right with dashed elbow
  connectors.
- **States**: `working → error → stuck → releasing`; labels
  `WORKING/ERROR/WAITING/RELEASING`; role colors `gray/red/yellow/green`
  (dark palette: red `#FF455D`, yellow `#F2B600`, green `#27B648`).
- **Cycle**: 14s (`14e3`), auto-restart; stuck window a few seconds wide and
  randomized per run.
- **Content**: 19 SQL strings, fixed error query
  `SELECT * FROM orders WHERE id = 123`, alter
  `ALTER TABLE orders ADD foo integer`.
- **Layout constants**: desktop canvas 1504×752, compact 1203 tall, row height ≈ 94.7, gutter 16.

## 2. concurrency — `iframe-A02iGTt6.js`

- **Source**: `planetscale.com/blog/doing-more-with-less/iframe`; demo chosen by
  `location.hash` (`#junction` default, `#usl-curve`, `#before-after`).
- **Renderer**: Canvas 2D, device-pixel scaled 2×
  (`canvas.brand-diagram-canvas`, e.g. `width=2400 height=760` at
  `height: 380px`), rAF loop with `dt = Math.min(0.05, …)`.
- **Junction sim**: `spawnTimes`/`doneTimes` ring buffers, 3s rolling window;
  `throughput() = doneTimes.length/3`, `offeredRate() = spawnTimes.length/3`, latency = mean of `latencies`; per-request flash
  decays `max(0, flash − 2.2·dt)`. Chart sample pushed every 0.25s as
  `{t, off, tp, rt}`; columns ARRIVALS / COMPLETED / LATENCY.
- **USL curve**: $X(N) = \gamma N / (1 + \alpha(N-1) + \beta N(N-1))$; sliders for $\alpha$
  (Contention) and $\beta$ (Coherency); NMAX marker where the curve peaks; axis auto-scaled.
- **Controls**: `input[type=range].blog-styled-range` with dashed-track CSS and
  `.brand-diagram-control-label` text (JetBrains Mono, uppercase).

## 3. processes-and-threads — `iframe-DRKIPuh6.js`

- **Source**: `planetscale.com/blog/processes-and-threads/iframe`
- **Routing**: `document.URL.split("#")[1]` mounts container `<div data-id="..."></div>` inside `#app`. Components observe target matching `[data-id="..."]`.
- **Renderer**: Dynamic SVG assembled at runtime via DOM operations, GSAP timeline sequencing, and D3 math interpolators.
- **Key Demos**:
  - `#pat-display-title`: Animated headline typing effect using GSAP.
  - `#pat-cpu`: Register file (`$0`, `$1`, `$2`), program counter, ALU.
  - `#pat-ram`: Address space grid (`0x00`-`0x0F`) showing memory cell mutations.
  - `#pat-cpu-ram-simple` & `#pat-2-simple`: Step-by-step instruction execution stepping through assembly.
  - `#pat-context-switcher`: Interactive context switch visualizer with save/restore state costs.
  - `#pat-process-states`: FSM state diagram (`NEW`, `READY`, `RUNNING`, `WAITING`, `TERMINATED`).
  - `#pat-fork` & `#pat-fork-exec`: Tree graph animation of process cloning and address space replacement.
  - `#pat-sum-threads`: Parallel array partitioning across POSIX threads.
  - `#pat-connection-pooling`: Database connection pool simulation comparing thread-per-connection vs pooled workers.

## 4. caching — `iframe-DB2zOhbH.js`

- **Source**: `planetscale.com/blog/caching/iframe`
- **Routing**: Fragment hash mount (`document.URL.split("#")[1]`).
- **Renderer**: Hybrid Canvas 2D and dynamic SVG.
- **Key Demos**:
  - `#cache-0`: Request flow App → Cache → Storage.
  - `#postgres-toggle`: Interactive switcher comparing MySQL buffer pool vs Postgres shared buffers.
  - `#cache-hit` & `#cache-miss`: Animated request lifecycle and penalty paths.
  - `#cache-hr-low` & `#cache-hr-high`: Slider-driven hit ratio simulation (50% vs 99%) with real-time origin saturation meters.
  - `#karpathy-tweet-simulator`: Viral workload simulator modeling traffic spikes and stampede mitigation.
  - `#spatial-locality`: Memory word prefetching into contiguous cache lines.
  - `#geo-1` & `#geo-2`: Canvas-based world map demonstrating single-region vs global edge cache latency.
  - `#lifo-policy`, `#lru-policy`, `#time-aware-lru-cache`: Interactive queue/stack eviction visualizers.

## 5. io-devices-and-latency — `iframe-DCKehAfE.js`

- **Source**: `planetscale.com/blog/io-devices-and-latency/iframe`
- **Routing**: Fragment hash mount (`document.URL.split("#")[1]`).
- **Renderer**: Dynamic vector SVG driven by D3 transformation modules (`transform-tHp9KnZo.js`) and high-precision timing (`timer-DWAvo6M8.js`).
- **Key Demos**:
  - `#io-tape`, `#io-tape-fast`, `#io-tape-slow`: Mechanical dual-reel magnetic tape drive with physical ribbon movement and seek latency.
  - `#io-hdd`, `#io-hdd-io-fast`, `#io-hdd-io-slow`: Multi-platter spinning disk with rotating sectors and swinging actuator arm.
  - `#io-ssd`, `#io-ssd-lines-fast`, `#io-ssd-lines-slow`: NAND flash silicon architecture, word line charging, and high-voltage block erasures.
  - `#io-ssd-gc-fast`, `#io-ssd-gc-slow`: Write amplification and garbage collection mechanics.
  - `#io-latency-tape-hdd`, `#io-latency-hdd-ssd`, `#io-latency-memory-local-ssd`: Logarithmic human-scale latency comparison bars.

## 6. database-sharding — `iframe-BUj6wNLP.js`

- **Source**: `planetscale.com/blog/database-sharding/iframe`
- **Routing**: Fragment hash mount (`document.URL.split("#")[1]`).
- **Renderer**: Modular vector architecture SVGs with animated route highlights.
- **Key Demos**:
  - `#sharding-no-proxy-1-0-1` & `#sharding-no-proxy-1-0-2`: Monolithic connection bottlenecks.
  - `#sharding-1-1-2`, `#sharding-1-1-3`, `#sharding-1-1-4`: Horizontal scale-out to 2, 3, and 4 shard topologies.
  - `#sharding-range-id-1-2-4`, `#sharding-range-name-1-2-4`, `#sharding-range-age-1-2-4`: Range sharding strategies and hotspot skew.
  - `#sharding-hash-name-1-2-4`, `#sharding-hash-id-1-2-4`: Uniform hash distribution eliminating hotspots.
  - `#sharding-steps-range-steps-1-2-4` & `#sharding-steps-hash-id-1-2-4`: Step-by-step query routing execution.
  - `#sharding-backup-1` vs `#sharding-backup-4`: Sequential monolithic backup vs parallel concurrent shard backups.

## 7. btrees-and-database-indexes — `iframe-C-dQmWZC.js`

- **Source**: `planetscale.com/blog/btrees-and-database-indexes/iframe`
- **Routing**: Fragment hash mount (`document.URL.split("#")[1]`).
- **Renderer**: Dynamic SVG graph layout engine with bezier connector lines and interactive tree manipulation.
- **Key Demos**:
  - `#btree`, `#btree-speed-adjuster`, `#btree-search`: Interactive B-tree explorer with custom insertion, deletion, and search stepping.
  - `#bplustree`, `#bplustree-search`: B+tree layout separating internal routing keys from linked leaf data chains.
  - `#bplustree-random` vs `#bplustree-sequential`: Live comparative simulations demonstrating page splits from UUID keys vs contiguous 93% page fill from auto-increment keys.
  - `#bplustree-insert-bar-chart` & `#bplustree-inserts-nodes-visited`: Node visitation and split frequency metrics.
  - `#bplustree-random-range-search` vs `#bplustree-sequential-range-search`: Leaf pointer scan performance vs fragmented random seeks.

## 8. making-768-servers-look-like-1 — `iframe-D6gXH5Cl.js`

- **Source**: `planetscale.com/blog/many-servers-appear-as-one/iframe`
- **Routing**: Internal routing dictionary `ti` dispatching to component classes based on hash fragment (defaults to `popular-arch`).
- **Renderer**: High-density Canvas 2D (768-server dot matrix) + animated vector SVG architectures with GSAP.
- **Key Demos**:
  - `#servers`: Real-time Canvas 2D rendering of 768 database nodes actively processing traffic.
  - `#universal-scalability-law`: Animated USL curve decomposing linear scaling, contention slowdown ($\alpha$), and coherency collapse ($\beta$).
  - `#popular-arch`, `#primary-replicas`: Primary write bottleneck in classic web tier architectures.
  - `#pgbouncer`: Connection pool proxying at large instance counts.
  - `#proxy-plan`, `#shard-inserts`, `#full-sharded`: Transparent query routing proxy architecture coordinating shards.

## 9. dealing-with-large-tables-in-postgres — `iframe-D_ySlzsB.js`

- **Source**: `planetscale.com/blog/dealing-with-large-tables-in-postgres/iframe`
- **Routing**: Direct hash router `(location.hash || "#tables").slice(1)`.
- **Renderer**: Dynamic SVG block schemas and animated timelines.
- **Key Demos**:
  - `#tables`: Size comparison between standard tables and multi-billion-row tables.
  - `#vacuum`: Autovacuum starvation where a single giant table never finishes vacuuming.
  - `#repack`: Disk space explosion (2× table size) during `pg_repack` operations.
  - `#connections`: Connection pool saturation caused by long-running sequential table scans.
  - `#backups`: Escalating backup and recovery time windows.
  - `#indexes`: Index memory footprints exceeding RAM and buffer pools.
  - `#wide`: TOAST table fragmentation on wide table rows.

## 10. what-is-a-data-topology — Vector SVGs

- **Source**: `planetscale.com/blog/what-is-a-data-topology`
- **Type**: Dual-theme (light and dark mode) high-fidelity vector diagrams.
- **Served path**: `/vendor/planetscale/what-is-a-data-topology/`
- **Assets**:
  - `data-topology-json-CCh5Wtoi.svg` & `data-topology-json-darkmode-CSBdTDxQ.svg`: Syntax-highlighted Data Topology declarative JSON specification.
  - `neki-router-data-topology-shards-BJvkLSGa.svg` & `neki-router-data-topology-shards-darkmode-DzeXwqJn.svg`: Neki routing proxy query dispatch topology.
  - `shard-index-routing-Bde5tmWH.svg` & `shard-index-routing-darkmode-Dt8K1rWM.svg`: Secondary index routing paths across distributed shards.

---

## Shared Foundation

- **Shell**: Vite module HTML, Google Fonts JetBrains Mono 500/700, `#app` div, transparent body.
- **Tokens**: `--diagram-bg`, `--diagram-fg`, `--diagram-accent` (`#F35815`), `--diagram-blue`, `--diagram-green`, `--diagram-red`, `--diagram-yellow`, `--diagram-connector`.
- **Styles**: `styles-CWGXrFsx.css` defines base styling, range inputs, and dark mode overrides.
