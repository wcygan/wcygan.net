import { createFileRoute, Link } from "@tanstack/react-router";
import { RotatingPenguin } from "~/components/RotatingPenguin";
import { getAllPosts } from "~/lib/services/blog";
import { socials } from "~/lib/socials";
import { toDisplayDate, toIsoDate } from "~/lib/utils/formatDate";

export const Route = createFileRoute("/")({
  loader: () => ({ posts: getAllPosts() }),
  component: HomePage,
});

function HomePage() {
  const { posts } = Route.useLoaderData();
  return (
    <>
      <div className="bio-highlight h-card">
        <img className="u-photo" src="/wcygan.jpg" alt="Will Cygan" />
        <p>
          <a className="p-name u-url" href="https://wcygan.net/">
            Will Cygan
          </a>
          {" — "}
          <span className="p-note">
            Senior Software Engineer at{" "}
            <a
              href={socials.linkedin}
              target="_blank"
              rel="noopener noreferrer me"
            >
              LinkedIn
            </a>
          </span>
        </p>
      </div>

      <RotatingPenguin />

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
    </>
  );
}
