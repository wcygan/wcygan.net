import { useEffect, useMemo, useRef, useState } from "react";
import {
  decisionFor,
  participantLabels,
  participantRows,
  protocolFrames,
  type Phase,
  type Votes,
} from "~/demos/two-phase-commit/model";

const HOLD_MS = 1000;
const TRANSITION_MS = 1000;

type Point = readonly [number, number];
type Bounds = { x: number; y: number; width: number; height: number };
const COORDINATOR: Bounds = { x: 65, y: 20, width: 270, height: 148 };
const PARTICIPANTS: [Bounds, Bounds] = [
  { x: 8, y: 235, width: 174, height: 112 },
  { x: 218, y: 235, width: 174, height: 112 },
];
const port = (bounds: Bounds, face: "top" | "bottom"): Point => [
  bounds.x + bounds.width / 2,
  bounds.y + (face === "bottom" ? bounds.height : 0),
];
const sourcePort = port(COORDINATOR, "bottom");
const ROUTES = PARTICIPANTS.map((bounds): Point[] => {
  const destination = port(bounds, "top");
  const branchY = (sourcePort[1] + destination[1]) / 2;
  return [
    sourcePort,
    [sourcePort[0], branchY],
    [destination[0], branchY],
    destination,
  ];
});
const pathFor = (points: Point[]) =>
  points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ");
