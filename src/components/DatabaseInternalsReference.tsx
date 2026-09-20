import { useId } from "react";

export type DatabaseInternalsChapterNumber = 9 | 10 | 11 | 12 | 13 | 14;

export interface DatabaseInternalsChapterReference {
  number: DatabaseInternalsChapterNumber;
  concept: string;
}

interface DatabaseInternalsChapter {
  title: string;
  url: string;
}

const DATABASE_INTERNALS_BOOK_URL =
  "https://www.oreilly.com/library/view/database-internals/9781492040330/";

const DATABASE_INTERNALS_CHAPTERS: Record<
  DatabaseInternalsChapterNumber,
  DatabaseInternalsChapter
> = {
  9: {
    title: "Failure Detection",
    url: "https://www.oreilly.com/library/view/database-internals/9781492040330/ch09.html",
  },
  10: {
    title: "Leader Election",
    url: "https://www.oreilly.com/library/view/database-internals/9781492040330/ch10.html",
  },
  11: {
    title: "Replication and Consistency",
    url: "https://www.oreilly.com/library/view/database-internals/9781492040330/ch11.html",
  },
  12: {
    title: "Anti-Entropy and Dissemination",
    url: "https://www.oreilly.com/library/view/database-internals/9781492040330/ch12.html",
  },
  13: {
    title: "Distributed Transactions",
    url: "https://www.oreilly.com/library/view/database-internals/9781492040330/ch13.html",
  },
  14: {
    title: "Consensus",
    url: "https://www.oreilly.com/library/view/database-internals/9781492040330/ch14.html",
  },
};

export interface DatabaseInternalsReferenceProps {
  chapters: readonly DatabaseInternalsChapterReference[];
}

export function DatabaseInternalsMiniReference() {
  return (
    <span className="home-related-reading">
      <img
        src="/database-internals/database-internals-cover.png"
        alt=""
        aria-hidden="true"
        width={296}
        height={388}
      />
      <span className="home-related-reading-label">
        <strong>Related reading:</strong> Database Internals
      </span>
    </span>
  );
}

export function DatabaseInternalsReference({
  chapters,
}: DatabaseInternalsReferenceProps) {
  const titleId = useId();

  return (
    <aside className="database-internals-reference" aria-labelledby={titleId}>
      <a
        className="database-internals-reference-cover"
        href={DATABASE_INTERNALS_BOOK_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Database Internals on O'Reilly"
      >
        <img
          src="/database-internals/database-internals-cover.png"
          alt="Database Internals by Alex Petrov book cover"
          width={296}
          height={388}
        />
      </a>

      <div className="database-internals-reference-content">
        <p className="database-internals-reference-kicker">Related reading</p>
        <h2 id={titleId} className="database-internals-reference-title">
          Database Internals
        </h2>
        <p className="database-internals-reference-author">Alex Petrov</p>

        <nav
          className="database-internals-reference-links"
          aria-label="Book links"
        >
          <a
            href={DATABASE_INTERNALS_BOOK_URL}
            target="_blank"
            rel="noreferrer"
          >
            O&apos;Reilly
          </a>
          <a href="https://www.databass.dev/" target="_blank" rel="noreferrer">
            databass.dev
          </a>
        </nav>

        <div className="database-internals-reference-chapters">
          <p className="database-internals-reference-chapters-label">
            Relevant chapters
          </p>
          <ul>
            {chapters.map(({ number, concept }) => {
              const chapter = DATABASE_INTERNALS_CHAPTERS[number];

              return (
                <li key={number}>
                  <a href={chapter.url} target="_blank" rel="noreferrer">
                    Chapter {number}: {chapter.title}
                  </a>
                  <span>{concept}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
