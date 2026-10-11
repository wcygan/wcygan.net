import { type ReactNode } from "react";

export type IconKind =
  | "cpu"
  | "ram"
  | "ssd"
  | "read"
  | "write"
  | "page"
  | "search";

export function TechnicalIconGlyph({ kind }: { kind: IconKind }) {
  const shapes: Record<IconKind, ReactNode> = {
    cpu: (
      <>
        {[14, 19, 24, 29, 34].map((position) => (
          <path
            key={position}
            d={`M${position} 4v4m0 32v4M4 ${position}h4m32 0h4`}
          />
        ))}
        <rect
          className="big-db-icon-case"
          x="8"
          y="8"
          width="32"
          height="32"
          rx="3"
        />
        <rect
          className="big-db-icon-inset"
          x="14"
          y="14"
          width="20"
          height="20"
          rx="2"
        />
        <path d="M19 20h10v8H19z" />
      </>
    ),
    ram: (
      <>
        <path
          className="big-db-icon-case"
          d="M4 13h40q2 0 2 2v5a3 3 0 0 0 0 6v7q0 2-2 2H30v-4h-4v4H4q-2 0-2-2v-7a3 3 0 0 0 0-6v-5q0-2 2-2Z"
        />
        {[7, 16, 25, 34].map((x) => (
          <rect
            key={x}
            className="big-db-icon-inset"
            x={x}
            y="17"
            width="7"
            height="10"
            rx="1"
          />
        ))}
        {[7, 11, 15, 19, 23, 33, 37, 41].map((x) => (
          <path key={x} d={`M${x} 31v4`} />
        ))}
      </>
    ),
    ssd: (
      <>
        <rect
          className="big-db-icon-case"
          x="8"
          y="3"
          width="32"
          height="42"
          rx="4"
        />
        <circle className="big-db-icon-inset" cx="24" cy="19" r="11" />
        <circle cx="24" cy="19" r="3" />
        <path
          className="big-db-icon-inset"
          d="M13 35l9-10-5 13a3 3 0 0 1-4-3Z"
        />
        <path d="M24 36h10v5H24zM13 8h2m18 0h2M13 41h2" />
      </>
    ),
    read: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
        <path d="M4 4v16" />
      </>
    ),
    write: (
      <>
        <path d="m5 15 10-10 4 4L9 19H5zM13 7l4 4M5 22h14" />
      </>
    ),
    page: (
      <>
        <path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h6" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
  };
  return shapes[kind];
}

export function TechnicalIcon({ kind }: { kind: IconKind }) {
  const hardware = kind === "cpu" || kind === "ram" || kind === "ssd";
  return (
    <svg
      className={`big-db-icon${hardware ? " big-db-hardware-icon" : ""}`}
      viewBox={hardware ? "0 0 48 48" : "0 0 24 24"}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <TechnicalIconGlyph kind={kind} />
    </svg>
  );
}
