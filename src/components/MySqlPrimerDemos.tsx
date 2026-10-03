import { type ReactNode, useId, useState } from "react";
import {
  advanceTransaction,
  createTransaction,
  CUSTOMERS,
  joinCustomerOrders,
  ORDERS,
  queryOrders,
  type TransactionAction,
} from "~/demos/mysql-primer/model";
import {
  checkCandidate,
  type Candidate,
} from "~/demos/mysql-primer/constraints";
import {
  useMySqlPlayback,
  type MySqlPlayback,
} from "~/demos/mysql-primer/useMySqlPlayback";
import { MySqlPlaybackControls } from "./MySqlPlaybackControls";
import "~/styles/mysql-primer.css";

function PrimerFigure({
  name,
  graphicKey,
  description,
  children,
  controls,
  status,
  caption,
  playback,
}: {
  name: string;
  graphicKey: string;
  description: string;
  children: ReactNode;
  controls: ReactNode;
  status: ReactNode;
  caption: string;
  playback: MySqlPlayback;
}) {
  const id = useId();
  return (
    <figure
      className="mysql-primer"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      data-graphic-key={graphicKey}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <header className="mysql-primer-header">
        <p className="article-graphic-title" id={`${id}-title`}>
          {name}
        </p>
        <p>{description}</p>
      </header>
      <div
        ref={playback.stageRef}
        className="mysql-primer-stage"
        data-graphic-stage="flush"
      >
        {children}
      </div>
      <div
        className="mysql-primer-controls"
        role="group"
        aria-label={`${name} controls`}
      >
        {controls}
        <MySqlPlaybackControls playback={playback} />
      </div>
      <p
        className="mysql-primer-status"
        role="status"
        aria-live={playback.running ? "off" : "polite"}
        aria-atomic="true"
      >
        {status}
      </p>
      <figcaption id={`${id}-caption`}>{caption}</figcaption>
    </figure>
  );
}
type MobileRow = { label: string; detail: string; tone: string };
function Diagram({
  label,
  children,
  mobileRows,
}: {
  label: string;
  children: ReactNode;
  mobileRows: MobileRow[];
}) {
  return (
    <>
      <svg
        className="mysql-primer-diagram mysql-primer-desktop"
        viewBox="0 0 600 310"
        role="img"
        aria-label={label}
      >
        {children}
      </svg>
      <svg
        className="mysql-primer-diagram mysql-primer-mobile"
        viewBox={`0 0 300 ${mobileRows.length * 105 + 10}`}
        role="img"
        aria-label={label}
      >
        {mobileRows.map((row, i) => (
          <g key={i}>
            {i > 0 && (
              <Wire
                d={`M150 ${i * 105 - 15} V${i * 105 + 10}`}
                tone={row.tone}
              />
            )}
            <Node x={15} y={10 + i * 105} w={270} {...row} />
          </g>
        ))}
      </svg>
    </>
  );
}
function Text({
  x,
  y,
  children,
  tone = "muted",
}: {
  x: number;
  y: number;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className={`mysql-svg-meta mysql-tone-${tone}`}
    >
      {children}
    </text>
  );
}
function Node({
  x,
  y,
  w = 180,
  label,
  detail,
  tone = "blue",
}: {
  x: number;
  y: number;
  w?: number;
  label: string;
  detail: string;
  tone?: string;
}) {
  return (
    <g className={`mysql-svg-node mysql-tone-${tone}`}>
      <rect x={x} y={y} width={w} height={80} rx={4} />
      <text x={x + w / 2} y={y + 32} textAnchor="middle">
        {label}
      </text>
      <text
        className="mysql-svg-detail"
        x={x + w / 2}
        y={y + 57}
        textAnchor="middle"
      >
        {detail}
      </text>
    </g>
  );
}
function Wire({ d, tone = "muted" }: { d: string; tone?: string }) {
  return (
    <path d={d} className={`mysql-svg-wire mysql-tone-${tone}`} fill="none" />
  );
}
const REQUEST_STEPS = [
  "The application sends SELECT to the MySQL server over a connection.",
  "MySQL parses the SQL and chooses an execution plan.",
  "The storage engine supplies the rows requested by the execution plan.",
  "MySQL returns Ada's two orders. The application decides how to display them.",
];
export function MySqlRequestDemo() {
  const [step, setStep] = useState(0);
  const playback = useMySqlPlayback({
    complete: step === 3,
    beat: step,
    onAdvance: () => setStep((current) => Math.min(current + 1, 3)),
    onReplay: () => setStep(0),
  });
  return (
    <PrimerFigure
      playback={playback}
      name="A query round trip"
      graphicKey="mysql-request"
      description="SQL enters the server; rows come back to your application."
      controls={
        <>
          <button
            type="button"
            disabled={step === 3}
            onClick={() => {
              playback.pause();
              setStep((current) => Math.min(current + 1, 3));
            }}
          >
            Next step
          </button>
          <button
            type="button"
            onClick={() => {
              playback.pause();
              setStep(0);
            }}
          >
            Reset
          </button>
          <span className="mysql-primer-step">Step {step + 1} of 4</span>
        </>
      }
      status={REQUEST_STEPS[step]}
      caption="One server, four responsibilities. Orange traces the request, blue marks stored data, and green marks the answer."
    >
      <Diagram
        label={`Query round trip: step ${step + 1} of 4`}
        mobileRows={[
          {
            label: "APPLICATION",
            detail: "SELECT orders for Ada",
            tone: step === 0 ? "orange" : "muted",
          },
          {
            label: "SQL LAYER",
            detail: "Parse · plan · execute",
            tone: step === 1 ? "orange" : "muted",
          },
          {
            label: "INNODB",
            detail: "Read table / index pages",
            tone: step === 2 ? "blue" : "muted",
          },
          {
            label: "RESULT ROWS",
            detail:
              step === 3 ? "Orders 101 and 102" : "Waiting for the result",
            tone: step === 3 ? "green" : "muted",
          },
        ]}
      >
        <Node
          x={30}
          y={35}
          w={210}
          label="APPLICATION"
          detail="SELECT orders for Ada"
          tone={step === 0 ? "orange" : "muted"}
        />
        <Node
          x={360}
          y={35}
          w={210}
          label="SQL LAYER"
          detail="Parse · plan · execute"
          tone={step === 1 ? "orange" : "muted"}
        />
        <Node
          x={360}
          y={190}
          w={210}
          label="INNODB"
          detail="Read table / index pages"
          tone={step === 2 ? "blue" : "muted"}
        />
        <Node
          x={30}
          y={190}
          w={210}
          label="RESULT ROWS"
          detail={step === 3 ? "Orders 101 and 102" : "Waiting for the result"}
          tone={step === 3 ? "green" : "muted"}
        />
        <Wire d="M240 75 H360" tone={step >= 1 ? "orange" : "muted"} />
        <Wire d="M465 115 V190" tone={step >= 2 ? "blue" : "muted"} />
        <Wire d="M360 230 H240" tone={step === 3 ? "green" : "muted"} />
        <Wire d="M135 190 V115" tone={step === 3 ? "green" : "muted"} />
        <Text x={300} y={62}>
          SQL →
        </Text>
        <Text x={300} y={217}>
          ← ROWS
        </Text>
      </Diagram>
    </PrimerFigure>
  );
}
export function MySqlRelationsDemo() {
  const [customerId, setCustomerId] = useState(1);
  const customer = CUSTOMERS.find((r) => r.id === customerId)!;
  const result = joinCustomerOrders(customerId);
  const playback = useMySqlPlayback({
    complete: customerId === 2,
    beat: customerId,
    delayMs: 3500,
    onAdvance: () => setCustomerId(2),
    onReplay: () => setCustomerId(1),
  });
  return (
    <PrimerFigure
      playback={playback}
      name="Related rows"
      graphicKey="mysql-relations"
      description="Store each name once; link orders through the customer key."
      controls={CUSTOMERS.map((r) => (
        <button
          type="button"
          key={r.id}
          aria-pressed={customerId === r.id}
          onClick={() => {
            playback.pause();
            setCustomerId(r.id);
          }}
        >
          {r.name}'s orders
        </button>
      ))}
      status={`${customer.name} joins to ${result.length} ${result.length === 1 ? "order" : "orders"} through customer_id = ${customerId}. Joined result: ${result.map((r) => `#${r.id} ${r.book}`).join(", ")}.`}
      caption="JOIN matches keys. Orders repeat the customer ID, not the name."
    >
      <Diagram
        label={`${customer.name}'s customer key matches ${result.map((r) => r.id).join(" and ")}`}
        mobileRows={[
          {
            label: `${customer.name} · customer ${customerId}`,
            detail: "customers.id = orders.customer_id",
            tone: "orange",
          },
          ...result.map((r) => ({
            label: `Order #${r.id}`,
            detail: `Customer ${r.customerId} · ${r.totalCents} cents`,
            tone: "blue",
          })),
        ]}
      >
        <Text x={135} y={28}>
          CUSTOMERS · PRIMARY KEY
        </Text>
        <Text x={450} y={28}>
          ORDERS · FOREIGN KEY
        </Text>
        {CUSTOMERS.map((r, i) => (
          <Node
            key={r.id}
            x={30}
            y={55 + i * 115}
            w={210}
            label={`${r.id} · ${r.name}`}
            detail="customers.id"
            tone={r.id === customerId ? "orange" : "muted"}
          />
        ))}
        {ORDERS.map((r, i) => (
          <g key={r.id}>
            <Wire
              d={`M240 ${95 + (r.customerId - 1) * 115} H285 V${80 + i * 85} H345`}
              tone={r.customerId === customerId ? "orange" : "muted"}
            />
            <Node
              x={345}
              y={40 + i * 85}
              w={225}
              label={`#${r.id} · customer ${r.customerId}`}
              detail={`${r.totalCents} cents`}
              tone={r.customerId === customerId ? "blue" : "muted"}
            />
          </g>
        ))}
      </Diagram>
      <div className="mysql-primer-joined">
        {result.map((r) => (
          <span key={r.id}>
            {r.customerName} · {r.book} · <strong>#{r.id}</strong>
          </span>
        ))}
      </div>
    </PrimerFigure>
  );
}
export function MySqlQueryDemo() {
  const [step, setStep] = useState(0);
  const result = queryOrders(1);
  const playback = useMySqlPlayback({
    complete: step === 2,
    beat: step,
    onAdvance: () => setStep((current) => Math.min(current + 1, 2)),
    onReplay: () => setStep(0),
  });
  return (
    <PrimerFigure
      playback={playback}
      name="From rows to a result"
      graphicKey="mysql-query"
      description="WHERE chooses the contributors; SUM combines their amounts."
      controls={
        <>
          <button
            type="button"
            disabled={step === 2}
            onClick={() => {
              playback.pause();
              setStep((current) => Math.min(current + 1, 2));
            }}
          >
            {step === 0 ? "Apply WHERE" : "Calculate SUM"}
          </button>
          <button
            type="button"
            onClick={() => {
              playback.pause();
              setStep(0);
            }}
          >
            Reset
          </button>
        </>
      }
      status={
        [
          "Start with three orders belonging to two customers.",
          "WHERE keeps orders 101 and 102. Order 103 belongs to a different customer.",
          `SUM combines the two matching values: 2900 + 4500 = ${result.totalCents} cents.`,
        ][step]
      }
      caption="Query meaning, not execution order. An index may produce the same answer. Amounts are integer cents."
    >
      <Diagram
        label="Three orders pass through WHERE; two matching amounts contribute to SUM"
        mobileRows={[
          {
            label: "INPUT · 3 orders",
            detail: "101: 2900 · 102: 4500 · 103: 2900",
            tone: "blue",
          },
          {
            label: "WHERE customer_id = 1",
            detail:
              step > 0
                ? "Keep 101, 102 · exclude 103"
                : "Filtering not applied",
            tone: step > 0 ? "orange" : "muted",
          },
          {
            label: step === 2 ? "SUM = 7400 cents" : "SUM pending",
            detail: "2900 + 4500",
            tone: step === 2 ? "green" : "muted",
          },
        ]}
      >
        <Text x={125} y={28}>
          INPUT ROWS
        </Text>
        <Text x={310} y={28}>
          WHERE CUSTOMER = 1
        </Text>
        <Text x={500} y={28}>
          SUM
        </Text>
        {ORDERS.map((r, i) => (
          <g key={r.id}>
            <Node
              x={25}
              y={40 + i * 85}
              w={200}
              label={`#${r.id} · ${r.totalCents} cents`}
              detail={`customer_id = ${r.customerId}`}
              tone={step > 0 && r.customerId !== 1 ? "muted" : "blue"}
            />
            <Wire
              d={`M225 ${80 + i * 85} H285 V155 H415`}
              tone={step > 0 && r.customerId === 1 ? "orange" : "muted"}
            />
            {step > 0 && r.customerId !== 1 && (
              <Text x={310} y={278}>
                103 EXCLUDED
              </Text>
            )}
          </g>
        ))}
        <Node
          x={415}
          y={115}
          w={160}
          label={step === 2 ? "7400 cents" : "Pending"}
          detail={step === 2 ? "2900 + 4500" : "Two matching rows"}
          tone={step === 2 ? "green" : "muted"}
        />
      </Diagram>
    </PrimerFigure>
  );
}
export function MySqlConstraintsDemo() {
  const [candidate, setCandidate] = useState<Candidate>("valid");
  const result = checkCandidate(candidate);
  const options: [Candidate, string][] = [
    ["valid", "Valid order"],
    ["missing-customer", "Unknown customer"],
    ["duplicate-id", "Duplicate id"],
    ["negative-stock", "Negative stock"],
  ];
  const playback = useMySqlPlayback({
    complete: candidate === "negative-stock",
    beat: candidate,
    delayMs: 3500,
    onAdvance: () => {
      const index = options.findIndex(([key]) => key === candidate);
      setCandidate(options[Math.min(index + 1, options.length - 1)][0]);
    },
    onReplay: () => setCandidate("valid"),
  });
  return (
    <PrimerFigure
      playback={playback}
      name="Rules protect your data"
      graphicKey="mysql-constraints"
      description="The database rejects a write that breaks an enforced rule."
      controls={options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={candidate === key}
          onClick={() => {
            playback.pause();
            setCandidate(key);
          }}
        >
          {label}
        </button>
      ))}
      status={result.message}
      caption="Each attempt uses unchanged seed data. PRIMARY KEY prevents duplicates, FOREIGN KEY protects relationships, and CHECK rejects invalid stock."
    >
      <Diagram
        label={result.message}
        mobileRows={[
          { label: "ATTEMPTED WRITE", detail: result.value, tone: "orange" },
          ...["Unique order id", "Existing customer", "Stock ≥ 0"].map(
            (label, i) => ({
              label,
              detail: result.failed === i ? "REJECTED" : "RULE SATISFIED",
              tone: result.failed === i ? "red" : "green",
            }),
          ),
        ]}
      >
        <Node
          x={30}
          y={115}
          w={180}
          label="ATTEMPTED WRITE"
          detail={result.value}
          tone="orange"
        />
        {["Unique order id", "Existing customer", "Stock ≥ 0"].map(
          (label, i) => (
            <g key={label}>
              <Wire
                d={`M210 155 H245 V${70 + i * 85} H280`}
                tone={result.failed === i ? "red" : "blue"}
              />
              <Node
                x={280}
                y={30 + i * 85}
                w={200}
                label={label}
                detail={result.failed === i ? "REJECTED" : "RULE SATISFIED"}
                tone={result.failed === i ? "red" : "green"}
              />
            </g>
          ),
        )}
        <Text x={535} y={150} tone={result.failed === null ? "green" : "red"}>
          {result.failed === null ? "KEEP" : "REJECT"}
        </Text>
        <Text x={535} y={175}>
          WRITE
        </Text>
      </Diagram>
    </PrimerFigure>
  );
}

