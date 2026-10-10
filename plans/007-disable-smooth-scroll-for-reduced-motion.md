# 007 — Disable smooth page scrolling for reduced motion

- **Status**: TODO
- **Commit**: 575b513
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 CSS file, fewer than 10 changed lines

## Problem

`src/styles/app.css:103-105` applies `scroll-behavior: smooth` globally, with
no reduced-motion override. Anchor navigation such as the article TOC therefore
animates page scrolling even when a reader requests reduced motion.

## Target

Under `prefers-reduced-motion: reduce`, set the document's scroll behavior to
`auto`. Keep smooth anchor scrolling for readers who have not requested reduced
motion.

## Repo conventions to follow

- Keep shared document behavior in `src/styles/app.css`.
- Scope the override to the root element; do not introduce a broad transition
  reset that changes unrelated article controls or diagrams.

## Steps

1. Add a focused reduced-motion media rule for `html` beside the existing root
   scrolling rule or in the canonical reduced-motion section.
2. Confirm no later selector overrides the setting.

## Boundaries

- Do not change TOC behavior, anchor destinations, or any component-specific
  diagram motion.
- Do not add dependencies.

## Verification

- **Mechanical**: run `bun run pre-commit`.
- **Feel check**: on an article page, follow a TOC anchor with normal motion and
  with reduced motion enabled. Smooth movement should remain in the normal
  setting and become immediate under reduced motion.
- **Done when**: computed `scroll-behavior` is `auto` for reduced motion and
  `smooth` otherwise, with anchor navigation working in both settings.
