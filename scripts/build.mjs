import { createBuilder } from "vite";

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection during build:", err);
  process.exit(1);
});

try {
  const builder = await createBuilder({}, null);
  await builder.buildApp();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
