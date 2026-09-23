import { describe, expect, it } from "vitest";
import { cosineSimilarity, DOCUMENTS, QUERIES, rankNeighbors } from "./model";

describe("illustrative embeddings", () => {
  it("keeps warm drinks ahead of cold drinks in the teaching example", () => {
    expect(rankNeighbors("drink", 3).map((item) => item.id)).toEqual([
      "tea",
      "cocoa",
      "coffee",
    ]);
  });
  it("retrieves the intended nearest phrase without sharing a query word", () => {
    expect(QUERIES.map((query) => rankNeighbors(query.id, 1)[0].id)).toEqual([
      "cat",
      "tea",
      "train",
      "band",
      "forest",
      "stars",
    ]);
    for (const [index, topic] of [
      "pets",
      "drinks",
      "transport",
      "music",
      "nature",
      "space",
    ].entries()) {
      expect(
        rankNeighbors(QUERIES[index].id, 5).every(
          (item) => item.group === topic,
        ),
      ).toBe(true);
    }
  });

  it("populates all eight sign octants of the point cloud", () => {
    const octants = new Set(
      DOCUMENTS.map((document) =>
        document.vector
          .map((coordinate) => (coordinate > 0 ? "+" : "-"))
          .join(""),
      ),
    );
    expect(octants).toEqual(
      new Set(["+++", "++-", "+-+", "+--", "-++", "-+-", "--+", "---"]),
    );
  });

  it("retrieves five negative-z neighbors for each negative-z query", () => {
    for (const id of ["music", "nature", "space"]) {
      expect(QUERIES.find((query) => query.id === id)?.vector[2]).toBeLessThan(
        0,
      );
      const neighbors = rankNeighbors(id, 5);
      expect(neighbors).toHaveLength(5);
      expect(neighbors.every((document) => document.vector[2] < 0)).toBe(true);
    }
  });

  it("orders equal-length vectors identically by cosine and distance", () => {
    expect(new Set(DOCUMENTS.map((item) => item.id)).size).toBe(
      DOCUMENTS.length,
    );
    for (const point of [...DOCUMENTS, ...QUERIES])
      expect(Math.hypot(...point.vector)).toBeCloseTo(1, 12);
    for (const query of QUERIES) {
      const ranked = rankNeighbors(query.id, DOCUMENTS.length);
      const byDistance = [...DOCUMENTS].sort(
        (a, b) =>
          Math.hypot(...a.vector.map((value, i) => value - query.vector[i])) -
          Math.hypot(...b.vector.map((value, i) => value - query.vector[i])),
      );
      expect(ranked.map((item) => item.id)).toEqual(
        byDistance.map((item) => item.id),
      );
      expect(rankNeighbors(query.id, 3)).toEqual(ranked.slice(0, 3));
    }
  });

  it("measures direction independently of positive length", () => {
    for (const angle of [0, 30, 60, 90, 120, 150, 180]) {
      for (const length of [0.5, 1, 2]) {
        const radians = (angle * Math.PI) / 180;
        const vector = [
          Math.cos(radians) * length,
          Math.sin(radians) * length,
          0,
        ];
        expect(Math.hypot(...vector)).toBeCloseTo(length, 12);
        expect(cosineSimilarity([3, 0, 0], vector)).toBeCloseTo(
          Math.cos((angle * Math.PI) / 180),
          12,
        );
      }
    }
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBe(-1);
  });

  it("rejects undefined cosine comparisons and bounds the result count", () => {
    expect(() => cosineSimilarity([0, 0, 0], [1, 0, 0])).toThrow(RangeError);
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(RangeError);
    expect(() => cosineSimilarity([Infinity, 0, 0], [1, 0, 0])).toThrow(
      RangeError,
    );
    expect(rankNeighbors("pet", -1)).toEqual([]);
    expect(rankNeighbors("pet", 2.9)).toHaveLength(2);
    expect(rankNeighbors("pet", 999)).toHaveLength(DOCUMENTS.length);
  });
});
