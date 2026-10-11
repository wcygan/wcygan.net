import { useId } from "react";

const regions = ["A", "B", "C"] as const;
type Region = (typeof regions)[number];
type Point = readonly [number, number];
type Server = {
  cx: number;
  cy: number;
  region: Region;
  primary: boolean;
};
type Wire = {
  points: Point[];
  region?: Region;
  cross?: boolean;
  arrow?: boolean;
};
type Scene = {
  height: number;
  servers: Server[];
  wires: Wire[];
};

const server = (
  cx: number,
  cy: number,
  region: Region,
  primary = false,
): Server => ({ cx, cy, region, primary });
const bounds = (s: Server) => ({
  x: s.cx - 54,
  y: s.cy - 24,
  w: 108,
  h: 48,
});
const port = (s: Server, side: "left" | "right" | "top" | "bottom"): Point => {
  const n = bounds(s);
  if (side === "left") return [n.x, s.cy];
  if (side === "right") return [n.x + n.w, s.cy];
  return [s.cx, side === "top" ? n.y : n.y + n.h];
};
const local = (points: Point[], region: Region, arrow = true): Wire => ({
  points,
  region,
  arrow,
});
const peer = (points: Point[]): Wire => ({ points, cross: true, arrow: true });

function regionColumns(): Scene {
  const scene: Scene = { height: 350, servers: [], wires: [] };
  const primaries = regions.map((r, i) => server(80 + i * 160, 124, r, true));
  primaries.forEach((p) => {
    const replicas = [server(p.cx, 218, p.region), server(p.cx, 314, p.region)];
    const trunkX = p.cx - 70;
    scene.servers.push(p, ...replicas);
    scene.wires.push(
      local(
        [port(p, "bottom"), [p.cx, 170], [trunkX, 170], [trunkX, 314]],
        p.region,
        false,
      ),
    );
    replicas.forEach((r) =>
      scene.wires.push(local([[trunkX, r.cy], port(r, "left")], p.region)),
    );
  });
  scene.wires.push(
    peer([port(primaries[0], "right"), port(primaries[1], "left")]),
    peer([port(primaries[1], "right"), port(primaries[2], "left")]),
    peer([
      port(primaries[0], "top"),
      [80, 70],
      [400, 70],
      port(primaries[2], "top"),
    ]),
  );
  return scene;
}

function DatabaseNode({ value }: { value: Server }) {
  const { x, y, w, h } = bounds(value);
  const cap = 6;
  const role = value.primary
    ? `Primary ${value.region}`
    : `Replica in Region ${value.region}`;
  return (
    <g
      className="big-db-region-server"
      data-region={value.region}
      data-server-role={value.primary ? "primary" : "replica"}
    >
      <title>{role}</title>
      <path
        className="big-db-region-body"
        d={`M${x} ${y + cap}V${y + h - cap}a${w / 2} ${cap} 0 0 0 ${w} 0V${y + cap}`}
      />
      <ellipse
        className="big-db-region-cap"
        cx={value.cx}
        cy={y + cap}
        rx={w / 2}
        ry={cap}
      />
      <text
        className="big-db-region-role"
        x={value.cx}
        y={value.cy + 5}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value.primary ? "Primary" : "Replica"}
      </text>
    </g>
  );
}

export function BigDatabaseRegionsFigure() {
  const id = useId();
  const scene = regionColumns();
  return (
    <figure
      className="big-db-figure big-db-regions-figure"
      data-graphic-frame="plate"
      data-graphic-kind="svg"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          One primary per region
        </p>
      </header>
      <div className="big-db-stage" data-graphic-stage="padded">
        <svg
          className="big-db-regions-svg"
          viewBox={`0 0 480 ${scene.height}`}
          role="img"
          aria-labelledby={`${id}-svg-title ${id}-desc`}
        >
          <title id={`${id}-svg-title`}>Three regions, three primaries</title>
          <desc id={`${id}-desc`}>
            Regions A, B, and C each contain one primary and two local replicas.
            All three primaries exchange changes across regions. There are nine
            servers in total. Each cylinder is labeled with its role. Dashed
            arrows exchange changes between primaries; colored arrows feed local
            replicas.
          </desc>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 -3 6 6"
              refX="6"
              refY="0"
              markerWidth="6"
              markerHeight="6"
              markerUnits="userSpaceOnUse"
              orient="auto-start-reverse"
            >
              <path d="M0 -3L6 0L0 3Z" fill="context-stroke" />
            </marker>
          </defs>
          {[160, 320].map((x) => (
            <line
              key={x}
              className="big-db-region-divider"
              x1={x}
              x2={x}
              y1={44}
              y2={344}
            />
          ))}
          {regions.map((region, index) => (
            <text
              key={region}
              className="big-db-region-heading"
              x={80 + index * 160}
              y={26}
              textAnchor="middle"
            >
              Region {region}
            </text>
          ))}
          {scene.wires.map((w, i) => (
            <path
              key={i}
              data-region={w.region}
              className={w.cross ? "big-db-region-peer" : "big-db-region-local"}
              d={w.points
                .map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`)
                .join(" ")}
              markerStart={w.cross ? `url(#${id}-arrow)` : undefined}
              markerEnd={w.arrow ? `url(#${id}-arrow)` : undefined}
            />
          ))}
          {scene.servers.map((s, i) => (
            <DatabaseNode key={i} value={s} />
          ))}
        </svg>
      </div>
      <figcaption id={`${id}-caption`}>
        Each primary replicates across regions and to two replicas in its
        region.
      </figcaption>
    </figure>
  );
}
