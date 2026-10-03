# TiDB architecture research

Researched October 1, 2026 for `src/posts/tidb-architecture.draft.mdx`.
Scope: beginner introduction to TiDB Self-Managed, practical evaluation, local
experiments, and eight article figures. Sources use the v8.5 documentation;
commands pin v8.5.8.

## Evidence and writing boundaries

- TiDB, TiKV, and PD separate SQL, transactional storage, and coordination.
  TiFlash adds columnar replicas. [Architecture](https://docs.pingcap.com/tidb/stable/tidb-architecture/)
- MySQL protocol compatibility does not guarantee application compatibility.
  Stored procedures and triggers are unsupported.
  [Compatibility](https://docs.pingcap.com/tidb/stable/mysql-compatibility/)
- Regions are contiguous key ranges, each with a Raft group. Replica placement
  and Region partitioning are different operations.
  [TiKV overview](https://docs.pingcap.com/tidb/stable/tikv-overview/)
- PD supplies timestamps and placement metadata; it does not proxy row payloads.
  Rebalancing and recovery consume resources and time.
  [Scheduling](https://docs.pingcap.com/tidb/stable/tidb-scheduling/)
- Region-level Raft replication and cross-Region transaction atomicity are
  separate layers. The agreement figure illustrates classic Percolator-style
  two-phase commit, omitting optimized paths and failure recovery.
  [Transactions](https://docs.pingcap.com/tidb/stable/tidb-faq/#does-tidb-support-distributed-transactions)
- Snapshot isolation is not serializable and can allow write skew.
  [Isolation](https://docs.pingcap.com/tidb/stable/transaction-isolation-levels/)
- A non-covering secondary index can require a handle scan then a row lookup.
  [Index plans](https://docs.pingcap.com/tidb/stable/explain-indexes/)
- TiFlash learners replicate asynchronously, do not vote in TiKV quorum, and
  validate replication progress for consistent reads. Replica creation is
  opt-in by table; engine choice depends on the plan.
  [TiFlash](https://docs.pingcap.com/tidb/stable/tiflash-overview/)
- Extra nodes cannot automatically remove a hot-key or sequential-range bottleneck.
  [Hotspots](https://docs.pingcap.com/tidb/stable/troubleshoot-hot-spot-issues/)

The use cases and the preference for a simpler database when one machine is
sufficient are architectural judgments to evaluate, rather than measured results
or vendor guarantees. The figures use conceptual keys, placements, and timings.
The pre-existing 3D request scene has five voting replicas; the new quorum
example has three and says so explicitly.

## Local experiment

[TiUP quick start](https://docs.pingcap.com/tidb/stable/quick-start-with-tidb/),
[Playground](https://docs.pingcap.com/tidb/stable/tiup-playground/), and
[v8.5.8 release](https://docs.pingcap.com/tidb/stable/release-8.5.8/)
support the pinned disposable lab. The MySQL client needs `--comments` to retain
optimizer hints. One TiKV process is intentionally enough for query exploration;
it cannot establish failover or production performance. Larger local topologies
recommend at least 10 GiB RAM and four CPU cores. TiFlash has CPU/platform
requirements: [requirements](https://docs.pingcap.com/tidb/stable/hardware-and-software-requirements/).

Wait for `AVAILABLE = 1` before requesting TiFlash, and check `SHOW WARNINGS`
after hints. [Replica creation](https://docs.pingcap.com/tidb/stable/create-tiflash-replicas/),
[optimizer hints](https://docs.pingcap.com/tidb/stable/optimizer-hints/).
The original six-row SQL dataset totals five paid orders / 235.00 after the
update, plus one cancelled order / 15.00. It teaches engine selection, not speed.

The database lab was researched but not executed. TiUP and the MySQL client
were unavailable in this workspace. No database services were installed.
Website checks and rendered evidence are recorded separately when complete.

## Initial website verification (superseded by the dark demo overhaul)

- Eight authored figures: six new 2D explanations and two existing 3D demos.
  Every figure has one stage, and the article has one `h1`.
- New figures inspected at 1440×900 and 390×844, with 644px/342px figure widths
  and no article page overflow. Range/query states, quorum and scaling states
  have persistent explanations and controls of at least 44px.
- The agreement diagram's long labels and inherited list size were corrected
  after mobile inspection. Representative screenshots are under
  `/tmp/tidb-{layers,regions,query}-{desktop,mobile}.png` and
  `/tmp/tidb-agreement-mobile-repaired.png`.
- The hands-on code blocks use visible 44px copy controls. Their canonical Shiki
  styles reserve space above the first line; the retired generic `pre` rule now
  applies only to non-Shiki blocks. Copy activation worked in the article.
- `bun run pre-commit` passed in a clean copy of the tracked checkout plus this
  task's changes: 93 test files, 702 tests, formatting and typechecking.
- `bun run build` passed both in that isolated copy and in the active workspace.
  The production output excludes `/tidb-architecture`, as expected for a draft.
- The final active-workspace `bun run pre-commit` passed formatting,
  typechecking, and 119 test files / 867 tests. Earlier checks were blocked by
  unfinished imports in other concurrently edited articles. Concurrent editors'
  files were preserved.
- The active development article was rechecked after its preview recovered:
  eight figures, hydrated controls, one `h1`, 390px page/scroll width, 44px copy
  control height, and 64px code top padding.
- Both 3D scenes were inspected in the native in-app browser at 1440×900 and
  390×844 after Chrome screenshot capture stalled. The architecture's leader
  read and write/follower-recovery sequences reached finite terminal states.
  Keyboard orbit/zoom and Home reset changed the rendered view correctly.
- The index sequence returned row 427 / will@example.com / Will at snapshot 120. Mobile geometry, controls, and the settled result remained readable.
  Emulated reduced motion preserved both scenes and manual stepping reached
  their final read results. Media and viewport overrides were reset afterward.
- The shared code-control change was checked on `/`,
  `/talking-to-my-computer`, and `/change-data-capture` at both required sizes.
  All had no settled page overflow; code lines cleared the visible copy button.

## Dark demo overhaul — October 2, 2026

The draft now imports only `TidbLearningDemo`: ten newly authored lessons, five
2D and five orbitable 3D. See [the overhaul record](./tidb-visual-overhaul.md)
for the lesson selection, complete palette replacement table, contrast evidence,
and current validation. Earlier eight-figure verification above records the
previous implementation, not the current article.
