# AGENTS.md

Guide for `wcygan.net`, a TanStack Start software blog with a quiet,
content-first editorial design.

## Essential commands

```bash
# Development
just dev              # Portless dev server at https://wcygan.localhost

# Quality and testing
deno task pre-commit  # Format, typecheck, and tests
deno task test        # Vitest unit tests
deno task build       # Production build and prerendering
```

`just dev` runs Vite through Portless. It uses `portless.json` and
`scripts/ensure-portless-proxy.sh` to provide a stable HTTPS `.localhost` URL. Use
the active worktree's assigned Portless URL when another checkout is already
using `wcygan.localhost`.

## Technology stack

- TanStack Start and TanStack Router for React 19 SSR
- Deno for the runtime, package management, tasks, and tests
- Tailwind CSS 3 with the Typography plugin
- MDX through `@mdx-js/rollup`
- Shiki for build-time syntax highlighting with the Idle Toes theme
- Mermaid compiled to static SVG by `deno task render:diagrams`
- Nitro with the `deno-server` preset for prerendering

## Design direction and authority

The homepage is the approved visual reference for the shared shell, identity,
navigation, density, palette, and restraint. Article pages have begun converging
on that system, but their restyle is **in progress**. Do not describe the whole
article experience as finished merely because the shared shell and basic prose
styles match.

Use this order when design sources disagree:

1. The accepted homepage and browser-computed styles are the product reference.
2. The final scoped editorial rules near the end of `src/styles/app.css` are the
   current implementation reference.
3. This guide defines the durable direction and validation bar.
4. `design.md` is a legacy cornflower-blue, 800px design document. Do not copy
   its palette, uppercase navigation, bordered header, bio banner, or layout
   values into new work. Reconcile or retire it in a dedicated future change.

When code and this guide disagree, inspect the rendered page and computed
styles. Fix an accidental regression; update this guide only when the design
change is intentional and accepted.

## Design principles

- **Quiet editorial hierarchy:** let typography, spacing, and alignment create
  structure. Avoid decorative chrome, banners, heavy borders, and gratuitous
  cards.
- **Content first:** every visual decision should improve reading, scanning, or
  navigation. The interface should recede behind the writing.
- **Warm neutrals:** the shared shell is nearly monochrome. Reserve strong color
  for focus, code, state, maps, and explanatory graphics.
- **One aligned column:** the name, navigation, section labels, prose, post
  titles, and media share the same left edge.
- **Compact but unhurried:** use deliberate whitespace between semantic groups,
  not large empty regions inside a group.
- **Accessible without hover:** keyboard, touch, reduced-motion, and narrow
  viewports are first-class states.

## Canonical color system

These are the accepted shared-shell values. Prefer promoting them to semantic
CSS custom properties when consolidating the stylesheet; do not create another
high-specificity override layer.

| Role             | Value     | Use                                             |
| ---------------- | --------- | ----------------------------------------------- |
| Page background  | `#fdfdfc` | Shared site canvas                              |
| Primary ink      | `#21201c` | Names, headings, titles, primary copy           |
| Muted ink        | `#63635e` | Role, descriptions, dates, secondary UI         |
| Subtle underline | `#bcbbb5` | Neutral link decoration and hover affordance    |
| Hairline         | `#e4e3de` | Quiet borders, dividers, and TOC structure      |
| Raised surface   | `#f7f6f3` | TOC, table headers, restrained inset surfaces   |
| Hover surface    | `#f5f4f4` | Homepage writing-row hover                      |
| Focus accent     | `#466eaa` | Visible keyboard focus; not general page chrome |

Rules:

- Do not reintroduce blue page titles, blue section headings, a blue bio banner,
  or a blue header divider.
- Editorial links inherit primary ink and use a subtle underline. Strengthen the
  underline on hover instead of changing to a saturated color.
- Muted text must remain readable; `#63635e` on `#fdfdfc` meets normal-text
  contrast.
