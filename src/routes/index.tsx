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
      <div className="bio-highlight">
        <p>
          Senior Software Engineer at{" "}
          <a
            href={socials.linkedin}
            target="_blank"
            rel="noopener noreferrer me"
          >
            LinkedIn
          </a>{" "}
          building the Checkout &amp; Order placement experience
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
