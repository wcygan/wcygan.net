import {
  type TableOfContentsItem,
  uniqueHeadingId,
} from "../src/lib/table-of-contents";

interface MarkdownNode {
  type?: string;
  value?: string;
  depth?: number;
  children?: MarkdownNode[];
  data?: {
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface VFileLike {
  data: {
    postToc?: TableOfContentsItem[];
    [key: string]: unknown;
  };
}

interface EstreeNode {
  type: string;
  [key: string]: unknown;
}

function textContent(node: MarkdownNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }

  return (node.children ?? []).map(textContent).join("");
}

function visit(node: MarkdownNode, callback: (node: MarkdownNode) => void) {
  callback(node);

  for (const child of node.children ?? []) {
    visit(child, callback);
  }
}

export function remarkPostToc() {
  return (tree: MarkdownNode, file: VFileLike) => {
    const usedIds = new Map<string, number>();
    const toc: TableOfContentsItem[] = [];

    visit(tree, (node) => {
      if (node.type !== "heading" || (node.depth !== 2 && node.depth !== 3)) {
        return;
      }

      const title = textContent(node).trim().replace(/\s+/g, " ");
      if (!title) {
        return;
      }

      const id = uniqueHeadingId(title, usedIds);
      node.data = node.data ?? {};
      node.data.hProperties = {
        ...node.data.hProperties,
        id,
      };

      toc.push({
        id,
        title,
        depth: node.depth,
      });
    });

    file.data.postToc = toc;
  };
}

function literal(value: string | number): EstreeNode {
  return {
    type: "Literal",
    value,
    raw: JSON.stringify(value),
  };
}

function property(name: string, value: EstreeNode): EstreeNode {
  return {
    type: "Property",
    kind: "init",
    method: false,
    shorthand: false,
    computed: false,
    key: {
      type: "Identifier",
      name,
    },
    value,
  };
}

function tocItemExpression(item: TableOfContentsItem): EstreeNode {
  return {
    type: "ObjectExpression",
    properties: [
      property("id", literal(item.id)),
      property("title", literal(item.title)),
      property("depth", literal(item.depth)),
    ],
  };
}

function tocExpression(items: readonly TableOfContentsItem[]): EstreeNode {
  return {
    type: "ArrayExpression",
    elements: items.map(tocItemExpression),
  };
}

export function recmaPostToc() {
  return (tree: { body: EstreeNode[] }, file: VFileLike) => {
    const toc = file.data.postToc ?? [];

    tree.body.unshift({
      type: "ExportNamedDeclaration",
      declaration: {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: {
              type: "Identifier",
              name: "toc",
            },
            init: tocExpression(toc),
          },
        ],
      },
      specifiers: [],
      source: null,
    });
  };
}
