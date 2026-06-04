import { createBuilder } from "vite";
import { renderDiagrams } from "./render-diagrams.mjs";

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection during build:", err);
  process.exit(1);
});

// Regenerate diagram SVGs when a local Chrome is available (incremental, and a
// no-op otherwise). Build containers without Chrome fall back to the committed
// SVGs, so a render failure must never fail the build.
try {
  await renderDiagrams();
} catch (error) {
  console.warn("[build] Diagram render skipped:", error?.message ?? error);
}

try {
  const builder = await createBuilder({}, null);
  await builder.buildApp();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