- Article diagrams default to black, white, and warm gray. Express state through
  labels, grouping, shape, pattern, line treatment, and motion before introducing
  saturated color. The blue focus accent remains reserved for keyboard focus.
- Editorial raster images use a `1px` inset outline of `oklch(0 0 0 / 0.1)`.
  Transparent diagrams and artwork may opt out when an outline damages the
  image.

## Typography

### Font roles

| Role                  | Stack                                                           | Use                                                                                         |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Homepage hero display | `TWK Lausanne Pan Preview`, `Helvetica Neue`, Arial, sans-serif | Full homepage identity line only                                                            |
| Editorial sans        | `Inter`, `system-ui`, sans-serif                                | Compact article identity, article prose, titles, headings, metadata, captions, and controls |
| Monospace             | `Lilex`, `ui-monospace`, monospace                              | Code, terminals, SQL traces, and ASCII art                                                  |

Use local `.woff2` assets for Lilex. Keep `font-synthesis: none` so missing
weights fail visibly instead of producing fake bold or italic. Apply font
smoothing once at the document root. `font-body`, `font-sans`, and `font-ui`
all select Inter; keep the role aliases until the stylesheet is consolidated.

The compact article identity and editorial article text use Inter with `"cv01"`
and `"ss03"` enabled and ligatures disabled. The full homepage hero is the
intentional Lausanne exception. Reset that feature policy at the Lilex boundary
so code and ASCII retain their own ligatures.

### Shared shell and homepage scale

| Element             | Size / line-height | Weight | Color       |
| ------------------- | ------------------ | ------ | ----------- |
| Site name           | `16px / 24px`      | `500`  | Primary ink |
| Site role           | `16px / 16px`      | `500`  | Muted ink   |
| Navigation          | `14px / 1.2`       | `500`  | Muted ink   |
| Section label       | `16px / 24px`      | `500`  | Primary ink |
| About copy          | `16px / 1.65`      | `400`  | Muted ink   |
| Writing title       | `16px / 24px`      | `400`  | Primary ink |
| Writing description | `16px / 24px`      | `400`  | Muted ink   |

### Article scale: current convergence baseline

- Article title: Inter, `clamp(1.875rem, 4vw, 2.25rem)`, weight `600`, `1.12`
  line-height, `-0.025em` tracking, balanced wrapping.
- Publication date: Inter, `14px / 1.5`, weight `500`, normal style, muted ink.
- Prose: Inter, `16px / 1.65`, primary ink, with `26px` paragraph rhythm.
  Enable `"cv01"` and `"ss03"` and disable ligatures for editorial prose, but
  do not inherit that feature policy into Lilex code.
- Top-level `h2`: Inter `16px / 24px`, weight `550`, normal tracking, with
  `56px` above and `20px` below (`48px` above on mobile). This is the measured
  article-heading reference. `h3` and `h4` keep the same type treatment and
  express hierarchy through progressively tighter spacing.
- Author the first heading in an MDX post as an `h2`; use `h3` only under an
  `h2`. Treat existing violations as migration debt. Choose heading levels from
  document structure, never appearance.
- Top-level prose links currently use weight `700` with a tuned neutral `1px`
  underline. Nested editorial link contexts remain a migration target.
- Use `text-wrap: balance` for headings and `text-wrap: pretty` for short
  descriptions where it improves the final line. Do not balance long prose.

## Layout and spacing

The shared `.site-container` is `692px` wide including `24px` inline gutters,
which yields a `644px` reading column. This measure is canonical; do not restore
the legacy `800px` container.

| Context                    | Desktop     | Mobile (`<640px`) |
| -------------------------- | ----------- | ----------------- |
| Container padding          | `64px 24px` | `48px 24px`       |
| Header-to-content gap      | `48px`      | `48px`            |
| Navigation top gap         | `28px`      | `24px`            |
| Major homepage section gap | `48px`      | `48px`            |
| Writing-list gap           | `16px`      | `28px`            |

Favor the established spacing set: `4`, `8`, `12`, `16`, `20`, `24`, `28`, `48`,
and `64px`. Introduce a new value only when the component's geometry requires
it. Avoid stacking parent and child margins that create accidental double
spacing.

