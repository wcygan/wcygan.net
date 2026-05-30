export interface TableOfContentsItem {
  id: string;
  title: string;
  depth: 2 | 3;
}

export function slugBaseForHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "section";
}

export function uniqueHeadingId(
  text: string,
  usedIds: Map<string, number>,
): string {
  const baseId = slugBaseForHeading(text);
  const previousUses = usedIds.get(baseId) ?? 0;
  usedIds.set(baseId, previousUses + 1);

  if (previousUses === 0) {
    return baseId;
  }

  return `${baseId}-${previousUses}`;
}

export function shouldShowTableOfContents(
  items: readonly TableOfContentsItem[] | undefined,
): boolean {
  return (items?.length ?? 0) >= 2;
}
