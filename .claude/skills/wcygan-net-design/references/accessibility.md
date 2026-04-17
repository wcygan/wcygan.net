# Accessibility

Target: **WCAG 2.1 AA**. The minimal design makes most of this trivial — don't undo it.

## Focus ring

Global rule in `app.css`:

```css
:focus-visible {
  outline: 2px solid var(--color-primary); /* rgb(70, 110, 170) */
  outline-offset: 2px;
}
```

- Never set `outline: none` without replacing it.
- The offset is important — the ring reads as intentional, not a browser default.

## Contrast (verified pairings)

| Fg on Bg                          | Ratio  | Pass                                            |
| --------------------------------- | ------ | ----------------------------------------------- |
| Black on white                    | 21:1   | AAA                                             |
| `#1e468c` (link blue) on white    | ~10:1  | AAA                                             |
| White on `#466eaa` (primary blue) | ~4.9:1 | AA                                              |
| `#666` (muted) on white           | ~5.7:1 | AA                                              |
| `#aaa` (nav gray) on white        | ~2.3:1 | **Fails AA for body**, OK for supplementary nav |

The nav-gray is intentionally quiet. It does not convey primary information (site title + main content do). Do not use `#aaa` for body text.

## Semantic HTML

Required elements on every page:

- `<header>` — site header (in `__root.tsx`)
- `<nav>` — site nav (in `__root.tsx`)
- `<main>` — route content (in `__root.tsx`, wraps `<Outlet />`)
- `<article>` — blog post wrapper (`.blog-post`)
- `<time dateTime="YYYY-MM-DD">` — post dates
- Proper heading order: exactly one `<h1>` per page, H2 → H3, never skip levels

Frontmatter `title` becomes the page `<h1>` via `.post-title`. Do not add a second H1 in MDX body.

## Keyboard

- All interactive elements are native `<a>` or `<button>`. No role-faked widgets.
- Tab order follows DOM order (no `tabindex > 0`).
- Nav links are always visible and reachable; no hamburger menu to unfurl.

## Screen readers

- `<nav>` in the header is announced as "navigation landmark."
- `<main>` announced as "main landmark."
- Post dates wrapped in `<time>` with machine-readable `dateTime`.
- Images use `alt`. Mermaid diagrams should have an `aria-label` or adjacent text description (not consistently enforced — flag when adding new ones).

## NEVER / INSTEAD

- **NEVER** use `<div onClick={...}>` for interactive elements. **INSTEAD** `<button>` or `<a>`.
- **NEVER** rely on color alone to convey state. Links are underlined (or become underlined on hover), not just colored.
- **NEVER** use placeholder text as label. (No forms on this site currently, but if you add one — real `<label>`.)
- **NEVER** animate with `prefers-reduced-motion` ignored. (Moot here because there's no animation, but if you add one, respect it.)

## Print

`@media print` hides `.site-nav` and `.bio-highlight` and forces `text-black`. Posts remain fully readable on paper. Don't break this.
