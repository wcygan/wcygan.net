import { describe, it, expect } from "vitest";
import {
  buildSitemapEntries,
  deriveStaticPathsFromFilenames,
  frontmatterToPost,
  generateRobotsTxt,
  generateRssXml,
  generateSitemapXml,
  parseFrontmatter,
  sortPostsByDateDesc,
  SITE_URL,
  type PostEntry,
} from "./generators";

describe("parseFrontmatter", () => {
  it("parses the actual post frontmatter format", () => {
    const raw = [
      "---",
      "title: Kubernetes in the Basement",
      "date: May 23, 2025",
      "description: Building a Kubernetes cluster in my basement",
      "tags: [Kubernetes, Talos, Homelab]",
      "---",
      "",
      "body content",
    ].join("\n");
    const fm = parseFrontmatter(raw);
    expect(fm).toEqual({
      title: "Kubernetes in the Basement",
      date: "May 23, 2025",
      description: "Building a Kubernetes cluster in my basement",
      tags: ["Kubernetes", "Talos", "Homelab"],
    });
  });

  it("returns null when no frontmatter block present", () => {
    expect(parseFrontmatter("no frontmatter here")).toBeNull();
  });

  it("handles quoted values", () => {
    const raw = ["---", 'title: "Has: colon"', "date: Jan 1, 2025", "---"].join(
      "\n",
    );
    expect(parseFrontmatter(raw)).toEqual({
      title: "Has: colon",
      date: "Jan 1, 2025",
    });
  });
});

describe("frontmatterToPost", () => {
  it("requires title and date", () => {
    expect(frontmatterToPost("x", { title: "X" })).toBeNull();
    expect(frontmatterToPost("x", { date: "Jan 1, 2025" })).toBeNull();
  });

  it("defaults missing description and tags", () => {
    const post = frontmatterToPost("x", {
      title: "X",
      date: "Jan 1, 2025",
    });
    expect(post).toEqual({
      slug: "x",
      title: "X",
      date: "Jan 1, 2025",
      description: "",
      tags: [],
    });
  });
});

describe("deriveStaticPathsFromFilenames", () => {
  it("maps index to root, skips dynamic and layout routes", () => {
    const paths = deriveStaticPathsFromFilenames([
      "__root.tsx",
      "$slug.tsx",
      "index.tsx",
      "posts.tsx",
    ]);
    expect(paths).toEqual(["/", "/posts"]);
  });

  it("returns an empty list when only dynamic routes exist", () => {
    expect(deriveStaticPathsFromFilenames(["$slug.tsx", "__root.tsx"])).toEqual(
      [],
    );
  });
});

describe("sortPostsByDateDesc", () => {
  it("sorts newest first", () => {
    const posts: PostEntry[] = [
      { slug: "a", title: "A", date: "Jan 1, 2024", description: "", tags: [] },
      { slug: "b", title: "B", date: "Nov 1, 2025", description: "", tags: [] },
      { slug: "c", title: "C", date: "Jun 1, 2025", description: "", tags: [] },
    ];
    expect(sortPostsByDateDesc(posts).map((p) => p.slug)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });
});

describe("generateRobotsTxt", () => {
  it("contains sitemap reference and allow-all default", () => {
    const txt = generateRobotsTxt();
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Allow: /");
    expect(txt).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(txt).toContain("Content-Signal:");
  });
});

describe("buildSitemapEntries + generateSitemapXml", () => {
  const fixedDate = new Date("2026-04-17T00:00:00Z");

  it("produces a valid XML document with all paths", () => {
    const entries = buildSitemapEntries(
      ["/", "/posts"],
      [{ slug: "really-good-software", date: "Nov 1, 2025" }],
      fixedDate,
    );
    const xml = generateSitemapXml(entries);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<urlset");
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/posts</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/really-good-software</loc>`);
    expect(xml).toContain("<lastmod>2025-11-01</lastmod>");
    expect(xml).toContain("<lastmod>2026-04-17</lastmod>");
  });

  it("falls back to build date when post date is unparseable", () => {
    const entries = buildSitemapEntries(
      [],
      [{ slug: "bad", date: "not a date" }],
      fixedDate,
    );
    expect(entries[0]?.lastmod).toBe("2026-04-17");
  });
});

describe("generateRssXml", () => {
  const posts: PostEntry[] = [
    {
      slug: "really-good-software",
      title: "Really Good Software",
      date: "November 1, 2025",
      description: "Programs that I can't live without",
      tags: ["Programming", "CLI", "Productivity"],
    },
  ];

  it("wraps title and description in CDATA", () => {
    const xml = generateRssXml(posts);
    expect(xml).toContain("<![CDATA[Really Good Software]]>");
    expect(xml).toContain("<![CDATA[Programs that I can't live without]]>");
  });

  it("emits RFC-822 pubDate", () => {
    const xml = generateRssXml(posts);
    expect(xml).toContain("<pubDate>Sat, 01 Nov 2025 00:00:00 GMT</pubDate>");
  });

  it("emits a category element per tag", () => {
    const xml = generateRssXml(posts);
    expect(xml).toContain("<category>Programming</category>");
    expect(xml).toContain("<category>CLI</category>");
    expect(xml).toContain("<category>Productivity</category>");
  });

  it("includes channel self-link and link", () => {
    const xml = generateRssXml(posts);
    expect(xml).toContain(`<link>${SITE_URL}</link>`);
    expect(xml).toContain(
      `<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`,
    );
  });
});
