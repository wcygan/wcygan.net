import { createFileRoute, Link } from "@tanstack/react-router";
import { getAllPosts } from "~/lib/services/blog";

export const Route = createFileRoute("/")({
  loader: () => ({ posts: getAllPosts() }),
  head: () => ({
    meta: [{ title: "Will Cygan - Software Engineer" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { posts } = Route.useLoaderData();

  return (
    <div className="home-page">
      <section className="home-section" aria-labelledby="writing">
        <h2 className="home-section-title" id="writing">
          Writing
        </h2>
        <ul className="home-writing-list">
          {posts.map((post) => (
            <li key={post.slug} className="home-writing-item">
              <Link
                className="home-writing-link"
                to="/$slug"
                params={{ slug: post.slug }}
              >
                <span className="home-writing-title">{post.title}</span>
                <span className="home-writing-description">
                  {post.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
