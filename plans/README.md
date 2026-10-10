# Animation improvement plans

| #   | Plan                                                                                                | Severity | Status | Dependencies |
| --- | --------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ |
| 001 | [Slow and clarify the N+1 query race](001-clarify-n-plus-one-query-race.md)                         | MEDIUM   | DONE   | None         |
| 002 | [Connect each ETL actor with rounded payload handoffs](002-hop-incremental-etl-event.md)            | HIGH     | TODO   | None         |
| 003 | [Clarify transaction event motion](003-polish-distributed-transaction-motion.md)                    | MEDIUM   | DONE   | None         |
| 004 | [Preserve 2PC message progress through interruptions](004-preserve-two-phase-message-progress.md)   | MEDIUM   | TODO   | None         |
| 005 | [Gate GeoDNS playback by visibility and motion preference](005-gate-geodns-animation.md)            | MEDIUM   | TODO   | None         |
| 006 | [Stop scheduling inactive homepage wordmark frames](006-stop-inactive-homepage-wordmark-frames.md)  | MEDIUM   | TODO   | None         |
| 007 | [Disable smooth page scrolling for reduced motion](007-disable-smooth-scroll-for-reduced-motion.md) | MEDIUM   | TODO   | None         |

## Recommended execution order

1. Plan 001 is complete.
2. Execute plan 002 next. It is isolated to the existing incremental ETL
   component, deterministic model/tests, and canonical CSS section.
3. Plan 003 is complete. All five transaction models were polished in article
   order and checked on desktop and mobile.
4. Execute plan 004 to fix pause/resume continuity in the current two-phase
   prepare demo.
5. Execute plans 005 and 006 to gate GeoDNS and homepage wordmark work by
   visibility and motion preference.
6. Execute plan 007 to respect reduced motion for global anchor scrolling.

## Execution

Give `plans/002-hop-incremental-etl-event.md` to an implementation agent working
in the current checkout. The target ETL component and model are still
uncommitted, so do not use the skill's isolated-worktree execution mode until
that baseline is committed. The executor must preserve the existing dirty
working tree and follow the plan's boundaries.
