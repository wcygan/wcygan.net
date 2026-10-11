import { useEffect, useId, useRef, useState } from "react";
import { scenarios, type Phase, type Scenario } from "~/demos/raft-roles/model";

const roles = [
  { label: "Follower", y: 16, height: 104 },
  { label: "Candidate", y: 176, height: 132 },
  { label: "Leader", y: 372, height: 104 },
];
const node = { x: 20, width: 360 };
const centerX = node.x + node.width / 2;
const rightX = node.x + node.width;
const heartPath =
  "M 0 11 C -4 7 -13 1 -13 -5 C -13 -13 -3 -14 0 -7 C 3 -14 13 -13 13 -5 C 13 1 4 7 0 11 Z";
const symbols = { granted: "✓", denied: "×", pending: "·" };

export function RaftRoleTransitionsFigure() {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const [scenario, setScenario] = useState<Scenario>("win");
  const [position, setPosition] = useState({ index: 0, elapsed: 0 });
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [incomingLeft, setIncomingLeft] = useState(-60);
  const [documentVisible, setDocumentVisible] = useState(true);
  const phases: readonly Phase[] = scenarios[scenario].phases;
  const destination = phases[position.index];
  const previous = phases[position.index - 1];
  const travelDuration = destination.edge && previous ? 900 : 0;
  const traveling = !reduced && position.elapsed < travelDuration;
  const current = traveling && previous ? previous : destination;
  const elapsed = traveling
    ? current.duration
    : Math.max(0, position.elapsed - travelDuration);
  const complete =
    !playing &&
    position.index === phases.length - 1 &&
    position.elapsed >= destination.duration + travelDuration;
  const transitionPath =
    paths.current[
      destination.edge === "leader-found"
        ? "candidate-term"
        : (destination.edge ?? "")
    ];
  const marker =
    traveling && transitionPath
      ? transitionPath.getPointAtLength(
          (transitionPath.getTotalLength() * position.elapsed) / travelDuration,
        )
      : undefined;
  const active = playing && visible && documentVisible && !reduced;
  const messageProgress = reduced ? 1 : Math.min(1, elapsed / 1400);
  const messageArrived = !!current.message && messageProgress === 1;
  const timer =
    messageArrived && current.message?.kind === "heartbeat"
      ? 0
      : current.timer[0] +
        (current.timer[1] - current.timer[0]) *
          Math.min(1, elapsed / current.duration);
  const replies =
    !traveling &&
    current.role === "Candidate" &&
    previous?.role === "Candidate" &&
    previous.term === current.term
      ? current.votes.flatMap((vote, index) =>
          index > 0 && vote !== "pending" && vote !== previous.votes[index]
            ? [{ index, vote }]
            : [],
        )
      : [];
  const replyProgress = (order: number) =>
    reduced ? 1 : Math.min(1, Math.max(0, (elapsed - order * 200) / 1400));
  const receivedVotes = current.votes.map((vote, index) => {
    const order = replies.findIndex((reply) => reply.index === index);
    return order >= 0 && replyProgress(order) < 1 ? "pending" : vote;
  });
  const votes = receivedVotes.filter((vote) => vote === "granted").length;
  const receivedGrant = replies.some(
    (reply, order) => reply.vote === "granted" && replyProgress(order) === 1,
  );
  const receivedDenial = replies.some(
    (reply, order) => reply.vote === "denied" && replyProgress(order) === 1,
  );
  const noMajority =
    current.role === "Candidate" &&
    (receivedDenial || (current.noMajority && (reduced || elapsed >= 1400)));
  const heartbeatCycle = elapsed % 1000;
  const heartbeatProgress =
    complete || reduced ? 1 : Math.min(1, heartbeatCycle / 850);
  const heartbeatPulse =
    current.role === "Leader" && !complete && !reduced && heartbeatCycle >= 850
      ? 1 + 0.16 * Math.sin((Math.PI * (heartbeatCycle - 850)) / 150)
      : 1;
  const highlight = !playing || traveling ? destination.edge : undefined;

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    const element = stage.current;
    const svg = element?.querySelector("svg");
    if (!element || !svg) return;
    const measure = () => {
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width) return;
      // The SVG is centered inside the stage; include its outer gutter so
      // messages enter from the stage edge at every viewport width.
      setIncomingLeft(
        -60 -
          ((bounds.left - element.getBoundingClientRect().left) * 560) /
            bounds.width,
      );
    };
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
        if (
          elapsed >=
          phases[old.index].duration +
            (phases[old.index].edge && old.index > 0 ? 900 : 0)
        ) {
          return { index: (old.index + 1) % phases.length, elapsed: 0 };
        }
        return { index: old.index, elapsed };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, phases]);

  const reset = (nextScenario = scenario, play = true) => {
    setScenario(nextScenario);
    setPosition({ index: 0, elapsed: 0 });
    setPlaying(play && !reduced);
  };
  const next = () => {
    setPlaying(false);
    setPosition((old) => ({
      index: Math.min(old.index + 1, phases.length - 1),
      elapsed:
        phases[Math.min(old.index + 1, phases.length - 1)].duration +
        (phases[Math.min(old.index + 1, phases.length - 1)].edge ? 900 : 0),
    }));
  };
  const wire = (path: string, highlighted: boolean, key: string) => (
    <g key={key}>
      <path
        className="raft-roles-wire"
        ref={(element) => {
          paths.current[key] = element;
        }}
        d={path}
        markerEnd={`url(#${id}-arrow)`}
      />
      <path
        className="raft-roles-wire-active"
        data-active={highlighted}
        d={path}
        markerEnd={`url(#${id}-active-arrow)`}
      />
    </g>
  );

  return (
    <figure
      className="raft-roles-figure"
      data-graphic-frame="workbench"
      aria-labelledby={`${id}-heading`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-heading`}>
          Changing roles
        </p>
      </header>
      <label className="raft-roles-scenario" htmlFor={`${id}-scenario`}>
        Scenario
        <select
          id={`${id}-scenario`}
          value={scenario}
          onChange={(event) => reset(event.target.value as Scenario)}
        >
          {Object.entries(scenarios).map(([key, value]) => (
            <option value={key} key={key}>
              {value.label}
            </option>
          ))}
        </select>
      </label>
      <div
        className="raft-roles-stage"
        data-playback={
          complete
            ? "complete"
            : active
              ? "playing"
              : playing
                ? "suspended"
                : "paused"
        }
        data-graphic-stage="padded"
        ref={stage}
      >
        <svg
          viewBox="-60 0 560 492"
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
        >
          <title id={`${id}-title`}>Raft role transitions for one server</title>
          <desc id={`${id}-description`}>
            Five servers need three votes to elect a leader. Followers become
            candidates on election timeout. Candidates become leaders with three
            votes, retry in a new term on timeout, or follow an elected leader.
            Candidates and leaders become followers on discovering a higher
            term. Current role: {current.role}. Term: {current.term}.{" "}
            {current.event}
          </desc>
          <defs>
            {["arrow", "active-arrow"].map((name) => (
              <marker
                key={name}
                id={`${id}-${name}`}
                viewBox="0 0 8 8"
                refX="8"
                refY="4"
                markerWidth="8"
                markerHeight="8"
                markerUnits="userSpaceOnUse"
                orient="auto"
              >
                <path d="M 0 0 L 8 4 L 0 8" className={`raft-roles-${name}`} />
              </marker>
            ))}
          </defs>
          {wire(`M ${centerX} 120 V 176`, highlight === "election", "election")}
          {wire(`M ${centerX} 308 V 372`, highlight === "majority", "majority")}
          {wire(
            `M ${rightX} 424 H 400 V 68 H ${rightX}`,
            highlight === "leader-term",
            "leader-term",
          )}
          {wire(
            `M ${rightX} 242 H 400 V 68 H ${rightX}`,
            highlight === "candidate-term" || highlight === "leader-found",
            "candidate-term",
          )}
          {wire(
            `M ${centerX} 176 V 156 H 356 V 176`,
            highlight === "retry",
            "retry",
          )}
          {marker && (
            <circle
              className="raft-roles-transition-marker"
              cx={marker.x}
              cy={marker.y}
              r="5"
              aria-hidden="true"
            />
          )}
          {roles.map((role) => (
            <g key={role.label}>
              <rect
                className="raft-roles-node"
                data-role={role.label}
                x={node.x}
                y={role.y}
                width={node.width}
                height={role.height}
                rx="2"
              />
              <rect
                className="raft-roles-node-active"
                data-active={current.role === role.label}
                x={node.x}
                y={role.y}
                width={node.width}
                height={role.height}
                rx="2"
              />
              <text
                className="raft-roles-label"
                x={node.x + 16}
                y={role.y + 29}
                textAnchor="start"
              >
                {role.label}
              </text>
              <text
                className="raft-roles-term"
                x={rightX - 16}
                y={role.y + 29}
                textAnchor="end"
              >
                Term{" "}
                {current.role === role.label
                  ? current.term
                  : (phases
                      .slice(0, position.index + (traveling ? 0 : 1))
                      .findLast((phase) => phase.role === role.label)?.term ??
                    "—")}
              </text>
              {role.label === "Follower" && (
                <g>
                  <text
                    className="raft-roles-detail"
                    x={centerX}
                    y={role.y + 57}
                    textAnchor="middle"
                  >
                    Election timeout
                  </text>
                  <rect
                    className="raft-roles-timer-track"
                    x="36"
                    y={role.y + 70}
                    width="328"
                    height="8"
                    rx="2"
                  />
                  <g
                    transform={`translate(36 ${role.y + 70}) scale(${current.role === "Follower" ? timer : 0} 1)`}
                  >
                    <rect
                      className="raft-roles-timer-fill"
                      width="328"
                      height="8"
                    />
                  </g>
                  <text
                    className="raft-roles-detail"
                    x={centerX}
                    y={role.y + 96}
                    textAnchor="middle"
                  >
                    {current.role === "Follower"
                      ? `${Math.round(timer * 100)}%`
                      : "Waiting for leader"}
                  </text>
                </g>
              )}
              {role.label === "Candidate" && (
                <g>
                  <text
                    className="raft-roles-stats"
                    x="112"
                    y={role.y + 57}
                    textAnchor="middle"
                  >
                    Cluster: 5
                  </text>
                  <text
                    className="raft-roles-stats"
                    x="288"
                    y={role.y + 57}
                    textAnchor="middle"
                  >
                    Majority: 3
                  </text>
                  <text
                    className="raft-roles-detail"
                    x="200"
                    y={role.y + 80}
                    textAnchor="middle"
                  >
                    Votes: {votes} / 3
                  </text>
                  {(receivedGrant || noMajority) && (
                    <text
                      className="raft-roles-received-check"
                      data-failed={noMajority}
                      x="310"
                      y={role.y + 80}
                      textAnchor="middle"
                    >
                      {noMajority ? "×" : "✓"}
                    </text>
                  )}
                  {receivedVotes.map((vote, index) => (
                    <g key={index}>
                      <text
                        className="raft-roles-vote"
                        data-vote={vote}
                        x={64 + index * 68}
                        y={role.y + 100}
                        textAnchor="middle"
                      >
                        {symbols[vote]}
                      </text>
                      <text
                        className="raft-roles-voter"
                        x={64 + index * 68}
                        y={role.y + 122}
                        textAnchor="middle"
                      >
                        {index === 0 ? "Self" : ["B", "C", "D", "E"][index - 1]}
                      </text>
                    </g>
                  ))}
                  <g
                    transform={`translate(36 ${role.y + 128}) scale(${current.role === "Candidate" ? timer : 0} 1)`}
                  >
                    <rect
                      className="raft-roles-timer-fill"
                      width="328"
                      height="4"
                    />
                  </g>
                </g>
              )}
              {role.label === "Leader" && (
                <g>
                  <circle
                    className="raft-roles-heart-track"
                    cx={centerX}
                    cy={role.y + role.height / 2}
                    r="21"
                  />
                  <circle
                    className="raft-roles-heart-progress"
                    cx={centerX}
                    cy={role.y + role.height / 2}
                    r="21"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={
                      current.role === "Leader"
                        ? 100 * (1 - heartbeatProgress)
                        : 100
                    }
                    transform={`rotate(-90 ${centerX} ${role.y + role.height / 2})`}
                  />
                  <g
                    transform={`translate(${centerX} ${role.y + role.height / 2}) scale(${heartbeatPulse})`}
                  >
                    <path
                      className="raft-roles-heart"
                      d={heartPath}
                      transform="translate(0 1)"
                    />
                  </g>
                  <text
                    className="raft-roles-voter"
                    x={centerX}
                    y={role.y + 96}
                    textAnchor="middle"
                  >
                    Sends heartbeats
                  </text>
                </g>
              )}
            </g>
          ))}
          {replies.map((reply, order) => (
            <g key={reply.index} aria-hidden="true">
              {replyProgress(order) < 1 && (
                <g
                  transform={`translate(${incomingLeft - 14 + (node.x + 14 - (incomingLeft - 14)) * replyProgress(order)} 260)`}
                >
                  <rect
                    className="raft-roles-response"
                    data-vote={reply.vote}
                    x="-14"
                    y="-12"
                    width="28"
                    height="24"
                    rx="3"
                  />
                  <text
                    className="raft-roles-response-label"
                    textAnchor="middle"
                    y="5"
                  >
                    {["Self", "B", "C", "D", "E"][reply.index]}
                  </text>
                </g>
              )}
            </g>
          ))}
          {current.message && !messageArrived && (
            <g
              className="raft-roles-incoming"
              aria-hidden="true"
              transform={`translate(${incomingLeft - 46 + (node.x - (incomingLeft - 46)) * messageProgress} ${roles.find((role) => role.label === current.role)!.y + 78})`}
            >
              {current.message.kind === "heartbeat" &&
              current.role === "Follower" ? (
                <g>
                  <path className="raft-roles-heart" d={heartPath} />
                  <text className="raft-roles-voter" textAnchor="middle" y="30">
                    Term {current.message.term}
                  </text>
                </g>
              ) : (
                <g>
                  <rect
                    className="raft-roles-leader-request"
                    x="-46"
                    y="-25"
                    width="92"
                    height="48"
                    rx="3"
                  />
                  <text className="raft-roles-voter" textAnchor="middle" y="-5">
                    Leader request
                  </text>
                  <text
                    className="raft-roles-detail"
                    textAnchor="middle"
                    y="13"
                  >
                    Term {current.message.term}
                  </text>
                </g>
              )}
            </g>
          )}
          {messageArrived &&
            current.message?.kind === "heartbeat" &&
            current.role === "Follower" &&
            !reduced && (
              <g transform="translate(46 105) scale(0.6)">
                <path className="raft-roles-heart" d={heartPath} />
              </g>
            )}
          <text
            className="raft-roles-condition"
            x="184"
            y="141"
            textAnchor="end"
          >
            <tspan x="184">Election</tspan>
            <tspan x="184" dy="18">
              timeout
            </tspan>
          </text>
          <text
            className="raft-roles-condition"
            x="184"
            y="333"
            textAnchor="end"
          >
            <tspan x="184">Majority</tspan>
            <tspan x="184" dy="18">
              vote
            </tspan>
          </text>
          <text className="raft-roles-condition" x="416" y="141">
            <tspan x="416">
              {current.edge === "leader-found" ? "Leader" : "Higher"}
            </tspan>
            <tspan x="416" dy="18">
              {current.edge === "leader-found" ? "found" : "term"}
            </tspan>
          </text>
          <text
            className="raft-roles-retry-label"
            x="280"
            y="148"
            textAnchor="middle"
          >
            Retry
          </text>
        </svg>
      </div>
      <div className="raft-roles-controls">
        <button
          type="button"
          disabled={reduced}
          title={reduced ? "Use Next with reduced motion" : undefined}
          onClick={() => setPlaying((old) => !old)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" disabled={complete} onClick={next}>
          Next
        </button>
        <button type="button" onClick={() => reset(scenario, true)}>
          Replay
        </button>
      </div>
      <div
        className="raft-roles-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p className="raft-roles-state">
          Role: {current.role} · Term: {current.term}
        </p>
        <p>{current.event}</p>
      </div>
      <figcaption>
        One server in a five-server cluster. Three votes elect a leader,
        including its own. Timing is slowed for the walkthrough.{" "}
        {reduced && "Use Next to advance each event."}
      </figcaption>
    </figure>
  );
}
