# Layout

One column. 800px wide. Centered. That's it.

## The container

```css
.container {
  margin-left: auto;
  margin-right: auto;
  max-width: 800px;
  width: 100%;
}
```

Defined once in `src/styles/app.css`. Applied once in `src/routes/__root.tsx`:

```tsx
<div className="min-h-screen bg-white">
  <div className="container">
    <header className="site-header">...</header>
    <main className="main-section">
      <Outlet />
    </main>
  </div>
</div>
```

Never nest a second `.container` inside a route. The outer frame is global.

## Spacing scale

The site is tuned for **tight editorial density** (aligned to conroy.org), not generous whitespace. The old universal 30px block-margin rule was retired — today most adjacent blocks sit closer together:

| Purpose                            | Value                                                 |
| ---------------------------------- | ----------------------------------------------------- |
| Main section padding               | `12px`                                                |
| Blog article padding               | `0` (was 12px — fixed alignment with header H1)       |
| Header margin                      | `8px 12px 12px`                                       |
| Header padding-bottom              | `8px`                                                 |
| Paragraph bottom margin            | `20px`                                                |
| In-content H1 bottom margin        | `14px` (top `0`)                                      |
| In-content H2 bottom margin        | `12px` (top `0`)                                      |
| In-content H3 bottom margin        | `10px` (top `0`)                                      |
| Ul / ol bottom margin              | `20px`                                                |
| Pre / Shiki code block margin      | `16px 0`                                              |
| Pre / code padding                 | `18px 30px`                                           |
| Pull-quote margin                  | `12px 0`                                              |
| Pull-quote padding                 | `10px 16px`                                           |
| Bio highlight padding              | `12px 20px`                                           |
| Bio highlight margin-bottom        | `30px` (deliberate — separates banner from post list) |
| Post-list item padding             | `0`                                                   |
| Post-list item bottom margin       | `8px`                                                 |
| Post-list item line-height         | `1.4`                                                 |
| Post title margin (on post page)   | `0 0 6px` (h2)                                        |
| Post footnote margin (italic date) | `0 0 20px`                                            |

Rules of thumb:

- **Between adjacent content blocks**: reach for `12–20px`, not `30px`.
- **Inside a component** (padding): `10–18px` depending on density.
- **The one exception**: bio-highlight banner → post list keeps `30px` bottom margin to visually split "who I am" from "what I write."
- Don't introduce new magic numbers. If a value isn't in this table, pick the closest one or update the table.

## The header

- Bottom border: `1px solid rgb(70, 110, 170)` — the only border the site shows on chrome.
- Site title left, nav right (inline, `display: inline-block`, 5px right padding on links).
- No logo image. Text-only brand.

## The main section

`<main className="main-section">` has `padding: 12px`. Everything below header flows inside it. Content classes (`.bio-highlight`, `.post-list`, `.blog-post`) are children of `<main>`.

**Do not double-pad.** `.blog-post` used to have its own `padding: 12px`, which stacked on top of `.main-section` and pushed article content 12px inward from the header H1. That's fixed (`.blog-post { padding: 0 }`). If you add a new top-level route wrapper, match alignment with header — verify article title and header H1 share the same computed `left` value.

## Responsive

One breakpoint: `max-width: 768px`.

```css
@media (max-width: 768px) {
  .container {
    @apply px-4 py-6;
  }
  .site-title {
    @apply text-3xl;
  } /* legacy override — consider removing */
  .post-item {
    @apply flex-col items-start;
  }
  .post-date {
    @apply ml-0 mt-1;
  }
}
```

On mobile the post-item flips from flex-row (title / date on same line) to flex-column (title above date). No other layout changes needed.

## Print

```css
@media print {
  body {
    @apply text-black;
  }
  .site-nav,
  .bio-highlight {
    display: none;
  }
}
```

Nav and bio banner hide when printing a post. Keep it that way.

## Rules

- **NEVER** break out to full-bleed. No `w-screen`, no `margin-left: calc(50% - 50vw)`. The 800px column is the design.
- **NEVER** use a multi-column grid for post content. `.post-list` is flex (title/date on a line), everything else is single column.
- **NEVER** add drop shadows (`shadow-*`), card borders (`.card`, `border rounded-xl`), or glassmorphism.
- **INSTEAD** of a card grid, use `.post-list` + `.post-item`.
- **INSTEAD** of a hero section with big imagery, use `.bio-highlight` (cornflower-blue banner, white text).
