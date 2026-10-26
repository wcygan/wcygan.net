import { lessons, type LessonId } from "./model";

export const WIDTH = 640;
const ROUTER_HEIGHT = 56;
const LEAF_HEIGHT = 134;
const ROUTER_Y = 60;
const PAGE_GAP = 40;
const leafY = (routerY: number) =>
  routerY + (ROUTER_HEIGHT + LEAF_HEIGHT) / 2 + PAGE_GAP;
const SECOND_ROUTER_Y =
  leafY(ROUTER_Y) + (LEAF_HEIGHT + ROUTER_HEIGHT) / 2 + PAGE_GAP;
const stageHeight = (routerY: number) => leafY(routerY) + LEAF_HEIGHT / 2 + 24;
export type EntryState = "active" | "found" | "checked" | "muted" | "new";
export interface Entry {
  key: string;
  value?: string;
  state?: EntryState;
}
export interface Page {
  id: string;
  title: string;
  entries: Entry[];
  kind: "branch" | "leaf";
  x: number;
  y: number;
  width: number;
  height: number;
  state?: EntryState;
}
export interface TreeLink {
  from: string;
  to: string;
  kind: "branch" | "leaf" | "handoff";
  active: boolean;
}
export interface TreeGroup {
  id: string;
  title: string;
  pages: Page[];
  links: TreeLink[];
}
export interface TreeVisual {
  groups: TreeGroup[];
  query: string;
  result?: string;
  height: number;
}

const names = [
  "Liam",
  "Ava",
  "Noah",
  "Emma",
  "Oliver",
  "Mia",
  "Leo",
  "Isla",
  "Zoe",
];
const record = (id: number, state?: EntryState): Entry => ({
  key: String(id).padStart(2, "0"),
  value: names[id - 1],
  state,
});
const nameEntry = (id: number, state?: EntryState): Entry => ({
  key: names[id - 1],
  value: `→ ${id}`,
  state,
});
const primaryEntries = () => [
  [record(1), record(2), record(3)],
  [record(4), record(5), record(6)],
  [record(7), record(8), record(9)],
];
const secondaryEntries = () => [
  [nameEntry(2), nameEntry(4), nameEntry(8)],
  [nameEntry(7), nameEntry(1), nameEntry(6)],
  [nameEntry(3), nameEntry(5), nameEntry(9)],
];

interface TreeOptions {
  rootY?: number;
  rootState?: EntryState;
  leafStates?: (EntryState | undefined)[];
  activeBranches?: number[];
  activeLeafLinks?: number[];
}

function tree(
  id: string,
  title: string,
  leaves: Entry[][],
  options: TreeOptions = {},
): TreeGroup {
  const centers = leaves.length === 2 ? [208, 432] : [112, 320, 528];
  const root: Page = {
    id: `${id}-root`,
    title: "Keys",
    entries: leaves.slice(1).map((entries) => ({
      key: /^\d+$/.test(entries[0].key)
        ? String(Number(entries[0].key))
        : entries[0].key,
    })),
    kind: "branch",
    x: 320,
    y: options.rootY ?? ROUTER_Y,
    width: 164,
    height: ROUTER_HEIGHT,
    state: options.rootState,
  };
  for (const branch of options.activeBranches ?? []) {
    const separator = root.entries[Math.max(0, branch - 1)];
    if (separator) separator.state = "active";
  }
  if (options.activeBranches?.length)
    for (const entry of root.entries)
      if (entry.state !== "active") entry.state = "muted";
  const pages = [
    root,
    ...leaves.map(
      (entries, index): Page => ({
        id: `${id}-leaf-${index + 1}`,
        title: `Page ${index + 1}`,
        entries,
        kind: "leaf",
        x: centers[index],
        y: leafY(root.y),
        width: 176,
        height: LEAF_HEIGHT,
        state:
          options.leafStates?.[index] ??
          (options.activeBranches?.length &&
          !options.activeBranches.includes(index)
            ? "muted"
            : undefined),
      }),
    ),
  ];
  const links: TreeLink[] = pages.slice(1).map((page, index) => ({
    from: root.id,
    to: page.id,
    kind: "branch",
    active: options.activeBranches?.includes(index) ?? false,
  }));
  for (let i = 1; i < pages.length - 1; i++)
    links.push({
      from: pages[i].id,
      to: pages[i + 1].id,
      kind: "leaf",
      active: options.activeLeafLinks?.includes(i - 1) ?? false,
    });
  return { id, title, pages, links };
}

