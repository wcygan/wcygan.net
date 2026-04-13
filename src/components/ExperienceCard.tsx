import type { Experience } from '~/lib/types'

interface Props {
  experience: Experience
}

export function ExperienceCard({ experience }: Props) {
  const isCurrent = experience.period.toLowerCase().includes('present')

  return (
    <li
      className="card-base card-hover list-none border border-zinc-700 hover:border-emerald-400"
      role="listitem"
    >
      <header className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-wide text-zinc-100 sm:text-lg">
            {experience.company}
          </span>
          {isCurrent && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-300 ring-1 ring-yellow-500/30">
              Current
            </span>
          )}
        </div>
        <time
          className="text-xs text-zinc-400 sm:text-sm"
          dateTime={experience.period}
        >
          {experience.period}
        </time>
      </header>

      <h3 className="mb-2 text-base font-medium text-emerald-400">
        {experience.title}
      </h3>

      {experience.location && (
        <p className="mb-2 text-sm text-zinc-400">{experience.location}</p>
      )}

      <p className="mb-4 text-sm leading-relaxed text-zinc-300">
        {experience.summary}
      </p>

      {experience.achievements && experience.achievements.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-zinc-100">
            Key Achievements:
          </h4>
          <ul className="list-inside list-disc space-y-1">
            {experience.achievements.map((achievement, i) => (
              <li key={i} className="text-sm text-zinc-300">
                {achievement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {experience.technologies && experience.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
          {experience.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-medium text-emerald-300 transition-all duration-200 hover:scale-105 hover:bg-emerald-600/30 hover:shadow-sm sm:px-3 sm:py-1.5 sm:text-sm"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </li>
  )
}
