export const RECORDS = [
  { id: 812, email: "ada@example.com", name: "Ada" },
  { id: 105, email: "sam@example.com", name: "Sam" },
  { id: 180, email: "ben@example.com", name: "Ben" },
  { id: 730, email: "eve@example.com", name: "Eve" },
  { id: 210, email: "ivy@example.com", name: "Ivy" },
  { id: 940, email: "lin@example.com", name: "Lin" },
  { id: 310, email: "uma@example.com", name: "Uma" },
  { id: 620, email: "zoe@example.com", name: "Zoe" },
  { id: 427, email: "will@example.com", name: "Will" },
] as const;
export const SEARCH_EMAIL = "will@example.com";
export const QUERY = `SELECT * FROM users WHERE email = '${SEARCH_EMAIL}';`;
export const READ_TS = 120;
export const STORAGE_SOURCES = ["Memtable", "SST A", "SST B"] as const;
export interface RowVersion {
  id: number;
  email: string;
  name: string;
  commitTs: number;
  source: (typeof STORAGE_SOURCES)[number];
}
// Committed puts only. Column families, locks, deletes and binary key encoding
// are outside this logical read model. Storage location never decides visibility.
export const ROW_VERSIONS: readonly RowVersion[] = [
  ...RECORDS.map((row, i) => ({
    ...row,
    commitTs: 100,
    source: STORAGE_SOURCES[1 + (i % 2)],
  })),
  {
    id: 427,
    email: SEARCH_EMAIL,
    name: "Will C.",
    commitTs: 80,
    source: "SST B",
  },
  {
    id: 427,
    email: SEARCH_EMAIL,
    name: "William",
    commitTs: 140,
    source: "Memtable",
  },
];
export function visibleRowVersion(
  versions: readonly RowVersion[],
  id: number,
  readTs: number,
) {
  return versions.reduce<RowVersion | undefined>(
    (visible, version) =>
      version.id === id &&
      version.commitTs <= readTs &&
      (!visible || version.commitTs > visible.commitTs)
        ? version
        : visible,
    undefined,
  );
}
// Nonunique index keys contain both email and row handle. The name-only update
// at 140 does not change this index. These arrays are logical views, not SSTs.
export const SECONDARY_ENTRIES = [...RECORDS]
  .sort((a, b) => a.email.localeCompare(b.email))
  .map(({ email, id }) => ({ email, id }));
export const PRIMARY_ENTRIES = RECORDS.map(({ id }) => {
  const { email, name } = visibleRowVersion(ROW_VERSIONS, id, READ_TS)!;
  return { id, email, name };
}).sort((a, b) => a.id - b.id);
export const MATCH_ID = SECONDARY_ENTRIES.find(
  (entry) => entry.email === SEARCH_EMAIL,
)!.id;
export const RESULT = PRIMARY_ENTRIES.find((row) => row.id === MATCH_ID)!;