function primary(leaves = primaryEntries(), options: TreeOptions = {}) {
  return tree("primary", "Primary index · ID + row", leaves, options);
}
function secondary(leaves = secondaryEntries(), options: TreeOptions = {}) {
  return tree("secondary", "Name index · name + ID", leaves, options);
}
function mark(
  leaves: Entry[][],
  matches: (entry: Entry) => boolean,
  state: EntryState,
): Entry[][] {
  return leaves.map((entries) =>
    entries.map((entry) => (matches(entry) ? { ...entry, state } : entry)),
  );
}
function handoff(from: TreeGroup, to: TreeGroup, active: boolean) {
  from.links.push({
    from: `${from.id}-leaf-3`,
    to: `${to.id}-root`,
    kind: "handoff",
    active,
  });
}

export function visual(id: LessonId, step: number): TreeVisual {
  const lesson = lessons.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Unknown indexing lesson: ${id}`);
  const s = Math.max(0, Math.min(Math.floor(step), lesson.stepCount - 1));
  let groups: TreeGroup[] = [];
  let query = "";
  let result: string | undefined;
  let height = stageHeight(ROUTER_Y);

  if (id === "scan") {
    const entries = primaryEntries().map((leaf, index) =>
      leaf.map((entry) => ({
        ...entry,
        state:
          index < s
            ? entry.key === "09"
              ? ("found" as const)
              : ("checked" as const)
            : undefined,
      })),
    );
    groups = [
      primary(entries, {
        rootState: "muted",
        leafStates: [
          s > 0 ? "checked" : undefined,
          s > 1 ? "checked" : undefined,
          s > 2 ? "found" : undefined,
        ],
        activeLeafLinks: s > 2 ? [0, 1] : s > 1 ? [0] : [],
      }),
    ];
    query = "SELECT * FROM people WHERE name = 'Zoe'";
    result =
      s === 3 ? "9 rows checked · Zoe found" : `${s * 3} of 9 rows checked`;
  }

  if (id === "tree") {
    const entries =
      s === 2
        ? mark(primaryEntries(), (entry) => entry.key === "09", "found")
        : primaryEntries();
    groups = [
      primary(entries, {
        rootState: s >= 1 ? "active" : undefined,
        leafStates: [
          undefined,
          undefined,
          s === 2 ? "found" : s === 1 ? "active" : undefined,
        ],
        activeBranches: s >= 1 ? [2] : [],
      }),
    ];
    query = "SELECT * FROM people WHERE id = 9";
    result = s === 2 ? "2 pages visited · 1 matching row" : undefined;
  }

  if (id === "secondary" || id === "cover") {
    const nameLeaves =
      s > 0
        ? mark(secondaryEntries(), (entry) => entry.key === "Zoe", "found")
        : secondaryEntries();
    const nameTree = secondary(nameLeaves, {
      rootState: s > 0 ? "active" : undefined,
      leafStates: [undefined, undefined, s > 0 ? "found" : undefined],
      activeBranches: s > 0 ? [2] : [],
    });
    const recordLeaves =
      id === "secondary" && s === 2
        ? mark(primaryEntries(), (entry) => entry.key === "09", "found")
        : primaryEntries();
    const recordTree = primary(recordLeaves, {
      rootY: SECOND_ROUTER_Y,
      rootState: id === "cover" ? "muted" : s === 2 ? "active" : undefined,
      leafStates:
        id === "cover"
          ? ["muted", "muted", "muted"]
          : [undefined, undefined, s === 2 ? "found" : undefined],
      activeBranches: id === "secondary" && s === 2 ? [2] : [],
    });
    if (id === "secondary") handoff(nameTree, recordTree, s === 2);
    groups = [nameTree, recordTree];
    query =
      id === "cover"
        ? "SELECT name, id FROM people WHERE name = 'Zoe'"
        : "SELECT * FROM people WHERE name = 'Zoe'";
    result =
      s === 2
        ? id === "cover"
          ? "Name + ID returned · 1 tree lookup"
          : "2 tree lookups · ID 9 returned"
        : undefined;
    height = stageHeight(SECOND_ROUTER_Y);
  }

  if (id === "compound") {
    const entries: Entry[][] = [
      [
        { key: "Ava", value: "→ 2" },
        { key: "Mia", value: "→ 6" },
        { key: "Zoe", value: "→ 9" },
      ],
      [
        { key: "Ava", value: "→ 12" },
        { key: "Mia", value: "→ 16" },
        { key: "Zoe", value: "→ 19" },
      ],
    ];
    const marked =
      s === 1
        ? [
            entries[0].map((entry) => ({ ...entry, state: "found" as const })),
            entries[1],
          ]
        : s === 2
          ? entries.map((leaf) =>
              leaf.map((entry) => ({
                ...entry,
                state:
                  entry.key === "Zoe"
                    ? ("found" as const)
                    : ("checked" as const),
              })),
            )
          : entries;
    const compound = tree("compound", "City + name index", marked, {
      rootState: s === 1 ? "active" : s === 2 ? "muted" : undefined,
      activeBranches: s === 1 ? [0] : [],
      activeLeafLinks: s === 2 ? [0] : [],
      leafStates:
        s === 1 ? ["found", undefined] : s === 2 ? ["active", "active"] : [],
    });
    compound.pages[0].entries = [
      { key: "Boston", state: s === 1 ? "active" : undefined },
    ];
    compound.pages[1].title = "Austin";
    compound.pages[2].title = "Boston";
    compound.pages[1].width = 208;
    compound.pages[2].width = 208;
    compound.pages[1].x = 196;
    compound.pages[2].x = 444;
    groups = [compound];
    result =
      s === 1
        ? "Austin entries are together"
        : s === 2
          ? "Zoe appears in both city groups"
          : undefined;
    query = s === 2 ? "WHERE name = 'Zoe'" : "WHERE city = 'Austin'";
  }

  if (id === "writes") {
    const definitions: {
      id: string;
      title: string;
      separators: string[];
      entries: Entry[];
    }[] = [
      {
        id: "write-primary",
        title: "Primary index",
        separators: ["4", "7"],
        entries: [record(7), record(8), record(9)],
      },
      {
        id: "write-name",
        title: "Name index",
        separators: ["Leo", "Noah"],
        entries: [nameEntry(3), nameEntry(5), nameEntry(9)],
      },
      {
        id: "write-city",
        title: "City index",
        separators: ["Boston"],
        entries: [
          { key: "Boston", value: "→ 4" },
          { key: "Boston", value: "→ 8" },
          { key: "Boston", value: "→ 9" },
        ],
      },
    ];
    groups = definitions.map((definition, index) => {
      const active = index < 2 ? s >= 1 : s === 2;
      const entries = definition.entries
        .filter((_, entryIndex) => entryIndex < 2 || active)
        .map((entry, entryIndex) => ({
          ...entry,
          state: entryIndex === 2 && active ? ("new" as const) : undefined,
        }));
      const x = [112, 320, 528][index];
      const root: Page = {
        id: `${definition.id}-root`,
        title: "Keys",
        entries: definition.separators.map((key, index) => ({
          key,
          state:
            active && index === definition.separators.length - 1
              ? "active"
              : undefined,
        })),
        kind: "branch",
        x,
        y: ROUTER_Y,
        width: 176,
        height: ROUTER_HEIGHT,
        state: active ? "active" : undefined,
      };
      const leaf: Page = {
        id: `${definition.id}-leaf`,
        title: "Last page",
        entries,
        kind: "leaf",
        x,
        y: leafY(root.y),
        width: 176,
        height: LEAF_HEIGHT,
        state: active ? "new" : undefined,
      };
      return {
        id: definition.id,
        title: definition.title,
        pages: [root, leaf],
        links: [{ from: root.id, to: leaf.id, kind: "branch", active }],
      };
    });
    query = "INSERT INTO people VALUES (9, 'Zoe', 'Boston')";
    result =
      s === 2
        ? "3 index entries maintained · 1 logical insert"
        : s === 1
          ? "Primary + name entries added · city entry still pending"
          : undefined;
  }

  return { groups, query, result, height };
}
