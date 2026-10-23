import { expect, it } from "vitest";
import {
  connectionWires,
  electionLayout,
  messageRoute,
  pointOnRoute,
  payloadLabelPosition,
  payloadTetherGap,
} from "./layout";
import {
  electionConnections,
  lessons,
  electionServers as servers,
} from "./model";

for (const compact of [false, true]) {
  it(
    "uses direct, reversible edges between facing circle ports, compact=" +
      compact,
    () => {
      const layout = electionLayout(compact);
      for (const from of servers)
        for (const to of servers.filter((id) => id !== from)) {
          const route = messageRoute(layout, { kind: "request", from, to });
          expect(route).toHaveLength(2);
          for (const [point, server] of [
            [route[0], from],
            [route[1], to],
          ] as const) {
            const center = layout.centers[server];
            expect(
              Math.hypot(point[0] - center[0], point[1] - center[1]),
            ).toBeCloseTo(20);
          }
          expect(
            messageRoute(layout, {
              kind: "vote",
              from: to,
              to: from,
              granted: true,
            }),
          ).toEqual([...route].reverse());
          expect(pointOnRoute(route, 0)).toEqual(route[0]);
          expect(pointOnRoute(route, 1)).toEqual(route[1]);
        }
      expect(
        messageRoute(layout, { kind: "request", from: "B", to: "C" })[0][1],
      ).toBe(layout.centers.B[1]);
    },
  );
  it("draws each of the three connections once, compact=" + compact, () => {
    const layout = electionLayout(compact);
    const connections = electionConnections(lessons.split.steps[1]);
    const wires = connectionWires(layout, connections);
    expect(wires).toHaveLength(3);
    expect(wires).toEqual(connectionWires(layout, [...connections].reverse()));
    expect(Object.keys(layout.nodes)).toEqual(servers);
  });
  it(
    "keeps moving payloads unclipped and clear of node details and tally, compact=" +
      compact,
    () => {
      const layout = electionLayout(compact),
        halfWidth = layout.payloadWidth / 2;
      const protectedBounds = servers.flatMap((server) => {
        const [, y] = layout.centers[server];
        const offsets =
          server === "A" ? layout.aDetailOffsets : layout.detailOffsets;
        // Test each visible row: the timer and Timeout label are narrower
        // than the role, so a single large box overstates their footprint.
        return [96, 84, 84, 70, server === "A" ? 72 : 84].map((width, row) => ({
          x: layout.detailCenters[server] - width / 2,
          y: y + offsets[row] - (row === 3 ? 0 : 16),
          width,
          height: row === 3 ? 3 : 20,
        }));
      });
      protectedBounds.push({
        x: layout.width / 2 - 70,
        y: layout.tallyY - 14,
        width: 140,
        height: 124,
      });
      for (const lesson of Object.values(lessons))
        for (const step of lesson.steps)
          for (const message of step.traffic ?? [])
            for (let sample = 0; sample <= 100; sample++) {
              const [x, y] = payloadLabelPosition(
                message,
                pointOnRoute(messageRoute(layout, message), sample / 100),
                layout,
              );
              expect(x - halfWidth).toBeGreaterThanOrEqual(-layout.sidePadding);
              expect(x + halfWidth).toBeLessThanOrEqual(
                layout.width + layout.sidePadding,
              );
              expect(y - layout.payloadHeight / 2).toBeGreaterThanOrEqual(
                layout.top,
              );
              expect(y + layout.payloadHeight / 2).toBeLessThanOrEqual(
                layout.height,
              );
              for (const other of protectedBounds)
                expect(
                  x + halfWidth <= other.x ||
                    other.x + other.width <= x - halfWidth ||
                    y + layout.payloadHeight / 2 <= other.y ||
                    other.y + other.height <= y - layout.payloadHeight / 2,
                ).toBe(true);
            }
    },
  );
}

