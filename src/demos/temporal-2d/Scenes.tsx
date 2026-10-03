import {
  idempotencySnapshot,
  recoverySnapshot,
  retrySnapshot,
  signalSnapshot,
  timerSnapshot,
  workflowSnapshot,
  type RetryOutcome,
} from "./model";
import { type Bounds, type Point, route } from "./geometry";
import type { TemporalPlayback } from "./playback";
import { History, Label, Node, SvgScene, type Tone, Wire } from "./Svg";

const box = (x: number, y: number, width: number, height: number): Bounds => ({
  x,
  y,
  width,
  height,
});

export function RecoveryScene({ playback }: { playback: TemporalPlayback }) {
  const state = recoverySnapshot(playback.step);
  const compact = playback.compact;
  const width = compact ? 320 : 600;
  const laneWidth = compact ? 296 : 276;
  return (
    <SvgScene
      width={width}
      height={compact ? 704 : 390}
      label="After completed inventory and payment results, a crash erases memory-only progress. Durable progress survives and the order can finish."
    >
      {[false, true].map((durable, index) => {
        const x = compact ? 12 : 12 + index * 300;
        const y = compact ? index * 350 : 0;
        const worker = box(x, y + 44, laneWidth, 94);
        const records = box(x, y + 202, laneWidth, 102);
        const tone: Tone = state.crashed
          ? "failure"
          : state.restarted && !durable
            ? "waiting"
            : state.durableProvisioned && durable
              ? "success"
              : "active";
        const wire = route(worker, "bottom", records, "top");
        const count = durable ? state.durableResults : state.fragileMemory;
        return (
          <g key={String(durable)}>
            <Label x={x} y={y + 22} size="title">
              {durable ? "DURABLE EXECUTION" : "MEMORY-ONLY PROCESS"}
            </Label>
            <Wire
              points={wire}
              tone={durable ? "durable" : "muted"}
              label={durable ? "record progress" : "remember locally"}
              labelAt={[x + laneWidth / 2 + 70, y + 178]}
              packet={durable && state.step < 2}
              playback={playback}
            />
            <Node
              bounds={worker}
              title={
                state.crashed
                  ? "Worker offline"
                  : state.restarted
                    ? "Replacement Worker"
                    : "Application Worker"
              }
              lines={[
                state.crashed
                  ? "Process memory lost"
                  : state.restarted
                    ? durable
                      ? "Can continue the order"
                      : "Next step unknown"
                    : state.completedEffects
                      ? `Completed operations: ${state.completedEffects}`
                      : "Order started",
              ]}
              tone={tone}
              dashed={state.crashed}
            />
            {durable ? (
              <History
                bounds={records}
                entries={
                  count === 0
                    ? ["No completed result yet"]
                    : count === 1
                      ? ["Inventory result recorded"]
                      : ["Inventory result recorded", "Payment result recorded"]
                }
                highlight={state.step > 0 && state.step < 3}
              />
            ) : (
              <Node
                bounds={records}
                title="PROCESS MEMORY"
                lines={
                  count === 0
                    ? [
                        state.step >= 3
                          ? "Progress is gone"
                          : "No completed result yet",
                      ]
                    : count === 1
                      ? ["reservation-7"]
                      : ["reservation-7", "charge-1"]
                }
                tone={state.step >= 3 ? "failure" : "muted"}
                dashed={state.step >= 3}
              />
            )}
            <Label
              x={x}
              y={y + 332}
              size="title"
              tone={
                durable && state.durableProvisioned
                  ? "success"
                  : state.step >= 4 && !durable
                    ? "failure"
                    : "muted"
              }
            >
              {state.step >= 4
                ? durable
                  ? state.durableProvisioned
                    ? "✓ ORDER FULFILLED"
                    : "→ READY TO CONTINUE"
                  : "× ORDER STALLED"
                : "Inventory → Payment → Provision"}
            </Label>
          </g>
        );
      })}
    </SvgScene>
  );
}

