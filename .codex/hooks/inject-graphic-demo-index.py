#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""SessionStart hook: inject the current wcygan.net graphic demo index.

The source of truth is the component tree.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


SKIP_ENV = "WCYGAN_NET_SKIP_GRAPHIC_DEMO_INDEX"


def read_hook_input() -> dict[str, object]:
    if sys.stdin.isatty():
        return {}

    raw_input = sys.stdin.read().strip()
    if not raw_input:
        return {}

    try:
        payload = json.loads(raw_input)
    except json.JSONDecodeError:
        return {}

    return payload if isinstance(payload, dict) else {}


def repo_root(payload: dict[str, object]) -> Path:
    cwd = payload.get("cwd")
    start = Path(cwd).resolve() if isinstance(cwd, str) else Path.cwd()

    for directory in [start, *start.parents]:
        if (directory / ".git").exists():
            return directory

    return start


def component_files(root: Path) -> list[Path]:
    components_dir = root / "src" / "components"
    return sorted(
        path
        for path in components_dir.glob("*.tsx")
        if path.is_file()
    )


def render_tree(files: list[Path]) -> str:
    lines = ["src/components/"]
    for index, path in enumerate(files):
        branch = "└──" if index == len(files) - 1 else "├──"
        lines.append(f"{branch} {path.name}")
    return "\n".join(lines)


def additional_context(root: Path) -> str:
    files = component_files(root)
    tree = render_tree(files)
    return f"""\
## wcygan.net graphic demo component index (auto-injected)

This repository uses graphic demos as article-native explanations: Canvas 2D
animations, SVG diagrams, Leaflet map embeds, ASCII flipbooks, and small
interactive controls that sit directly inside MDX posts. Treat `src/components/`
as the current component-level entrypoint inventory when auditing or editing
these demos. Some files are supporting article UI rather than demos, so verify
post imports before changing behavior.

Load `$wcygan-graphic-demos` before creating, editing, reviewing, or debugging
any of these demos. That repo-local skill captures the local model, renderer,
lifecycle, accessibility, styling, and verification patterns.

These are the current component files:

```text
{tree}
```

For model-driven demos, also inspect `src/demos/` for the backing state,
engine, renderer, viewport, and test files before editing a component shell.
"""


def main() -> int:
    if os.environ.get(SKIP_ENV) == "1":
        return 0

    payload = read_hook_input()

    try:
        context = additional_context(repo_root(payload))
    except Exception as exc:
        print(f"graphic demo index hook failed: {exc}", file=sys.stderr)
        return 1

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": context,
            }
        },
        sys.stdout,
        ensure_ascii=False,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