export function MySqlTransactionDemo() {
  const [transaction, setTransaction] = useState(createTransaction);
  const nextAction: Partial<
    Record<
      typeof transaction.phase,
      { action: TransactionAction; label: string }
    >
  > = {
    ready: { action: "begin", label: "Start transaction" },
    started: { action: "reserve", label: "Reserve one book" },
    reserved: { action: "insert", label: "Insert order 104" },
    ordered: { action: "commit", label: "Commit both" },
  };
  const descriptions = {
    ready: "Stock is 2 and order 104 is absent. No transaction is active.",
    started:
      "START TRANSACTION begins this application's two-statement operation.",
    reserved:
      "The stock update affects one row. This transaction sees stock 1; the change is still uncommitted.",
    ordered:
      "The transaction sees stock 1 and order 104. Both changes are ready for commit or rollback.",
    committed:
      "Committed: stock is 1 and order 104 is present. Both changes were saved together.",
    "rolled-back":
      "Rolled back: stock is 2 and order 104 is absent. Neither change was kept.",
  };
  const next = nextAction[transaction.phase];
  function act(action: TransactionAction) {
    setTransaction((current) => advanceTransaction(current, action));
  }
  const playback = useMySqlPlayback({
    complete:
      transaction.phase === "committed" || transaction.phase === "rolled-back",
    beat: transaction.phase,
    onAdvance: () => next && act(next.action),
    onReplay: () => setTransaction(createTransaction()),
  });
  return (
    <PrimerFigure
      playback={playback}
      name="One transaction"
      graphicKey="mysql-transaction"
      description="Reserve inventory and create an order as one operation."
      controls={
        <>
          <button
            type="button"
            disabled={!next}
            onClick={() => {
              playback.pause();
              if (next) act(next.action);
            }}
          >
            {next?.label ?? "Finished"}
          </button>
          <button
            type="button"
            disabled={!transaction.pending}
            onClick={() => {
              playback.pause();
              act("rollback");
            }}
          >
            Roll back
          </button>
          <button
            type="button"
            onClick={() => {
              playback.pause();
              setTransaction(createTransaction());
            }}
          >
            Reset
          </button>
        </>
      }
      status={descriptions[transaction.phase]}
      caption="The application checks stock before inserting, then commits both changes together. This model shows atomicity; locks and isolation are separate lessons."
    >
      <Diagram
        label="Committed and pending changes remain separate until commit"
        mobileRows={[
          {
            label: "COMMITTED DATA",
            detail: `Stock ${transaction.committed.stock} · order 104 ${transaction.committed.orderIds.includes(104) ? "present" : "absent"}`,
            tone: "green",
          },
          {
            label: "THIS TRANSACTION",
            detail: transaction.pending
              ? `Stock ${transaction.pending.stock} · order 104 ${transaction.pending.orderIds.includes(104) ? "present" : "absent"}`
              : "No pending changes",
            tone: transaction.pending ? "yellow" : "muted",
          },
          {
            label:
              transaction.phase === "committed"
                ? "BOTH SAVED"
                : transaction.phase === "rolled-back"
                  ? "NEITHER KEPT"
                  : "COMMIT OR ROLLBACK",
            detail: "Stock and order change together",
            tone: transaction.phase === "committed" ? "green" : "orange",
          },
        ]}
      >
        <Text x={150} y={35}>
          COMMITTED DATA
        </Text>
        <Text x={450} y={35}>
          THIS TRANSACTION
        </Text>
        <Node
          x={45}
          y={65}
          w={210}
          label={`Stock: ${transaction.committed.stock}`}
          detail={`Order 104: ${transaction.committed.orderIds.includes(104) ? "present" : "absent"}`}
          tone="green"
        />
        <Node
          x={345}
          y={65}
          w={210}
          label={
            transaction.pending
              ? `Stock: ${transaction.pending.stock}`
              : "No pending changes"
          }
          detail={
            transaction.pending
              ? `Order 104: ${transaction.pending.orderIds.includes(104) ? "present" : "absent"}`
              : transaction.phase
          }
          tone={transaction.pending ? "yellow" : "muted"}
        />
        <Wire
          d="M345 105 H255"
          tone={transaction.phase === "committed" ? "green" : "muted"}
        />
        <Text x={300} y={170}>
          {transaction.phase === "committed"
            ? "BOTH CHANGES SAVED"
            : transaction.phase === "rolled-back"
              ? "NEITHER CHANGE KEPT"
              : "COMMIT OR ROLLBACK TOGETHER"}
        </Text>
        <Node
          x={45}
          y={205}
          w={210}
          label="1 · UPDATE stock"
          detail="Require one affected row"
          tone={
            transaction.phase === "reserved" || transaction.phase === "ordered"
              ? "orange"
              : "muted"
          }
        />
        <Node
          x={345}
          y={205}
          w={210}
          label="2 · INSERT order"
          detail="Only after reservation"
          tone={transaction.phase === "ordered" ? "orange" : "muted"}
        />
        <Wire d="M255 245 H345" tone="orange" />
      </Diagram>
    </PrimerFigure>
  );
}
