// Slugs with a dot are treated as static assets (e.g. rss.xml,
// will_cygan_resume.pdf) and must bypass the $slug catch-all route so Nitro
// serves them from public/ verbatim. Changing this predicate silently breaks
// RSS and PDF delivery — keep the test next to it.
export function isStaticAssetSlug(slug: string): boolean {
  return slug.includes(".");
}
