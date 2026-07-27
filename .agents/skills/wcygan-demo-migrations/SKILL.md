---
name: wcygan-demo-migrations
description: Migrate legacy wcygan.net article demos and explanatory animations from the retired light, dashboard-like, or perpetually looping design system into the current article-native editorial system. Use when modernizing Canvas, SVG, DOM, ASCII, or map demos; replacing looping timelines with finite replayable models; restyling old demo shells; consolidating their app.css sections; auditing which mounted demos still need migration; or bringing article-graphic metadata, accessibility, responsive layout, reduced motion, tests, and rendered verification up to the current repository contract.
---

# wcygan.net Demo Migrations

Migrate one mounted article explanation at a time without changing what it
teaches. Preserve the owning prose and causal invariant, then replace only the
representation, lifecycle, and visual system needed to make that lesson
article-native, inspectable, and accessible.

Load `$wcygan-editorial-diagrams` before acting. Load `$agent-browser` for
rendered verification and `$better-ui` or `$better-typography` when available
and relevant. Read `AGENTS.md`; it remains authoritative when this skill and the
repository differ.

## Start From Evidence

1. Record `git status --short`, the branch, and the current commit. Preserve
   unrelated work and define the files the migration may own.
2. Read the MDX import plus the prose immediately before and after the demo.
3. Read the component and its complete backing model, engine, renderer,
   viewport, tests, and canonical `src/styles/app.css` section.
4. Render the current route before editing. Capture the first frame, a decisive
   middle frame, final or reset behavior, both required viewports, and reduced
   motion. Treat this as behavioral evidence, not a visual target.
5. Run the audit helper from the repository root:

   ```bash
   deno run --allow-read=. \
     .agents/skills/wcygan-demo-migrations/scripts/audit-demo.ts \
     src/components/ExampleDemo.tsx
   ```

   Add `--json` when a machine-readable report is useful. The helper identifies
   source ownership and common migration risks; it does not decide whether
   Canvas should be removed.

Before designing, write down:

- the one-sentence invariant;
- the input, actors, causal boundary, and state mutation;
- the exact first, decisive middle, and final states;
- the non-goals and copy/product names that must remain; and
- observable acceptance criteria and validation commands.

Stop and resolve the lesson if those states cannot be stated without a legend
or several unrelated outcomes.

## Choose The Representation Deliberately

Use the simplest representation that keeps the lesson crisp and testable:

- Prefer DOM/CSS for labels, records, ordered steps, lanes, counters, ledgers,
  state rows, and compact pipelines.
- Prefer SVG for fixed paths, connectors, and small topology.
- Retain Canvas for dense simulations, continuous geometry, particle fields, or
  scenes whose DOM/SVG equivalent would be materially worse.
- Preserve maps, ASCII, or static diagrams when their medium is the lesson.

Migration does not mean “replace every Canvas.” It means move semantics and
domain state out of drawing code, adopt the editorial shell and tokens, remove
unnecessary looping, and make important states inspectable. Read
[migration archetypes](references/migration-archetypes.md) before choosing a
Canvas-to-DOM rewrite or retaining a specialized renderer.

## Build The New Causal Model First

Create or refine a deterministic model under `src/demos/<name>/` before
polishing motion.

- Represent typed phases, domain values, actor states, payload positions, and
  the final summary.
- Derive snapshots from clamped normalized progress or explicit user input.
- Test the strict causal order and the decisive state boundary.
- Keep downstream state unchanged until the matching payload reaches its apply
  boundary.
- Autoplay a narrative sequence once, then use the replay policy required by the
  owning article. Default to a persistent final state until Replay.
- Do not use modulo revival. If an explicitly accepted shared countdown is part
  of the design, document that exception and test its settled interval.
- Make Replay reset the model immediately, without CSS interpolating from stale
  completion state.

Do not invent artificial waiting merely to make a progress display look busy.
The visible phase, narration, active actor, payload, and domain state must all
describe the same event.

