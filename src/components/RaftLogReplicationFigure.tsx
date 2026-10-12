import { useEffect, useId, useRef, useState } from "react";
import {
  getReplicationLesson,
  entries,
  entryRange,
  messageProgress,
  replicationState,
} from "~/demos/raft-log-replication/model";
import {
  messageRoute,
  replicationLayout,
} from "~/demos/raft-log-replication/layout";
import { pointOnRoute } from "~/demos/raft-election-overview/layout";

const heart =
  "M0 7 C-3 4 -8 0 -8 -4 C-8 -9 -2 -10 0 -5 C2 -10 8 -9 8 -4 C8 0 3 4 0 7Z";

export function RaftLogReplicationFigure() {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const { beats, messages, cycleDuration } = getReplicationLesson(compact);
  const active = playing && visible && documentVisible && !reduced;
  const state = replicationState(elapsed, compact);
  const beat = beats[state.beat];
  const complete = !playing && elapsed >= beats.at(-1)!.settledAt;
  const layout = replicationLayout(compact);

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
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setCompact(element.clientWidth < 480);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => setElapsed(0), [compact]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      const delta = previous === undefined ? 0 : Math.min(100, now - previous);
      previous = now;
      setElapsed((old) => (old + delta) % cycleDuration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, cycleDuration]);

  return (
    <figure
      className="log-replication-figure"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      aria-labelledby={id + "-title"}
    >
      <header>
        <p className="article-graphic-title" id={id + "-title"}>
          Log replication
        </p>
      </header>
      <div
        ref={stage}
        className="log-replication-stage"
        data-graphic-stage="padded"
        data-beat={state.beat}
        data-entry={state.entry.index}
        data-playback={complete ? "complete" : active ? "playing" : "paused"}
      >
        <div className="log-replication-heading">
          <span>
            Entry #{state.entry.index} · Term {state.entry.term}
          </span>
          <span data-majority={state.majority}>
            {state.copies
              ? `${state.copies} / 3 confirmed copies`
              : state.entry.index === 1
                ? "Empty logs"
                : "Logs synchronized"}
          </span>
        </div>
        <div
          className="log-replication-confirmations"
          aria-label="B’s follower confirmations"
        >
          <span>B’s confirmed follower indices</span>
          <span>
            A confirmed: <strong>{state.confirmed.A}</strong> · C confirmed:{" "}
            <strong>{state.confirmed.C}</strong>
          </span>
        </div>
        <svg
          className="log-replication-scene"
          data-compact={compact}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-labelledby={id + "-scene-title " + id + "-description"}
        >
          <title id={id + "-scene-title"}>
            One leader copies its log to two followers
          </title>
          <desc id={id + "-description"}>
            {beat.event}{" "}
            {state.nodes
              .map(
                (node) =>
                  `${node.server} is a ${node.role} in term ${node.term}, has stored through entry ${node.stored}, and knows entries through ${node.committed} are committed.`,
              )
              .join(" ")}
            B has confirmation from A through {state.confirmed.A} and from C
            through {state.confirmed.C}.
            {state.majority &&
              ` A majority has confirmed storage of entry ${state.entry.index}.`}
          </desc>
          <path className="log-replication-wire" d={layout.wire} />
          {active &&
            messages.map((message, index) => {
              const fraction = messageProgress(message, elapsed);
              if (fraction <= 0 || fraction >= 1) return null;
              const [x, y] = pointOnRoute(
                messageRoute(layout, message),
                fraction,
              );
              const width = compact ? 56 : message.kind === "ack" ? 128 : 80;
              const twoRows =
                message.kind === "entry" || message.kind === "ack";
              const height = twoRows ? 44 : 28;
              return (
                <g
                  key={index}
                  className="log-replication-payload"
                  data-kind={message.kind}
                  data-commit={
                    "leaderCommit" in message ? message.leaderCommit : undefined
                  }
                  data-entry={
                    message.kind === "entry"
                      ? message.lastIndex
                      : message.kind === "command"
                        ? message.index
                        : undefined
                  }
                  transform={`translate(${x} ${y})`}
                  aria-hidden="true"
                >
                  <rect
                    x={-width / 2}
                    y={-height / 2}
                    width={width}
                    height={height}
                    rx="3"
                  />
                  {message.kind === "command" ? (
                    <text textAnchor="middle" dominantBaseline="central">
                      {entries[message.index - 1].command.replace(/\s/g, "")}
                    </text>
                  ) : message.kind === "ack" ? (
                    <text textAnchor="middle" dominantBaseline="central">
                      <tspan x="0" y="-9">
                        {compact ? "Stored" : "Stored through"}
                      </tspan>
                      <tspan x="0" y="9">
                        #{message.storedThrough}
                      </tspan>
                    </text>
                  ) : (
                    <>
                      {message.kind === "entry" && (
                        <text
                          x="0"
                          y="-9"
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {entryRange(message.firstIndex, message.lastIndex)}
                        </text>
                      )}
                      <g transform={`translate(0 ${twoRows ? 9 : 0})`}>
                        <path
                          className="log-replication-heart"
                          d={heart}
                          transform="translate(-10 0)"
                        />
                        <text x="7" y="0" dominantBaseline="central">
                          {message.leaderCommit}
                        </text>
                      </g>
                    </>
                  )}
                </g>
              );
            })}
          {state.nodes.map((node) => {
            const bounds = layout.nodes[node.server];
            const padding = compact ? 12 : 16;
            const labelWidth = compact ? 64 : 72;
            const entryX = padding + labelWidth;
            const gap = 8;
            const cellWidth =
              (bounds.width - padding * 2 - labelWidth - gap * 2) / 3;
            const cellY = compact ? 92 : 68;
            const cellHeight = 96;
            const rowY = [20, 48, 76];
            const boundary =
              entryX + node.committed * (cellWidth + gap) - gap / 2;
            return (
              <g
                key={node.server}
                className="log-replication-server"
                data-server={node.server}
                data-identity={node.server}
                data-stored={node.stored}
                data-committed={node.committed}
                data-term={node.term}
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
                  Node {node.server}
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
                  <tspan className="log-replication-value">{node.stored}</tspan>
                </text>
                <g
                  className="log-replication-field-labels"
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  <text x={entryX - 8} y={cellY + rowY[0]}>
                    Index
                  </text>
                  <text x={entryX - 8} y={cellY + rowY[1]}>
                    Term
                  </text>
                  <text x={entryX - 8} y={cellY + rowY[2]}>
                    Command
                  </text>
                </g>
                {entries.map((entry, index) => {
                  const stored = entry.index <= node.stored;
                  const committed = entry.index <= node.committed;
                  return (
                    <g
                      key={entry.index}
                      className="log-replication-entry"
                      data-index={entry.index}
                      data-present={stored}
                      data-committed={committed}
                      transform={`translate(${entryX + index * (cellWidth + gap)} ${cellY})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      <rect width={cellWidth} height={cellHeight} rx="2" />
                      <text
                        className="log-replication-entry-meta"
                        x={cellWidth / 2}
                        y={rowY[0]}
                      >
                        {entry.index}
                      </text>
                      <text
                        className="log-replication-entry-meta"
                        x={cellWidth / 2}
                        y={rowY[1]}
                      >
                        {stored ? entry.term : "—"}
                      </text>
                      <text
                        className="log-replication-command"
                        x={cellWidth / 2}
                        y={rowY[2]}
                      >
                        {stored ? entry.command : "—"}
                      </text>
                      {committed && (
                        <text
                          className="log-replication-check"
                          x={cellWidth - 8}
                          y={rowY[0]}
                          textAnchor="end"
                        >
                          ✓
                        </text>
                      )}
                    </g>
                  );
                })}
                {node.committed > 0 && (
                  <path
                    className="log-replication-boundary"
                    d={`M${boundary} ${cellY - 4}v${cellHeight + 8}`}
                  />
                )}
                <text
                  className="log-replication-committed"
                  x={padding}
                  y={bounds.height - 20}
                >
                  Commit index:{" "}
                  <tspan className="log-replication-value">
                    {node.committed}
                  </tspan>
                </text>
                {node.server === "C" && node.stored === 0 && !node.writing && (
                  <text
                    className="log-replication-writing"
                    x={bounds.width - padding}
                    y={bounds.height - (compact ? 27 : 20)}
                    textAnchor="end"
                  >
                    {compact ? (
                      <>
                        <tspan x={bounds.width - padding}>Replication</tspan>
                        <tspan x={bounds.width - padding} dy="14">
                          {" delayed"}
                        </tspan>
                      </>
                    ) : (
                      "Replication delayed"
                    )}
                  </text>
                )}
                {node.writing && (
                  <text
                    className="log-replication-writing"
                    x={bounds.width - padding}
                    y={bounds.height - 20}
                    textAnchor="end"
                  >
                    Storing{" "}
                    {entryRange(
                      node.writing.firstIndex,
                      node.writing.lastIndex,
                    )}
                    …
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="log-replication-summary" data-majority={state.majority}>
          {state.majority
            ? `✓ Majority achieved · Entry #${state.entry.index} committed at B`
            : state.copies
              ? `2 copies needed to commit entry #${state.entry.index}`
              : "Each entry records its index, term, and command"}
        </div>
      </div>
      <div className="log-replication-controls">
        <button
          type="button"
          disabled={reduced}
          onClick={() => setPlaying((old) => !old)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={complete}
          onClick={() => {
            setPlaying(false);
            const nextBeat =
              elapsed < beat.settledAt
                ? state.beat
                : Math.min(state.beat + 1, beats.length - 1);
            setElapsed(beats[nextBeat].settledAt);
          }}
        >
          Next
        </button>
        <button type="button" onClick={() => setElapsed(0)}>
          Replay
        </button>
      </div>
      <div
        className="log-replication-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>{beat.title}</p>
        <p className="sr-only">{beat.event}</p>
      </div>
      <figcaption>
        Green entries are known committed; orange entries are pending.
        Illustrative timing.
        {reduced && " Use Next to step through."}
      </figcaption>
    </figure>
  );
}
