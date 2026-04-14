# Typography

System fonts. No web fonts. One sans stack, one mono stack.

## Font stacks

```css
/* Body / display (same stack) */
font-family:
  system,
  -apple-system,
  "system-ui",
  "Helvetica Neue",
  "Lucida Grande",
  sans-serif;

/* Monospace (code, Shiki) */
font-family: "Courier New", monospace;
```

Shiki code blocks use a slightly richer mono stack for better glyph coverage:

```css
Consolas, Menlo, "Deja Vu Sans Mono", "Bitstream Vera Sans Mono", "Courier New", Courier, monospace;
```

Note: `tailwind.config.ts` has `fontFamily.sans: ['Inter', 'system-ui', 'sans-serif']` as a leftover — but **Inter is not actually loaded anywhere** and the body directly sets `font-family: var(--font-base)` in `app.css`, overriding Tailwind's `font-sans`. Do not add Inter to fix the "inconsistency" — the intended behavior is system fonts. Fix it by removing Inter from the config if you touch that file.

## Size + weight scale

All values are the actual ones in `app.css` — match them exactly.

### Chrome

| Element                    | Size | Weight | Transform | Color  |
| -------------------------- | ---- | ------ | --------- | ------ |
| Site title (`.site-title`) | 18px | 700    | uppercase | black  |
| Nav link (`.site-nav a`)   | 14px | 400    | uppercase | `#aaa` |

### Homepage post list

| Element                           | Size | Weight | Style     | Color     |
| --------------------------------- | ---- | ------ | --------- | --------- |
| Post title link (`.post-title a`) | 18px | 400    | underline | `#5c8b3f` |
| Post date (`.post-date`)          | 18px | 400    | —         | `#666`    |

### Blog post page

| Element                               | Size | Weight | Style                  | Color     |
| ------------------------------------- | ---- | ------ | ---------------------- | --------- |
| Post title (`.blog-post .post-title`) | 36px | 700    | line-height 1, mb 30px | `#5c8b3f` |
| Post meta date (`.post-meta`)         | 18px | 400    | italic                 | `#666`    |

### In-content headings (`.post-content`)

| Tag | Size | Weight | Color     |
| --- | ---- | ------ | --------- |
| h1  | 36px | 700    | black     |
| h2  | 28px | 700    | `#666`    |
| h3  | 24px | 700    | `#5c8b3f` |

Heading line-height is `1`. Margin-bottom is `30px` (the universal vertical rhythm).

### Body

| Element                     | Size  | Line-height | Color                       |
| --------------------------- | ----- | ----------- | --------------------------- |
| `<body>`                    | 18px  | 1.6         | black                       |
| `.post-content p`           | 18px  | 28px        | black                       |
| Inline `<code>` (not Shiki) | 0.9em | —           | black on `bg-gray-100`      |
| Shiki code                  | 14px  | 14px        | Shiki-themed (github-light) |

## Rules

- **NEVER** use a serif for display. The system stack is sans; keep it sans.
- **NEVER** load a web font. No Google Fonts, no Fontsource. If you need a glyph not in the system stack, reconsider.
- **NEVER** introduce `font-weight: 500` (Tailwind `font-medium`) for body text — we only use 400 (normal) and 700 (bold).
- **NEVER** use `text-xs` or smaller for primary content. Anything under 14px is accessibility-hostile here.
- **INSTEAD** of custom Tailwind utilities (`text-2xl font-bold`), use the named component classes (`.post-title`, `.site-title`) so updates propagate.

## The 30px rule

Every block element (`p`, `h1`, `h2`, `h3`, `ul`, `ol`, `pre`, `img`, `table`) gets `margin-bottom: 30px`. This vertical rhythm is the whole layout — don't break it with `mb-4` or `mb-8` ad hoc.
