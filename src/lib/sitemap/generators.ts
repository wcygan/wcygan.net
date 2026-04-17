export const SITE_URL = "https://wcygan.net";
export const SITE_TITLE = "Will Cygan";
export const SITE_DESCRIPTION =
  "Senior Software Engineer at LinkedIn building the Checkout & Order placement experience.";

export interface PostEntry {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

function escXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Parses "November 1, 2025" or "2025-11-01" as UTC midnight so the resulting
// ISO / RFC-822 strings are TZ-independent. Without this, "November 1, 2025"
// would parse as local midnight and drift by the machine's UTC offset.
function parseDateAsUtc(input: string): Date | null {
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  );
}

function toIsoDate(input: string): string {
  const d = parseDateAsUtc(input);
  return d ? d.toISOString().slice(0, 10) : "";
}

function toRfc822(input: string): string {
  const d = parseDateAsUtc(input);
  return d ? d.toUTCString() : "";
}

export function generateRobotsTxt(): string {
  return [
    "# https://wcygan.net/robots.txt",
    "# Regenerated on every build — do not edit by hand.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
    "# Content Signals (contentsignals.org) — personal blog, content meant to",
    "# be read and shared. Flip these if the author's stance changes.",
    "Content-Signal: search=yes, ai-train=yes, ai-input=yes",
    "",
  ].join("\n");
}

export function buildSitemapEntries(
  staticPaths: string[],
  posts: Pick<PostEntry, "slug" | "date">[],
  buildDate: Date = new Date(),
): SitemapEntry[] {
  const buildIso = buildDate.toISOString().slice(0, 10);
  const staticEntries: SitemapEntry[] = staticPaths.map((p) => ({
    loc: `${SITE_URL}${p}`,
    lastmod: buildIso,
  }));
  const postEntries: SitemapEntry[] = posts.map((post) => ({
    loc: `${SITE_URL}/${post.slug}`,
    lastmod: toIsoDate(post.date) || buildIso,
  }));
  return [...staticEntries, ...postEntries];
}

export function generateSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${entry.lastmod}</lastmod>`
        : "";
      return `  <url>\n    <loc>${escXml(entry.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function generateRssXml(posts: PostEntry[]): string {
  const items = posts
    .map((post) => {
      const categories = post.tags
        .map((tag) => `\n      <category>${escXml(tag)}</category>`)
        .join("");
      return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description}]]></description>
      <link>${SITE_URL}/${post.slug}</link>
      <guid>${SITE_URL}/${post.slug}</guid>
      <pubDate>${toRfc822(post.date)}</pubDate>${categories}
    </item>`;
    })
    .join("\n\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(SITE_TITLE)}</title>
    <description>${escXml(SITE_DESCRIPTION)}</description>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>

${items}
  </channel>
</rss>
`;
}

export function parseFrontmatter(raw: string): Record<string, unknown> | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const result: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const trimmed = rawValue.trim();
    if (/^\[.*\]$/.test(trimmed)) {
      result[key] = trimmed
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      result[key] = trimmed.slice(1, -1);
    } else {
      result[key] = trimmed;
    }
  }
  return result;
}

export function frontmatterToPost(
  slug: string,
  fm: Record<string, unknown>,
): PostEntry | null {
  const title = typeof fm.title === "string" ? fm.title : null;
  const date = typeof fm.date === "string" ? fm.date : null;
  if (!title || !date) return null;
  const description = typeof fm.description === "string" ? fm.description : "";
  const tags = Array.isArray(fm.tags)
    ? (fm.tags.filter((t) => typeof t === "string") as string[])
    : [];
  return { slug, title, date, description, tags };
}

export function sortPostsByDateDesc(posts: PostEntry[]): PostEntry[] {
  return [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function deriveStaticPathsFromFilenames(files: string[]): string[] {
  const paths = new Set<string>();
  for (const file of files) {
    const base = file.replace(/\.(tsx|ts|jsx|js)$/, "");
    if (base.startsWith("$") || base.startsWith("__")) continue;
    if (base === "index") {
      paths.add("/");
    } else {
      paths.add(`/${base}`);
    }
  }
  return [...paths].sort((a, b) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });
}
