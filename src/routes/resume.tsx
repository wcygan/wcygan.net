import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/resume')({
  head: () => ({
    meta: [
      { title: 'Resume - Will Cygan' },
      {
        name: 'description',
        content:
          'Software Engineer specializing in distributed systems and e-commerce platforms',
      },
    ],
  }),
  component: ResumePage,
})

function ResumePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Resume</h1>
        <a
          href="/will_cygan_resume.pdf"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
          target="_blank"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download PDF
        </a>
      </div>

      <div className="prose prose-emerald prose-invert max-w-none">
        <section className="mb-8">
          <h2>Experience</h2>
          <div className="card-base mb-6 border border-zinc-700">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="mb-1 text-xl font-bold">Software Engineer</h3>
                <p className="font-medium text-emerald-400">LinkedIn</p>
              </div>
              <span className="text-zinc-400">Present</span>
            </div>
            <p className="mb-3 text-zinc-400">
              LinkedIn Business Platform (E-Commerce)
            </p>
            <ul className="text-zinc-300">
              <li>
                Working on scalable e-commerce solutions and business platform
                infrastructure
              </li>
              <li>
                Developing distributed systems for high-traffic applications
              </li>
              <li>
                Contributing to system design and architecture decisions
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2>Technical Skills</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card-base border border-zinc-700">
              <h3 className="mb-3 text-lg font-bold text-emerald-400">
                Languages &amp; Frameworks
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Java', 'Python', 'JavaScript', 'TypeScript', 'Rust', 'Go'].map(
                  (lang) => (
                    <span
                      key={lang}
                      className="rounded bg-zinc-700 px-3 py-1 text-sm"
                    >
                      {lang}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="card-base border border-zinc-700">
              <h3 className="mb-3 text-lg font-bold text-emerald-400">
                Systems &amp; Tools
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'Distributed Systems',
                  'Microservices',
                  'Docker',
                  'Kubernetes',
                  'AWS',
                  'System Design',
                ].map((tool) => (
                  <span
                    key={tool}
                    className="rounded bg-zinc-700 px-3 py-1 text-sm"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2>Interests</h2>
          <ul>
            <li>Distributed Systems Architecture</li>
            <li>System Design &amp; Performance Optimization</li>
            <li>E-Commerce Platform Development</li>
            <li>Modern Web Development</li>
            <li>Open Source Contributions</li>
          </ul>
        </section>

        <section>
          <h2>Connect</h2>
          <p>
            Interested in discussing opportunities or collaboration? Feel free
            to reach out via{' '}
            <a
              href="https://linkedin.com/in/wcygan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300"
            >
              LinkedIn
            </a>{' '}
            or check out my projects on{' '}
            <a
              href="https://github.com/wcygan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
