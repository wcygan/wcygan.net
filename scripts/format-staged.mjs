const FORMATTABLE_FILE = /\.(?:ts|tsx|js|jsx|css|md|mdx|json|ya?ml)$/;

async function run(command, args) {
  const result = await new Deno.Command(command, {
    args,
    stdout: "inherit",
    stderr: "inherit",
  }).output();

  if (!result.success) {
    Deno.exit(result.code);
  }
}

const stagedFilesOutput = await new Deno.Command("git", {
  args: ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  stdout: "piped",
  stderr: "inherit",
}).output();

if (!stagedFilesOutput.success) {
  Deno.exit(stagedFilesOutput.code);
}

const stagedFiles = new TextDecoder()
  .decode(stagedFilesOutput.stdout)
  .split("\0")
  .filter((file) => FORMATTABLE_FILE.test(file));

if (stagedFiles.length === 0) {
  Deno.exit(0);
}

await run("deno", ["task", "--eval", "prettier", "--write", ...stagedFiles]);
await run("git", ["add", "--", ...stagedFiles]);
