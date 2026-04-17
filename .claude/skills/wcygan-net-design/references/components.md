# Components

The site has few components. Prefer named CSS classes in `app.css` over new React components.

## Chrome (global, in `__root.tsx`)

```tsx
<header className="site-header">
  <h1 className="site-title">
    <Link to="/">Will Cygan</Link>
  </h1>
  <nav className="site-nav" aria-label="Primary">
    <ul>
      <li>
        <a href="/will_cygan_resume.pdf">Resume</a>
      </li>
      <li>
        <a href="mailto:wcygan.io@gmail.com">Email</a>
      </li>
      <li>
        <a href="https://github.com/wcygan">GitHub</a>
      </li>
      <li>
        <a href="https://www.linkedin.com/in/wcygan">LinkedIn</a>
      </li>
    </ul>
  </nav>
</header>
```

Rules:

- Only edit in `src/routes/__root.tsx`. Never re-render header or nav in a child route.
- Nav is `<ul><li>` — semantic list, not bare anchors. The `aria-label="Primary"` is load-bearing for screen readers.
- Links are plain `<a>` (external) or `<Link>` (internal). No icons.
- Order: Resume, Email, GitHub, LinkedIn. No RSS link (a static `/rss.xml` exists but is not advertised in chrome). Add new links only with explicit request.

## Bio highlight (homepage hero)

```tsx
<div className="bio-highlight">
  <p>
    Software Engineer at <a href="...">LinkedIn</a> building e-commerce
    infrastructure.
  </p>
</div>
```

- Cornflower-blue background, white text, white underlined links.
- One sentence only. This is the entire "hero."
- Edit in `src/routes/index.tsx`.

## Post list (homepage + `/posts`)

```tsx
import { toDisplayDate, toIsoDate } from "~/lib/utils/formatDate";

<ul className="post-list">
  {posts.map((post) => (
    <li key={post.slug} className="post-item">
      <div className="post-title">
        <Link to="/$slug" params={{ slug: post.slug }}>
          {post.title}
        </Link>
      </div>
      <time className="post-date" dateTime={toIsoDate(post.date)}>
        {toDisplayDate(post.date)}
      </time>
    </li>
  ))}
</ul>;
```

- Flex row: title left (cornflower blue, underlined), date right — **small uppercase grey** (`13px`, `letter-spacing: 0.02em`, color `#666`). Rendered as "NOVEMBER 1, 2025" via `toDisplayDate`.
- `.post-item` has `padding: 0` and `margin-bottom: 8px` — tight rhythm between rows. Line-height `1.4`. Do not re-add the old `5px 0` padding.
- Date must be a `<time>` element with `dateTime={toIsoDate(post.date)}` (ISO `YYYY-MM-DD`). Display text comes from `toDisplayDate`.
- No excerpts, no tags, no thumbnails.
- `src/components/PostCard.tsx` wraps a single `.post-item` — use it for consistency, but the plain markup above also works.

## Blog post

```tsx
<article className="blog-post">
  <h2 className="post-title">
    <Link to="/$slug" params={{ slug }} className="post-permalink">
      {title}
    </Link>
  </h2>
  <p className="post-footnote">
    <time dateTime={toIsoDate(date)}>{toDisplayDate(date)}</time>
  </p>
  <div className="post-content">
    <MDXContent />
  </div>
  <footer />
</article>
```

- **The title is `h2`, not `h1`.** The site-level `h1` is the brand in `__root.tsx`; each article uses a single `h2.post-title`. The title anchor uses class `post-permalink` which explicitly sets `font-size: 32px` to override the homepage `.post-title a { font-size: 18px }` rule — never remove that explicit size.
- **No `.post-header` wrapper and no `.post-meta`.** Those were dropped when post pages were re-aligned to conroy.org's density. The date is a `<p class="post-footnote">` (italic, `14px`, `#aaa`) placed directly under the title.
- **`.blog-post` has `padding: 0`.** Content must align with the header H1 on the left edge — any top-level padding here stacks on top of `.main-section { padding: 12px }` and breaks alignment. If you change this, verify `articleTitle.getBoundingClientRect().left === headerH1.getBoundingClientRect().left`.
- **The trailing empty `<footer />`** is intentional — the previous post-footer hairline + PostNavCard were removed when the article was tightened. Leave the element as a hook for future insertions.
- `.post-content` is where MDX rendered output lives. Styles cascade from `app.css` `.post-content h1/h2/h3/p/ul/ol/pre/code/table`. See `references/typography.md` for exact sizes and margins — they are all tighter than the old `30px` rhythm.
- Do not wrap content in `prose` — the prose plugin would conflict with the custom content styles. (`about.tsx` and `resume.tsx` currently use `prose` — treat that as legacy drift.)

## MermaidDiagram

```tsx
import { MermaidDiagram } from "~/components/MermaidDiagram";

<MermaidDiagram height={400} diagram={`flowchart TD\n  A --> B`} />;
```

Rules:

- Only use inside MDX posts (via `import` at top of the `.mdx` file).
- Lazy-loaded: `import('mermaid')` at runtime, never top-level.
- SessionStorage cache prevents re-render on navigation (see `src/lib/utils/mermaid-cache.ts`).
- Fullscreen trigger renders via `MermaidFullscreen.tsx`.
- Container gets light theme overrides — see `app.css` `.post-content .mermaid-container`.

## ExperienceCard (about page)

Currently uses emerald/zinc Tailwind classes — **legacy drift**. When editing:

- Keep the component API (`{ experience: Experience }`).
- Migrate colors: `text-emerald-400` → primary blue inline, `bg-zinc-700` → surface gray, `text-zinc-300` → black.
- Remove `hover:scale-105` and `transition-all` — motion is not part of this design.
- Remove ring/border styling on hover.

## What NOT to build

- No modal/dialog/drawer components. There's no need.
- No toast system. No loading spinners.
- No breadcrumbs. URL depth is max 1 (`/{slug}`).
- No search UI. RSS and manual browsing are the discovery mechanism.
- No pagination. Post list is full.

## Adding a new component

1. First ask: can this be a plain `<div className="...">` with utility classes in `app.css`?
2. If yes — add the named class to `app.css` under `@layer components`, document in `design.md`.
3. If no — create `src/components/Name.tsx`, keep it ≤80 lines, no external deps.
4. Never add a component that takes a `variant` prop. There is one design direction.
