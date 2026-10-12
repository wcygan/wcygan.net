import { useEffect, useId, useRef, useState } from "react";
import {
  countVotes,
  electionConnections,
  receivedBallots,
  nodeStates,
  messageTravelTime,
  voteReplyProgress,
  voteRecordingTime,
  lessons,
  servers,
  type Lesson,
} from "~/demos/raft-election-overview/model";

import {
  electionLayout,
  connectionArrows,
  connectionWires,
  messageRoute,
  pointOnRoute,
} from "~/demos/raft-election-overview/layout";
const duration = 3200;
const timerEnds = [0.58, 1, 0.72, 0.84, 0.65];

export function RaftLeaderElectionFigure() {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [lesson, setLesson] = useState<Lesson>("success");
  const [position, setPosition] = useState({ index: 0, elapsed: 0 });
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const layout = electionLayout(compact);
  const steps = lessons[lesson].steps;
  const step = steps[position.index];
  const complete =
    !playing &&
    position.index === steps.length - 1 &&
    position.elapsed >= duration;
  const active = playing && visible && documentVisible && !reduced;
  const progress = reduced
    ? 1
    : Math.min(1, position.elapsed / messageTravelTime);
  const nodes = nodeStates(steps, position.index, position.elapsed, reduced);
  const recordingVotes =
    step.traffic?.[0]?.kind === "vote" &&
    !reduced &&
    position.elapsed < voteRecordingTime;
  const ballots = receivedBallots(
    step,
    steps[position.index - 1],
    position.elapsed,
    reduced,
  );
  const repliesArrived =
    step.traffic?.every(
      (message, index) =>
        message.kind !== "vote" ||
        reduced ||
        voteReplyProgress(position.elapsed, index) === 1,
    ) ?? true;
  const connections = electionConnections(step);
  const receipts = step.traffic?.flatMap((message, index) =>
    message.kind === "vote" &&
    (reduced || voteReplyProgress(position.elapsed, index) === 1)
      ? [`${message.from} → ${message.to}: ${message.granted ? "Yes" : "No"}`]
      : [],
  );

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
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
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

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      const delta = previous === undefined ? 0 : Math.min(100, now - previous);
      previous = now;
      setPosition((old) => {
        const elapsed = old.elapsed + delta;
        return elapsed >= duration
          ? { index: (old.index + 1) % steps.length, elapsed: 0 }
          : { index: old.index, elapsed };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, steps]);

  const reset = (nextLesson = lesson) => {
    setLesson(nextLesson);
    setPosition({ index: 0, elapsed: 0 });
    setPlaying(!reduced);
  };
  const next = () => {
    setPlaying(false);
    setPosition((old) => ({
      index: Math.min(old.index + 1, steps.length - 1),
      elapsed: duration,
    }));
  };
  const leadingCandidate = step.leader ?? step.candidates[0];
  const receivedVotes = leadingCandidate
    ? countVotes(ballots, leadingCandidate)
    : 0;
  const majorityAchieved = receivedVotes >= 3;
  const majorityWidth = compact ? 148 : 164;

  return (
    <figure
      className="leader-election-figure"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      aria-labelledby={id + "-title"}
    >
      <header>
        <p className="article-graphic-title" id={id + "-title"}>
          Leader election
        </p>
      </header>
      <label className="leader-election-scenario" htmlFor={id + "-scenario"}>
        Scenario
        <select
          id={id + "-scenario"}
          value={lesson}
          onChange={(event) => reset(event.target.value as Lesson)}
        >
          {Object.entries(lessons).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </label>
      <div
        ref={stage}
        className="leader-election-stage"
        data-graphic-stage="padded"
        data-playback={complete ? "complete" : active ? "playing" : "paused"}
      >
        <div className="leader-election-stage-heading">
          <span>Term {step.term}</span>
          <span>
            {step.leader
              ? "Heartbeats"
              : step.traffic?.[0]?.kind === "vote"
                ? recordingVotes
                  ? "Recording votes"
                  : "Votes returning"
                : step.candidates.length
                  ? "Requesting votes"
                  : "Election timers"}
          </span>
        </div>
        <svg
          className="leader-election-scene"
          viewBox={"0 0 " + layout.width + " " + layout.height}
          role="img"
          aria-labelledby={id + "-scene-title " + id + "-scene-description"}
        >
          <title id={id + "-scene-title"}>Five servers choosing a leader</title>
          <desc id={id + "-scene-description"}>
            {step.event} Election term: {step.term}.{" "}
            {servers
              .map(
                (server) =>
                  server +
                  " is a " +
                  nodes[server].role +
                  " in term " +
                  nodes[server].term +
                  (nodes[server].votedFor
                    ? " and recorded a vote for " + nodes[server].votedFor
                    : " and has not voted") +
                  (nodes[server].leader
                    ? ". Its known leader is " + nodes[server].leader
                    : ". It has no known leader") +
                  ". ",
              )
              .join("")}
            {step.candidates
              .map(
                (candidate) =>
                  candidate +
                  " has received " +
                  countVotes(ballots, candidate) +
                  " votes. ",
              )
              .join("")}
          </desc>
          {connectionWires(layout, connections).map((points, index) => (
            <g key={index} className="leader-election-connection">
              <path
                className="leader-election-wire"
                d={points
                  .map(([x, y], i) => (i ? "L" : "M") + x + " " + y)
                  .join(" ")}
              />
            </g>
          ))}
          {(step.candidates.length > 0 || step.leader) &&
            connectionArrows(
              layout,
              connections,
              step.traffic?.[0]?.kind === "vote",
            ).map((points, index) => (
              <polygon
                key={index}
                className="leader-election-arrow"
                points={points.map((point) => point.join(",")).join(" ")}
              />
            ))}
          {step.traffic?.map((message, index) => {
            const route = messageRoute(layout, message);
            const owner = message.kind === "vote" ? message.to : message.from;
            const fraction =
              message.kind === "vote"
                ? reduced
                  ? 1
                  : voteReplyProgress(position.elapsed, index)
                : progress;
            if (!active || fraction <= 0 || fraction >= 1) return null;
            const packet = pointOnRoute(route, fraction);
            return (
              <g
                key={index}
                className="leader-election-message"
                data-owner={owner}
                data-identity={owner}
                data-kind={message.kind}
              >
                {message.kind === "vote" ? (
                  <g
                    className="leader-election-reply"
                    data-granted={message.granted}
                    transform={"translate(" + packet[0] + " " + packet[1] + ")"}
                  >
                    <rect x="-18" y="-10" width="36" height="20" rx="3" />
                    <text textAnchor="middle" dominantBaseline="central">
                      {message.granted ? "Yes" : "No"}
                    </text>
                  </g>
                ) : message.kind === "heartbeat" ? (
                  <path
                    className="leader-election-heart"
                    d="M0 5 C-2 3 -6 0 -6 -2 C-6 -6 -1 -6 0 -3 C1 -6 6 -6 6 -2 C6 0 2 3 0 5Z"
                    transform={"translate(" + packet[0] + " " + packet[1] + ")"}
                  />
                ) : (
                  <circle cx={packet[0]} cy={packet[1]} r="4" />
                )}
              </g>
            );
          })}
          {servers.map((server, index) => {
            const node = layout.nodes[server];
            const local = nodes[server];
            const role = local.role;
            const timer =
              position.index === 0
                ? timerEnds[index] * Math.min(1, position.elapsed / duration)
                : 0;
            return (
              <g
                key={server}
                className="leader-election-server"
                data-server={server}
                data-identity={server}
                data-role={role}
                data-term={local.term}
                data-leader={local.leader ?? ""}
                data-vote={local.votedFor}
              >
                <rect
                  className="leader-election-node"
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx="3"
                />
                <text
                  className="leader-election-server-name"
                  x={node.x + 12}
                  y={node.y + 20}
                >
                  {server}
                </text>
                <text
                  className="leader-election-role"
                  x={node.x + node.width - 12}
                  y={node.y + 19}
                  textAnchor="end"
                >
                  {role}
                </text>
                <text
                  className="leader-election-node-state"
                  x={node.x + 12}
                  y={node.y + 32}
                >
                  Term {local.term}
                </text>
                <text
                  className="leader-election-node-state leader-election-known-leader"
                  data-identity={local.leader}
                  x={node.x + node.width - 12}
                  y={node.y + 32}
                  textAnchor="end"
                >
                  Leader {local.leader ?? "—"}
                </text>
                <g
                  className={
                    "leader-election-vote" +
                    (local.votedFor ? " leader-election-recorded-vote" : "")
                  }
                  data-identity={local.votedFor}
                >
                  <rect
                    x={node.x + 8}
                    y={node.y + 38}
                    width={node.width - 16}
                    height="22"
                    rx="2"
                  />
                  <text
                    className="leader-election-ballot"
                    x={node.x + 12}
                    y={node.y + 53}
                  >
                    Vote → {local.votedFor ?? "—"}
                  </text>
                </g>
                {position.index === 0 && (
                  <g>
                    <rect
                      className="leader-election-timer"
                      x={node.x + 12}
                      y={node.y + node.height - 6}
                      width={node.width - 24}
                      height="3"
                    />
                    <rect
                      className="leader-election-timer-fill"
                      x={node.x + 12}
                      y={node.y + node.height - 6}
                      width={(node.width - 24) * timer}
                      height="3"
                    />
                  </g>
                )}
              </g>
            );
          })}
          <g
            className="leader-election-tally"
            transform={"translate(" + layout.nodes.B.x + " 260)"}
          >
            <text className="leader-election-tally-label" y="0">
              Votes received
            </text>
            {step.candidates.length > 1 ? (
              step.candidates.map((candidate, index) => (
                <text
                  data-owner={candidate}
                  data-identity={candidate}
                  key={candidate}
                  y={24 + index * 24}
                >
                  {candidate}: {countVotes(ballots, candidate)} / 5
                </text>
              ))
            ) : majorityAchieved ? (
              <g className="leader-election-majority">
                <rect x="0" y="8" width={majorityWidth} height="32" rx="16" />
                <text
                  x={majorityWidth / 2}
                  y="24"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {leadingCandidate} has {receivedVotes} of 5 votes
                </text>
              </g>
            ) : (
              <text
                data-owner={leadingCandidate}
                data-identity={leadingCandidate}
                data-elected={!!step.leader}
                y="28"
              >
                {leadingCandidate
                  ? leadingCandidate +
                    ": " +
                    countVotes(ballots, leadingCandidate) +
                    " / 5"
                  : "0 / 5"}
              </text>
            )}
            <text
              className="leader-election-tally-label"
              data-majority={majorityAchieved}
              y={step.candidates.length > 1 ? 72 : 54}
            >
              {majorityAchieved ? "Majority achieved" : "3 needed to win"}
            </text>
          </g>
        </svg>
      </div>
      <div className="leader-election-controls">
        <button
          type="button"
          disabled={reduced}
          onClick={() => setPlaying((old) => !old)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" disabled={complete} onClick={next}>
          Next
        </button>
        <button type="button" onClick={() => reset()}>
          Replay
        </button>
      </div>
      <div
        className="leader-election-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p>
          {step.traffic?.[0]?.kind === "vote" && !repliesArrived
            ? recordingVotes
              ? "Followers record their votes"
              : "Votes return to the candidates"
            : step.name}
        </p>
        <p className="sr-only">
          {step.traffic?.[0]?.kind === "vote" && !repliesArrived
            ? recordingVotes
              ? "Each follower records its choice before sending a reply."
              : "Votes are traveling to the candidates."
            : step.event}
        </p>
        {!!receipts?.length && (
          <p className="sr-only">{receipts.join(" · ")}</p>
        )}
      </div>
      <figcaption>
        Five servers with equal logs; three votes to win. Illustrative timing.
        {reduced && " Use Next to step through."}
      </figcaption>
    </figure>
  );
}
