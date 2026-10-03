import { describe, expect, it } from "vitest";
import { RUNTIME_CONTROL_EDGES, RUNTIME_DATA_EDGES, type Key } from "./model";
import {
  KEY_SOURCE,
  LIVE_COUNT,
  LIVE_OFFSET,
  SAVED_COUNT,
  SAVED_OFFSET,
  face,
  keyRoute,
  keyTray,
  recoveryInputRoute,
  recoveryRecord,
  runtimeBox,
  runtimeRoute,
  snapshotRoute,
} from "./geometry";

describe("Flink spatial connector attachment", () => {
  it("connects every keyed lane to its tray face instead of floating above it", () => {
    for (const key of ["Ada", "Bo", "Cy"] as Key[]) {
      const path = keyRoute(key);
      expect(path[0]).toEqual(face(KEY_SOURCE, 0, 1));
      expect(path.at(-1)).toEqual(face(keyTray(key), 0, -1));
    }
  });
  it("attaches control and data paths to their actual worker and subtask geometry", () => {
    for (const edge of [...RUNTIME_CONTROL_EDGES, ...RUNTIME_DATA_EDGES]) {
      const path = runtimeRoute(edge);
      expect(path[0]).toEqual(
        face(runtimeBox(edge.from), edge.kind === "control" ? 2 : 0, 1),
      );
      expect(path.at(-1)).toEqual(
        face(
          runtimeBox(edge.to),
          edge.kind === "control" ? 1 : 0,
          edge.kind === "control" ? 1 : -1,
        ),
      );
    }
  });
  it("attaches all five retained records and both checkpoint state paths to their faces", () => {
    for (let offset = 0; offset < 5; offset++) {
      const path = recoveryInputRoute(offset);
      expect(path[0]).toEqual(face(recoveryRecord(offset), 0, 1));
      expect(path.at(-1)).toEqual(face(LIVE_OFFSET, 0, -1));
    }
    for (const [live, saved] of [
      [LIVE_OFFSET, SAVED_OFFSET],
      [LIVE_COUNT, SAVED_COUNT],
    ]) {
      const path = snapshotRoute(live, saved);
      expect(path[0]).toEqual(face(live, 0, 1));
      expect(path.at(-1)).toEqual(face(saved, 0, -1));
      expect([...path].reverse().at(-1)).toEqual(face(live, 0, 1));
    }
  });
});
