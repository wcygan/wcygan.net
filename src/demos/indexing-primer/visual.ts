import { lessons } from "./model";

export const WIDTH = 640;
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
  kind: "branch" | "leaf" | "memory";
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
  takeaway: string;
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
  leafY?: number;
  rootState?: EntryState;
  leafStates?: (EntryState | undefined)[];
  activeBranches?: number[];
  activeLeafLinks?: number[];
  leafHeight?: number;
  rootTitle?: string;
}

/** Coordinates are shared by SVG and 3D renderers; each page uses its center. */
function tree(
  id: string,
  title: string,
  leaves: Entry[][],
  options: TreeOptions = {},
): TreeGroup {
  const centers =
    leaves.length === 4
      ? [88, 240, 400, 552]
      : leaves.length === 2
        ? [208, 432]
        : leaves.length === 1
          ? [320]
          : [112, 320, 528];
  const root: Page = {
    id: `${id}-root`,
    title: options.rootTitle ?? "SEPARATOR KEYS",
    entries: leaves.slice(1).map((entries) => ({
      key: /^\d+$/.test(entries[0].key)
        ? String(Number(entries[0].key))
        : entries[0].key,
    })),
    kind: "branch",
    x: 320,
    y: options.rootY ?? 65,
    width: 164,
    height: 70,
    state: options.rootState,
  };
  for (const branch of options.activeBranches ?? []) {
    const separator = root.entries[Math.max(0, branch - 1)];
    if (separator) separator.state = "active";
  }
  const pages = [
    root,
    ...leaves.map(
      (entries, index): Page => ({
        id: `${id}-leaf-${index + 1}`,
        title: `LEAF ${index + 1}`,
        entries,
        kind: "leaf",
        x: centers[index],
        y: options.leafY ?? 210,
        width: leaves.length === 4 ? 136 : 176,
        height: options.leafHeight ?? 144,
        state: options.leafStates?.[index],
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
  return tree("primary", "PRIMARY INDEX · ID + RECORD", leaves, options);
}
function secondary(leaves = secondaryEntries(), options: TreeOptions = {}) {
  return tree("secondary", "NAME INDEX · NAME + PRIMARY KEY", leaves, options);
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

export function visual(id: string, step: number): TreeVisual {
  const lesson = lessons.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Unknown indexing lesson: ${id}`);
  const s = Math.max(0, Math.min(Math.floor(step), lesson.steps.length - 1));
  let groups: TreeGroup[] = [];
  let query = "";
  let takeaway = "";
  let height = 340;

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
    query = "WHERE name = 'Zoe'";
    takeaway =
      s === 3
        ? "9 records checked · Zoe found"
        : `${s * 3} of 9 records checked`;
  }

  if (id === "tree" || id === "insert") {
    let entries = primaryEntries();
    if (id === "insert" && s < 2) entries[2] = [record(7), record(8)];
    if (s === 2)
      entries = mark(
        entries,
        (entry) => entry.key === "09",
        id === "insert" ? "new" : "found",
      );
    groups = [
      primary(entries, {
        rootState: s >= 1 ? "active" : undefined,
        leafStates: [
          undefined,
          undefined,
          s === 2 ? (id === "insert" ? "new" : "found") : undefined,
        ],
        activeBranches: s >= 1 ? [2] : [],
      }),
    ];
    query = id === "insert" ? "INSERT ID 9, name 'Zoe'" : "WHERE id = 9";
    takeaway =
      s === 2
        ? id === "insert"
          ? "1 leaf changed · no table scan"
          : "2 index pages visited · 1 matching record"
        : "9 ≥ 7 · take the right branch";
  }

  if (id === "pages") {
    const entries =
      s > 0
        ? mark(primaryEntries(), (entry) => entry.key === "08", "found")
        : primaryEntries();
    const index = primary(entries, {
      rootState: s > 0 ? "active" : undefined,
      activeBranches: s > 0 ? [2] : [],
      leafStates: [undefined, undefined, s > 0 ? "active" : undefined],
      leafY: 195,
      leafHeight: 144,
    });
    index.pages.push({
      id: "memory-page",
      title: "BUFFER POOL · CACHED PAGE",
      entries: s === 2 ? [record(7), record(8, "found"), record(9)] : [],
      kind: "memory",
      x: 320,
      y: 380,
      width: 300,
      height: 144,
      state: s === 2 ? "found" : "muted",
    });
    index.links.push({
      from: "primary-leaf-3",
      to: "memory-page",
      kind: "handoff",
      active: s === 2,
    });
    groups = [index];
    query = "WHERE id = 8";
    takeaway =
      s === 2
        ? "1 page loaded · records 7, 8 and 9 available"
        : "Storage and memory work with whole pages";
    height = 490;
  }

  if (id === "split") {
    groups = [
      tree(
        "split",
        "PRIMARY INDEX · PAGE SPLIT",
        s === 2
          ? [
              [record(6), record(7)],
              [record(8), record(9, "new")],
            ]
          : [[record(6), record(7), record(8)]],
        {
          rootState: s === 2 ? "active" : undefined,
          leafStates:
            s === 2 ? ["active", "new"] : [s === 1 ? "active" : undefined],
          activeBranches: s === 2 ? [0, 1] : [],
          activeLeafLinks: s === 2 ? [0] : [],
          rootTitle: s === 2 ? "NEW SEPARATOR" : "PARENT PAGE",
        },
      ),
    ];
    if (s < 2) {
      groups[0].pages[0].title = "PARENT · ID ≥ 6";
      groups[0].pages[0].entries = [{ key: "≥ 6" }];
    }
    if (s === 1) {
      groups[0].pages.push({
        id: "incoming-record",
        title: "INCOMING",
        entries: [record(9, "new")],
        kind: "memory",
        x: 528,
        y: 65,
        width: 176,
        height: 70,
        state: "new",
      });
      groups[0].links.push({
        from: "incoming-record",
        to: "split-leaf-1",
        kind: "handoff",
        active: true,
      });
    }
    query = s === 1 ? "INSERT 9 · leaf is full" : "INSERT ID 9";
    takeaway =
      s === 2
        ? "Separator 8 · left keys < 8 · right keys ≥ 8"
        : s === 1
          ? "6, 7, 8 + incoming 9 · split needed"
          : "This leaf currently holds 6, 7, 8";
  }

  if (id === "secondary" || id === "cover" || id === "stable") {
    const nameLeaves =
      s > 0
        ? mark(secondaryEntries(), (entry) => entry.key === "Zoe", "found")
        : secondaryEntries();
    const nameTree = secondary(nameLeaves, {
      leafY: 200,
      rootState: s > 0 ? "active" : undefined,
      leafStates: [undefined, undefined, s > 0 ? "found" : undefined],
      activeBranches: s > 0 ? [2] : [],
    });
    let recordLeaves = primaryEntries();
    if (id === "stable")
      recordLeaves =
        s === 2
          ? [
              [record(7), record(8)],
              [{ ...record(9, "found"), value: "Zoe + bio" }],
            ]
          : [
              [
                record(7),
                record(8),
                {
                  ...record(9, s === 1 ? "new" : undefined),
                  value: s === 1 ? "Zoe + bio" : "Zoe",
                },
              ],
            ];
    else if (id === "secondary" && s === 2)
      recordLeaves = mark(recordLeaves, (entry) => entry.key === "09", "found");
    const recordTree = primary(recordLeaves, {
      rootY: 335,
      leafY: 470,
      rootState: id === "cover" ? "muted" : s === 2 ? "active" : undefined,
      leafStates:
        id === "cover"
          ? ["muted", "muted", "muted"]
          : id === "stable"
            ? s === 2
              ? [undefined, "found"]
              : s === 1
                ? ["new"]
                : []
            : [undefined, undefined, s === 2 ? "found" : undefined],
      activeBranches:
        id === "cover"
          ? []
          : id === "stable"
            ? s === 2
              ? [1]
              : []
            : s === 2
              ? [2]
              : [],
    });
    if (id === "stable") {
      recordTree.title = "PRIMARY INDEX · LAST BRANCH (ID ≥ 7)";
      for (const page of recordTree.pages.slice(1))
        page.width = s === 2 ? 208 : 300;
      recordTree.pages[0].title = s === 2 ? "NEW SEPARATOR" : "PARENT · ID ≥ 7";
      if (s < 2) recordTree.pages[0].entries = [{ key: "≥ 7" }];
    }
    if (id !== "cover") handoff(nameTree, recordTree, s === 2);
    groups = [nameTree, recordTree];
    query =
      id === "cover"
        ? "SELECT name, id WHERE name = 'Zoe'"
        : id === "stable"
          ? "Grow ID 9's unindexed payload · split its full page"
          : "SELECT * WHERE name = 'Zoe'";
    takeaway =
      id === "cover"
        ? s === 2
          ? "Zoe + ID 9 returned · 0 primary-row fetches"
          : "Name + ID are already in the upper leaf"
        : id === "stable"
          ? s === 2
            ? "New primary leaf · same Zoe → ID 9 entry"
            : s === 1
              ? "ID 9 has a larger bio · its primary page needs room"
              : "Zoe → ID 9 · primary record in the last leaf"
          : s === 2
            ? "Name → ID 9 → full record · 2 tree lookups"
            : "Upper leaves store names + IDs; lower leaves store records";
    height = 560;
  }

  if (id === "range") {
    let entries = primaryEntries();
    if (s >= 2)
      entries = mark(
        entries,
        (entry) =>
          Number(entry.key) >= 4 && Number(entry.key) <= (s === 3 ? 8 : 6),
        "found",
      );
    if (s === 3)
      entries = mark(entries, (entry) => entry.key === "09", "muted");
    groups = [
      primary(entries, {
        rootState: s > 0 ? "active" : undefined,
        leafStates: [
          undefined,
          s > 0 ? "active" : undefined,
          s === 3 ? "found" : undefined,
        ],
        activeBranches: s > 0 ? [1] : [],
        activeLeafLinks: s === 3 ? [1] : [],
      }),
    ];
    query = "WHERE id BETWEEN 4 AND 8";
    takeaway =
      s === 3
        ? "5 records returned · stop before 9"
        : s > 0
          ? "Seek once at 4 · then follow leaf links"
          : "Linked leaves preserve sorted order";
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
          ? mark(entries, (entry) => entry.key === "Zoe", "found")
          : entries;
    const compound = tree(
      "compound",
      "COMPOUND INDEX · CITY, THEN NAME",
      marked,
      {
        rootState: s === 1 ? "active" : s === 2 ? "muted" : undefined,
        activeBranches: s === 1 ? [0] : [],
        activeLeafLinks: s === 2 ? [0] : [],
        leafStates:
          s === 1 ? ["found", undefined] : s === 2 ? ["active", "active"] : [],
      },
    );
    compound.pages[0].entries = [{ key: "Boston" }];
    compound.pages[1].title = "CITY · AUSTIN";
    compound.pages[2].title = "CITY · BOSTON";
    compound.pages[1].width = 208;
    compound.pages[2].width = 208;
    compound.pages[1].x = 196;
    compound.pages[2].x = 444;
    groups = [compound];
    query =
      s === 2
        ? "WHERE name = 'Zoe'"
        : s === 1
          ? "WHERE city = 'Austin'"
          : "INDEX (city, name)";
    takeaway =
      s === 2
        ? "Zoe occurs in separate city groups · no single name slice"
        : s === 1
          ? "Austin is one continuous slice of this index"
          : "Sort by city first; names are ordered within each city";
  }

  if (id === "selectivity") {
    const entries =
      s === 1
        ? mark(primaryEntries(), (entry) => entry.key === "09", "found")
        : s === 2
          ? primaryEntries().map((leaf) =>
              leaf.map((entry) => ({
                ...entry,
                value: entry.key === "09" ? "no" : "yes",
                state:
                  entry.key === "09" ? ("muted" as const) : ("found" as const),
              })),
            )
          : primaryEntries();
    groups = [
      primary(entries, {
        rootState: s === 1 ? "active" : s === 2 ? "muted" : undefined,
        activeBranches: s === 1 ? [2] : [],
        activeLeafLinks: s === 2 ? [0, 1] : [],
        leafStates:
          s === 1
            ? [undefined, undefined, "found"]
            : s === 2
              ? ["found", "found", "found"]
              : [],
      }),
    ];
    if (s === 2) groups[0].title = "PRIMARY INDEX · ID + ACTIVE";
    query = s === 2 ? "WHERE active = 'yes'" : "WHERE id = 9";
    takeaway =
      s === 1
        ? "1 of 9 matches · 8 records skipped"
        : s === 2
          ? "8 matches · all 9 records examined"
          : "Useful indexes eliminate enough work to repay their cost";
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
        title: "PRIMARY",
        separators: ["4", "7"],
        entries: [record(7), record(8), record(9)],
      },
      {
        id: "write-name",
        title: "NAME",
        separators: ["Leo", "Noah"],
        entries: [nameEntry(3), nameEntry(5), nameEntry(9)],
      },
      {
        id: "write-city",
        title: "CITY",
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
        title: "SEPARATORS",
        entries: definition.separators.map((key) => ({ key })),
        kind: "branch",
        x,
        y: 65,
        width: 176,
        height: 70,
        state: active ? "active" : undefined,
      };
      const leaf: Page = {
        id: `${definition.id}-leaf`,
        title: "LAST LEAF",
        entries,
        kind: "leaf",
        x,
        y: 210,
        width: 176,
        height: 144,
        state: active ? "new" : undefined,
      };
      return {
        id: definition.id,
        title: definition.title,
        pages: [root, leaf],
        links: [{ from: root.id, to: leaf.id, kind: "branch", active }],
      };
    });
    query = "INSERT (9, 'Zoe', 'Boston')";
    takeaway =
      s === 2
        ? "3 index entries maintained · 1 logical insert"
        : s === 1
          ? "Primary + name entries added · city entry still pending"
          : "Each relevant index must receive its own entry";
  }

  return { groups, query, takeaway, height };
}
