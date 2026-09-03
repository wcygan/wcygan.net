---
name: wcygan-demo-replication
description: Replicate an external interactive demo or visualization on wcygan.net. Use when the user asks to copy, replicate, or reimplement a demo from a blog post, product page, or documentation; when a page embeds its demo in an iframe; when a first-pass reimplementation does not match the source's styling or animations; or when a demo's runtime artifact (rendered SVG, JS bundle) could be vendored instead of rebuilt.
---

# wcygan.net Demo Replication

Replicate one external demo at a time. The strategy is **source-first**: read
the real rendered demo in a testing browser before writing code, and let the
frame trace decide the representation — reimplement from scratch only when the
demo's own artifact cannot be vendored.

Load `$wcygan-editorial-diagrams` for the article shell, figure contract, and
verification bar. Load `$agent-browser` for the rendered work on both sides —
tracing the source and verifying the copy. Load `$wcygan-demo-migrations` when
replacing a first-pass demo that already exists in the repository.

## Steps

1. **Fetch the source page.** `read` the URL for prose and structure. Note
   which section carries the demo. Completion: the demo's hosting mechanism
   (iframe, inline component) is named, or confirmed absent.
2. **Trace to the demo surface.** If the prose references an iframe, fetch its
   `src` from the raw HTML and load that iframe URL directly in the browser —
   the parent page adds chrome and scroll. The iframe HTML is usually a thin
   Vite loader pointing at one JS bundle. Completion: the demo runs on screen
   in the testing browser.
3. **Frame trace.** Capture a dense burst across a full run — one screenshot
   every ~60ms for 20–30s — then step through frames at ~1s intervals. Read
   each frame as an image. Extract the inventory: layout, columns, box colors
   per state, typography, fill/flash animations, staircase or queue geometry,
   the decisive transition, the end state, and the restart behavior.
   Completion: every visual phase, including the decisive one, is observed —
   none inferred.
4. **Inspect the running DOM.** Evaluate `outerHTML` on the demo root while it
   runs. The rendered structure names the real technology (runtime-built SVG
   with clipPaths, canvas, DOM). Grep the served bundle for the constants the
   DOM cannot show: palette objects, query strings, state labels, timing
   constants, and the state machine. Completion: exact colors, states,
   timings, and content strings are extracted — not eyeballed.
5. **Choose the representation.** Vendor when the demo ships as a
   self-contained bundle and the user accepts the dependency; reimplement
   under `$wcygan-editorial-diagrams` when the lesson must be re-taught in the
   editorial system or the bundle cannot be reused. State the choice and
   reason before building. Completion: the decision is recorded.
6. **Build.**
   - _Vendor_: download the bundle, polyfill, and stylesheet into
     `public/<post-slug>/vendor/`, write a local `index.html` shell mirroring
     the source's (fonts, `#app` mount), and embed it through an iframe
     wrapper component that carries the editorial figure shell, aspect-ratio
     switching from measured stage width, and a Replay control that resets
     `iframe.src`. Keep source attribution in the figcaption.
   - _Reimplement_: deterministic model in `src/demos/<name>/`, component,
     CSS class family in `src/styles/app.css`, accessibility text, reduced
     motion, per the editorial contract.
7. **Verify by diff against the trace.** Render the copy, capture the same
   phases traced in step 3, and compare frame by frame. Run model tests,
   typecheck, and the repository gate when reimplementing; run the gate when
   vendoring. Completion: copy frames show the source's phases, and the
   checks pass.

## Gotchas

- Spawn Chrome for Testing from the Playwright cache directly
  (`--no-first-run`); the relay may engage when a plain open fails.
- CDP `Page.startScreencast` emits zero frames in this setup; a tight
  `page.screenshot` loop is the working capture path (~60ms per frame).
- One browser `run` call times out at 30s and kills the tab. Chunk long
  traces: schedule captures at fixed offsets from a Replay click, several
  calls per trace.
- Confirm viewport geometry from the screenshot's own dimensions; an `open`
  viewport may not stick, and re-apply it with `page.setViewport`.
- Demos that restart on their own make a missed phase a timing problem, not a
  bug: re-run with captures centered on the phase's window.
- Dense capture can freeze the page's animation frames; if consecutive frames
  are identical while the demo should be moving, re-run the trace with
  spacing between captures.

## Reference

- [Lock-queue case study](references/lock-queue-case-study.md) — the full
  end-to-end trace of replicating the PlanetScale stuck-database demo: three
  passes from prose-built to vendored, with the exact commands, extractions,
  and frame evidence.

Once a demo is accepted, its bundle graduates into
`$planet-scale-animation-design-system` (`assets/`, sync script, token and
renderer inventory); embed new posts from that skill's published copies
rather than a post-local vendor directory.
