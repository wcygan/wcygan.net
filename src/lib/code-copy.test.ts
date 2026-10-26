// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installCodeCopy } from "./code-copy";

const cleanups: (() => void)[] = [];

function codeBlock() {
  const block = document.createElement("pre");
  block.className = "shiki";
  block.innerHTML = `<code><span class="line">const greeting = &quot;hello&quot;;</span>\n<span class="line">console.log(greeting);</span>\n</code><button type="button" data-code-copy data-copy-state="idle" data-copy-label="idle" aria-label="Copy code"><span class="code-copy-label" data-label="idle" aria-hidden="true">Copy</span><span class="code-copy-label" data-label="copied" aria-hidden="true">Copied</span><span class="code-copy-label" data-label="error" aria-hidden="true">Retry copy</span></button><span class="sr-only" data-code-copy-status role="status" aria-live="polite" aria-atomic="true"></span>`;
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
    const labels = [...button.children];
    const status = document.querySelector("[data-code-copy-status]")!;
    expect(status.textContent).toBe("");

    button.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      'const greeting = "hello";\nconsole.log(greeting);\n',
    );
    expect(button.dataset.copyLabel).toBe("copied");
    for (const [index, label] of labels.entries())
      expect(button.children[index]).toBe(label);
    expect(button.getAttribute("aria-label")).toBe("Code copied");
    expect(button.dataset.copyState).toBe("copied");
    expect(status.textContent).toBe("Code copied");
    expect(document.querySelector("[data-code-copy-status]")).toBe(status);

    vi.advanceTimersByTime(2000);

    expect(button.dataset.copyLabel).toBe("idle");
    for (const [index, label] of labels.entries())
      expect(button.children[index]).toBe(label);
    expect(button.getAttribute("aria-label")).toBe("Copy code");
    expect(button.dataset.copyState).toBe("idle");
    expect(status.textContent).toBe("");
  });

  it("waits for the clipboard before reporting that code was copied", async () => {
    const pending = Promise.withResolvers<void>();
    const writeText = vi.fn(() => pending.promise);
    useClipboard(writeText);
    install();
    const button = codeBlock();

    button.click();
    button.click();

    expect(button.dataset.copyLabel).toBe("idle");
    expect(button.dataset.copyState).toBe("copying");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(writeText.mock.calls).toEqual([
      ['const greeting = "hello";\nconsole.log(greeting);\n'],
    ]);

    pending.resolve();
    await pending.promise;

    expect(button.dataset.copyLabel).toBe("copied");
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

    expect(button.dataset.copyLabel).toBe("error");
    expect(button.getAttribute("aria-label")).toBe(
      "Copy failed. Retry copying code",
    );
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "Copy failed. Retry copying code",
    );
    expect(button.dataset.copyState).toBe("error");

    writeText.mockResolvedValueOnce(undefined);
    button.click();
    await Promise.resolve();

    expect(button.dataset.copyLabel).toBe("copied");
    expect(writeText.mock.calls).toEqual([
      ['const greeting = "hello";\nconsole.log(greeting);\n'],
      ['const greeting = "hello";\nconsole.log(greeting);\n'],
    ]);
  });

  it("keeps the previous result visible while another copy is pending", async () => {
    const pending = Promise.withResolvers<void>();
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(pending.promise);
    useClipboard(writeText);
    install();
    const button = codeBlock();

    button.click();
    await Promise.resolve();
    expect(button.dataset.copyLabel).toBe("copied");
    button.click();
    expect(button.dataset.copyState).toBe("copying");
    expect(button.dataset.copyLabel).toBe("copied");
    expect(document.querySelector('[role="status"]')?.textContent).toBe("");
    vi.advanceTimersByTime(5000);
    expect(button.dataset.copyLabel).toBe("copied");

    pending.resolve();
    await pending.promise;
    expect(button.getAttribute("aria-label")).toBe("Code copied");
    expect(button.dataset.copyLabel).toBe("copied");
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "Code copied",
    );
  });

  it("offers a retry when the Clipboard API is unavailable", async () => {
    install();
    const button = codeBlock();

    button.click();

    expect(button.dataset.copyLabel).toBe("error");
    expect(button.dataset.copyState).toBe("error");

    useClipboard(vi.fn().mockResolvedValue(undefined));
    button.click();
    await Promise.resolve();

    expect(button.dataset.copyLabel).toBe("copied");
  });

  it("cleans up pending copies, timers, and the document listener", async () => {
    const pending = Promise.withResolvers<void>();
    useClipboard(() => pending.promise);
    const cleanupPending = install();
    const button = codeBlock();

    button.click();
    expect(button.dataset.copyLabel).toBe("idle");
    expect(button.dataset.copyState).toBe("copying");
    cleanupPending();
    pending.resolve();
    await pending.promise;
    expect(button.dataset.copyLabel).toBe("idle");

    useClipboard(vi.fn().mockResolvedValue(undefined));
    const cleanupCopied = install();
    button.click();
    await Promise.resolve();
    expect(button.dataset.copyLabel).toBe("copied");
    cleanupCopied();
    button.textContent = "Uninstalled";
    vi.advanceTimersByTime(2000);
    button.click();
    await Promise.resolve();

    expect(button.textContent).toBe("Uninstalled");
    expect(button.dataset.copyState).toBe("idle");
  });
});