The site name always links home. The homepage owns the only page `h1`; article
pages reserve `h1` for the article title and use the compact identity variant.
There is no `/posts` index: the homepage writing list is the index. The IndieWeb
Webring footer closes every route, including the homepage.

## Homepage hero and identity

`src/routes/__root.tsx` selects `IdentityCard` from
`src/components/IdentityCard.tsx`: the homepage receives `variant="full"` and
every other route receives `variant="compact"`. `src/styles/app.css` owns the
shared hero and compact-card rules; do not create a second header implementation.

Load the repository's `$wcygan-identity-models` skill before creating, editing,
reviewing, or debugging the homepage GitHub, LinkedIn, or Projects model links.
It owns the asset-quality, optical-centering, poster/video handoff, playback,
failure-recovery, and rendered-verification contract for these models.

### Full homepage hero

The hero replaces the retired header and About section. It is a single expressive
card on the established `#fdfdfc` canvas, followed directly by Writing and the
IndieWeb footer. Keep the card as the homepage visual reference, while article
pages remain quiet and editorial.

- `AsciiWordmark` is a Canvas particle field. It creates its text points from
  `Will Cygan`, responds to pointer movement, redraws with `ResizeObserver`, and
  stops its nonessential animation off-screen or under reduced motion. Keep it
  decorative (`aria-hidden`) and preserve its readable, settled reduced-motion
  frame.
- The `h1` is one baseline-aligned three-column row: `Will /wɪl/ Cygan
/tsɪˈɡɑːn/ • Software Engineer`. Keep the phonetics interleaved with the name,
  the bullet and role in the same row, and the identity link accessible as
  `Will Cygan`. Its sizing uses card-relative `cqi` units so the full phrase
  remains visible inside the 644px reading column; preserve the mobile override.
- `IdentityLinks` renders Resume, Email, GitHub, LinkedIn, and Projects. The
  full card uses a five-column/two-row model grid; each model link is a centered
  media-plus-label stack, with its label in normal flow underneath and a 44px
  minimum touch target. Do not absolutely position labels over the media.
- The encoded source canvases vary in size and are intentionally off-center;
  their geometric centers are not the visible model centers. Treat
  `--identity-model-center-x/y`, clipping, and the shared poster/video media
  transform as load-bearing when changing models or their dimensions.
- GitHub, LinkedIn, and Projects use transparent PNG posters and alpha VP9 WebM
  loops from `public/identity-card/`. The poster is visible only until playback
  starts, then it becomes fully hidden so the rotating model never doubles with
  its standstill frame. Do not restore opaque MP4 fallbacks, white mattes, or
  `mix-blend-mode` compensation. An unsupported animation format must leave the
  transparent still visible instead.
- Play animated models only while the link grid is in view, the document is
  visible, and reduced motion is not requested. Pause and restore the poster
  otherwise. At `prefers-reduced-motion: reduce`, hide the videos and keep the
  static transparent posters. Hover and focus may scale the media, but must not
  move labels or overlap other targets.

### Compact article identity

The compact variant is the only shared article header: a small Inter name/role
line followed by the five text links. It does not render the Canvas wordmark or
model media. Article pages place the visible 44px `← Back` link before the post
title; keep the page `h1` exclusively for that title.

## Homepage composition

The homepage is intentionally simple:

1. Full identity hero
2. Writing section
3. IndieWeb Webring footer

Writing uses a semantic heading and `aria-labelledby`. Keep the copy direct and
concrete. The whole writing row is the link; title and description stack without
dates or additional metadata.

Writing-row rules:

- Desktop rows extend `12px` beyond the reading edge, use `12px` padding and a
  `6px` radius, and reveal only the subtle hover surface.
- Mobile rows have no vertical padding and use the larger `28px` list gap.
- Keep post titles unchanged unless a writing task explicitly changes them.
- Homepage descriptions are sentence-case fragments of at most **eight words**.
  They have **no terminal period**.
