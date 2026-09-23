---
name: 3d-benchmark-harness
description: Run, record, or compare local development first-frame benchmarks for the wcygan.net article demos built with SceneCanvas.
---

# 3D Benchmark Harness

Use the shared harness to measure first-frame readiness for the article's
Three.js demos. The benchmark records the local development scenario; it is not
a production performance budget or a GPU draw-time profile.

## Run a recording

1. Read [`benchmarks/3d/README.md`](../../../benchmarks/3d/README.md) for the
   current metric and run options. Inspect `deno.json` and
   `scripts/benchmark-3d-demos.ts` if the task depends on a command, output
   schema, or coverage detail.
2. Run the repository's `benchmark:3d` task from the project root. Allow the
   warmup and every requested sample to finish; a partial or failed run is not
   a baseline.
3. Confirm a new JSON file was written under `benchmarks/3d/runs/`. Check its
   scene set, sample count, route coverage, and `pendingStages` validation before
   reporting measurements. Preserve earlier run files; each recording is an
   append-only observation.
4. Report the scenario, browser, viewport, GPU, sample count, and each scene's
   median. Link the JSON file so raw samples and the source fingerprint remain
   available. Do not commit or publish observations unless the user requests
   that action.

## Coverage

The runner discovers article routes from `src/posts/*.mdx`, including drafts,
then renders those routes and activates their lazy scenes. A new demo is
automatically included when an article mounts it through `SceneCanvas` with a
unique, stable `sceneId`. A component that exists in source but is not mounted
from an article is outside the recording; identify that gap rather than
reporting it as measured.

If a scene is unexpectedly missing, check the article's MDX imports and usage,
its `SceneCanvas` `sceneId`, and whether its route and lazy activation complete
in the run. Treat changed scene coverage or a pending stage as a failed
recording; do not compare a partial scene set as if it were complete.

## Interpret and compare

The interval begins in the `SceneCanvas` client effect, before WebGL capability
detection. It ends after React Three Fiber's first frame and the following
`requestAnimationFrame`. It includes capability detection and renderer setup,
but begins after the lazy scene module has loaded. `ready` and `unavailable` are
distinct outcomes; preserve the outcome when interpreting a result.

Compare per-scene medians and raw samples only across runs with matching scene
IDs and comparable scenarios. Check browser version, viewport, device scale,
GPU, sample count, revision, and working-tree fingerprint for confounders.
Keep different machines or browser/GPU configurations as separate baselines;
do not combine scene timings into one site-wide score.

The timing entries are visible in the browser Performance timeline as
`3d-demo:<sceneId>:<outcome>`. They locate the first-frame interval, but do not
explain time spent inside it. Use a separate browser trace or profiler when a
task asks where that time is spent; do not describe this benchmark as a flame
graph or stage-level profile.
