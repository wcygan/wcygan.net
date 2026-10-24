import { RaftLogPayload } from "./RaftLogPayload";
import { RaftLogRow } from "./RaftLogRow";
import { RaftPlaybackControls } from "./RaftPlaybackControls";
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
          ? "C has persisted #5 and sends its acknowledgement. A is still waiting for the reply and has not yet confirmed commitment of #5."
          : elapsed >= time(28000) && elapsed < time(29000)
            ? "A sends commit index 5. C still knows commitment only through #4 until the message arrives."
            : elapsed >= time(32000) && elapsed < time(33600)
              ? "B restarts as a follower with durable term 5 and log through #4. Its commitment knowledge resets; A sends term 7, #5, and commit index 5."
              : beat.detail;

  const status =
    elapsed >= time(16000) && elapsed < time(19000)
      ? "Term 7 election"
      : elapsed >= time(20000) && elapsed < time(21600)
        ? "A stored #5 · replication in flight"
        : elapsed >= time(24000) && elapsed < time(25000)
          ? "C stored #5 · acknowledgement in flight"
          : elapsed >= time(28000) && elapsed < time(29000)
            ? "Commit index 5 in flight"
            : elapsed >= time(32000) && elapsed < time(33600)
              ? "B restarting · catch-up in flight"
              : beat.title;

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

  const previousCompact = useRef(compact);
  useEffect(() => {
    if (previousCompact.current === compact) return;
    const before = previousCompact.current;
    setElapsed((at) => beats[recoveryState(at, before).step].settledAt);
    previousCompact.current = compact;
  }, [compact, beats]);

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
          {state.nodes.map((node) => (
            <RaftLogRow
              key={node.id}
              id={node.id}
              role={node.role}
              term={node.term}
              commit={node.commit}
              commitKnown={node.commit > 0}
              stored={node.stored}
              bounds={layout.rows[node.id]}
              entryX={layout.entryX}
              cellWidth={layout.cellWidth}
              className="leader-recovery-server"
              offline={node.offline}
              writing={node.writing}
              vote={node.vote}
              lastTerm={lastEntry(node).term}
              timer={nodeTimer(node, elapsed, compact)}
              cells={entries.map((entry) => ({
                index: entry.index,
                label: entry.label.replace("#", ""),
                term: node.stored >= entry.index ? entry.term : undefined,
                command:
                  node.stored >= entry.index
                    ? compact
                      ? entry.command.replace(/\s/g, "")
                      : entry.command
                    : undefined,
                present: node.stored >= entry.index,
                committed: node.commit >= entry.index,
              }))}
            />
          ))}
          {!reduced &&
            messages.map((message, index) => {
              if (elapsed <= message.start || elapsed >= message.end)
                return null;
              const point = layout.pointOnRoute(
                layout.route(message),
                (elapsed - message.start) / (message.end - message.start),
              );
              return (
                <RaftLogPayload
                  key={index}
                  position={point}
                  compact={compact}
                  lines={message.payload}
                  label={message.label}
                />
              );
            })}
        </svg>
      </div>
      <RaftPlaybackControls
        label="Leader recovery playback"
        reduced={reduced}
        complete={complete}
        playing={playing}
        step={state.step}
        count={beats.length}
        onPlay={() => setPlaying((old) => !old)}
        onBack={() => goTo(state.step - 1)}
        onNext={() =>
          goTo(elapsed < beat.settledAt ? state.step : state.step + 1)
        }
        onReplay={() => {
          setElapsed(0);
          setPlaying(!reduced);
        }}
      />
      <div
        className="leader-recovery-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>{status}</p>
      </div>
    </figure>
  );
}
