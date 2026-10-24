export interface Lesson {
  id: string;
  title: string;
  dimension: "2D" | "3D";
  stepCount: number;
}
export const lessons: Lesson[] = [
  {
    id: "scan",
    title: "Finding data without a useful index",
    dimension: "2D",
    stepCount: 4,
  },
  {
    id: "tree",
    title: "A sorted index narrows the search",
    dimension: "2D",
    stepCount: 3,
  },
  {
    id: "pages",
    title: "Records live in pages",
    dimension: "3D",
    stepCount: 3,
  },
  {
    id: "insert",
    title: "Insertion follows the key",
    dimension: "3D",
    stepCount: 3,
  },
  {
    id: "split",
    title: "A full page splits",
    dimension: "3D",
    stepCount: 3,
  },
  {
    id: "secondary",
    title: "A secondary index points to a primary key",
    dimension: "3D",
    stepCount: 3,
  },
  {
    id: "range",
    title: "A range walks neighboring leaves",
    dimension: "2D",
    stepCount: 4,
  },
  {
    id: "compound",
    title: "Column order changes what an index can seek",
    dimension: "2D",
    stepCount: 3,
  },
  {
    id: "cover",
    title: "A covering index can answer directly",
    dimension: "3D",
    stepCount: 3,
  },
  {
    id: "selectivity",
    title: "An index helps most when it skips work",
    dimension: "2D",
    stepCount: 3,
  },
  {
    id: "writes",
    title: "Indexes add work to writes",
    dimension: "2D",
    stepCount: 3,
  },
  {
    id: "stable",
    title: "A stable ID survives a move",
    dimension: "3D",
    stepCount: 3,
  },
];
