import { describe, expect, it } from "vitest";
import {
  shouldShowTableOfContents,
  slugBaseForHeading,
  uniqueHeadingId,
} from "./table-of-contents";

describe("table of contents helpers", () => {
  it("creates readable heading slugs", () => {
    expect(slugBaseForHeading("Workflows vs Activities")).toBe(
      "workflows-vs-activities",
    );
    expect(slugBaseForHeading("Retries and idempotency")).toBe(
      "retries-and-idempotency",
    );
    expect(slugBaseForHeading("Kafka, WAL & CDC")).toBe("kafka-wal-and-cdc");
  });

  it("deduplicates repeated heading ids", () => {
    const usedIds = new Map<string, number>();

    expect(uniqueHeadingId("References", usedIds)).toBe("references");
    expect(uniqueHeadingId("References", usedIds)).toBe("references-1");
    expect(uniqueHeadingId("References", usedIds)).toBe("references-2");
  });

  it("only shows a table of contents for posts with multiple headings", () => {
    expect(shouldShowTableOfContents(undefined)).toBe(false);
    expect(
      shouldShowTableOfContents([
        { id: "references", title: "References", depth: 2 },
      ]),
    ).toBe(false);
    expect(
      shouldShowTableOfContents([
        { id: "workflows", title: "Workflows", depth: 2 },
        { id: "activities", title: "Activities", depth: 2 },
      ]),
    ).toBe(true);
  });
});
