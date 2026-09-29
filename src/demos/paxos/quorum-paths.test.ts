import { expect, it } from "vitest";
import { QUORUM_POSITIONS, quorumPath } from "./quorum-paths";
it("routes every quorum edge clear of other nodes", () => {
  for (let a = 0; a < 5; a++)
    for (let b = a + 1; b < 5; b++)
      QUORUM_POSITIONS.forEach((p, i) => {
        if (i === a || i === b) return;
        for (const q of quorumPath(a, b))
          expect(Math.hypot(q[0] - p[0], q[2] - p[2])).toBeGreaterThan(1.05);
      });
});
