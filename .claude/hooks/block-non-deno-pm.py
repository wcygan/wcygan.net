#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""PreToolUse hook: block non-Deno JavaScript package managers.

deno.lock is load-bearing for CI and deploy reproducibility. A stray
`npm install`, `pnpm install`, `yarn`, or `bun install` can create a
competing lockfile or install tree that hides Deno compatibility problems.

Escape hatch: set CLAUDE_ALLOW_NON_DENO_PM=1.
"""

from __future__ import annotations

import json
import os
import re
import sys

BLOCKED = ("bun", "bunx", "npm", "npx", "pnpm", "pnpx", "yarn", "yarnpkg")

# Match blocked tool as the first token of a pipeline/command segment.
# Segment starts at BOL or after ; | & (covering &&, ||, |, ;, &).
PATTERN = re.compile(
    r"(?:^|[;&|])\s*(" + "|".join(BLOCKED) + r")(?:\s|$)"
)

MESSAGE = """\
Blocked: this repo uses Deno for JavaScript tasks and dependency management.

  deno install              # not: npm install / pnpm install / yarn / bun install
  deno install npm:<pkg>    # not: npm install <pkg>
  deno task <task>          # not: npm run <task> / bun run <task>

Use `deno run npm:<pkg>` for one-off npm package binaries.
Set CLAUDE_ALLOW_NON_DENO_PM=1 to bypass.
"""


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0  # fail-open on malformed payload; don't block legit work

    command = payload.get("tool_input", {}).get("command", "")
    if not isinstance(command, str) or not PATTERN.search(command):
        return 0

    if os.environ.get("CLAUDE_ALLOW_NON_DENO_PM") == "1":
        return 0

    sys.stderr.write(MESSAGE)
    return 2


if __name__ == "__main__":
    sys.exit(main())
