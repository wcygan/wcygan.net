import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.argv[2] ?? "https://wcygan.localhost";
const output = resolve(process.argv[3] ?? "/tmp/wcygan-draft-reading");
const session = `draft-reading-${process.pid}`;
const reports: unknown[] = [];
const routes = [];
for await (const path of new Bun.Glob("src/posts/*.draft.mdx").scan(".")) {
  routes.push(path.replace("src/posts/", "").replace(".draft.mdx", ""));
}
if (!routes.length) throw new Error("No draft posts found");
await mkdir(output, { recursive: true });

async function browser(...args: string[]) {
  const proc = Bun.spawn(
    ["agent-browser", "--session", session, "--json", ...args],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code) throw new Error(err || out);
  const response = JSON.parse(out);
  if (!response.success) throw new Error(response.error);
  return response.data;
}
async function evaluate<T>(expression: string): Promise<T> {
  return (
    await browser("eval", "-b", Buffer.from(expression).toString("base64"))
  ).result;
}

async function inspectKafkaFigures(width: number) {
  const state = await evaluate<{
    keys: string[];
    records: string[];
    controls: string[];
    overflow: boolean;
  }>(`(() => {
    const figure = document.querySelector('[data-graphic-key="kafka-partitioning"]');
    return {
      keys: [...document.querySelectorAll('.post-content figure')].map(f => f.dataset.graphicKey),
      records: [...document.querySelectorAll('.kafka-foundation-topic-records > li')].map(e => e.dataset.recordId).sort(),
      controls: [...figure.querySelectorAll('button')].map(e => e.textContent.trim()),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  })()`);
  if (
    JSON.stringify(state.keys) !==
      JSON.stringify([
        "kafka-foundation-record",
        "kafka-foundation-topic",
        "kafka-partitioning",
        "kafka-hot-key",
        "kafka-broker-placement",
      ]) ||
    JSON.stringify(state.records) !==
      JSON.stringify(["A", "B", "C", "D", "E", "F"]) ||
    !state.controls.includes("Step") ||
    !state.controls.includes("Replay") ||
    state.overflow
  )
    throw new Error(`Kafka figures ${width}: ${JSON.stringify(state)}`);
  await evaluate(
    "document.querySelector('[data-graphic-key=kafka-partitioning]').scrollIntoView({block:'center',behavior:'instant'})",
  );
  await browser("wait", "1200");
  await browser("screenshot", `${output}/kafka-partitioning-${width}.png`);
  return state;
}

try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [320, 844],
    [360, 844],
    [430, 844],
  ]) {
    await browser("set", "viewport", String(width), String(height));
    if (width === 390) await browser("set", "media", "light", "reduced-motion");
    for (const route of width === 320 || width === 360 || width === 430
      ? ["apache-kafka"]
      : routes) {
      await browser("open", `${base}/${route}`);
      await browser("wait", ".post-content h2");
      await browser("wait", "1000");
      const report = await evaluate<{
        headings: number;
        graphics: number;
        figures: number;
        stages: number;
        visualResources: string[];
        overflow: boolean;
        h1: number;
        brokenToc: string[];
        tocVisible: boolean;
        codeBlocks: number;
        tables: number;
      }>(`(() => {
        const post = document.querySelector('.post-content');
        const toc = document.querySelector('nav[aria-label="Table of contents"]');
        return {
          headings: post.querySelectorAll('h2, h3').length,
          figures: post.querySelectorAll('figure').length,
          stages: post.querySelectorAll('[data-graphic-stage]').length,
          graphics: post.querySelectorAll('figure, [data-article-graphic], img, picture, canvas, svg, video, iframe').length,
          visualResources: performance.getEntriesByType('resource').map(e => e.name).filter(url => url.includes('/src/demos/') || url.includes('react-three') || url.includes('three_fiber') || url.includes('three_drei')),
          overflow: document.documentElement.scrollWidth > innerWidth,
          h1: document.querySelectorAll('h1').length,
          brokenToc: [...(toc?.querySelectorAll('a[href*="#"]') ?? [])].map(a => a.hash.slice(1)).filter(id => id && !document.getElementById(id)),
          tocVisible: !!toc && getComputedStyle(toc).display !== 'none' && toc.getBoundingClientRect().width > 0,
          codeBlocks: post.querySelectorAll('pre').length,
          tables: post.querySelectorAll('table').length
        };
      })()`);
      if (
        (route === "apache-kafka"
          ? report.figures !== 5 || report.stages !== 5
          : report.graphics !== 0 || report.visualResources.length !== 0) ||
        report.overflow ||
        report.h1 !== 1 ||
        report.brokenToc.length ||
        !report.headings ||
        report.tocVisible !== (width === 1440)
      ) {
        throw new Error(`${route} ${width}: ${JSON.stringify(report)}`);
      }
      await browser("screenshot", `${output}/${route}-${width}-intro.png`);
      const figures =
        route === "apache-kafka" ? await inspectKafkaFigures(width) : undefined;
      await evaluate(
        "document.querySelectorAll('.post-content h2')[2].querySelector('a').click()",
      );
      await browser("wait", "500");
      const anchor = await evaluate<boolean>(
        "!!document.getElementById(decodeURIComponent(location.hash.slice(1)))",
      );
      if (!anchor) throw new Error(`${route}: heading anchor failed`);
      await browser("screenshot", `${output}/${route}-${width}-section.png`);
      reports.push({
        route,
        width,
        height,
        ...report,
        figureInspection: figures,
      });
      await writeFile(
        `${output}/report.json`,
        JSON.stringify(reports, null, 2),
      );
      console.log(
        `${route} ${width}: expected figures, TOC and anchors pass; no overflow`,
      );
    }
  }
} finally {
  await browser("close");
}
console.log(`Screenshots and report: ${output}`);