export function WorkflowScene({ playback }: { playback: TemporalPlayback }) {
  const state = workflowSnapshot(playback.step);
  const compact = playback.compact;
  const coordinator = compact ? box(12, 20, 296, 146) : box(16, 80, 198, 300);
  const activities = compact
    ? [
        box(12, 246, 140, 104),
        box(168, 246, 140, 104),
        box(12, 404, 140, 104),
        box(168, 404, 140, 104),
      ]
    : [
        box(342, 28, 240, 78),
        box(342, 140, 240, 78),
        box(342, 252, 240, 78),
        box(342, 364, 240, 78),
      ];
  const activeIndex = state.activities.findIndex(
    (activity) => activity.state === "active",
  );
  const nextIndex = Math.floor(state.step / 2);
  const commands = [
    "await reserve()",
    "await charge()",
    "await provision()",
    "await confirm()",
  ];
  return (
    <SvgScene
      width={compact ? 320 : 600}
      height={compact ? 582 : 492}
      label="Workflow coordination schedules Activities. Each Activity performs an external operation and returns a recorded result before the next is scheduled."
    >
      {activities.map((activityBounds, index) => {
        const outgoing: readonly Point[] = compact
          ? index < 2
            ? route(coordinator, "bottom", activityBounds, "top", [
                [160, 208],
                [activityBounds.x + 70, 208],
              ])
            : route(
                coordinator,
                "bottom",
                activityBounds,
                index === 2 ? "left" : "right",
                [
                  [160, 190],
                  [index === 2 ? 2 : 318, 190],
                  [index === 2 ? 2 : 318, activityBounds.y + 52],
                ],
              )
          : route(coordinator, "right", activityBounds, "left", [
              [276, 230],
              [276, activityBounds.y + 39],
            ]);
        const returning = compact
          ? route(
              activityBounds,
              index % 2 === 0 ? "left" : "right",
              coordinator,
              "bottom",
              [
                [index % 2 === 0 ? 2 : 318, activityBounds.y + 52],
                [index % 2 === 0 ? 2 : 318, 550],
                [160, 550],
              ],
            )
          : route(activityBounds, "right", coordinator, "bottom", [
              [592, activityBounds.y + 39],
              [592, 458],
              [115, 458],
            ]);
        return (
          <g key={index}>
            <Wire
              points={outgoing}
              tone={
                nextIndex === index && state.step % 2 === 0 ? "active" : "muted"
              }
              packet={nextIndex === index && state.step % 2 === 0}
              playback={playback}
            />
            {activeIndex === index && (
              <Wire
                points={returning}
                tone="success"
                packet
                playback={playback}
              />
            )}
          </g>
        );
      })}
      <Node
        bounds={coordinator}
        title="WORKFLOW"
        tone={state.complete ? "success" : "active"}
        lines={
          compact
            ? [
                "Chooses the next operation",
                state.complete
                  ? "All results recorded"
                  : commands[Math.min(nextIndex, 3)],
                `${state.completed} / 4 recorded results`,
              ]
            : [
                "Coordination code",
                "",
                ...commands,
                "",
                `${state.completed} / 4 results stored`,
              ]
        }
      />
      {activities.map((bounds, index) => {
        const activity = state.activities[index];
        const names = ["Reserve", "Charge", "Provision", "Confirm"];
        const services = compact
          ? ["Stock API", "Payment API", "Account API", "Email API"]
          : [
              "Stock service",
              "Payment provider",
              "Account service",
              "Email provider",
            ];
        return (
          <Node
            key={activity.name}
            bounds={bounds}
            title={compact ? names[index] : activity.name}
            lines={[
              services[index],
              activity.state === "complete"
                ? "✓ Result stored"
                : activity.state === "active"
                  ? "Running"
                  : "Not scheduled",
            ]}
            tone={
              activity.state === "complete"
                ? "success"
                : activity.state === "active"
                  ? "active"
                  : "muted"
            }
          />
        );
      })}
      <Label x={compact ? 160 : 300} y={compact ? 578 : 489} align="middle">
        {activeIndex >= 0
          ? "Activity result → Workflow continues"
          : state.complete
            ? "Four effects, one coordinated process"
            : "Workflow command → Activity execution"}
      </Label>
    </SvgScene>
  );
}

