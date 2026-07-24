# Animation improvement plans

| #   | Plan                                                                        | Severity | Status | Dependencies |
| --- | --------------------------------------------------------------------------- | -------- | ------ | ------------ |
| 001 | [Slow and clarify the N+1 query race](001-clarify-n-plus-one-query-race.md) | MEDIUM   | DONE   | None         |

## Recommended execution order

1. Execute plan 001. It combines the selected pacing and content changes because
   they share the same component, model, styles, and rendered verification.

## Execution

Run `$improve-animations execute plans/001-clarify-n-plus-one-query-race.md`, or
give that plan to another implementation agent. The executor must preserve the
existing dirty working tree and follow the plan's boundaries.
