import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  COMPLETE_RACE_SNAPSHOT,
  deriveRaceSnapshot,
  INITIAL_RACE_SNAPSHOT,
  OPTIMISTIC_LOCKING_DURATION_MS,
  type RaceSnapshot,
  type RaceStep,
} from "~/demos/optimistic-locking/model";

const FINAL_ANNOUNCEMENT =
  "Optimistic locking race complete. Two reservations were applied, one stale write was rejected, and SKU-42 now has 0 available units at version 9.";

export function OptimisticLockingRaceDemo() {
  const { isResetting, replay, snapshot } = useOptimisticLockingPlayback();

  return (
    <figure
      className="optimistic-locking-race-demo"
      data-graphic-frame="workbench"
      data-graphic-key="optimistic-locking-race"
      data-graphic-kind="dom"
      data-phase={snapshot.phase}
      data-resetting={isResetting ? "true" : "false"}
      aria-labelledby="optimistic-locking-race-title"
      aria-describedby="optimistic-locking-race-description optimistic-locking-race-static optimistic-locking-race-caption"
    >
      <header className="optimistic-locking-race-header">
        <div>
          <p
            className="article-graphic-title"
            id="optimistic-locking-race-title"
          >
            A stale version cannot decrement inventory
          </p>
          <p id="optimistic-locking-race-description">
            Both workers read version 7. Worker B can reserve the second unit
            only after its stale write is rejected and it rereads version 8.
          </p>
        </div>
        <button
          type="button"
          className="optimistic-locking-race-replay"
          aria-label="Replay optimistic locking race"
          onClick={replay}
        >
          Replay
        </button>
      </header>

      <p className="sr-only" id="optimistic-locking-race-static">
        SKU-42 begins with 2 available units at version 7. Worker A and Worker B
        both read version 7. Worker A's guarded update succeeds and advances the
        row to 1 available unit at version 8. Worker B's stale version 7 update
        changes zero rows. Worker B rereads version 8, retries against version
        8, and advances the row to 0 available units at version 9.
      </p>

      <div
        className="optimistic-locking-race-stage"
        data-graphic-stage="flush"
        aria-hidden="true"
      >
        <div className="optimistic-locking-race-body">
          <ol
            className="optimistic-locking-race-ledger"
            aria-label="Ordered optimistic locking operations"
          >
            {snapshot.steps.map((step) => (
              <OperationRow
                key={step.id}
                phaseProgress={snapshot.phaseProgress}
                step={step}
              />
            ))}
          </ol>

          <SqlStatement snapshot={snapshot} />
        </div>

        <LiveInventoryTable snapshot={snapshot} />

        <div
          className="optimistic-locking-race-result"
          data-complete={snapshot.isComplete ? "true" : "false"}
          data-rejected={
            snapshot.phase === "worker-b-rejected" ? "true" : "false"
          }
        >
          <span>{snapshot.phaseLabel}</span>
          {snapshot.isComplete ? (
            <strong>2 reservations applied · 1 stale write rejected</strong>
          ) : null}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {snapshot.isComplete ? FINAL_ANNOUNCEMENT : ""}
      </p>

      <figcaption id="optimistic-locking-race-caption">
        The version predicate turns the update into a compare-and-swap: a stale
        version changes zero rows, so the application must reread before
        retrying.
      </figcaption>
    </figure>
  );
}

function SqlStatement({ snapshot }: { snapshot: RaceSnapshot }) {
  const sql = sqlForSnapshot(snapshot);

  return (
    <section className="optimistic-locking-race-sql" data-outcome={sql.outcome}>
      <header>
        <span>SQL statement</span>
        <strong>{sql.actor}</strong>
      </header>
      <pre>
        <HighlightedSql sql={sql} />
      </pre>
      <div className="optimistic-locking-race-sql-result">
        <span>{sql.resultLabel}</span>
        <code>{sql.result}</code>
      </div>
    </section>
  );
}