export function TimerScene({ playback }: { playback: TemporalPlayback }) {
  const state = timerSnapshot(playback.step);
  const compact = playback.compact;
  const service = compact ? box(12, 110, 296, 144) : box(12, 110, 260, 160);
  const clockBounds = box(service.x + service.width / 2 - 34, 16, 68, 68);
  const worker = compact ? box(12, 494, 296, 100) : box(380, 140, 208, 100);
  const history = compact ? box(12, 328, 296, 110) : box(12, 344, 576, 110);
  const task = compact
    ? route(service, "left", worker, "left", [
        [2, 182],
        [2, 544],
      ])
    : route(service, "right", worker, "left");
  return (
    <SvgScene
      width={compact ? 320 : 600}
      height={compact ? 624 : 480}
      label="A durable 24-hour timer is owned by the Temporal Service. It can fire while the application Worker is offline. Application code resumes only after the Worker returns."
    >
      <Wire
        points={route(clockBounds, "bottom", service, "top")}
        tone="waiting"
        packet={state.step === 1}
        playback={playback}
      />
      <Wire
        points={route(service, "bottom", history, "top", [
          [service.x + service.width / 2, compact ? 290 : 308],
          [history.x + history.width / 2, compact ? 290 : 308],
        ])}
        tone="durable"
      />
      <Wire
        points={task}
        tone={
          state.resumed ? "success" : state.pendingTask ? "waiting" : "muted"
        }
        packet={state.step === 3}
        playback={playback}
        label={compact ? undefined : "Workflow Task"}
        labelAt={[326, 176]}
      />
      <g
        className={`temporal-clock temporal-tone-${state.inputRecorded ? "success" : "waiting"}`}
      >
        <circle cx={clockBounds.x + 34} cy={50} r={34} />
        <path
          d={`M${clockBounds.x + 34} 29 V50 L${clockBounds.x + (state.inputRecorded ? 51 : 15)} 50`}
        />
        <Label x={clockBounds.x + 82} y={43}>
          24-hour
        </Label>
        <Label x={clockBounds.x + 82} y={64}>
          deadline
        </Label>
      </g>
      <Node
        bounds={service}
        title="TEMPORAL SERVICE"
        tone="durable"
        lines={[
          "Timer is durable",
          state.inputRecorded
            ? "Deadline reached: event stored"
            : "Deadline has not fired",
          state.pendingTask
            ? "Workflow Task is pending"
            : state.resumed
              ? "Workflow Task processed"
              : "No resume task yet",
        ]}
      />
      <History
        bounds={history}
        entries={
          state.inputRecorded
            ? ["TimerStarted", "TimerFired · 24h elapsed"]
            : ["TimerStarted"]
        }
        highlight={state.inputRecorded}
      />
      <Node
        bounds={worker}
        title="APPLICATION WORKER"
        tone={
          state.workerOnline
            ? state.resumed
              ? "success"
              : "active"
            : "failure"
        }
        dashed={!state.workerOnline}
        lines={[
          state.workerOnline ? "Online" : "Offline",
          state.resumed ? "Code resumed" : "Code is suspended",
        ]}
      />
      <Label x={compact ? 24 : 300} y={compact ? 474 : 292} tone="waiting">
        {state.pendingTask
          ? "Event stored ≠ code running"
          : state.resumed
            ? "Worker polled the task"
            : "No thread held during wait"}
      </Label>
    </SvgScene>
  );
}

export function SignalScene({ playback }: { playback: TemporalPlayback }) {
  const state = signalSnapshot(playback.step);
  const compact = playback.compact;
  const reviewer = compact ? box(12, 16, 296, 90) : box(12, 44, 192, 90);
  const service = compact ? box(12, 178, 296, 130) : box(302, 44, 286, 190);
  const history = compact ? box(12, 374, 296, 110) : box(302, 314, 286, 110);
  const worker = compact ? box(12, 570, 296, 100) : box(12, 314, 192, 100);
  const inbound = compact
    ? route(reviewer, "bottom", service, "top")
    : route(reviewer, "right", service, "left", [
        [250, 89],
        [250, 139],
      ]);
  const task = compact
    ? route(service, "left", worker, "left", [
        [2, 243],
        [2, 620],
      ])
    : route(service, "left", worker, "right", [
        [250, 139],
        [250, 364],
      ]);
  return (
    <SvgScene
      width={compact ? 320 : 600}
      height={compact ? 694 : 470}
      label="A human sends approval through a Temporal Client. The Service durably records the Signal while the application Worker is offline. A returned Worker must process the message before Workflow code can continue."
    >
      <Wire
        points={inbound}
        tone="durable"
        packet={state.step === 1}
        playback={playback}
        label="approval Signal"
        labelAt={compact ? [216, 147] : [250, 24]}
      />
      <Wire
        points={route(service, "bottom", history, "top")}
        tone="durable"
        label="persist event"
        labelAt={compact ? [224, 345] : [445, 283]}
      />
      <Wire
        points={task}
        tone={
          state.resumed ? "success" : state.pendingTask ? "waiting" : "muted"
        }
        packet={state.step === 3}
        playback={playback}
      />
      <Node
        bounds={reviewer}
        title="HUMAN + CLIENT"
        lines={[state.inputRecorded ? "Approval sent" : "Approval pending"]}
        tone={state.inputRecorded ? "success" : "active"}
      />
      <Node
        bounds={service}
        title="TEMPORAL SERVICE"
        tone="durable"
        lines={[
          state.inputRecorded
            ? "Signal durably accepted"
            : "Waiting for approval",
          state.pendingTask
            ? "Workflow Task pending"
            : state.resumed
              ? "Workflow Task processed"
              : "No approval message yet",
        ]}
      />
      <History
        bounds={history}
        entries={
          state.inputRecorded
            ? ["Workflow waiting", "Approval Signal received"]
            : ["Workflow waiting"]
        }
        highlight={state.inputRecorded}
      />
      <Node
        bounds={worker}
        title={compact ? "APPLICATION WORKER" : "APP WORKER"}
        lines={[
          state.workerOnline ? "Online" : "Offline",
          state.resumed ? "Approval processed" : "Code still suspended",
        ]}
        tone={
          state.workerOnline
            ? state.resumed
              ? "success"
              : "active"
            : "failure"
        }
        dashed={!state.workerOnline}
      />
      <Label x={compact ? 24 : 12} y={compact ? 548 : 280}>
        {state.pendingTask
          ? "Accepted ≠ processed by code"
          : state.resumed
            ? "Worker processed the Signal"
            : "Waiting holds no Worker thread"}
      </Label>
      {!compact && (
        <Label x={12} y={453}>
          Signals are asynchronous messages to a running Workflow.
        </Label>
      )}
    </SvgScene>
  );
}

