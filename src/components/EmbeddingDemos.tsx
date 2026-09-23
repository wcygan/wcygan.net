import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CITIES } from "~/demos/embeddings/geography";
import {
  JOB_DESCRIPTIONS,
  JOB_PROFILES,
  rankJobsForProfile,
} from "~/demos/embeddings/job-matching";
import { DOCUMENTS, QUERIES, rankNeighbors } from "~/demos/embeddings/model";
import {
  metricScore,
  metricVectors,
  rankByMetric,
  type SimilarityMetric,
} from "~/demos/embeddings/metrics";
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import type { ViewCommand } from "~/demos/embeddings/scene-helpers";

const GlobeScene = lazy(() => import("~/demos/embeddings/GlobeScene"));
const SpaceScene = lazy(() => import("~/demos/embeddings/SpaceScene"));
const MetricScene = lazy(() => import("~/demos/embeddings/MetricScene"));
const JobMatchScene = lazy(() => import("~/demos/embeddings/JobMatchScene"));

type ViewKind = "reset" | "left" | "right" | "up" | "down" | "in" | "out";
interface SceneState {
  active: boolean;
  reduced: boolean;
  view: ViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}
const VIEW_KEYS: Record<string, ViewKind> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "+": "in",
  "=": "in",
  "-": "out",
  Home: "reset",
};

class SceneBoundary extends Component<
  { children: ReactNode; onUnavailable: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function EmbeddingFigure({
  name,
  title,
  className,
  controls,
  beforeStage,
  children,
  scene,
}: {
  name: string;
  title: string;
  className?: string;
  controls: ReactNode | ((resetView: () => void) => ReactNode);
  beforeStage?: ReactNode;
  children?: ReactNode;
  scene: (state: SceneState) => ReactNode;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const id = useId();
  const { ready, onReady } = useSceneReady();
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [view, setView] = useState<SceneState["view"]>({
    kind: "reset",
    revision: 0,
  });
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const command = (kind: ViewKind) =>
    setView((previous) => ({ kind, revision: previous.revision + 1 }));

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
      },
      { threshold: [0, 0.25] },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <figure
      className={`embeddings-demo${className ? ` ${className}` : ""}`}
      data-graphic-frame="workbench"
      data-graphic-key={`embeddings-${name}`}
      data-graphic-kind="canvas"
      aria-labelledby={`${id}-title`}
    >
      <header className="embeddings-header">
        <p id={`${id}-title`} className="article-graphic-title">
          {title}
        </p>
      </header>
      <div className="embeddings-inputs">
        {typeof controls === "function"
          ? controls(() => command("reset"))
          : controls}
      </div>
      {beforeStage}
      <div
        ref={stage}
        className="embeddings-stage"
        data-graphic-stage="flush"
        data-scene-loading={!ready && !unavailable}
        aria-busy={!ready && !unavailable}
        tabIndex={unavailable ? undefined : 0}
        role="group"
        aria-label={`${title.replace(
          /\.$/,
          "",
        )}. Arrow keys rotate; plus and minus zoom; Home resets the view.`}
        onKeyDown={(event) => {
          const kind = VIEW_KEYS[event.key];
          if (kind) {
            event.preventDefault();
            command(kind);
          }
        }}
      >
        {!ready && !unavailable && <DemoSceneLoading />}
        {unavailable ? (
          <p className="embeddings-fallback">
            3D is unavailable. The controls and results below still work.
          </p>
        ) : (
          <div className="embeddings-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={onUnavailable}>
              <Suspense fallback={null}>
                {scene({
                  active: visible && documentVisible,
                  reduced,
                  view,
                  onReady,
                  onUnavailable,
                })}
              </Suspense>
            </SceneBoundary>
          </div>
        )}
      </div>
      <div className="embeddings-camera">
        <span>Drag to orbit · scroll to zoom</span>
        <button
          type="button"
          disabled={!ready || unavailable}
          onClick={() => command("reset")}
        >
          Reset view
        </button>
      </div>
      {children}
    </figure>
  );
}

