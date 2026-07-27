#!/usr/bin/env -S deno run --allow-read=.

import { basename, dirname, extname, join, relative, resolve } from "node:path";

type AuditSignal = {
  detail?: string;
  label: string;
  present: boolean;
};

type AuditReport = {
  backingFiles: string[];
  component: string;
  componentName: string;
  css: {
    family: string | null;
    selectorMentions: number;
  };
  findings: string[];
  owningPosts: string[];
  signals: AuditSignal[];
  tests: string[];
};

const cliArgs = Deno.args.filter((argument) => argument !== "--json");
const jsonOutput = Deno.args.includes("--json");

if (cliArgs.length !== 1) {
  console.error("Usage: audit-demo.ts <src/components/Demo.tsx> [--json]");
  Deno.exit(2);
}

const repositoryRoot = await findRepositoryRoot(Deno.cwd());
const componentPath = resolve(repositoryRoot, cliArgs[0]);
const componentRelativePath = relative(repositoryRoot, componentPath);

if (
  componentRelativePath.startsWith("..") ||
  extname(componentPath) !== ".tsx"
) {
  console.error("Component must be a .tsx file inside this repository.");
  Deno.exit(2);
}

const componentSource = await readRequiredText(componentPath);
const componentName = basename(componentPath, ".tsx");
const backingRoots = extractBackingRoots(componentSource);
const backingFiles = (
  await Promise.all(
    backingRoots.map((root) =>
      collectFiles(join(repositoryRoot, "src", "demos", root), [".ts", ".tsx"]),
    ),
  )
).flat();
const tests = backingFiles
  .filter((path) => /\.test\.tsx?$/.test(path))
  .map((path) => relative(repositoryRoot, path));
const implementationFiles = backingFiles.filter(
  (path) => !/\.test\.tsx?$/.test(path),
);
const backingSources = await Promise.all(
  implementationFiles.map(async (path) => ({
    path,
    source: await Deno.readTextFile(path),
  })),
);
const demoSource = [
  componentSource,
  ...backingSources.map(({ source }) => source),
].join("\n");
const usesSharedLoopingEngine = /createLoopingCanvasEngine/.test(demoSource);
const sharedLoopingEngineSource = usesSharedLoopingEngine
  ? await readRequiredText(
      join(
        repositoryRoot,
        "src",
        "demos",
        "shared",
        "looping-canvas-engine.ts",
      ),
    )
  : "";
const combinedSource = `${demoSource}\n${sharedLoopingEngineSource}`;

const postFiles = await collectFiles(join(repositoryRoot, "src", "posts"), [
  ".mdx",
]);
const owningPosts = (
  await Promise.all(
    postFiles.map(async (path) => {
      const source = await Deno.readTextFile(path);
      return source.includes(componentName)
        ? relative(repositoryRoot, path)
        : "";
    }),
  )
).filter(Boolean);

const figureMarkup = componentSource.match(/<figure[\s\S]*?>/)?.[0] ?? "";
const graphicFrame =
  figureMarkup.match(/data-graphic-frame="([^"]+)"/)?.[1] ?? null;
const cssFamily =
  figureMarkup.match(/className="([^"]+)"/)?.[1].split(/\s+/)[0] ?? null;
const appCssPath = join(repositoryRoot, "src", "styles", "app.css");
const appCss = await readRequiredText(appCssPath);
const selectorMentions = cssFamily
  ? countMatches(appCss, new RegExp(`\\.${escapeRegExp(cssFamily)}\\b`, "g"))
  : 0;