export function RetryScene({
  playback,
  outcome,
}: {
  playback: TemporalPlayback;
  outcome: RetryOutcome;
}) {
  const state = retrySnapshot(playback.step, outcome);
  const compact = playback.compact;
  const bounds = compact
    ? [box(12, 68, 296, 94), box(12, 230, 296, 94), box(12, 392, 296, 94)]
    : [box(12, 98, 168, 134), box(216, 98, 168, 134), box(420, 98, 168, 134)];
  return (
    <SvgScene
      width={compact ? 320 : 600}
      height={compact ? 560 : 300}
      label="Three total Activity attempts. A crash at 1 second is detected at the 5-second timeout, then a 1-second backoff allows attempt 2. Its timeout is followed by a 2-second backoff before attempt 3."
    >
      <Label x={compact ? 160 : 300} y={35} size="title" align="middle">
        ILLUSTRATIVE TIME · {state.time}s
      </Label>
      {[0, 1].map((index) => (
        <Wire
          key={index}
          points={route(
            bounds[index],
            compact ? "bottom" : "right",
            bounds[index + 1],
            compact ? "top" : "left",
          )}
          tone="waiting"
          packet={state.step === (index === 0 ? 2 : 5)}
          playback={playback}
          label={`${index + 1}s backoff`}
          labelAt={compact ? [232, 198 + index * 162] : [198 + index * 204, 84]}
        />
      ))}
      {state.attempts.map((attempt, index) => {
        const tone: Tone =
          attempt.state === "failed"
            ? "failure"
            : attempt.state === "complete"
              ? "success"
              : attempt.workerCrashed
                ? "waiting"
                : attempt.state === "active"
                  ? "active"
                  : "muted";
        const status =
          attempt.state === "pending"
            ? "Not started"
            : attempt.state === "failed"
              ? "Timed out"
              : attempt.state === "complete"
                ? "Succeeded"
                : attempt.workerCrashed
                  ? "No reply; timeout pending"
                  : "Activity running";
        return (
          <Node
            key={attempt.number}
            bounds={bounds[index]}
            title={`ATTEMPT ${attempt.number}`}
            tone={tone}
            lines={
              compact
                ? [`${attempt.start}s → ${attempt.end}s`, status]
                : [
                    `${attempt.start}s → ${attempt.end}s`,
                    attempt.workerCrashed ? "Worker crashed" : status,
                    attempt.workerCrashed
                      ? "Timeout pending"
                      : attempt.state === "failed"
                        ? "No result received"
                        : "",
                  ]
            }
          />
        );
      })}
      <Label x={compact ? 160 : 300} y={compact ? 516 : 274} align="middle">
        {compact
          ? state.complete
            ? outcome === "success"
              ? "✓ RESULT RECORDED"
              : "× LIMIT REACHED"
            : "Crash detection waits"
          : state.complete
            ? outcome === "success"
              ? "✓ RESULT RECORDED · WORKFLOW RESUMES"
              : "× LIMIT REACHED · HANDLE THE ERROR"
            : "Crash detection waits for an Activity timeout"}
      </Label>
      {compact && (
        <Label x={160} y={537} align="middle">
          {state.complete
            ? outcome === "success"
              ? "Workflow resumes"
              : "Handle the error"
            : "for an Activity timeout"}
        </Label>
      )}
    </SvgScene>
  );
}

