import { expect, it } from "vitest";
import {
  connectionWires,
  electionLayout,
  messageRoute,
  pointOnRoute,
} from "./layout";
import { electionConnections, lessons, servers } from "./model";

for (const compact of [false, true]) {
  it(
    "routes every message between facing ports without crossing other servers " +
      (compact ? "on mobile" : "on desktop"),
    () => {
      const layout = electionLayout(compact);
      for (const lesson of Object.values(lessons)) {
        for (const step of lesson.steps) {
          for (const message of step.traffic ?? []) {
            const route = messageRoute(layout, message);
            const from = layout.nodes[message.from],
              to = layout.nodes[message.to];
            expect(route[0][1]).toBe(from.y + from.height / 2);
            expect(route.at(-1)![1]).toBe(to.y + to.height / 2);
            expect(route[0][0]).toBe(
              message.to === "B" ? from.x : from.x + from.width,
            );
            expect(route.at(-1)![0]).toBe(
              message.from === "B" ? to.x : to.x + to.width,
            );
            expect(pointOnRoute(route, 0)).toEqual(route[0]);
            expect(pointOnRoute(route, 1)).toEqual(route.at(-1));
            for (let index = 1; index < route.length; index++) {
              const [a, b] = [route[index - 1], route[index]];
              expect(a[0] === b[0] || a[1] === b[1]).toBe(true);
              for (const server of servers.filter(
                (s) => s !== message.from && s !== message.to,
              )) {
                const node = layout.nodes[server];
                const crosses =
                  a[0] === b[0]
                    ? a[0] > node.x &&
                      a[0] < node.x + node.width &&
                      Math.max(a[1], b[1]) > node.y &&
                      Math.min(a[1], b[1]) < node.y + node.height
                    : a[1] > node.y &&
                      a[1] < node.y + node.height &&
                      Math.max(a[0], b[0]) > node.x &&
                      Math.min(a[0], b[0]) < node.x + node.width;
                expect(crosses).toBe(false);
              }
            }
          }
        }
      }
    },
  );

  it(
    "draws shared trunks only once " + (compact ? "on mobile" : "on desktop"),
    () => {
      const layout = electionLayout(compact);
      const connections = electionConnections(lessons.split.steps[1]);
      const wires = connectionWires(layout, connections);
      for (const [index, wire] of wires.entries()) {
        const [a, b] = wire;
        const axis = a[0] === b[0] ? 1 : 0;
        for (const other of wires.slice(index + 1)) {
          const [c, d] = other;
          if (a[1 - axis] === c[1 - axis] && a[1 - axis] === d[1 - axis]) {
            expect(
              Math.min(b[axis], d[axis]) - Math.max(a[axis], c[axis]),
            ).toBeLessThanOrEqual(0);
          }
        }
      }
      for (const message of connections) {
        const route = messageRoute(layout, message);
        for (let index = 1; index < route.length; index++) {
          const [a, b] = [route[index - 1], route[index]];
          const axis = a[0] === b[0] ? 1 : 0;
          expect(
            wires.some(
              ([c, d]) =>
                c[1 - axis] === a[1 - axis] &&
                d[1 - axis] === a[1 - axis] &&
                c[axis] <= Math.min(a[axis], b[axis]) &&
                d[axis] >= Math.max(a[axis], b[axis]),
            ),
          ).toBe(true);
        }
      }
    },
  );

  it(
    "uses the same B–D lane in both directions and keeps D’s other links on the right " +
      (compact ? "on mobile" : "on desktop"),
    () => {
      const layout = electionLayout(compact);
      const toD = messageRoute(layout, { kind: "request", from: "B", to: "D" });
      const toB = messageRoute(layout, { kind: "request", from: "D", to: "B" });
      expect(toB).toEqual([...toD].reverse());
      expect(
        messageRoute(layout, {
          kind: "vote",
          from: "D",
          to: "B",
          granted: false,
        }),
      ).toEqual(toB);
      expect(
        messageRoute(layout, {
          kind: "vote",
          from: "B",
          to: "D",
          granted: false,
        }),
      ).toEqual(toD);
      for (const to of ["A", "C", "E"] as const) {
        const route = messageRoute(layout, { kind: "request", from: "D", to });
        expect(route[0][0]).toBe(layout.nodes.D.x + layout.nodes.D.width);
        expect(route[1][0]).toBe(layout.width - 22);
        expect(route[2][0]).toBe(layout.width - 22);
        expect(route.at(-1)![0]).toBe(
          layout.nodes[to].x + layout.nodes[to].width,
        );
      }
      const shared = connectionWires(
        layout,
        electionConnections(lessons.split.steps[1]),
      );
      const singleCandidate = connectionWires(
        layout,
        electionConnections(lessons.success.steps[1]),
      );
      const leftBus = shared.filter((points) =>
        points.every(([x]) => x <= layout.nodes.D.x),
      );
      expect(leftBus).toEqual(singleCandidate);
    },
  );
}
