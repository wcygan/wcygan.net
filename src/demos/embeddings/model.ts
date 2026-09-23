export type Vector = [number, number, number];
export type Topic =
  | "pets"
  | "drinks"
  | "transport"
  | "music"
  | "nature"
  | "space";
export interface EmbeddingDocument {
  id: string;
  label: string;
  vector: Vector;
  group: Topic;
}

function unit(vector: Vector): Vector {
  const magnitude = Math.hypot(...vector);
  return vector.map((value) => value / magnitude) as Vector;
}

// Hand-authored teaching coordinates, not the output of an embedding model.
// Equal-length vectors make shorter Euclidean distances mean larger cosine.
export const DOCUMENTS: EmbeddingDocument[] = [
  {
    id: "cat",
    label: "a sleeping cat",
    group: "pets",
    vector: unit([-0.76, 0.52, 0.61]),
  },
  {
    id: "kitten",
    label: "a playful kitten",
    group: "pets",
    vector: unit([-0.66, 0.79, 0.46]),
  },
  {
    id: "dog",
    label: "a loyal dog",
    group: "pets",
    vector: unit([-0.96, 0.3, 0.49]),
  },
  {
    id: "puppy",
    label: "a tiny puppy",
    group: "pets",
    vector: unit([-0.47, 0.61, 0.72]),
  },
  {
    id: "rabbit",
    label: "a pet rabbit",
    group: "pets",
    vector: unit([-0.91, 0.71, 0.2]),
  },
  {
    id: "vet",
    label: "a visit to the vet",
    group: "pets",
    vector: unit([-0.94, 0.03, 0.67]),
  },
  {
    id: "tea",
    label: "a cup of tea",
    group: "drinks",
    vector: unit([0.68, 0.57, 0.56]),
  },
  {
    id: "coffee",
    label: "freshly brewed coffee",
    group: "drinks",
    vector: unit([0.83, 0.37, 0.51]),
  },
  {
    id: "cocoa",
    label: "hot chocolate",
    group: "drinks",
    vector: unit([0.47, 0.77, 0.53]),
  },
  {
    id: "latte",
    label: "a milky latte",
    group: "drinks",
    vector: unit([0.96, 0.58, 0.22]),
  },
  {
    id: "water",
    label: "a glass of water",
    group: "drinks",
    vector: unit([0.45, 0.31, 0.83]),
  },
  {
    id: "juice",
    label: "fresh orange juice",
    group: "drinks",
    vector: unit([0.81, 0.84, 0.08]),
  },
  {
    id: "train",
    label: "the morning train",
    group: "transport",
    vector: unit([0.06, -0.78, 0.66]),
  },
  {
    id: "bus",
    label: "a bus downtown",
    group: "transport",
    vector: unit([0.29, -0.66, 0.72]),
  },
  {
    id: "bike",
    label: "cycling to the office",
    group: "transport",
    vector: unit([-0.21, -0.72, 0.64]),
  },
  {
    id: "car",
    label: "driving to work",
    group: "transport",
    vector: unit([0.1, -0.95, 0.37]),
  },
  {
    id: "taxi",
    label: "a taxi across town",
    group: "transport",
    vector: unit([0.5, -0.84, 0.31]),
  },
  {
    id: "walk",
    label: "walking down the street",
    group: "transport",
    vector: unit([-0.39, -0.44, 0.81]),
  },
  {
    id: "band",
    label: "a band on stage",
    group: "music",
    vector: unit([-0.72, 0.56, -0.65]),
  },
  {
    id: "singer",
    label: "a singer at the microphone",
    group: "music",
    vector: unit([-0.65, 0.72, -0.52]),
  },
  {
    id: "guitar",
    label: "an electric guitar solo",
    group: "music",
    vector: unit([-0.88, 0.39, -0.57]),
  },
  {
    id: "drums",
    label: "a drummer keeping time",
    group: "music",
    vector: unit([-0.5, 0.49, -0.82]),
  },
  {
    id: "orchestra",
    label: "an orchestra performing",
    group: "music",
    vector: unit([-0.87, 0.75, -0.3]),
  },
  {
    id: "piano",
    label: "a piano melody",
    group: "music",
    vector: unit([-0.91, 0.16, -0.67]),
  },
  {
    id: "forest",
    label: "a quiet forest trail",
    group: "nature",
    vector: unit([0.71, 0.53, -0.68]),
  },
  {
    id: "trees",
    label: "tall trees overhead",
    group: "nature",
    vector: unit([0.55, 0.75, -0.57]),
  },
  {
    id: "stream",
    label: "a stream between the rocks",
    group: "nature",
    vector: unit([0.83, 0.37, -0.6]),
  },
  {
    id: "moss",
    label: "moss on a fallen log",
    group: "nature",
    vector: unit([0.44, 0.4, -0.84]),
  },
  {
    id: "birds",
    label: "birds in the branches",
    group: "nature",
    vector: unit([0.88, 0.73, -0.28]),
  },
  {
    id: "meadow",
    label: "a meadow of wildflowers",
    group: "nature",
    vector: unit([0.91, 0.15, -0.68]),
  },
  {
    id: "stars",
    label: "billions of stars",
    group: "space",
    vector: unit([0.04, -0.76, -0.65]),
  },
  {
    id: "nebula",
    label: "a glowing nebula",
    group: "space",
    vector: unit([-0.21, -0.66, -0.74]),
  },
  {
    id: "telescope",
    label: "a telescope exploring the universe",
    group: "space",
    vector: unit([0.28, -0.65, -0.71]),
  },
  {
    id: "planet",
    label: "a planet orbiting its sun",
    group: "space",
    vector: unit([-0.08, -0.94, -0.4]),
  },
  {
    id: "comet",
    label: "a comet passing by",
    group: "space",
    vector: unit([-0.47, -0.81, -0.38]),
  },
  {
    id: "moon",
    label: "craters on a moon",
    group: "space",
    vector: unit([0.4, -0.45, -0.82]),
  },
];