export function EmbeddingJobMatchDemo() {
  const [profileId, setProfileId] = useState(JOB_PROFILES[0].id);
  const profile = JOB_PROFILES.find((candidate) => candidate.id === profileId)!;
  const rankedJobs = rankJobsForProfile(profile);
  const bestJob = rankedJobs[0];
  const sceneJobs = JOB_DESCRIPTIONS.map((job) => ({
    ...job,
    score: profile.scores[job.id],
  }));

  return (
    <EmbeddingFigure
      name="job-match"
      title="Match a profile to a job"
      className="embeddings-job-match"
      controls={
        <div
          className="embeddings-choices"
          role="group"
          aria-label="User profile"
        >
          {JOB_PROFILES.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              aria-pressed={candidate.id === profileId}
              onClick={() => setProfileId(candidate.id)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
      }
      beforeStage={
        <div className="embeddings-profile-summary">
          <span>{profile.name}’s profile summary</span>
          <p>{profile.summary}</p>
        </div>
      }
      scene={(state) => <JobMatchScene {...state} jobs={sceneJobs} />}
    >
      <div className="embeddings-result-heading">
        <span>Job summaries</span>
        <span>Cosine similarity</span>
      </div>
      <ol
        className="embeddings-job-results"
        aria-label="Jobs ranked by similarity"
      >
        {rankedJobs.map((job, index) => (
          <li key={job.id} data-best-match={job.id === bestJob.id}>
            <div className="embeddings-job-copy">
              <span className="embeddings-job-rank">{index + 1}</span>
              <div>
                <strong>{job.title}</strong>
                <p>{job.summary}</p>
              </div>
            </div>
            <div
              className="embeddings-job-score"
              aria-label={`Cosine similarity ${job.score.toFixed(2)}`}
            >
              <span className="embeddings-job-bar" aria-hidden="true">
                <span style={{ width: `${job.score * 100}%` }} />
              </span>
              <span>{job.score.toFixed(2)}</span>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="embeddings-job-caption">
        The scene turns these example scores into angles: aligned vectors have
        higher cosine similarity. The 3D projection is illustrative, not a
        model’s full embedding space.
      </figcaption>
    </EmbeddingFigure>
  );
}

export function EmbeddingCoordinatesDemo() {
  const [cityId, setCityId] = useState(CITIES[0].id);
  const city = CITIES.find((candidate) => candidate.id === cityId)!;
  return (
    <EmbeddingFigure
      name="coordinates"
      title="City Coordinates"
      controls={(resetView) => (
        <div className="embeddings-choices" role="group" aria-label="City">
          {CITIES.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              aria-pressed={city.id === candidate.id}
              onClick={() => {
                setCityId(candidate.id);
                resetView();
              }}
            >
              {candidate.name}
            </button>
          ))}
        </div>
      )}
      scene={(state) => <GlobeScene {...state} cityId={cityId} />}
    />
  );
}

export function EmbeddingSearchDemo() {
  const [queryId, setQueryId] = useState(QUERIES[0].id);
  const [count, setCount] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = QUERIES.find((candidate) => candidate.id === queryId)!;
  const results = rankNeighbors(queryId, count);
  const selected =
    results.find((result) => result.id === selectedId) ?? results[0];
  return (
    <EmbeddingFigure
      name="search"
      title="Semantic Search"
      controls={
        <>
          <label className="embeddings-query">
            <span>Query</span>
            <select
              value={queryId}
              onChange={(event) => {
                setQueryId(event.target.value);
                setSelectedId(null);
              }}
            >
              {QUERIES.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <label className="embeddings-slider">
            <span>
              Matches <output>{count}</output>
            </span>
            <input
              aria-label="Number of matches"
              type="range"
              min={1}
              max={5}
              step={1}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>
        </>
      }
      scene={(state) => (
        <SpaceScene
          {...state}
          queryId={queryId}
          count={count}
          selectedId={selected.id}
        />
      )}
    >
      <div className="embeddings-result-heading">
        <span>Closest phrases</span>
        <span>Cosine</span>
      </div>
      <ol className="embeddings-results" aria-label="Nearest phrases">
        {results.map((result, index) => (
          <li key={result.id}>
            <button
              type="button"
              aria-pressed={selected.id === result.id}
              onClick={() => setSelectedId(result.id)}
            >
              <span className="embeddings-rank">{index + 1}</span>
              <span>{result.label}</span>
              <span className="embeddings-score">
                {result.score.toFixed(3)}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="embeddings-vector" role="status">
        {query.label} → {selected.label}
        <br />
        <span>
          [{selected.vector.map((value) => value.toFixed(2)).join(", ")}]
        </span>
      </p>
    </EmbeddingFigure>
  );
}

const METRICS: { id: SimilarityMetric; label: string; reason: string }[] = [
  { id: "cosine", label: "Cosine", reason: "Smallest angle to the query." },
  {
    id: "dot",
    label: "Dot product",
    reason: "Farthest reach along the query’s direction.",
  },
  {
    id: "distance",
    label: "Distance",
    reason: "Shortest gap between the endpoints.",
  },
];

export function EmbeddingSimilarityDemo() {
  const [metric, setMetric] = useState<SimilarityMetric>("cosine");
  const [normalized, setNormalized] = useState(false);
  const { query, documents } = metricVectors(normalized);
  const winner = rankByMetric(metric, normalized)[0];
  const selected = METRICS.find((candidate) => candidate.id === metric)!;
  return (
    <EmbeddingFigure
      name="similarity"
      title="Vector Similarity"
      controls={
        <>
          <div
            className="embeddings-choices"
            role="group"
            aria-label="Similarity measure"
          >
            {METRICS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === metric}
                onClick={() => setMetric(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <div className="embeddings-normalize embeddings-choices">
            <button
              type="button"
              aria-pressed={normalized}
              onClick={() => setNormalized((previous) => !previous)}
            >
              Normalize vectors
            </button>
            <span>{normalized ? "Every length is 1" : "Original lengths"}</span>
          </div>
        </>
      }
      scene={(state) => (
        <MetricScene {...state} metric={metric} normalized={normalized} />
      )}
    >
      <div className="embeddings-metric-outcome" role="status">
        <p>
          <strong>
            {selected.label} picks {winner.id}.
          </strong>{" "}
          {selected.reason}
        </p>
        <p>
          {normalized
            ? "All three now rank A → B → C."
            : "Cosine picks A. Dot product picks C. Distance picks B."}
        </p>
      </div>
      <table
        className="embeddings-metric-table"
        aria-label="Scores for each similarity measure"
      >
        <thead>
          <tr>
            <th scope="col">Document</th>
            {METRICS.map((candidate) => (
              <th
                key={candidate.id}
                scope="col"
                data-selected={candidate.id === metric}
              >
                {candidate.label}
                <span>
                  {candidate.id === "distance" ? "Lower wins" : "Higher wins"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <th scope="row">{document.id}</th>
              {METRICS.map((candidate) => {
                const best =
                  rankByMetric(candidate.id, normalized)[0].id === document.id;
                const score = metricScore(
                  query,
                  document.vector,
                  candidate.id,
                ).toFixed(3);
                return (
                  <td
                    key={candidate.id}
                    data-selected={candidate.id === metric}
                  >
                    {best ? (
                      <strong>
                        {score}
                        <span className="sr-only">(best)</span>
                      </strong>
                    ) : (
                      score
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </EmbeddingFigure>
  );
}
