import { expect, it } from "vitest";
import { electionTimers, getElectionTiming } from "./timing";
import {
  lessons,
  receivedBallots,
  nodeStates,
  voteRecordingTime,
  electionServers as servers,
  messageDeparture,
} from "./model";
import { electionLayout, messageRoute } from "./layout";
import { payloadUnitsPerSecond, routeLength } from "../raft-transport";
it.each([false, true])(
  "paces elections by distance and changes state only on delivery (compact=%s)",
  (compact) => {
    for (const lesson of ["success", "split"] as const) {
      const timing = getElectionTiming(lesson, compact);
      lessons[lesson].steps.forEach((step, index) => {
        (step.traffic ?? []).forEach((message, order) => {
          const travel = timing.flights[index][order];
          expect(
            routeLength(messageRoute(electionLayout(compact), message)) /
              (travel / 1000),
          ).toBeCloseTo(payloadUnitsPerSecond);
          const end =
            travel + messageDeparture(step, order, timing.flights[index]);
          expect(timing.durations[index]).toBeGreaterThanOrEqual(end + 800);
          if (message.kind === "vote" && message.granted) {
            expect(
              receivedBallots(
                step,
                lessons[lesson].steps[index - 1],
                end - 1,
                false,
                timing.flights[index],
              )[message.from],
            ).not.toBe(message.to);
            expect(
              receivedBallots(
                step,
                lessons[lesson].steps[index - 1],
                end,
                false,
                timing.flights[index],
              )[message.from],
            ).toBe(message.to);
          }
          if (message.kind === "heartbeat") {
            expect(
              nodeStates(
                lessons[lesson].steps,
                index,
                end - 1,
                false,
                timing.flights,
              )[message.to].leader,
            ).toBeUndefined();
            expect(
              nodeStates(
                lessons[lesson].steps,
                index,
                end,
                false,
                timing.flights,
              )[message.to].leader,
            ).toBe(message.from);
          }
        });
      });
    }
  },
);
it.each([false, true])(
  "elects B at the second reply rather than after the reading hold (compact=%s)",
  (compact) => {
    for (const lesson of ["success", "split"] as const) {
      const steps = lessons[lesson].steps;
      const index = steps.findIndex(
        (step) => step.name === "B receives the votes",
      );
      const timing = getElectionTiming(lesson, compact);
      const arrivedAt = voteRecordingTime + timing.flights[index][0];
      expect(
        nodeStates(steps, index, arrivedAt - 1, false, timing.flights).B.role,
      ).toBe("Candidate");
      expect(
        nodeStates(steps, index, arrivedAt, false, timing.flights).B,
      ).toMatchObject({ role: "Leader", leader: "B" });
      expect(
        nodeStates(
          steps,
          index,
          timing.checkpoints[index],
          false,
          timing.flights,
        ).B.role,
      ).toBe("Leader");
      expect(nodeStates(steps, index, 0, true, timing.flights).B.role).toBe(
        "Leader",
      );
    }
  },
);
it.each([false, true])(
  "uses the election schedule for expiry, reset, and retry, without hidden timeouts (compact=%s)",
  (compact) => {
    for (const lesson of ["success", "split"] as const) {
      const steps = lessons[lesson].steps;
      const timing = getElectionTiming(lesson, compact);
      expect(
        electionTimers(lesson, 0, timing.starts[1] - 1, compact).B.progress,
      ).toBeGreaterThan(0.99);
      expect(electionTimers(lesson, 1, 0, compact).B.progress).toBe(0);
      expect(nodeStates(steps, 1, 0, false, timing.flights).B.role).toBe(
        "Candidate",
      );
      steps.forEach((step, index) => {
        for (
          let elapsed = 0;
          elapsed < timing.durations[index];
          elapsed += 50
        ) {
          const nodes = nodeStates(
            steps,
            index,
            elapsed,
            false,
            timing.flights,
          );
          const timers = electionTimers(lesson, index, elapsed, compact);
          for (const server of servers)
            if (nodes[server].role !== "Leader")
              expect(timers[server].progress).toBeLessThan(1);
        }
        (step.traffic ?? []).forEach((message, order) => {
          if (message.kind === "heartbeat") {
            const at =
              timing.flights[index][order] +
              messageDeparture(step, order, timing.flights[index]);
            expect(
              electionTimers(lesson, index, at - 1, compact)[message.to]
                .progress,
            ).toBeGreaterThan(0);
            expect(
              electionTimers(lesson, index, at, compact)[message.to],
            ).toMatchObject({
              resetAt: timing.starts[index] + at,
              progress: 0,
            });
          }
        });
      });
    }
    const timing = getElectionTiming("split", compact);
    const before = electionTimers("split", 2, timing.checkpoints[2], compact);
    expect(before.B.progress).toBeLessThan(1);
    expect(before.B.deadline).toBe(timing.starts[3]);
    expect(electionTimers("split", 3, 0, compact).B.progress).toBe(0);
    const nodes = nodeStates(lessons.split.steps, 3, 0, false, timing.flights);
    expect(nodes.B).toMatchObject({
      role: "Candidate",
      term: 6,
      votedFor: "B",
    });
    expect(nodes.C).toMatchObject({
      role: "Candidate",
      term: 5,
      votedFor: "C",
    });
    expect(electionTimers("split", 3, 0, compact).C.progress).toBeLessThan(1);
  },
);

// Each follower records its local vote on RequestVote arrival, independently
// of the later reply that contributes to B’s received majority.
it.each([false, true])(
  "records C’s grant on request delivery in the first election and retry (compact=%s)",
  (compact) => {
    for (const [lesson, requestIndex] of [
      ["success", 1],
      ["split", 3],
    ] as const) {
      const steps = lessons[lesson].steps;
      const timing = getElectionTiming(lesson, compact);
      const step = steps[requestIndex];
      const requestOrder = step.traffic!.findIndex(
        (message) => message.to === "C",
      );
      const arrival =
        messageDeparture(step, requestOrder, timing.flights[requestIndex]) +
        timing.flights[requestIndex][requestOrder];
      expect(
        nodeStates(steps, requestIndex, arrival - 1, false, timing.flights).C
          .votedFor,
      ).toBe(lesson === "split" ? "C" : undefined);
      expect(
        nodeStates(steps, requestIndex, arrival, false, timing.flights).C,
      ).toMatchObject({ term: step.term, role: "Follower", votedFor: "B" });
      expect(
        electionTimers(lesson, requestIndex, arrival, compact).C,
      ).toMatchObject({
        resetAt: timing.starts[requestIndex] + arrival,
        progress: 0,
      });
      const replyIndex = requestIndex + 1;
      const decidingReply = voteRecordingTime + timing.flights[replyIndex][0];
      const local = nodeStates(
        steps,
        replyIndex,
        decidingReply,
        false,
        timing.flights,
      );
      expect(local.B.role).toBe("Leader");
      expect(local.C.votedFor).toBe("B");
      expect(
        receivedBallots(
          steps[replyIndex],
          step,
          decidingReply,
          false,
          timing.flights[replyIndex],
        ),
      ).toEqual({ A: "B", B: "B" });
    }
  },
);
