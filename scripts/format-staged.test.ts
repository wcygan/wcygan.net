import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
let directory: string;
const script = resolve("scripts/format-staged.mjs");
const git = (...args: string[]) =>
  spawnSync("git", args, { cwd: directory, encoding: "utf8" });
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "staged-format-test-"));
  git("init", "-q");
  await mkdir(join(directory, "bin"));
});
afterEach(() => rm(directory, { recursive: true, force: true }));
async function run(exitCode = 0) {
  await writeFile(
    join(directory, "bin/bun"),
    `#!/bin/sh\nprintf '%s\\n' "$@" > '${directory}/args'\nexit ${exitCode}\n`,
    { mode: 0o755 },
  );
  return spawnSync(process.execPath, [script], {
    cwd: directory,
    env: { ...process.env, PATH: `${directory}/bin:${process.env.PATH}` },
    encoding: "utf8",
  });
}
it("does nothing without matching staged files", async () => {
  await writeFile(join(directory, "image.txt"), "text");
  git("add", "image.txt");
  expect((await run()).status).toBe(0);
  expect(await Bun.file(join(directory, "args")).exists()).toBe(false);
});
it("preserves filenames containing spaces", async () => {
  await writeFile(join(directory, "my file.ts"), "const x = 1;");
  git("add", "my file.ts");
  expect((await run()).status).toBe(0);
  expect(await Bun.file(join(directory, "args")).text()).toBe(
    "--bun\nrun\nprettier\n--write\nmy file.ts\n",
  );
});
it("propagates formatter failures", async () => {
  await writeFile(join(directory, "file.ts"), "const x = 1;");
  git("add", "file.ts");
  expect((await run(7)).status).toBe(7);
});
it("re-stages tracked files inside ignored directories", async () => {
  await mkdir(join(directory, "benchmarks"));
  await writeFile(join(directory, ".gitignore"), "benchmarks/\n");
  await writeFile(join(directory, "benchmarks/README.md"), "Before\n");
  git("add", "-f", "benchmarks/README.md");
  await writeFile(join(directory, "benchmarks/README.md"), "After\n");
  expect((await run()).status).toBe(0);
  expect(git("show", ":benchmarks/README.md").stdout).toBe("After\n");
});
