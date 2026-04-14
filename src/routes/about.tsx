import { createFileRoute } from "@tanstack/react-router";
import { experiences } from "~/lib/data/experiences";
import { ExperienceCard } from "~/components/ExperienceCard";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <article className="blog-post">
      <header className="post-header">
        <h1 className="post-title">About</h1>
      </header>

      <div className="post-content">
        <img src="/wcygan.jpeg" alt="Will Cygan" className="about-portrait" />

        <p>Software Engineer from Chicago, Illinois.</p>

        <h2>Experience</h2>
        <ul className="experience-list">
          {experiences.map((experience) => (
            <ExperienceCard key={experience.id} experience={experience} />
          ))}
        </ul>

        <h2>Connect</h2>
        <p>
          Feel free to reach out if you'd like to discuss technology, system
          design, or potential collaboration opportunities. You can find me on{" "}
          <a
            href="https://github.com/wcygan"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          or{" "}
          <a
            href="https://linkedin.com/in/wcygan"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          .
        </p>
      </div>
    </article>
  );
}
