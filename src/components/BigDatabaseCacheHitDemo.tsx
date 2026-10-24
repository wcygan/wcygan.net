import { useId } from "react";
import { BigDatabasePageDiagram } from "~/components/BigDatabasePageDiagram";
import {
  BigDatabasePlaybackControls,
  BigDatabasePlaybackStatus,
} from "~/components/BigDatabasePlayback";
import { useQueryPlayback } from "~/demos/big-database/use-query-playback";

export function BigDatabaseCacheHitDemo() {
  const id = useId();
  const playback = useQueryPlayback("hit");
  return (
    <figure
      ref={playback.figure}
      className="big-db-figure big-db-flow"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      aria-labelledby={id}
    >
      <header>
        <p className="article-graphic-title" id={id}>
          A lookup served from RAM
        </p>
      </header>
      <BigDatabasePlaybackControls playback={playback} />
      <div
        className="big-db-stage big-db-flow-stage"
        data-graphic-stage="padded"
      >
        <BigDatabasePageDiagram
          title="The cached leaf page returns order 9001 without an SSD read."
          snapshot={playback.snapshot}
          reduced={playback.reduced}
          paths={["lookup", "result"]}
          nodes={[
            {
              key: "index",
              y: 20,
              title: "Index lookup",
              sub: "order ID = 9001",
            },
            {
              key: "pool",
              y: 130,
              title: "Buffer pool",
              sub: "Leaf page cached",
            },
            {
              key: "row",
              y: 390,
              title: "Order 9001",
              sub: "Returned to the service",
            },
          ]}
        />
        <p className="big-db-flow-count">0 SSD page reads</p>
      </div>
      <BigDatabasePlaybackStatus playback={playback} />
    </figure>
  );
}
