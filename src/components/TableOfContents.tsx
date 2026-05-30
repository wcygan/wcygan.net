import {
  shouldShowTableOfContents,
  type TableOfContentsItem,
} from "~/lib/table-of-contents";

interface TableOfContentsProps {
  activeId?: string;
  items: readonly TableOfContentsItem[] | undefined;
  showTitle?: boolean;
}

interface TableOfContentsSection extends TableOfContentsItem {
  children: TableOfContentsItem[];
}

function groupTableOfContentsItems(
  items: readonly TableOfContentsItem[],
): TableOfContentsSection[] {
  const sections: TableOfContentsSection[] = [];

  for (const item of items) {
    if (item.depth === 2 || sections.length === 0) {
      sections.push({
        ...item,
        children: [],
      });
      continue;
    }

    sections[sections.length - 1].children.push(item);
  }

  return sections;
}

function TableOfContentsLink({
  activeId,
  item,
}: {
  activeId: string | undefined;
  item: TableOfContentsItem;
}) {
  return (
    <a
      className="table-of-contents-link"
      href={`#${item.id}`}
      aria-current={activeId === item.id ? "location" : undefined}
    >
      {item.title}
    </a>
  );
}

export function TableOfContents({
  activeId,
  items,
  showTitle = true,
}: TableOfContentsProps) {
  if (!shouldShowTableOfContents(items)) {
    return null;
  }

  const tocItems = items ?? [];
  const sections = groupTableOfContentsItems(tocItems);

  return (
    <nav className="table-of-contents" aria-label="Table of contents">
      {showTitle ? <h2 className="table-of-contents-title">Contents</h2> : null}
      <ol className="table-of-contents-list">
        {sections.map((section) => (
          <li
            key={section.id}
            className={`table-of-contents-item table-of-contents-item-depth-${section.depth}`}
          >
            <TableOfContentsLink activeId={activeId} item={section} />
            {section.children.length > 0 ? (
              <ol className="table-of-contents-list table-of-contents-sublist">
                {section.children.map((item) => (
                  <li
                    key={item.id}
                    className={`table-of-contents-item table-of-contents-item-depth-${item.depth}`}
                  >
                    <TableOfContentsLink activeId={activeId} item={item} />
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
