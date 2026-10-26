import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    base: { type: "string", default: "https://wcygan.localhost" },
    output: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(
    "Usage: bun scripts/verify-reading-path.ts [--base URL] [--output DIR]\n" +
      "Start the blog with just dev first. Requires the installed agent-browser CLI.\n" +
      "Checks desktop/mobile reading and keyboard navigation; saves screenshots and report.json.",
  );
  process.exit(0);
}

const base = new URL(values.base);
const output = values.output
  ? resolve(values.output)
  : await mkdtemp(join(tmpdir(), "wcygan-reading-"));
await mkdir(output, { recursive: true });

const session = `reading-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
const routes = [
  "/",
  "/talking-to-my-computer",
  "/change-data-capture",
  "/n-plus-one-sql-query",
  "/sharding-versus-partitioning",
  "/street-maps",
  "/mermaid-diagrams",
  "/ascii-animation",
];
const reports: Record<string, unknown>[] = [];
const localLinks = new Set<string>();
let context = "browser startup";

async function browser(...args: string[]): Promise<Record<string, unknown>> {
  const command = Bun.spawn(
    ["agent-browser", "--session", session, "--json", ...args],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(command.stdout).text(),
    new Response(command.stderr).text(),
    command.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`agent-browser ${args[0]} failed: ${stderr || stdout}`);
  }
  const response = JSON.parse(stdout);
  if (!response.success) {
    throw new Error(`agent-browser ${args[0]} failed: ${response.error}`);
  }
  return response.data;
}

async function evaluate<T>(expression: string): Promise<T> {
  const data = await browser(
    "eval",
    "-b",
    Buffer.from(expression).toString("base64"),
  );
  return data.result as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`${context}: ${message}`);
}

async function open(route: string) {
  await browser("open", "--ignore-https-errors", new URL(route, base).href);
  await browser(
    "wait",
    "--fn",
    route === "/"
      ? "!!document.querySelector('#writing + .home-writing-list a')"
      : "!!document.querySelector('.post-content') && document.querySelector('.post-content').textContent.trim().length > 80 && !/^Loading\\.{3}$/.test(document.querySelector('.post-content').textContent.trim())",
  );
  await evaluate(
    "document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))",
  );
}

async function screenshot(name: string) {
  await browser("screenshot", join(output, `${name}.png`));
}

async function inspect(route: string, viewport: string) {
  context = `${viewport} ${route}`;
  const result = await evaluate<{
    failures: string[];
    localLinks: string[];
    [key: string]: unknown;
  }>(String.raw`(() => {
    const failures = [];
    const check = (condition, message) => { if (!condition) failures.push(message); };
    const main = document.querySelector('main#main-content');
    const article = document.querySelector('article.blog-post');
    const toc = document.querySelector('nav[aria-label="Table of contents"]');
    const visible = element => !!element && element.getClientRects().length > 0;
    const text = element => element?.textContent.trim() ?? '';
    const rect = element => {
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    const typography = element => {
      if (!element) return null;
      const style = getComputedStyle(element);
      return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'].map(key => [key, style[key]]));
    };
    check(document.documentElement.scrollWidth <= innerWidth + 1, 'Page scrolls horizontally: ' + document.documentElement.scrollWidth + 'px at ' + innerWidth + 'px');
    check(document.querySelectorAll('h1').length === 1, 'Expected exactly one page h1');
    check(main?.getAttribute('tabindex') === '-1', 'main#main-content must accept skip-link focus');
    check(document.querySelector('.skip-link')?.getAttribute('href') === '#main-content', 'Skip link must point to #main-content');
    check(document.title.includes('Will Cygan'), 'Page title is missing site identity');
    check(!!document.querySelector('meta[name="description"]')?.content.trim(), 'Description metadata is missing');
    check(!!document.querySelector('meta[name="viewport"]'), 'Responsive viewport metadata is missing');
    const nestedLinks = [...document.querySelectorAll('.post-content > ul a, .post-content > ol a, .post-content > blockquote a')].map(link => {
      const style = getComputedStyle(link);
      check(style.color === 'rgb(33, 32, 28)', 'Editorial list/quote link has unexpected color: ' + text(link) + ' (' + style.color + ')');
      check(style.textDecorationLine.includes('underline'), 'Editorial list/quote link needs an underline: ' + text(link));
      return { text: text(link), color: style.color, decoration: style.textDecorationLine };
    });
    const copyButtons = [...document.querySelectorAll('button[data-code-copy]')].map(button => {
      const label = button.querySelector('[data-label="' + button.dataset.copyLabel + '"]');
      check(text(label) === 'Copy' && getComputedStyle(label).opacity === '1', 'Code-copy control must have visible text Copy');
      check(button.getAttribute('aria-label') === 'Copy code', 'Code-copy control needs an accessible name');
      check(!!button.closest('.shiki').querySelector('[data-code-copy-status][role="status"]'), 'Code-copy control needs persistent live feedback');
      check(button.dataset.copyState === 'idle', 'Initial code-copy state must be observable as idle');
      check(button.getBoundingClientRect().height >= 44 && button.getBoundingClientRect().width >= 44, 'Code-copy target must be at least 44px square');
      return { text: text(label), state: button.dataset.copyState, ...rect(button) };
    });
    if (article) {
      const navigation = [...article.querySelectorAll('a.post-back-link')];
      check(navigation.length === 2, 'Expected top and bottom Writing links');
      for (const link of navigation) {
        check(link.getAttribute('href') === '/#writing', 'Writing navigation must return to /#writing');
        check(text(link) === '← Writing', 'Writing navigation must have the direct name ← Writing');
        check(link.getBoundingClientRect().height >= 44, 'Writing navigation needs a 44px target');
      }
      check(!!article.querySelector('time[datetime]')?.getAttribute('datetime'), 'Publication date metadata is missing');
      check(!toc?.querySelector('h2'), 'TOC has a redundant visible heading');
      if (visible(toc)) {
        check(innerWidth >= 1180, 'TOC must remain hidden below 1180px');
        check(toc.getBoundingClientRect().left >= article.getBoundingClientRect().right, 'TOC overlaps article');
        for (const link of toc.querySelectorAll('a')) {
          check(link.getBoundingClientRect().height >= 44, 'TOC link needs a 44px target: ' + text(link));
        }
      }
    } else {
      check(document.querySelector('h2#writing')?.getAttribute('tabindex') === '-1', 'Writing heading must accept return-navigation focus');
    }
    return {
      failures, url: location.href, viewport: { width: innerWidth, height: innerHeight },
      pageWidth: document.documentElement.scrollWidth,
      title: document.title, heading: text(document.querySelector('h1')),
      container: rect(document.querySelector('.site-container')),
      h1Typography: typography(document.querySelector('h1')),
      proseTypography: typography(document.querySelector('.post-content > p')),
      tocVisible: visible(toc), nestedLinks, copyButtons,
      localLinks: [...new Set([...document.querySelectorAll('main a[href], .home-writing-list a[href]')]
        .map(link => new URL(link.href, location.href))
        .filter(url => url.origin === location.origin && /^\/(?:[^/.]+\/?)?$/.test(url.pathname))
        .map(url => url.pathname))],
    };
  })()`);
  reports.push({ route, viewport, ...result });
  result.localLinks.forEach((link) => localLinks.add(link));
  assert(result.failures.length === 0, result.failures.join("\n"));
  console.log(`✓ ${context}`);
}

async function checkKeyboard() {
  context = "keyboard navigation";
  await open("/");
  await browser("press", "Tab");
  assert(
    await evaluate("document.activeElement?.matches('a.skip-link')"),
    "First Tab must focus the visible skip link",
  );
  await screenshot("keyboard-skip-link");
  await browser("press", "Enter");
  await browser(
    "wait",
    "--fn",
    "document.activeElement?.id === 'main-content'",
  );
  await open("/talking-to-my-computer");
  await browser("focus", "article > .post-back-link");
  await browser("press", "Enter");
  await browser(
    "wait",
    "--fn",
    "location.pathname === '/' && location.hash === '#writing' && document.activeElement?.id === 'writing' && Math.abs(document.getElementById('writing').getBoundingClientRect().top) < 1",
  );
  await screenshot("keyboard-writing-return");
  console.log("✓ Skip link and Writing return move keyboard focus");

  context = "Back/Forward reading position";
  await evaluate(
    "document.querySelector('a[href=\"/ascii-animation\"]').scrollIntoView({ behavior: 'instant', block: 'center' })",
  );
  const homeY = await evaluate<number>(
    "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(scrollY))))",
  );
  assert(
    homeY > 800,
    `Writing-list history check needs a meaningful scroll position; got ${homeY}px`,
  );
  await browser("click", 'a[href="/ascii-animation"]');
  await browser(
    "wait",
    "--fn",
    "location.pathname === '/ascii-animation' && document.querySelector('.post-content')?.textContent.trim().length > 80",
  );
  await evaluate("scrollTo({ top: 400, behavior: 'instant' })");
  await browser("wait", "--fn", "Math.abs(scrollY - 400) < 2");
  const articleY = await evaluate<number>("scrollY");
  await browser("back");
  await browser(
    "wait",
    "--fn",
    `location.pathname === '/' && !!document.querySelector('#writing + .home-writing-list a') && Math.abs(scrollY - ${homeY}) < 2`,
  );
  await screenshot("history-writing-back");
  await browser("forward");
  await browser(
    "wait",
    "--fn",
    `location.pathname === '/ascii-animation' && document.querySelector('.post-content')?.textContent.trim().length > 80 && Math.abs(scrollY - ${articleY}) < 2`,
  );
  await screenshot("history-article-forward");
  reports.push({ check: "history-scroll-restoration", homeY, articleY });
  console.log(
    `✓ Back restores Writing at ${homeY}px; Forward restores article at ${articleY}px`,
  );
}

async function checkToc() {
  context = "TOC breakpoint and current location";
  await open("/change-data-capture");
  for (const width of [1179, 1180]) {
    await browser("set", "viewport", String(width), "900");
    const visible = await evaluate<boolean>(
      "!!document.querySelector('nav[aria-label=\"Table of contents\"]')?.getClientRects().length",
    );
    assert(
      visible === (width === 1180),
      `TOC visibility is incorrect at ${width}px`,
    );
    await inspect("/change-data-capture", `${width}x900`);
  }
  const target = await evaluate<string>(
    "document.querySelectorAll('nav[aria-label=\"Table of contents\"] a')[1]?.getAttribute('href')",
  );
  assert(
    target,
    "CDC article needs a section link for current-location verification",
  );
  await browser(
    "click",
    `nav[aria-label="Table of contents"] a[href=${JSON.stringify(target)}]`,
  );
  await browser(
    "wait",
    "--fn",
    `document.querySelector('nav[aria-label="Table of contents"] a[aria-current="location"]')?.getAttribute('href') === ${JSON.stringify(target)}`,
  );
  await screenshot("toc-section-current-1180");
  console.log(
    "✓ TOC breakpoint, targets, and current location after section click",
  );
}

try {
  console.log(`Verifying ${base.origin}; evidence: ${output}`);
  await browser("open", "--ignore-https-errors", new URL("/", base).href);
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await browser("set", "viewport", String(width), String(height));
    for (const route of routes) {
      await open(route);
      await inspect(route, `${width}x${height}`);
      const name = route === "/" ? "home" : route.slice(1);
      await screenshot(`${name}-${width}`);
      const primitive = await evaluate<string | null>(
        "document.querySelector('.post-content pre') ? '.post-content pre' : document.querySelector('.post-content figure') ? '.post-content figure' : null",
      );
      if (primitive) {
        await browser("scrollintoview", primitive);
        await screenshot(`${name}-content-${width}`);
      }
    }
  }
  await checkKeyboard();
  await checkToc();
  context = "reduced motion";
  await browser("set", "media", "light", "reduced-motion");
  assert(
    await evaluate(
      "matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.documentElement).scrollBehavior === 'auto'",
    ),
    "Reduced motion must disable smooth document scrolling",
  );
  console.log("✓ Reduced motion disables smooth scrolling");

  context = "local article links";
  const broken = await evaluate<string[]>(`(async () => {
    const queue = ${JSON.stringify([...localLinks])};
    const broken = [];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const path = queue.shift();
        try {
          const response = await fetch(path, { method: 'HEAD' });
          if (!response.ok) broken.push(path + ' → ' + response.status);
        } catch (error) { broken.push(path + ' → ' + String(error)); }
      }
    }));
    return broken;
  })()`);
  assert(broken.length === 0, broken.join("\n"));
  console.log(
    `✓ ${localLinks.size} unique local article paths respond successfully`,
  );
  console.log(`Reading paths passed. Inspect screenshots in ${output}`);
} catch (error) {
  reports.push({ failure: String(error), context });
  await screenshot("failure").catch(() => {});
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  try {
    await writeFile(
      join(output, "report.json"),
      JSON.stringify(reports, null, 2) + "\n",
    );
  } finally {
    await browser("close").catch((error) =>
      console.error(`Could not close ${session}: ${error}`),
    );
  }
}
