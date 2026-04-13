import { createFileRoute } from '@tanstack/react-router'
import { experiences } from '~/lib/data/experiences'
import { ExperienceCard } from '~/components/ExperienceCard'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-bold sm:mb-6 sm:text-4xl">About</h1>
      <div className="prose prose-emerald prose-invert max-w-none">
        <div className="mb-6 sm:mb-8">
          <img
            src="/wcygan.jpeg"
            alt="Will Cygan"
            className="mx-auto mb-4 h-32 w-32 rounded-lg object-cover sm:mb-6 sm:h-48 sm:w-48"
          />
        </div>

        <p className="mb-4 text-center text-base sm:mb-6 sm:text-lg">
          Software Engineer from Chicago, Illinois
        </p>

        <h2>Experience</h2>
        <section
          id="experience"
          aria-labelledby="exp-heading"
          className="not-prose mb-8"
        >
          <ul className="grid gap-6 md:grid-cols-1">
            {experiences.map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} />
            ))}
          </ul>
        </section>

        <h2>Connect</h2>
        <p>
          Feel free to reach out if you'd like to discuss technology, system
          design, or potential collaboration opportunities. You can find me on{' '}
          <a
            href="https://github.com/wcygan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            GitHub
          </a>{' '}
          or{' '}
          <a
            href="https://linkedin.com/in/wcygan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            LinkedIn
          </a>
          .
        </p>
      </div>
    </div>
  )
}
