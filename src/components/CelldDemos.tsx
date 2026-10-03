import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  advanceRecovery,
  claimOwnership,
  deriveDurabilityComparison,
  HOT_KEY_SCHEDULE,
  INDEPENDENT_KEY_SCHEDULE,
  INITIAL_OWNER,
  INITIAL_RECOVERY,
  recoverySnapshot,
  type ScheduledOperation,
  type TailWitness,
} from "~/demos/celld/2d-model";
import { useCelldAutoplay } from "~/demos/celld/use-celld-autoplay";

type Tone = "neutral" | "orange" | "blue" | "green" | "yellow" | "red";
type Point = readonly [number, number];
interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}
const port = (b: Bounds, side: "top" | "right" | "bottom" | "left"): Point => {
  if (side === "top") return [b.x + b.w / 2, b.y];
  if (side === "bottom") return [b.x + b.w / 2, b.y + b.h];
  if (side === "left") return [b.x, b.y + b.h / 2];
  return [b.x + b.w, b.y + b.h / 2];
};
const path = (points: readonly Point[]) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

function useSteps(total: number) {
  const [step, setStep] = useState(0);
  return {
    step,
    next: () => setStep((n) => Math.min(total, n + 1)),
    reset: () => setStep(0),
  };
}

interface FrameProps {
  name: string;
  title: string;
  description: string;
  step: number;
  total: number;
  status: string;
  caption: string;
  children: (compact: boolean) => ReactNode;
  onStep: () => void;
  onReset: () => void;
  nextLabel?: string;
  options?: ReactNode;
  blocked?: boolean;
  legend: readonly { tone: Tone; label: string }[];
}

