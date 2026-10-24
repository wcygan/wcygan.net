import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, posix } from "node:path";
import { parseArgs } from "node:util";
import ts from "typescript";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: "boolean" },
    ref: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(
    "Usage: bun scripts/audit-demo-copy.ts [--json] [--ref COMMIT]\n" +
      "Lists copy candidates in every article's imported component graph, including drafts.\n" +
      "Candidates require editorial review: titles, data labels, live state and accessible equivalents stay.",
  );
  process.exit(0);
}

const files = new Set(
  values.ref
    ? execFileSync("git", ["ls-tree", "-r", "--name-only", values.ref, "src"], {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
    : [...new Bun.Glob("**/*.{ts,tsx,mdx}").scanSync("src")].map(
        (file) => `src/${file}`,
      ),
);
const textCache = new Map<string, Promise<string>>();

function sourceText(file: string): Promise<string> {
  let text = textCache.get(file);
  if (!text) {
    text = values.ref
      ? Promise.resolve(
          execFileSync("git", ["show", `${values.ref}:${file}`], {
            encoding: "utf8",
            maxBuffer: 8 * 1024 * 1024,
          }),
        )
      : readFile(file, "utf8");
    textCache.set(file, text);
  }
  return text;
}

function resolveImport(from: string, specifier: string) {
  const base = specifier.startsWith("~/")
    ? `src/${specifier.slice(2)}`
    : specifier.startsWith(".")
      ? posix.normalize(`${dirname(from)}/${specifier}`)
      : undefined;
  if (!base) return;
  return [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
  ].find((file) => files.has(file));
}

const graph = new Map<string, string[]>();
async function imports(file: string) {
  const cached = graph.get(file);
  if (cached) return cached;
  const text = await sourceText(file);
  const specifiers = new Set<string>();
  if (file.endsWith(".mdx")) {
    for (const match of text.matchAll(
      /^import\s+[\s\S]*?\sfrom\s*["']([^"']+)["']/gm,
    )) {
      specifiers.add(match[1]);
    }
  } else {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) ||
        ts.isExportDeclaration(node)
      ) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          specifiers.add(node.moduleSpecifier.text);
        }
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument))
          specifiers.add(argument.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const dependencies = [...specifiers].flatMap((specifier) => {
    const resolved = resolveImport(file, specifier);
    return resolved ? [resolved] : [];
  });
  graph.set(file, dependencies);
  return dependencies;
}

const mounted = new Map<string, Set<string>>();
const posts = [...files].filter((file) => file.endsWith(".mdx")).sort();
for (const post of posts) {
  const visited = new Set<string>();
  const visit = async (file: string): Promise<void> => {
    if (visited.has(file)) return;
    visited.add(file);
    const owners = mounted.get(file) ?? new Set<string>();
    owners.add(post);
    mounted.set(file, owners);
    for (const dependency of await imports(file)) await visit(dependency);
  };
  await visit(post);
}

interface Candidate {
  file: string;
  line: number;
  kind: string;
  accessibleOnly: boolean;
  source: string;
}
const candidates: Candidate[] = [];
for (const file of [...mounted.keys()].sort()) {
  if (!file.startsWith("src/components/") && !file.startsWith("src/demos/"))
    continue;
  const text = await sourceText(file);
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const add = (node: ts.Node, kind: string, accessibleOnly = false) => {
    candidates.push({
      file,
      line:
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      kind,
      accessibleOnly,
      source: node.getText(source).replace(/\s+/g, " ").slice(0, 600),
    });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(source);
      const attributes = opening.attributes.getText(source);
      if (
        ["p", "figcaption", "small"].includes(tag) ||
        /(?:subtitle|helper|hint|eyebrow|kicker|guide|instruction)/i.test(
          attributes,
        )
      ) {
        add(node, tag, /sr-only|aria-hidden="true"/.test(attributes));
      }
      for (const attribute of opening.attributes.properties) {
        if (
          ts.isJsxAttribute(attribute) &&
          /^(?:caption|description|subtitle|hint|helperText)$/.test(
            attribute.name.getText(source),
          )
        ) {
          add(attribute, `prop:${attribute.name.getText(source)}`);
        }
      }
    }
    if (
      ts.isPropertyAssignment(node) &&
      /^(?:caption|description|subtitle|hint|helperText)$/.test(
        node.name.getText(source),
      )
    ) {
      add(node, `data:${node.name.getText(source)}`);
    }
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      ((node.text.length > 100 && node.text.trim().split(/\s+/).length >= 16) ||
        (node.text.trim().split(/\s+/).length >= 5 &&
          /\b(?:click|select|drag|watch|try|press|tap|choose|switch|adjust|replay|reset)\b/i.test(
            node.text,
          )))
    ) {
      add(node, "prose-literal");
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const report = {
  revision: values.ref ?? "working-tree",
  posts,
  modules: [...mounted].map(([file, owners]) => ({ file, posts: [...owners] })),
  candidates,
};
if (values.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `${posts.length} articles; ${mounted.size} imported modules; ${candidates.length} copy candidates (including meaningful state and accessible text).`,
  );
  for (const candidate of candidates) {
    console.log(
      `${candidate.file}:${candidate.line}\t${candidate.kind}${candidate.accessibleOnly ? " (accessible)" : ""}\t${candidate.source}`,
    );
  }
}
