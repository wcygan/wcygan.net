import { useEffect, useId, useState } from "react";
import { DatabaseIcon } from "~/components/icons/DatabaseIcon";

export function BigDatabaseRegionsFigure() {
  const id = useId();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const regions = ["A", "B", "C"].map((name, i) => ({
    name,
    x: compact ? 8 : 8 + i * 200,
    y: compact ? 12 + i * 280 : 12,
    w: compact ? 280 : 184,
  }));
  const nodes = regions.map((region) => ({
    x: region.x + 32,
    y: region.y + 52,
    w: 120,
    h: 54,
  }));
  const ports = nodes.map((node) => ({
    left: node.x,
    right: node.x + node.w,
    y: node.y + node.h / 2,
  }));
  const links = compact
    ? [
        `M${ports[0].right} ${ports[0].y}H268V${ports[1].y}H${ports[1].right}`,
        `M${ports[1].right} ${ports[1].y}H268V${ports[2].y}H${ports[2].right}`,
      ]
    : [
        `M${ports[0].right} ${ports[0].y}H${ports[1].left}`,
        `M${ports[1].right} ${ports[1].y}H${ports[2].left}`,
      ];
  return (
    <figure
      className="big-db-figure"
      data-graphic-frame="plate"
      data-graphic-kind="svg"
      aria-labelledby={`${id}-title`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          Three regions, three primaries
        </p>
      </header>
      <div className="big-db-stage" data-graphic-stage="padded">
        <svg
          className="big-db-regions-svg"
          viewBox={`0 0 ${compact ? 320 : 600} ${compact ? 832 : 270}`}
          role="img"
          aria-labelledby={`${id}-svg-title ${id}-desc`}
        >
          <title id={`${id}-svg-title`}>
            Regions A, B, and C with a primary in each region
          </title>
          <desc id={`${id}-desc`}>
            All three primaries replicate to one another. Each primary also
            replicates to two local replicas, for nine servers in total.
            Double-headed arrows connect primaries; single-headed arrows point
            from a primary to its local replicas.
          </desc>
          <defs>
            <marker
              id={`${id}-cross`}
              viewBox="0 -4 8 8"
              refX="8"
              refY="0"
              markerWidth="8"
              markerHeight="8"
              markerUnits="userSpaceOnUse"
              orient="auto-start-reverse"
            >
              <path d="M0 -3L8 0L0 3" fill="none" stroke="context-stroke" />
            </marker>
          </defs>
          {regions.map((region, i) => {
            const primary = nodes[i];
            const replicaWidth = compact ? 100 : 74;
            const replicaXs = [region.x + 12, region.x + (compact ? 132 : 98)];
            return (
              <g
                key={region.name}
                className="big-db-region"
                data-region={region.name}
              >
                <rect
                  x={region.x}
                  y={region.y}
                  width={region.w}
                  height="240"
                  className="big-db-region-boundary"
                />
                <text
                  x={region.x + 16}
                  y={region.y + 27}
                  className="big-db-region-label"
                >
                  REGION {region.name}
                </text>
                <rect
                  x={primary.x}
                  y={primary.y}
                  width={primary.w}
                  height={primary.h}
                  className="big-db-region-primary"
                />
                <DatabaseIcon
                  x={primary.x + 8}
                  y={primary.y + 15}
                  width="24"
                  height="24"
                  className="big-db-region-icon"
                />
                <text x={primary.x + 40} y={primary.y + 33}>
                  Primary {region.name}
                </text>
                <path
                  d={`M${primary.x + primary.w / 2} ${primary.y + primary.h}V${region.y + 150}`}
                  className="big-db-region-local"
                />
                {replicaXs.map((x, n) => (
                  <g key={n}>
                    <path
                      d={`M${primary.x + primary.w / 2} ${region.y + 150}H${x + replicaWidth / 2}V${region.y + 180}`}
                      className="big-db-region-local"
                      markerEnd={`url(#${id}-cross)`}
                    />
                    <rect
                      x={x}
                      y={region.y + 180}
                      width={replicaWidth}
                      height="48"
                      className="big-db-region-replica"
                    />
                    <text
                      x={x + replicaWidth / 2}
                      y={region.y + 209}
                      textAnchor="middle"
                    >
                      Replica
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
          {links.map((d, i) => (
            <path
              key={i}
              d={d}
              className="big-db-region-cross"
              markerStart={`url(#${id}-cross)`}
              markerEnd={`url(#${id}-cross)`}
            />
          ))}
        </svg>
        <p className="big-db-note">
          3 primaries · 6 local replicas · 9 servers
        </p>
      </div>
      <figcaption>
        Each primary replicates across regions and to two replicas in its
        region. The reported ≤ 3 s lag applies to those local replicas.
      </figcaption>
    </figure>
  );
}
