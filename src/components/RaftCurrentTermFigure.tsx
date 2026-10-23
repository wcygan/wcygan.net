import { useEffect, useId, useRef, useState } from "react";
import {
  currentTermFrame,
  entryIsCommitted,
  timeline,
  paperPanels,
} from "~/demos/raft-current-term/model";

import {
  frameDuration,
  flightsFor,
  playbackRate,
  transportState,
} from "~/demos/raft-current-term/transport";

import { packetPosition, packetRoute } from "~/demos/raft-current-term/route";

export function RaftCurrentTermFigure() {
  const id = useId();
  const figure = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [motionKnown, setMotionKnown] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const state = transportState(frame, elapsed);
  const previous = currentTermFrame(Math.max(0, frame - 1));
  const complete = frame === timeline.length - 1 && state.settled;
  const active =
    playing && visible && documentVisible && motionKnown && !complete;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      setMotionKnown(true);
      if (media.matches) {
        setPlaying(false);
        setFrame(timeline.length - 1);
        setElapsed(frameDuration(timeline.length - 1));
      }
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    // Observe the whole figure so mobile readers can follow its explanation
    // below the stage without stopping playback while the stage scrolls away.
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (figure.current) observer.observe(figure.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    let request = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      // Match the display refresh rate, and never jump ahead after a stall.
      const delta = Math.min(100, now - previous);
      previous = now;
      setElapsed((old) => old + delta * playbackRate);
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [active]);

  useEffect(() => {
    if (elapsed < frameDuration(frame) || frame === timeline.length - 1) return;
    setFrame((old) => old + 1);
    setElapsed(0);
  }, [elapsed, frame]);

  function goTo(next: number) {
    setPlaying(false);
    setFrame(next);
    setElapsed(flightsFor(next).at(-1)?.end ?? 0);
  }

  function replay() {
    setFrame(0);
    setElapsed(0);
    // An explicit reader request may play the discrete story in reduced motion.
    setPlaying(true);
  }

  return (
    <figure
      ref={figure}
      className="raft-current-term-figure"
      data-graphic-frame="workbench"
      data-graphic-kind="dom"
      data-graphic-key="raft-current-term"
      aria-labelledby={id + "-title"}
    >
      <header>
        <p className="article-graphic-title" id={id + "-title"}>
          When a Majority Is Not Enough
        </p>
      </header>
      <div
        className="raft-current-term-stage"
        data-graphic-stage="padded"
        data-step={frame}
        data-branch={state.branch}
        data-panel={state.panel}
        data-playback={complete ? "complete" : active ? "playing" : "paused"}
      >
        <p className="raft-current-term-phase">{state.phase}</p>
        <p className="raft-current-term-context">{state.context}</p>
        <ol className="raft-current-term-progress" aria-label="Figure 8 stages">
          {paperPanels.map((panel) => (
            <li key={panel.letter} data-current={panel.letter === state.panel}>
              <span>({panel.letter})</span>
              <span>{panel.name}</span>
            </li>
          ))}
        </ol>
        <p className="raft-current-term-action">{state.title}</p>
        <div className="raft-current-term-clock" aria-hidden="true">
          <span
            style={{
              transform: `scaleX(${complete ? 1 : Math.min(1, elapsed / frameDuration(frame))})`,
            }}
            data-active={active}
            data-complete={complete}
          />
        </div>
        <svg
          className="raft-current-term-network"
          viewBox="0 0 360 128"
          role="img"
          aria-label={
            state.activeFlight
              ? `${state.activeFlight.from} to ${state.activeFlight.to}: ${state.activeFlight.label}`
              : "Message routes between A, B, and C"
          }
        >
          <path
            className="raft-current-term-wire"
            d="M40 30 V74 H320 V30 M180 30 V74"
          />
          {state.nodes.map((node, index) => (
            <g
              key={node.id}
              data-identity={node.id}
              data-role={node.role}
              transform={`translate(${40 + index * 140} 30)`}
            >
              <circle className="raft-current-term-network-node" r="18" />
              <text textAnchor="middle" dominantBaseline="central">
                {node.id}
              </text>
            </g>
          ))}
          {!reduced &&
            state.activeFlight &&
            (() => {
              const message = state.activeFlight;
              const [px, py] = packetPosition(
                message.from,
                message.to,
                (elapsed - message.start) / (message.end - message.start),
              );
              return (
                <g
                  data-kind={message.kind}
                  data-from={message.from}
                  data-to={message.to}
                  className="raft-current-term-packet"
                  data-denied={message.granted === false}
                >
                  <path
                    className="raft-current-term-wire"
                    d={packetRoute(message.from, message.to)}
                  />
                  <g style={{ transform: `translate(${px}px, ${py}px)` }}>
                    <rect
                      x={message.kind === "ack" ? -32 : -26}
                      y={message.kind === "ack" ? -18 : -11}
                      width={message.kind === "ack" ? 64 : 52}
                      height={message.kind === "ack" ? 36 : 22}
                      rx="3"
                    />
                    <text
                      className="raft-current-term-packet-short"
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {message.kind === "vote-request" ? (
                        "Vote?"
                      ) : message.kind === "vote" ? (
                        message.granted ? (
                          "Yes"
                        ) : (
                          "No"
                        )
                      ) : message.kind === "ack" ? (
                        <>
                          <tspan x="0" dy="-7">
                            durably
                          </tspan>
                          <tspan x="0" dy="14">
                            stored
                          </tspan>
                        </>
                      ) : (
                        "Entries"
                      )}
                    </text>
                  </g>
                  <text x="180" y="116" textAnchor="middle">
                    {message.from} → {message.to}: {message.label}
                  </text>
                </g>
              );
            })()}
        </svg>
        <table
          className="raft-current-term-logs"
          aria-label="Three server logs"
        >
          <thead>
            <tr>
              <th scope="col">Server</th>
              {[1, 2, 3].map((index) => (
                <th scope="col" key={index}>
                  Index {index}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.nodes.map((node) => (
              <tr
                key={node.id}
                data-server={node.id}
                data-identity={node.id}
                data-role={node.role}
              >
                <th scope="row">
                  <strong data-identity={node.id}>{node.id}</strong>
                  <span>{node.role}</span>
                  {node.vote && (
                    <span
                      className="raft-current-term-vote"
                      data-vote={node.vote}
                      data-identity={
                        node.vote === "refused" ? undefined : node.vote
                      }
                    >
                      {node.vote === "refused"
                        ? "refuses C"
                        : `votes ${node.vote}`}
                    </span>
                  )}
                </th>
                {[0, 1, 2].map((index) => {
                  const entry = node.log[index];
                  const compared =
                    !!state.voteComparison?.delivered &&
                    (node.id === "B" || node.id === "C") &&
                    index === node.log.length - 1;
                  const before = previous.nodes.find(
                    (old) => old.id === node.id,
                  )?.log[index];
                  const changed =
                    entry?.term !== before?.term ||
                    entryIsCommitted(
                      before,
                      index,
                      previous.committedThrough,
                    ) !==
                      entryIsCommitted(entry, index, state.committedThrough);
                  const committed = entryIsCommitted(
                    entry,
                    index,
                    state.committedThrough,
                  );
                  return (
                    <td
                      key={index}
                      aria-label={
                        entry
                          ? `Index ${index + 1}, term ${entry.term}, ${committed ? "committed" : "uncommitted"}${compared ? ", last log entry compared for voting" : ""}`
                          : `Index ${index + 1}, empty`
                      }
                    >
                      <div
                        className="raft-current-term-entry"
                        key={`${frame}-${node.id}-${index}-${entry?.term}-${committed}`}
                        data-changed={changed}
                        data-compared={compared}
                        data-present={!!entry}
                        data-committed={committed}
                        data-term={entry?.term}
                      >
                        {entry ? (
                          <>
                            <span className="raft-current-term-number">
                              {entry.term}
                            </span>
                            <span className="raft-current-term-entry-state">
                              {committed ? "committed" : "stored"}
                            </span>
                          </>
                        ) : (
                          <span aria-hidden="true">—</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="raft-current-term-tally">{state.tally}</p>
        {state.decision && (
          <p className="raft-current-term-decision">{state.decision}</p>
        )}
        {state.voteComparison && (
          <div className="raft-current-term-voting-rule">
            <p>B checks the candidate’s log</p>
            <dl>
              <div>
                <dt>B’s last log term</dt>
                <dd>{state.voteComparison.voterTerm}</dd>
              </div>
              <div>
                <dt>C’s last log term</dt>
                <dd>{state.voteComparison.candidateTerm}</dd>
              </div>
            </dl>
            <p>
              {!state.voteComparison.delivered
                ? "C’s request is traveling to B. B has not voted yet."
                : state.voteComparison.granted
                  ? "3 > 2: C’s log is newer, so B votes for C. C becomes leader only when the reply arrives."
                  : "3 < 4: C’s log is older, so B rejects C. C’s own vote is not enough to win."}
            </p>
            <p>
              Compare the last entry’s term first; compare its index only if the
              terms tie. A newer election term does not make a log newer.
            </p>
          </div>
        )}
        <p className="raft-current-term-key">
          Numbers are entry terms. Stored does not mean committed. Dashed:
          uncommitted. Green / solid: committed.
        </p>
      </div>
      {reduced && !playing && (
        <p className="raft-current-term-motion-note">
          Reduced motion is on. Use Back and Next to inspect each step, or Play
          to watch.
        </p>
      )}
      <div
        className="raft-current-term-controls"
        role="group"
        aria-label="Current-term commitment playback"
      >
        <button
          type="button"
          onClick={() => (complete ? replay() : setPlaying((old) => !old))}
        >
          {playing && !complete ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={frame === 0}
          onClick={() => goTo(frame - 1)}
        >
          Back
        </button>
        <button
          type="button"
          disabled={complete}
          onClick={() => goTo(Math.min(frame + 1, timeline.length - 1))}
        >
          Next
        </button>
        <button type="button" onClick={replay}>
          Replay
        </button>
        <span>
          {complete ? "Complete" : active ? "Playing" : "Paused"} · {frame + 1}{" "}
          / {timeline.length}
        </span>
      </div>
      <div
        className="raft-current-term-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>{state.title}</p>
        <p>{state.detail}</p>
        {complete && (
          <section
            className="raft-current-term-comparison"
            aria-labelledby={id + "-comparison"}
          >
            <p id={id + "-comparison"}>Figure 8, with three servers</p>
            <p>
              (d) and (e) are alternatives from (c). Numbers in boxes are entry
              terms; column numbers are log indexes.
            </p>
            <div className="raft-current-term-panels">
              {paperPanels.map((panel) => {
                const snapshot = currentTermFrame(panel.frame);
                return (
                  <div key={panel.letter}>
                    <p>
                      ({panel.letter}) {panel.name}
                    </p>
                    <table aria-label={`Stage ${panel.letter}: ${panel.name}`}>
                      <thead>
                        <tr>
                          <th scope="col">Server</th>
                          {[1, 2, 3].map((index) => (
                            <th key={index} scope="col">
                              {index}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.nodes.map((node) => (
                          <tr key={node.id} data-role={node.role}>
                            <th scope="row">{node.id}</th>
                            {[0, 1, 2].map((index) => {
                              const entry = node.log[index];
                              return (
                                <td key={index}>
                                  <span
                                    data-term={entry?.term}
                                    data-committed={entryIsCommitted(
                                      entry,
                                      index,
                                      snapshot.committedThrough,
                                    )}
                                  >
                                    {entry?.term ?? "—"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <dl className="raft-current-term-outcomes">
              <div>
                <dt>Only the old entry</dt>
                <dd>
                  Entry 2’s ACK confirms durable storage only. Its term 2 is
                  older than A’s current term 4, so C can still win and
                  overwrite it.
                </dd>
              </div>
              <div>
                <dt>Current term committed</dt>
                <dd>
                  Entry 3’s ACK confirms a majority stored an entry from current
                  term 4. A commits entries 2 and 3 together; B rejects C’s
                  older log.
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>
      <figcaption>
        Three servers; two form a majority. A plays the paper’s S1, and C plays
        S5. Both alternative endings play once, then stop. Borders show whether
        an entry is committed, not whether each server knows it. Adapted from
        Figure 8 of the Raft paper.
        {reduced &&
          " Reduced motion shows the conclusion. Play starts the story if you choose."}
      </figcaption>
    </figure>
  );
}
