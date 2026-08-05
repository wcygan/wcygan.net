import { describe, expect, it } from "vitest";
import {
  COMPLETE_TOOL_CALLING_SNAPSHOT,
  deriveToolCallingSnapshot,
  TOOL_CALLING_DURATION_MS,
} from "~/demos/llm-tool-calling/model";

describe("tool calling control-flow model", () => {
  it("routes the tool request through the external API and local harness", () => {
    const snapshot = deriveToolCallingSnapshot(8_000);

    expect(snapshot).toMatchObject({
      phase: "tool-request",
      segment: "tool-request",
      actorStates: { api: "active", computer: "active" },
    });
  });

  it("keeps local tool execution separate from the external API", () => {
    const snapshot = deriveToolCallingSnapshot(11_500);

    expect(snapshot).toMatchObject({
      phase: "tool-execution",
      segment: "tool-execution",
      actorStates: { api: "complete", computer: "active", tool: "active" },
    });
  });

  it("settles on the completed ownership explanation", () => {
    expect(deriveToolCallingSnapshot(TOOL_CALLING_DURATION_MS)).toEqual(
      COMPLETE_TOOL_CALLING_SNAPSHOT,
    );
  });

  it("keeps the tool request visible throughout its complete transfer", () => {
    expect(deriveToolCallingSnapshot(7_000)).toMatchObject({
      phase: "tool-request",
      payload: {
        kind: "json",
        value: { name: "list_directory" },
      },
      segment: "tool-request",
      segmentProgress: 0,
    });

    expect(deriveToolCallingSnapshot(9_999)).toMatchObject({
      phase: "tool-request",
      payload: {
        kind: "json",
        value: { name: "list_directory" },
      },
      segment: "tool-request",
      segmentProgress: expect.closeTo(1, 2),
    });
  });

  it("combines local validation with command execution", () => {
    expect(deriveToolCallingSnapshot(10_000)).toMatchObject({
      phase: "tool-execution",
      payload: {
        kind: "terminal",
        validation: "list_directory available",
        command: "ls src/components",
        files: [
          "DemoReplayButton.tsx",
          "NPlusOneQueryDemos.tsx",
          "TableOfContents.tsx",
        ],
      },
      segmentProgress: 0,
    });
  });

  it("settles on the exact filename answer", () => {
    expect(COMPLETE_TOOL_CALLING_SNAPSHOT.payload).toEqual({
      kind: "result",
      lines: [
        "DemoReplayButton.tsx",
        "NPlusOneQueryDemos.tsx",
        "TableOfContents.tsx",
      ],
    });
  });
});