- Descriptions should add an angle rather than repeat the title. This
  frontmatter also feeds page metadata, so do not silently replace it with long
  SEO copy.

## Article pages: migration target

The current article shell, title, date, basic prose, tables, code blocks, direct
figures, and TOC are a strong first pass. They are not the completion bar.
Future article work should make every reading primitive feel native to the same
warm-neutral system. Technical diagrams use the same restrained monochrome
direction unless domain meaning genuinely requires a scoped color exception.

Standardize and verify all of these:

- paragraphs, nested lists, links, headings, blockquotes, footnotes, and rules;
- inline code, Shiki blocks, copy buttons, SQL transcripts, and terminals;
- tables at narrow widths;
- figures, linked images, captions, diagrams, maps, Canvas, and ASCII art;
- the desktop TOC, including current-location state;
- the end-of-post rhythm and non-home footer.

Important boundaries:

- Direct-child `.post-content > ...` selectors establish top-level MDX rhythm
  without flattening diagram internals. Preserve that boundary, but add explicit
  scoped rules for nested editorial content such as list links, blockquotes, and
  captions.
- A figure owns its internal spacing. Images inside figures should not retain an
  independent large bottom margin; captions sit close to their media in muted
  type.
- Article controls must be discoverable without hover and provide at least a
  `44x44px` touch target. This includes code-copy and diagram controls.
- Tables and code may scroll inside their own container. The page itself must
  never scroll horizontally.
- The TOC is desktop-only. At `1180px` and wider, the `176px` fixed TOC may sit
  outside the reading column; verify that it never overlaps the article. Below
  that breakpoint, do not render an inline TOC or expose hidden TOC controls.

## CSS architecture and migration debt

`src/styles/app.css` still contains the retired design plus a late editorial
override layer. Treat that as migration debt, not a pattern to repeat.

- Shared shell, typography, and prose belong in `app.css` and should use
  semantic variables and scoped selectors.
- When touching a superseded rule, consolidate or remove the conflict instead of
  appending another override island.
- One canonical rule should own each shared primitive. Prefer low specificity
  and source order that is easy to reason about.
- Use the existing styling system. Do not introduce CSS Modules, CSS-in-JS, or
  inline style objects for shared editorial styling.
- Avoid `transition: all`; name the exact properties that move or fade.
- Use `will-change` only for observed transform, opacity, or filter stutter.
- Keep page-load motion quiet. Interactive transitions must remain
  interruptible, and reduced-motion users must retain the same information.
- Add a reduced-motion override for global smooth scrolling when that cleanup is
  in scope.

## Code blocks

Keep the Idle Toes palette synchronized between
`src/lib/syntax/idle-toes-theme.ts` and `src/styles/app.css`:

- Foreground `#ffffff`, background `#323232`, cursor `#d6d6d6`
- ANSI 0-7: `#323232`, `#d25252`, `#7fe173`, `#ffc66d`, `#4099ff`, `#f680ff`,
  `#bed6ff`, `#eeeeec`
- ANSI 8-15: `#606060`, `#f07070`, `#9dff91`, `#ffe48b`, `#5eb7f7`, `#ff9dff`,
  `#dcf4ff`, `#ffffff`

Code uses Lilex. Preserve syntax contrast, horizontal scrolling, copy feedback,
and readable wrapping around—not inside—code samples.

## Editorial diagrams and animations

Load the repository's `$wcygan-editorial-diagrams` skill before creating,
editing, reviewing, or debugging article diagrams or explanatory animation.
Inspect the owning MDX prose, the component shell in `src/components/`, and any
backing model, engine, renderer, viewport, and tests in `src/demos/`.

The approved visual reference is the N+1 query race on
`/n-plus-one-sql-query`, implemented by `NPlusOneQueryDemos.tsx` and the
`/* N+1 query race */` styles in `app.css`. Treat it as a craft benchmark, not a
layout template.

New or redesigned diagrams must:

