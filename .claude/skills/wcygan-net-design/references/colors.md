# Colors

Eight colors. That's the whole palette. Do not add a ninth without updating `design.md` and `app.css` together.

## Full table

| Token | RGB | Hex | Usage |
|---|---|---|---|
| Primary green | `rgb(92, 139, 63)` | `#5c8b3f` | Post titles, bio-highlight background, header bottom border, H3 in post content, focus ring outline |
| Link green | `rgb(46, 104, 16)` | `#2e6810` | Body `<a>` tag color, `.post-content a` |
| Text primary | `rgb(0, 0, 0)` | `#000000` | Body text, H1, H2, site title |
| Text muted | `rgb(102, 102, 102)` | `#666666` | Post dates, `.post-meta` (italic), H2 in post content |
| Nav gray | `rgb(170, 170, 170)` | `#aaaaaa` | Header nav links |
| Border light | `rgb(222, 222, 222)` | `#dedede` | Tables, `<pre>`, code blocks, Mermaid containers |
| Surface | `rgb(249, 249, 249)` | `#f9f9f9` | `<pre>` background, table `<th>` background, Mermaid bg |
| Background | `rgb(255, 255, 255)` | `#ffffff` | Page background, banner text |

## Where they live in code

- Raw values appear in `src/styles/app.css` (that's fine — it's the design system file).
- Some are also mirrored as CSS variables under `@layer base :root` (`--color-primary`, `--color-primary-hover`, etc.) but **not every value has a variable** — the class-based usage (`.bio-highlight`, `.post-title`, `.post-meta`) is the canonical surface.
- `design.md` is the human-readable spec.

## NEVER / INSTEAD

- **NEVER** add a new hex literal in a component. **INSTEAD** use an existing named class (`.bio-highlight`, `.post-title`) or add the color to `app.css` first.
- **NEVER** use Tailwind color scale classes in new work: `text-emerald-400`, `bg-zinc-700`, `text-gray-600`. **INSTEAD** use the named classes or raw palette values via `style=` only if truly one-off.
- **NEVER** introduce dark mode. The site is intentionally light-only. There is no `.dark` variant, no `prefers-color-scheme: dark` logic.
- **NEVER** use gradients. No `bg-gradient-*`, no CSS `linear-gradient(...)`. Flat fills only.

## Known drift

These are places where emerald/zinc Tailwind classes still exist and will eventually be migrated back to the palette. Do not expand them.

- `src/components/ExperienceCard.tsx` — uses `text-emerald-400`, `bg-zinc-700`, `text-zinc-300`. When touched, migrate to `rgb(92, 139, 63)` for green accents and `rgb(0,0,0)` / `rgb(102,102,102)` for text.
- `src/routes/about.tsx` — uses `text-emerald-400 hover:text-emerald-300` on inline `<a>` and `prose prose-emerald prose-invert`. The `prose-invert` is especially wrong for a light theme.
- Legacy `.post-content` overrides in `app.css` (lines ~332–389) forcibly override `bg-zinc-*`, `text-emerald-*`, `border-zinc-*` back to the palette — these are defensive overrides for MDX posts that inherited Tailwind scale classes from earlier iterations.

When migrating drift, update `design.md` only if the palette itself is changing (which should be rare).

## Accessibility ratios

All documented pairings in `design.md`:
- Black on white: 21:1 (AAA)
- Link green `#2e6810` on white: 4.5:1+ (AA)
- White on primary green `#5c8b3f`: 4.5:1+ (AA)

Do not introduce a color pairing without verifying ≥4.5:1 for body text.
