type CopyState = "idle" | "copying" | "copied" | "error";

const copyLabels: Record<CopyState, { text: string; accessible: string }> = {
  idle: { text: "Copy", accessible: "Copy code" },
  copying: { text: "Copying…", accessible: "Copying code" },
  copied: { text: "Copied", accessible: "Code copied" },
  error: {
    text: "Copy failed — retry",
    accessible: "Copy failed. Retry copying code",
  },
};

function setCopyState(button: HTMLButtonElement, state: CopyState) {
  button.textContent = copyLabels[state].text;
  button.setAttribute("aria-label", copyLabels[state].accessible);
  button.dataset.copyState = state;
  button.setAttribute("aria-busy", String(state === "copying"));
}

export function installCodeCopy(root: Document = document): () => void {
  const timers = new Map<
    HTMLButtonElement,
    ReturnType<typeof setTimeout> | undefined
  >();
  let active = true;

  const copyCode = async (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".shiki button[data-code-copy]");
    if (!(button instanceof HTMLButtonElement)) return;
    const code = button.closest(".shiki")?.querySelector("code");
    if (!code || button.dataset.copyState === "copying") return;

    clearTimeout(timers.get(button));
    timers.set(button, undefined);
    setCopyState(button, "copying");

    try {
      const clipboard = root.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error("Clipboard unavailable");
      await clipboard.writeText(code.textContent ?? "");
      if (!active) return;

      setCopyState(button, "copied");
      timers.set(
        button,
        setTimeout(() => {
          setCopyState(button, "idle");
          timers.delete(button);
        }, 2000),
      );
    } catch {
      if (active) setCopyState(button, "error");
    }
  };

  root.addEventListener("click", copyCode);

  return () => {
    active = false;
    root.removeEventListener("click", copyCode);
    for (const [button, timer] of timers) {
      clearTimeout(timer);
      setCopyState(button, "idle");
    }
    timers.clear();
  };
}
