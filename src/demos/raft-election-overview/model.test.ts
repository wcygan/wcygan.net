import { describe, expect, it } from "vitest";
import {
  countVotes,
  lessons,
  electionServers as servers,
  receivedBallots,
  nodeStates,
  messageTravelTime,
} from "./model";

describe("election walkthroughs", () => {
  for (const [name, lesson] of Object.entries(lessons)) {
    it(
      name + " preserves votes within a term and elects only a majority",
      () => {
        for (const [index, step] of lesson.steps.entries()) {
          const previous = lesson.steps[index - 1];
          if (previous?.term === step.term) {
            for (const server of servers) {
              if (previous.ballots[server])
                expect(step.ballots[server]).toBe(previous.ballots[server]);
            }
          }
          if (step.leader)
            expect(
              countVotes(step.ballots, step.leader),
            ).toBeGreaterThanOrEqual(2);
          expect(
            servers.filter((server) => countVotes(step.ballots, server) >= 2),
          ).toHaveLength(
            step.leader || step.name === "B receives the votes" ? 1 : 0,
          );
        }
        expect(lesson.steps.at(-1)?.leader).toBe("B");
      },
    );
  }
  it("a split vote remains leaderless until a new term", () => {
    const split = lessons.split.steps[2];
    expect(split.leader).toBeUndefined();
    expect(countVotes(split.ballots, "B")).toBe(1);
    expect(countVotes(split.ballots, "C")).toBe(1);
    expect(lessons.split.steps[3].term).toBeGreaterThan(split.term);
  });
});

describe("each server’s local election state", () => {
  for (const [name, lesson] of Object.entries(lessons)) {
    it(
      name +
        " learns terms from requests and learns the leader from heartbeats",
      () => {
        const initial = nodeStates(lesson.steps, 0, 0, false);
        for (const server of servers) {
          expect(initial[server]).toEqual({ term: 4, role: "Follower" });
        }
        const starting = nodeStates(lesson.steps, 1, 0, false);
        for (const server of servers) {
          expect(starting[server].term).toBe(
            lesson.steps[1].candidates.includes(server) ? 5 : 4,
          );
          expect(starting[server].leader).toBeUndefined();
        }
        const requested = nodeStates(lesson.steps, 1, 5000, false);
        expect(servers.every((server) => requested[server].term === 5)).toBe(
          true,
        );
        if (name === "split") expect(requested.C.role).toBe("Candidate");

        const electedIndex = lesson.steps.length - 1;
        const beforeHeartbeat = nodeStates(
          lesson.steps,
          electedIndex,
          messageTravelTime - 1,
          false,
        );
        expect(beforeHeartbeat.B.role).toBe("Leader");
        expect(beforeHeartbeat.B.leader).toBe("B");
        for (const server of servers.filter((server) => server !== "B")) {
          expect(beforeHeartbeat[server].leader).toBeUndefined();
        }
        const received = nodeStates(lesson.steps, electedIndex, 5000, false);
        for (const server of servers) {
          expect(received[server].term).toBe(lesson.steps[electedIndex].term);
          expect(received[server].leader).toBe("B");
          expect(received[server].role).toBe(
            server === "B" ? "Leader" : "Follower",
          );
          expect(received[server].votedFor).toBe(
            lesson.steps[electedIndex].ballots[server],
          );
        }
        expect(received.C.votedFor).toBe("B");
        expect(nodeStates(lesson.steps, electedIndex, 0, true)).toEqual(
          received,
        );
      },
    );
  }

  it("keeps C’s old candidacy and vote until B’s higher-term request arrives", () => {
    const steps = lessons.split.steps;
    const before = nodeStates(steps, 3, messageTravelTime - 1, false);
    expect(before.B).toEqual({
      term: 6,
      role: "Candidate",
      votedFor: "B",
      leader: undefined,
    });
    expect(before.C).toEqual({
      term: 5,
      role: "Candidate",
      votedFor: "C",
      leader: undefined,
    });
    expect(before.C.votedFor).toBe("C");
    const after = nodeStates(steps, 3, 5000, false);
    for (const server of servers.filter((server) => server !== "B")) {
      expect(after[server]).toEqual({
        term: 6,
        role: "Follower",
        votedFor: "B",
        leader: undefined,
      });
    }
    expect(nodeStates(steps, 3, 0, true)).toEqual(after);
  });

  it("records a vote without treating the candidate as a known leader", () => {
    const recorded = nodeStates(lessons.success.steps, 2, 0, false);
    expect(recorded.A.votedFor).toBe("B");
    expect(recorded.A.leader).toBeUndefined();
    expect(recorded.A.term).toBe(5);
  });
});

it("counts affirmative replies only after arrival and never counts a refusal", () => {
  const previous = lessons.success.steps[1],
    step = lessons.success.steps[2];
  expect(receivedBallots(step, previous, 1500, false)).toEqual({ B: "B" });
  expect(receivedBallots(step, previous, 5000, false)).toEqual({
    A: "B",
    B: "B",
    C: "B",
  });
  const split = lessons.split.steps[2];
  expect(receivedBallots(split, lessons.split.steps[1], 10000, false)).toEqual({
    A: "A",
    B: "B",
    C: "C",
  });
});