export function IdempotencyScene({ playback }: { playback: TemporalPlayback }) {
  const state = idempotencySnapshot(playback.step);
  const compact = playback.compact;
  const laneWidth = compact ? 136 : 276;
  return (
    <SvgScene
      width={compact ? 320 : 600}
      height={570}
      label="The payment succeeds before a Worker crash. Retrying with a stable idempotency key returns charge-1; retrying without a key creates charge-2. Both Activities record one result, but their external effects differ."
    >
      {state.lanes.map((lane, index) => {
        const x = compact ? 12 + index * 156 : 12 + index * 300;
        const worker = box(x, 46, laneWidth, 84);
        const provider = box(x, 208, laneWidth, 188);
        const service = box(x, 474, laneWidth, 84);
        const forward = route(worker, "bottom", provider, "top");
        const outer = index === 0 ? x - 10 : x + laneWidth + 10;
        const report = route(
          worker,
          index === 0 ? "left" : "right",
          service,
          index === 0 ? "left" : "right",
          [
            [outer, 88],
            [outer, 516],
          ],
        );
        const duplicate = lane.ledger.charges.length > 1;
        return (
          <g key={lane.mode}>
            <Label x={x} y={24} size="title">
              {index === 0 ? "STABLE KEY" : "NO KEY"}
            </Label>
            <Wire
              points={forward}
              tone={state.step === 3 ? "active" : "muted"}
              packet={state.step === 0 || state.step === 3}
              playback={playback}
              label={
                compact
                  ? index === 0
                    ? "key:1042"
                    : "no key"
                  : index === 0
                    ? "order-1042:charge"
                    : "No deduplication key"
              }
              labelAt={[x + laneWidth / 2, 175]}
            />
            <Wire
              points={report}
              tone={
                lane.recordedResult
                  ? "success"
                  : state.step >= 2 && state.step < 4
                    ? "failure"
                    : "durable"
              }
              packet={state.step === 4}
              playback={playback}
            />
            <Node
              bounds={worker}
              title={compact ? "WORKER" : "APPLICATION WORKER"}
              lines={[
                state.step === 2
                  ? "Crashed"
                  : state.step === 3
                    ? "Retrying"
                    : state.step >= 4
                      ? "Result returned"
                      : "Running",
              ]}
              tone={state.step === 2 ? "failure" : "active"}
              dashed={state.step === 2}
            />
            <Node
              bounds={provider}
              title={compact ? "PAYMENT API" : "PAYMENT PROVIDER"}
              tone={
                duplicate
                  ? "failure"
                  : lane.ledger.charges.length
                    ? "success"
                    : "muted"
              }
            >
              <Label x={x + 12} y={262} size="small">
                PROVIDER LEDGER
              </Label>
              {lane.ledger.charges.length ? (
                lane.ledger.charges.map((charge, chargeIndex) => (
                  <g
                    key={charge}
                    className={`temporal-charge temporal-tone-${chargeIndex ? "failure" : "success"}`}
                  >
                    <rect
                      x={x + 12}
                      y={278 + chargeIndex * 34}
                      width={laneWidth - 24}
                      height={26}
                      rx={2}
                    />
                    <Label x={x + 22} y={296 + chargeIndex * 34}>
                      {charge}
                    </Label>
                  </g>
                ))
              ) : (
                <Label x={x + 12} y={296}>
                  No charge yet
                </Label>
              )}
              <Label x={x + 12} y={377} size="title">
                {duplicate
                  ? "2 charges!"
                  : `${lane.ledger.charges.length} charge${lane.ledger.charges.length === 1 ? "" : "s"}`}
              </Label>
            </Node>
            <Node
              bounds={service}
              title={compact ? "RESULT" : "SERVICE RESULT"}
              lines={[lane.recordedResult ?? "Not recorded"]}
              tone={
                lane.recordedResult
                  ? "durable"
                  : state.step === 2
                    ? "failure"
                    : "muted"
              }
            />
          </g>
        );
      })}
    </SvgScene>
  );
}
