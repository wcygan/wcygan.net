import "~/demos/distributed-transactions/styles.css";
import { Component, Fragment, lazy, type ReactNode, Suspense } from "react";
import { DEMOS } from "~/demos/distributed-transactions/model";
import { useTransactionPlayback } from "~/demos/distributed-transactions/useTransactionPlayback";
import { StateHighlight } from "~/demos/distributed-transactions/StateHighlight";
import type { DemoKind, Message } from "~/demos/distributed-transactions/types";
import { DemoSceneLoading } from "./DemoSceneLoading";
import { DemoWorkbench } from "./DemoWorkbench";

const Scene = lazy(() => import("~/demos/distributed-transactions/Scene"));
const EMPTY_MESSAGES: Message[] = [];

class SceneBoundary extends Component<
  { children: ReactNode; onFailed: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailed();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function DistributedTransactionDemo({
  kind,
  showLedger = true,
}: {
  kind: DemoKind;
  showLedger?: boolean;
}) {
  const definition = DEMOS[kind];
  const {
    scenarioId,
    scenario,
    step,
    intent,
    moving,
    reduced,
    loaded,
    unavailable,
    viewReset,
    stage,
    timer,
    progress,
    onReady,
    onUnavailable,
    frame,
    next,
    done,
    active,
    pending,
    wantsMotion,
    reset,
    advance,
    togglePlayback,
    resetView,
  } = useTransactionPlayback(definition);

  return (
    <DemoWorkbench.Root
      title={definition.title}
      className="dt-demo"
      data-graphic-key={`distributed-${kind}`}
      data-graphic-kind="canvas"
      data-demo={kind}
      data-layout={frame.layout}
      data-step={step}
      data-moving={moving}
      data-playback={reduced ? "reduced" : done ? "complete" : intent}
    >
      <DemoWorkbench.Header>
        <p className="demo-workbench-description">{scenario.description}</p>
      </DemoWorkbench.Header>
      {definition.scenarios.length > 1 && (
        <DemoWorkbench.Options
          options={definition.scenarios}
          value={scenarioId}
          onChange={reset}
        />
      )}
      <DemoWorkbench.Stage
        ref={stage}
        state={unavailable ? "unavailable" : pending ? "loading" : "ready"}
      >
        <div className="dt-canvas" aria-hidden="true">
          {pending && <DemoSceneLoading />}
          {unavailable ? (
            <p className="dt-fallback">
              3D is unavailable. Follow the transaction progress below.
            </p>
          ) : (
            loaded && (
              <SceneBoundary onFailed={onUnavailable}>
                <Suspense fallback={null}>
                  <Scene
                    sceneId={`distributed-transactions:${kind}`}
                    frame={frame}
                    nextFrame={next}
                    messages={moving && next ? next.messages : EMPTY_MESSAGES}
                    progress={progress}
                    moving={moving}
                    active={active}
                    reduced={reduced}
                    viewReset={viewReset}
                    onReady={onReady}
                    onUnavailable={onUnavailable}
                  />
                </Suspense>
              </SceneBoundary>
            )
          )}
        </div>
      </DemoWorkbench.Stage>
      <DemoWorkbench.Controls
        step={{
          label: frame.recoveryAction ?? "Step",
          disabled: pending || done || (moving && intent !== "paused"),
          onClick: advance,
        }}
        playback={{
          label: wantsMotion ? "Pause" : "Play",
          disabled: reduced || done,
          onClick: togglePlayback,
        }}
        replay={{ onClick: () => reset() }}
        resetView={{ disabled: pending || unavailable, onClick: resetView }}
      />
      <DemoWorkbench.Guide>
        {unavailable
          ? showLedger
            ? "3D is unavailable; the controls and account state remain usable"
            : "3D is unavailable; the controls and transaction progress remain usable"
          : "Drag to orbit · Scroll to zoom · Focus the view for arrow keys, +/− and Home"}
        {reduced && ". Reduced motion: Step advances without animation."}
      </DemoWorkbench.Guide>
      <DemoWorkbench.Step
        live={intent === "auto" && !done && !reduced ? "off" : "polite"}
      >
        <DemoWorkbench.Timer ref={timer} />
        <DemoWorkbench.StepTitle
          number={step + 1}
          total={scenario.frames.length}
        >
          {frame.title}
        </DemoWorkbench.StepTitle>
        <p>{frame.status}</p>
        {frame.recoveryAction && (
          <p className="dt-messages">Next: {frame.recoveryAction}.</p>
        )}
        {frame.messages.length > 0 && (
          <p className="dt-messages">
            Delivered:{" "}
            {[...new Set(frame.messages.map((message) => message.label))].map(
              (label, index) => (
                <Fragment key={label}>
                  {index > 0 && " · "}
                  <StateHighlight>{label}</StateHighlight>
                </Fragment>
              ),
            )}
          </p>
        )}
      </DemoWorkbench.Step>
      {showLedger && (
        <dl className="dt-accounts" aria-label="Account state">
          {frame.accounts.map((account, index) => (
            <div key={index}>
              <dt>Account {index === 0 ? "A" : "B"}</dt>
              <dd className="dt-balance">
                ${account.balance}
                {account.pending !== 0 && (
                  <span>
                    {" "}
                    · <StateHighlight>pending</StateHighlight>{" "}
                    {account.pending > 0 ? "+" : "−"}$
                    {Math.abs(account.pending)}
                  </span>
                )}
              </dd>
              <dd data-state={account.state}>
                <StateHighlight>{account.state}</StateHighlight>
                {account.locked ? " · lock held" : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {showLedger && (
        <details className="dt-records">
          <summary>Inspect durable records</summary>
          <dl>
            {frame.coordinator.visible && (
              <div>
                <dt>
                  Coordinator
                  {!frame.coordinator.online && (
                    <>
                      {" "}
                      (<StateHighlight>unreachable</StateHighlight>)
                    </>
                  )}
                </dt>
                <dd>
                  <StateHighlight>
                    {frame.coordinator.record ?? "No decision recorded"}
                  </StateHighlight>
                </dd>
              </div>
            )}
            {frame.accounts.map((account, index) => (
              <div key={index}>
                <dt>Shard {index === 0 ? "A" : "B"}</dt>
                <dd>
                  {account.records.length
                    ? account.records.map((record, index) => (
                        <Fragment key={index}>
                          {index > 0 && " → "}
                          <StateHighlight>{record}</StateHighlight>
                        </Fragment>
                      ))
                    : "No transaction record"}
                </dd>
              </div>
            ))}
            {frame.replicas.map((replica) => (
              <div key={replica.id}>
                <dt>
                  {replica.id.toUpperCase()}
                  {replica.leader ? " · leader" : ""}
                  {!replica.online && (
                    <>
                      {" "}
                      · <StateHighlight>offline</StateHighlight>
                    </>
                  )}
                </dt>
                <dd>
                  <StateHighlight>
                    {replica.record ?? "No transaction record"}
                  </StateHighlight>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </DemoWorkbench.Root>
  );
}