## Replace The Shell And Canonical CSS

Use a semantic `<figure>` with a quiet editorial header:

- Author `data-graphic-frame="bare|plate|workbench"` by reader role, not
  renderer.
- Give Bare figures no stage. Add exactly one
  `data-graphic-stage="flush|padded"` to every Plate or Workbench.
- Keep a stable `data-graphic-key` across renderer changes and set
  `data-graphic-kind` only when the inferred kind would be wrong.
- Never author route-generated `data-article-graphic`, `data-graphic-id`,
  `data-graphic-index`, or `data-graphic-marker`. Author `data-graphic-label`
  only when the inferred accessible label needs a stable override.
- Keep Replay and other controls outside the stage.
- Connect a stable title and concise static explanation with
  `aria-labelledby` and `aria-describedby`.
- Hide redundant animated geometry from assistive technology and announce only
  the decisive final result.
- Keep controls native, visibly focused, and at least `44x44px`.

Replace the old component CSS section in place. Remove superseded selectors;
never append a stronger override island over retired styles. Scope one semantic
token family to the component and start from:

`#181817`, `#20201e`, `#292927`, `#3f3f3b`, `#696862`, `#f4f3ee`,
`#aaa9a2`, `#efeee9`, and `#20201d`.

Use structure, labels, position, persistent state, and line treatment before
semantic color. Avoid dashboard cards, badge collections, legends required to
decode color, gradients, decorative infrastructure art, and ambient pulsing.
Keep the stage compact inside the `644px` reading column.

Name every transitioned property. Animate transform and opacity for travel,
with restrained color or surface transitions for real state changes. Never use
`transition: all`, layout-property animation, or permanent `will-change`.

Read [the migration contract](references/migration-contract.md) for the detailed
old-to-new mapping, reference implementations, lifecycle rules, and acceptance
matrix.

## Implement A Finite Lifecycle

For time-based playback:

- derive progress from `requestAnimationFrame` timestamps, not frame counts;
- stop frame work at completion;
- pause while `document.hidden` and resume without a time jump;
- respond to live `prefers-reduced-motion` changes;
- render the complete or representative conclusion immediately in reduced
  motion;
- clean up every frame, timer, observer, listener, and renderer instance; and
- restrict `will-change` to the currently moving element, returning it to
  `auto` when settled or reduced.

The reduced-motion state must teach the same invariant. A random middle frame
or a one-time mount check is not sufficient.

## Validate In Layers

Run narrow checks first, then the repository gate:

```bash
deno task test src/demos/<name>/model.test.ts
deno task typecheck
deno task pre-commit
```

Run `deno task build` when MDX, routing, static diagrams, or prerender behavior
changes.

Use `$agent-browser` on the real article route at `1440x900` and `390x844`.
Inspect:

- first, decisive middle, transport crossing, and persistent final states;
- Replay, keyboard focus, and the `44x44px` hit target;
- normal → reduced → normal preference changes;
- zero page-level horizontal overflow and no browser warnings;
- the expected frame/key/label and authored stage count under
  `?inspect=graphics`; and
- computed token-to-text and text-to-border clearance, not screenshots alone.

If browser tooling cannot advance animation time or dispatch media-query
changes reliably, record the limitation and use another supported rendered
browser plus component tests. Never claim a state that was not observed.

## Finish With Scope Proof

Review `git status --short`, `git diff --check`, the scoped diff, and deleted
renderer imports. Confirm that unrelated dirty files retain their baseline
fingerprints when overlap exists.

Report:

- owning route and invariant;
- representation and lifecycle decisions;
- files added, changed, and removed;
- first/middle/final and reduced-motion evidence;
- exact test/build/browser results;
- remaining uncertainty; and
- whether any commit, push, or deployment occurred.

Do not call the migration complete because the new stage looks polished. It is
complete only when the article prose, model tests, visible causal state,
accessibility text, reduced motion, and rendered desktop/mobile evidence all
teach the same lesson.
