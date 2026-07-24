# Commit-Log Recovery Ledger

Load this reference when building an ordered replay, migration, event-log, or
state-reconstruction diagram, or when a diagram's authored spacing does not
match its rendered spacing.

## Lesson And Outcome

The `/commit-log` article teaches one invariant:

> Starting from a checkpointed data-file image, recovery applies durable redo
> records once, in increasing LSN order, until recovered state reflects the
> durable log.

The diagram makes that invariant visible with four stable regions:

1. Checkpoint baseline: `A 900 · B 250 · C —`.
2. Durable redo ledger: LSN `101` through `106` in source order.
3. Recovered state: Accounts A, B, and C after the applied prefix.
4. Narration and final result: the current LSN during replay, then
   `A 725 · B 180 · C deleted`.

## Source Map

- Article: `src/posts/commit-log.mdx`
- Figure and playback lifecycle: `src/components/MySqlRedoReplayDemo.tsx`
- Deterministic state model: `src/demos/mysql-redo-log/replay-model.ts`
- Model tests: `src/demos/mysql-redo-log/replay-model.test.ts`
- Styles: `/* Ordered MySQL redo recovery */` in `src/styles/app.css`

The previous version used a looping Canvas engine and renderer. The redesign
removed `replay-engine.ts` and `replay-render-canvas.ts` because the explanation
is label-heavy and contains only six records and three state rows. DOM/CSS keeps
those labels crisp, makes every state inspectable, and avoids maintaining custom
Canvas text-layout and viewport geometry.

## Figure Anatomy

The component owns semantics and playback; the stage owns the explanation:

```tsx
<figure
  className="redo-recovery"
  data-graphic-frame="workbench"
  data-graphic-key="redo-recovery"
  aria-labelledby="redo-recovery-title"
  aria-describedby="redo-recovery-description redo-recovery-caption"
>
  <header className="redo-recovery-header">
    <div>{/* quiet title and deck */}</div>
    <button type="button">Replay</button>
  </header>

  <div className="redo-recovery-stage" data-graphic-stage="flush">
    <div className="redo-recovery-checkpoint" />
    <div className="redo-recovery-body">
      <section className="redo-recovery-ledger" />
      <section className="redo-recovery-state" />
    </div>
    <div className="redo-recovery-status" />
  </div>

  <p className="sr-only" aria-live="polite">
    {/* final result only */}
  </p>
  <figcaption id="redo-recovery-caption" />
</figure>
```

There is exactly one authored stage. Replay stays outside it. The animated
visual tree is hidden from assistive technology, while the title, description,
caption, and final live announcement teach the same result statically.

## Deterministic Timeline

The model stores domain state, not drawing commands. Six ordered records mutate
a checkpoint copy, so tests can assert every intermediate and final database
state.

The playback lasts `16_000ms`:

- `0–7.5%`: establish the checkpoint and ordered ledger for about `1.2s`.
- `7.5–93%`: replay six equal steps, about `2.28s` per record.
- `93–100%`: hold the recovered result before frame work stops.
- after completion: persist the final frame until Replay.

The timeline maps normalized progress to an applied prefix and local step
progress:

```ts
const replayProgress =
  (normalizedProgress - INTRO_END) / (REPLAY_END - INTRO_END);
const scaledStep = replayProgress * REPLAY_LOG_RECORDS.length;
const appliedCount = Math.floor(scaledStep);

return deriveReplaySnapshot({
  appliedCount,
  stepProgress: scaledStep - appliedCount,
});
```

Motion vocabulary for this design:

- **Stepped animation**: each LSN is one discrete causal beat.
- **Interpolation / Tween**: a `scaleX()` rail fills continuously within the
  active step.
- **Fade in**: the short narration sentence enters by opacity and a `4px`
  translate.
- **Press / Tap feedback**: Replay uses `scale(0.97)` with the shared strong
  ease-out curve.
- **Reduced motion**: the model renders the complete recovered snapshot
  immediately and disables travel.

