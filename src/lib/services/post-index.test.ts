import { describe, expect, it } from "vitest";
import { buildPostIndex, findPostBySlug, type PostModule } from "./post-index";

function postModule(
  frontmatter: PostModule["frontmatter"],
  source = "short post body",
): PostModule {
  return {
    frontmatter,
    default: { toString: () => source },
  };
}

describe("buildPostIndex", () => {
  it("indexes public posts newest first", () => {
    const posts = buildPostIndex([
      [
        "/src/posts/older.mdx",
        postModule({
          title: "Older",
          date: "January 1, 2025",
          description: "Older post",
        }),
      ],
      [
        "/src/posts/newer.mdx",
        postModule({
          title: "Newer",
          date: "February 1, 2025",
          description: "Newer post",
        }),
      ],
    ]);

    expect(posts.map((post) => post.slug)).toEqual(["newer", "older"]);
  });

  it("excludes drafts from list and direct slug lookup", () => {
    const posts = buildPostIndex([
      [
        "/src/posts/public-post.mdx",
        postModule({
          title: "Public Post",
          date: "January 1, 2025",
          description: "Visible",
        }),
      ],
      [
        "/src/posts/draft-post.draft.mdx",
        postModule({
          title: "Draft Post",
          date: "January 2, 2025",
          description: "Private",
        }),
      ],
      [
        "/src/posts/unpublished-post.draft.mdx",
        postModule({
          title: "Unpublished Post",
          date: "January 3, 2025",
          description: "Private",
          published: false,
        }),
      ],
    ]);

    expect(posts.map((post) => post.slug)).toEqual(["public-post"]);
    expect(findPostBySlug(posts, "draft-post")).toBeUndefined();
    expect(findPostBySlug(posts, "unpublished-post")).toBeUndefined();
  });

  it("rejects private frontmatter in files matched by the public glob", () => {
    expect(() =>
      buildPostIndex([
        [
          "/src/posts/frontmatter-only-draft.mdx",
          postModule({
            title: "Frontmatter Only Draft",
            date: "January 2, 2025",
            description: "Private",
            draft: true,
          }),
        ],
      ]),
    ).toThrow(/\.draft\.mdx/);
  });
});
