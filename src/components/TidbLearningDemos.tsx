import { useEffect, useId, useRef, useState } from "react";
import { Diagrams2D } from "~/demos/tidb-learning/Diagrams2D";
import { SpatialDiagram } from "~/demos/tidb-learning/SpatialDiagram";
import { LESSONS, outcome, type LessonId } from "~/demos/tidb-learning/model";
import "~/demos/tidb-learning/styles.css";

/** One bounded lesson clock; SVG geometry remains mounted between steps. */
export function TidbLearningDemo({ lesson: id }: { lesson: LessonId }) {
  const lesson = LESSONS[id];
  const titleId = useId(),
    statusId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(644);
  const [phase, setPhase] = useState(0);
  const [option, setOption] = useState(id === "snapshot" ? 120 : 0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const last = lesson.beats.length - 1;
  const active = playing && inView && visible && !reduced && phase < last;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = new ResizeObserver((entries) =>
      setWidth(Math.max(280, Math.round(entries[0].contentRect.width))),
    );
    resize.observe(stage);
    const intersection = new IntersectionObserver(
      ([entry]) =>
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.4),
      { threshold: 0.4 },
    );
    intersection.observe(stage);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    const visibility = () => setVisible(!document.hidden);
    preference();
    visibility();
    media.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      resize.disconnect();
      intersection.disconnect();
      media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(
      () => setPhase((value) => Math.min(last, value + 1)),
      2600,
    );
    return () => clearTimeout(timer);
  }, [active, phase, last]);
  const changePhase = (value: number) => {
    setPlaying(false);
    setPhase(Math.max(0, Math.min(last, value)));
  };
  const options =
    id === "quorum"
      ? [
          { value: 0, label: "All reachable" },
          { value: 1, label: "Lose 1 follower" },
          { value: 2, label: "Lose 2 followers" },
        ]
      : id === "snapshot"
        ? [
            { value: 80, label: "Snapshot 80" },
            { value: 120, label: "Snapshot 120" },
            { value: 160, label: "Snapshot 160" },
          ]
        : [];
  return (
    <figure
      className="tidb-learn"
      data-graphic-frame="workbench"
      data-graphic-key={`tidb-learning-${id}`}
      data-graphic-kind={
        lesson.dimension === "3d" ? "interactive-3d" : "interactive-svg"
      }
      aria-labelledby={titleId}
    >
      <header className="tidb-learn-intro">
        <p className="tidb-learn-title" id={titleId}>
          {lesson.title}
        </p>
        <p className="tidb-learn-question">{lesson.question}</p>
      </header>
      {options.length > 0 && (
        <div
          className="tidb-learn-options"
          role="group"
          aria-label={`${lesson.title} scenario`}
        >
          {options.map((choice) => (
            <button
              key={choice.value}
              type="button"
              aria-pressed={option === choice.value}
              onClick={() => {
                setOption(choice.value);
                setPlaying(false);
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
      {lesson.dimension === "3d" ? (
        <SpatialDiagram
          id={id}
          phase={phase}
          option={option}
          width={width}
          stageRef={stageRef}
        />
      ) : (
        <div
          ref={stageRef}
          className="tidb-learn-stage"
          data-graphic-stage="flush"
        >
          <Diagrams2D id={id} phase={phase} option={option} width={width} />
        </div>
      )}
      <div
        className="tidb-learn-playback"
        role="group"
        aria-label={`${lesson.title} playback`}
      >
        <button
          type="button"
          disabled={reduced}
          aria-pressed={playing && phase < last}
          onClick={() => {
            if (phase === last) setPhase(0);
            setPlaying((value) => !value || phase === last);
          }}
        >
          {playing && phase < last
            ? "Pause"
            : phase === last
              ? "Play again"
              : "Play"}
        </button>
        <button
          type="button"
          disabled={phase === 0}
          onClick={() => changePhase(phase - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={phase === last}
          onClick={() => changePhase(phase + 1)}
        >
          Next step
        </button>
        <button
          type="button"
          onClick={() => {
            setPhase(0);
            setPlaying(!reduced);
          }}
        >
          Replay
        </button>
      </div>
      {reduced && (
        <p className="tidb-learn-motion-note">
          Reduced motion: use Next step to follow the same lesson.
        </p>
      )}
      <div
        className="tidb-learn-status"
        role="status"
        aria-live={active ? "off" : "polite"}
        aria-atomic="true"
        id={statusId}
      >
        <p className="tidb-learn-beat">
          <span>
            {phase + 1} / {lesson.beats.length}
          </span>{" "}
          {lesson.beats[phase].title}
        </p>
        <p>{outcome(id, phase, option)}</p>
        {id === "index" && phase === last && (
          <p className="tidb-learn-result">id 427 · name Will · snapshot 120</p>
        )}
        {id === "tiflash" && phase === last && (
          <p className="tidb-learn-result">SUM(amount) = 44</p>
        )}
      </div>
      <figcaption>{lesson.caption}</figcaption>
    </figure>
  );
}
