import { createFileRoute, Link } from "@tanstack/react-router";
import { getAllPosts } from "~/lib/services/blog";

export const Route = createFileRoute("/")({
  loader: () => ({ posts: getAllPosts() }),
  component: HomePage,
});

function HomePage() {
  const { posts } = Route.useLoaderData();
  return (
    <>
      <div className="bio-highlight">
        <p>
          Software Engineer at{" "}
          <a href="https://www.linkedin.com/in/wcygan">LinkedIn</a> building
          e-commerce infrastructure.
        </p>
      </div>

      <section>
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.slug} className="post-item">
              <div className="post-title">
                <Link to="/$slug" params={{ slug: post.slug }}>
                  {post.title}
                </Link>
              </div>
              <div className="post-date">{post.date}</div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
