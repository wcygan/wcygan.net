# Animation improvement plans

| #   | Plan                                                                                     | Severity | Status | Dependencies |
| --- | ---------------------------------------------------------------------------------------- | -------- | ------ | ------------ |
| 001 | [Slow and clarify the N+1 query race](001-clarify-n-plus-one-query-race.md)              | MEDIUM   | DONE   | None         |
| 002 | [Connect each ETL actor with rounded payload handoffs](002-hop-incremental-etl-event.md) | HIGH     | TODO   | None         |

## Recommended execution order

1. Plan 001 is complete.
2. Execute plan 002 next. It is isolated to the existing incremental ETL
   component, deterministic model/tests, and canonical CSS section.

## Execution

Give `plans/002-hop-incremental-etl-event.md` to an implementation agent working
in the current checkout. The target ETL component and model are still
uncommitted, so do not use the skill's isolated-worktree execution mode until
that baseline is committed. The executor must preserve the existing dirty
working tree and follow the plan's boundaries.
