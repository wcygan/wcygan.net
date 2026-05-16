---
name: wcygan-net-flow-animation
description: Use when creating, reviewing, or refactoring step-wise animated flow demos for wcygan.net blog posts, especially React components embedded from MDX that show pipelines, traces, consistency gaps, retries, queues, state machines, or other sequential systems. Trigger for requests mentioning flow animations, step animations, Play/Step/Reset or Goal/Step/Reset controls, animated traces, interactive blog diagrams, CDC-style demos, DLQ-style demos, reduced-motion behavior, or browser verification of animated post components.
---

# wcygan.net Flow Animation

## Overview

Standardize step-wise animated blog demos on the existing CDC and DLQ pattern: a
small React state machine, explicit controls, accessible status, responsive flow
markup, and restrained CSS in `src/styles/app.css`. Treat these demos as the
intentional exception to the site's default no-motion design, only for
explaining sequential systems.

Use this skill with `wcygan-net-design` for visual constraints and
`wcygan-net-stack` for TanStack Start, MDX, and browser-verification
constraints.

## Workflow

1. Read the post and component context first. Start with the MDX post that
   embeds the demo, then the component, then the relevant `src/styles/app.css`
   section.
2. Define the narrative steps as data. Each step needs an `id`, short label,
   detail/status text, and any fields or observations that become visible at
   that step.
3. Use a simple state model: `activeStep`, `isPlaying`, `LAST_STEP`, `STEP_MS`,
   `nextStep`, and `formatStep` when numbered labels help scanning.
4. Provide controls in this order unless the post already establishes a
   different vocabulary: primary Play/Pause or Goal, then Step, then Reset.
   Manual Step/Reset and stage-marker clicks should stop autoplay.
5. Respect reduced motion in both React and CSS. Do not autoplay for users who
   prefer reduced motion; choose either the first explanatory state or final
   complete state intentionally.
6. Make the stage markers real buttons when they change state. Use
   `aria-current="step"` for the active step and keep status updates in a live
   region that is quiet during autoplay.
7. Build separate compact mobile markup when the desktop rail/board would
   compress poorly. Do not rely on shrinking complex desktop diagrams until text
   becomes unreadable.
8. Keep styling local and palette-aligned in `src/styles/app.css`. Use data
   attributes such as `data-state`, `data-visible`, `data-active`, and CSS
   custom properties for progress.
9. Verify with the narrowest useful command, then browser-check the embedded
   post when UI changed.

## Reference

Read [flow-patterns](references/flow-patterns.md) before implementing or
reviewing a new animated flow component. It names the current examples and the
acceptance checklist.

Load these only when the task needs them:

- [native-techniques](references/native-techniques.md) for CSS transitions,
  keyframes, Web Animations API, scroll-driven animations, and View Transitions.
- [accessibility-performance](references/accessibility-performance.md) for
  autoplay controls, reduced motion, React effect cleanup, and performance
  guardrails.
- [library-fit](references/library-fit.md) before proposing or adding animation
  or state-machine dependencies.

## Validation

For documentation-only skill edits, run:

```bash
uv run --with pyyaml python /Users/wcygan/Development/dotfiles/config/codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/wcygan-net-flow-animation
```

For animation implementation changes, prefer:

```bash
deno task test
deno task pre-commit
just dev
agent-browser open https://wcygan.localhost/<post-slug>
agent-browser screenshot /tmp/<post-slug>-flow.png
```

Use `just dev-vite` only when portless is not needed or is blocked.
