import { cosineSimilarity, type Vector } from "./model";

export type SimilarityMetric = "cosine" | "dot" | "distance";
export type MetricDocumentId = "A" | "B" | "C";

export interface MetricDocument {
  id: MetricDocumentId;
  vector: Vector;
}

export const METRIC_QUERY: Vector = [1, 0, 0];

// Hand-authored coordinates: direction, proximity, and magnitude favor
// different documents until every vector has the same length.
export const METRIC_DOCUMENTS: MetricDocument[] = [
  { id: "A", vector: [1.4, 0.15, 0.3] },
  { id: "B", vector: [0.82, -0.34, 0.12] },
  { id: "C", vector: [1.7, 0.8, -0.8] },
];

export function metricVectors(normalized: boolean): {
  query: Vector;
  documents: MetricDocument[];
} {
  const copyVector = (vector: Vector): Vector => {
    const length = normalized ? Math.hypot(...vector) : 1;
    return vector.map((value) => value / length) as Vector;
  };

  return {
    query: copyVector(METRIC_QUERY),
    documents: METRIC_DOCUMENTS.map((document) => ({
      ...document,
      vector: copyVector(document.vector),
    })),
  };
}

export function metricScore(
  query: Vector,
  document: Vector,
  metric: SimilarityMetric,
): number {
  switch (metric) {
    case "cosine":
      return cosineSimilarity(query, document);
    case "dot":
      return query.reduce(
        (sum, value, index) => sum + value * document[index],
        0,
      );
    case "distance":
      return Math.hypot(
        ...query.map((value, index) => value - document[index]),
      );
  }
}

export function rankByMetric(
  metric: SimilarityMetric,
  normalized: boolean,
): (MetricDocument & { score: number })[] {
  const { query, documents } = metricVectors(normalized);
  const direction = metric === "distance" ? 1 : -1;
  return documents
    .map((document) => ({
      ...document,
      score: metricScore(query, document.vector, metric),
    }))
    .sort(
      (a, b) => direction * (a.score - b.score) || a.id.localeCompare(b.id),
    );
}
