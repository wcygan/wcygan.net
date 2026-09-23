# 3D demo performance reference

Use this reference when profiling or optimizing the load and first render of an
article's Three.js scene. It records measured results from the Embeddings draft
page; treat development-server numbers as local diagnostics, not production
budgets.

## Embeddings: what was expensive

The City Coordinates globe originally generated deterministic land point
buffers in the browser. Profiling attributed about **1.32 seconds** to that
generation. Sampling the same geography during the build and shipping
quantized, generated positions reduced client decode-and-scale work to about
**1.3 milliseconds** in the profile, roughly **99.9% less geometry-generation
CPU**. The generated file is reproducible with `deno task generate:embedding-land`
and refreshed by `deno task build`. Keep the source geography data authoritative
and verify generated output against it.

This is the useful pattern for deterministic geometry: profile first, move
expensive derivation to the build, and keep only decoding and interactive
rendering in the browser. Do not infer total page speed from a CPU profile of
one operation.

## First-frame and WebGL setup

`SceneCanvas` marks a scene ready after Fiber runs a frame and a following
`requestAnimationFrame` callback. The readiness time therefore includes the
first drawn frame. It does not isolate GPU draw time: module loading and
evaluation, renderer setup, shader compilation, and other browser work happen
before that signal.

The shared WebGL2 capability check is cached for the page. Instrumentation in
React development mode showed the three Embeddings scenes creating six
temporary capability-probe contexts before the cache; after the change they
create one probe context, plus the same three real renderers. This removes
duplicate detection work but has not been shown to reduce end-to-end latency.

## Development module graph measurements

On a fresh local development load at **1280×720, DPR 1**, the earlier browser
trace recorded **250 resource entries** and **9,106,623 transferred bytes**.
That is 8.69 MiB (often rounded to “8.6 MB”), made up of about 7.97 MB of
JavaScript/modules, 825 KB of CSS, 16 KB of images, and 296 KB of other
resources. The document load event was about 204 ms; all three scenes reached
their first ready frames at about 1.64 seconds.

The request count came from Vite's development module graph, not a browser
request limit. The blog index eagerly imported compiled MDX to derive metadata,
which pulled unrelated article and demo modules into the page. The total also
included development dependencies and source modules; it was not a production
download or a measure of public-site bandwidth.

The blog index now reads metadata without eagerly importing every MDX module,
and draft MDX modules load only when their route opens. A fresh trace against
`https://wcygan.localhost/embeddings`, at the same viewport and DPR, recorded:

| Measure                        |       Before |        After |
| ------------------------------ | -----------: | -----------: |
| Resource entries               |          250 |          160 |
| Transferred bytes              |    9,106,623 |    9,135,867 |
| All three scenes' first frames | about 1.64 s | about 1.52 s |

The request count fell by 36%, while transferred bytes were effectively flat
(about 0.3% higher). The one-run first-frame result was about 120 ms faster, but
that is too small to claim a reliable end-to-end improvement without repeated
matched runs. The new graph contains the Embeddings post and its scene modules,
not unrelated public posts or hotdog frame data.

The first-frame signal was about one second after the document load event in
the newer trace. That interval is the next useful target to break down into
lazy scene-module loading/evaluation, WebGL renderer setup, and first draws.
Geometry generation is no longer a meaningful contributor. A shared renderer
could be explored if measurements show that three separate Canvas renderers
dominate; do not introduce that architectural change based on request count
alone.

## Production boundary and measurement rules

Embeddings is currently `embeddings.draft.mdx`, so the production build excludes
the route. The build prerenders the 25 public routes; it cannot yet provide a
production payload or first-frame measurement for Embeddings. Vite development
module counts and byte totals must not be presented as production transfer size.

For future comparisons, keep browser, route, viewport, DPR, cache state, origin,
and build mode matched. Report document timing, each scene's first-frame timing,
resource count, and transferred bytes separately. Repeat cold and warm runs;
do not call a count of resource entries a connection count, and do not infer
GPU render duration from the first-frame timestamp alone.
