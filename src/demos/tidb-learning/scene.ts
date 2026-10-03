import { AMOUNTS, quorum, regionRanges, scaling, type LessonId } from "./model";
import { facingPort, type Label, type Solid, type Vec3 } from "./geometry";
export interface Connection {
  id: string;
  path: Vec3[];
  tone: Solid["tone"];
  dashed?: boolean;
}
export interface World {
  solids: Solid[];
  labels: Label[];
  connections: Connection[];
  extent: Vec3;
}

export function scene(
  id: LessonId,
  phase: number,
  option: number,
  compact: boolean,
): World {
  const world: World = {
    solids: [],
    labels: [],
    connections: [],
    extent: [12, 4, 11],
  };
  const solid = (id: string, center: Vec3, size: Vec3, tone: Solid["tone"]) => {
    const value = { id, center, size, tone };
    world.solids.push(value);
    return value;
  };
  const label = (id: string, text: string, at: Vec3, inline = false) =>
    world.labels.push({ id, text, at, inline });
  const link = (
    id: string,
    a: Solid,
    b: Solid,
    tone: Solid["tone"],
    dashed = false,
  ) =>
    world.connections.push({
      id,
      path: [facingPort(a, b), facingPort(b, a)],
      tone,
      dashed,
    });
  const platform = (id: string, x: number, z: number, w: number, d: number) =>
    solid(`${id}-base`, [x, 0.12, z], [w, 0.24, d], "neutral");

  if (id === "regions") {
    world.extent = [12, 2, 10];
    const ranges = regionRanges(phase);
    if (phase < 2) {
      platform("keyspace", 0, 0, 10, 3);
      for (const range of ranges) {
        const x = -4.5 + ((range.start + range.end) / 100) * 4.5;
        solid(
          range.id,
          [x, 0.6, 0],
          [((range.end - range.start) / 100) * 9 - 0.15, 0.7, 2.2],
          range.id.startsWith("A") && phase === 1 ? "orange" : "blue",
        );
        label(range.id, `${range.id} [${range.start},${range.end})`, [
          x,
          1.3,
          0,
        ]);
      }
      label("ordered", "ORDERED KEY SPACE", [0, 0, 2.2]);
    } else {
      const positions: Vec3[] = compact
        ? [
            [0, 0, -3.2],
            [0, 0, 0],
            [0, 0, 3.2],
          ]
        : [
            [-3, 0, -2.4],
            [3, 0, -2.4],
            [0, 0, 2.4],
          ];
      positions.forEach(([x, , z], i) => {
        platform(`store-${i}`, x, z, 3.8, 2.4);
        label(`store-${i}`, `TiKV ${i + 1} · leader`, [x, 0.05, z + 1.65]);
      });
      for (const range of ranges) {
        const [x, , z] = positions[range.store - 1];
        solid(range.id, [x, 0.7, z], [3, 0.9, 1.6], "blue");
        label(range.id, `${range.id} [${range.start},${range.end})`, [
          x,
          1.65,
          z,
        ]);
      }
    }
  } else if (id === "quorum") {
    world.extent = compact ? [8, 4, 11] : [12, 4, 9];
    const state = quorum(phase, option);
    const positions: Vec3[] = compact
      ? [
          [0, 1, -3.5],
          [-2.2, 1, 1.8],
          [2.2, 1, 1.8],
        ]
      : [
          [-3, 1, -2.5],
          [3, 1, -2.5],
          [0, 1, 2.5],
        ];
    const nodes = positions.map(([x, y, z], i) => {
      platform(`replica-${i}`, x, z, 3, 2.8);
      const node = solid(
        `replica-${i}`,
        [x, y, z],
        [2.2, 1.4, 2],
        !state.reachable[i] ? "red" : i === 0 ? "orange" : "blue",
      );
      label(
        `replica-${i}`,
        `TiKV ${i + 1} · ${i === 0 ? "leader" : "follower"}`,
        [x, 2.5, z],
      );
      if (!state.reachable[i])
        label(`fault-${i}`, "unavailable", [x, 0, z + 1.9]);
      const hasEntry = i === 0 ? phase >= 1 : phase >= 2 && state.reachable[i];
      if (hasEntry)
        solid(
          `log-${i}`,
          [x, 1.95, z],
          [1.65, 0.3, 1.25],
          state.committed ? "green" : "yellow",
        );
      return node;
    });
    nodes
      .slice(1)
      .forEach((node, i) =>
        link(
          `replicate-${i}`,
          nodes[0],
          node,
          phase >= 2 ? (state.reachable[i + 1] ? "blue" : "red") : "neutral",
          !state.reachable[i + 1],
        ),
      );
    label("copies", `${state.copies}/3 LOG COPIES · NEED 2`, [0, 0, 4.7], true);
  } else if (id === "index") {
    world.extent = compact ? [7, 3, 15] : [13, 3, 8];
    const positions: Vec3[] = compact
      ? [
          [0, 0, -3.8],
          [0, 0, 3.8],
        ]
      : [
          [-3.2, 0, 0],
          [3.2, 0, 0],
        ];
    const rows = [
      ["ben → 180", "eve → 730", "will → 427"],
      ["180 · Ben", "427 · Will", "730 · Eve"],
    ];
    const trays = positions.map(([x, , z], i) => {
      const tray = platform(`tray-${i}`, x, z, 4.8, 5.3);
      label(`tray-${i}`, i === 0 ? "EMAIL INDEX · A" : "ROW KEYS · B", [
        x,
        0.1,
        z - 3,
      ]);
      rows[i].forEach((text, j) => {
        const selected = j === (i === 0 ? 2 : 1) && phase >= (i === 0 ? 1 : 3);
        solid(
          `entry-${i}-${j}`,
          [x, 0.52, z + (j - 1) * 1.5],
          [4.1, 0.5, 1.15],
          selected ? "orange" : "blue",
        );
        label(`entry-${i}-${j}`, text, [x, 0.9, z + (j - 1) * 1.5], true);
      });
      return tray;
    });
    if (phase >= 2) link("handle", trays[0], trays[1], "orange");
  } else if (id === "tiflash") {
    world.extent = compact ? [8, 3, 18] : [15, 3, 9];
    const positions: Vec3[] = compact
      ? [
          [0, 0, -4.5],
          [0, 0, 4.5],
        ]
      : [
          [-3.8, 0, 0],
          [3.8, 0, 0],
        ];
    const buyers = ["Ada", "Lin", "Sam", "Jo"];
    const trays = positions.map(([x, , z], i) => {
      const tray = platform(`engine-${i}`, x, z, 5.7, 6.4);
      label(`engine-${i}`, i === 0 ? "TiKV · ROWS" : "TiFlash · COLUMNS", [
        x,
        0.1,
        z - 3.8,
      ]);
      if (i === 0 || phase >= 1) {
        ["id", "buyer", "amount"].forEach((name, c) =>
          label(
            `header-${i}-${c}`,
            name,
            [x + (c - 1) * 1.65, 0.4, z - 2.8],
            true,
          ),
        );
        if (i === 0) {
          for (let row = 0; row < 4; row++)
            solid(
              `row-group-${row}`,
              [x, 0.38, z + (row - 1.5) * 1.3],
              [4.9, 0.15, 1.08],
              "blue",
            );
        } else {
          for (let col = 0; col < 3; col++)
            solid(
              `column-group-${col}`,
              [x + (col - 1) * 1.65, 0.38, z],
              [1.48, 0.15, 5.25],
              phase === 1 ? "yellow" : "green",
            );
        }
        for (let row = 0; row < 4; row++)
          for (let col = 0; col < 3; col++) {
            const cx = x + (col - 1) * 1.65,
              cz = z + (row - 1.5) * 1.3;
            const selected = i === 1 && phase >= 3 && col === 2;
            const tone =
              i === 0
                ? "blue"
                : phase === 1
                  ? "yellow"
                  : selected
                    ? "orange"
                    : "green";
            solid(
              `value-${i}-${row}-${col}`,
              [cx, 0.6, cz],
              [1.35, 0.55, 1.02],
              tone,
            );
            label(
              `value-${i}-${row}-${col}`,
              i === 1 && phase === 1
                ? "…"
                : col === 0
                  ? String(row + 1)
                  : col === 1
                    ? buyers[row]
                    : String(AMOUNTS[row]),
              [cx, 0.95, cz],
              true,
            );
          }
      }
      if (i === 1 && phase >= 1)
        label(
          "apply",
          phase === 1 ? "APPLIED 8 · NEED 10" : "APPLIED 10 · READY",
          [x, 0, z + 3.9],
        );
      return tray;
    });
    if (phase >= 1)
      link(
        "learner",
        trays[0],
        trays[1],
        phase === 1 ? "yellow" : "green",
        true,
      );
  } else if (id === "scaling") {
    world.extent = compact ? [9, 6, 14] : [14, 6, 10];
    const state = scaling(phase);
    for (let i = 0; i < state.compute; i++) {
      const x = (i - (state.compute - 1) / 2) * (compact ? 2.3 : 3.2),
        z = -3.2;
      solid(`compute-${i}`, [x, 3.2, z], [1.8, 0.65, 1.5], "orange");
      label(`compute-${i}`, `TiDB ${i + 1}`, [x, 4, z]);
    }
    const positions: Vec3[] = compact
      ? [
          [-2, 0, 0.4],
          [2, 0, 0.4],
          [-2, 0, 5],
          [2, 0, 5],
        ]
      : [
          [-4.5, 0, 2],
          [-1.5, 0, 2],
          [1.5, 0, 2],
          [4.5, 0, 2],
        ];
    state.stores.forEach((ranges, i) => {
      const [x, , z] = positions[i];
      platform(`store-${i}`, x, z, 2.5, 2.5);
      solid(`store-${i}`, [x, 0.75, z], [2, 1, 1.8], "blue");
      label(`store-${i}`, `TiKV ${i + 1}`, [x, 0.1, z + 1.8]);
      if (!ranges.length) label("empty", "EMPTY", [x, 1.8, z]);
      ranges.forEach((range, j) => {
        const y = 1.5 + j * 1.0;
        solid(`store-${i}-${range}`, [x, y, z], [1.6, 0.48, 1.35], "blue");
        label(`store-${i}-${range}`, range, [x, y + 0.35, z], true);
      });
    });
  }
  return world;
}
