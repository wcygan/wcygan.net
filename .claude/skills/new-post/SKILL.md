---
name: new-post
description: Scaffold a new MDX blog post for wcygan.net. Creates `src/posts/<slug>.mdx` with correct frontmatter and prepends a matching `<item>` to `public/rss.xml` so the two stay in sync. Use when the user asks to "add a blog post", "new post", "write a post", or similar.
---

# new-post

Create a new blog post on wcygan.net by writing **both** the MDX file and the RSS entry in a single pass. The RSS feed is manually maintained (see project `CLAUDE.md` gotcha), so every post needs matching edits in two places.

## Inputs to gather

Before writing anything, confirm with the user:

1. **Title** — e.g. `Really Good Software`
2. **Description** — one-line summary, shown in lists and RSS
3. **Tags** — comma-separated, e.g. `Programming, CLI, Productivity`
4. **Slug** (optional) — derived from the title if not given: lowercase, spaces → `-`, drop punctuation. Confirm the slug before writing.

The date is always today's date in the user's local timezone. Do **not** ask for the date.

## Step 1 — Write `src/posts/<slug>.mdx`

Frontmatter shape (must match `remark-mdx-frontmatter` expectations — project `CLAUDE.md` gotcha #5):

```mdx
---
title: <Title>
date: <Month D, YYYY>
description: <Description>
tags: [<Tag1>, <Tag2>, ...]
---

<body — start with a short intro paragraph, then H2 sections>
```

Notes:

- `date` is a human-readable string like `November 1, 2025` — **not** ISO. Match `src/posts/really-good-software.mdx` for the canonical shape.
- `tags` is a YAML array of bare words (no quotes unless the tag has special chars).
- **Never use `#` (H1) inside the body.** The post title is already rendered as H1 from frontmatter; body sections start at `##`. `###` for subsections.
- Leave the body as a one-line TODO placeholder if the user hasn't provided content yet; they'll fill it in.
- For prose, voice, markdown-usage, and essay-structure conventions, see [`.claude/skills/wcygan-net-design/references/blog-prose.md`](../wcygan-net-design/references/blog-prose.md). A fully-worked reference template lives at [`templates/post.mdx`](templates/post.mdx).

## Step 2 — Prepend `<item>` to `public/rss.xml`

Insert the new item **immediately after** the `<language>en-us/>` line (i.e. as the first `<item>` in the feed, so the newest post is on top). Match the exact indentation and CDATA style of existing items:

```xml
    <item>
      <title><![CDATA[<Title>]]></title>
      <description><![CDATA[<Description>]]></description>
      <link>https://wcygan.net/<slug></link>
      <guid>https://wcygan.net/<slug></guid>
      <pubDate><RFC 822 date, e.g. Sat, 01 Nov 2025 00:00:00 GMT></pubDate>
      <category><Tag1></category>
      <category><Tag2></category>
    </item>
```

Notes:

- `pubDate` format: `Day, DD Mon YYYY 00:00:00 GMT` (RFC 822). Example: `Sat, 01 Nov 2025 00:00:00 GMT`. Always use `00:00:00 GMT`.
- One `<category>` per tag, in the same order as the MDX `tags` array.
- Blank line after the new `</item>` to match existing spacing.

## Step 3 — Tell the user what to run

After both files are written, output exactly:

> Created `src/posts/<slug>.mdx` and updated `public/rss.xml`. Run `bun run dev` to preview at `/<slug>`, then `bun run pre-commit` before committing.

## Do not

- Do **not** touch `src/routes/` — the `$slug` catch-all route picks up new posts automatically.
- Do **not** edit `src/lib/services/blog.ts` — it uses `import.meta.glob` and discovers new MDX files on build.
- Do **not** run `bun run build` or `bun run dev` yourself unless the user asks; the skill's job is the file writes.
- Do **not** invent content for the body — leave a placeholder if the user didn't supply one.
