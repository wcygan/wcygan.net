import { createFileRoute } from "@tanstack/react-router";
import { HomeWritingList } from "~/components/HomeWritingList";
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
        <HomeWritingList posts={posts} />
      </section>
    </div>
  );
}
