# Components

The site has few components. Prefer named CSS classes in `app.css` over new React components.

## Chrome (global, in `__root.tsx`)

```tsx
<header className="site-header">
  <h1 className="site-title">
    <Link to="/">Will Cygan</Link>
  </h1>
  <nav className="site-nav">
    <a href="/will_cygan_resume.pdf">Resume</a>
    <a href="mailto:wcygan.io@gmail.com">Email</a>
    <a href="https://github.com/wcygan">GitHub</a>
    <a href="https://www.linkedin.com/in/wcygan">LinkedIn</a>
  </nav>
</header>
```

Rules:

- Only edit in `src/routes/__root.tsx`. Never re-render header or nav in a child route.
- Nav links are plain `<a>` (external) or `<Link>` (internal). No icons.
- Order: Resume, Email, GitHub, LinkedIn. Add new links only with explicit request.

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
<ul className="post-list">
  {posts.map((post) => (
    <li key={post.slug} className="post-item">
      <div className="post-title">
        <Link to="/$slug" params={{ slug: post.slug }}>
          {post.title}
        </Link>
      </div>
      <div className="post-date">{post.date}</div>
    </li>
  ))}
</ul>
```

- Flex row: title left (cornflower blue, underlined), date right (gray).
- No excerpts, no tags, no thumbnails.
- `src/components/PostCard.tsx` wraps a single `.post-item` — use it for consistency, but the plain markup above also works.

## Blog post

```tsx
<article className="blog-post">
  <header className="post-header">
    <h1 className="post-title">{title}</h1>
    <div className="post-meta">
      <time dateTime={date}>{date}</time>
    </div>
  </header>
  <div className="post-content">
    <MDXContent />
  </div>
</article>
```

- `.post-content` is where MDX rendered output lives. Styles cascade from `app.css` `.post-content h1/h2/h3/p/ul/ol/pre/code/table`.
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