function pointAlong(points: Point[], progress: number): Point {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - points[index][0], point[1] - points[index][1]),
    );
  let distance = lengths.reduce((sum, length) => sum + length, 0) * progress;
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index]) {
      const fraction = distance / lengths[index];
      return [
        points[index][0] + (points[index + 1][0] - points[index][0]) * fraction,
        points[index][1] + (points[index + 1][1] - points[index][1]) * fraction,
      ];
    }
    distance -= lengths[index];
  }
  return points[points.length - 1];
}
export function TwoPhaseProtocolDemo({ phase }: { phase: Phase }) {
  const [votes, setVotes] = useState<Votes>(["yes", "yes"]);
  const frames = useMemo(() => protocolFrames(phase, votes), [phase, votes]);
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<"auto" | "step" | "paused">("auto");
  const [moving, setMoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const elapsed = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const frame = frames[step];
  const next = frames[Math.min(step + 1, frames.length - 1)];
  const done = step === frames.length - 1;
  const title = phase === "prepare" ? "Prepare" : "Commit or Abort";
  const id = `two-phase-${phase}`;
  const yesVotesReceived = frame.yesVotesReceived ?? 0;
  const tally = `${yesVotesReceived}/2 = ${yesVotesReceived === 2 ? "COMMIT" : "ABORT"}`;
  const playing = intent !== "paused" && !reduced && !done;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) {
        setIntent("paused");
        setMoving(false);
        setProgress(0);
        elapsed.current = 0;
      }
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
      },
      { threshold: [0, 0.25] },
    );
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!playing || !visible || !documentVisible) return;
    let request = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) elapsed.current += now - previous;
      previous = now;
      if (!moving) {
        if (elapsed.current >= HOLD_MS) {
          elapsed.current = 0;
          setProgress(0);
          setMoving(true);
          return;
        }
      } else {
        const fraction = Math.min(1, elapsed.current / TRANSITION_MS);
        setProgress(fraction);
        if (fraction === 1) {
          elapsed.current = 0;
          setProgress(0);
          setMoving(false);
          setStep(step + 1);
          if (intent === "step") setIntent("paused");
          return;
        }
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, visible, documentVisible, moving, intent, step, frames.length]);

  function reset(nextVotes = votes) {
    setVotes(nextVotes);
    setStep(0);
    setMoving(false);
    setProgress(0);
    elapsed.current = 0;
    setIntent(reduced ? "paused" : "auto");
  }

  function advance() {
    if (reduced) {
      elapsed.current = 0;
      setIntent("paused");
      setStep((value) => Math.min(value + 1, frames.length - 1));
      return;
    }
    if (!moving) {
      elapsed.current = 0;
      setProgress(0);
      setMoving(true);
    }
    setIntent("step");
  }

  const message = moving ? next.message : undefined;
  const visibleFrame = frame;
  const sendingPrepare = message?.labels[0] === "PREPARE";
  const decisionTone = sendingPrepare ? "info" : visibleFrame.coordinatorTone;
  const wireMessage = message ?? visibleFrame.message;
  const trunkTone = wireMessage
    ? wireMessage.tones.every((tone) => tone === wireMessage.tones[0])
      ? wireMessage.tones[0]
      : "info"
    : decisionTone;
  const returning = wireMessage?.direction === "in";
  const coordinatorLabel = sendingPrepare
    ? "Sending PREPARE"
    : visibleFrame.coordinator;
  const event = message
    ? `${message.labels.join(" / ")} in transit.`
    : visibleFrame.status;

  return (
    <figure
      className="two-phase-demo"
      data-graphic-frame="workbench"
      data-graphic-key={id}
      data-graphic-kind="svg"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <p className="article-graphic-title" id={`${id}-title`}>
        {title}
      </p>
      <p className="two-phase-description">
        {phase === "prepare"
          ? "Coordinator sends PREPARE to participants, asking them to vote"
          : "Coordinator receives votes and decides to COMMIT or ABORT"}
      </p>
      <div ref={stage} className="two-phase-stage" data-graphic-stage="flush">
        <svg viewBox="0 0 400 415" aria-hidden="true">
          <defs>
            {(["neutral", "info", "yes", "no", "commit"] as const).map(
              (tone) => (
                <marker
                  key={tone}
                  id={`${id}-arrow-${tone}`}
                  viewBox="0 -4 8 8"
                  refX="8"
                  refY="0"
                  markerWidth="8"
                  markerHeight="8"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path
                    className="two-phase-arrow"
                    data-tone={tone}
                    d="M0 -3 L8 0 L0 3"
                  />
                </marker>
              ),
            )}
          </defs>
          <g
            className="two-phase-route"
            data-tone={trunkTone}
            data-active={moving ? "true" : "false"}
          >
            <path
              className="two-phase-connector"
              d={pathFor(
                returning
                  ? [ROUTES[0][1], sourcePort]
                  : [sourcePort, ROUTES[0][1]],
              )}
              markerEnd={
                returning ? `url(#${id}-arrow-${trunkTone})` : undefined
              }
            />
          </g>
          {ROUTES.map((route, target) => {
            const messageIndex =
              wireMessage?.targets.indexOf(target as 0 | 1) ?? -1;
            const tone =
              messageIndex >= 0
                ? wireMessage!.tones[messageIndex]
                : decisionTone;
            const points =
              messageIndex >= 0 && wireMessage?.direction === "in"
                ? route.slice(1).reverse()
                : route.slice(1);
            const label =
              messageIndex >= 0
                ? wireMessage!.labels[messageIndex]
                : (visibleFrame.decision ??
                  (phase === "prepare" ? "PREPARE" : "DECISION"));
            return (
              <g
                key={target}
                className="two-phase-route"
                data-tone={tone}
                data-active={
                  message?.targets.includes(target as 0 | 1) ? "true" : "false"
                }
              >
                <path
                  className="two-phase-connector"
                  d={pathFor(points)}
                  markerEnd={
                    messageIndex >= 0 && returning
                      ? undefined
                      : `url(#${id}-arrow-${tone})`
                  }
                />
                <text
                  x={port(PARTICIPANTS[target], "top")[0]}
                  y="168"
                  className="two-phase-route-label"
                >
                  {label}
                </text>
              </g>
            );
          })}
          <g
            className="two-phase-node two-phase-coordinator"
            data-tone={decisionTone}
          >
            <rect
              x={COORDINATOR.x}
              y={COORDINATOR.y}
              width={COORDINATOR.width}
              height={COORDINATOR.height}
              rx="4"
            />
            <path
              className="two-phase-node-divider"
              d={`M${COORDINATOR.x} ${COORDINATOR.y + 36} H${COORDINATOR.x + COORDINATOR.width} M${COORDINATOR.x} ${COORDINATOR.y + 78} H${COORDINATOR.x + COORDINATOR.width} M${COORDINATOR.x} ${COORDINATOR.y + 120} H${COORDINATOR.x + COORDINATOR.width}`}
            />
            <text x="200" y="45" className="two-phase-node-name">
              Coordinator
            </text>
            <text x="200" y="81" className="two-phase-node-state">
              {coordinatorLabel}
            </text>
            {phase === "decision" && (
              <text
                x="200"
                y="125"
                className="two-phase-vote-rule"
                data-tone={yesVotesReceived === 2 ? "commit" : "no"}
                textAnchor="middle"
              >
                {tally}
              </text>
            )}
            {(visibleFrame.coordinatorState === "recorded" ||
              visibleFrame.coordinatorState === "acknowledged") && (
              <text x="200" y="156" className="two-phase-node-detail">
                {visibleFrame.coordinatorState === "acknowledged"
                  ? "Both ACKs received"
                  : "Saved durably"}
              </text>
            )}
          </g>
          {PARTICIPANTS.map((bounds, index) => {
            const state = visibleFrame.participants[index];
            const labels = participantLabels[state];
            const x = bounds.x + bounds.width / 2;
            const cap = 10;
            return (
              <g
                className="two-phase-node two-phase-participant"
                key={index}
                data-state={state}
              >
                <g className="two-phase-participant-content">
                  <path
                    className="two-phase-database-body"
                    d={`M${bounds.x} ${bounds.y + cap} V${bounds.y + bounds.height - cap} A${bounds.width / 2} ${cap} 0 0 0 ${bounds.x + bounds.width} ${bounds.y + bounds.height - cap} V${bounds.y + cap} Z`}
                  />
                  <ellipse
                    className="two-phase-database-cap"
                    cx={x}
                    cy={bounds.y + cap}
                    rx={bounds.width / 2}
                    ry={cap}
                  />
                  <text x={x} y={bounds.y + 43} className="two-phase-node-name">
                    Participant {index === 0 ? "A" : "B"}
                  </text>
                  <text
                    x={x}
                    y={bounds.y + 70}
                    className="two-phase-node-state"
                  >
                    {labels.title}
                  </text>
                  {labels.detail && (
                    <text
                      x={x}
                      y={bounds.y + 93}
                      className="two-phase-node-detail"
                    >
                      {labels.detail}
                    </text>
                  )}
                </g>
                <g
                  className="two-phase-row"
                  data-locked={labels.locked ? "true" : "false"}
                >
                  <rect
                    x={bounds.x}
                    y={bounds.y + bounds.height + 12}
                    width={bounds.width}
                    height="34"
                    rx="3"
                  />
                  <g
                    className="two-phase-lock-icon"
                    transform={`translate(${bounds.x + 12} ${bounds.y + bounds.height + 19})`}
                  >
                    <path
                      d={
                        labels.locked
                          ? "M3 9 V5 A4 4 0 0 1 11 5 V9"
                          : "M3 9 V5 A4 4 0 0 1 11 5"
                      }
                    />
                    <rect x="1" y="9" width="12" height="10" rx="1" />
                  </g>
                  <text x={bounds.x + 33} y={bounds.y + bounds.height + 34}>
                    {participantRows[index]}
                  </text>
                  <text
                    x={bounds.x + bounds.width - 10}
                    y={bounds.y + bounds.height + 34}
                    className="two-phase-row-lock"
                  >
                    {labels.locked ? "LOCKED" : "UNLOCKED"}
                  </text>
                </g>
              </g>
            );
          })}
          {[
            sourcePort,
            ...PARTICIPANTS.map((bounds) => port(bounds, "top")),
          ].map(([x, y], index) => (
            <circle
              className="two-phase-port"
              cx={x}
              cy={y}
              r="2.5"
              key={index}
            />
          ))}
          {message?.targets.map((target, index) => {
            const points =
              message.direction === "out"
                ? ROUTES[target]
                : [...ROUTES[target]].reverse();
            const [x, y] = pointAlong(points, progress);
            return (
              <g
                key={target}
                className="two-phase-message"
                data-tone={message.tones[index]}
              >
                <rect x={x - 4.5} y={y - 4.5} width="9" height="9" rx="1.5" />
              </g>
            );
          })}
        </svg>
      </div>
      {phase === "decision" && (
        <div className="two-phase-votes">
          {([0, 1] as const).map((index) => (
            <fieldset key={index}>
              <legend>Participant {index === 0 ? "A" : "B"} vote</legend>
              {(["yes", "no"] as const).map((vote) => (
                <button
                  key={vote}
                  data-vote={vote}
                  type="button"
                  aria-pressed={votes[index] === vote}
                  onClick={() => {
                    const updated: Votes = [...votes];
                    updated[index] = vote;
                    reset(updated);
                  }}
                >
                  {vote === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      <div className="two-phase-controls">
        <button
          type="button"
          disabled={reduced || done}
          onClick={() => setIntent(playing ? "paused" : "auto")}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={done || (moving && playing)}
          onClick={advance}
        >
          Step
        </button>
        <button type="button" onClick={() => reset()}>
          Replay
        </button>
        <span>
          {step + 1} / {frames.length}
        </span>
      </div>
      <div
        className="two-phase-status"
        aria-live={playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>{event}</p>
        <p className="sr-only">
          Coordinator: {coordinatorLabel}. Participant A:{" "}
          {[
            participantLabels[visibleFrame.participants[0]].title,
            participantLabels[visibleFrame.participants[0]].detail,
          ]
            .filter(Boolean)
            .join(". ")}
          . {participantRows[0]} is{" "}
          {participantLabels[visibleFrame.participants[0]].locked
            ? "locked"
            : "unlocked"}
          . Participant B:{" "}
          {[
            participantLabels[visibleFrame.participants[1]].title,
            participantLabels[visibleFrame.participants[1]].detail,
          ]
            .filter(Boolean)
            .join(". ")}
          . {participantRows[1]} is{" "}
          {participantLabels[visibleFrame.participants[1]].locked
            ? "locked"
            : "unlocked"}
          .
        </p>
      </div>
      {reduced && (
        <p className="two-phase-motion-note">
          Reduced motion: use Step to advance without animation.
        </p>
      )}
      <figcaption id={`${id}-caption`}>
        {phase === "prepare"
          ? "Both participants voted YES. Their prepared state is saved and the same rows stay locked. Continue below with the decision."
          : "Starts where Prepare ends. Two YES votes commit; zero or one YES vote aborts. A no voter has already rolled back and unlocked its row."}
      </figcaption>
    </figure>
  );
}
