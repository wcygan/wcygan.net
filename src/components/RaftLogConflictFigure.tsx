import { useEffect, useId, useRef, useState } from "react";
import {
  conflictLesson,
  conflictState,
  returningLog,
  leaderLog,
} from "~/demos/raft-log-conflicts/model";
import { pointOnRoute } from "~/demos/raft-election-overview/layout";

export function RaftLogConflictFigure() {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const lesson = conflictLesson(compact);
  const { beats, duration, layout, messages } = lesson;
  const state = conflictState(elapsed, compact);
  const beat = beats[state.step];
  const complete = elapsed >= duration;
  const active = playing && visible && documentVisible && !reduced && !complete;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (stage.current) observer.observe(stage.current);
    const measure = () => setCompact((stage.current?.clientWidth ?? 600) < 480);
    const resize = new ResizeObserver(measure);
    if (stage.current) resize.observe(stage.current);
    measure();
    return () => {
      observer.disconnect();
      resize.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => setElapsed(0), [compact]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      const delta = previous === undefined ? 0 : Math.min(100, now - previous);
      previous = now;
      setElapsed((old) => Math.min(duration, old + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration]);

  function goTo(step: number) {
    setPlaying(false);
    setElapsed(beats[step].settledAt);
  }
  return (
    <figure
      className="leader-recovery-figure log-conflict-figure"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      data-graphic-key="raft-log-conflicts"
      aria-labelledby={id + "-title"}
    >
      <header>
        <p className="article-graphic-title" id={id + "-title"}>
          Log repair
        </p>
      </header>
      <div
        ref={stage}
        className="leader-recovery-stage log-conflict-stage"
        data-graphic-stage="padded"
        data-step={state.step}
        data-playback={complete ? "complete" : active ? "playing" : "paused"}
      >
        <p className="leader-recovery-tally">
          A’s view of B: nextIndex {state.nextIndex} · confirmed{" "}
          {state.confirmed}
        </p>
        <svg
          className="log-replication-scene"
          data-compact={compact}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-labelledby={id + "-scene-title " + id + "-description"}
        >
          <title id={id + "-scene-title"}>
            A matching prefix lets B replace an uncommitted conflicting suffix
          </title>
          <desc id={id + "-description"}>
            {beat.detail}{" "}
            {state.nodes
              .map(
                (node) =>
                  `${node.id}: ${node.role}, current term ${node.term}, commit index ${node.commit}. Log: ${node.log.map((entry) => `${entry.index} / term ${entry.term} / ${entry.command}`).join("; ")}.`,
              )
              .join(" ")}
          </desc>
          <path className="log-replication-wire" d={layout.wire} />
          {state.nodes.map((node) => {
            const bounds = layout.nodes[node.id];
            const padding = compact ? 12 : 16;
            const entryX = padding + (compact ? 64 : 72);
            const cellWidth =
              (bounds.width - padding * 2 - (compact ? 64 : 72) - 16) / 3;
            const cellY = compact ? 92 : 68;
            return (
              <g
                key={node.id}
                className="log-conflict-server"
                data-server={node.id}
                data-identity={node.id}
                data-commit={node.commit}
                data-stored={node.log.at(-1)!.index}
                transform={`translate(${bounds.x} ${bounds.y})`}
              >
                <rect
                  className="log-replication-node"
                  width={bounds.width}
                  height={bounds.height}
                  rx="3"
                />
                <rect
                  className="log-replication-node-header"
                  x="1"
                  y="1"
                  width={bounds.width - 2}
                  height={compact ? 79 : 55}
                  rx="2"
                />
                <text className="log-replication-id" x={padding} y="24">
                  Node {node.id}
                </text>
                <text
                  className="log-replication-role"
                  x={bounds.width - padding}
                  y="24"
                  textAnchor="end"
                >
                  Role:{" "}
                  <tspan className="log-replication-value">{node.role}</tspan>
                </text>
                <text className="log-replication-term" x={padding} y="46">
                  Current term:{" "}
                  <tspan className="log-replication-value">{node.term}</tspan>
                </text>
                <text
                  className="log-replication-term"
                  x={compact ? padding : bounds.width - padding}
                  y={compact ? 68 : 46}
                  textAnchor={compact ? "start" : "end"}
                >
                  Last log index:{" "}
                  <tspan className="log-replication-value">
                    {node.log.at(-1)!.index}
                  </tspan>
                </text>
                <g
                  className="log-replication-field-labels"
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {["Index", "Term", "Command"].map((label, index) => (
                    <text
                      key={label}
                      x={entryX - 8}
                      y={cellY + 20 + index * 28}
                    >
                      {label}
                    </text>
                  ))}
                </g>
                {[3, 4, 5].map((index, column) => {
                  const entry = node.log.find((entry) => entry.index === index);
                  const ghost =
                    node.id === "B" && state.deleted && !entry
                      ? returningLog.find((entry) => entry.index === index)
                      : undefined;
                  const shown = entry ?? ghost;
                  const replacement =
                    node.id === "B" && state.repaired && index === 4;
                  const committed = index <= node.commit;
                  return (
                    <g
                      key={index}
                      className="log-replication-entry log-conflict-entry"
                      data-index={index}
                      data-term={entry?.term}
                      data-present={!!entry}
                      data-committed={committed}
                      data-checked={node.id === "B" && state.checked === index}
                      data-deleted={!!ghost}
                      data-replacement={replacement}
                      transform={`translate(${entryX + column * (cellWidth + 8)} ${cellY})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {ghost && (
                        <rect
                          className="log-conflict-empty-slot"
                          width={cellWidth}
                          height="96"
                          rx="2"
                        />
                      )}
                      <g
                        className="log-conflict-cell-content"
                        data-deleting={!!ghost}
                        transform={
                          ghost
                            ? `translate(${8 * (reduced ? 1 : state.deletionProgress)} ${-12 * (reduced ? 1 : state.deletionProgress)})`
                            : undefined
                        }
                        opacity={
                          ghost ? 1 - (reduced ? 1 : state.deletionProgress) : 1
                        }
                      >
                        <rect width={cellWidth} height="96" rx="2" />
                        <text
                          className="leader-recovery-index"
                          x={cellWidth / 2}
                          y="20"
                        >
                          {index === 3 ? "1–3" : index}
                        </text>
                        <text
                          className="log-replication-entry-meta log-conflict-term"
                          x={cellWidth / 2}
                          y="48"
                        >
                          {shown?.term ?? "—"}
                        </text>
                        <text
                          className="log-replication-command"
                          x={cellWidth / 2}
                          y="76"
                        >
                          {shown?.command ?? "—"}
                        </text>
                        {committed && (
                          <text
                            className="log-replication-check leader-recovery-check"
                            x={cellWidth - 6}
                            y="20"
                            textAnchor="end"
                          >
                            ✓
                          </text>
                        )}
                      </g>
                      {(ghost ||
                        replacement ||
                        (node.id === "B" && state.deleted && index === 3)) && (
                        <text
                          className="log-conflict-change-label"
                          x={cellWidth / 2}
                          y="110"
                        >
                          {index === 3 ? "Kept" : ghost ? "Deleted" : "From A"}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text
                  className="leader-recovery-muted"
                  x={padding}
                  y={cellY + 132}
                >
                  {node.id === "B" && state.deleted && !state.repaired
                    ? "Prefix #1–3 kept"
                    : node.id === "B" && state.writing
                      ? "Persisting replacement…"
                      : `Known commit: ${node.commit}`}
                </text>
              </g>
            );
          })}
          {state.replacing &&
            (() => {
              const bounds = lesson.replacementBounds;
              const progress = reduced ? 1 : state.replacementProgress;
              const entry = leaderLog.at(-1)!;
              const [centerX, centerY] = pointOnRoute(
                lesson.replacementRoute,
                progress,
              );
              return (
                <>
                  {progress < 1 && (
                    <path
                      className="log-conflict-replacement-route"
                      d={`M${centerX} ${centerY - 48}V${bounds.toY}`}
                      aria-hidden="true"
                    />
                  )}
                  <g
                    className="log-replication-entry log-conflict-entry"
                    data-moving-replacement="true"
                    data-replacement="true"
                    data-present="true"
                    data-progress={progress}
                    transform={`translate(${centerX - bounds.width / 2} ${centerY - 48})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    aria-hidden="true"
                  >
                    <rect width={bounds.width} height="96" rx="2" />
                    <text
                      className="leader-recovery-index"
                      x={bounds.width / 2}
                      y="20"
                    >
                      A · {entry.index}
                    </text>
                    <text
                      className="log-replication-entry-meta"
                      x={bounds.width / 2}
                      y="48"
                    >
                      {entry.term}
                    </text>
                    <text
                      className="log-replication-command"
                      x={bounds.width / 2}
                      y="76"
                    >
                      {entry.command}
                    </text>
                  </g>
                </>
              );
            })()}
          {active &&
            messages.map((message) => {
              if (elapsed <= message.start || elapsed >= message.end)
                return null;
              const [x, y] = pointOnRoute(
                lesson.route(message),
                (elapsed - message.start) / (message.end - message.start),
              );
              return (
                <g
                  key={message.kind}
                  className="leader-recovery-packet"
                  data-kind={message.kind}
                  transform={`translate(${x} ${y})`}
                  aria-hidden="true"
                >
                  <title>{message.label}</title>
                  <rect x="-24" y="-12" width="48" height="24" rx="3" />
                  <text textAnchor="middle" y="4">
                    {message.short}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
      <div
        className="leader-recovery-controls"
        role="group"
        aria-label="Log conflict playback"
      >
        <button
          type="button"
          disabled={reduced || complete}
          onClick={() => setPlaying((old) => !old)}
        >
          {playing && !complete ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={state.step === 0}
          onClick={() => goTo(state.step - 1)}
        >
          Back
        </button>
        <button
          type="button"
          disabled={complete}
          onClick={() =>
            goTo(elapsed < beat.settledAt ? state.step : state.step + 1)
          }
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => {
            setElapsed(0);
            setPlaying(!reduced);
          }}
        >
          Replay
        </button>
        <span>
          {state.step + 1} / {beats.length}
        </span>
      </div>
      <div
        className="leader-recovery-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>{beat.title}</p>
        <p className="sr-only">{beat.detail}</p>
      </div>
      <figcaption>
        A separate scenario. Only B’s uncommitted entries change.
        {reduced && " Use Next to step through."}
      </figcaption>
    </figure>
  );
}
