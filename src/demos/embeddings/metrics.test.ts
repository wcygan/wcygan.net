import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "./model";
import {
  METRIC_DOCUMENTS,
  METRIC_QUERY,
  metricScore,
  metricVectors,
  rankByMetric,
  type SimilarityMetric,
} from "./metrics";

const metrics: SimilarityMetric[] = ["cosine", "distance", "dot"];

describe("embedding comparison metrics", () => {
  it("chooses three different winners from the same raw vectors", () => {
    expect(rankByMetric("cosine", false).map(({ id }) => id)).toEqual([
      "A",
      "B",
      "C",
    ]);
    expect(rankByMetric("distance", false).map(({ id }) => id)).toEqual([
      "B",
      "A",
      "C",
    ]);
    expect(rankByMetric("dot", false).map(({ id }) => id)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("gives every metric the same full ranking after normalization", () => {
    for (const metric of metrics) {
      expect(rankByMetric(metric, true).map(({ id }) => id)).toEqual([
        "A",
        "B",
        "C",
      ]);
    }
  });

  it("normalizes lengths while preserving directions and cosine scores", () => {
    const raw = metricVectors(false);
    const normalized = metricVectors(true);
    expect(Math.hypot(...normalized.query)).toBeCloseTo(1, 12);
    expect(cosineSimilarity(raw.query, normalized.query)).toBeCloseTo(1, 12);

    for (const [index, document] of normalized.documents.entries()) {
      const original = raw.documents[index];
      expect(Math.hypot(...document.vector)).toBeCloseTo(1, 12);
      expect(cosineSimilarity(original.vector, document.vector)).toBeCloseTo(
        1,
        12,
      );
      expect(
        metricScore(normalized.query, document.vector, "cosine"),
      ).toBeCloseTo(metricScore(raw.query, original.vector, "cosine"), 12);
    }
  });

  it("relates normalized dot products and distances to cosine", () => {
    const { query, documents } = metricVectors(true);
    for (const { vector } of documents) {
      const cosine = metricScore(query, vector, "cosine");
      expect(metricScore(query, vector, "dot")).toBeCloseTo(cosine, 12);
      expect(metricScore(query, vector, "distance") ** 2).toBeCloseTo(
        2 - 2 * cosine,
        12,
      );
    }
  });

  it("leaves the source vectors unchanged and returns independent copies", () => {
    const query = [...METRIC_QUERY];
    const documents = structuredClone(METRIC_DOCUMENTS);
    for (const normalized of [false, true]) {
      const vectors = metricVectors(normalized);
      vectors.query[0] = 99;
      vectors.documents[0].vector[0] = 99;
      for (const metric of metrics) {
        metricScore(METRIC_QUERY, METRIC_DOCUMENTS[0].vector, metric);
        const ranked = rankByMetric(metric, normalized);
        ranked[0].vector[0] = 99;
      }
    }
    expect(METRIC_QUERY).toEqual(query);
    expect(METRIC_DOCUMENTS).toEqual(documents);
  });
});
