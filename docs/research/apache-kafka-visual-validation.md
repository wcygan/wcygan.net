# Kafka draft visual validation — October 2, 2026

Rebuilt as twelve beginner lessons: six 2D figures (event record, service outage, consumer groups, checkpoints/replay, retention/compaction, Streams/Connect pipeline) and six independently controlled 3D scenes (retained log, keyed routing, hot key, broker placement, backlog, replication).

Inspected every figure in the actual MDX article at 1440×900 and 390×844. Both viewports have no page overflow; mobile scroll width is 390px. All twelve semantic figures have exactly one authored stage. Every button and select is at least 44px high. Dark backgrounds, dashed attached flow arrows, semantic colored records, upright labels, and captions are present. Fixed-capacity backlog geometry keeps existing records in place when a new event arrives.

Exercised publish, outage recovery, all six keyed sends, independent Billing reads, four-member group assignment (one idle), backlog production/processing, checkpoint restart, compaction, leader failure, balanced-key comparison, three-broker placement, and all three pipeline totals ($42 → $60 → $133). Reduced-motion emulation preserved manual state and camera controls. No console errors were observed. All twelve demos now autoplay a finite sequence on entering the viewport, then settle. Play/Pause and Replay are outside the stage; manual domain controls take ownership. Offscreen or hidden pages suspend progress, and reduced motion uses explicit steps. 3D records, readers, and partition leaders move smoothly with demand rendering. WebGL fallback and camera/simulation separation are covered by component tests.

Kafka's focused suite passes 55 tests across five files, covering first-frame readiness, finite completion, visibility pauses, user pauses, replay, manual takeover, reduced motion, and camera independence. The final `bun run pre-commit` passes: typecheck plus 1,130 tests across 137 files. Production build passes and omits the draft route.

Autoplay was exercised in the rendered article: routing reached six records, the pipeline reached $133, backlog production caught up, reduced motion stayed still until Next step, and a paused routing demo remained at step zero while another demo ran. Playback controls fit the mobile reading column and retain 44px touch targets. Desktop checked at 1440×900; this autoplay pass used a 389×843 CSS viewport on mobile because the browser is at 67% zoom (the earlier layout pass used 390×844). No horizontal overflow. Camera controls remain usable during playback and domain actions preserve the camera pose.

Palette and contrast evidence: [complete before/after inventory](./apache-kafka-palette.md).

Preview: https://kafka-draft-preview.localhost/apache-kafka
