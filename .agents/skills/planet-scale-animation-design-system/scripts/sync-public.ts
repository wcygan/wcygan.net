#!/usr/bin/env -S deno run --allow-read=. --allow-write=public
/**
 * Publish the canonical PlanetScale demo bundles from this skill into the
 * site's served tree. Run after updating anything under assets/.
 *
 *   deno run --allow-read=. --allow-write=public .agents/skills/planet-scale-animation-design-system/scripts/sync-public.ts
 */

const SKILL = new URL("..", import.meta.url).pathname;
const DEST = "public/vendor/planetscale";

const shared = ["modulepreload-polyfill-B5Qt9EMX.js", "styles-CWGXrFsx.css"];
const demos = ["lock-queue", "concurrency"];

async function copy(src: string, dest: string) {
  await Deno.mkdir(dirname(dest), { recursive: true });
  await Deno.copyFile(src, dest);
  console.log(`synced ${dest}`);
}

function dirname(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}

for (const file of shared) {
  await copy(`${SKILL}assets/${file}`, `${DEST}/${file}`);
}
for (const demo of demos) {
  // The bundle imports the polyfill relative to itself; it must sit beside
  // the bundle, not only at the shared root.
  await copy(
    `${SKILL}assets/modulepreload-polyfill-B5Qt9EMX.js`,
    `${DEST}/${demo}/modulepreload-polyfill-B5Qt9EMX.js`,
  );
  for await (const entry of Deno.readDir(`${SKILL}assets/${demo}`)) {
    if (entry.isFile) {
      await copy(
        `${SKILL}assets/${demo}/${entry.name}`,
        `${DEST}/${demo}/${entry.name}`,
      );
    }
  }
}
