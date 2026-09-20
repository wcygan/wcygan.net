---
name: related-reading
description: Add or update related-reading links for wcygan.net posts, keeping article references, frontmatter metadata, homepage indicators, and responsive rendering in sync.
---

# Related reading

Use this skill when a post should point readers to a book, chapter, course, or
other companion resource, or when the related-reading treatment needs to be
reviewed on an article and the homepage.

## Repository contract

Related reading has one visual surface and one data surface:

1. The article opens with a shared reference component that owns the resource
   artwork, title, external links, and chapter/concept links.
2. The optional frontmatter value records the relationship for indexing and
   future navigation, but the homepage writing list stays a clean list of posts
   and does not render a mini icon or nested resource link.

Keep the article reference and frontmatter value tied to the same canonical
resource name. Do not label unrelated posts merely because they share a broad
topic.

## Add a related resource

1. Read `AGENTS.md`, the target post, `src/lib/types.ts`,
   `src/lib/services/post-index.ts`, `src/components/HomeWritingList.tsx`, and
   the existing shared reference component before editing.
2. Add an optional `relatedReading` frontmatter value using the exact canonical
   display name, for example:

   ```yaml
   relatedReading: Database Internals
   ```

   Keep the field optional so ordinary posts remain unassociated. Make sure the
   post index copies it into `Post`; absent metadata should stay absent.

3. Put the shared reference component near the beginning of the article, after
   imports and before the first explanatory section. For Database Internals, use
   `DatabaseInternalsReference` and pass the relevant chapter number and the
   concept the post teaches. Extend the shared registry when adding a chapter
   rather than duplicating O'Reilly URLs or book-cover markup in MDX.
4. For a new resource, create a focused shared article component rather than
   adding resource-specific markup to the homepage writing list. Keep the entire
   homepage writing row as its only link and do not add a nested resource link
   or mini card there.

## Rendering and accessibility

- Keep the article cover image descriptive and its external link explicit.
- Preserve intrinsic image dimensions and constrain the rendered article cover
  in CSS; do not use a background image that cannot be inspected or announced.
- Use the existing editorial palette, spacing, and writing-row hover behavior;
  related-reading metadata must not turn the homepage list into a card or badge
  collection.
- Check the article reference at 390px. Check that the homepage writing list
  remains its normal single-column layout without resource artwork or page-level
  horizontal overflow.
- Keep the article component's external links keyboard accessible, visibly
  focused, and explicit about their destination.

## Verification

After editing related-reading metadata or components:

1. Run the targeted component/index tests, then `deno task typecheck`.
2. Render the real homepage and each affected article with `agent-browser` at
   `1440x900` and `390x844`. Confirm the homepage has no related-reading mini
   indicators, while each affected article has the cover image, exact title,
   relevant links, and no horizontal overflow.
3. Run `deno task pre-commit`; run `deno task build` when MDX, frontmatter,
   routing, or prerendered output changed.
4. Finish with `git diff --check` and review the scoped diff. Report any
   unrelated dirty files instead of folding them into the change.

The change is complete only when the canonical name, article reference, homepage
list behavior, accessible text, and responsive layout all agree.
