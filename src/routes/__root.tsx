import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { socials } from "~/lib/socials";
import "~/styles/app.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content:
          "Software Engineer on the Checkout team at LinkedIn building mission-critical systems for our E-Commerce platform.",
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Will Cygan RSS Feed",
        href: "/rss.xml",
      },
      {
        rel: "webmention",
        href: "https://webmention.io/wcygan.net/webmention",
      },
      { rel: "pingback", href: "https://webmention.io/wcygan.net/xmlrpc" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".shiki button");
      if (!(button instanceof HTMLElement)) return;
      const code = button.parentElement?.querySelector("code");
      if (!code) return;
      navigator.clipboard
        .writeText((code as HTMLElement).innerText)
        .then(() => {
          button.classList.add("copied");
          setTimeout(() => button.classList.remove("copied"), 2000);
        });
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="site-shell min-h-screen">
          <div className="container site-container">
            <SiteHeader isHomePage={isHomePage} />

            <main
              className={
                isHomePage ? "main-section home-main-section" : "main-section"
              }
            >
              <Outlet />
            </main>

            <SiteFooter />
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function SiteHeader({ isHomePage }: { isHomePage: boolean }) {
  const siteNameLink = (
    <Link className={isHomePage ? "u-url" : undefined} to="/">
      Will Cygan
    </Link>
  );

  return (
    <header className={isHomePage ? "site-header h-card" : "site-header"}>
      {isHomePage ? (
        <h1 className="site-title p-name">{siteNameLink}</h1>
      ) : (
        <p className="site-title">{siteNameLink}</p>
      )}
      <p className="site-role">Software Engineer</p>
      <nav className="site-nav" aria-label="Primary">
        <ul>
          <li>
            <a
              href="/will_cygan_resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resume
            </a>
          </li>
          <li>
            <a
              href="mailto:wcygan.io@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Email
            </a>
          </li>
          <li>
            <a
              href={socials.github}
              target="_blank"
              rel="noopener noreferrer me"
            >
              GitHub
            </a>
          </li>
          <li>
            <a
              href={socials.linkedin}
              target="_blank"
              rel="noopener noreferrer me"
            >
              LinkedIn
            </a>
          </li>
          <li>
            <a
              href="https://nu-sync.net/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Projects
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <a
        href="https://xn--sr8hvo.ws/previous"
        aria-label="Previous site in the IndieWeb Webring"
      >
        ←
      </a>{" "}
      An <a href="https://xn--sr8hvo.ws">IndieWeb Webring</a> 🕸💍{" "}
      <a
        href="https://xn--sr8hvo.ws/next"
        aria-label="Next site in the IndieWeb Webring"
      >
        →
      </a>
    </footer>
  );
}
