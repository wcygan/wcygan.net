import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  use,
  useId,
} from "react";

const WorkbenchContext = createContext<{
  title: string;
  titleId: string;
} | null>(null);

function useWorkbench() {
  const value = use(WorkbenchContext);
  if (!value) throw new Error("DemoWorkbench parts require DemoWorkbench.Root");
  return value;
}

function Root({
  title,
  className,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"figure">, "title"> & { title: string }) {
  const titleId = useId();
  return (
    <WorkbenchContext value={{ title, titleId }}>
      <figure
        {...props}
        className={["demo-workbench", className].filter(Boolean).join(" ")}
        data-graphic-frame="workbench"
        aria-labelledby={titleId}
      >
        {children}
      </figure>
    </WorkbenchContext>
  );
}

function Header() {
  const { title, titleId } = useWorkbench();
  return (
    <header className="demo-workbench-header">
      <p id={titleId} className="article-graphic-title">
        {title}
      </p>
    </header>
  );
}

function Options({
  options,
  value,
  onChange,
}: {
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { title } = useWorkbench();
  return (
    <div
      className="demo-workbench-options"
      role="group"
      aria-label={`${title} scenario`}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          data-scenario={option.id}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Stage({
  ref,
  state,
  children,
}: {
  ref?: Ref<HTMLDivElement>;
  state: "loading" | "ready" | "unavailable";
  children: ReactNode;
}) {
  const { title } = useWorkbench();
  return (
    <div
      ref={ref}
      className="demo-workbench-stage"
      data-graphic-stage="flush"
      data-scene-loading={state === "loading"}
      tabIndex={state === "unavailable" ? -1 : 0}
      role="group"
      aria-label={`${title}: 3D view`}
    >
      {children}
    </div>
  );
}

interface ControlAction {
  onClick: () => void;
  disabled?: boolean;
}

function Controls({
  step,
  playback,
  replay,
  resetView,
}: {
  step: ControlAction & { label: string };
  playback: ControlAction & { label: "Play" | "Pause" };
  replay: ControlAction;
  resetView: ControlAction;
}) {
  return (
    <div className="demo-workbench-controls">
      <button type="button" disabled={step.disabled} onClick={step.onClick}>
        {step.label}
      </button>
      <button
        type="button"
        disabled={playback.disabled}
        onClick={playback.onClick}
      >
        {playback.label}
      </button>
      <button type="button" {...replay}>
        Replay
      </button>
      <button type="button" {...resetView}>
        Reset view
      </button>
    </div>
  );
}

function Step({
  live,
  children,
}: {
  live: "off" | "polite";
  children: ReactNode;
}) {
  return (
    <div
      className="demo-workbench-status"
      role="status"
      aria-live={live}
      aria-atomic="true"
    >
      {children}
    </div>
  );
}

function StepTitle({
  number,
  total,
  children,
}: {
  number: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <p className="demo-workbench-step">
      <span>
        {number} / {total}
      </span>{" "}
      {children}
    </p>
  );
}

/** The playback clock updates this ref without rerendering the scene or shell. */
function Timer({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div className="demo-workbench-timer" aria-hidden="true">
      <div ref={ref} className="demo-workbench-timer-remaining" />
    </div>
  );
}

/** Presentation only: each demo owns its model, playback, loading, and scene. */
export const DemoWorkbench = {
  Root,
  Header,
  Options,
  Stage,
  Controls,
  Step,
  StepTitle,
  Timer,
};
