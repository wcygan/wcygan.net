import { RaftLogRow } from "./RaftLogRow";
import { RaftPlaybackControls } from "./RaftPlaybackControls";
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
  payloadHeight,
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
  const { beats, messages } = getReplicationLesson(compact);
  const state = replicationState(elapsed, compact);
  const beat = beats[state.beat];
  const complete = elapsed >= beats.at(-1)!.settledAt;
  const active = playing && visible && documentVisible && !reduced && !complete;
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

  const previousCompact = useRef(compact);
  useEffect(() => {
    if (previousCompact.current === compact) return;
    const old = getReplicationLesson(previousCompact.current).beats;
    setElapsed(
      (at) =>
        beats[
          Math.max(
            0,
            old.findLastIndex((b) => at >= b.start),
          )
        ].settledAt,
    );
    previousCompact.current = compact;
  }, [compact, beats]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      const delta = previous === undefined ? 0 : Math.min(100, now - previous);
      previous = now;
      setElapsed((old) => Math.min(old + delta, beats.at(-1)!.settledAt));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, beats]);

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
        <p className="raft-log-confirmations">
          Entry #{state.entry.index} · A confirmed {state.confirmed.A} · C
          confirmed {state.confirmed.C}
        </p>
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
          <text
            className="raft-log-meta"
            x={layout.nodes.B.x + 12}
            y={layout.clientOrigin[1] + 4}
          >
            Client
          </text>
          <path className="log-replication-wire" d={layout.wire} />
          {state.nodes.map((node) => (
            <RaftLogRow
              key={node.server}
              id={node.server}
              role={node.role}
              term={node.term}
              commit={node.committed}
              stored={node.stored}
              bounds={layout.nodes[node.server]}
              entryX={layout.entryX}
              cellWidth={layout.cellWidth}
              className="log-replication-server"
              writing={!!node.writing}
              cells={entries.map((entry) => ({
                index: entry.index,
                term: node.stored >= entry.index ? entry.term : undefined,
                command:
                  node.stored >= entry.index
                    ? compact
                      ? entry.command.replace(/\s/g, "")
                      : entry.command
                    : undefined,
                present: node.stored >= entry.index,
                committed: node.committed >= entry.index,
              }))}
            />
          ))}
          <g className="log-replication-payload-layer" aria-hidden="true">
            {!reduced &&
              messages.map((message, index) => {
                const fraction = messageProgress(message, elapsed);
                if (fraction <= 0 || fraction >= 1) return null;
                const [x, y] = pointOnRoute(
                  messageRoute(layout, message),
                  fraction,
                );
                const width = layout.payloadWidth;
                const height = payloadHeight(message.kind);
                const term =
                  message.kind === "command"
                    ? undefined
                    : state.nodes.find((node) => node.server === message.from)!
                        .term;
                const lines =
                  message.kind === "command"
                    ? [
                        "Client",
                        entries[message.index - 1].command.replace(/\s/g, ""),
                      ]
                    : message.kind === "ack"
                      ? [
                          "Ack",
                          `Stored #${message.storedThrough}`,
                          `Term: ${term}`,
                        ]
                      : [
                          message.kind === "entry"
                            ? `${message.firstIndex === message.lastIndex ? "Entry" : "Entries"} ${entryRange(message.firstIndex, message.lastIndex)}`
                            : "Heartbeat",
                          `Term: ${term}`,
                          `Commit: ${message.leaderCommit}`,
                        ];
                return (
                  <g
                    key={index}
                    className="log-replication-payload"
                    data-kind={message.kind}
                    data-term={term}
                    data-commit={
                      "leaderCommit" in message
                        ? message.leaderCommit
                        : undefined
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
                    {lines.map((line, row) => {
                      const y = (row - (lines.length - 1) / 2) * 18;
                      const heartbeat = message.kind === "commit" && row === 0;
                      return (
                        <g key={row}>
                          {heartbeat && (
                            <path
                              className="log-replication-heart"
                              d={heart}
                              transform={`translate(${compact ? -43 : -50} ${y})`}
                            />
                          )}
                          <text
                            x={heartbeat ? 8 : 0}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {line}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
          </g>
        </svg>
      </div>
      <RaftPlaybackControls
        label="Log replication playback"
        reduced={reduced}
        complete={complete}
        playing={playing}
        step={state.beat}
        count={beats.length}
        onPlay={() => setPlaying((old) => !old)}
        onBack={() => {
          setPlaying(false);
          setElapsed(beats[Math.max(0, state.beat - 1)].settledAt);
        }}
        onNext={() => {
          setPlaying(false);
          setElapsed(
            beats[
              elapsed < beat.settledAt
                ? state.beat
                : Math.min(state.beat + 1, beats.length - 1)
            ].settledAt,
          );
        }}
        onReplay={() => {
          setElapsed(0);
          setPlaying(!reduced);
        }}
      />
      <div
        className="log-replication-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>{beat.title}</p>
      </div>
    </figure>
  );
}