it.each([false, true])(
  "keeps B's simultaneous request labels separate for their whole flight (compact=%s)",
  (compact) => {
    const layout = electionLayout(compact),
      width = layout.payloadWidth;
    const requests = lessons.success.steps[1].traffic!;
    const routes = requests.map((message) => messageRoute(layout, message));
    const flights = routes.map(
      (route) =>
        Math.hypot(route[1][0] - route[0][0], route[1][1] - route[0][1]) / 140,
    );
    for (let time = 0; time <= Math.min(...flights); time += 0.01) {
      const [a, b] = requests.map((message, index) =>
        payloadLabelPosition(
          message,
          pointOnRoute(routes[index], time / flights[index]),
          layout,
        ),
      );
      expect(
        Math.abs(a[0] - b[0]) >= width + 4 ||
          Math.abs(a[1] - b[1]) >= layout.payloadHeight + 4,
      ).toBe(true);
    }
  },
);

it.each([false, true])(
  "keeps diagonal metadata off its entire connection with the dot exposed (compact=%s)",
  (compact) => {
    const layout = electionLayout(compact),
      halfWidth = layout.payloadWidth / 2;
    for (const to of ["B", "C"] as const) {
      const message = { kind: "request" as const, from: "A" as const, to };
      const route = messageRoute(layout, message);
      const length = Math.hypot(
        route[1][0] - route[0][0],
        route[1][1] - route[0][1],
      );
      const normal = [
        -(route[1][1] - route[0][1]) / length,
        (route[1][0] - route[0][0]) / length,
      ];
      const support =
        Math.abs(normal[0]) * halfWidth +
        (Math.abs(normal[1]) * layout.payloadHeight) / 2;
      for (let sample = 0; sample <= 100; sample++) {
        const packet = pointOnRoute(route, sample / 100);
        const label = payloadLabelPosition(message, packet, layout);
        const separation = Math.abs(
          (label[0] - packet[0]) * normal[0] +
            (label[1] - packet[1]) * normal[1],
        );
        expect(separation - support).toBeGreaterThan(4);
      }
    }
  },
);

it.each([false, true])(
  "uses the same short tether gap and parallel motion on every route (compact=%s)",
  (compact) => {
    const layout = electionLayout(compact);
    for (const to of ["A", "C"] as const) {
      const message = { kind: "request" as const, from: "B" as const, to };
      const route = messageRoute(layout, message);
      let previousOffset: number[] | undefined;
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const packet = pointOnRoute(route, progress);
        const label = payloadLabelPosition(message, packet, layout);
        const offset = [label[0] - packet[0], label[1] - packet[1]];
        const distance = Math.hypot(...offset);
        const edge = Math.min(
          layout.payloadWidth / 2 / Math.abs(offset[0] / distance),
          layout.payloadHeight / 2 / Math.abs(offset[1] / distance),
        );
        expect(distance - edge).toBeCloseTo(payloadTetherGap);
        if (previousOffset)
          offset.forEach((value, i) =>
            expect(value).toBeCloseTo(previousOffset![i]),
          );
        previousOffset = offset;
      }
    }
  },
);

it.each([false, true])(
  "keeps packet dots clear of the closer node details (compact=%s)",
  (compact) => {
    const layout = electionLayout(compact);
    for (const from of servers)
      for (const to of servers.filter((server) => server !== from)) {
        const route = messageRoute(layout, { kind: "request", from, to });
        for (let sample = 0; sample <= 100; sample++) {
          const [x, y] = pointOnRoute(route, sample / 100);
          const radius = compact ? 4 : 3;
          for (const server of servers) {
            const offsets =
              server === "A" ? layout.aDetailOffsets : layout.detailOffsets;
            const left = layout.detailCenters[server] - 42;
            const top = layout.centers[server][1] + offsets[0] - 18;
            const bottom = layout.centers[server][1] + offsets[4] + 4;
            expect(
              x + radius < left ||
                x - radius > left + 84 ||
                y + radius < top ||
                y - radius > bottom,
            ).toBe(true);
          }
        }
      }
  },
);
