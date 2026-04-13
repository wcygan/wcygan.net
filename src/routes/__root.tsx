import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
  Link,
} from '@tanstack/react-router'
import '~/styles/app.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content:
          'Will Cygan - Software Engineer interested in distributed systems, web applications, and system design.',
      },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
      {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: 'Will Cygan | Blog RSS Feed',
        href: '/feed',
      },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen bg-white">
          <div className="container">
            <header className="site-header">
              <h1 className="site-title">
                <Link to="/">Will Cygan</Link>
              </h1>
              <nav className="site-nav">
                <a href="/will_cygan_resume.pdf">Resume</a>
                <a href="mailto:wcygan.io@gmail.com">Email</a>
                <a href="https://github.com/wcygan">GitHub</a>
                <a href="https://www.linkedin.com/in/wcygan">LinkedIn</a>
              </nav>
            </header>

            <main className="main-section">
              <Outlet />
            </main>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
