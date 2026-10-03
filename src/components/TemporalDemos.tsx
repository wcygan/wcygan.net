import { type ReactNode, useId, useState } from "react";
import {
  IDEMPOTENCY_LAST_STEP,
  RECOVERY_LAST_STEP,
  WAITING_LAST_STEP,
  type RetryOutcome,
  idempotencySnapshot,
  recoverySnapshot,
  retrySnapshot,
  signalSnapshot,
  timerSnapshot,
  workflowSnapshot,
} from "~/demos/temporal-2d/model";
import {
  useTemporalPlayback,
  type TemporalPlayback,
} from "~/demos/temporal-2d/playback";
import {
  IdempotencyScene,
  RecoveryScene,
  RetryScene,
  SignalScene,
  TimerScene,
  WorkflowScene,
} from "~/demos/temporal-2d/Scenes";
import "~/demos/temporal-palette.css";
import "~/demos/temporal-2d/styles.css";

function Figure({
  title,
  intro,
  playback,
  statusTitle,
  detail,
  caption,
  children,
  options,
  facts,
}: {
  title: string;
  intro: string;
  playback: TemporalPlayback;
  statusTitle: string;
  detail: string;
  caption: string;
  children: ReactNode;
  options?: ReactNode;
  facts?: ReactNode;
}) {
  const titleId = useId();
  const captionId = useId();
  return (
    <figure
      ref={playback.ref}
      className="temporal-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      data-graphic-label={title}
      aria-labelledby={titleId}
      aria-describedby={captionId}
      data-playback={
        playback.reduced
          ? "reduced"
          : playback.playing && !playback.complete
            ? "playing"
            : "paused"
      }
    >
      <header className="temporal-demo-header">
        <p className="article-graphic-title" id={titleId}>
          {title}
        </p>
        <p className="temporal-demo-intro">{intro}</p>
      </header>
      {options}
      {facts}
      <div className="temporal-demo-stage" data-graphic-stage="padded">
        {children}
      </div>
      <div
        className="temporal-demo-controls"
        role="group"
        aria-label={`${title} controls`}
      >
        <button
          type="button"
          onClick={playback.next}
          disabled={playback.complete}
        >
          Next step
        </button>
        <button
          type="button"
          onClick={playback.toggle}
          disabled={playback.reduced || playback.complete}
        >
          {playback.playing && !playback.complete ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={playback.replay}>
          Replay
        </button>
        <span className="temporal-demo-count">
          {playback.step} / {playback.last}
        </span>
      </div>
      {playback.reduced && (
        <p className="temporal-demo-motion-note">
          Reduced motion: use Next step to inspect the same sequence.
        </p>
      )}
      <div
        className="temporal-demo-status"
        role="status"
        aria-live={playback.playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <p className="temporal-demo-status-title">{statusTitle}</p>
        <p>{detail}</p>
      </div>
      <figcaption id={captionId}>{caption}</figcaption>
    </figure>
  );
}

export function TemporalRecoveryDemo() {
  const playback = useTemporalPlayback(RECOVERY_LAST_STEP);
  const state = recoverySnapshot(playback.step);
  return (
    <Figure
      title="A crash between order steps"
      intro="Follow an order through completed work and a process crash. Which progress survives?"
      playback={playback}
      statusTitle={state.title}
      detail={state.detail}
      caption="Conceptual comparison: completed Activity results were recorded before the crash. The memory-only example has no other recovery store. Temporal preserves progress; it does not make already performed external effects disappear."
    >
      <RecoveryScene playback={playback} />
    </Figure>
  );
}

export function TemporalWorkflowDemo() {
  const playback = useTemporalPlayback(8);
  const state = workflowSnapshot(playback.step);
  return (
    <Figure
      title="Workflow and Activities"
      intro="Workflow code coordinates the order. Activities execute the external operations."
      playback={playback}
      statusTitle={state.title}
      detail={state.detail}
      caption="Conceptual simulation of one sequential Workflow. Orange commands schedule Activities; green results permit the next step. Activities run on your Workers. The task loop and Event History are simplified."
    >
      <WorkflowScene playback={playback} />
    </Figure>
  );
}

export function TemporalTimerDemo() {
  const playback = useTemporalPlayback(WAITING_LAST_STEP);
  const state = timerSnapshot(playback.step);
  return (
    <Figure
      title="A durable timer"
      intro="A 24-hour wait belongs to the Service. No application Worker thread stays occupied."
      playback={playback}
      statusTitle={state.title}
      detail={state.detail}
      caption="Conceptual timeline with time compressed into steps. The Service remains available while the application Worker is offline. Timer expiry is durable; application code resumes only when a Worker processes the pending task. Selected events, not complete history."
    >
      <TimerScene playback={playback} />
    </Figure>
  );
}

export function TemporalSignalDemo() {
  const playback = useTemporalPlayback(WAITING_LAST_STEP);
  const state = signalSnapshot(playback.step);
  return (
    <Figure
      title="Approval by Signal"
      intro="Human approval can arrive while your Workers are offline. Acceptance and application processing are separate."
      playback={playback}
      statusTitle={state.title}
      detail={state.detail}
      caption="Conceptual Signal example. A Client sends approval; the Service records it and schedules work. A successful Signal request does not mean the Workflow has processed the message. The Worker must return and handle it."
    >
      <SignalScene playback={playback} />
    </Figure>
  );
}

export function TemporalRetryDemo() {
  const [outcome, setOutcome] = useState<RetryOutcome>("success");
  const playback = useTemporalPlayback(7);
  const state = retrySnapshot(playback.step, outcome);
  const options = (
    <div
      className="temporal-demo-options"
      role="group"
      aria-label="Retry outcome"
    >
      {(
        [
          { value: "success", label: "Third attempt succeeds" },
          { value: "exhausted", label: "All attempts time out" },
        ] as const
      ).map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={outcome === option.value}
          onClick={() => {
            setOutcome(option.value);
            playback.replay();
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
  const facts = (
    <dl className="temporal-demo-facts">
      <div>
        <dt>Start-To-Close</dt>
        <dd>5s</dd>
      </div>
      <div>
        <dt>Initial backoff</dt>
        <dd>1s</dd>
      </div>
      <div>
        <dt>Coefficient</dt>
        <dd>×2</dd>
      </div>
      <div>
        <dt>Maximum Attempts</dt>
        <dd>3 total</dd>
      </div>
    </dl>
  );
  return (
    <Figure
      title="Timeout, backoff, retry"
      intro="A Worker crash produces no result. The Service waits for a timeout before scheduling the next attempt."
      playback={playback}
      statusTitle={state.title}
      detail={state.detail}
      options={options}
      facts={facts}
      caption="Illustrative policy with immediate task dispatch and no heartbeats. Three means three total attempts. This is an attempt timeline, not Event History: intermediate Activity retries can be omitted from history."
    >
      <RetryScene playback={playback} outcome={outcome} />
    </Figure>
  );
}

export function TemporalIdempotencyDemo() {
  const playback = useTemporalPlayback(IDEMPOTENCY_LAST_STEP);
  const state = idempotencySnapshot(playback.step);
  return (
    <Figure
      title="One payment, two attempts"
      intro="The provider charges the card, then the Worker crashes before reporting completion. A retry follows."
      playback={playback}
      statusTitle={state.title}
      detail={state.detail}
      caption="Conceptual provider that honors idempotency keys. Both attempts use the same order-1042:charge key on the left. The provider returns its first charge; without a key it creates another. Provider key scope and retention must fit your process."
    >
      <IdempotencyScene playback={playback} />
    </Figure>
  );
}
