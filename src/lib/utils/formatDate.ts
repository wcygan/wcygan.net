// Date helpers for conroy-style post dates.
//
// Posts store their date in human-readable form in MDX frontmatter
// (e.g. "November 1, 2025"). For semantics we also want the machine-readable
// ISO form (e.g. "2025-11-01") inside `<time datetime="…">`, and for display
// an uppercase variant (e.g. "NOVEMBER 1, 2025").

export function toIsoDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    // Fall back to the raw string — better to pass through than to throw.
    return date;
  }
  const yyyy = parsed.getUTCFullYear().toString().padStart(4, "0");
  const mm = (parsed.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = parsed.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function toDisplayDate(date: string): string {
  return date.toUpperCase();
}
