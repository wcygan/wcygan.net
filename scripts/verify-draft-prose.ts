import { createProcessor } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { uniqueHeadingId } from "../src/lib/table-of-contents";

type Node = {
  type: string;
  value?: string;
  depth?: number;
  name?: string | null;
  children?: Node[];
  url?: string;
  lang?: string | null;
  meta?: string | null;
};

const base = Bun.argv[2] ?? "HEAD";
const processor = createProcessor({
  remarkPlugins: [remarkFrontmatter, remarkGfm],
});

function withoutLocations(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutLocations);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !["position", "data"].includes(key))
        .map(([key, item]) => [key, withoutLocations(item)]),
    );
  }
  return value;
}

const kafkaFigures = [
  "KafkaRecordFigure",
  "KafkaTopicFigure",
  "KafkaPartitioningDemo",
  "KafkaHotKeyDemo",
  "KafkaBrokerPlacementDemo",
];

function inspect(source: string, kafka = false) {
  const protectedNodes: unknown[] = [];
  const visualNodes: string[] = [];
  const figures: string[] = [];
  const links = new Set<string>();
  const headings: { depth: number; title: string; id: string }[] = [];
  const ids = new Map<string, number>();
  function text(node: Node): string {
    return node.value ?? (node.children ?? []).map(text).join("");
  }
  function visit(node: Node) {
    if (node.type === "yaml") {
      protectedNodes.push({ type: node.type, value: node.value });
    } else if (node.type === "table") {
      protectedNodes.push(withoutLocations(node));
    } else if (node.type === "code") {
      protectedNodes.push({
        type: node.type,
        lang: node.lang,
        meta: node.meta,
        value: node.value,
      });
    }
    const approvedFigure =
      kafka &&
      node.type === "mdxJsxFlowElement" &&
      kafkaFigures.includes(node.name ?? "");
    if (approvedFigure && node.name) figures.push(node.name);
    const approvedImport =
      kafka &&
      node.type === "mdxjsEsm" &&
      !node.value
        ?.replace(
          /import\s*\{[^}]*\}\s*from\s*["']~\/components\/(?:KafkaFoundationFigures|KafkaPartitioningDemo|KafkaRoutingDemos)["'];?/g,
          "",
        )
        .trim();
    if (
      (node.type.startsWith("mdx") && !approvedFigure && !approvedImport) ||
      ["image", "imageReference", "html"].includes(node.type) ||
      (node.type === "code" && node.lang === "mermaid")
    )
      visualNodes.push(node.type);
    if (node.url) links.add(node.url);
    if (node.type === "heading" && node.depth) {
      const title = text(node).trim().replace(/\s+/g, " ");
      headings.push({
        depth: node.depth,
        title,
        id: uniqueHeadingId(title, ids),
      });
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(processor.parse(source));
  return { protectedNodes, visualNodes, figures, links, headings };
}

function dependencyFailures(value: unknown, headings: { id: string }[]) {
  const failures: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value))
    return ["Learning-order record must be an object"];
  const startingKnowledge: unknown = Reflect.get(value, "startingKnowledge");
  const prerequisites: unknown = Reflect.get(value, "prerequisites");
  if (typeof startingKnowledge !== "string" || !startingKnowledge.trim())
    failures.push(
      "Learning-order record must describe the reader's starting knowledge",
    );
  if (
    !prerequisites ||
    typeof prerequisites !== "object" ||
    Array.isArray(prerequisites)
  )
    return [
      ...failures,
      "Learning-order record must map headings to prerequisites",
    ];
  const order = new Map(headings.map(({ id }, index) => [id, index]));
  for (const { id } of headings) {
    if (!Object.hasOwn(prerequisites, id))
      failures.push(`Missing learning-order node: ${id}`);
  }
  for (const [id, dependencies] of Object.entries(prerequisites)) {
    const position = order.get(id);
    if (position === undefined)
      failures.push(`Unknown learning-order node: ${id}`);
    if (!Array.isArray(dependencies)) {
      failures.push(`Prerequisites must be an array: ${id}`);
      continue;
    }
    for (const dependency of dependencies) {
      const dependencyPosition =
        typeof dependency === "string" ? order.get(dependency) : undefined;
      if (dependencyPosition === undefined) {
        failures.push(`Unknown prerequisite for ${id}: ${String(dependency)}`);
      } else if (position !== undefined && dependencyPosition >= position) {
        failures.push(`Prerequisite ${dependency} must precede ${id}`);
      }
    }
  }
  return failures;
}

let failed = false;
for await (const path of new Bun.Glob("src/posts/*.draft.mdx").scan(".")) {
  const proc = Bun.spawn(["git", "show", `${base}:${path}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [original, error, status] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (status) throw new Error(error);
  const before = inspect(original);
  const kafka = path === "src/posts/apache-kafka.draft.mdx";
  const after = inspect(await Bun.file(path).text(), kafka);
  const failures: string[] = [];
  if (
    JSON.stringify(
      before.protectedNodes.map((node) => JSON.stringify(node)).sort(),
    ) !==
    JSON.stringify(
      after.protectedNodes.map((node) => JSON.stringify(node)).sort(),
    )
  )
    failures.push("Frontmatter, tables, or code changed");
  if (after.visualNodes.length)
    failures.push(`Unexpected visual markup: ${after.visualNodes.join(", ")}`);
  if (kafka && JSON.stringify(after.figures) !== JSON.stringify(kafkaFigures))
    failures.push(
      "Kafka must contain the approved Record, Topic, Partitions sequence",
    );
  for (const url of before.links) {
    if (kafka && url === "/kafka-partitioning") continue;
    if (!url.startsWith("#") && !after.links.has(url))
      failures.push(`Removed source link: ${url}`);
  }
  const headingIds = new Set(after.headings.map(({ id }) => id));
  for (const url of after.links) {
    if (url.startsWith("#") && !headingIds.has(url.slice(1)))
      failures.push(`Broken local heading link: ${url}`);
  }
  let previousDepth = 1;
  for (const { depth, title } of after.headings) {
    if (depth === 1 || depth > previousDepth + 1)
      failures.push(`Invalid heading hierarchy: ${title}`);
    previousDepth = depth;
  }
  const slug = path.replace("src/posts/", "").replace(".draft.mdx", "");
  const learningOrder = Bun.file(`notes/draft-learning-order/${slug}.json`);
  if (!(await learningOrder.exists())) {
    failures.push(`Missing learning-order record for ${slug}`);
  } else {
    const record: unknown = await learningOrder.json();
    failures.push(...dependencyFailures(record, after.headings));
  }
  if (failures.length) {
    failed = true;
    console.error(`${path}:\n${failures.join("\n")}`);
  } else {
    console.log(
      `${path}: content preserved; ${after.headings.length} headings in prerequisite order`,
    );
  }
}
if (failed) process.exit(1);
