#!/usr/bin/env bun
import { mkdir, copyFile, readdir } from "node:fs/promises";
/**
 * Publish the canonical PlanetScale demo bundles and reference SVGs from this skill into the
 * site's served tree. Run after updating anything under assets/ or references/.
 *
 *   bun .agents/skills/planet-scale-animation-design-system/scripts/sync-public.ts
 */

const SKILL = new URL("..", import.meta.url).pathname;
const DEST = "public/vendor/planetscale";

const shared = ["modulepreload-polyfill-B5Qt9EMX.js", "styles-CWGXrFsx.css"];
const demos = [
  "lock-queue",
  "concurrency",
  "processes-and-threads",
  "caching",
  "io-devices-and-latency",
  "database-sharding",
  "btrees-and-database-indexes",
  "making-768-servers-look-like-1",
  "dealing-with-large-tables-in-postgres",
];

async function copy(src: string, dest: string) {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
  console.log(`synced ${dest}`);
}

function dirname(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}

for (const file of shared) {
  await copy(`${SKILL}assets/${file}`, `${DEST}/${file}`);
}

for (const demo of demos) {
  const demoDir = `${SKILL}assets/${demo}`;
  try {
    for await (const entry of await readdir(demoDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        await copy(`${demoDir}/${entry.name}`, `${DEST}/${demo}/${entry.name}`);
      }
    }
  } catch (err) {
    console.error(`Error syncing demo ${demo}:`, err);
  }
}

// Also sync vector SVGs from references/what-is-a-data-topology/svgs
const topologyDir = `${SKILL}references/what-is-a-data-topology/svgs`;
try {
  for await (const entry of await readdir(topologyDir, {
    withFileTypes: true,
  })) {
    if (entry.isFile()) {
      await copy(
        `${topologyDir}/${entry.name}`,
        `${DEST}/what-is-a-data-topology/${entry.name}`,
      );
    }
  }
} catch (err) {
  console.error(`Error syncing topology SVGs:`, err);
}
