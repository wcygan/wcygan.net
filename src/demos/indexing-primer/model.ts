export const lessons = [
  { id: "scan", title: "Table Scan", stepCount: 4 },
  { id: "tree", title: "Tree Lookup", stepCount: 3 },
  { id: "secondary", title: "Secondary Lookup", stepCount: 3 },
  { id: "compound", title: "Column Order", stepCount: 3 },
  { id: "cover", title: "Covering Index", stepCount: 3 },
  { id: "writes", title: "Write Cost", stepCount: 3 },
] as const;

export type LessonId = (typeof lessons)[number]["id"];
