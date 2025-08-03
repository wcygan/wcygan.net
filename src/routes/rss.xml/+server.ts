import { getAllPosts } from '$lib/services/blog';

export async function GET() {
	const posts = getAllPosts();

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Will Cygan | Blog</title>
    <description>Software Engineer interested in distributed systems, web applications, and system design.</description>
    <link>https://wcygan.github.io</link>
    <atom:link href="https://wcygan.github.io/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts
			.map(
				(post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description}]]></description>
      <link>https://wcygan.github.io/${post.slug}</link>
      <guid>https://wcygan.github.io/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.tags ? post.tags.map((tag) => `<category>${tag}</category>`).join('\n      ') : ''}
    </item>
    `
			)
			.join('')}
  </channel>
</rss>`;

	return new Response(rss.trim(), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8'
		}
	});
}
