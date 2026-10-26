import { useEffect, useId, useRef, useState } from "react";
import { lessons, type LessonId } from "~/demos/indexing-primer/model";
import {
  transitionPlan,
  transitionVisual,
} from "~/demos/indexing-primer/transition";
import { TreeDiagram } from "~/demos/indexing-primer/TreeDiagram";
import {
  INDEXING_LOOP_PAUSE_MS,
  useIndexingPlayback,
} from "~/demos/indexing-primer/playback";
import "~/styles/indexing-primer.css";

export function IndexingPrimerDemo({ lesson: id }: { lesson: LessonId }) {
  const lesson = lessons.find((candidate) => candidate.id === id)!;
  const [step, setStep] = useState(0);
  const [width, setWidth] = useState(640);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const plan = transitionPlan(id, step);
  const playback = useIndexingPlayback({
    stageRef: ref,
    step,
    transitionMs: plan.duration,
    lastStep: lesson.stepCount - 1,
    onStep: () =>
      setStep((current) => Math.min(lesson.stepCount - 1, current + 1)),
    onReset: () => setStep(0),
  });

  const frame = transitionVisual(id, step, playback.progress);
  const state = frame.visual;
  const queryChange = frame.queryChange;
  const outgoingOpacity = queryChange
    ? Math.max(0, 1 - queryChange.progress * 2)
    : 1;
  const incomingOpacity = queryChange
    ? Math.max(0, queryChange.progress * 2 - 1)
    : 0;
  const sceneOpacity = queryChange ? Math.abs(queryChange.progress * 2 - 1) : 1;
  const resetSeconds =
    playback.resetProgress === null
      ? null
      : Math.ceil(
          ((1 - playback.resetProgress) * INDEXING_LOOP_PAUSE_MS) / 1000,
        );

  useEffect(() => {
    const resize = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    if (ref.current) resize.observe(ref.current);
    return () => resize.disconnect();
  }, []);

  return (
    <figure
      className="ip-demo"
      data-graphic-frame="workbench"
      data-graphic-key={`indexing-${id}`}
      data-graphic-kind="svg"
      data-step={step}
      data-motion-progress={playback.progress.toFixed(3)}
      data-reset-progress={playback.resetProgress?.toFixed(3)}
      aria-labelledby={titleId}
    >
      <header>
        <p id={titleId} className="article-graphic-title">
          {lesson.title}
        </p>
      </header>
      <div className="ip-stage" ref={ref} data-graphic-stage="padded">
        <div className="ip-query" data-changing={Boolean(queryChange)}>
          {queryChange && (
            <span
              className="ip-query-highlight"
              aria-hidden="true"
              style={{ opacity: Math.sin(queryChange.progress * Math.PI) }}
            />
          )}
          <code
            aria-hidden={queryChange ? queryChange.progress >= 0.5 : undefined}
            style={
              queryChange
                ? {
                    opacity: outgoingOpacity,
                    transform: `translateY(${-4 * (1 - outgoingOpacity)}px)`,
                  }
                : undefined
            }
          >
            {queryChange?.from ?? state.query}
          </code>
          {queryChange && (
            <code
              aria-hidden={queryChange.progress < 0.5}
              style={{
                opacity: incomingOpacity,
                transform: `translateY(${4 * (1 - incomingOpacity)}px)`,
              }}
            >
              {queryChange.to}
            </code>
          )}
        </div>
        <div
          className="ip-tree-region"
          style={{ height: state.height, opacity: sceneOpacity }}
        >
          <TreeDiagram visual={state} width={width} travel={frame.travel} />
        </div>
        <div
          className="ip-metric"
          role="status"
          aria-live={playback.active ? "off" : "polite"}
          style={{ opacity: sceneOpacity }}
        >
          {state.result}
        </div>
      </div>
      <div className="ip-controls">
        <button
          type="button"
          onClick={playback.toggle}
          disabled={playback.reducedMotion}
          aria-pressed={playback.playing}
        >
          {playback.playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={playback.manualStep}>
          Next step
        </button>
        {resetSeconds !== null && (
          <span
            className="ip-reset"
            role="timer"
            aria-live="off"
            aria-label={
              playback.active
                ? `Automatic reset in ${resetSeconds} seconds`
                : `Reset paused, ${resetSeconds} seconds remaining`
            }
          >
            <svg
              className="ip-reset-ring"
              viewBox="0 0 20 20"
              width="20"
              height="20"
              aria-hidden="true"
            >
              <circle className="ip-reset-track" cx="10" cy="10" r="7" />
              <circle
                className="ip-reset-arc"
                cx="10"
                cy="10"
                r="7"
                pathLength="1"
                strokeDasharray="1 1"
                strokeDashoffset={playback.resetProgress ?? 0}
                transform="rotate(-90 10 10)"
              />
            </svg>
            <span>
              {playback.active ? "Reset in" : "Paused ·"} {resetSeconds}s
            </span>
          </span>
        )}
      </div>
    </figure>
  );
}
