import { RaftLogPayload } from "./RaftLogPayload";
import { RaftLogRow } from "./RaftLogRow";
import { RaftPlaybackControls } from "./RaftPlaybackControls";
import { useEffect, useId, useRef, useState } from "react";
import {
  conflictLesson,
  conflictState,
  returningLog,
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

  const previousCompact = useRef(compact);
  useEffect(() => {
    if (previousCompact.current === compact) return;
    const before = previousCompact.current;
    setElapsed((at) => beats[conflictState(at, before).step].settledAt);
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
          {state.nodes.map((node) => (
            <RaftLogRow
              key={node.id}
              id={node.id}
              role={node.role}
              term={node.term}
              commit={node.commit}
              stored={node.log.at(-1)!.index}
              bounds={layout.nodes[node.id]}
              entryX={layout.entryX}
              cellWidth={layout.cellWidth}
              className="log-conflict-server"
              writing={node.id === "B" && state.writing}
              cells={[3, 4, 5].map((index) => {
                const entry = node.log.find((item) => item.index === index);
                const ghost =
                  node.id === "B" && state.deleted && !entry
                    ? returningLog.find((item) => item.index === index)
                    : undefined;
                return {
                  index,
                  label: index === 3 ? "1–3" : undefined,
                  term: (entry ?? ghost)?.term,
                  command: compact
                    ? (entry ?? ghost)?.command.replace(/\s/g, "")
                    : (entry ?? ghost)?.command,
                  present: !!entry,
                  committed: index <= node.commit,
                  deleted: !!ghost,
                  deletionProgress: reduced ? 1 : state.deletionProgress,
                  checked: node.id === "B" && state.checked === index,
                  tag:
                    node.id === "B" && state.deleted && index === 3
                      ? "Kept"
                      : ghost
                        ? compact && index === 4
                          ? undefined
                          : "Deleted"
                        : undefined,
                };
              })}
            />
          ))}
          {!reduced &&
            messages.map((message) => {
              if (elapsed <= message.start || elapsed >= message.end)
                return null;
              const [x, y] = pointOnRoute(
                lesson.route(message),
                (elapsed - message.start) / (message.end - message.start),
              );
              return (
                <RaftLogPayload
                  key={message.kind}
                  kind={message.kind}
                  position={[x, y]}
                  compact={compact}
                  lines={message.payload}
                  label={message.label}
                />
              );
            })}
        </svg>
      </div>
      <RaftPlaybackControls
        label="Log conflict playback"
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
        <p>{beat.title}</p>
        <p className="raft-step-explanation">{beat.detail}</p>
      </div>
      <figcaption>
        A separate scenario. Only B’s uncommitted entries change. Each server’s
        Commit label shows its local commitment knowledge; a packet’s Commit is
        the leader’s advertised index.
        {reduced && " Use Next to step through."}
      </figcaption>
    </figure>
  );
}
