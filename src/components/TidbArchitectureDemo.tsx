import { TidbPlaybackControls } from "./TidbPlaybackControls";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  NODES,
  operationSteps,
  randomOperation,
  regionForUser,
  regionsOnNode,
  statement,
  type FollowerProgress,
  type OperationKind,
  type ReadMode,
  type Region,
  type ViewCommand,
} from "~/demos/tidb-architecture/model";
import { createPlayback } from "~/demos/tidb-architecture/playback";
import {
  READ_MODE_LABELS,
  FOLLOWER_STATUS_TEXT,
  inspectionDetails,
  type Inspection,
} from "~/demos/tidb-architecture/presentation";

import { ScenarioMenu } from "~/demos/tidb-architecture/ScenarioMenu";

const Scene = lazy(() => import("~/demos/tidb-architecture/Scene"));
const VIEW_KEYS: Record<string, ViewCommand["kind"] | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "in",
  ArrowDown: "out",
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

function ArchitectureSummary({
  unavailable,
  region,
  follower,
}: {
  unavailable: boolean;
  region: Region;
  follower?: FollowerProgress;
}) {
  return (
    <div className="tidb-fallback">
      <p>
        {unavailable
          ? "3D is unavailable. Play a scenario to follow the routing and replication below."
          : "Application → TiDB SQL servers → TiKV storage"}
      </p>
      <p>
        3 SQL servers · 3 PD members · 9 storage nodes
        <br />
        PD supplies timestamps and placement metadata beside the data path.
      </p>
      <dl>
        {NODES.filter((n) => n.group === "tikv").map((node) => (
          <div key={node.id}>
            <dt>{node.id}</dt>
            <dd>
              {regionsOnNode(node.id)
                .filter((r) => r.id === region.id)
                .map(
                  (r) =>
                    `${r.id}${r.leader === node.id ? " (leader)" : " (follower)"}`,
                )
                .join(" · ") || "Other Regions"}
              {follower?.nodeId === node.id &&
                ` · ${region.id}: ${FOLLOWER_STATUS_TEXT[follower.status]}`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TidbArchitectureDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const [playback] = useState(createPlayback);
  const state = useSyncExternalStore(
    playback.subscribe,
    playback.getSnapshot,
    playback.getSnapshot,
  );
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [menu, setMenu] = useState<"Read" | "Write" | null>(null);
  const [selected, setSelected] = useState<Inspection | null>(null);
  const [hovered, setHovered] = useState<Inspection | null>(null);
  const [view, setView] = useState<ViewCommand>({ kind: "reset", revision: 0 });
  const failScene = useCallback(() => setUnavailable(true), []);
  const steps = operationSteps(state.operation);
  const current = steps[state.step];
  const region = regionForUser(state.operation.userId);
  const done = state.step === steps.length - 1;
  const active = visible && documentVisible;
  const inspection = hovered ?? selected;
  const details = inspection ? inspectionDetails(inspection) : null;
  const select = useCallback(
    (target: Inspection | null) => {
      setHovered(null);
      setSelected(target);
      if (target) playback.pause();
    },
    [playback],
  );

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) setLoaded(true);
              setVisible(
                entry.isIntersecting && entry.intersectionRatio >= 0.15,
              );
            },
            { threshold: [0, 0.15] },
          );
    if (observer && stage.current) observer.observe(stage.current);
    else {
      setLoaded(true);
      setVisible(true);
    }
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playback]);

  useEffect(() => {
    if (!state.moving || !active) return;
    let frame: number;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) playback.advance(now - previous);
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, playback, state.moving]);

  const choose = (
    kind: OperationKind,
    dropFollowerMessage = false,
    readMode: ReadMode = "leader",
  ) => {
    select(null);
    playback.reset(
      { ...randomOperation(kind), dropFollowerMessage, readMode },
      true,
    );
  };

  return (
    <figure
      className="tidb-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="canvas"
      data-graphic-key="tidb-architecture"
      aria-label="TiDB routing and replication explorer"
    >
      <div className="tidb-query" aria-label="Selected SQL statement">
        <span>
          users · primary key: id ·{" "}
          {state.operation.kind === "read"
            ? READ_MODE_LABELS[state.operation.readMode ?? "leader"]
            : state.operation.dropFollowerMessage
              ? "Write with failure"
              : "Write"}
        </span>
        <code>{statement(state.operation)}</code>
      </div>
      <div
        ref={stage}
        className="tidb-stage"
        data-graphic-stage="flush"
        tabIndex={unavailable ? undefined : 0}
        role="group"
        aria-label="3D architecture. Left and right arrows rotate; up and down arrows zoom; Home resets the view."
        onPointerLeave={() => setHovered(null)}
        onPointerDownCapture={() => setHovered(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") select(null);
          const kind = VIEW_KEYS[event.key];
          if (kind && event.target === event.currentTarget && !unavailable) {
            event.preventDefault();
            setView((previous) => ({ kind, revision: previous.revision + 1 }));
          }
        }}
      >
        {unavailable || !loaded ? (
          <ArchitectureSummary
            unavailable={unavailable}
            region={region}
            follower={current.follower}
          />
        ) : (
          <div className="tidb-canvas" aria-hidden="true">
            <SceneBoundary onUnavailable={failScene}>
              <Suspense
                fallback={
                  <p className="tidb-loading">Loading the architecture…</p>
                }
              >
                <Scene
                  playback={playback}
                  state={state}
                  active={active}
                  reduced={reduced}
                  view={view}
                  onUnavailable={failScene}
                  inspection={inspection}
                  onHover={setHovered}
                  onSelect={select}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
      </div>
      <TidbPlaybackControls
        moving={state.moving}
        done={done}
        speed={state.speed}
        onToggle={() => {
          select(null);
          if (state.moving) playback.pause();
          else playback.play();
        }}
        onStep={() => {
          select(null);
          playback.step();
        }}
        onReplay={() => {
          select(null);
          playback.reset(state.operation, true);
        }}
        onSpeed={playback.setSpeed}
      />
      <div className="tidb-controls" role="group" aria-label="Query controls">
        <ScenarioMenu
          label="Read"
          open={menu === "Read"}
          onOpen={(open) =>
            setMenu((current) =>
              open ? "Read" : current === "Read" ? null : current,
            )
          }
          choices={(Object.keys(READ_MODE_LABELS) as ReadMode[]).map(
            (mode) => ({
              label: READ_MODE_LABELS[mode],
              run: () => choose("read", false, mode),
            }),
          )}
        />
        <ScenarioMenu
          label="Write"
          open={menu === "Write"}
          onOpen={(open) =>
            setMenu((current) =>
              open ? "Write" : current === "Write" ? null : current,
            )
          }
          choices={[
            { label: "Random write", run: () => choose("update") },
            {
              label: "Random write with failure",
              run: () => choose("update", true),
            },
          ]}
        />
      </div>
      <div className="tidb-detail">
        <div role="status" aria-live="polite" aria-atomic="true">
          <p className="tidb-detail-title">
            <span>
              {state.step === 0
                ? "Ready"
                : done
                  ? "Complete"
                  : `Step ${state.step} of ${steps.length - 2}`}
            </span>{" "}
            {state.step === 0 ? "Explore the architecture" : current.title}
          </p>
          <p className="tidb-explanation">
            {details ? (
              <>
                <strong>{details.title}.</strong> {details.description}
              </>
            ) : state.step === 0 ? (
              "One users table, seven Regions, five replicas per Region across nine storage nodes. Compare a leader read with a caught-up or lagging follower read, or follow a write. Each scenario samples a user. Hover or select a component for details."
            ) : (
              current.narration
            )}
          </p>
        </div>
      </div>
    </figure>
  );
}