const usesCanvas = /<canvas\b|CanvasRenderingContext2D|getContext\(["']2d/.test(
  combinedSource,
);
const usesAnimationFrames = /requestAnimationFrame/.test(combinedSource);
const usesModuloTimeline =
  /progress[\s\S]{0,120}%\s*1\b/.test(combinedSource) ||
  usesSharedLoopingEngine;
const checksReducedMotion = /prefers-reduced-motion/.test(combinedSource);
const handlesLiveMotionPreference = /addEventListener\(\s*["']change["']/.test(
  combinedSource,
);
const handlesVisibility = /visibilitychange|document\.hidden/.test(
  combinedSource,
);
const hasReplay =
  /DemoReplayButton|aria-label=["'][^"']*Replay|>\s*Replay\s*</.test(
    componentSource,
  );
const hasStableKey = /data-graphic-key=/.test(figureMarkup);
const hasAccessibleTitle =
  /aria-labelledby=/.test(figureMarkup) &&
  /article-graphic-title/.test(componentSource);
const hasDescription = /aria-describedby=/.test(figureMarkup);
const stageCount = countMatches(componentSource, /data-graphic-stage=/g);
const expectedStageCount =
  graphicFrame === "bare"
    ? 0
    : graphicFrame === "plate" || graphicFrame === "workbench"
      ? 1
      : null;
const hasCorrectStageCount =
  expectedStageCount !== null && stageCount === expectedStageCount;
const hasCompletionState = /isComplete|complete|completed|synchronized/.test(
  combinedSource,
);
const cleansFrames =
  !usesAnimationFrames || /cancelAnimationFrame/.test(combinedSource);
const removesListeners =
  !/addEventListener/.test(combinedSource) ||
  /removeEventListener/.test(combinedSource);
const hasTimeBasedPlayback =
  usesAnimationFrames ||
  usesModuloTimeline ||
  /setInterval/.test(combinedSource);

const signals: AuditSignal[] = [
  { label: "Semantic figure", present: Boolean(figureMarkup) },
  {
    label: "Authored graphic frame",
    present: graphicFrame !== null,
    detail: graphicFrame ?? undefined,
  },
  {
    label: "Frame/stage contract",
    present: hasCorrectStageCount,
    detail: `${graphicFrame ?? "missing frame"}; ${stageCount} stage${
      stageCount === 1 ? "" : "s"
    } found`,
  },
  { label: "Stable graphic key", present: hasStableKey },
  { label: "Accessible editorial title", present: hasAccessibleTitle },
  { label: "Static description", present: hasDescription },
  { label: "Replay control", present: hasReplay },
  { label: "Observable completion state", present: hasCompletionState },
  { label: "Canvas renderer", present: usesCanvas },
  { label: "Animation frame playback", present: usesAnimationFrames },
  { label: "Modulo or shared looping engine", present: usesModuloTimeline },
  { label: "Reduced-motion handling", present: checksReducedMotion },
  {
    label: "Live motion-preference listener",
    present: handlesLiveMotionPreference,
  },
  { label: "Visibility-aware lifecycle", present: handlesVisibility },
  { label: "Animation frame cleanup", present: cleansFrames },
  { label: "Listener cleanup", present: removesListeners },
  {
    label: "Canonical CSS family found",
    present: selectorMentions > 0,
    detail: cssFamily
      ? `.${cssFamily}: ${selectorMentions} mentions`
      : "figure class not detected",
  },
  {
    label: "Backing tests found",
    present: tests.length > 0,
    detail: `${tests.length} found`,
  },
];

const findings: string[] = [];

if (usesModuloTimeline) {
  findings.push(
    "Playback appears to revive through modulo progress or the shared looping engine.",
  );
}
if (hasTimeBasedPlayback && !hasReplay) {
  findings.push("Time-based playback has no discoverable Replay control.");
}
if (checksReducedMotion && !handlesLiveMotionPreference) {
  findings.push(
    "Reduced motion is detected without an observable mounted change listener.",
  );
}
if (usesAnimationFrames && !handlesVisibility) {
  findings.push(
    "Frame playback is not visibly paused for document visibility.",
  );
}
if (!hasCorrectStageCount) {
  findings.push(
    graphicFrame === "bare"
      ? `Bare figures must not author a stage; found ${stageCount}.`
      : `Plate and Workbench figures require exactly one authored stage; found ${stageCount}.`,
  );
}
if (!hasAccessibleTitle || !hasDescription) {
  findings.push(
    "The figure is missing the current title/description accessibility contract.",
  );
}
if (!hasStableKey) {
  findings.push("No stable data-graphic-key is authored.");
}
if (tests.length === 0) {
  findings.push("No backing demo test file was discovered.");
}
if (usesCanvas) {
  findings.push(
    "Canvas is present; decide from the lesson and geometry whether to retain it or move label-heavy structure to DOM/CSS.",
  );
}

const report: AuditReport = {
  backingFiles: backingFiles.map((path) => relative(repositoryRoot, path)),
  component: componentRelativePath,
  componentName,
  css: {
    family: cssFamily,
    selectorMentions,
  },
  findings,
  owningPosts,
  signals,
  tests,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

function printReport(report: AuditReport) {
  console.log(`Demo migration audit: ${report.componentName}`);
  console.log(`Component: ${report.component}`);
  console.log(
    `Owning post${report.owningPosts.length === 1 ? "" : "s"}: ${
      report.owningPosts.join(", ") || "none discovered"
    }`,
  );
  console.log(
    `Backing files: ${
      report.backingFiles.length > 0
        ? report.backingFiles.length
        : "none discovered"
    }`,
  );
  console.log(
    `CSS family: ${
      report.css.family
        ? `.${report.css.family} (${report.css.selectorMentions} mentions)`
        : "not detected"
    }`,
  );
  console.log("\nSignals");
  for (const signal of report.signals) {
    console.log(
      `${signal.present ? "[yes]" : "[ no]"} ${signal.label}${
        signal.detail ? ` — ${signal.detail}` : ""
      }`,
    );
  }
  console.log("\nMigration findings");
  if (report.findings.length === 0) {
    console.log("- No common automated migration risks detected.");
  } else {
    for (const finding of report.findings) console.log(`- ${finding}`);
  }
  console.log(
    "\nNext: read the owning prose and rendered route, state the invariant and acceptance frames, then choose the representation manually.",
  );
}

async function findRepositoryRoot(start: string) {
  let current = resolve(start);

  while (true) {
    if (
      (await exists(join(current, "AGENTS.md"))) &&
      (await exists(join(current, "src", "components")))
    ) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error("Could not find the wcygan.net repository root.");
    }
    current = parent;
  }
}

function extractBackingRoots(source: string) {
  return [
    ...new Set(
      [...source.matchAll(/~\/demos\/([^/"']+)/g)].map((match) => match[1]),
    ),
  ];
}

async function collectFiles(directory: string, extensions: string[]) {
  if (!(await exists(directory))) return [];

  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) {
      files.push(...(await collectFiles(path, extensions)));
    } else if (entry.isFile && extensions.includes(extname(entry.name))) {
      files.push(path);
    }
  }

  return files.sort();
}

async function readRequiredText(path: string) {
  try {
    return await Deno.readTextFile(path);
  } catch {
    console.error(`Could not read ${path}`);
    Deno.exit(2);
  }
}

async function exists(path: string) {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

function countMatches(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