export const QUERIES = [
  { id: "pet", label: "a purring pet", vector: unit([-0.76, 0.7, 0.6]) },
  { id: "drink", label: "a warm drink", vector: unit([0.64, 0.67, 0.48]) },
  {
    id: "commute",
    label: "a ride to work",
    vector: unit([-0.01, -0.59, 0.75]),
  },
  {
    id: "music",
    label: "a live concert",
    vector: unit([-0.7, 0.55, -0.65]),
  },
  {
    id: "nature",
    label: "a walk in the woods",
    vector: unit([0.7, 0.55, -0.65]),
  },
  {
    id: "space",
    label: "a distant galaxy",
    vector: unit([0.02, -0.75, -0.65]),
  },
];

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length !== b.length || a.length === 0) {
    throw new RangeError(
      "Cosine similarity requires vectors of the same nonzero dimension.",
    );
  }
  const lengthA = Math.hypot(...a);
  const lengthB = Math.hypot(...b);
  if (
    !Number.isFinite(lengthA) ||
    !Number.isFinite(lengthB) ||
    lengthA === 0 ||
    lengthB === 0
  ) {
    throw new RangeError("Cosine similarity requires finite, nonzero vectors.");
  }
  const dot = a.reduce(
    (sum, value, index) => sum + (value / lengthA) * (b[index] / lengthB),
    0,
  );
  return Math.max(-1, Math.min(1, dot));
}

export function rankNeighbors(queryId: string, count: number) {
  const query = QUERIES.find((item) => item.id === queryId);
  if (!query) throw new RangeError(`Unknown example query: ${queryId}`);
  const limit = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return DOCUMENTS.map((document) => ({
    ...document,
    score: cosineSimilarity(query.vector, document.vector),
  }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}
