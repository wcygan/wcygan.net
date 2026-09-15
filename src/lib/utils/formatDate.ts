// Posts accept readable dates or quoted ISO timestamps with timezone offsets.
// Timestamps order same-day posts; article headers display only the calendar date.

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

/** Hide optional timestamp precision while preserving the author's calendar date. */
export function toDisplayDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(date)) return date;
  const day = new Date(date.slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(day.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(day);
}
