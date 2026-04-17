import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
  Link,
} from "@tanstack/react-router";
import { useEffect } from "react";
import "~/styles/app.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content:
          "Senior Software Engineer at LinkedIn building the Checkout & Order placement experience.",
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Will Cygan RSS Feed",
        href: "/rss.xml",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
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
        <div className="min-h-screen bg-white">
          <div className="container">
            <header className="site-header">
              <h1 className="site-title">
                <Link to="/">Will Cygan</Link>
              </h1>
              <nav className="site-nav" aria-label="Primary">
                <ul>
                  <li>
                    <a href="/will_cygan_resume.pdf">Resume</a>
                  </li>
                  <li>
                    <a href="mailto:wcygan.io@gmail.com">Email</a>
                  </li>
                  <li>
                    <a href="https://github.com/wcygan">GitHub</a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/in/wcygan">LinkedIn</a>
                  </li>
                </ul>
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
  );
}
