import { useEffect, useId, useRef, useState } from "react";
import {
  getRecoveryLesson,
  entries,
  lastEntry,
  nodeTimer,
  recoveryState,
} from "~/demos/raft-leader-recovery/model";
import { recoveryLayout } from "~/demos/raft-leader-recovery/layout";

export function RaftLeaderRecoveryFigure() {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const { beats, duration, messages, time } = getRecoveryLesson(compact);
  const state = recoveryState(elapsed, compact);
  const beat = beats[state.step];
  const complete = elapsed >= duration;
  const active = playing && visible && documentVisible && !reduced && !complete;
  const layout = recoveryLayout(compact);
  const detail =
    elapsed >= time(16000) && elapsed < time(19000)
      ? "A starts term 7 with its own vote. C records its vote on request arrival; A counts it only when the reply arrives. A then announces its leadership."
      : elapsed >= time(20000) && elapsed < time(21600)
        ? "A stores #5 in term 7 and sends #4–5 with commit index 4. C must persist the entries before acknowledging."
        : elapsed >= time(24000) && elapsed < time(25000)
          ? "C has persisted #5 and sends its acknowledgement. A is still waiting for the reply; #5 is not yet committed."
          : elapsed >= time(28000) && elapsed < time(29000)
            ? "A sends commit index 5. C still knows commitment only through #4 until the message arrives."
            : elapsed >= time(32000) && elapsed < time(33600)
              ? "B restarts as a follower with durable term 5 and log through #4. Its commitment knowledge resets; A sends term 7, #5, and commit index 5."
              : beat.detail;

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
      className="leader-recovery-figure"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      data-graphic-key="raft-leader-recovery"
      aria-labelledby={id + "-title"}
    >
      <header>
        <p className="article-graphic-title" id={id + "-title"}>
          Leader recovery
        </p>
      </header>
      <div
        ref={stage}
        className="leader-recovery-stage"
        data-graphic-stage="padded"
        data-step={state.step}
        data-playback={complete ? "complete" : active ? "playing" : "paused"}
      >
        <p className="leader-recovery-tally">{state.votes}</p>
        <svg
          className="log-replication-scene"
          data-compact={compact}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-labelledby={id + "-scene-title " + id + "-description"}
        >
          <title id={id + "-scene-title"}>
            Three servers preserving a committed log across leader failure
          </title>
          <desc id={id + "-description"}>
            {detail}{" "}
            {state.nodes
              .map((node) => {
                const timer = nodeTimer(node, elapsed, compact);
                return `${node.id}: ${node.offline ? "offline" : node.role}, current term ${node.term}, stored through ${node.stored}, known commit index ${node.commit}, vote ${node.vote ?? "none"}. ${timer.label}${timer.interval ? `: ${Math.round(timer.elapsed / 1000)} of ${Math.round(timer.interval / 1000)} illustrative seconds` : ""}.`;
              })
              .join(" ")}
          </desc>
          <path className="leader-recovery-wire" d={layout.wire} />
          {state.nodes.map((node) => {
            const row = layout.rows[node.id];
            const padding = compact ? 12 : 16;
            const entryX = padding + (compact ? 64 : 72);
            const cellWidth =
              (row.width - padding * 2 - (compact ? 64 : 72) - 16) / 3;
            const cellY = compact ? 92 : 68;
            const last = lastEntry(node);
            const timer = nodeTimer(node, elapsed, compact);
            const timerY = compact ? 264 : 240;
            return (
              <g
                key={node.id}
                className="leader-recovery-server"
                data-server={node.id}
                data-identity={node.id}
                data-role={node.role}
                data-term={node.term}
                data-stored={node.stored}
                data-commit={node.commit}
                data-offline={node.offline}
                data-vote={node.vote ?? ""}
                transform={`translate(${row.x} ${row.y})`}
              >
                <rect
                  className="log-replication-node leader-recovery-node"
                  width={row.width}
                  height={row.height}
                  rx="3"
                />
                <rect
                  className="log-replication-node-header"
                  x="1"
                  y="1"
                  width={row.width - 2}
                  height={compact ? 79 : 55}
                  rx="2"
                />
                <text className="log-replication-id" x={padding} y="24">
                  Node {node.id}
                </text>
                <text
                  className="log-replication-role"
                  x={row.width - padding}
                  y="24"
                  textAnchor="end"
                >
                  Role:{" "}
                  <tspan className="log-replication-value">
                    {node.offline ? "Offline" : node.role}
                  </tspan>
                </text>
                <text className="log-replication-term" x={padding} y="46">
                  Current term:{" "}
                  <tspan className="log-replication-value">{node.term}</tspan>
                </text>
                <text
                  className="log-replication-term"
                  x={compact ? padding : row.width - padding}
                  y={compact ? 68 : 46}
                  textAnchor={compact ? "start" : "end"}
                >
                  Last log index:{" "}
                  <tspan className="log-replication-value">{node.stored}</tspan>
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
                {entries.map((entry, index) => {
                  const present = node.stored >= entry.index;
                  const committed = node.commit >= entry.index;
                  return (
                    <g
                      key={entry.index}
                      className="log-replication-entry leader-recovery-entry"
                      data-present={present}
                      data-committed={committed}
                      transform={`translate(${entryX + index * (cellWidth + 8)} ${cellY})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      <rect width={cellWidth} height="96" rx="2" />
                      <text
                        className="leader-recovery-index"
                        x={cellWidth / 2}
                        y="20"
                      >
                        {entry.label.replace("#", "")}
                      </text>
                      <text
                        className="log-replication-entry-meta"
                        x={cellWidth / 2}
                        y="48"
                      >
                        {present ? entry.term : "—"}
                      </text>
                      <text
                        className="log-replication-command"
                        x={cellWidth / 2}
                        y="76"
                      >
                        {present ? entry.command : "—"}
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
                  );
                })}
                <text
                  className="leader-recovery-muted"
                  x={padding}
                  y={cellY + 144}
                >
                  Last entry term: {last.term} · Vote: {node.vote ?? "—"}
                </text>
                <text
                  className="leader-recovery-commit"
                  x={padding}
                  y={cellY + 124}
                >
                  {node.writing
                    ? "Persisting entries…"
                    : `Known commit: ${node.commit === 0 ? "unknown" : node.commit}`}
                </text>
                <g
                  className="leader-recovery-timer"
                  data-kind={timer.kind}
                  data-progress={timer.progress}
                >
                  <text
                    className="leader-recovery-muted"
                    x={padding}
                    y={timerY}
                  >
                    {timer.label}
                  </text>
                  {timer.interval > 0 && (
                    <text x={row.width - padding} y={timerY} textAnchor="end">
                      {Math.round(timer.elapsed / 1000)} /{" "}
                      {Math.round(timer.interval / 1000)}s
                    </text>
                  )}
                  <rect
                    className="leader-recovery-timer-track"
                    x={padding}
                    y={timerY + 10}
                    width={row.width - padding * 2}
                    height="6"
                    rx="3"
                  />
                  <rect
                    className="leader-recovery-timer-fill"
                    x={padding}
                    y={timerY + 10}
                    width={(row.width - padding * 2) * timer.progress}
                    height="6"
                    rx="3"
                  />
                </g>
              </g>
            );
          })}
          {active &&
            messages.map((message, index) => {
              if (elapsed <= message.start || elapsed >= message.end)
                return null;
              const point = layout.pointOnRoute(
                layout.route(message),
                (elapsed - message.start) / (message.end - message.start),
              );
              return (
                <g
                  key={index}
                  className="leader-recovery-packet"
                  transform={`translate(${point[0]} ${point[1]})`}
                  aria-hidden="true"
                >
                  <title>{message.label}</title>
                  <rect x="-19" y="-12" width="38" height="24" rx="3" />
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
        aria-label="Leader recovery playback"
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
          onClick={() => goTo(state.step + 1)}
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
        <p className="sr-only">{detail}</p>
      </div>
      <figcaption>
        Three servers; two votes to win. Timers use illustrative seconds.
        {reduced && " Use Next to step through."}
      </figcaption>
    </figure>
  );
}
