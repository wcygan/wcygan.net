import { useEffect, useId, useRef, useState } from "react";

const BEAT_MS = 2200;

/** One finite run. Its clock stops offscreen, in hidden tabs, or when paused. */
function useGraphicPlayback() {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(media.matches);
      if (media.matches) {
        setPlaying(false);
        setPosition(3);
      }
    };
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (
      !playing ||
      reduced ||
      position >= 3 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let visible = false;
    let previous = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (previous)
        setPosition((p) => Math.min(3, p + (now - previous) / BEAT_MS));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    const synchronize = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      synchronize();
    });
    if (ref.current) observer.observe(ref.current);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [playing, reduced, position >= 3]);
  return {
    ref,
    position,
    playing: playing && position < 3,
    reduced,
    toggle: () => setPlaying((p) => !p),
    step: () => {
      setPlaying(false);
      setPosition((p) => Math.min(3, Math.floor(p + 0.001) + 1));
    },
    replay: () => {
      setPosition(0);
      setPlaying(!reduced);
    },
  };
}

type Playback = ReturnType<typeof useGraphicPlayback>;
function Controls({ playback }: { playback: Playback }) {
  return (
    <div className="indexing-controls">
      <button
        type="button"
        onClick={playback.toggle}
        disabled={playback.reduced || playback.position >= 3}
      >
        {playback.playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={playback.step}
        disabled={playback.position >= 3}
      >
        Next step
      </button>
      <button type="button" onClick={playback.replay}>
        Replay
      </button>
      <span className="indexing-beat">
        {Math.min(3, Math.floor(playback.position) + 1)} / 3
      </span>
    </div>
  );
}

function Arrow({ id }: { id: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 8 8"
        refX="8"
        refY="4"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path
          d="M0 1 L8 4 L0 7"
          fill="none"
          stroke="context-stroke"
          strokeWidth="1.5"
        />
      </marker>
    </defs>
  );
}

function DocumentTile({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="indexing-document">
      <path d="M0 0 H60 L76 16 V50 H0 Z" />
      <path
        d="M60 0 V16 H76 M10 14 H30 M10 22 H25"
        className="indexing-document-detail"
      />
      <text x="44" y="37" textAnchor="middle">
        42
      </text>
    </g>
  );
}

export function OneRecordMovesDemo() {
  const id = useId();
  const playback = useGraphicPlayback();
  const phase = Math.floor(playback.position);
  return (
    <figure
      className="indexing-demo"
      data-graphic-frame="workbench"
      aria-labelledby={id}
    >
      <header>
        <p id={id} className="article-graphic-title">
          One Record Moves
        </p>
        <p>
          Same document. Same indexed values. Watch what must change when its
          address changes.
        </p>
      </header>
      <div
        ref={playback.ref}
        className="indexing-stage"
        data-graphic-stage="flush"
      >
        {[false, true].map((stable) => (
          <MoveDiagram
            key={String(stable)}
            stable={stable}
            position={playback.position}
          />
        ))}
      </div>
      <Controls playback={playback} />
      <figcaption aria-live={playback.playing ? "off" : "polite"}>
        {phase === 0
          ? "The green document moves from A to B. Its category, customer, and year stay the same."
          : phase === 1
            ? "Red paths still lead to the old address. The blue ID references remain valid, but their location mapping needs updating."
            : phase === 2
              ? "Orange marks the repairs: three direct index entries, or one shared location mapping."
              : "Move complete: 3 index entries changed with direct addresses; 0 changed with a stable ID, plus 1 mapping update."}
        <span className="indexing-note">
          Simplified dependency model. These are reference changes, not measured
          database writes; real engines can use forwarding and version chains.
        </span>
      </figcaption>
    </figure>
  );
}

function MoveDiagram({
  stable,
  position,
}: {
  stable: boolean;
  position: number;
}) {
  const arrow = useId();
  const repaired = position >= 2;
  const stale = position >= 1 && !repaired;
  const target = repaired ? 260 : 60;
  const state = repaired ? "maintenance" : stale ? "stale" : "lookup";
  return (
    <section className="indexing-panel">
      <p className="indexing-label">
        {stable ? "Stable ID" : "Direct address"}
      </p>
      <svg
        viewBox="0 0 320 300"
        role="img"
        aria-label={`${stable ? "Stable ID" : "Direct address"}: document 42 moves from A to B. ${repaired ? (stable ? "Only the mapping changes; all three index entries stay unchanged." : "All three index entries change to B.") : "References point to A."}`}
      >
        <Arrow id={arrow} />
        {[60, 160, 260].map((x, i) => (
          <g key={x}>
            <path
              d={
                stable
                  ? `M${x} 78 V100 L160 124`
                  : `M${x} 78 V${108 + i * 24} L${target} 216`
              }
              className="indexing-wire"
              data-tone={stable ? "lookup" : state}
              markerEnd={`url(#${arrow})`}
            />
            <rect
              x={x - 44}
              y="24"
              width="88"
              height="54"
              rx="4"
              className="indexing-node"
              data-tone={stable ? "lookup" : state}
            />
            <text x={x} y="15" className="indexing-meta" textAnchor="middle">
              {["CATEGORY", "CUSTOMER", "YEAR"][i]}
            </text>
            <text x={x} y="45" textAnchor="middle">
              {["invoice", "Acme", "2026"][i]}
            </text>
            <text
              x={x}
              y="66"
              textAnchor="middle"
              className="indexing-value"
              data-tone={stable ? "lookup" : state}
            >
              {stable ? "ID 42" : repaired ? "→ B" : "→ A"}
            </text>
          </g>
        ))}
        {stable && (
          <>
            <path
              d={`M160 172 V190 H${target} V216`}
              className="indexing-wire"
              data-tone={state}
              markerEnd={`url(#${arrow})`}
            />
            <rect
              x="110"
              y="124"
              width="100"
              height="48"
              rx="4"
              className="indexing-node"
              data-tone={repaired ? "maintenance" : stale ? "stale" : "lookup"}
            />
            <text x="160" y="142" textAnchor="middle" className="indexing-meta">
              LOCATION MAP
            </text>
            <text x="160" y="160" textAnchor="middle">
              42 → {repaired ? "B" : "A"}
            </text>
          </>
        )}
        {[60, 260].map((x, i) => (
          <g key={x}>
            <rect
              x={x - 44}
              y="216"
              width="88"
              height="62"
              rx="4"
              className="indexing-slot"
            />
            <text x={x} y="292" textAnchor="middle" className="indexing-meta">
              SLOT {i ? "B" : "A"}
            </text>
          </g>
        ))}
        <path
          d="M114 247 H204"
          className="indexing-move-guide"
          markerEnd={`url(#${arrow})`}
        />
        <DocumentTile x={22 + Math.min(1, position) * 200} y={222} />
      </svg>
      <p className="indexing-result">
        <strong data-tone={stable ? "record" : "maintenance"}>
          {repaired ? (stable ? "0" : "3") : "0"}
        </strong>{" "}
        index entries changed
        <span>
          {stable
            ? repaired
              ? "1 location mapping updated"
              : "Indexes keep ID 42"
            : repaired
              ? "Every address now points to B"
              : stale
                ? "3 addresses need repair"
                : "Indexes store location A"}
        </span>
      </p>
    </section>
  );
}

export function FollowTheLookupDemo() {
  const id = useId();
  const playback = useGraphicPlayback();
  const phase = Math.floor(playback.position);
  return (
    <figure
      className="indexing-demo"
      data-graphic-frame="workbench"
      aria-labelledby={id}
    >
      <header>
        <p id={id} className="article-graphic-title">
          Follow the Lookup
        </p>
        <p>
          Follow the blue lookup marker. A stable ID adds a location-resolution
          step.
        </p>
      </header>
      <div
        ref={playback.ref}
        className="indexing-stage"
        data-graphic-stage="flush"
      >
        {[false, true].map((stable) => (
          <LookupDiagram
            key={String(stable)}
            stable={stable}
            position={playback.position}
          />
        ))}
      </div>
      <Controls playback={playback} />
      <figcaption aria-live={playback.playing ? "off" : "polite"}>
        {phase === 0
          ? "Both lookups search the category index for invoice."
          : phase === 1
            ? "The selected entry returns an address on the left and ID 42 on the right."
            : phase === 2
              ? "Direct access has reached the document. The stable-ID path resolves 42 to its location."
              : "Both found document 42. Direct access followed an address; stable identity needed an extra resolution."}
        <span className="indexing-note">
          Symbolic lookup paths, not tree depths, disk reads, or latency
          measurements. Covering indexes may skip the full-record fetch.
        </span>
      </figcaption>
    </figure>
  );
}

function LookupDiagram({
  stable,
  position,
}: {
  stable: boolean;
  position: number;
}) {
  const arrow = useId();
  const nodes = stable
    ? [
        { y: 32, text: "invoice", sub: "SEARCH" },
        { y: 124, text: "ID 42", sub: "INDEX ENTRY" },
        { y: 216, text: "42 → B", sub: "RESOLVE ID" },
      ]
    : [
        { y: 32, text: "invoice", sub: "SEARCH" },
        { y: 124, text: "Address B", sub: "INDEX ENTRY" },
      ];
  const points = stable ? [56, 148, 240, 324] : [56, 148, 324];
  const travel = Math.min(position, points.length - 1);
  const edge = Math.min(Math.floor(travel), points.length - 2);
  const packetY =
    points[edge] + (points[edge + 1] - points[edge]) * (travel - edge);
  return (
    <section className="indexing-panel">
      <p className="indexing-label">
        {stable ? "Through stable identity" : "Direct access"}
      </p>
      <svg
        viewBox="0 0 320 370"
        role="img"
        aria-label={`${stable ? "Stable identity: invoice to ID 42 to location resolution to document 42." : "Direct access: invoice to address B to document 42."} ${position >= (stable ? 3 : 2) ? "Document found." : "Lookup in progress."}`}
      >
        <Arrow id={arrow} />
        {/* The branching silhouettes represent an index, not a particular B-tree layout. */}
        {[38, 282].map((x) => (
          <g key={x}>
            <path
              d={`M160 80 L${x} 124`}
              className="indexing-wire indexing-unused"
            />
            <rect
              x={x - 22}
              y="124"
              width="44"
              height="48"
              rx="3"
              className="indexing-ghost"
            />
            {[135, 145, 155].map((y) => (
              <path
                key={y}
                d={`M${x - 12} ${y} H${x + 12}`}
                className="indexing-unused"
              />
            ))}
          </g>
        ))}
        {points.slice(0, -1).map((y, i) => (
          <path
            key={y}
            d={`M160 ${y + 24} V${points[i + 1] - 24}`}
            className="indexing-wire"
            data-tone={position >= i + 1 ? "lookup" : undefined}
            markerEnd={`url(#${arrow})`}
          />
        ))}
        {nodes.map((node, i) => (
          <g key={node.y}>
            <rect
              x="104"
              y={node.y}
              width="112"
              height="48"
              rx="4"
              className="indexing-node"
              data-tone={position >= i ? "lookup" : undefined}
            />
            <text
              x="160"
              y={node.y + 17}
              textAnchor="middle"
              className="indexing-meta"
            >
              {node.sub}
            </text>
            <text x="160" y={node.y + 36} textAnchor="middle">
              {node.text}
            </text>
          </g>
        ))}
        {!stable && (
          <text x="182" y="237" className="indexing-meta">
            FOLLOW
          </text>
        )}
        <rect
          x="112"
          y="294"
          width="96"
          height="64"
          rx="4"
          className="indexing-slot"
        />
        <DocumentTile x={122} y={300} />
        {position < (stable ? 3 : 2) ? (
          <circle cx="160" cy={packetY} r="7" className="indexing-packet" />
        ) : (
          <g className="indexing-found">
            <circle cx="238" cy="326" r="12" />
            <path d="M232 326 L237 331 L245 320" />
          </g>
        )}
      </svg>
      <p className="indexing-result">
        <strong data-tone={position >= (stable ? 3 : 2) ? "record" : "lookup"}>
          {position >= (stable ? 3 : 2) ? "Found" : "Seeking"}
        </strong>
        <span>
          {stable
            ? "Index → ID resolution → record"
            : "Index → record address → record"}
        </span>
      </p>
    </section>
  );
}
