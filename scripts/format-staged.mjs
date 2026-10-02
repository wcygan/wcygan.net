import { spawnSync } from "node:child_process";

const FORMATTABLE_FILE = /\.(?:ts|tsx|js|jsx|css|md|mdx|json|ya?ml)$/;
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}
const stagedFiles = run(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  true,
)
  .split("\0")
  .filter((file) => FORMATTABLE_FILE.test(file));
if (stagedFiles.length) {
  run("bun", ["--bun", "run", "prettier", "--write", ...stagedFiles]);
  run("git", ["add", "--update", "--", ...stagedFiles]);
}