Derive time from `requestAnimationFrame` timestamps. Pause while the document is
hidden, resume from elapsed time, listen for live motion-preference changes, and
cancel every frame and listener on cleanup.

## Structural State Encoding

Color does not distinguish operations. Structure and text do:

- `UPDATE`, `INSERT`, and `DELETE` remain explicit labels.
- Pending rows are muted; the active row uses the raised surface.
- The matching state row receives an inset paper line.
- Completed rows retain their filled progress rail.
- The final status band becomes the paper surface and states the recovered
  values directly.

Only the active progress rail receives `will-change: transform`:

```css
.redo-recovery-log-progress {
  transform-origin: left center;
  will-change: auto;
}

.redo-recovery-log-row[data-status="active"] .redo-recovery-log-progress {
  will-change: transform;
}
```

## The Spacing Bug And Fix

The first redesign authored comfortable row padding, but the rendered page was
still cramped. Article prose rules had higher specificity:

```css
.post-content ol {
  padding-left: 1.4em;
}

.post-content li {
  padding: 3px 0;
}
```

They overrode `.redo-recovery-log` and `.redo-recovery-log-row`. Browser-computed
evidence showed:

| Measurement                 | Before      | After        |
| --------------------------- | ----------- | ------------ |
| Ledger list left padding    | `22.4px`    | `0px`        |
| Log-row padding             | `3px 0`     | `12px 16px`  |
| Final character to divider  | `0px`       | `16px`       |
| Text to horizontal rule     | about `3px` | about `15px` |
| Progress rail to side edges | `0px`       | `16px`       |

The fix changed the canonical rules themselves, with only enough context to own
the nested semantic list:

```css
.post-content .redo-recovery .redo-recovery-log {
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-content .redo-recovery .redo-recovery-log-row {
  min-block-size: 52px;
  margin: 0;
  padding: 12px 16px;
}

.redo-recovery-log-progress {
  inset: auto 16px 0;
}
```

This is not permission to build a new late override island. Find the existing
canonical component rule, give it the smallest contextual selector needed to
win against prose, and remove any superseded duplicate.

The state column uses the same principle: `16px` desktop cell padding, `14px`
mobile cell padding, and explicit grid rows so its three records fill the ledger
height rather than leaving an accidental empty region.

## Measuring Rendered Clearance

Screenshots remain necessary, but computed geometry proves that characters do
not touch borders. Run a focused browser evaluation in the real article:

```js
const row = document.querySelector(".redo-recovery-log-row");
const lsn = row.querySelector("code:first-of-type");
const effect = row.querySelector("code:last-of-type");
const progress = row.querySelector(".redo-recovery-log-progress");

const rect = (element) => element.getBoundingClientRect();
const rowBox = rect(row);

({
  rowPadding: getComputedStyle(row).padding,
  leftTextClearance: rect(lsn).left - rowBox.left,
  rightTextClearance: rowBox.right - rect(effect).right,
  leftRailClearance: rect(progress).left - rowBox.left,
  rightRailClearance: rowBox.right - rect(progress).right,
  pageOverflow:
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
});
```

For this implementation, the expected desktop and mobile result is `16px` on
all four clearances and `0px` page overflow. Also inspect checkpoint bands,
section headers, state cells, and the final status band; their text needs the
same proof, not just the log rows.

## Verification Evidence

The completed design was checked at `1440x900` and `390x844` in checkpoint,
middle (`2/6` applied, LSN `103` active), and final states. Verification also
proved:

- one active state target during replay and none at rest;
- the active rail alone uses `will-change: transform`;
- all rails return to `will-change: auto` under reduced motion;
- normal → reduced → normal changes are coherent;
- Replay under reduced motion remains on the complete snapshot;
- the Replay control is at least `44px` high;
- the figure mounts as `workbench`, key `redo-recovery`, with one stage and a
  stable accessible label;
- browser errors are empty and horizontal overflow is zero; and
- `deno task pre-commit` passes.
