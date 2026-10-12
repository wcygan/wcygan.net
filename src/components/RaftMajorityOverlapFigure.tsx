import { useEffect, useId, useRef, useState } from "react";
import { servers } from "~/demos/raft-election-overview/model";
import { majorities, overlapRound } from "~/demos/raft-majority-overlap/model";
import {
  majorityBoundary,
  serverPositions,
} from "~/demos/raft-majority-overlap/layout";

export function RaftMajorityOverlapFigure() {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const complete = !playing && index === majorities.length - 1;
  const active = playing && visible && documentVisible && !reduced;
  const { current, previous, shared } = overlapRound(index);

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
    if (!active) return;
    const timer = setInterval(
      () => setIndex((old) => (old + 1) % majorities.length),
      1000,
    );
    return () => clearInterval(timer);
  }, [active]);

  return (
    <figure
      className="majority-overlap-figure"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      aria-labelledby={id + "-title"}
    >
      <header>
        <p className="article-graphic-title" id={id + "-title"}>
          Majority overlap
        </p>
      </header>
      <div
        ref={stage}
        className="majority-overlap-stage"
        data-graphic-stage="padded"
        data-round={index + 1}
        data-playback={complete ? "complete" : active ? "playing" : "paused"}
      >
        <div className="majority-overlap-heading">
          <span>
            Round {index + 1} / {majorities.length}
          </span>
          <span>3 of 5 servers</span>
        </div>
        <div className="majority-overlap-groups">
          <p className="majority-overlap-previous-label">
            Previous: {previous.join(" ")}
          </p>
          <p className="majority-overlap-current-label">
            Current: {current.join(" ")}
          </p>
        </div>
        <svg
          className="majority-overlap-scene"
          viewBox="0 0 400 250"
          role="img"
          aria-labelledby={id + "-scene-title " + id + "-description"}
        >
          <title id={id + "-scene-title"}>
            Two majorities share {shared.join(" and ")}
          </title>
          <desc id={id + "-description"}>
            Previous majority: {previous.join(", ")}. Current majority:{" "}
            {current.join(", ")}. Shared servers: {shared.join(", ")}. Dashed
            bounds and dashed node rings mark the previous majority. Solid
            bounds mark the current majority. Green rings mark shared servers.
          </desc>
          <path
            className="majority-overlap-previous-bound"
            d={majorityBoundary(previous, 36)}
          />
          <path
            className="majority-overlap-current-bound"
            d={majorityBoundary(current, 30)}
          />
          {servers.map((server) => {
            const [x, y] = serverPositions[server];
            const wasPrevious = previous.includes(server);
            const isShared = shared.includes(server);
            return (
              <g
                key={server}
                className="majority-overlap-server"
                data-server={server}
                data-identity={server}
                data-current={current.includes(server)}
                data-previous={wasPrevious}
                data-shared={isShared}
                transform={`translate(${x} ${y})`}
              >
                {isShared ? (
                  <circle className="majority-overlap-shared-ring" r="26" />
                ) : (
                  wasPrevious && (
                    <circle className="majority-overlap-previous-ring" r="24" />
                  )
                )}
                <circle className="majority-overlap-node" r="20" />
                <text textAnchor="middle" dominantBaseline="central">
                  {server}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="majority-overlap-controls">
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
            setIndex((old) => Math.min(old + 1, majorities.length - 1));
          }}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
          }}
        >
          Replay
        </button>
      </div>
      <div
        className="majority-overlap-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
      >
        <p>
          Shared {shared.length === 1 ? "server" : "servers"}:{" "}
          {shared.join(", ")}
        </p>
        <p className="sr-only">
          {complete
            ? "All ten majorities shown. Every comparison has an overlap."
            : "Green rings identify servers in both groups."}
        </p>
      </div>
      <figcaption>
        Two groups of three in a five-server cluster.
        {reduced && " Use Next to compare."}
      </figcaption>
    </figure>
  );
}
