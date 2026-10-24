// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installCodeCopy } from "./code-copy";

const cleanups: (() => void)[] = [];

function codeBlock() {
  const block = document.createElement("pre");
  block.className = "shiki";
  block.innerHTML = `<code><span class="line">const greeting = &quot;hello&quot;;</span>\n<span class="line">console.log(greeting);</span>\n</code><button type="button" data-code-copy data-copy-state="idle" aria-label="Copy code" aria-live="polite">Copy</button>`;
  document.body.append(block);
  const button = block.querySelector("button");
  if (!button) throw new Error("Expected the code-copy button");
  return button;
}

function useClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

function install() {
  const cleanup = installCodeCopy();
  cleanups.push(cleanup);
  return cleanup;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.replaceChildren();
  Reflect.deleteProperty(navigator, "clipboard");
  vi.useRealTimers();
});

describe("article code copy", () => {
  it("copies exact code from a dynamically loaded block and announces success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    useClipboard(writeText);
    install();
    const button = codeBlock();

    button.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      'const greeting = "hello";\nconsole.log(greeting);\n',
    );
    expect(button.textContent).toBe("Copied");
    expect(button.getAttribute("aria-label")).toBe("Code copied");
    expect(button.dataset.copyState).toBe("copied");

    vi.advanceTimersByTime(2000);

    expect(button.textContent).toBe("Copy");
    expect(button.getAttribute("aria-label")).toBe("Copy code");
    expect(button.dataset.copyState).toBe("idle");
  });

  it("waits for the clipboard before reporting that code was copied", async () => {
    const pending = Promise.withResolvers<void>();
    const writeText = vi.fn(() => pending.promise);
    useClipboard(writeText);
    install();
    const button = codeBlock();

    button.click();
    button.click();

    expect(button.textContent).toBe("Copying…");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(writeText.mock.calls).toEqual([
      ['const greeting = "hello";\nconsole.log(greeting);\n'],
    ]);

    pending.resolve();
    await pending.promise;

    expect(button.textContent).toBe("Copied");
    expect(button.getAttribute("aria-busy")).toBe("false");
  });

  it("keeps a failed copy visible and lets the reader retry", async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error("Denied"));
    useClipboard(writeText);
    install();
    const button = codeBlock();

    button.click();
    await Promise.resolve();
    vi.advanceTimersByTime(5000);

    expect(button.textContent).toBe("Copy failed — retry");
    expect(button.getAttribute("aria-label")).toBe(
      "Copy failed. Retry copying code",
    );
    expect(button.dataset.copyState).toBe("error");

    writeText.mockResolvedValueOnce(undefined);
    button.click();
    await Promise.resolve();

    expect(button.textContent).toBe("Copied");
    expect(writeText.mock.calls).toEqual([
      ['const greeting = "hello";\nconsole.log(greeting);\n'],
      ['const greeting = "hello";\nconsole.log(greeting);\n'],
    ]);
  });

  it("offers a retry when the Clipboard API is unavailable", async () => {
    install();
    const button = codeBlock();

    button.click();

    expect(button.textContent).toBe("Copy failed — retry");
    expect(button.dataset.copyState).toBe("error");

    useClipboard(vi.fn().mockResolvedValue(undefined));
    button.click();
    await Promise.resolve();

    expect(button.textContent).toBe("Copied");
  });

  it("cleans up pending copies, timers, and the document listener", async () => {
    const pending = Promise.withResolvers<void>();
    useClipboard(() => pending.promise);
    const cleanupPending = install();
    const button = codeBlock();

    button.click();
    expect(button.textContent).toBe("Copying…");
    cleanupPending();
    pending.resolve();
    await pending.promise;
    expect(button.textContent).toBe("Copy");

    useClipboard(vi.fn().mockResolvedValue(undefined));
    const cleanupCopied = install();
    button.click();
    await Promise.resolve();
    expect(button.textContent).toBe("Copied");
    cleanupCopied();
    button.textContent = "Uninstalled";
    vi.advanceTimersByTime(2000);
    button.click();
    await Promise.resolve();

    expect(button.textContent).toBe("Uninstalled");
    expect(button.dataset.copyState).toBe("idle");
  });
});
