export interface Lesson {
  id: string;
  title: string;
  dimension: "2D" | "3D";
  intro: string;
  steps: string[];
}
export const lessons: Lesson[] = [
  {
    id: "scan",
    title: "Finding data without a useful index",
    dimension: "2D",
    intro:
      "A name search cannot use a tree ordered by ID. It scans the leaf records to find every match.",
    steps: [
      "Search for Zoe. The records are ordered by ID.",
      "Check the first page: no Zoe.",
      "Check the second page: no Zoe.",
      "Check the last page: Zoe is record 9.",
    ],
  },
  {
    id: "tree",
    title: "A sorted index narrows the search",
    dimension: "2D",
    intro:
      "Separator keys tell a lookup which branch can contain its target. Unrelated branches stay untouched.",
    steps: [
      "Find key 9 in this tiny sorted tree.",
      "Compare 9 with separators 4 and 7.",
      "Follow the right branch to the leaf containing 9.",
    ],
  },
  {
    id: "pages",
    title: "Records live in pages",
    dimension: "3D",
    intro:
      "A page groups several records. Storage engines read and cache pages, rather than treating every record as its own disk file.",
    steps: [
      "Three pages hold nine records.",
      "Request record 8.",
      "Its page brings records 7, 8, and 9 into memory together.",
    ],
  },
  {
    id: "insert",
    title: "Insertion follows the key",
    dimension: "3D",
    intro:
      "Inserting does not require a table scan. The tree routes the new key to its destination leaf.",
    steps: [
      "Insert ID 9 into a tree ordered by ID.",
      "The separator sends ID 9 to the right leaf.",
      "Add ID 9 to the leaf with room for it.",
    ],
  },
  {
    id: "split",
    title: "A full page splits",
    dimension: "3D",
    intro:
      "When a leaf cannot fit a new entry, the engine can divide its contents and add a separator above it.",
    steps: [
      "This illustrative leaf has room for three keys.",
      "Inserting 9 would overflow the leaf.",
      "Divide the keys into two leaves; the parent now routes at 8.",
    ],
  },
  {
    id: "secondary",
    title: "A secondary index points to a primary key",
    dimension: "3D",
    intro:
      "In InnoDB, a name index stores a name and a primary key. Fetching the full record usually follows that key into the primary tree.",
    steps: [
      "Search the name index for Zoe.",
      "The index returns Zoe → ID 9.",
      "Use ID 9 to fetch the full record in the primary tree.",
    ],
  },
  {
    id: "range",
    title: "A range walks neighboring leaves",
    dimension: "2D",
    intro:
      "An ordered index can find the start of a range, then continue through neighboring leaf entries.",
    steps: [
      "Find IDs from 4 through 8.",
      "Seek the leaf containing 4.",
      "Read 4, 5, and 6.",
      "Continue into the next leaf for 7 and 8.",
    ],
  },
  {
    id: "compound",
    title: "Column order changes what an index can seek",
    dimension: "2D",
    intro:
      "An index on (city, name) groups by city first, then sorts names inside each city. A name alone is not one continuous slice.",
    steps: [
      "Entries are sorted by city, then name.",
      "City = Austin selects one continuous group.",
      "Name = Zoe spans both cities; it does not have the same leading-key seek.",
    ],
  },
  {
    id: "cover",
    title: "A covering index can answer directly",
    dimension: "3D",
    intro:
      "If every requested field is already in an index entry, the engine may answer without fetching the full table record.",
    steps: [
      "Request only the name and ID for Zoe.",
      "The name-index entry already contains Zoe and ID 9.",
      "Return those fields without a primary-row fetch.",
    ],
  },
  {
    id: "selectivity",
    title: "An index helps most when it skips work",
    dimension: "2D",
    intro:
      "An index matching one record can skip many others. Matching most of a table may make a scan cheaper; the optimizer weighs the actual costs.",
    steps: [
      "Compare two filters over nine rows.",
      "ID = 9 matches one row: eight can be skipped.",
      "Active = yes matches eight: little work can be skipped.",
    ],
  },
  {
    id: "writes",
    title: "Indexes add work to writes",
    dimension: "2D",
    intro:
      "An insert must add entries to each relevant index. An update maintains indexes whose keys or stored values change.",
    steps: [
      "Insert one new record.",
      "Write the primary entry and a name-index entry.",
      "With a city index too, the insert maintains three structures.",
    ],
  },
  {
    id: "stable",
    title: "A stable ID survives a move",
    dimension: "3D",
    intro:
      "An InnoDB name-index entry keeps its primary key when a full row grows and its primary leaf splits.",
    steps: [
      "The name entry stores Zoe → 9; the primary leaf holds the full row.",
      "An unindexed field grows; the full primary leaf needs more room.",
      "Zoe → 9 stays unchanged; the primary tree now routes to a new leaf.",
    ],
  },
];
