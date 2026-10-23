import type { RowBounds } from "~/demos/raft-log-row/layout";
import { recordHeight } from "~/demos/raft-log-row/layout";
export type RaftRecordState = {
  index: number;
  label?: string;
  term?: number;
  command?: string;
  present: boolean;
  committed: boolean;
  deleted?: boolean;
  deletionProgress?: number;
  checked?: boolean;
  tag?: string;
};
export function RaftRecord({
  cell,
  width,
}: {
  cell: RaftRecordState;
  width: number;
}) {
  const progress = cell.deleted ? (cell.deletionProgress ?? 1) : 0;
  return (
    <>
      {cell.deleted && (
        <rect
          className="log-conflict-empty-slot"
          width={width}
          height={recordHeight}
          rx="2"
        />
      )}
      <g
        className="log-conflict-cell-content"
        data-deleting={!!cell.deleted}
        transform={
          cell.deleted
            ? `translate(${8 * progress} ${-12 * progress})`
            : undefined
        }
        opacity={1 - progress}
      >
        <rect width={width} height={recordHeight} rx="2" />
        <text className="leader-recovery-index" x={width / 2} y="18">
          {cell.label ?? `#${cell.index}`}
        </text>
        <text
          className="log-replication-entry-meta log-conflict-term"
          x={width / 2}
          y="42"
        >
          {cell.term === undefined ? (
            "—"
          ) : (
            <>
              T<tspan className="raft-term-value">{cell.term}</tspan>
            </>
          )}
        </text>
        <text className="log-replication-command" x={width / 2} y="66">
          {cell.command ?? "—"}
        </text>
        {cell.committed && (
          <text
            className="log-replication-check leader-recovery-check"
            x={width - 5}
            y="18"
            textAnchor="end"
          >
            ✓
          </text>
        )}
      </g>
      {cell.tag && (
        <text className="log-conflict-change-label" x={width / 2} y="100">
          {cell.tag}
        </text>
      )}
    </>
  );
}
export function RaftLogRow({
  id,
  role,
  term,
  commit,
  commitKnown = true,
  stored,
  bounds,
  entryX,
  cellWidth,
  cells,
  className,
  offline = false,
  writing = false,
  vote,
  lastTerm,
  timer,
}: {
  id: string;
  role: string;
  term: number;
  commit: number;
  commitKnown?: boolean;
  stored: number;
  bounds: RowBounds;
  entryX: number;
  cellWidth: number;
  cells: RaftRecordState[];
  className: string;
  offline?: boolean;
  writing?: boolean;
  vote?: string | null;
  lastTerm?: number;
  timer?: {
    label: string;
    kind: string;
    elapsed: number;
    interval: number;
    progress: number;
  };
}) {
  return (
    <g
      className={`${className} raft-log-row`}
      data-server={id}
      data-identity={id}
      data-role={role}
      data-term={term}
      data-stored={stored}
      data-commit={commit}
      data-committed={commit}
      data-offline={offline}
      data-vote={vote ?? ""}
      transform={`translate(${bounds.x} ${bounds.y})`}
    >
      <rect
        className="log-replication-node leader-recovery-node"
        width={bounds.width}
        height={bounds.height}
        rx="3"
      />
      {!offline && (role === "Leader" || role === "Candidate") && (
        <circle className="raft-log-role-highlight" cx="26" cy="23" r="20" />
      )}
      <circle className="raft-log-identity" cx="26" cy="23" r="15" />
      <text
        className="raft-log-id"
        x="26"
        y="23"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {id}
      </text>
      <text className="raft-log-meta" x="12" y="52">
        {offline ? "Offline" : role}
      </text>
      <text className="raft-log-meta" x="12" y="70">
        Term <tspan className="raft-term-value">{term}</tspan>
      </text>
      <text className="raft-log-meta" x="12" y="88">
        Commit {commitKnown ? commit : "?"}
      </text>
      <text className="raft-log-meta" x="12" y="106">
        {writing ? "Saving…" : `Stored ${stored}`}
      </text>
      {cells.map((cell, column) => (
        <g
          key={cell.index}
          className="log-replication-entry leader-recovery-entry log-conflict-entry"
          data-index={cell.index}
          data-term={cell.present ? cell.term : undefined}
          data-present={cell.present}
          data-committed={cell.committed}
          data-checked={cell.checked}
          data-deleted={!!cell.deleted}
          transform={`translate(${entryX + column * (cellWidth + 8)} 12)`}
          textAnchor="middle"
          dominantBaseline="central"
        >
          <RaftRecord cell={cell} width={cellWidth} />
        </g>
      ))}
      {lastTerm !== undefined && (
        <text className="raft-log-meta" x={entryX} y="115">
          Last T<tspan className="raft-term-value">{lastTerm}</tspan>/#{stored}{" "}
          ·{" "}
          <tspan className="raft-vote-value" data-identity={vote ?? undefined}>
            Vote {vote ?? "—"}
          </tspan>
        </text>
      )}
      {timer && (
        <g
          className="leader-recovery-timer"
          data-kind={timer.kind}
          data-progress={timer.progress}
        >
          <text className="raft-log-meta" x="12" y="136">
            {timer.label}
          </text>
          {timer.interval > 0 && (
            <text
              className="raft-log-meta"
              x={bounds.width - 12}
              y="136"
              textAnchor="end"
            >
              {Math.round(timer.elapsed / 1000)} /{" "}
              {Math.round(timer.interval / 1000)}s
            </text>
          )}
          <rect
            className="leader-recovery-timer-track"
            x="12"
            y="145"
            width={bounds.width - 24}
            height="5"
            rx="2"
          />
          <rect
            className="leader-recovery-timer-fill"
            x="12"
            y="145"
            width={(bounds.width - 24) * timer.progress}
            height="5"
            rx="2"
          />
        </g>
      )}
    </g>
  );
}
