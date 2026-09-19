/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPostIndex, type PostModule } from "~/lib/services/post-index";
import { HomeWritingList } from "./HomeWritingList";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
  }: React.PropsWithChildren<{
    params: { slug: string };
  }>) => <a href={`/${params.slug}`}>{children}</a>,
}));

const entries: [string, PostModule][] = [
  [
    "/src/posts/public-post.mdx",
    {
      frontmatter: {
        title: "Public Post",
        date: "September 19, 2026",
        description: "Visible to everyone",
      },
    },
  ],
  [
    "/src/posts/future-draft.draft.mdx",
    {
      frontmatter: {
        title: "Future Draft",
        date: "September 19, 3000",
        description: "Visible during development",
      },
    },
  ],
];

afterEach(cleanup);

describe("homepage draft integration", () => {
  it("keeps draft posts and their marker out of production output", () => {
    render(<HomeWritingList posts={buildPostIndex(entries)} />);

    expect(screen.getByText("Public Post")).toBeTruthy();
    expect(screen.queryByText("Future Draft")).toBeNull();
    expect(screen.queryByText("DRAFT")).toBeNull();
  });

  it("puts future-dated drafts first and marks them in development", () => {
    render(
      <HomeWritingList
        posts={buildPostIndex(entries, { includeDrafts: true })}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Future Draft DRAFTVisible during development",
      "Public PostVisible to everyone",
    ]);
    expect(screen.getByText("DRAFT").tagName).toBe("STRONG");
  });
});
