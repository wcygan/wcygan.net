import { createBuilder } from "vite";

try {
  const builder = await createBuilder({}, null);
  await builder.buildApp();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
