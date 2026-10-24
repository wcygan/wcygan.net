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
  playback,
  statusTitle,
  children,
  options,
  facts,
}: {
  title: string;

  playback: TemporalPlayback;
  statusTitle: string;

  children: ReactNode;
  options?: ReactNode;
  facts?: ReactNode;
}) {
  const titleId = useId();

  return (
    <figure
      ref={playback.ref}
      className="temporal-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      data-graphic-label={title}
      aria-labelledby={titleId}
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

      <div
        className="temporal-demo-status"
        role="status"
        aria-live={playback.playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <p className="temporal-demo-status-title">{statusTitle}</p>
      </div>
    </figure>
  );
}

export function TemporalRecoveryDemo() {
  const playback = useTemporalPlayback(RECOVERY_LAST_STEP);
  const state = recoverySnapshot(playback.step);
  return (
    <Figure
      title="A crash between order steps"
      playback={playback}
      statusTitle={state.title}
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
      playback={playback}
      statusTitle={state.title}
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
      playback={playback}
      statusTitle={state.title}
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
      playback={playback}
      statusTitle={state.title}
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
      playback={playback}
      statusTitle={state.title}
      options={options}
      facts={facts}
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
      playback={playback}
      statusTitle={state.title}
    >
      <IdempotencyScene playback={playback} />
    </Figure>
  );
}
