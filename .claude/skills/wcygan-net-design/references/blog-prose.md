# Blog prose & markdown conventions

Companion to `blog-mdx.md` (which covers frontmatter, routing, and build mechanics). This file covers **writing** — voice, when to reach for which markdown feature, and the shape of a post.

There are three posts. This guide names what already works, fixes the one real defect, and otherwise stays out of the way. Taste-level rules are called out as such; hard rules are few and load-bearing.

## The voice already on the page

Terse, first-person, unembellished, faintly dry. Opinions are stated flat. Hedging is rare. Sentences are short, fragments are legal, and one-line paragraphs do real work.

What works, with receipts:

- _"... It's fast and pretty"_ — starting a section with an ellipsis is a shrug, and shrugs are allowed.
- _"Anything other than the MacOS default terminal is fine, but Ghostty is *mega fine*!"_ — italics carry the joke; one unexpected phrase per post is plenty.
- _"Not much else to say, it just feels good."_ — a closing that refuses to perform.
- _"Meet Anton — a Kubernetes cluster that runs in my basement."_ — opens with the subject, not the setup.
- _"Find files on your computer"_ — an entire section body. Confident because it doesn't pad.

Where the voice drops and should be pulled back on:

- `anton.mdx` slides into vendor-site register with **bolded-benefit bullets** ("**High Availability**: Three control-plane nodes ensure…") and a `## Conclusion` that could live on any cloud provider's blog.
- `mermaid-diagrams.mdx` narrates from docs-voice — "This enables clear visualization of architectures, workflows, and processes" — with no first person and no opinion.

## Voice rules (imperatives, short list)

1. **First person, present tense by default.** "I use this." Not "This can be used."
2. **Open with the subject, not the runway.** No "In this post we'll explore." No "Let's dive into."
3. **State opinions flat.** "In my opinion, Zed feels nicer than VSCode." Not "Some developers may prefer Zed."
4. **Fragments are legal. Short is better than balanced.**
5. **Italicize one unexpected phrase per post.** _mega fine_ works because it's alone.
6. **Em-dashes and ellipses welcome. One `!` per post, max. No emoji.**
7. **Link as evidence, not decoration.** If a link isn't the source of a claim or something the reader should click and use, cut it. Don't link the same target twice.
8. **Close with a shrug or a concrete line — never `## Conclusion`.**
9. **Earn abstractions with receipts.** Before/after diffs, real terminal output, a hardware table — ground claims in something pasteable.
10. **Benefits lists are a smell.** If you're reaching for `**Bold Thing**: explainer`, rewrite as prose.

Anti-patterns to flag on review: "In this post…", `## Conclusion` / `## Introduction` / `## TL;DR`, bolded benefit bullets, emoji bullets, hedges ("arguably", "it could be said"), passive voice standing in for opinion ("is considered"), paragraphs cribbed from the tool's own landing page.

**Rule of thumb**: if a paragraph could appear on the vendor's marketing site, delete it.

## Markdown usage — where to reach for what

The blog likes markdown. Use it. These are the conventions, with the hard rules called out.

### Headings

- **Hard rule: no `#` H1 inside the body.** The page template renders the title from frontmatter as the only H1. Body sections start at `##`. `really-good-software.mdx` originally violated this — nine body H1s; it's now fixed and is the pattern to follow.
- `##` for major sections; `###` for subsections. Go no deeper than `###` without a reason.
- Short posts (under ~400 words) can skip headings entirely and rely on paragraph rhythm.
- Don't write a heading for a single-paragraph section. Merge it upward or drop the heading.

### Code blocks

- **Hard rule: always tag the language** — `bash`, `ts`, `tsx`, `rust`, `mdx`, `yaml`, `json`, `sql`, `markdown`. Shiki is build-time and can't highlight an untagged fence.
- Inline `` `code` `` for identifiers, file paths, and one-liners under ~40 chars.
- Trim shell output to the lines that matter. Long lockfile paste is noise; the `rg 'rpc'` block in `really-good-software.mdx` is the upper edge of acceptable.
- Prefer a before/after pair when the code block is the argument (see the `git merge` ladder in the LazyGit section).

