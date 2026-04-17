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

| Element                           | Size   | Weight | Style                                  | Color     |
| --------------------------------- | ------ | ------ | -------------------------------------- | --------- |
| Post title link (`.post-title a`) | 18px   | 400    | underline                              | `#466eaa` |
| Post date (`.post-date`)          | `13px` | 400    | **uppercase**, letter-spacing `0.02em` | `#666`    |

Dates render as `<time dateTime={isoDate}>NOVEMBER 1, 2025</time>` via `~/lib/utils/formatDate` (`toIsoDate` + `toDisplayDate`). The small uppercase treatment is deliberate — it mirrors conroy.org's metadata and keeps the title the visual anchor. Do not scale the date up to match body text.

### Blog post page

| Element                                                         | Size | Weight | Style                     | Color     |
| --------------------------------------------------------------- | ---- | ------ | ------------------------- | --------- |
| Post title (`.blog-post > h2.post-title`)                       | 32px | 700    | line-height `1`, mb `6px` | —         |
| Post title link (`.blog-post > h2.post-title a.post-permalink`) | 32px | 700    | no underline              | `#466eaa` |
| Post footnote italic date (`.post-footnote`)                    | 14px | 400    | italic, mb `20px`         | `#aaa`    |

Notes:

- The post-page title is **h2** (not h1). Each page shows the site's `h1` (brand) in the header and a single `h2` per article. If you regenerate the template, keep the tag as `h2` and the class as `post-title`.
- `.post-title a.post-permalink` sets `font-size: 32px` explicitly — the homepage `.post-title a { font-size: 18px }` rule would otherwise cascade in and shrink the post-page title. Do not remove the explicit size.
- The legacy `.post-meta` class is gone. The italic date is now `.post-footnote` (`<p class="post-footnote"><time>...</time></p>`), colored with the light `#aaa` footnote grey.

### In-content headings (`.post-content`)

| Tag | Size | Weight | Top margin | Bottom margin | Line-height | Color  |
| --- | ---- | ------ | ---------- | ------------- | ----------- | ------ |
| h1  | 32px | 700    | `0`        | `14px`        | `1.1`       | black  |
| h2  | 28px | 700    | `0`        | `12px`        | `1.2`       | `#666` |
| h3  | 22px | 700    | `0`        | `10px`        | `1.25`      | `#666` |

Heading `margin-top: 0` — spacing between a heading and the previous paragraph comes from the paragraph's `margin-bottom: 20px` only. Previous rule was `margin-top: 2.2em` (≈ 52.8px) which created huge gaps above every section; do not reintroduce it.

H3 is **muted grey** (`#666`), not cornflower blue. The only cornflower-blue headings left are the post-page title and the bio-highlight banner.

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

## The tight-rhythm scale

The old "every block gets `margin-bottom: 30px`" rule is retired. The current scale is tighter and varies by element:

| Block           | Bottom margin | Notes                                                      |
| --------------- | ------------- | ---------------------------------------------------------- |
| `p`             | `20px`        | Previously 30px. Lede override (`:first-of-type`) removed. |
| `h1` in content | `14px`        | `margin-top: 0`                                            |
| `h2`            | `12px`        | `margin-top: 0` (was `2.2em`)                              |
| `h3`            | `10px`        | `margin-top: 0`                                            |
| `ul`, `ol`      | `20px`        | Line-height `28px`, padding-left `1.4em`                   |
| `pre`           | `16px 0`      | Shiki + raw pre share this margin                          |
| `.pull-quote`   | `12px 0`      | Padding `10px 16px`                                        |
| `table`, `img`  | `30px`        | Still 30px — large visual blocks earn the breathing room   |

Rule of thumb: **default to `mb-[20px]` or less between adjacent content blocks**. Don't reintroduce a universal 30px rule. Don't ad-hoc `mb-4` / `mb-8` — if a value isn't in the table, add it to `app.css` and the table together.
