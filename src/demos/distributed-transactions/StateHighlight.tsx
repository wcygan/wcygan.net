/** Commands and their applied results stay visually distinct across every demo. */
const STATES: Record<string, string> = {
  pending: "pending",
  "collecting votes": "collecting-votes",
  prepare: "prepare",
  prepared: "prepare",
  yes: "prepare",
  "pre-commit": "pre-commit",
  ack: "pre-commit",
  commit: "commit",
  committed: "committed",
  abort: "abort",
  aborted: "aborted",
  no: "abort",
  unreachable: "unavailable",
  offline: "unavailable",
  isolated: "unavailable",
};

export function StateHighlight({ children }: { children: string }) {
  const state = STATES[children.toLowerCase()];
  return state ? (
    <span className="dt-state-highlight" data-state={state}>
      {children}
    </span>
  ) : (
    <>{children}</>
  );
}
