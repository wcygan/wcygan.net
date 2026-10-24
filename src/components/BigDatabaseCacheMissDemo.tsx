import { useId } from "react";
import { BigDatabasePageDiagram } from "~/components/BigDatabasePageDiagram";
import {
  BigDatabasePlaybackControls,
  BigDatabasePlaybackStatus,
} from "~/components/BigDatabasePlayback";
import { useQueryPlayback } from "~/demos/big-database/use-query-playback";

export function BigDatabaseCacheMissDemo() {
  const id = useId();
  const playback = useQueryPlayback("miss");
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
          A cache miss reads from SSD
        </p>
      </header>
      <BigDatabasePlaybackControls playback={playback} />
      <div
        className="big-db-stage big-db-flow-stage"
        data-graphic-stage="padded"
      >
        <BigDatabasePageDiagram
          title="InnoDB loads the missing leaf page from SSD into the buffer pool, then returns order 9001."
          snapshot={playback.snapshot}
          reduced={playback.reduced}
          paths={["lookup", "disk", "fill", "result"]}
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
              sub:
                playback.snapshot.step >= 4
                  ? "Leaf page cached"
                  : "Leaf page absent",
            },
            { key: "ssd", y: 260, title: "SSD", sub: "Persistent table pages" },
            {
              key: "row",
              y: 390,
              title: "Order 9001",
              sub: "Returned to the service",
            },
          ]}
        />
        <p className="big-db-flow-count">
          {playback.snapshot.current.reads} SSD page reads
        </p>
      </div>
      <BigDatabasePlaybackStatus playback={playback} />
    </figure>
  );
}