export const VISIBLE_VERSION = visibleRowVersion(
  ROW_VERSIONS,
  MATCH_ID,
  READ_TS,
)!;
export const NEWER_VERSION = ROW_VERSIONS.find(
  (row) => row.id === MATCH_ID && row.commitTs > READ_TS,
)!;
export const STEPS = [
  {
    title: "Ready",
    narration:
      "Follow an index range scan and a row lookup at the same snapshot.",
  },
  {
    title: "Receive query",
    narration: `TiDB chooses IndexLookUp: scan the email index, then fetch rows at read timestamp ${READ_TS}.`,
  },
  {
    title: "Read secondary index",
    narration: `Send the email range and read timestamp ${READ_TS} to Region A’s leader on TiKV 1.`,
  },
  {
    title: "Seek across RocksDB sources",
    narration:
      "RocksDB seeks relevant memory and SST sources. Each SST has its own block index; there is no single directory for the SQL index.",
  },
  {
    title: "Read the index snapshot",
    narration: `TiKV exposes the index entries visible at ${READ_TS}. The ordered list is a logical view, not one file or a fully materialized scan.`,
  },
  {
    title: "Scan the matching email range",
    narration:
      "IndexRangeScan seeks the email prefix. A nonunique index key includes the row handle: (will@example.com, 427).",
  },
  {
    title: "Find the ID",
    narration:
      "Extract handle 427 from the matching index key. The name is not in this index, so the query still needs the row.",
  },
  {
    title: "Return the ID",
    narration: "Carry ID 427 back to TiDB before starting the row lookup.",
  },
  {
    title: "Look up the row handle",
    narration: `TableRowIDScan requests row 427 from Region B’s leader on TiKV 2, still at timestamp ${READ_TS}.`,
  },
  {
    title: "Seek the row’s versions",
    narration:
      "The clustered primary key identifies the row. Its versions can be spread across memory and SST files; the handle is not a disk address.",
  },
  {
    title: "Keep the same snapshot",
    narration: `The name “${NEWER_VERSION.name}” committed at ${NEWER_VERSION.commitTs}, after snapshot ${READ_TS}. TiKV’s versioned seek excludes it.`,
  },
  {
    title: "Select the visible version",
    narration: `Commit ${VISIBLE_VERSION.commitTs} is the newest row version at or before ${READ_TS}. Its name is “${VISIBLE_VERSION.name}”, regardless of which file holds it.`,
  },
  {
    title: "Find the row",
    narration:
      "TiKV decodes the visible row for handle 427. Row values may be inline in write CF or fetched from default CF; those details are collapsed here.",
  },
  {
    title: "Return the record",
    narration: "Carry ID 427, will@example.com, and Will back to TiDB.",
  },
  {
    title: "Return the result",
    narration: `Two logical lookup phases, one snapshot at ${READ_TS}. This does not mean two disk reads.`,
  },
] as const;
export function traversal(step: number, primary: boolean) {
  const found = step >= (primary ? 12 : 6);
  const seeking = step >= (primary ? 9 : 3) && step < (primary ? 12 : 6);
  const row =
    step >= (primary ? 11 : 5)
      ? (primary ? PRIMARY_ENTRIES : SECONDARY_ENTRIES).findIndex(
          (entry) => entry.id === MATCH_ID,
        )
      : -1;
  return { seeking, row, found };
}
export function sourcePosition(tray: Point, index: number): Point {
  return [tray[0] + (index - 1) * 1.7, 0.4, tray[2] - 3.7];
}
export function lookupPosition(tray: Point): Point {
  return [tray[0], 0.4, tray[2] - 4.6];
}
export const LAST_STEP = STEPS.length - 1;
export type Point = [number, number, number];
export interface ViewCommand {
  kind: "reset" | "left" | "right" | "in" | "out";
  revision: number;
}

/** Logical key ranges, not physical nodes or a model of TiKV's storage engine. */
export function layout(mobile: boolean) {
  return mobile
    ? {
        server: [-2.85, 0, -7] as Point,
        secondary: [0.5, 0, -6] as Point,
        primary: [0.5, 0, 7] as Point,
      }
    : {
        server: [0, 0, -5.8] as Point,
        secondary: [-3.25, 0, 1.5] as Point,
        primary: [3.25, 0, 1.5] as Point,
      };
}
export function rowPosition(tray: Point, index: number): Point {
  return [tray[0], 0.32, tray[2] - 1.9 + index * 0.72];
}
export function packetForStep(step: number, mobile: boolean) {
  const positions = layout(mobile);
  const server: Point = [positions.server[0], 0.9, positions.server[2]];
  const secondary = rowPosition(
    positions.secondary,
    SECONDARY_ENTRIES.findIndex((r) => r.id === MATCH_ID),
  );
  const primary = rowPosition(
    positions.primary,
    PRIMARY_ENTRIES.findIndex((r) => r.id === MATCH_ID),
  );
  switch (step) {
    case 5:
    case 11: {
      const primaryRead = step === 11;
      const tray = primaryRead ? positions.primary : positions.secondary;
      return {
        from: [tray[0], 0.4, tray[2] - 2.7] as Point,
        to: primaryRead ? primary : secondary,
        label: primaryRead ? "Visible row · ts 100" : "Email range seek",
        shape: "probe",
        kind: primaryRead ? "primary" : "secondary",
      } as const;
    }
    case 2:
      return {
        from: server,
        to: lookupPosition(positions.secondary),
        label: SEARCH_EMAIL,
        shape: "query",
        kind: "secondary",
      } as const;
    case 7:
      return {
        from: secondary,
        to: server,
        label: "ID 427",
        shape: "id",
        kind: "secondary",
      } as const;
    case 8:
      return {
        from: server,
        to: lookupPosition(positions.primary),
        label: "ID 427",
        shape: "query",
        kind: "primary",
      } as const;
    case 13:
      return {
        from: primary,
        to: server,
        label: "427 · Will",
        shape: "row",
        detail: SEARCH_EMAIL,
        kind: "primary",
      } as const;
    default:
      return null;
  }
}
