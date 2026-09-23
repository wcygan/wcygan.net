import { afterEach, describe, expect, it, vi } from "vitest";
import { postReloadPlugin } from "../../../scripts/post-reload-plugin";

function setup() {
  const plugin = postReloadPlugin();
  if (typeof plugin.configResolved !== "function")
    throw new Error("Missing config hook");
  plugin.configResolved.call({} as never, { root: "/project" } as never);
  const hook = plugin.hotUpdate;
  if (!hook || typeof hook === "function")
    throw new Error("Missing update hook");
  const send = vi.fn();
  const restart = vi.fn();
  const invalidateAll = vi.fn();
  const update = (
    environment: string,
    file = "/project/src/posts/example.draft.mdx",
  ) =>
    hook.handler.call(
      {
        environment: { name: environment, moduleGraph: { invalidateAll } },
      } as never,
      { file, server: { ws: { send }, restart } } as never,
    );
  return { update, send, restart, invalidateAll };
}

afterEach(() => vi.useRealTimers());

describe("post reload", () => {
  it("coalesces saves into one browser reload without interrupting the HTTP server", () => {
    vi.useFakeTimers();
    const { update, send, restart, invalidateAll } = setup();
    expect(update("client")).toEqual([]);
    vi.advanceTimersByTime(200);
    update("client");
    vi.advanceTimersByTime(200);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: "full-reload" });
    expect(invalidateAll).toHaveBeenCalledTimes(2);
    expect(restart).not.toHaveBeenCalled();
  });

  it("preserves normal SSR updates so evaluated metadata can refresh", () => {
    const { update, send, invalidateAll } = setup();
    expect(update("ssr")).toBeUndefined();
    expect(invalidateAll).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("leaves component edits and files outside the post directory alone", () => {
    const { update, invalidateAll } = setup();
    expect(
      update("client", "/project/src/components/Example.tsx"),
    ).toBeUndefined();
    expect(
      update("client", "/project/src/posts-other/example.mdx"),
    ).toBeUndefined();
    expect(invalidateAll).not.toHaveBeenCalled();
  });
});
