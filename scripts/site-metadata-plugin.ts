import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import {
  buildSitemapEntries,
  deriveStaticPathsFromFilenames,
  frontmatterToPost,
  generateRobotsTxt,
  generateRssXml,
  generateSitemapXml,
  parseFrontmatter,
  sortPostsByDateDesc,
  type PostEntry,
} from "../src/lib/sitemap/generators";

interface PluginOptions {
  projectRoot?: string;
  postsDir?: string;
  routesDir?: string;
  outputDir?: string;
}

function readPosts(postsDir: string): PostEntry[] {
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".mdx"));
  const posts: PostEntry[] = [];
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(postsDir, file), "utf8");
    const fm = parseFrontmatter(raw);
    if (!fm) continue;
    const post = frontmatterToPost(slug, fm);
    if (post) posts.push(post);
  }
  return sortPostsByDateDesc(posts);
}

function readStaticPaths(routesDir: string): string[] {
  if (!fs.existsSync(routesDir)) return [];
  return deriveStaticPathsFromFilenames(fs.readdirSync(routesDir));
}

export function siteMetadataPlugin(options: PluginOptions = {}): Plugin {
  const projectRoot = options.projectRoot ?? process.cwd();
  const postsDir = options.postsDir ?? path.join(projectRoot, "src/posts");
  const routesDir = options.routesDir ?? path.join(projectRoot, "src/routes");
  const outputDir =
    options.outputDir ?? path.join(projectRoot, ".output/public");

  // TanStack Start + Nitro triggers closeBundle once per sub-build (client,
  // SSR, server). Our output is the same every time, so write on the first
  // call that finds .output/public and skip the rest.
  let written = false;

  return {
    name: "wcygan-site-metadata",
    apply: "build",
    closeBundle: {
      order: "post",
      sequential: true,
      handler() {
        if (written) return;
        if (!fs.existsSync(outputDir)) return;
        const posts = readPosts(postsDir);
        const staticPaths = readStaticPaths(routesDir);
        fs.writeFileSync(
          path.join(outputDir, "robots.txt"),
          generateRobotsTxt(),
        );
        fs.writeFileSync(
          path.join(outputDir, "sitemap.xml"),
          generateSitemapXml(buildSitemapEntries(staticPaths, posts)),
        );
        fs.writeFileSync(
          path.join(outputDir, "rss.xml"),
          generateRssXml(posts),
        );
        written = true;
        console.log(
          `[site-metadata] wrote robots.txt, sitemap.xml, rss.xml ` +
            `(${posts.length} posts, ${staticPaths.length} static paths)`,
        );
      },
    },
  };
}
