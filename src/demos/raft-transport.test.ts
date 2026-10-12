import { expect, it } from "vitest";
import { payloadUnitsPerSecond, routeLength } from "./raft-transport";
import {
  getReplicationLesson,
  replicationState,
  storageDuration,
} from "./raft-log-replication/model";
import { messageRoute, replicationLayout } from "./raft-log-replication/layout";
import {
  getRecoveryLesson,
  recoveryState,
  nodeTimer,
} from "./raft-leader-recovery/model";
import { recoveryLayout } from "./raft-leader-recovery/layout";

it.each([false, true])(
  "uses the same arc-length speed for every payload in both diagrams (compact=%s)",
  (compact) => {
    const replication = getReplicationLesson(compact);
    const recovery = getRecoveryLesson(compact);
    for (const message of replication.messages) {
      const distance = routeLength(
        messageRoute(replicationLayout(compact), message),
      );
      expect(distance / ((message.end - message.start) / 1000)).toBeCloseTo(
        payloadUnitsPerSecond,
        8,
      );
      if (message.kind === "ack")
        expect(
          replicationState(message.start, compact).nodes.find(
            (node) => node.server === message.from,
          )!.stored,
        ).toBe(message.storedThrough);
      if (message.kind === "entry")
        expect(
          replicationState(message.end + storageDuration, compact).nodes.find(
            (node) => node.server === message.to,
          )!.stored,
        ).toBe(message.lastIndex);
    }
    for (const message of recovery.messages) {
      const distance = routeLength(recoveryLayout(compact).route(message));
      expect(distance / ((message.end - message.start) / 1000)).toBeCloseTo(
        payloadUnitsPerSecond,
        8,
      );
    }
    const [near, far] = recovery.messages.filter(
      (message) => message.from === "B",
    );
    expect(near.start).toBe(far.start);
    expect(far.end).toBeGreaterThan(near.end);
    expect(
      nodeTimer(recoveryState(near.end, compact).nodes[1], near.end, compact)
        .elapsed,
    ).toBe(0);
    expect(
      nodeTimer(recoveryState(far.end, compact).nodes[2], far.end, compact)
        .elapsed,
    ).toBe(0);
    for (const node of recoveryState(recovery.duration, compact).nodes)
      expect(node).toMatchObject({
        stored: 5,
        commit: 5,
        term: 7,
        offline: false,
      });
    recovery.beats.forEach((beat, step) =>
      expect(recoveryState(beat.settledAt, compact).step).toBe(step),
    );
    const leaderElection = recovery.messages.find(
      (message) => message.label === "Vote granted",
    )!;
    expect(recoveryState(leaderElection.end - 1, compact).nodes[1].role).toBe(
      "Candidate",
    );
    expect(recoveryState(leaderElection.end, compact).nodes[1].role).toBe(
      "Leader",
    );
  },
);