- feel like part of the article rather than a miniature dashboard;
- default to black, white, and warm gray, using structure before color;
- explain one invariant through direct labels and inspectable state;
- use grouping, rhythm, line treatment, and persistent settled state to compare
  alternatives;
- move slowly enough for the reader to identify each causal beat;
- end with a concise status or quantified takeaway instead of looping forever;
- preserve the same lesson in a useful reduced-motion state;
- keep controls outside the stage with a `44x44px` minimum touch target; and
- be verified in the real MDX article on desktop and mobile.

Avoid colorful success/failure cards, badge collections, nested control panels,
decorative server/database illustrations, glossy gradients, ornamental legends,
and motion whose only purpose is activity. Saturated color requires a domain
reason that text, shape, position, pattern, or line treatment cannot express.

The shared article route automatically marks every rendered `<figure>` with
`data-article-graphic`, a route-local `data-graphic-id`, its inferred
`data-graphic-kind`, and an accessible-text-derived `data-graphic-label`. Open
an article with `?inspect=graphics` to outline and label the discovered figures,
or query `[data-article-graphic]` from browser tooling. Keep new article diagrams
inside a semantic `<figure>` so discovery remains automatic; use
`data-graphic-key`, `data-graphic-kind`, or `data-graphic-label` only when the
inferred metadata needs an explicit stable override. Do not maintain a separate
handwritten graphic index for discovery.

Author the outer editorial role with `data-graphic-frame="bare|plate|workbench"`,
not the renderer technology: use Bare for transparent or static reference media,
Plate for a self-contained explanatory figure, and Workbench only when readers
can operate controls. Every Plate and Workbench has exactly one authored
`data-graphic-stage="flush|padded"` on its intended visual region; Bare figures
have no stage. The route marker discovers and preserves this authored metadata,
but does not infer a stage from child order.

## Accessibility and responsive behavior

- Preserve semantic heading order and exactly one page `h1`.
- Keep `:focus-visible` obvious with a `2px` outline and `2px` offset.
- Do not rely on hover for content, controls, or state.
- Keep normal body text at least `16px` and maintain WCAG AA contrast.
- Use logical properties when introducing directional spacing or alignment.
- Ensure images and canvases scale within the reading column.
- Honor `prefers-reduced-motion` in every animated diagram and nonessential
  transition.
- Print may hide navigation, but it must preserve readable article content.

## Visual validation matrix

Rendered inspection is required for every visual or interaction change. A CSS
diff or passing test suite is not enough.

Check at least:

| Route                           | Purpose                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                             | Full hero wordmark, inline identity row, alpha model media, Writing rhythm, IndieWeb footer |
| `/talking-to-my-computer`       | Simple prose, figure, caption, post ending                                                  |
| `/change-data-capture`          | Code, lists, desktop TOC, and animated editorial diagrams                                   |
| `/n-plus-one-sql-query`         | Canonical monochrome comparison, pacing, Replay, and final summary                          |
| `/sharding-versus-partitioning` | Tables and Canvas behavior                                                                  |
| `/street-maps`                  | Map containment and responsive height                                                       |
| `/mermaid-diagrams`             | Static SVG rendering                                                                        |
| `/ascii-animation`              | Monospace art and overflow                                                                  |

For routine shell work, `/`, one simple post, and one rich post are the minimum.
Add the relevant specialized route whenever its primitive changes.

Verify at `1440x900` desktop and `390x844` mobile. Also cross the `1180px` TOC
breakpoint when article navigation changes. Confirm:

- no page-level horizontal overflow;
- shell width, gutters, and left-edge alignment;
- computed font family, size, weight, line-height, and color;
- heading and paragraph wrapping;
- keyboard focus, link, desktop TOC, copy, and diagram interactions;
- responsive images, tables, code, maps, SVG, Canvas, and ASCII; and
- reduced-motion behavior for animated content.

Run `deno task pre-commit` before considering a change complete. Run
`deno task build` when routes, MDX, static diagrams, or prerendering behavior
change. Stop only when source checks pass and the affected rendered states have
been inspected.
