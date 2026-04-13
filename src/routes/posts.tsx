import { createFileRoute, Link } from '@tanstack/react-router'
import { getAllPosts } from '~/lib/services/blog'

export const Route = createFileRoute('/posts')({
  loader: () => ({ posts: getAllPosts() }),
  component: PostsPage,
})

function PostsPage() {
  const { posts } = Route.useLoaderData()
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-4xl font-bold">Blog Posts</h1>
      <div className="space-y-6">
        {posts.map((post) => (
          <article key={post.slug} className="post-card">
            <h2 className="mb-2 text-2xl font-bold text-emerald-400">
              <Link
                to="/$slug"
                params={{ slug: post.slug }}
                className="text-emerald-400 hover:text-emerald-300"
              >
                {post.title}
              </Link>
            </h2>
            <div className="mb-2 text-zinc-400">{post.date}</div>
            <p className="mb-4 text-zinc-300">{post.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