/** The compact layout changes geometry rather than shrinking the text. */
function CelldFrame({
  name,
  title,
  description,
  step,
  total,
  status,
  caption,
  children,
  onStep,
  onReset,
  nextLabel = "Next step",
  options,
  blocked = false,
  legend,
}: FrameProps) {
  const titleId = useId();
  const descriptionId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(true);
  const playback = useCelldAutoplay({
    stageRef,
    step,
    total,
    onStep,
    onReset,
    blocked,
  });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const measure = () => setCompact(stage.clientWidth < 520);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  return (
    <figure
      className="celld-demo celld-demo--2d"
      data-graphic-frame="workbench"
      data-graphic-key={name}
      data-graphic-kind="svg"
      data-playback-state={playback.state}
      data-playback-step={step}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <header className="celld-demo-header">
        <p className="article-graphic-title" id={titleId}>
          {title}
        </p>
        <p id={descriptionId}>{description}</p>
      </header>
      {options && <div onClickCapture={playback.pause}>{options}</div>}
      <div
        className="celld-demo-stage celld-2d-stage"
        data-graphic-stage="flush"
        ref={stageRef}
        data-layout={compact ? "compact" : "wide"}
      >
        {children(compact)}
      </div>
      <ul className="celld-2d-legend" aria-label="Diagram key">
        {legend.map((item) => (
          <li key={item.label}>
            <span
              className={`celld-key-swatch celld-svg-${item.tone}`}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
      <div className="celld-demo-controls">
        <button
          type="button"
          onClick={playback.toggle}
          disabled={
            blocked || step === total || playback.state === "reduced-motion"
          }
          aria-pressed={playback.playing}
          title={
            playback.state === "reduced-motion"
              ? "Automatic playback is disabled by your reduced-motion preference."
              : undefined
          }
        >
          {playback.playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={playback.replay}>
          Replay
        </button>
        <button
          type="button"
          onClick={playback.manualStep}
          disabled={step === total}
        >
          {nextLabel}
        </button>
        <button type="button" onClick={playback.reset}>
          Reset
        </button>
        <span className="celld-step-count">
          {step} / {total}
        </span>
        {playback.state === "reduced-motion" && (
          <span className="celld-playback-hint">
            Reduced motion: use the step controls
          </span>
        )}
      </div>
      <p className="celld-demo-status" role="status" aria-live="polite">
        {status}
      </p>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Diagram({
  width,
  height,
  title,
  description,
  children,
}: {
  width: number;
  height: number;
  title: string;
  description: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className="celld-2d-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-description`}>{description}</desc>
      <defs>
        {(["neutral", "orange", "blue", "green", "yellow", "red"] as const).map(
          (tone) => (
            <marker
              key={tone}
              id={`${id}-${tone}`}
              viewBox="0 0 7 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path
                d="M0 0 L7 4 L0 8"
                className={`celld-arrowhead celld-svg-${tone}`}
              />
            </marker>
          ),
        )}
      </defs>
      {children(id)}
    </svg>
  );
}

function Wire({
  points,
  id,
  tone = "blue",
  arrow = true,
  flow,
  from,
  to,
}: {
  points: readonly Point[];
  id: string;
  tone?: Tone;
  arrow?: boolean;
  flow?: "request" | "response";
  from?: string;
  to?: string;
}) {
  return (
    <path
      d={path(points)}
      className={`celld-wire celld-svg-${tone}`}
      markerEnd={arrow ? `url(#${id}-${tone})` : undefined}
      data-flow={flow}
      data-from={from}
      data-to={to}
    />
  );
}
function Label({
  x,
  y,
  children,
  tone = "neutral",
  kind = "detail",
  anchor = "middle",
}: {
  x: number;
  y: number;
  children: ReactNode;
  tone?: Tone;
  kind?: "role" | "title" | "detail";
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className={`celld-svg-text celld-svg-text--${kind} celld-label-${tone}`}
    >
      {children}
    </text>
  );
}
function Service({
  b,
  role,
  title,
  detail,
  tone = "blue",
}: {
  b: Bounds;
  role: string;
  title: string;
  detail?: string;
  tone?: Tone;
}) {
  const x = b.x + b.w / 2;
  return (
    <g className={`celld-svg-node celld-svg-${tone}`}>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx="3"
        className="celld-node-body"
      />
      <path
        d={`M${b.x} ${b.y + 26} H${b.x + b.w}`}
        className="celld-node-divider"
      />
      <Label x={x} y={b.y + 17} kind="role" tone={tone}>
        {role}
      </Label>
      <Label x={x} y={b.y + (detail ? 49 : 46)} kind="title">
        {title}
      </Label>
      {detail && (
        <Label x={x} y={b.y + b.h - 14}>
          {detail}
        </Label>
      )}
    </g>
  );
}
function Disk({
  b,
  role,
  title,
  detail,
  tone = "blue",
}: {
  b: Bounds;
  role: string;
  title: string;
  detail?: string;
  tone?: Tone;
}) {
  const x = b.x + b.w / 2,
    cap = 12;
  return (
    <g className={`celld-svg-node celld-svg-${tone}`}>
      <path
        d={`M${b.x} ${b.y + cap} V${b.y + b.h - cap} A${b.w / 2} ${cap} 0 0 0 ${b.x + b.w} ${b.y + b.h - cap} V${b.y + cap} Z`}
        className="celld-node-body"
      />
      <ellipse
        cx={x}
        cy={b.y + cap}
        rx={b.w / 2}
        ry={cap}
        className="celld-node-body"
      />
      <Label x={x} y={b.y + 36} kind="role" tone={tone}>
        {role}
      </Label>
      <Label x={x} y={b.y + 57} kind="title">
        {title}
      </Label>
      {detail && (
        <Label x={x} y={b.y + b.h - 14}>
          {detail}
        </Label>
      )}
    </g>
  );
}
function Gate({
  b,
  title,
  detail,
  tone = "yellow",
}: {
  b: Bounds;
  title: string;
  detail: string;
  tone?: Tone;
}) {
  const x = b.x + b.w / 2;
  return (
    <g className={`celld-svg-node celld-svg-${tone}`}>
      <path
        d={`M${b.x + 14} ${b.y} H${b.x + b.w - 14} L${b.x + b.w} ${b.y + b.h / 2} L${b.x + b.w - 14} ${b.y + b.h} H${b.x + 14} L${b.x} ${b.y + b.h / 2} Z`}
        className="celld-node-body"
      />
      <Label x={x} y={b.y + 29} kind="title" tone={tone}>
        {title}
      </Label>
      <Label x={x} y={b.y + b.h - 16}>
        {detail}
      </Label>
    </g>
  );
}
function Packet({
  x,
  y,
  label,
  tone = "blue",
}: {
  x: number;
  y: number;
  label?: string;
  tone?: Tone;
}) {
  return (
    <g className={`celld-packet celld-svg-${tone}`}>
      <rect x={x - 6} y={y - 6} width="12" height="12" rx="1" />
      {label && (
        <Label x={x} y={y - 15} tone={tone}>
          {label}
        </Label>
      )}
    </g>
  );
}

const ROUTING_STATUSES = [
  "The client names room:lobby. Node A is the entry point; node B already owns this warm cell.",
  "Node A resolves the owner. A valid cached route can avoid a bucket lookup for this request.",
  "Node A forwards this request to node B. It does not pick an arbitrary worker for the named cell.",
  "The cell's handler runs on B and reads its local SQLite database. The bucket is not running the handler.",
  "The response returns through the entry node. Later warm requests can reuse the owner route.",
];
export function CelldRequestRoutingDemo() {
  const { step, next, reset } = useSteps(4);
  return (
    <CelldFrame
      name="celld-request-routing"
      title="Find the Cell"
      description="Name the state you need. Any entry node can route you to its current owner."
      step={step}
      total={4}
      status={ROUTING_STATUSES[step]}
      caption="A warm read-only request: the Worker and SQLite run on a node. The bucket stores ownership metadata and durable data; a cold activation or a write proof can need it."
      onStep={next}
      onReset={reset}
      legend={[
        { tone: "blue", label: "request / work" },
        { tone: "orange", label: "current cell owner" },
        { tone: "green", label: "response returned" },
      ]}
    >
      {(compact) => {
        const client: Bounds = compact
          ? { x: 28, y: 24, w: 264, h: 70 }
          : { x: 20, y: 86, w: 122, h: 90 };
        const entry: Bounds = compact
          ? { x: 28, y: 156, w: 264, h: 82 }
          : { x: 224, y: 86, w: 144, h: 90 };
        const owner: Bounds = compact
          ? { x: 28, y: 300, w: 264, h: 168 }
          : { x: 448, y: 40, w: 132, h: 182 };
        const sqlite: Bounds = compact
          ? { x: 100, y: 378, w: 120, h: 76 }
          : { x: 458, y: 130, w: 112, h: 78 };
        const bucket: Bounds = compact
          ? { x: 28, y: 532, w: 264, h: 84 }
          : { x: 176, y: 300, w: 248, h: 90 };
        const outward = compact
          ? [port(client, "bottom"), port(entry, "top")]
          : [port(client, "right"), port(entry, "left")];
        const forward = compact
          ? [port(entry, "bottom"), port(owner, "top")]
          : [port(entry, "right"), port(owner, "left")];
        const response = step === 4;
        return (
          <Diagram
            width={compact ? 320 : 600}
            height={compact ? 640 : 420}
            title="A request reaches a named cell through its owner"
            description={`${ROUTING_STATUSES[step]} Request arrows run from client to entry A to owner B. The response arrows reverse the path from B through A back to the client.`}
          >
            {(id) => (
              <>
                <Wire
                  id={id}
                  points={response ? [...outward].reverse() : outward}
                  tone={response ? "green" : step >= 1 ? "blue" : "neutral"}
                  flow={response ? "response" : "request"}
                  from={response ? "entry" : "client"}
                  to={response ? "client" : "entry"}
                />
                <Wire
                  id={id}
                  points={response ? [...forward].reverse() : forward}
                  tone={response ? "green" : step >= 2 ? "blue" : "neutral"}
                  flow={response ? "response" : "request"}
                  from={response ? "owner" : "entry"}
                  to={response ? "entry" : "owner"}
                />
                {compact ? (
                  <>
                    <Label
                      x={185}
                      y={128}
                      tone={response ? "green" : "blue"}
                      anchor="start"
                    >
                      {response ? "response" : "HTTP request"}
                    </Label>
                    <Label
                      x={185}
                      y={272}
                      tone={response ? "green" : "blue"}
                      anchor="start"
                    >
                      {response ? "return" : "owner route"}
                    </Label>
                  </>
                ) : (
                  <>
                    <Label x={183} y={110} tone={response ? "green" : "blue"}>
                      {response ? "response" : "request"}
                    </Label>
                    <Label x={408} y={110} tone={response ? "green" : "blue"}>
                      {response ? "return" : "forward"}
                    </Label>
                  </>
                )}
                <Service
                  b={client}
                  role="Client"
                  title={response ? "Got response" : "room:lobby"}
                  detail={compact ? undefined : "HTTP"}
                  tone={response ? "green" : "blue"}
                />
                <Service
                  b={entry}
                  role="Entry node A"
                  title="Worker"
                  detail={step >= 1 ? "owner route → B" : "resolve the owner"}
                />
                <g className="celld-svg-node celld-svg-orange">
                  <rect
                    x={owner.x}
                    y={owner.y}
                    width={owner.w}
                    height={owner.h}
                    rx="3"
                    className="celld-node-body"
                  />
                  <Label
                    x={owner.x + owner.w / 2}
                    y={owner.y + 22}
                    kind="role"
                    tone="orange"
                  >
                    Owner node B
                  </Label>
                  <Label
                    x={owner.x + owner.w / 2}
                    y={owner.y + 46}
                    kind="title"
                  >
                    room:lobby
                  </Label>
                  <Label x={owner.x + owner.w / 2} y={owner.y + 67}>
                    {step >= 3 ? "handler ran here" : "warm cell"}
                  </Label>
                </g>
                <Disk
                  b={sqlite}
                  role="Local state"
                  title="SQLite"
                  tone={step >= 3 ? "green" : "blue"}
                />
                {step === 1 && (
                  <Packet x={compact ? 160 : 183} y={compact ? 125 : 131} />
                )}
                {step === 2 && (
                  <Packet x={compact ? 160 : 407} y={compact ? 269 : 131} />
                )}
                <Disk
                  b={bucket}
                  role="Object bucket"
                  title="Metadata + durable data"
                  tone="neutral"
                />
                <Label x={compact ? 160 : 300} y={compact ? 506 : 266}>
                  Code executes on the nodes above
                </Label>
              </>
            )}
          </Diagram>
        );
      }}
    </CelldFrame>
  );
}

const OWNERSHIP_STATUSES = [
  "B and C read the same owner record after A's lease expires. Both will try to replace version 7.",
  "B wins the conditional write and activates epoch 8. C's stale version-7 condition is rejected.",
  "Paused node A wakes and writes under its old epoch-7 prefix. It cannot overwrite B's epoch-8 objects.",
  "A's bucket-proof acknowledgement checks the owner record. It names B at epoch 8, so A cannot acknowledge this write.",
];
export function CelldOwnershipDemo() {
  const { step, next, reset } = useSteps(3);
  const winner = claimOwnership(INITIAL_OWNER, INITIAL_OWNER.etag, "B");
  const owner = step ? winner.record : INITIAL_OWNER;
  return (
    <CelldFrame
      name="celld-ownership"
      title="One Owner per Cell"
      description="Two nodes may race to claim a cell. A conditional bucket write admits one winner."
      step={step}
      total={3}
      status={OWNERSHIP_STATUSES[step]}
      caption="This race assumes the prior log is recovered or has no outstanding fleet acknowledgements. Epochs are separate object prefixes. A failed acknowledgement does not prove the write is absent."
      onStep={next}
      onReset={reset}
      legend={[
        { tone: "blue", label: "claim attempt" },
        { tone: "green", label: "condition accepted" },
        { tone: "red", label: "stale / rejected" },
      ]}
    >
      {(compact) => {
        const b: Bounds = compact
          ? { x: 12, y: 24, w: 136, h: 92 }
          : { x: 40, y: 28, w: 190, h: 92 };
        const c: Bounds = compact
          ? { x: 172, y: 24, w: 136, h: 92 }
          : { x: 370, y: 28, w: 190, h: 92 };
        const record: Bounds = compact
          ? { x: 40, y: 192, w: 240, h: 112 }
          : { x: 160, y: 208, w: 280, h: 112 };
        const junction: Point = compact ? [160, 155] : [300, 166];
        const old: Bounds = compact
          ? { x: 16, y: 384, w: 126, h: 108 }
          : { x: 236, y: 392, w: 152, h: 100 };
        const current: Bounds = compact
          ? { x: 178, y: 384, w: 126, h: 108 }
          : { x: 432, y: 392, w: 152, h: 100 };
        return (
          <Diagram
            width={compact ? 320 : 600}
            height={compact ? 612 : 536}
            title="Competing claims and separate epoch prefixes"
            description={`${OWNERSHIP_STATUSES[step]} The conditional ownership record chooses one writer. Old and new epoch objects use different keys.`}
          >
            {(id) => (
              <>
                <Wire
                  id={id}
                  points={[
                    port(b, "bottom"),
                    [b.x + b.w / 2, junction[1]],
                    junction,
                  ]}
                  tone={step ? "green" : "blue"}
                  arrow={false}
                />
                <Wire
                  id={id}
                  points={[
                    port(c, "bottom"),
                    [c.x + c.w / 2, junction[1]],
                    junction,
                  ]}
                  tone={step ? "red" : "blue"}
                  arrow={false}
                />
                <Wire
                  id={id}
                  points={[junction, port(record, "top")]}
                  tone={step ? "green" : "blue"}
                />
                <Service
                  b={b}
                  role="Contender B"
                  title={step ? "Claim accepted" : "Claim epoch 8"}
                  detail={step ? "new writer" : "if version = 7"}
                  tone={step ? "green" : "blue"}
                />
                <Service
                  b={c}
                  role="Contender C"
                  title={step ? "Claim rejected" : "Claim epoch 8"}
                  detail={step ? "version changed" : "if version = 7"}
                  tone={step ? "red" : "blue"}
                />
                <g
                  className={`celld-svg-node celld-svg-${step ? "green" : "orange"}`}
                >
                  <rect
                    x={record.x}
                    y={record.y}
                    width={record.w}
                    height={record.h}
                    rx="3"
                    className="celld-node-body"
                  />
                  <Label
                    x={record.x + record.w / 2}
                    y={record.y + 26}
                    kind="role"
                    tone={step ? "green" : "orange"}
                  >
                    Conditional ownership record
                  </Label>
                  <Label
                    x={record.x + record.w / 2}
                    y={record.y + 55}
                    kind="title"
                  >
                    room:lobby → {owner.node}
                  </Label>
                  <Label x={record.x + record.w / 2} y={record.y + 80}>
                    epoch {owner.epoch} · version {owner.epoch}
                  </Label>
                </g>
                <Label
                  x={compact ? 160 : 410}
                  y={compact ? 348 : 362}
                  kind="role"
                >
                  Different object keys
                </Label>
                <Disk
                  b={old}
                  role="A · prior epoch"
                  title="e7/"
                  detail={step >= 2 ? "late write here" : "old objects"}
                  tone={step >= 2 ? "red" : "neutral"}
                />
                <Disk
                  b={current}
                  role="B · new epoch"
                  title="e8/"
                  detail={step ? "current objects" : "not yet active"}
                  tone={step ? "green" : "yellow"}
                />
                {!compact && (
                  <>
                    <Service
                      b={{ x: 20, y: 402, w: 136, h: 80 }}
                      role="Paused A wakes"
                      title="Old writer"
                      tone={step >= 2 ? "red" : "neutral"}
                    />
                    <Wire
                      id={id}
                      points={[[156, 442], port(old, "left")]}
                      tone={step >= 2 ? "red" : "neutral"}
                    />
                    <Label x={194} y={425} tone={step >= 2 ? "red" : "neutral"}>
                      late write
                    </Label>
                  </>
                )}
                {compact && (
                  <Label x={160} y={530} tone={step >= 2 ? "red" : "neutral"}>
                    {step >= 2
                      ? "A wakes → writes only under e7/"
                      : "A's lease expired before the race"}
                  </Label>
                )}
                <Label
                  x={compact ? 160 : 300}
                  y={compact ? 568 : 520}
                  tone={step === 3 ? "red" : "neutral"}
                >
                  {step === 3
                    ? "Owner check: A cannot acknowledge"
                    : "A cannot overwrite B's epoch-8 objects"}
                </Label>
              </>
            )}
          </Diagram>
        );
      }}
    </CelldFrame>
  );
}

const DURABILITY_STATUSES = [
  "Both handlers have committed locally. Neither client has received a successful write response yet.",
  "One node uploads the write to the bucket. With a follower, the owner sends the write to that peer's durable log.",
  "The one-node path checks the current owner after its bucket proof. The two-node path has a follower fsync proof. Both can now acknowledge.",
  "The fleet's bucket upload finishes later. Its earlier acknowledgement depended on the durable follower copy, not this later upload.",
];
export function CelldDurabilityDemo() {
  const { step, next, reset } = useSteps(3);
  const s = deriveDurabilityComparison(step);
  return (
    <CelldFrame
      name="celld-durability"
      title="Before the Acknowledgement"
      description="A successful write response waits for evidence that the committed write is durable."
      step={step}
      total={3}
      status={DURABILITY_STATUSES[step]}
      caption="Default fleet mode, comparing no follower with a one-follower ensemble. Every current ensemble member must fsync. Followers hold recovery data, not another active writer. Bucket mode always waits for bucket proof. Steps do not measure latency."
      onStep={next}
      onReset={reset}
      legend={[
        { tone: "blue", label: "committed work" },
        { tone: "green", label: "durable / allowed" },
        { tone: "yellow", label: "proof pending" },
      ]}
    >
      {(compact) => {
        const width = compact ? 320 : 600,
          centers = compact ? [80, 240] : [150, 450];
        return (
          <Diagram
            width={width}
            height={584}
            title="Two routes to a durability proof"
            description={`${DURABILITY_STATUSES[step]} One-node flow: local commit, bucket coverage, ownership check, acknowledgement. One-follower ensemble: local commit, follower disk fsync, acknowledgement; bucket upload can follow later.`}
          >
            {(id) => (
              <>
                {centers.map((x, i) => {
                  const fleet = i === 1,
                    covered = fleet
                      ? s.fleet.followerStored
                      : s.single.bucketCovered,
                    ack = fleet ? s.fleet.acknowledge : s.single.acknowledge;
                  const local: Bounds = { x: x - 56, y: 48, w: 112, h: 84 },
                    proof: Bounds = { x: x - 62, y: 202, w: 124, h: 96 },
                    gate: Bounds = { x: x - 56, y: 366, w: 112, h: 76 };
                  return (
                    <g key={i}>
                      <Label x={x} y={24} kind="role">
                        {fleet ? "Two nodes" : "One node"}
                      </Label>
                      <Wire
                        id={id}
                        points={[port(local, "bottom"), port(proof, "top")]}
                        tone={covered ? "green" : "blue"}
                      />
                      <Wire
                        id={id}
                        points={[port(proof, "bottom"), port(gate, "top")]}
                        tone={ack ? "green" : "yellow"}
                      />
                      <Label
                        x={x - 14}
                        y={compact ? 165 : 173}
                        anchor="end"
                        tone={covered ? "green" : "blue"}
                      >
                        {compact
                          ? fleet
                            ? "send"
                            : "upload"
                          : fleet
                            ? "send write"
                            : "upload write"}
                      </Label>
                      {compact && (
                        <Label
                          x={x - 14}
                          y={179}
                          anchor="end"
                          tone={covered ? "green" : "blue"}
                        >
                          write
                        </Label>
                      )}
                      <Label
                        x={x - 14}
                        y={compact ? 327 : 335}
                        anchor="end"
                        tone={ack ? "green" : "yellow"}
                      >
                        {compact
                          ? fleet
                            ? "fsync"
                            : "owner"
                          : fleet
                            ? "fsync proof"
                            : "+ owner check"}
                      </Label>
                      {compact && (
                        <Label
                          x={x - 14}
                          y={343}
                          anchor="end"
                          tone={ack ? "green" : "yellow"}
                        >
                          {fleet ? "proof" : "check"}
                        </Label>
                      )}
                      <Disk
                        b={local}
                        role="Owner only"
                        title="SQLite"
                        detail="committed"
                      />
                      {fleet ? (
                        <Service
                          b={proof}
                          role="Follower disk"
                          title={covered ? "Saved to disk" : "Fsync pending"}
                          detail={covered ? "durable copy" : "not proven yet"}
                          tone={covered ? "green" : "yellow"}
                        />
                      ) : (
                        <Disk
                          b={proof}
                          role="Object bucket"
                          title={covered ? "Write covered" : "Upload waits"}
                          detail={covered ? "bucket proof" : "no proof yet"}
                          tone={covered ? "green" : "yellow"}
                        />
                      )}
                      <Gate
                        b={gate}
                        title={ack ? "ACK allowed" : "WAIT"}
                        detail={ack ? "client acts" : "hold reply"}
                        tone={ack ? "green" : "yellow"}
                      />
                      {!fleet && (
                        <>
                          <Label
                            x={x}
                            y={499}
                            tone={s.single.bucketCovered ? "green" : "yellow"}
                          >
                            Bucket before ACK
                          </Label>
                          <Label x={x} y={523}>
                            No follower available
                          </Label>
                        </>
                      )}
                      {fleet && (
                        <>
                          <Wire
                            id={id}
                            points={[
                              port(local, "right"),
                              [x + 72, local.y + local.h / 2],
                              [x + 72, 521],
                              [x + 54, 521],
                            ]}
                            tone={s.fleet.bucketCovered ? "green" : "neutral"}
                          />
                          <Disk
                            b={{ x: x - 54, y: 480, w: 108, h: 82 }}
                            role="Later upload"
                            title="Bucket"
                            detail={
                              s.fleet.bucketCovered ? "covered" : "may lag ACK"
                            }
                            tone={s.fleet.bucketCovered ? "green" : "yellow"}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
                {!compact && (
                  <path d="M300 40 V564" className="celld-svg-divider" />
                )}
              </>
            )}
          </Diagram>
        );
      }}
    </CelldFrame>
  );
}

const RECOVERY_LABELS = [
  ["Owner stops", "A's last acknowledged tail is on its follower."],
  ["Lease expires", "Ingress resolves ownership again; takeover can begin."],
  [
    "Fence the prior log",
    "Compare-and-swap the log record; seal follower appends.",
  ],
  ["Recover the tail", "Upload retained data, then mark the prior log sealed."],
  ["Claim the cell", "Conditionally acquire its ownership at a new epoch."],
  ["Restore SQLite", "Open the recovered bucket chain on node B."],
  ["Serve again", "Node B can now run the cell's handler."],
] as const;
export function CelldRecoveryDemo() {
  const [state, setState] = useState(INITIAL_RECOVERY);
  const [witness, setWitness] = useState<TailWitness>("complete");
  const s = recoverySnapshot(state);
  const status = state.blocked
    ? "The follower is unreachable, so its retained tail is inconclusive. Recovery retries; B has not claimed or restored the cell."
    : `${RECOVERY_LABELS[s.step][0]}. ${RECOVERY_LABELS[s.step][1]}`;
  return (
    <CelldFrame
      name="celld-recovery"
      title="Recover Before Serving"
      description="The bucket may be behind the last acknowledged write. Recover that missing tail first."
      step={s.step}
      total={6}
      status={status}
      caption="This successful path needs the bucket and a complete retained follower tail. An unreachable witness is inconclusive and cannot authorize an older-bucket restore. It is different from a conclusive loss of every durable copy."
      onStep={() => setState((current) => advanceRecovery(current, witness))}
      onReset={() => setState(INITIAL_RECOVERY)}
      nextLabel={state.blocked ? "Retry tail" : "Next step"}
      blocked={state.blocked}
      legend={[
        { tone: "red", label: "stopped / unreachable" },
        { tone: "yellow", label: "recovery gate waits" },
        { tone: "green", label: "recovered / proven" },
      ]}
      options={
        <div
          className="celld-demo-options"
          role="group"
          aria-label="Recovery follower evidence"
        >
          <span className="celld-label">Follower evidence</span>
          {(
            [
              ["complete", "Complete tail"],
              ["unreachable", "Follower unreachable"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={witness === value}
              onClick={() => {
                setWitness(value);
                setState(INITIAL_RECOVERY);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {(compact) => {
        const width = compact ? 320 : 600;
        const a: Bounds = compact
          ? { x: 12, y: 28, w: 132, h: 92 }
          : { x: 24, y: 28, w: 170, h: 92 };
        const follower: Bounds = compact
          ? { x: 176, y: 28, w: 132, h: 92 }
          : { x: 406, y: 28, w: 170, h: 92 };
        const gate: Bounds = compact
          ? { x: 106, y: 200, w: 108, h: 78 }
          : { x: 246, y: 202, w: 108, h: 78 };
        const bucket: Bounds = compact
          ? { x: 16, y: 350, w: 128, h: 104 }
          : { x: 24, y: 354, w: 172, h: 104 };
        const b: Bounds = compact
          ? { x: 176, y: 350, w: 128, h: 104 }
          : { x: 404, y: 354, w: 172, h: 104 };
        const mid = width / 2;
        return (
          <Diagram
            width={width}
            height={compact ? 648 : 576}
            title="Recovery has a gate before new ownership and serving"
            description={`${status} The replacement fences the prior log, gathers a complete tail, uploads it and seals the log before claiming the cell, restoring SQLite, and serving.`}
          >
            {(id) => (
              <>
                <Wire
                  id={id}
                  points={[
                    port(follower, "bottom"),
                    [follower.x + follower.w / 2, 158],
                    [mid, 158],
                    port(gate, "top"),
                  ]}
                  tone={
                    state.blocked
                      ? "red"
                      : s.bucketComplete
                        ? "green"
                        : "yellow"
                  }
                />
                <Wire
                  id={id}
                  points={[
                    port(gate, "left"),
                    [bucket.x + bucket.w / 2, gate.y + gate.h / 2],
                    port(bucket, "top"),
                  ]}
                  tone={s.bucketComplete ? "green" : "yellow"}
                />
                <Wire
                  id={id}
                  points={[port(bucket, "right"), port(b, "left")]}
                  tone={s.restored ? "green" : "neutral"}
                />
                <Wire
                  id={id}
                  points={[
                    port(gate, "right"),
                    [b.x + b.w / 2, gate.y + gate.h / 2],
                    port(b, "top"),
                  ]}
                  tone={s.ownershipAcquired ? "orange" : "neutral"}
                />
                <Label
                  x={compact ? 182 : mid + 20}
                  y={181}
                  anchor="start"
                  tone={state.blocked ? "red" : "yellow"}
                >
                  {compact
                    ? state.blocked
                      ? "No complete"
                      : "Complete tail"
                    : state.blocked
                      ? "No complete witness"
                      : "Complete tail required"}
                </Label>
                {compact && (
                  <Label
                    x={182}
                    y={195}
                    anchor="start"
                    tone={state.blocked ? "red" : "yellow"}
                  >
                    {state.blocked ? "witness" : "required"}
                  </Label>
                )}
                <Service
                  b={a}
                  role="Stopped owner A"
                  title="No serving"
                  detail={s.leaseExpired ? "lease expired" : "wait for lease"}
                  tone="red"
                />
                <Service
                  b={follower}
                  role="Follower disk"
                  title={state.blocked ? "Unreachable" : "Retained tail"}
                  detail={
                    s.bucketComplete ? "tail recovered" : "acknowledged data"
                  }
                  tone={
                    state.blocked ? "red" : s.bucketComplete ? "green" : "blue"
                  }
                />
                <Gate
                  b={gate}
                  title={s.logSealed ? "Log sealed" : "RECOVER"}
                  detail={
                    state.blocked
                      ? "retry only"
                      : s.logSealed
                        ? "tail proven"
                        : s.logFenced
                          ? "fenced"
                          : "lease first"
                  }
                  tone={s.logSealed ? "green" : "yellow"}
                />
                <Disk
                  b={bucket}
                  role="Object bucket"
                  title={s.bucketComplete ? "Tail included" : "Tail missing"}
                  detail={
                    s.bucketComplete ? "prior log sealed" : "not complete yet"
                  }
                  tone={s.bucketComplete ? "green" : "yellow"}
                />
                <Service
                  b={b}
                  role="Replacement B"
                  title={
                    s.serving
                      ? "Serving"
                      : s.restored
                        ? "Restored"
                        : s.ownershipAcquired
                          ? "Claimed e8"
                          : "Not claimed"
                  }
                  detail={
                    s.serving
                      ? "handler can run"
                      : s.restored
                        ? "ready to serve"
                        : s.ownershipAcquired
                          ? "restore next"
                          : "recovery first"
                  }
                  tone={
                    s.serving
                      ? "green"
                      : s.ownershipAcquired
                        ? "orange"
                        : "neutral"
                  }
                />
                {!compact && (
                  <>
                    <Label
                      x={126}
                      y={314}
                      anchor="start"
                      tone={s.bucketComplete ? "green" : "yellow"}
                    >
                      upload retained data
                    </Label>
                    <Label
                      x={320}
                      y={314}
                      anchor="start"
                      tone={s.ownershipAcquired ? "orange" : "neutral"}
                    >
                      then claim epoch 8
                    </Label>
                    <Label
                      x={mid}
                      y={389}
                      tone={s.restored ? "green" : "neutral"}
                    >
                      restore
                    </Label>
                  </>
                )}
                {compact && (
                  <>
                    <Label
                      x={92}
                      y={310}
                      anchor="start"
                      tone={s.bucketComplete ? "green" : "yellow"}
                    >
                      upload tail
                    </Label>
                    <Label
                      x={250}
                      y={310}
                      anchor="start"
                      tone={s.ownershipAcquired ? "orange" : "neutral"}
                    >
                      claim
                    </Label>
                    <Label
                      x={250}
                      y={326}
                      anchor="start"
                      tone={s.ownershipAcquired ? "orange" : "neutral"}
                    >
                      e8
                    </Label>
                    <Label x={mid} y={488}>
                      Restore follows recovery + claim
                    </Label>
                  </>
                )}
                {["LEASE", "FENCE", "TAIL", "CLAIM", "RESTORE", "SERVE"].map(
                  (label, i) => {
                    const x = compact ? 54 + (i % 3) * 106 : 50 + i * 100,
                      y = compact ? 535 + Math.floor(i / 3) * 60 : 508;
                    const done = s.step >= i + 1,
                      pendingTail = state.blocked && i === 2;
                    return (
                      <g
                        key={label}
                        className={`celld-progress-stop celld-svg-${done ? "green" : pendingTail ? "yellow" : "neutral"}`}
                      >
                        <circle cx={x} cy={y} r="10" />
                        <Label
                          x={x}
                          y={y + 29}
                          kind="role"
                          tone={
                            done ? "green" : pendingTail ? "yellow" : "neutral"
                          }
                        >
                          {label}
                        </Label>
                      </g>
                    );
                  },
                )}
              </>
            )}
          </Diagram>
        );
      }}
    </CelldFrame>
  );
}

function WorkSlot({
  operation,
  x,
  y,
  w,
  h,
  round,
}: {
  operation: ScheduledOperation;
  x: number;
  y: number;
  w: number;
  h: number;
  round: number;
}) {
  const complete = operation.round <= round;
  return (
    <g
      className={`celld-work-slot celld-svg-${complete ? "green" : "yellow"}`}
      data-complete={complete}
      aria-label={`Operation ${operation.id}: ${complete ? "complete" : "queued"}`}
    >
      <rect x={x} y={y} width={w} height={h} rx="2" />
      <text x={x + w / 2} y={y + h / 2 + 5}>
        {operation.id}
      </text>
    </g>
  );
}
export function CelldKeyChoiceDemo() {
  const { step, next, reset } = useSteps(6);
  const status =
    step === 0
      ? "Six equal synchronous work turns are queued in each design. The key determines which cell owns each turn."
      : step < 2
        ? "After one illustrative round: one hot-cell turn completes; three independent cells can each complete a turn."
        : step < 6
          ? `After ${step} rounds: the independent cells have finished; the hot cell still has ${6 - step} ${step === 5 ? "turn" : "turns"} queued.`
          : "All six turns finish: the hot cell took six rounds, and the three independent cells took two.";
  return (
    <CelldFrame
      name="celld-key-choice"
      title="Choose the State Boundary"
      description="Six work turns. One cell processes them serially; independent cells can work on separate nodes."
      step={step}
      total={6}
      status={status}
      caption="Equal illustrative CPU/SQL turns with enough nodes for three-way parallelism. This is not a throughput benchmark. One fleet runs one application; separate cells do not create a cross-cell transaction."
      onStep={next}
      onReset={reset}
      nextLabel="Run one round"
      legend={[
        { tone: "yellow", label: "queued turn" },
        { tone: "blue", label: "work route" },
        { tone: "green", label: "turn complete" },
      ]}
    >
      {(compact) => {
        const width = compact ? 320 : 600;
        const hotEngine: Bounds = compact
          ? { x: 90, y: 178, w: 140, h: 84 }
          : { x: 438, y: 70, w: 142, h: 92 };
        const hotQueue: Bounds = compact
          ? { x: 15, y: 96, w: 290, h: 38 }
          : { x: 20, y: 95, w: 328, h: 42 };
        return (
          <Diagram
            width={width}
            height={compact ? 598 : 456}
            title="One hot cell versus three independent cell queues"
            description={`${status} Each key has one cell. Numbered blocks are equal synchronous operations, not replicas. Each cell processes at most one turn per round.`}
          >
            {(id) => (
              <>
                <Label
                  x={compact ? 160 : 20}
                  y={29}
                  kind="role"
                  tone="orange"
                  anchor={compact ? "middle" : "start"}
                >
                  One hot cell
                </Label>
                <Label
                  x={compact ? 160 : 20}
                  y={59}
                  kind="title"
                  anchor={compact ? "middle" : "start"}
                >
                  room:lobby
                </Label>
                <Wire
                  id={id}
                  points={
                    compact
                      ? [port(hotQueue, "bottom"), port(hotEngine, "top")]
                      : [
                          port(hotQueue, "right"),
                          [393, hotQueue.y + hotQueue.h / 2],
                          [393, hotEngine.y + hotEngine.h / 2],
                          port(hotEngine, "left"),
                        ]
                  }
                />
                <rect
                  x={hotQueue.x}
                  y={hotQueue.y}
                  width={hotQueue.w}
                  height={hotQueue.h}
                  rx="2"
                  className="celld-queue-tray"
                />
                {HOT_KEY_SCHEDULE.map((operation, i) => (
                  <WorkSlot
                    key={operation.id}
                    operation={operation}
                    x={hotQueue.x + i * (compact ? 50 : 56)}
                    y={hotQueue.y}
                    w={compact ? 40 : 48}
                    h={hotQueue.h}
                    round={step}
                  />
                ))}
                <Service
                  b={hotEngine}
                  role="One active writer"
                  title={`${step} / 6 complete`}
                  detail="one turn per round"
                  tone={step === 6 ? "green" : "orange"}
                />
                <Label
                  x={compact ? 184 : 393}
                  y={compact ? 161 : 189}
                  tone="blue"
                  anchor={compact ? "start" : "middle"}
                >
                  one at a time
                </Label>
                <path
                  d={compact ? "M16 288 H304" : "M20 216 H580"}
                  className="celld-svg-divider"
                />
                <Label
                  x={compact ? 160 : 20}
                  y={compact ? 316 : 247}
                  kind="role"
                  tone="orange"
                  anchor={compact ? "middle" : "start"}
                >
                  Three independent cells
                </Label>
                {["room:a", "room:b", "room:c"].map((key, i) => {
                  const ops = INDEPENDENT_KEY_SCHEDULE.filter(
                      (op) => op.key === key,
                    ),
                    complete = ops.filter((op) => op.round <= step).length;
                  const y = compact ? 350 + i * 78 : 280 + i * 58;
                  const engine: Bounds = compact
                    ? { x: 210, y, w: 98, h: 58 }
                    : { x: 438, y: y - 4, w: 142, h: 50 };
                  const queue: Bounds = compact
                    ? { x: 84, y: y + 11, w: 84, h: 36 }
                    : { x: 130, y, w: 104, h: 42 };
                  return (
                    <g key={key}>
                      <Label x={compact ? 12 : 20} y={y + 29} anchor="start">
                        {key}
                      </Label>
                      <Wire
                        id={id}
                        points={[port(queue, "right"), port(engine, "left")]}
                      />
                      <rect
                        x={queue.x}
                        y={queue.y}
                        width={queue.w}
                        height={queue.h}
                        rx="2"
                        className="celld-queue-tray"
                      />
                      {ops.map((operation, j) => (
                        <WorkSlot
                          key={operation.id}
                          operation={operation}
                          x={queue.x + j * (compact ? 46 : 56)}
                          y={queue.y}
                          w={compact ? 38 : 48}
                          h={queue.h}
                          round={step}
                        />
                      ))}
                      <g
                        className={`celld-svg-node celld-svg-${complete === 2 ? "green" : "blue"}`}
                      >
                        <rect
                          x={engine.x}
                          y={engine.y}
                          width={engine.w}
                          height={engine.h}
                          rx="3"
                          className="celld-node-body"
                        />
                        <Label
                          x={engine.x + engine.w / 2}
                          y={engine.y + 23}
                          kind="title"
                        >
                          cell {key.at(-1)}
                        </Label>
                        <Label x={engine.x + engine.w / 2} y={engine.y + 43}>
                          {complete} / 2 {compact ? "done" : "complete"}
                        </Label>
                      </g>
                    </g>
                  );
                })}
              </>
            )}
          </Diagram>
        );
      }}
    </CelldFrame>
  );
}
