import type { Experience } from "~/lib/types";

interface Props {
  experience: Experience;
}

export function ExperienceCard({ experience }: Props) {
  const isCurrent = experience.period.toLowerCase().includes("present");

  return (
    <li className="experience-card">
      <header className="experience-card__header">
        <div className="experience-card__company-line">
          <span className="experience-card__company">{experience.company}</span>
          {isCurrent && <span className="experience-card__badge">Current</span>}
        </div>
        <time className="experience-card__period" dateTime={experience.period}>
          {experience.period}
        </time>
      </header>

      <h3 className="experience-card__title">{experience.title}</h3>

      {experience.location && (
        <p className="experience-card__location">{experience.location}</p>
      )}

      <p className="experience-card__summary">{experience.summary}</p>

      {experience.achievements && experience.achievements.length > 0 && (
        <div className="experience-card__achievements">
          <h4 className="experience-card__achievements-heading">
            Key Achievements
          </h4>
          <ul>
            {experience.achievements.map((achievement, i) => (
              <li key={i}>{achievement}</li>
            ))}
          </ul>
        </div>
      )}

      {experience.technologies && experience.technologies.length > 0 && (
        <ul className="experience-card__tags">
          {experience.technologies.map((tech) => (
            <li key={tech} className="experience-card__tag">
              {tech}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
