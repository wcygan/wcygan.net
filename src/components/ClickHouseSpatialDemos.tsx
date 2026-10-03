import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DemoSceneLoading, useSceneReady } from "./DemoSceneLoading";
import {
  aggregateShards,
  COLUMN_FIELDS,
  COLUMN_ROWS,
  columnReadWork,
  COUNTRY_VALUES,
  decodeCountries,
  encodeCountries,
  initialPartsState,
  insertNextBatch,
  mergeActiveParts,
  MONTH_PARTITIONS,
  partitionSnapshot,
  queryActiveParts,
  SHARDS,
  type PartsState,
  type Replica,
  type ReplicaSelection,
} from "~/demos/clickhouse-spatial/model";
import { useClickHousePlayback } from "~/demos/clickhouse-playback";
import {
  SPATIAL_TOUR_STEPS,
  spatialTourFrame,
  type SpatialTourState,
} from "~/demos/clickhouse-spatial/tour";
import type { SceneKind, ViewCommand } from "~/demos/clickhouse-spatial/Scene";
import "~/styles/clickhouse-theme.css";
import "~/styles/clickhouse-spatial.css";

const Scene = lazy(() => import("~/demos/clickhouse-spatial/Scene"));
const VIEW_KEYS: Record<string, ViewCommand["kind"] | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "+": "in",
  "=": "in",
  "-": "out",
  Home: "reset",
};
const TITLES: Record<SceneKind, string> = {
  columns: "Column Layout",
  compression: "Dictionary Encoding",
  parts: "Sorted Parts",
  partitions: "Month Partitions",
  cluster: "Shards and Replicas",
};
const CAPTIONS: Record<SceneKind, string> = {
  columns:
    "Width separates fields; depth separates six records. A row-oriented read touches four fields per record in this toy model. Column-oriented storage can read just day and revenue_cents. The 24 versus 12 counts are logical values, not bytes, timing, or a universal speedup. This shows logical grouping: small Compact parts need not use one physical file per column.",
  compression:
    "Blue, purple, and green identify US, DE, and JP throughout the scene. Dictionary encoding replaces repeated country values with IDs into a dictionary and decodes to the same ordered sequence. These tiny strings do not establish a compression ratio: the dictionary also costs space. This illustrates LowCardinality encoding, separately from general-purpose LZ4 or ZSTD compression.",
  parts:
    "Each tray is an immutable sorted part; cube labels are sort keys. Blue P1 and purple P2 are replaced by green P3 when they merge. Both orange rows with key 3 remain: ordinary MergeTree does not deduplicate equal keys. One partition is shown; obsolete parts are cleaned up later. The tiny batches explain the mechanism, not recommended production batch sizes.",
  partitions:
    "Each colored month group contains two parts with two rows each. Selecting a month eliminates other partition groups from this query while retaining their stored rows. Parts merge only within the same partition. This is partition pruning, distinct from a sparse primary index or sharding across machines.",
  cluster:
    "Width separates blue and green shards containing different rows; depth separates copies of the same shard. Orange query routes read one up-to-date replica per shard, and the coordinator combines 60 + 150. Purple dashed links identify copies, not extra logical data. This is a classic self-managed topology; ClickHouse Cloud uses SharedMergeTree and shared storage.",
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

function PartsData({ parts }: { parts: PartsState }) {
  return (
    <div className="clickhouse-spatial-data-list">
      {parts.parts.map((part) => (
        <div key={part.id}>
          <strong>
            {part.id} · {part.rows.length} rows
          </strong>
          <span>
            Sorted keys: {part.rows.map((row) => row.key).join(" → ")}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClusterData({ selection }: { selection: ReplicaSelection }) {
  return (
    <div className="clickhouse-spatial-data-list">
      {SHARDS.map((shard, index) => (
        <div key={shard.id}>
          <strong>
            Shard {shard.id} · read {selection[index]}
          </strong>
          <span>A and B both store: {shard.amounts.join(", ")}</span>
        </div>
      ))}
    </div>
  );
}

function SpatialDemo({ kind }: { kind: SceneKind }) {
  const title = TITLES[kind];
  const titleId = useId();
  const guideId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const { ready, onReady } = useSceneReady();
  const [clientReady, setClientReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const playback = useClickHousePlayback(SPATIAL_TOUR_STEPS[kind], 3200, {
    stageRef,
    enabled: ready || unavailable,
    autoplay: true,
    startDelayMs: 900,
    publishFractions: false,
  });
  const frame = useMemo(
    () => spatialTourFrame(kind, playback.step),
    [kind, playback.step],
  );
  const [inspection, setInspection] = useState<{
    step: number;
    state: SpatialTourState;
  } | null>(null);
  // A tour step owns one deterministic snapshot. Manual edits overlay only
  // that step, so no delayed effect can overwrite an inspection action.
  const inspecting = inspection?.step === playback.step;
  const domain = inspecting ? inspection.state : frame.state;
  const { parts, selection, layout, encoded, dictionaryRow, month, queried } =
    domain;
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const markUnavailable = useCallback(() => setUnavailable(true), []);
  const pending = clientReady && !ready && !unavailable;
  const cameraAvailable = ready && !unavailable;
  const rowQuery = queryActiveParts(parts);
  const cluster = aggregateShards(selection);
  const columnWork = columnReadWork(layout);
  const dictionary = encodeCountries(COUNTRY_VALUES);
  const partitions = partitionSnapshot(month);

  useEffect(() => {
    if (!window.IntersectionObserver) {
      setClientReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setClientReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const inspect = (patch: Partial<SpatialTourState>) => {
    playback.pause();
    setInspection({ step: playback.step, state: { ...domain, ...patch } });
  };
  const command = (kind: ViewCommand["kind"]) => {
    playback.pause();
    setView((current) => ({ kind, revision: current.revision + 1 }));
  };
  const selectReplica = (shardIndex: number, replica: Replica) =>
    inspect({
      selection:
        shardIndex === 0 ? [replica, selection[1]] : [selection[0], replica],
    });

  const data =
    kind === "columns" ? (
      <div className="clickhouse-spatial-table-scroll">
        <table>
          <thead>
            <tr>
              {COLUMN_FIELDS.map((field) => (
                <th key={field}>
                  {field === "amount" ? "revenue_cents" : field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLUMN_ROWS.map((row, index) => (
              <tr key={index}>
                {COLUMN_FIELDS.map((field) => (
                  <td key={field}>{row[field]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : kind === "compression" ? (
      <div className="clickhouse-spatial-data-list">
        <div>
          <strong>Input · {COUNTRY_VALUES.length} country values</strong>
          <span>{COUNTRY_VALUES.join(" · ")}</span>
        </div>
        {encoded && (
          <>
            <div>
              <strong>Dictionary</strong>
              <span>
                {dictionary.dictionary
                  .map((value, index) => `${index} → ${value}`)
                  .join(" · ")}
              </span>
            </div>
            <div>
              <strong>IDs · original row order</strong>
              <span>{dictionary.ids.join(" · ")}</span>
            </div>
            <div>
              <strong>Decoded values · unchanged</strong>
              <span>
                {decodeCountries(dictionary.dictionary, dictionary.ids).join(
                  " · ",
                )}
              </span>
            </div>
          </>
        )}
      </div>
    ) : kind === "parts" ? (
      <PartsData parts={parts} />
    ) : kind === "partitions" ? (
      <div className="clickhouse-spatial-data-list">
        {MONTH_PARTITIONS.map((group) => (
          <div key={group.month}>
            <strong>
              {group.month} ·{" "}
              {group.month === month || month === "all" ? "read" : "pruned"}
            </strong>
            <span>
              {group.parts
                .map(
                  (part) =>
                    `${part.id}: ${part.rows.map((row) => row.key).join(", ")}`,
                )
                .join(" · ")}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <ClusterData selection={selection} />
    );

  return (
    <figure
      className="clickhouse-demo clickhouse-spatial-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="canvas"
      data-graphic-key={`clickhouse-${kind}`}
      aria-labelledby={titleId}
      aria-busy={pending}
      data-step={playback.step}
      data-playing={playback.playing}
      data-tour-running={playback.running}
    >
      <header className="ch-header clickhouse-spatial-header">
        <p id={titleId} className="ch-title article-graphic-title">
          {title}
        </p>
        <span className="clickhouse-spatial-dimension">
          3D · orbit and inspect
        </span>
      </header>
      <div
        ref={stageRef}
        className="ch-stage clickhouse-spatial-stage"
        data-graphic-stage="flush"
        data-scene-loading={pending}
        tabIndex={cameraAvailable ? 0 : -1}
        role="group"
        aria-label={`${title}: interactive 3D view`}
        aria-describedby={guideId}
        onPointerDownCapture={playback.pause}
        onWheelCapture={playback.pause}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const action = VIEW_KEYS[event.key];
          if (!action || !cameraAvailable) return;
          event.preventDefault();
          command(action);
        }}
      >
        {pending && <DemoSceneLoading />}
        {(!ready || unavailable) && (
          <div className="clickhouse-spatial-fallback">
            <p>{title} · interactive data model</p>
            {data}
          </div>
        )}
        {clientReady && !unavailable && (
          <div className="clickhouse-spatial-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={markUnavailable}>
              <Suspense fallback={null}>
                <Scene
                  kind={kind}
                  parts={parts}
                  selection={selection}
                  queried={queried}
                  layout={layout}
                  encoded={encoded}
                  dictionaryRow={dictionaryRow}
                  month={month}
                  view={view}
                  onReady={onReady}
                  onUnavailable={markUnavailable}
                  running={playback.running}
                  fractionRef={playback.fractionRef}
                  reducedMotion={playback.reducedMotion}
                  settled={playback.step === playback.totalSteps - 1}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
      </div>
      <div
        className="ch-controls clickhouse-spatial-playback"
        role="group"
        aria-label={`${title} tour controls`}
      >
        <button
          type="button"
          disabled={
            playback.reducedMotion || playback.step === playback.totalSteps - 1
          }
          onClick={() => {
            setInspection(null);
            playback.togglePlayback();
          }}
        >
          {playback.playing ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          disabled={playback.step === playback.totalSteps - 1}
          onClick={() => {
            setInspection(null);
            playback.next();
          }}
        >
          Next step
        </button>
        <button
          type="button"
          onClick={() => {
            setInspection(null);
            playback.replay();
          }}
        >
          Replay
        </button>
        <span>
          {playback.reducedMotion
            ? "Reduced motion · step through the tour"
            : playback.step === playback.totalSteps - 1
              ? "Tour complete"
              : playback.playing
                ? "Automatic tour"
                : "Tour paused"}
        </span>
      </div>
      <div
        className="ch-controls clickhouse-spatial-actions"
        role="group"
        aria-label={`${title} controls`}
      >
        {kind === "columns" && (
          <>
            <button
              type="button"
              aria-pressed={layout === "rows"}
              onClick={() => inspect({ layout: "rows" })}
            >
              Row layout
            </button>
            <button
              type="button"
              aria-pressed={layout === "columns"}
              onClick={() => inspect({ layout: "columns" })}
            >
              Column layout
            </button>
            <button type="button" onClick={() => inspect({ queried: true })}>
              Read day + revenue
            </button>
          </>
        )}
        {kind === "compression" && (
          <>
            <button
              type="button"
              disabled={encoded}
              onClick={() => inspect({ encoded: true })}
            >
              Encode country
            </button>
            <button
              type="button"
              disabled={!encoded}
              onClick={() =>
                inspect({
                  dictionaryRow: (dictionaryRow + 1) % COUNTRY_VALUES.length,
                })
              }
            >
              Inspect next ID
            </button>
            <button
              type="button"
              onClick={() => {
                inspect({ encoded: false, dictionaryRow: 0 });
              }}
            >
              Reset encoding
            </button>
          </>
        )}
        {kind === "parts" && (
          <>
            <button
              type="button"
              disabled={parts.insertedBatches === 2}
              onClick={() => {
                inspect({ parts: insertNextBatch(parts), queried: false });
              }}
            >
              Insert second batch
            </button>
            <button
              type="button"
              disabled={parts.parts.length < 2}
              onClick={() => {
                inspect({ parts: mergeActiveParts(parts), queried: false });
              }}
            >
              Merge active parts
            </button>
            <button type="button" onClick={() => inspect({ queried: true })}>
              Query count()
            </button>
            <button
              type="button"
              onClick={() => {
                inspect({ parts: initialPartsState(), queried: false });
              }}
            >
              Reset data
            </button>
          </>
        )}
        {kind === "partitions" && (
          <>
            <button
              type="button"
              aria-pressed={month === "all"}
              onClick={() => inspect({ month: "all" })}
            >
              All months
            </button>
            {MONTH_PARTITIONS.map((group) => (
              <button
                key={group.month}
                type="button"
                aria-pressed={month === group.month}
                onClick={() => inspect({ month: group.month })}
              >
                {group.month}
              </button>
            ))}
          </>
        )}
        {kind === "cluster" && (
          <>
            {SHARDS.map((shard, index) => (
              <div
                key={shard.id}
                className="clickhouse-spatial-replicas"
                role="group"
                aria-label={`Shard ${shard.id} read replica`}
              >
                <span>Shard {shard.id} · read</span>
                {(["A", "B"] as const).map((replica) => (
                  <button
                    key={replica}
                    type="button"
                    aria-pressed={selection[index] === replica}
                    onClick={() => selectReplica(index, replica)}
                  >
                    Replica {replica}
                  </button>
                ))}
              </div>
            ))}
            <button type="button" onClick={() => inspect({ queried: true })}>
              Query sum(amount)
            </button>
          </>
        )}
      </div>
      <div
        className="ch-controls clickhouse-spatial-camera"
        role="group"
        aria-label={`${title} camera controls`}
      >
        {(
          [
            ["left", "Rotate left"],
            ["right", "Rotate right"],
            ["in", "Zoom in"],
            ["out", "Zoom out"],
            ["reset", "Reset view"],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            type="button"
            disabled={!cameraAvailable}
            onClick={() => command(action)}
          >
            {label}
          </button>
        ))}
      </div>
      <p id={guideId} className="clickhouse-spatial-guide">
        {unavailable
          ? "3D is unavailable. The data and controls retain the same lesson."
          : "Drag to orbit. Focus the view: arrows rotate, +/− zoom, Home resets."}
      </p>
      <div
        className="ch-status clickhouse-spatial-status"
        role="status"
        aria-live={playback.playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <p className="clickhouse-spatial-tour-step">
          {playback.step + 1} / {playback.totalSteps} ·{" "}
          {inspecting ? "Paused for inspection" : frame.title}
        </p>
        {!inspecting && (
          <p className="clickhouse-spatial-narration">{frame.narration}</p>
        )}
        {kind === "columns" && (
          <>
            <p>
              <strong>
                {layout === "rows" ? "Row layout" : "Column layout"}:{" "}
                {queried ? columnWork.readValues : columnWork.totalValues}{" "}
                logical values {queried ? "read" : "stored"}.
              </strong>{" "}
              {queried
                ? "Six day values and six revenue values are requested. Switch layouts to compare the read units."
                : "Four fields across six records. Read day and revenue, then compare layouts."}
            </p>
            <p className="clickhouse-spatial-takeaway">
              24 row-layout values / 12 projected-column values · illustrative
              logical work
            </p>
          </>
        )}
        {kind === "compression" && (
          <>
            <p>
              <strong>
                {encoded
                  ? "3 dictionary entries + 12 small IDs."
                  : "12 repeated country labels."}
              </strong>{" "}
              {encoded
                ? `Row ${dictionaryRow + 1}: ID ${dictionary.ids[dictionaryRow]} → ${COUNTRY_VALUES[dictionaryRow]}. Decoding preserves row order.`
                : "Encode the country column, then follow an ID back to its dictionary entry."}
            </p>
            <p className="clickhouse-spatial-takeaway">
              Same 12 values · no byte-saving or speed claim
            </p>
          </>
        )}
        {kind === "parts" && (
          <>
            <p>
              <strong>
                {rowQuery.count} rows in {parts.parts.length} active{" "}
                {parts.parts.length === 1 ? "part" : "parts"}.
              </strong>{" "}
              {parts.merged
                ? "P3 replaces P1 and P2. Both rows with key 3 remain."
                : parts.insertedBatches === 1
                  ? "P1 is already sorted. Insert the second batch and query before merging."
                  : "Both parts are readable now. A query does not wait for a merge."}
            </p>
            {queried && (
              <p className="clickhouse-spatial-takeaway">
                count() = {rowQuery.count} · read{" "}
                {parts.parts.map((part) => part.id).join(" + ")}
              </p>
            )}
          </>
        )}
        {kind === "partitions" && (
          <>
            <p>
              <strong>
                {partitions.readRows} of {partitions.totalRows} rows selected;{" "}
                {partitions.prunedGroups.length} month groups pruned.
              </strong>{" "}
              {month === "all"
                ? "All three groups are candidates for this query."
                : `Only ${month} is a candidate for this query.`}
            </p>
            <p className="clickhouse-spatial-takeaway">
              All {partitions.totalRows} rows remain stored · 2 parts per month
            </p>
          </>
        )}
        {kind === "cluster" && (
          <>
            <p>
              <strong>
                {cluster.logicalRows} logical rows; {cluster.storedRows} across
                four copies.
              </strong>{" "}
              The query reads one synchronized replica per shard in this
              example.
            </p>
            {queried && (
              <p className="clickhouse-spatial-takeaway">
                Shard 1/{selection[0]}: 60 + shard 2/{selection[1]}: 150 = 210
              </p>
            )}
          </>
        )}
      </div>
      <details className="clickhouse-spatial-data" onToggle={playback.pause}>
        <summary>Inspect the data</summary>
        {data}
      </details>
      <figcaption className="ch-caption">{CAPTIONS[kind]}</figcaption>
    </figure>
  );
}

export function ClickHouseColumnsDemo() {
  return <SpatialDemo kind="columns" />;
}
export function ClickHouseCompressionDemo() {
  return <SpatialDemo kind="compression" />;
}
export function ClickHousePartsDemo() {
  return <SpatialDemo kind="parts" />;
}
export function ClickHousePartitionsDemo() {
  return <SpatialDemo kind="partitions" />;
}
export function ClickHouseClusterDemo() {
  return <SpatialDemo kind="cluster" />;
}