### Line breaks & rhythm

- Blank line between paragraphs. No hard-wrap inside a paragraph; let the renderer wrap.
- For a soft break inside a section where a heading would be too loud, use the existing divider component:
  ```mdx
  <div class="section-rule" role="separator" aria-hidden="true" />
  ```
- If you reach for `section-rule` twice in a row, the section probably wants a `##` instead.
- Never stack `section-rule` immediately before or after a heading.

### Links

- Inline `[text](url)` for prose.
- The "bare URL as its own line under a heading" pattern (roundup posts) is fine as a single source line. It is **not a substitute for prose** — don't repeat the same URL inline two lines later.
- One canonical link per target per post.

### Tables

- Use for structured comparison or specs (see `anton.mdx` hardware grid).
- Never for prose. Never for a 2-row list where a sentence wins.

### Mermaid diagrams

- **Hard rule: every `<MermaidDiagram>` needs `accTitle` and `accDescr`** inside the diagram source. All examples in `mermaid-diagrams.mdx` model this. It's accessibility, not taste.
- Earn-its-keep test: does the diagram replace a paragraph of explanation? Use for architecture, state machines, sequence flows. Don't decorate.
- Pick `height` to fit content — roughly 300 for small flowcharts, 350 for state/git graphs, 500 for dense sequence diagrams.
- Always `import { MermaidDiagram } from "~/components/MermaidDiagram";` at the top of the MDX file.

### Images

- Pattern: `<div class="flex justify-center my-6"><img src="/file.jpg" alt="Required alt text" width="200" /></div>` (see `anton.mdx`).
- `alt` is mandatory. `width` explicit, proportional. Store the file in `public/`.

### Custom components

- `<aside class="pull-quote">` — at most **one per post**, reserved for a standout line. The `really-good-software.mdx` LazyGit pull-quote is the reference usage.
- Don't invent new class names for one-off flourishes. If a style isn't in `app.css`, either add it there and update `design.md`, or don't use it.

### Lists

- Bullets for genuinely unordered sets of three or more.
- Numbered only when order matters (steps, ranks).
- No single-item lists. If a list collapses to one sentence, write the sentence.

## Post archetypes

Four shapes covering everything written so far. Pick one and let it guide structure; don't force a post into a shape that doesn't fit.

**Roundup / reference** — one-sentence lede, `##` per item (or `###` under a grouping `##`), at most one code block or image per item, optional shrug closing. Bare-URL source line under each heading permitted. Reference: `really-good-software.mdx`.

**Project writeup** — lede paragraph, centered hero image, spec table if there's hardware/config to name, `##` sections for the decisions made with `###` subsections where needed, short final paragraph — **drop the `## Conclusion` heading**. Reference: `anton.mdx` (with the two weak spots fixed).

**Feature showcase / tutorial** — lede stating what shipped and why it matters, `## Examples` with `###` per variant, `## Usage` with one reference snippet, optional closing note. Reference: `mermaid-diagrams.mdx`.

**Essay / opinion** — lede that states the claim in the first sentence, 2–4 body paragraphs without aggressive sub-headings, optional `pull-quote` for the thesis, one concrete example (code or anecdote), a resolution paragraph. No boilerplate "Conclusion." No archetype reference yet — this one is aspirational.

## What is _not_ a rule

Explicitly non-prescriptive, to keep the cost of drafting low:

- Date format — the skill prescribes ISO `YYYY-MM-DD`; real posts use long form. Either is fine for rendering; follow whatever the existing `blog-mdx.md` says for new posts.
- Tag casing or plurality — low-value to police. `Kubernetes` and `kubernetes` both work.
- `description` tone — declarative fragment, gerund phrase, or sentence all acceptable; keep it under ~120 chars.
- Heading depth beyond the H1 rule — `##`/`###` is a default, not a law.
- Sentence length, em-dash count, exact pull-quote wording.

## The template

New posts should start by copying `src/posts/_template.mdx` and deleting what doesn't apply. The template is the style guide. This file is the footnotes.