function HighlightedSql({ sql }: { sql: ReturnType<typeof sqlForSnapshot> }) {
  if (sql.kind === "read") {
    return (
      <code>
        <span>
          <span data-token="keyword">SELECT</span>
          {" available"}
          <span data-token="punctuation">,</span>
          {" version"}
        </span>
        <span>
          <span data-token="keyword">FROM</span>
          {" inventory_items"}
        </span>
        <span>
          <span data-token="keyword">WHERE</span>
          {" sku "}
          <span data-token="operator">=</span>{" "}
          <span data-token="punctuation">'</span>
          <span data-token="string">SKU-42</span>
          <span data-token="punctuation">';</span>
        </span>
      </code>
    );
  }

  return (
    <code>
      <span>
        <span data-token="keyword">UPDATE</span>
        {" inventory_items"}
      </span>
      <span data-token="keyword">SET</span>
      <span>
        {"  available "}
        <span data-token="operator">=</span>
        {" available "}
        <span data-token="operator">-</span> <span data-token="number">1</span>
        <span data-token="punctuation">,</span>
      </span>
      <span>
        {"  version "}
        <span data-token="operator">=</span>
        {" version "}
        <span data-token="operator">+</span> <span data-token="number">1</span>
      </span>
      <span>
        <span data-token="keyword">WHERE</span>
        {" sku "}
        <span data-token="operator">=</span>{" "}
        <span data-token="punctuation">'</span>
        <span data-token="string">SKU-42</span>
        <span data-token="punctuation">'</span>
      </span>
      <span>
        {"  "}
        <span data-token="keyword">AND</span>
        {" available "}
        <span data-token="operator">&gt;</span>{" "}
        <span data-token="number">0</span>
      </span>
      <span>
        {"  "}
        <span data-token="keyword">AND</span>{" "}
        <mark
          className="optimistic-locking-race-version-predicate"
          data-guard-state={sql.guardState}
        >
          version <span data-token="operator">=</span>{" "}
          <span data-token="number">{sql.expectedVersion}</span>
        </mark>
        <span data-token="punctuation">;</span>
      </span>
    </code>
  );
}

