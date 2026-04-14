import { defineConfig } from "vitest/config";

// Standalone vitest config avoids pulling the MDX / TanStack Start / Nitro
// plugin chain from vite.config.ts — those are irrelevant to the pure-logic
// tests this project runs and would slow discovery unnecessarily.
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: [
      { find: "~", replacement: new URL("./src", import.meta.url).pathname },
    ],
  },
});
