import { createFileRoute } from '@tanstack/react-router'
import { getAllPosts } from '~/lib/services/blog'

export const Route = createFileRoute('/feed')({
  loader: () => ({ posts: getAllPosts() }),
  head: () => ({
    meta: [{ title: 'RSS Feed - Will Cygan' }],
  }),
  component: FeedPage,
})

function FeedPage() {
  const { posts } = Route.useLoaderData()

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Will Cygan | Blog</title>
    <description>Software Engineer interested in distributed systems, web applications, and system design.</description>
    <link>https://wcygan.net</link>
    <atom:link href="https://wcygan.net/feed" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
${posts
  .map(
    (post) => `    <item>
      <title>${post.title}</title>
      <description>${post.description}</description>
      <link>https://wcygan.net/${post.slug}</link>
      <guid>https://wcygan.net/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
${(post.tags || []).map((tag) => `      <category>${tag}</category>`).join('\n')}
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>`

  return (
    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '14px' }}>
      <p style={{ marginBottom: '1rem' }}>
        <strong>RSS Feed</strong> — Copy this URL to your feed reader:{' '}
        <code>https://wcygan.net/feed</code>
      </p>
      <pre>{rss}</pre>
    </div>
  )
}
