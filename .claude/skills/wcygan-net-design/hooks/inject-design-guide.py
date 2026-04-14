#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""SessionStart hook: inject wcygan.net design guardrails into the session.

Surfaces the non-obvious, load-bearing design rules up front so Claude
doesn't drift (add Google Fonts, invent hex colors, break the 800px
container, duplicate nav in child routes, etc.). Keeps the payload
small — points at the full `wcygan-net-design` skill for deep dives.

Escape hatch: set CLAUDE_SKIP_DESIGN_GUIDE=1.
"""

from __future__ import annotations

import json
import os
import sys

GUIDE = """\
## wcygan.net design guardrails (auto-injected)

**Aesthetic is locked**: editorial minimalism, one cornflower-blue accent, system fonts only, 800px column. Do not introduce new directions without being asked.

**Palette** (no others in new code):
- `rgb(70, 110, 170)` primary blue — titles, bio banner, H3
- `rgb(30, 70, 140)` link blue — body links
- `rgb(0, 0, 0)` body text  ·  `rgb(102, 102, 102)` muted/dates
- `rgb(170, 170, 170)` nav  ·  `rgb(222, 222, 222)` border  ·  `rgb(249, 249, 249)` surface  ·  `#fff` bg

**Layout**: `.container` 800px max-width, 12px padding, 30px vertical rhythm. Type: system stack, 18px/28px body, `'Courier New'` mono.

**Hard rules**:
- Tailwind **v3** here (has `tailwind.config.ts`). Do not apply v4 `@theme` patterns.
- No Google Fonts / Fontsource / web-font CSS. Ever.
- No shadcn / Radix / Headless UI / Motion. Plain React + utilities + named classes from `src/styles/app.css`.
- `src/routes/__root.tsx` owns all chrome. Do not duplicate header/nav in child routes.
- `$slug` route's `beforeLoad` dot-rejection protects `/rss.xml` etc. — do not touch.
- Loaders return **serializable data only**. No React components from loaders.
- Never `ref.current.innerHTML` — use `dangerouslySetInnerHTML` via state.
- Mermaid is `import('mermaid')` dynamic only. Never top-level import.
- Prefer named classes (`.bio-highlight`, `.post-list`, `.post-item`, `.site-header`, `.blog-post`, `.post-content`) over new Tailwind utilities.

**Load the full `wcygan-net-design` skill** (references/colors.md, typography.md, layout.md, components.md, blog-mdx.md, routing-and-chrome.md, accessibility.md) for specifics before non-trivial design work.

**Before done**: `bun run pre-commit` must pass. See SKILL.md validation checklist.
"""


def main() -> int:
    if os.environ.get("CLAUDE_SKIP_DESIGN_GUIDE") == "1":
        return 0

    try:
        json.load(sys.stdin)
    except json.JSONDecodeError:
        pass  # no payload needed; we inject unconditionally

    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": GUIDE,
        }
    }
    json.dump(output, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
