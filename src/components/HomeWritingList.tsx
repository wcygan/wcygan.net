import { Link } from "@tanstack/react-router";
import type { Post } from "~/lib/types";

export interface HomeWritingListProps {
  posts: readonly Post[];
}

export function HomeWritingList({ posts }: HomeWritingListProps) {
  return (
    <ul className="home-writing-list">
      {posts.map((post) => (
        <li key={post.slug} className="home-writing-item">
          <Link
            className="home-writing-link"
            to="/$slug"
            params={{ slug: post.slug }}
          >
            <span className="home-writing-title">
              {post.title}
              {post.draft && (
                <>
                  {" "}
                  <strong className="home-writing-draft">DRAFT</strong>
                </>
              )}
            </span>
            <span className="home-writing-description">{post.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
