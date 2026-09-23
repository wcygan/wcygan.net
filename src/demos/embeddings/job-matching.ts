export interface JobProfile {
  id: string;
  name: string;
  summary: string;
  scores: Record<string, number>;
}

export interface JobDescription {
  id: string;
  title: string;
  summary: string;
}

export const JOB_DESCRIPTIONS: JobDescription[] = [
  {
    id: "software-engineer",
    title: "Software Engineer",
    summary:
      "Build and maintain software, design reliable systems, and solve technical problems with a team.",
  },
  {
    id: "doctor",
    title: "Doctor",
    summary:
      "Diagnose conditions, care for patients, and coordinate treatment using clinical knowledge.",
  },
  {
    id: "pilot",
    title: "Pilot",
    summary:
      "Operate aircraft, navigate changing conditions, and keep passengers safe through careful decisions.",
  },
  {
    id: "chef",
    title: "Chef",
    summary:
      "Plan menus, prepare ingredients, and lead a kitchen to produce consistent meals.",
  },
];

// Illustrative cosine scores for the demo, not output from a live embedding model.
export const JOB_PROFILES: JobProfile[] = [
  {
    id: "alex",
    name: "Alex",
    summary:
      "I build APIs and data tools, debug production issues, and enjoy designing reliable systems with a team.",
    scores: {
      "software-engineer": 0.86,
      doctor: 0.29,
      pilot: 0.34,
      chef: 0.24,
    },
  },
  {
    id: "samira",
    name: "Samira",
    summary:
      "I care for people, investigate symptoms, explain treatment options, and work calmly with a care team.",
    scores: {
      "software-engineer": 0.31,
      doctor: 0.89,
      pilot: 0.36,
      chef: 0.28,
    },
  },
  {
    id: "jordan",
    name: "Jordan",
    summary:
      "I love aviation, read weather and navigation charts, and follow careful safety procedures under pressure.",
    scores: {
      "software-engineer": 0.33,
      doctor: 0.35,
      pilot: 0.88,
      chef: 0.27,
    },
  },
  {
    id: "ren",
    name: "Ren",
    summary:
      "I develop recipes, prep fresh ingredients, and lead a busy kitchen through dinner service.",
    scores: {
      "software-engineer": 0.25,
      doctor: 0.28,
      pilot: 0.26,
      chef: 0.87,
    },
  },
];

export function rankJobsForProfile(profile: JobProfile) {
  return JOB_DESCRIPTIONS.map((job) => ({
    ...job,
    score: profile.scores[job.id],
  })).sort((a, b) => b.score - a.score);
}
