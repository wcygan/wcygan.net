# 3D first-frame benchmarks

Run `deno task benchmark:3d` from the repository root. The harness starts an
isolated Vite development server and a fresh headless Chrome profile, scans each
MDX article route (including drafts), and scrolls the article to activate
lazy-loaded scenes. `SceneCanvas` measurements are collected automatically, so a
new demo is included when it is mounted from an article and uses `SceneCanvas`
with a unique, stable `sceneId`.

The harness performs one unrecorded warmup pass over every article route, then
three measured passes over routes that contained a scene. To change the sample
count, use `deno task benchmark:3d --samples=5`. Chrome or Chromium must be
installed; set `CHROME_BIN` when it is not in a standard location.

Each run writes a new JSON file under `benchmarks/3d/runs/`. The file records
each raw sample, the median, browser version, fixed viewport and device scale,
route coverage, repository revision, and working-tree fingerprint. Commit run
files when you want to preserve their observations in Git; the harness never
overwrites earlier runs.

## Measurement

The measured interval starts in the `SceneCanvas` client effect, before WebGL
capability detection, and ends after Fiber's first frame and the following
`requestAnimationFrame` callback. This includes capability detection, renderer
setup, and first-frame readiness. It starts after the lazy scene module has
loaded and does not isolate GPU draw time. The harness records the warm local
development scenario only; it is not a production performance budget.

Timing entries also appear in the browser Performance timeline as
`3d-demo:<sceneId>:<outcome>`. Future stage profiling can extend this naming
scheme without changing the benchmark's first-frame outcome.