function LiveInventoryTable({ snapshot }: { snapshot: RaceSnapshot }) {
  return (
    <table className="optimistic-locking-race-live-table">
      <caption>
        <span className="optimistic-locking-race-live-table-caption">
          <span>Live SQL Table</span>
          <code>inventory_items</code>
        </span>
      </caption>
      <thead>
        <tr>
          <th scope="col">sku</th>
          <th scope="col">available</th>
          <th scope="col">version</th>
        </tr>
      </thead>
      <tbody>
        <tr data-row-state={rowStateForPhase(snapshot.phase)}>
          <th scope="row">{snapshot.row.sku}</th>
          <td>{snapshot.row.available}</td>
          <td
            className="optimistic-locking-race-live-version"
            data-guard-state={liveVersionGuardState(snapshot)}
          >
            {snapshot.row.version}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function sqlForSnapshot(snapshot: RaceSnapshot) {
  if (
    snapshot.phase === "initial" ||
    snapshot.phase === "both-read" ||
    snapshot.phase === "worker-b-reread"
  ) {
    const isAwaitingRead = snapshot.phase === "initial";

    return {
      actor:
        snapshot.phase === "worker-b-reread" ? "Worker B" : "Workers A + B",
      kind: "read",
      resultLabel: "Read result",
      result: isAwaitingRead
        ? "awaiting row"
        : `available ${snapshot.row.available} · version ${snapshot.row.version}`,
      outcome: isAwaitingRead ? "pending" : "neutral",
    } as const;
  }

  const expectedVersion = snapshot.expectedVersion ?? 7;
  const result = writeResultForPhase(snapshot.phase);

  return {
    actor:
      snapshot.phase === "worker-a-submit" ||
      snapshot.phase === "worker-a-success"
        ? "Worker A"
        : "Worker B",
    expectedVersion,
    guardState: sqlGuardStateForPhase(snapshot.phase),
    kind: "write",
    resultLabel: "Write result",
    ...result,
  } as const;
}

function sqlGuardStateForPhase(
  phase: RaceSnapshot["phase"],
): "matched" | "matching" | "stale" {
  if (phase === "worker-b-submit" || phase === "worker-b-rejected") {
    return "stale";
  }

  if (phase === "worker-a-submit" || phase === "worker-b-retry") {
    return "matching";
  }

  return "matched";
}

function liveVersionGuardState(snapshot: RaceSnapshot): "matching" | "none" {
  const isComparingCurrentVersion =
    snapshot.phase === "worker-a-submit" || snapshot.phase === "worker-b-retry";

  return isComparingCurrentVersion &&
    snapshot.expectedVersion === snapshot.currentVersion
    ? "matching"
    : "none";
}

function writeResultForPhase(phase: RaceSnapshot["phase"]) {
  if (phase === "worker-a-success" || phase === "complete") {
    return { result: "ROW_COUNT() = 1", outcome: "accepted" } as const;
  }

  if (phase === "worker-b-rejected") {
    return { result: "ROW_COUNT() = 0", outcome: "rejected" } as const;
  }

  return { result: "executing…", outcome: "pending" } as const;
}

function rowStateForPhase(phase: RaceSnapshot["phase"]) {
  if (phase === "worker-a-success" || phase === "complete") return "updated";
  return phase === "worker-b-rejected" ? "unchanged" : "steady";
}

function OperationRow({
  phaseProgress,
  step,
}: {
  phaseProgress: number;
  step: RaceStep;
}) {
  const copy = operationCopy(step);
  const progressStyle = {
    transform: `scaleX(${step.status === "active" ? phaseProgress : 1})`,
  } satisfies CSSProperties;

  return (
    <li data-status={step.status} data-outcome={step.outcome ?? "none"}>
      <div>
        <strong>{copy.actor}</strong>
        <span>{copy.action}</span>
      </div>
      <code>{copy.detail}</code>
      <span
        className="optimistic-locking-race-progress"
        style={progressStyle}
      />
    </li>
  );
}

function operationCopy(step: RaceStep) {
  switch (step.id) {
    case "read-v7":
      return {
        actor: "Workers A + B",
        action: "Read the same row",
        detail: "available 2 · v7",
      };
    case "worker-a-write":
      return {
        actor: "Worker A",
        action:
          step.outcome === "accepted"
            ? "Guarded update accepted"
            : "Submit guarded update",
        detail: step.outcome === "accepted" ? "rows_affected = 1" : "expect v7",
      };
    case "worker-b-stale-write":
      return {
        actor: "Worker B",
        action:
          step.outcome === "rejected"
            ? "Stale update rejected"
            : "Submit stale update",
        detail: step.outcome === "rejected" ? "rows_affected = 0" : "expect v7",
      };
    case "worker-b-reread":
      return {
        actor: "Worker B",
        action: "Reread the current row",
        detail: "available 1 · v8",
      };
    case "worker-b-retry":
      return {
        actor: "Worker B",
        action:
          step.outcome === "accepted"
            ? "Retry accepted"
            : "Retry guarded update",
        detail: step.outcome === "accepted" ? "rows_affected = 1" : "expect v8",
      };
  }
}

function useOptimisticLockingPlayback(): {
  isResetting: boolean;
  replay: () => void;
  snapshot: RaceSnapshot;
} {
  const [snapshot, setSnapshot] = useState(INITIAL_RACE_SNAPSHOT);
  const [playbackId, setPlaybackId] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const reducedMotionRef = useRef(false);

  const replay = useCallback(() => {
    if (reducedMotionRef.current) {
      setSnapshot(COMPLETE_RACE_SNAPSHOT);
      return;
    }

    setIsResetting(true);
    setSnapshot(INITIAL_RACE_SNAPSHOT);
    setPlaybackId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;
    let animationFrame = 0;
    let elapsedMs = 0;
    let previousFrame: number | undefined;
    let completed = false;

    const stopFrame = () => {
      window.cancelAnimationFrame(animationFrame);
      previousFrame = undefined;
    };

    const renderComplete = () => {
      stopFrame();
      elapsedMs = OPTIMISTIC_LOCKING_DURATION_MS;
      completed = true;
      setIsResetting(false);
      setSnapshot(COMPLETE_RACE_SNAPSHOT);
    };

    const tick = (now: number) => {
      if (previousFrame !== undefined) {
        elapsedMs += now - previousFrame;
      }
      previousFrame = now;

      const nextSnapshot = deriveRaceSnapshot(
        elapsedMs / OPTIMISTIC_LOCKING_DURATION_MS,
      );
      setSnapshot(nextSnapshot);

      if (nextSnapshot.isComplete) {
        completed = true;
        stopFrame();
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      stopFrame();
      if (motionQuery.matches) {
        renderComplete();
        return;
      }
      if (completed || document.hidden) return;

      animationFrame = window.requestAnimationFrame((now) => {
        previousFrame = now;
        setIsResetting(false);
        animationFrame = window.requestAnimationFrame(tick);
      });
    };

    const handleMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
      if (motionQuery.matches) {
        renderComplete();
        return;
      }

      // Returning to normal motion keeps the coherent conclusion. Replay is
      // the explicit way to start the narrative again.
      completed = true;
      setSnapshot(COMPLETE_RACE_SNAPSHOT);
    };

    const handleVisibility = () => {
      stopFrame();
      if (!document.hidden && !motionQuery.matches && !completed) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    start();
    motionQuery.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopFrame();
      motionQuery.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [playbackId]);

  return { isResetting, replay, snapshot };
}
