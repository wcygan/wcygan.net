import { createFileRoute, Link } from "@tanstack/react-router";
import { getAllPosts } from "~/lib/services/blog";
import { toDisplayDate, toIsoDate } from "~/lib/utils/formatDate";

export const Route = createFileRoute("/posts")({
  loader: () => ({ posts: getAllPosts() }),
  component: PostsPage,
});

function PostsPage() {
  const { posts } = Route.useLoaderData();
  return (
    <section>
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug} className="post-item">
            <div className="post-title">
              <Link to="/$slug" params={{ slug: post.slug }}>
                {post.title}
              </Link>
            </div>
            <time className="post-date" dateTime={toIsoDate(post.date)}>
              {toDisplayDate(post.date)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
