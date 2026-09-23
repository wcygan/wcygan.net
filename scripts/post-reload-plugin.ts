import path from "node:path";
import { normalizePath, type Plugin } from "vite";

/** Reload article content and loader data without closing the dev HTTP server. */
export function postReloadPlugin(): Plugin {
  let postsDirectory: string;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    name: "wcygan-post-reload",
    apply: "serve",
    configResolved(config) {
      postsDirectory = normalizePath(path.resolve(config.root, "src/posts"));
    },
    hotUpdate: {
      order: "post",
      handler({ file, server }) {
        if (
          this.environment.name !== "client" ||
          !normalizePath(file).startsWith(`${postsDirectory}/`) ||
          !file.endsWith(".mdx")
        ) {
          return;
        }

        // Leave SSR updates to Vite/Nitro so the worker's evaluated modules
        // are refreshed normally. Only replace the client update with a reload:
        // React state and route loader snapshots can retain the old MDX module.
        this.environment.moduleGraph.invalidateAll();
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          server.ws.send({ type: "full-reload" });
        }, 300);
        return [];
      },
    },
    closeBundle() {
      clearTimeout(reloadTimer);
    },
  };
}
