#!/usr/bin/env python3
"""Generate the reconciliation flow diagram as a static SVG.

Mermaid cannot combine horizontal node chains inside stacked group
rectangles with direct node-to-node arrows between the groups (per-group
`direction` is ignored whenever a member node links outside the group, in
both the dagre and ELK layouts). This script renders that hybrid layout
directly: four stacked bands with horizontal chains inside each band and
node-anchored connectors between bands.

Badges (rect + icon + label) live in src/diagrams/reconciliation/badges/
and are inlined so the output stays a self-contained SVG.

Run:  python3 scripts/render-reconciliation-flow.py
Out:  public/reconciliation/reconciliation-flow.svg
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BADGES_DIR = ROOT / "src/diagrams/reconciliation/badges"
OUTPUT = ROOT / "public/reconciliation/reconciliation-flow.svg"

BAND_FILL = "#f9f9f9"
BAND_STROKE = "#dedede"
BAND_TITLE_FILL = "#466eaa"
EDGE_STROKE = "#666666"
EDGE_LABEL_FILL = "#000000"
LABEL_HALO = "#fdfdfc"
FONT = "Inter, system-ui, Helvetica, Arial, sans-serif"

STANDARD_BADGE = (112, 52)
# Nodes whose badge size differs from the standard badge.
BADGE_SIZES = {"mysql": (112, 58), "debezium": (132, 52)}

# Horizontal gap between badges inside a band, and band padding.
BADGE_GAP = 88
BAND_PAD_X = 36
TITLE_HEIGHT = 40
BADGE_PAD_Y = 24
# Vertical room between bands for the cross-band connectors and their labels.
BAND_GAP = 108

BANDS = [
    ("Detect", ["airflow", "trino"]),
    ("Stream processing", ["kafka", "flink"]),
    ("Change data capture", ["mysql", "debezium", "kafka2", "indexer"]),
    ("Data lake", ["ceph", "iceberg"]),
]

# (source, target, label, style) — style: solid or dotted.
EDGES = [
    ("airflow", "trino", "schedules", "solid"),
    ("trino", "kafka", "repair events", "solid"),
    ("kafka", "flink", "consume", "solid"),
    ("flink", "mysql", "apply idempotently", "solid"),
    ("mysql", "debezium", "binlog", "solid"),
    ("debezium", "kafka2", "change events", "solid"),
    ("kafka2", "indexer", "consume", "solid"),
    ("indexer", "iceberg", "write repaired rows", "solid"),
    ("iceberg", "trino", "queries the lake on the next run", "dotted"),
]


def badge_size(name: str) -> tuple[int, int]:
    return BADGE_SIZES.get(name, STANDARD_BADGE)


def badge_xml(name: str, x: float, y: float) -> str:
    w, h = badge_size(name)
    svg = (BADGES_DIR / f"{name}.svg").read_text()
    svg = re.sub(
        r"<svg\b[^>]*>",
        rf'<svg x="{x:g}" y="{y:g}" width="{w}" height="{h}">',
        svg,
        count=1,
    )
    return svg


def layout() -> tuple[dict, list[dict], dict[str, dict]]:
    """Stack the bands vertically and center each on the canvas."""
    bands: list[dict] = []
    nodes: dict[str, dict] = {}
    y = 24.0
    for title, names in BANDS:
        widths = [badge_size(n)[0] for n in names]
        inner = sum(widths) + BADGE_GAP * (len(names) - 1)
        w = inner + BAND_PAD_X * 2
        tallest = max(badge_size(n)[1] for n in names)
        h = TITLE_HEIGHT + tallest + BADGE_PAD_Y
        bands.append({"title": title, "x": 0.0, "y": y, "w": w, "h": h, "names": names})
        y += h + BAND_GAP
    # The right margin holds the dotted "next run" channel, so bands center
    # on the content width and the canvas adds room for the channel.
    content_w = max(b["w"] for b in bands)
    total_w = content_w + 76.0
    total_h = y - BAND_GAP + 24.0

    for b in bands:
        b["x"] = (content_w - b["w"]) / 2
        cursor = b["x"] + BAND_PAD_X
        badge_y = b["y"] + TITLE_HEIGHT
        for name in b["names"]:
            w, h = badge_size(name)
            nodes[name] = {
                "x": cursor,
                "y": badge_y,
                "w": w,
                "h": h,
                "cx": cursor + w / 2,
                "cy": badge_y + h / 2,
                "bottom": badge_y + h,
            }
            cursor += w + BADGE_GAP
    return {"w": total_w, "h": total_h}, bands, nodes, content_w


def edge_path(source: dict, target: dict) -> tuple[str, float, float, str]:
    """Node-anchored connector between bands: straight when aligned, else S-curve."""
    sx, sy = source["cx"], source["bottom"]
    tx, ty = target["cx"], target["y"]
    if abs(sx - tx) < 4:
        d = f"M {sx:g} {sy:g} C {sx:g} {sy + 40:g}, {tx:g} {ty - 40:g}, {tx:g} {ty:g}"
        return d, sx + 10, (sy + ty) / 2 + 5, "start"
    bend = (sy + ty) / 2
    d = f"M {sx:g} {sy:g} C {sx:g} {bend:g}, {tx:g} {bend:g}, {tx:g} {ty:g}"
    lx = (sx + tx) / 2 + (14 if tx > sx else -14)
    anchor = "start" if tx > sx else "end"
    return d, lx, bend + 5, anchor


def back_edge_path(
    source: dict, target: dict, content_w: float
) -> tuple[str, float, float, str]:
    """Dotted rise from the lake back up to Trino along the right channel."""
    sx = source["x"] + source["w"]
    sy = source["cy"]
    tx = target["x"] + target["w"]
    ty = target["cy"]
    channel = content_w + 40
    d = f"M {sx:g} {sy:g} C {channel:g} {sy:g}, {channel:g} {ty:g}, {tx:g} {ty:g}"
    # Label sits left of the vertical channel segment, in the gap between bands.
    return d, channel - 8, (sy + ty) / 2 + 4, "end"


def same_band_edge(source: dict, target: dict) -> tuple[str, float, float, str]:
    d = (
        f"M {source['x'] + source['w']:g} {source['cy']:g} "
        f"L {target['x'] - 2:g} {target['cy']:g}"
    )
    lx = (source["x"] + source["w"] + target["x"]) / 2
    return d, lx, source["cy"] - 10, "middle"


def render() -> str:
    geom, bands, nodes, content_w = layout()
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{geom["w"]:g}" '
        f'height="{geom["h"]:g}" viewBox="0 0 {geom["w"]:g} {geom["h"]:g}" role="img">',
        "<title>The reconciliation pattern</title>",
        "<desc>Airflow schedules a reconciliation job. The job uses Trino to find bad "
        "records in a data lake built on Ceph and Apache Iceberg, then publishes repair "
        "events to Kafka. Flink applies each repair idempotently to MySQL. Debezium "
        "captures the changed rows and publishes them to Kafka, and an indexer writes "
        "them into the Iceberg tables, so the next run no longer finds the bad records."
        "</desc>",
        f'<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        f'markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" '
        f'fill="{EDGE_STROKE}"/></marker>',
    ]

    # Bands behind everything.
    for b in bands:
        parts.append(
            f'<rect x="{b["x"]:g}" y="{b["y"]:g}" width="{b["w"]:g}" height="{b["h"]:g}" '
            f'rx="6" fill="{BAND_FILL}" stroke="{BAND_STROKE}"/>'
        )
        parts.append(
            f'<text x="{b["x"] + b["w"] / 2:g}" y="{b["y"] + 24:g}" text-anchor="middle" '
            f'font-family="{FONT}" font-size="16" fill="{BAND_TITLE_FILL}">{b["title"]}</text>'
        )

    # Connectors above bands, below badges.
    node_by_name = {n: nodes[n] for _, names in BANDS for n in names}
    band_of = {n: i for i, (_, names) in enumerate(BANDS) for n in names}
    for source_name, target_name, label, style in EDGES:
        source, target = node_by_name[source_name], node_by_name[target_name]
        if band_of[source_name] == band_of[target_name]:
            d, lx, ly, anchor = same_band_edge(source, target)
            dash = ""
        elif style == "dotted":
            d, lx, ly, anchor = back_edge_path(source, target, content_w)
            dash = ' stroke-dasharray="4 4"'
        else:
            d, lx, ly, anchor = edge_path(source, target)
            dash = ""
        parts.append(
            f'<path d="{d}" fill="none" stroke="{EDGE_STROKE}" stroke-width="1.5"{dash} '
            f'marker-end="url(#arrow)"/>'
        )
        parts.append(
            f'<text x="{lx:g}" y="{ly:g}" text-anchor="{anchor}" font-family="{FONT}" '
            f'font-size="14" fill="{EDGE_LABEL_FILL}" stroke="{LABEL_HALO}" '
            f'stroke-width="4" paint-order="stroke" stroke-linejoin="round">{label}</text>'
        )

    # Badges on top.
    for name, n in node_by_name.items():
        parts.append(badge_xml(name, n["x"], n["y"]))

    parts.append("</svg>")
    return "\n".join(parts) + "\n"


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render())
    print(f"wrote {OUTPUT}")
