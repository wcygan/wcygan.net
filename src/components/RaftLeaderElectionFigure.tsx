import {
  electionTimers,
  getElectionTiming,
} from "~/demos/raft-election-overview/timing";
import { RaftPlaybackControls } from "./RaftPlaybackControls";
import { useEffect, useId, useRef, useState } from "react";
import {
  countVotes,
  receivedBallots,
  nodeStates,
  voteReplyProgress,
  voteRecordingTime,
  lessons,
  electionServers as servers,
  electionMajority,
  messageDeparture,
  type Lesson,
} from "~/demos/raft-election-overview/model";

import {
  electionLayout,
  connectionArrows,
  connectionWires,
  messageRoute,
  pointOnRoute,
  payloadLabelPosition,
} from "~/demos/raft-election-overview/layout";

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
  const layout = electionLayout(compact, lesson === "split");
  const steps = lessons[lesson].steps;
  const step = steps[position.index];
  const timing = getElectionTiming(lesson, compact);
  const duration = timing.durations[position.index];
  const elapsed =
    reduced && position.index > 0
      ? timing.checkpoints[position.index]
      : position.elapsed;
  const timers = electionTimers(lesson, position.index, elapsed, compact);
  const complete =
    position.index === steps.length - 1 && position.elapsed >= duration;
  const active = playing && visible && documentVisible && !reduced && !complete;
  const nodes = nodeStates(
    steps,
    position.index,
    elapsed,
    reduced,
    timing.flights,
  );
  const recordingVotes =
    step.traffic?.[0]?.kind === "vote" &&
    !reduced &&
    elapsed < voteRecordingTime;
  const ballots = receivedBallots(
    step,
    steps[position.index - 1],
    elapsed,
    reduced,
    timing.flights[position.index],
  );
  const repliesArrived =
    step.traffic?.every(
      (message, index) =>
        message.kind !== "vote" ||
        reduced ||
        voteReplyProgress(
          elapsed,
          index,
          timing.flights[position.index][index],
          messageDeparture(step, index, timing.flights[position.index]),
        ) === 1,
    ) ?? true;
  const connections = step.traffic ?? [];
  const receipts = step.traffic?.flatMap((message, index) =>
    message.kind === "vote" &&
    (reduced ||
      voteReplyProgress(
        elapsed,
        index,
        timing.flights[position.index][index],
        messageDeparture(step, index, timing.flights[position.index]),
      ) === 1)
      ? [
          `${message.from} → ${message.to}: ${message.granted ? "Granted" : "Refused"} (term ${step.term})`,
        ]
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
        const end = timing.durations[old.index];
        return elapsed >= end
          ? old.index === steps.length - 1
            ? { index: old.index, elapsed: end }
            : { index: old.index + 1, elapsed: 0 }
          : { index: old.index, elapsed };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, steps, timing]);

  const reset = (nextLesson = lesson) => {
    setLesson(nextLesson);
    setPosition({ index: 0, elapsed: 0 });
    setPlaying(!reduced);
  };
  function goTo(index: number) {
    setPlaying(false);
    setPosition({
      index,
      elapsed: index === 0 ? 0 : timing.checkpoints[index],
    });
  }
  const next = () =>
    goTo(
      position.index > 0 &&
        position.elapsed < timing.checkpoints[position.index]
        ? position.index
        : Math.min(position.index + 1, steps.length - 1),
    );
  const previousCompact = useRef(compact);
  useEffect(() => {
    if (previousCompact.current !== compact) {
      setPosition((old) => ({
        index: old.index,
        elapsed: old.index === 0 ? 0 : timing.checkpoints[old.index],
      }));
      previousCompact.current = compact;
    }
  }, [compact, timing]);
  const leadingCandidate = step.leader ?? step.candidates[0];
  const receivedVotes = leadingCandidate
    ? countVotes(ballots, leadingCandidate)
    : 0;
  const majorityAchieved = receivedVotes >= electionMajority;

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
                  ? "Votes recorded"
                  : "Votes returning"
                : step.candidates.length
                  ? "Requesting votes"
                  : "Election timers"}
          </span>
        </div>
        <svg
          className="leader-election-scene"
          data-compact={compact}
          viewBox={`${-layout.sidePadding} ${layout.top} ${layout.width + layout.sidePadding * 2} ${layout.height - layout.top}`}
          role="img"
          aria-labelledby={id + "-scene-title " + id + "-scene-description"}
        >
          <title id={id + "-scene-title"}>
            Three servers choosing a leader
          </title>
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
                  (nodes[server].role !== "Leader"
                    ? ". Election timer: " +
                      Math.round(timers[server].progress * 100) +
                      "%"
                    : "") +
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
          {connectionWires(layout, [
            { kind: "request", from: "A", to: "B" },
            { kind: "request", from: "A", to: "C" },
            { kind: "request", from: "B", to: "C" },
          ]).map((points, index) => (
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
            connectionArrows(layout, connections, false).map(
              (points, index) => (
                <polygon
                  key={index}
                  className="leader-election-arrow"
                  points={points.map((point) => point.join(",")).join(" ")}
                />
              ),
            )}
          {servers.map((server) => {
            const [x, y] = layout.centers[server];
            const detailX = layout.detailCenters[server];
            const detailOffsets =
              server === "A" ? layout.aDetailOffsets : layout.detailOffsets;
            const local = nodes[server];
            const timer = timers[server];
            return (
              <g
                key={server}
                className="leader-election-server"
                data-server={server}
                data-identity={server}
                data-role={local.role}
                data-term={local.term}
                data-leader={local.leader ?? ""}
                data-vote={local.votedFor}
              >
                {local.role !== "Follower" && (
                  <circle
                    className="leader-election-role-ring"
                    cx={x}
                    cy={y}
                    r="25"
                  />
                )}
                <circle className="leader-election-node" cx={x} cy={y} r="20" />
                <text
                  className="leader-election-server-name"
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {server}
                </text>
                <text
                  className="leader-election-role"
                  x={detailX}
                  y={y + detailOffsets[0]}
                  textAnchor="middle"
                >
                  {local.role}
                </text>
                <text
                  className="leader-election-node-state"
                  x={detailX}
                  y={y + detailOffsets[1]}
                  textAnchor="middle"
                >
                  Term <tspan className="raft-term-value">{local.term}</tspan>
                </text>
                <g
                  className={
                    local.votedFor
                      ? "leader-election-vote leader-election-recorded-vote"
                      : "leader-election-vote"
                  }
                  data-identity={local.votedFor}
                >
                  <text
                    className="leader-election-ballot"
                    x={detailX}
                    y={y + detailOffsets[2]}
                    textAnchor="middle"
                  >
                    Vote → {local.votedFor ?? "—"}
                  </text>
                </g>
                {local.role !== "Leader" ? (
                  <g
                    data-timer={server}
                    data-progress={timer.progress}
                    data-reset-at={timer.resetAt}
                    data-deadline={timer.deadline}
                  >
                    <rect
                      className="leader-election-timer"
                      x={detailX - 35}
                      y={y + detailOffsets[3]}
                      width="70"
                      height="3"
                    />
                    <rect
                      className="leader-election-timer-fill"
                      x={detailX - 35}
                      y={y + detailOffsets[3]}
                      width={70 * timer.progress}
                      height="3"
                    />
                    <text
                      className="leader-election-node-state"
                      x={detailX}
                      y={y + detailOffsets[4]}
                      textAnchor="middle"
                    >
                      Timeout
                    </text>
                  </g>
                ) : (
                  local.leader && (
                    <text
                      className="leader-election-node-state"
                      x={detailX}
                      y={y + detailOffsets[4]}
                      textAnchor="middle"
                    >
                      Leader {local.leader}
                    </text>
                  )
                )}
              </g>
            );
          })}
          <g
            className="leader-election-tally"
            transform={`translate(${layout.width / 2} ${layout.tallyY})`}
            textAnchor="middle"
          >
            <text className="leader-election-tally-label">Votes received</text>
            {step.candidates.length > 1 ? (
              step.candidates.map((candidate, index) => (
                <text
                  key={candidate}
                  data-owner={candidate}
                  data-identity={candidate}
                  y={24 + index * 23}
                >
                  {candidate}: {countVotes(ballots, candidate)} / 3
                </text>
              ))
            ) : (
              <g
                className={
                  majorityAchieved ? "leader-election-majority" : undefined
                }
              >
                <text
                  data-owner={leadingCandidate}
                  data-identity={leadingCandidate}
                  y="25"
                >
                  {leadingCandidate
                    ? `${leadingCandidate}: ${receivedVotes} / 3`
                    : "0 / 3"}
                </text>
              </g>
            )}
            <text
              className="leader-election-tally-label"
              data-majority={majorityAchieved}
              y={step.candidates.length > 1 ? 95 : 49}
            >
              {majorityAchieved ? "Majority achieved" : "2 needed to win"}
            </text>
          </g>
          {step.traffic?.map((message, index) => {
            const route = messageRoute(layout, message);
            const owner = message.kind === "vote" ? message.to : message.from;
            const fraction =
              message.kind === "vote"
                ? reduced
                  ? 1
                  : voteReplyProgress(
                      position.elapsed,
                      index,
                      timing.flights[position.index][index],
                      messageDeparture(
                        step,
                        index,
                        timing.flights[position.index],
                      ),
                    )
                : reduced
                  ? 1
                  : Math.min(
                      1,
                      (position.elapsed -
                        messageDeparture(
                          step,
                          index,
                          timing.flights[position.index],
                        )) /
                        timing.flights[position.index][index],
                    );
            if (reduced || fraction <= 0 || fraction >= 1) return null;
            const packet = pointOnRoute(route, fraction);
            const labelPosition = payloadLabelPosition(message, packet, layout);
            return (
              <g
                key={index}
                className="leader-election-message"
                data-owner={owner}
                data-identity={owner}
                data-kind={message.kind}
                data-term={step.term}
                data-packet-position={packet.join(" ")}
              >
                <g
                  className="leader-election-payload-tether"
                  aria-hidden="true"
                >
                  <path d={`M${packet.join(" ")}L${labelPosition.join(" ")}`} />
                  <circle cx={packet[0]} cy={packet[1]} r={compact ? 4 : 3} />
                </g>
                <g
                  className={
                    message.kind === "vote"
                      ? "leader-election-reply"
                      : message.kind === "heartbeat"
                        ? "leader-election-heartbeat"
                        : "leader-election-request"
                  }
                  data-granted={
                    message.kind === "vote" ? message.granted : undefined
                  }
                  transform={`translate(${labelPosition.join(" ")})`}
                >
                  <title>
                    {message.from} → {message.to}:{" "}
                    {message.kind === "vote"
                      ? message.granted
                        ? "vote granted"
                        : "vote refused"
                      : message.kind === "heartbeat"
                        ? "heartbeat"
                        : "request vote"}
                    , term {step.term}
                  </title>
                  <rect
                    x={-layout.payloadWidth / 2}
                    y={-layout.payloadHeight / 2}
                    width={layout.payloadWidth}
                    height={layout.payloadHeight}
                    rx="3"
                  />
                  <text
                    y={-layout.textPitch}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {message.kind === "vote"
                      ? message.granted
                        ? "Vote granted"
                        : "Vote refused"
                      : message.kind === "heartbeat"
                        ? "Heartbeat"
                        : "Request vote"}
                  </text>
                  <text y="0" textAnchor="middle" dominantBaseline="central">
                    Term: {step.term}
                  </text>
                  <text
                    y={layout.textPitch}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {message.from} → {message.to}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
      <RaftPlaybackControls
        label="Leader election playback"
        reduced={reduced}
        complete={complete}
        playing={playing}
        step={position.index}
        count={steps.length}
        onPlay={() => setPlaying((old) => !old)}
        onBack={() => goTo(position.index - 1)}
        onNext={next}
        onReplay={() => reset()}
      />
      <div
        className="leader-election-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>
          {step.traffic?.[0]?.kind === "vote" && !repliesArrived
            ? majorityAchieved
              ? "B is leader; C’s reply is still on its way"
              : recordingVotes
                ? step.candidates.length > 1
                  ? "Candidates keep their own votes"
                  : "Followers have recorded their votes"
                : "Votes return to the candidates"
            : step.name}
        </p>
        {!!receipts?.length && (
          <p className="sr-only">{receipts.join(" · ")}</p>
        )}
      </div>
    </figure>
  );
}
