import { describe, expect, it } from "vitest";
import {
  COMPLETE_TOOL_CALLING_SNAPSHOT,
  deriveToolCallingSnapshot,
  TOOL_CALLING_DURATION_MS,
} from "~/demos/llm-tool-calling/model";

describe("tool calling control-flow model", () => {
  it("routes the tool request through the external API and local harness", () => {
    const snapshot = deriveToolCallingSnapshot(3_900);

    expect(snapshot).toMatchObject({
      phase: "tool-request",
      segment: "tool-request",
      actorStates: { api: "active", computer: "active" },
    });
  });

  it("keeps local tool execution separate from the external API", () => {
    const snapshot = deriveToolCallingSnapshot(6_300);

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
});
