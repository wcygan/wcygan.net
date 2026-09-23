import { describe, expect, it } from "vitest";
import { DEMOS } from "./model";
import { messagePhase, transitionTiming } from "./motion";
import type { Message } from "./types";

describe("transaction pacing", () => {
  it("separates reading, local work, and the arrived-state hold", () => {
    const [start, staged] = DEMOS.placement.scenarios[0].frames;
    expect(transitionTiming(start, staged)).toEqual({
      dwell: 650,
      travel: 550,
      settle: 400,
    });
  });

  it("gives network packets a readable travel beat and a settled arrival", () => {
    const [start, request] = DEMOS["two-phase"].scenarios[0].frames;
    expect(transitionTiming(start, request)).toEqual({
      dwell: 600,
      travel: 1200,
      settle: 400,
    });
  });

  it("preserves a distinct teaching beat for commit wait without network traffic", () => {
    const frames = DEMOS.spanner.scenarios[0].frames;
    const waitAt = frames.findIndex((frame) => frame.wait);
    expect(frames[waitAt].messages).toHaveLength(0);
    expect(transitionTiming(frames[waitAt - 1], frames[waitAt])).toEqual({
      dwell: 700,
      travel: 1600,
      settle: 400,
    });
  });

  it("gives the topology morph more travel time than a local update", () => {
    const [together, split, localWrite] = DEMOS.independent.scenarios[0].frames;
    expect(transitionTiming(together, split)).toEqual({
      dwell: 700,
      travel: 1600,
      settle: 400,
    });
    expect(transitionTiming(together, split).travel).toBeGreaterThan(
      transitionTiming(split, localWrite).travel,
    );
  });
});

describe("message causality", () => {
  it("delivers the state request before its reply begins, with a full travel beat for each", () => {
    const request: Message = { from: "a", to: "b", label: "State?" };
    const reply: Message = { from: "b", to: "a", label: "Pre-commit", beat: 1 };
    const messages = [request, reply];
    expect(messagePhase(request, messages, 0)).toBe(0);
    expect(messagePhase(request, messages, 0.25)).toBe(0.5);
    expect(messagePhase(reply, messages, 0.25)).toBeLessThan(0);
    expect(messagePhase(request, messages, 0.5)).toBe(1);
    expect(messagePhase(reply, messages, 0.5)).toBe(0);
    expect(messagePhase(request, messages, 0.75)).toBeGreaterThan(1);
    expect(messagePhase(reply, messages, 0.75)).toBe(0.5);
    expect(messagePhase(reply, messages, 1)).toBe(1);
    const frame = DEMOS["three-phase"].scenarios[0].frames[0];
    expect(transitionTiming(frame, { ...frame, messages }).travel).toBe(2400);
  });

  it("keeps broadcasts parallel and as fast as one message", () => {
    const [start, request] = DEMOS["two-phase"].scenarios[0].frames;
    const messages = request.messages;
    expect(messages).toHaveLength(2);
    for (const progress of [0, 0.25, 0.75, 1]) {
      expect(messagePhase(messages[0], messages, progress)).toBe(
        messagePhase(messages[1], messages, progress),
      );
    }
    expect(transitionTiming(start, request).travel).toBe(
      transitionTiming(start, { ...request, messages: messages.slice(0, 1) })
        .travel,
    );
  });
});
