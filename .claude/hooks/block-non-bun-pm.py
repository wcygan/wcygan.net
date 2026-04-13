#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""PreToolUse hook: block npm/pnpm/yarn in this Bun-only repo.

bun.lock is load-bearing for Cloudflare Workers Builds — a stray
`npm install` regenerates a package-lock.json and breaks deploys.
`npx` and `bunx` are allowed (the deploy script uses `npx wrangler`).

Escape hatch: set CLAUDE_ALLOW_NON_BUN_PM=1.
"""

from __future__ import annotations

import json
import os
import re
import sys

BLOCKED = ("npm", "pnpm", "yarn")

# Match blocked tool as the first token of a pipeline/command segment.
# Segment starts at BOL or after ; | & (covering &&, ||, |, ;, &).
PATTERN = re.compile(
    r"(?:^|[;&|])\s*(" + "|".join(BLOCKED) + r")(?:\s|$)"
)

MESSAGE = """\
Blocked: this repo is Bun-only. Use `bun` instead.

  bun install       # not: npm install / pnpm install / yarn
  bun add <pkg>     # not: npm install <pkg>
  bun run <script>  # not: npm run <script>

`npx` and `bunx` are allowed. Set CLAUDE_ALLOW_NON_BUN_PM=1 to bypass.
"""


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0  # fail-open on malformed payload; don't block legit work

    command = payload.get("tool_input", {}).get("command", "")
    if not isinstance(command, str) or not PATTERN.search(command):
        return 0

    if os.environ.get("CLAUDE_ALLOW_NON_BUN_PM") == "1":
        return 0

    sys.stderr.write(MESSAGE)
    return 2


if __name__ == "__main__":
    sys.exit(main())
