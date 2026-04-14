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

The site uses a simplified rhythm, not a full 8pt scale:

| Purpose                     | Value              |
| --------------------------- | ------------------ |
| Block element bottom margin | `30px` (universal) |
| Main section padding        | `12px`             |
| Header margin               | `8px 12px 12px`    |
| Header padding-bottom       | `8px`              |
| Section spacing             | `40px`             |
| Post item padding           | `5px 0`            |
| Post item bottom margin     | `16px`             |
| Bio highlight padding       | `12px 20px`        |
| Pre/code padding            | `18px 30px`        |

Don't introduce new magic numbers. If you need spacing, reach for `30px` (between blocks) or `12px` (inside blocks) first.

## The header

- Bottom border: `1px solid rgb(92, 139, 63)` — the only border the site shows on chrome.
- Site title left, nav right (inline, `display: inline-block`, 5px right padding on links).
- No logo image. Text-only brand.

## The main section

`<main className="main-section">` has `padding: 12px`. Everything below header flows inside it. Content classes (`.bio-highlight`, `.post-list`, `.blog-post`) are children of `<main>`.

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
- **INSTEAD** of a hero section with big imagery, use `.bio-highlight` (green banner, white text).
