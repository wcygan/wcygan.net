/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Post } from "~/lib/types";
import { HomeWritingList } from "./HomeWritingList";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
  }: React.PropsWithChildren<{
    params: { slug: string };
  }>) => <a href={`/${params.slug}`}>{children}</a>,
}));

const publicPost: Post = {
  slug: "public-post",
  title: "Public Post",
  date: "September 1, 2026",
  description: "Visible to everyone",
};

afterEach(cleanup);

describe("HomeWritingList", () => {
  it("renders a bold DRAFT marker for a draft post", () => {
    render(<HomeWritingList posts={[{ ...publicPost, draft: true }]} />);

    const marker = screen.getByText("DRAFT");
    expect(marker.tagName).toBe("STRONG");
    expect(marker.className).toBe("home-writing-draft");
  });

  it("does not mark a public post as a draft", () => {
    render(<HomeWritingList posts={[publicPost]} />);

    expect(screen.queryByText("DRAFT")).toBeNull();
  });
});
